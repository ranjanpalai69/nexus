'use client'
import { useState } from 'react'
import { ConversationList } from '@/components/chat/ConversationList'
import { NewMessageModal } from '@/components/chat/NewMessageModal'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faMessage, faPenToSquare } from '@fortawesome/free-solid-svg-icons'
import { AnimatePresence } from 'framer-motion'
import { Button } from '@/components/ui/button'

export default function MessagesPage() {
  const [showNewMessage, setShowNewMessage] = useState(false)

  return (
    <>
      <div className="flex h-[calc(100dvh-10rem)] md:h-[calc(100vh-6rem)] rounded-2xl border border-border bg-card overflow-hidden">
        {/* Conversation list — full width on mobile, sidebar on large screens */}
        <div className="flex flex-col w-full lg:w-72 xl:w-80 border-r border-border shrink-0">
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <h1 className="text-lg font-bold">Messages</h1>
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => setShowNewMessage(true)}
              title="New Message"
            >
              <FontAwesomeIcon icon={faPenToSquare} className="h-4 w-4" />
            </Button>
          </div>
          <div className="flex-1 overflow-y-auto p-2">
            <ConversationList />
          </div>
        </div>

        {/* Empty state on large screens — hidden on mobile (whole page is conversation list) */}
        <div className="hidden lg:flex flex-1 flex-col items-center justify-center text-muted-foreground gap-4">
          <div className="h-20 w-20 rounded-full bg-muted flex items-center justify-center">
            <FontAwesomeIcon icon={faMessage} className="h-9 w-9 opacity-40" />
          </div>
          <div className="text-center space-y-1">
            <p className="font-medium text-sm">Your Messages</p>
            <p className="text-xs opacity-60">Select a conversation or start a new one</p>
          </div>
          <Button variant="gradient" size="sm" onClick={() => setShowNewMessage(true)}>
            New Message
          </Button>
        </div>
      </div>

      <AnimatePresence>
        {showNewMessage && <NewMessageModal onClose={() => setShowNewMessage(false)} />}
      </AnimatePresence>
    </>
  )
}
