// @ts-nocheck
import type { Server as HTTPServer } from 'http'
import { Server as SocketServer } from 'socket.io'
import { createClient as createRedisClient } from 'redis'
import { createAdapter } from '@socket.io/redis-adapter'
import { adminClient } from '@/lib/supabase/server'

// Use global so the io instance is shared across Next.js bundle boundaries
// (server.ts entry point and API route bundles are separate webpack modules)
declare global {
  // eslint-disable-next-line no-var
  var _socketIO: SocketServer | undefined
}

// Online presence: userId -> Set of socketIds
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

  // Store in global immediately so API routes can access it
  global._socketIO = io

  // Redis adapter for horizontal scaling
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

    // Join personal room
    socket.join(`user:${userId}`)

    // Track online presence
    if (!onlineUsers.has(userId)) onlineUsers.set(userId, new Set())
    onlineUsers.get(userId)!.add(socket.id)

    setUserOnlineStatus(userId, true)
    io.emit('user:online', { userId })

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

    // ─── Disconnect ──────────────────────────────────────────
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
