export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { adminClient } from '@/lib/supabase/server'

export async function GET(request: Request) {
  const appOrigin = (process.env.NEXT_PUBLIC_APP_URL || new URL(request.url).origin).replace(/\/$/, '')

  try {
    const { searchParams } = new URL(request.url)
    const code = searchParams.get('code')
    const type = searchParams.get('type')
    const next = searchParams.get('next') ?? '/feed'

    if (code) {
      const supabase = await createClient()
      const { data, error } = await supabase.auth.exchangeCodeForSession(code)

      if (!error && data.user) {
        if (type === 'recovery') {
          return NextResponse.redirect(`${appOrigin}/reset-password`)
        }

        // Ensure profile exists for this user
        const { data: existing } = await adminClient
          .from('profiles')
          .select('id')
          .eq('id', data.user.id)
          .maybeSingle()

        if (!existing) {
          const meta = (data.user.user_metadata || {}) as Record<string, string>
          // Use username from metadata, or derive a safe one from email/provider
          const rawUsername = meta.username
            || data.user.email?.split('@')[0]
            || `user_${data.user.id.slice(0, 8)}`
          const baseUsername = rawUsername.replace(/[^a-zA-Z0-9_]/g, '_').slice(0, 28)

          // Find an available username
          let finalUsername = baseUsername
          for (let i = 1; i <= 99; i++) {
            const { data: taken } = await adminClient
              .from('profiles').select('id').eq('username', finalUsername).maybeSingle()
            if (!taken) break
            finalUsername = `${baseUsername}${i}`
          }

          try {
            await adminClient.from('profiles').insert({
              id: data.user.id,
              username: finalUsername,
              full_name: String(meta.full_name || meta.name || ''),
              email: data.user.email ?? '',
              avatar_url: meta.avatar_url ? String(meta.avatar_url) : null,
            })
          } catch {} // Ignore if trigger already created it
        }

        return NextResponse.redirect(`${appOrigin}${next}`)
      }
    }

    return NextResponse.redirect(`${appOrigin}/login?error=auth_error`)
  } catch {
    return NextResponse.redirect(`${appOrigin}/login?error=auth_error`)
  }
}
