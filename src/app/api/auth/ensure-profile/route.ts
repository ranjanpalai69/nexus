export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { createClient, adminClient } from '@/lib/supabase/server'

export async function POST() {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    // Check if profile already exists
    const { data: existing } = await adminClient
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .maybeSingle()

    if (existing) return NextResponse.json({ profile: existing })

    // Profile missing — DB trigger may not be installed. Create it now.
    const meta = (user.user_metadata || {}) as Record<string, unknown>
    let username = String(meta.username || user.email?.split('@')[0] || 'user')
    username = username.replace(/[^a-zA-Z0-9_]/g, '_').slice(0, 30)

    // Ensure unique username
    let finalUsername = username
    for (let i = 1; i <= 99; i++) {
      const { data: taken } = await adminClient
        .from('profiles').select('id').eq('username', finalUsername).maybeSingle()
      if (!taken) break
      finalUsername = `${username}${i}`
    }

    const { data: profile, error: insertError } = await adminClient
      .from('profiles')
      .insert({
        id: user.id,
        email: user.email ?? '',
        username: finalUsername,
        full_name: String(meta.full_name || meta.name || ''),
        avatar_url: meta.avatar_url ? String(meta.avatar_url) : null,
      })
      .select('*')
      .single()

    if (insertError) {
      // Race: trigger created it between our check and insert
      const { data: retry } = await adminClient.from('profiles').select('*').eq('id', user.id).maybeSingle()
      if (retry) return NextResponse.json({ profile: retry })
      console.error('[ensure-profile insert]', insertError)
      return NextResponse.json({ error: 'Profile creation failed' }, { status: 500 })
    }

    return NextResponse.json({ profile })
  } catch (err) {
    console.error('[ensure-profile]', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
