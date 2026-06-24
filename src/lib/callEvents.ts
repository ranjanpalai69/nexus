// Module-level singleton event bus for WebRTC call signaling.
// useSocket.ts (always mounted) captures events here; CallOverlay drains them on mount.
// This eliminates the race where events arrive before CallOverlay registers socket.on listeners.

export type CallEventType = 'accept' | 'offer' | 'answer' | 'ice' | 'end' | 'reject' | 'busy'

type Handler = (type: CallEventType, data: unknown) => void

let _handler: Handler | null = null
const _buffer: Array<{ type: CallEventType; data: unknown }> = []

export function emitCallEvent(type: CallEventType, data: unknown = {}) {
  if (_handler) {
    _handler(type, data)
  } else {
    _buffer.push({ type, data })
  }
}

export function subscribeCallEvents(handler: Handler): () => void {
  _handler = handler
  // Drain any events that arrived before CallOverlay mounted
  const pending = _buffer.splice(0)
  for (const { type, data } of pending) {
    handler(type, data)
  }
  return () => {
    if (_handler === handler) _handler = null
  }
}

export function resetCallEvents() {
  _buffer.length = 0
  _handler = null
}
