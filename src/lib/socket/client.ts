'use client'
import { io, Socket } from 'socket.io-client'

let socket: Socket | null = null

export function getSocket(userId: string): Socket {
  if (!socket || !socket.connected) {
    socket = io(process.env.NEXT_PUBLIC_APP_URL!, {
      path: '/api/socket',
      auth: { userId },
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    })
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
