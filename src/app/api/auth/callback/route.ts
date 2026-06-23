export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { adminClient } from '@/lib/supabase/server'

export async function GET(request: Request) {
  // Always use the configured app URL so Render's internal proxy doesn't leak localhost
  const appOrigin = (process.env.NEXT_PUBLIC_APP_URL || new URL(request.url).origin).replace(/\/$/, '')

  try {
    const { searchParams } = new URL(request.url)
    const code = searchParams.get('code')
    const type = searchParams.get('type') // 'recovery' for password reset links
    const next = searchParams.get('next') ?? '/feed'

    if (code) {
      const supabase = await createClient()
      const { data, error } = await supabase.auth.exchangeCodeForSession(code)

      if (!error && data.user) {
        if (type === 'recovery') {
          return NextResponse.redirect(`${appOrigin}/reset-password`)
        }

        // Create profile on first OAuth / email-confirmed signup
        const meta = data.user.user_metadata || {}
        const username = meta.username as string | undefined
        const fullName = (meta.full_name || meta.name || '') as string

        if (username) {
          const { data: existing } = await adminClient
            .from('profiles')
            .select('id')
            .eq('id', data.user.id)
            .maybeSingle()

          if (!existing) {
            await adminClient.from('profiles').insert({
              id: data.user.id,
              username,
              full_name: fullName,
              email: data.user.email ?? '',
            })
          }
        }

        return NextResponse.redirect(`${appOrigin}${next}`)
      }
    }

    return NextResponse.redirect(`${appOrigin}/login?error=auth_error`)
  } catch {
    return NextResponse.redirect(`${appOrigin}/login?error=auth_error`)
  }
}
