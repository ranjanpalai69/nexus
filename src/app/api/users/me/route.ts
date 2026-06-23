// @ts-nocheck
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient, adminClient } from '@/lib/supabase/server'

const updateSchema = z.object({
  full_name: z.string().min(1).max(100).optional(),
  username: z.string().min(3).max(30).regex(/^[a-zA-Z0-9_]+$/).optional(),
  bio: z.string().max(500).optional(),
  website: z.string().url().optional().or(z.literal('')),
  location: z.string().max(100).optional(),
  phone: z.string().max(20).optional(),
  avatar_url: z.string().url().optional(),
  cover_url: z.string().url().optional(),
  is_private: z.boolean().optional(),
  email_notifications: z.boolean().optional(),
  push_notifications: z.boolean().optional(),
})

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single()
    return NextResponse.json({ profile })
  } catch (err) {
    console.error('[me GET]', err)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}

export async function PATCH(req: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = updateSchema.parse(await req.json())

    if (body.username) {
      const { data: taken } = await supabase
        .from('profiles')
        .select('id')
        .eq('username', body.username)
        .neq('id', user.id)
        .single()
      if (taken) return NextResponse.json({ error: 'Username already taken' }, { status: 409 })
    }

    const { data: profile, error } = await adminClient
      .from('profiles')
      .update(body)
      .eq('id', user.id)
      .select()
      .single()

    if (error) throw error
    return NextResponse.json({ profile })
  } catch (err) {
    if (err instanceof z.ZodError) return NextResponse.json({ error: err.errors[0].message }, { status: 400 })
    console.error('[me PATCH]', err)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}
