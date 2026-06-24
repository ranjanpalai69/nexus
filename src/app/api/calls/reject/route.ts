import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  try {
    const { callerId, conversationId } = await req.json()
    if (!callerId || !conversationId) {
      return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
    }

    const io = (global as Record<string, unknown>)._socketIO as { to: (room: string) => { emit: (ev: string, data: unknown) => void } } | undefined
    if (io) {
      io.to(`user:${callerId}`).emit('call:reject', { conversationId })
    }

    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
