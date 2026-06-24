'use client'
import { useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAuthStore } from '@/store/authStore'
import type { User } from '@supabase/supabase-js'

async function fetchProfile(supabase: ReturnType<typeof createClient>, user: User) {
  // Retry up to 3 times with back-off. The DB trigger that creates the profile
  // runs synchronously, but network hiccups can make the first fetch fail.
  for (let attempt = 0; attempt < 3; attempt++) {
    if (attempt > 0) await new Promise((r) => setTimeout(r, attempt * 400))
    const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single()
    if (data) return data
  }
  return null
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { setUser, setLoading } = useAuthStore()
  const supabase = createClient()

  useEffect(() => {
    setLoading(true)

    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (user) {
        const profile = await fetchProfile(supabase, user)
        setUser(profile)
      } else {
        setUser(null)
      }
    })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user) {
        const profile = await fetchProfile(supabase, session.user)
        setUser(profile)
      } else {
        setUser(null)
      }
    })

    return () => subscription.unsubscribe()
  }, [supabase, setUser, setLoading])

  return <>{children}</>
}
