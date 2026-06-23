'use client'
import { io, Socket } from 'socket.io-client'

let socket: Socket | null = null

export function getSocket(userId: string): Socket {
  // Always use current browser origin so the socket connects to the right host
  const origin = typeof window !== 'undefined'
    ? window.location.origin
    : (process.env.NEXT_PUBLIC_APP_URL ?? '')

  if (!socket) {
    socket = io(origin, {
      path: '/api/socket',
      auth: { userId },
      transports: ['websocket', 'polling'],
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      timeout: 20000,
    })

    socket.on('connect', () => console.debug('[socket] connected', socket?.id))
    socket.on('disconnect', (reason) => console.debug('[socket] disconnected', reason))
    socket.on('connect_error', (err) => console.warn('[socket] connection error', err.message))
  } else if (!socket.connected) {
    // Update auth in case userId changed (re-login)
    socket.auth = { userId }
    socket.connect()
  }

  return socket
}

export function disconnectSocket() {
  if (socket) {
    socket.disconnect()
    socket = null
  }
}

export { socket }
