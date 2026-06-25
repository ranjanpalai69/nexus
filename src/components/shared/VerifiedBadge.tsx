import { BadgeCheck } from 'lucide-react'
import { cn } from '@/lib/utils/cn'

export function VerifiedBadge({ className }: { className?: string }) {
  return (
    <BadgeCheck
      aria-label="Verified"
      className={cn('h-3.5 w-3.5 text-primary shrink-0 inline-block', className)}
    />
  )
}
