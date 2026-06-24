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
  // First try: profile may already exist (normal case)
  const profile = await fetchProfile(supabase, user.id)
  if (profile) return profile

  // Fallback: trigger might not be installed — create profile server-side
  try {
    const res = await fetch('/api/auth/ensure-profile', { method: 'POST' })
    if (res.ok) {
      const body = await res.json()
      if (body.profile) return body.profile
    }
  } catch {
    // network error — try one more direct fetch
  }

  return fetchProfile(supabase, user.id)
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { setUser, setLoading } = useAuthStore()
  const supabase = createClient()

  useEffect(() => {
    setLoading(true)

    // Initial session check
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (user) {
        const profile = await fetchProfile(supabase, user.id)
        setUser(profile)
      } else {
        setUser(null)
      }
    })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user) {
        // On sign-in / sign-up, ensure the profile exists before setting user
        const profile = (event === 'SIGNED_IN' || event === 'USER_UPDATED')
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
