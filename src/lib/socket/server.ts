// @ts-nocheck
import type { Server as HTTPServer } from 'http'
import { Server as SocketServer } from 'socket.io'
import { createClient } from 'redis'
import { createAdapter } from '@socket.io/redis-adapter'
import { adminClient } from '@/lib/supabase/server'

let io: SocketServer | null = null

// Online presence: userId -> Set of socketIds
const onlineUsers = new Map<string, Set<string>>()

export function getIO() {
  return io
}

export async function initSocketServer(httpServer: HTTPServer) {
  if (io) return io

  io = new SocketServer(httpServer, {
    path: '/api/socket',
    cors: {
      origin: (origin, cb) => cb(null, true), // same-origin server, allow all
      methods: ['GET', 'POST'],
      credentials: true,
    },
    transports: ['websocket', 'polling'],
  })

  // Redis adapter for horizontal scaling
  if (process.env.REDIS_URL) {
    try {
      const pubClient = createClient({ url: process.env.REDIS_URL })
      const subClient = pubClient.duplicate()
      await Promise.all([pubClient.connect(), subClient.connect()])
      io.adapter(createAdapter(pubClient, subClient))
      console.log('[Socket.io] Redis adapter connected')
    } catch (err) {
      console.warn('[Socket.io] Redis adapter failed, falling back to memory:', err)
    }
  }

  io.on('connection', (socket) => {
    const userId = socket.handshake.auth.userId as string | undefined
    if (!userId) { socket.disconnect(); return }

    // Join personal room
    socket.join(`user:${userId}`)

    // Track online presence
    if (!onlineUsers.has(userId)) onlineUsers.set(userId, new Set())
    onlineUsers.get(userId)!.add(socket.id)

    // Mark online in DB
    setUserOnlineStatus(userId, true)
    io!.emit('user:online', { userId })

    // ─── Conversation rooms ───────────────────────────────────
    socket.on('conversation:join', (conversationId: string) => {
      socket.join(`conversation:${conversationId}`)
    })

    socket.on('conversation:leave', (conversationId: string) => {
      socket.leave(`conversation:${conversationId}`)
    })

    // ─── Post rooms (real-time likes, comments) ───────────────
    socket.on('post:join', ({ postId }: { postId: string }) => {
      socket.join(`post:${postId}`)
    })

    socket.on('post:leave', ({ postId }: { postId: string }) => {
      socket.leave(`post:${postId}`)
    })

    // ─── Typing indicators ───────────────────────────────────
    socket.on('typing:start', ({ conversationId }: { conversationId: string }) => {
      socket.to(`conversation:${conversationId}`).emit('typing:start', { userId, conversationId })
    })

    socket.on('typing:stop', ({ conversationId }: { conversationId: string }) => {
      socket.to(`conversation:${conversationId}`).emit('typing:stop', { userId, conversationId })
    })

    // ─── Message events ──────────────────────────────────────
    socket.on('message:send', async (data: {
      conversationId: string
      tempId: string
      content?: string
      type: string
      mediaUrl?: string
      fileName?: string
      fileSize?: number
      durationSeconds?: number
      replyToId?: string
    }) => {
      try {
        const { data: message, error } = await adminClient
          .from('messages')
          .insert({
            conversation_id: data.conversationId,
            sender_id: userId,
            content: data.content,
            type: data.type as never,
            media_url: data.mediaUrl,
            file_name: data.fileName,
            file_size: data.fileSize,
            duration_seconds: data.durationSeconds,
            reply_to_id: data.replyToId,
          })
          .select(`
            *,
            sender:profiles!messages_sender_id_fkey(id, username, full_name, avatar_url)
          `)
          .single()

        if (error) throw error

        // Update conversation last_message
        await adminClient
          .from('conversations')
          .update({
            last_message_at: new Date().toISOString(),
            last_message_preview: data.type === 'text'
              ? (data.content?.slice(0, 80) ?? '')
              : `[${data.type}]`,
          })
          .eq('id', data.conversationId)

        // Broadcast to conversation participants
        io!.to(`conversation:${data.conversationId}`).emit('message:new', {
          ...message,
          tempId: data.tempId,
        })

        // Push notifications to offline participants
        const { data: participants } = await adminClient
          .from('conversation_participants')
          .select('user_id')
          .eq('conversation_id', data.conversationId)
          .neq('user_id', userId)

        participants?.forEach(({ user_id }) => {
          if (!onlineUsers.has(user_id)) {
            io!.to(`user:${user_id}`).emit('notification:new', {
              type: 'message',
              actor_id: userId,
              reference_id: data.conversationId,
              reference_type: 'conversation',
            })
          }
        })
      } catch {
        socket.emit('message:error', { tempId: data.tempId, error: 'Failed to send' })
      }
    })

    socket.on('message:read', async ({ conversationId, messageId }: { conversationId: string, messageId: string }) => {
      await adminClient.from('message_reads').upsert({ message_id: messageId, user_id: userId })
      socket.to(`conversation:${conversationId}`).emit('message:read', { messageId, userId })
    })

    // ─── Disconnect ──────────────────────────────────────────
    socket.on('disconnect', () => {
      const sockets = onlineUsers.get(userId)
      if (sockets) {
        sockets.delete(socket.id)
        if (sockets.size === 0) {
          onlineUsers.delete(userId)
          setUserOnlineStatus(userId, false)
          io!.emit('user:offline', { userId, lastSeen: new Date().toISOString() })
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
  io?.to(`user:${userId}`).emit(event, data)
}

export function emitToPost(postId: string, event: string, data: unknown) {
  io?.to(`post:${postId}`).emit(event, data)
}

export function emitToConversation(conversationId: string, event: string, data: unknown) {
  io?.to(`conversation:${conversationId}`).emit(event, data)
}
