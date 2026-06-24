'use client'
import { useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAuthStore } from '@/store/authStore'
import type { User } from '@supabase/supabase-js'

async function fetchProfile(supabase: ReturnType<typeof createClient>, userId: string) {
  for (let attempt = 0; attempt < 3; attempt++) {
    if (attempt > 0) await new Promise((r) => setTimeout(r, attempt * 400))
    const { data } = await supabase.from('profiles').select('*').eq('id', userId).single()
    if (data) return data
  }
  return null
}

async function ensureProfile(supabase: ReturnType<typeof createClient>, user: User) {
  // Fast path: profile already exists
  const profile = await fetchProfile(supabase, user.id)
  if (profile) return profile

  // Profile missing (no DB trigger or new OAuth user) — create it server-side
  try {
    const res = await fetch('/api/auth/ensure-profile', { method: 'POST' })
    if (res.ok) {
      const body = await res.json()
      if (body.profile) return body.profile
    }
  } catch {}

  // One final attempt in case creation just raced
  return fetchProfile(supabase, user.id)
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const setUser = useAuthStore((s) => s.setUser)
  const supabase = createClient()

  useEffect(() => {
    // onAuthStateChange fires immediately with INITIAL_SESSION for existing sessions,
    // then fires SIGNED_IN / SIGNED_OUT / TOKEN_REFRESHED on subsequent changes.
    // We use this as the single source of truth — no separate getUser() call needed.
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user) {
        // Always ensure profile on session start / sign-in events.
        // TOKEN_REFRESHED just needs a fast fetch (profile already exists).
        const needsEnsure = event === 'SIGNED_IN'
          || event === 'USER_UPDATED'
          || event === 'INITIAL_SESSION'
        const profile = needsEnsure
          ? await ensureProfile(supabase, session.user)
          : await fetchProfile(supabase, session.user.id)
        setUser(profile)
      } else {
        setUser(null)
      }
    })

    return () => subscription.unsubscribe()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return <>{children}</>
}
