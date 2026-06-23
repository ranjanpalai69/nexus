import { createServerClient } from '@supabase/ssr'
import { createClient as createSupabaseClient, type SupabaseClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import type { Database } from '@/types/database'

export async function createClient() {
  const cookieStore = await cookies()
  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll() },
        setAll(cookiesToSet: { name: string; value: string; options?: Record<string, unknown> }[]) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options as Parameters<typeof cookieStore.set>[2])
            )
          } catch {}
        },
      },
    }
  )
}

// Lazily-initialized service role client (bypasses RLS, server-only).
// Lazy init prevents "supabaseUrl is required" during Next.js static build.
let _adminClient: SupabaseClient<Database> | null = null

export const adminClient = new Proxy({} as SupabaseClient<Database>, {
  get(_target, prop, receiver) {
    if (!_adminClient) {
      _adminClient = createSupabaseClient<Database>(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
        { auth: { autoRefreshToken: false, persistSession: false } }
      )
    }
    const value = Reflect.get(_adminClient, prop, receiver)
    return typeof value === 'function' ? value.bind(_adminClient) : value
  },
})
