import { create } from 'zustand'

export type CallType = 'audio' | 'video'
export type CallStatus = 'ringing' | 'connecting' | 'connected'
export type CallDirection = 'inbound' | 'outbound'

export interface IncomingCall {
  conversationId: string
  callerId: string
  callerName: string
  callerAvatar?: string | null
  type: CallType
}

export interface ActiveCall {
  conversationId: string
  type: CallType
  direction: CallDirection
  status: CallStatus
  startedAt: number | null
  otherUserId: string
  otherUserName: string
  otherUserAvatar?: string | null
}

interface CallStore {
  incomingCall: IncomingCall | null
  activeCall: ActiveCall | null
  setIncomingCall: (call: IncomingCall | null) => void
  setActiveCall: (call: ActiveCall | null) => void
  updateActiveCall: (patch: Partial<ActiveCall>) => void
}

export const useCallStore = create<CallStore>((set) => ({
  incomingCall: null,
  activeCall: null,
  setIncomingCall: (call) => set({ incomingCall: call }),
  setActiveCall: (call) => set({ activeCall: call }),
  updateActiveCall: (patch) =>
    set((s) => ({ activeCall: s.activeCall ? { ...s.activeCall, ...patch } : null })),
}))
