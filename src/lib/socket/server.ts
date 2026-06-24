// @ts-nocheck
import type { Server as HTTPServer } from 'http'
import { Server as SocketServer } from 'socket.io'
import { createClient as createRedisClient } from 'redis'
import { createAdapter } from '@socket.io/redis-adapter'
import { adminClient } from '@/lib/supabase/server'
import { pushCallInvite } from '@/lib/push/sender'

declare global {
  // eslint-disable-next-line no-var
  var _socketIO: SocketServer | undefined
}

const onlineUsers = new Map<string, Set<string>>()

function getIO(): SocketServer | null {
  return global._socketIO ?? null
}

export async function initSocketServer(httpServer: HTTPServer) {
  if (global._socketIO) return global._socketIO

  const io = new SocketServer(httpServer, {
    path: '/api/socket',
    cors: {
      origin: (origin, cb) => cb(null, true),
      methods: ['GET', 'POST'],
      credentials: true,
    },
    transports: ['websocket', 'polling'],
  })

  global._socketIO = io

  if (process.env.REDIS_URL) {
    try {
      const pubClient = createRedisClient({ url: process.env.REDIS_URL })
      const subClient = pubClient.duplicate()
      await Promise.all([pubClient.connect(), subClient.connect()])
      io.adapter(createAdapter(pubClient, subClient))
      console.log('[Socket.io] Redis adapter connected')
    } catch (err) {
      console.warn('[Socket.io] Redis adapter failed, using memory adapter:', err)
    }
  }

  io.on('connection', (socket) => {
    const userId = socket.handshake.auth.userId as string | undefined
    if (!userId) { socket.disconnect(); return }

    socket.join(`user:${userId}`)

    if (!onlineUsers.has(userId)) onlineUsers.set(userId, new Set())
    onlineUsers.get(userId)!.add(socket.id)

    setUserOnlineStatus(userId, true)
    io.emit('user:online', { userId })

    // ── Conversation rooms ──────────────────────────────────────
    socket.on('conversation:join', (conversationId: string) => {
      socket.join(`conversation:${conversationId}`)
    })

    socket.on('conversation:leave', (conversationId: string) => {
      socket.leave(`conversation:${conversationId}`)
    })

    // ── Post rooms ──────────────────────────────────────────────
    socket.on('post:join', ({ postId }: { postId: string }) => {
      socket.join(`post:${postId}`)
    })

    socket.on('post:leave', ({ postId }: { postId: string }) => {
      socket.leave(`post:${postId}`)
    })

    // ── Typing indicators ───────────────────────────────────────
    socket.on('typing:start', ({ conversationId }: { conversationId: string }) => {
      socket.to(`conversation:${conversationId}`).emit('typing:start', { userId, conversationId })
    })

    socket.on('typing:stop', ({ conversationId }: { conversationId: string }) => {
      socket.to(`conversation:${conversationId}`).emit('typing:stop', { userId, conversationId })
    })

    // ── Read receipts (client → server → other participants) ────
    // Client emits this when they open/view a conversation so the sender
    // instantly sees the double-blue tick without waiting for an HTTP round-trip.
    socket.on('messages:read', async ({ conversationId }: { conversationId: string }) => {
      const readAt = new Date().toISOString()
      try {
        await adminClient
          .from('conversation_participants')
          .update({ last_read_at: readAt })
          .eq('conversation_id', conversationId)
          .eq('user_id', userId)
      } catch {}
      // Broadcast to everyone else in the room (the message sender sees their tick turn blue)
      socket.to(`conversation:${conversationId}`).emit('messages:read', {
        conversationId,
        userId,
        readAt,
      })
    })

    // ── WebRTC Call Signaling ───────────────────────────────────
    // call:invite goes to the callee's personal room (they may not be in the conv room yet)
    socket.on('call:invite', ({ conversationId, calleeId, type, callerName, callerAvatar }) => {
      io.to(`user:${calleeId}`).emit('call:invite', {
        conversationId, callerId: userId, callerName, callerAvatar, type,
      })
      pushCallInvite(calleeId, callerName, callerAvatar ?? null, type, conversationId, userId).catch(() => {})
    })

    // Caller cancelled before callee answered → notify callee via personal room
    socket.on('call:cancel', ({ conversationId, calleeId }) => {
      io.to(`user:${calleeId}`).emit('call:cancel', { conversationId })
    })

    socket.on('call:accept', ({ conversationId, callerId }) => {
      socket.join(`conversation:${conversationId}`)
      if (callerId) {
        // Route directly to caller's personal room — reliable even if caller left the conv room
        io.to(`user:${callerId}`).emit('call:accept', { conversationId })
      } else {
        socket.to(`conversation:${conversationId}`).emit('call:accept', { conversationId })
      }
    })

    // Route reject/busy directly to caller's personal room — reliable regardless of conversation room state
    socket.on('call:reject', ({ conversationId, callerId }) => {
      if (callerId) {
        io.to(`user:${callerId}`).emit('call:reject', { conversationId })
      } else {
        socket.to(`conversation:${conversationId}`).emit('call:reject', { conversationId })
      }
    })

    socket.on('call:busy', ({ conversationId, callerId }) => {
      if (callerId) {
        io.to(`user:${callerId}`).emit('call:busy', { conversationId })
      } else {
        socket.to(`conversation:${conversationId}`).emit('call:busy', { conversationId })
      }
    })

    socket.on('call:offer', ({ conversationId, sdp }) => {
      socket.to(`conversation:${conversationId}`).emit('call:offer', { conversationId, sdp })
    })

    socket.on('call:answer', ({ conversationId, sdp }) => {
      socket.to(`conversation:${conversationId}`).emit('call:answer', { conversationId, sdp })
    })

    socket.on('call:ice-candidate', ({ conversationId, candidate }) => {
      socket.to(`conversation:${conversationId}`).emit('call:ice-candidate', { conversationId, candidate })
    })

    socket.on('call:end', async ({ conversationId, duration, type }) => {
      socket.to(`conversation:${conversationId}`).emit('call:end', { conversationId, duration, type })
      // Save call history as a system message
      if (duration != null && conversationId) {
        try {
          const mins = Math.floor(duration / 60)
          const secs = duration % 60
          const durationStr = mins > 0 ? `${mins}m ${secs}s` : `${secs}s`
          const icon = type === 'video' ? '📹' : '📞'
          const label = type === 'video' ? 'Video call' : 'Audio call'
          const content = `${icon} ${label} · ${durationStr}`
          const { data: msg } = await adminClient.from('messages').insert({
            conversation_id: conversationId,
            sender_id: userId,
            content,
            type: 'system',
          }).select('id, conversation_id, sender_id, content, type, created_at, updated_at, media_url, file_name, file_size, duration_seconds, is_deleted, reply_to_id').single()
          if (msg) {
            io.to(`conversation:${conversationId}`).emit('message:new', { ...msg, sender: null })
          }
        } catch (err) {
          console.error('[call:end] system message insert failed:', err)
        }
      }
    })

    // ── Disconnect ──────────────────────────────────────────────
    socket.on('disconnect', () => {
      const sockets = onlineUsers.get(userId)
      if (sockets) {
        sockets.delete(socket.id)
        if (sockets.size === 0) {
          onlineUsers.delete(userId)
          setUserOnlineStatus(userId, false)
          io.emit('user:offline', { userId, lastSeen: new Date().toISOString() })
        }
      }
    })
  })

  console.log('[Socket.io] Server initialized')
  return io
}

async function setUserOnlineStatus(userId: string, online: boolean) {
  await adminClient.from('profiles').update({
    online_status: online,
    last_seen: new Date().toISOString(),
  }).eq('id', userId)
}

export function emitToUser(userId: string, event: string, data: unknown) {
  getIO()?.to(`user:${userId}`).emit(event, data)
}

export function emitToPost(postId: string, event: string, data: unknown) {
  getIO()?.to(`post:${postId}`).emit(event, data)
}

export function emitToConversation(conversationId: string, event: string, data: unknown) {
  getIO()?.to(`conversation:${conversationId}`).emit(event, data)
}
