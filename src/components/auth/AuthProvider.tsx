'use client'
import { useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAuthStore } from '@/store/authStore'
import type { User } from '@supabase/supabase-js'

async function fetchProfile(supabase: ReturnType<typeof createClient>, userId: string) {
  for (let attempt = 0; attempt < 4; attempt++) {
    if (attempt > 0) await new Promise((r) => setTimeout(r, attempt * 500))
    const { data } = await supabase.from('profiles').select('*').eq('id', userId).maybeSingle()
    if (data) return data
  }
  return null
}

async function ensureProfile(supabase: ReturnType<typeof createClient>, user: User) {
  const profile = await fetchProfile(supabase, user.id)
  if (profile) return profile

  try {
    const res = await fetch('/api/auth/ensure-profile', { method: 'POST' })
    if (res.ok) {
      const body = await res.json()
      if (body.profile) return body.profile
    }
  } catch {}

  // Give the DB one more second (trigger race) then retry
  await new Promise((r) => setTimeout(r, 1000))
  return fetchProfile(supabase, user.id)
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const setUser = useAuthStore((s) => s.setUser)
  const supabase = createClient()

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user) {
        const needsEnsure = event === 'SIGNED_IN'
          || event === 'USER_UPDATED'
          || event === 'INITIAL_SESSION'
        const profile = needsEnsure
          ? await ensureProfile(supabase, session.user)
          : await fetchProfile(supabase, session.user.id)

        // Only clear the user if we're sure there's no session — never wipe on a
        // profile-fetch failure while the user is genuinely signed in.
        if (profile) {
          setUser(profile)
        }
        // If profile is null here, ensureProfile exhausted all retries. Don't call
        // setUser(null) — keep whatever is in the store (may be stale but better than
        // logging the user out). They'll see a retry on next page load.
      } else {
        setUser(null)
      }
    })

    return () => subscription.unsubscribe()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return <>{children}</>
}
