'use client'
import { useRef, useState } from 'react'
import { cn } from '@/lib/utils/cn'

interface OtpInputProps {
  onChange: (code: string) => void
  disabled?: boolean
}

export function OtpInput({ onChange, disabled }: OtpInputProps) {
  const [digits, setDigits] = useState<string[]>(Array(6).fill(''))
  const refs = useRef<(HTMLInputElement | null)[]>([])

  function setAt(i: number, val: string) {
    const d = val.replace(/\D/g, '').slice(-1)
    const next = [...digits]
    next[i] = d
    setDigits(next)
    onChange(next.join(''))
    if (d && i < 5) refs.current[i + 1]?.focus()
  }

  return (
    <div className="flex gap-2 justify-center">
      {digits.map((d, i) => (
        <input
          key={i}
          ref={el => { refs.current[i] = el }}
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          maxLength={1}
          value={d}
          disabled={disabled}
          autoComplete={i === 0 ? 'one-time-code' : 'off'}
          onChange={e => setAt(i, e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Backspace') {
              if (d) { setAt(i, '') }
              else if (i > 0) refs.current[i - 1]?.focus()
            }
          }}
          onFocus={e => e.target.select()}
          onPaste={e => {
            e.preventDefault()
            const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6)
            const next = Array.from({ length: 6 }, (_, j) => pasted[j] || '')
            setDigits(next)
            onChange(next.join(''))
            refs.current[Math.min(pasted.length, 5)]?.focus()
          }}
          className={cn(
            'w-11 h-12 text-center text-xl font-bold rounded-xl border bg-background/50',
            'focus:outline-none focus:ring-2 focus:ring-ring focus:border-primary/50 transition-all duration-200',
            d ? 'border-primary/60 text-foreground' : 'border-border/60',
            disabled && 'opacity-50 pointer-events-none'
          )}
        />
      ))}
    </div>
  )
}
