import type { Metadata } from 'next'
import { ConversationList } from '@/components/chat/ConversationList'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faMessage } from '@fortawesome/free-solid-svg-icons'

export const metadata: Metadata = { title: 'Messages' }

export default function MessagesPage() {
  return (
    <div className="rounded-2xl border border-border bg-card overflow-hidden">
      <div className="border-b border-border p-4">
        <h1 className="text-xl font-bold">Messages</h1>
      </div>
      <div className="p-2">
        <ConversationList />
      </div>
      <div className="hidden lg:flex flex-col items-center justify-center h-64 text-muted-foreground">
        <FontAwesomeIcon icon={faMessage} className="h-12 w-12 opacity-20 mb-3" />
        <p className="text-sm">Select a conversation to start messaging</p>
      </div>
    </div>
  )
}
