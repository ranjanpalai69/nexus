'use client'
import { useEffect } from 'react'
import { Button } from '@/components/ui/button'

export default function Error({ error, reset }: { error: Error; reset: () => void }) {
  useEffect(() => { console.error(error) }, [error])
  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4 text-center p-6">
      <h2 className="text-xl font-bold">Something went wrong</h2>
      <p className="text-muted-foreground text-sm">{error.message}</p>
      <Button onClick={reset} variant="gradient">Try Again</Button>
    </div>
  )
}
