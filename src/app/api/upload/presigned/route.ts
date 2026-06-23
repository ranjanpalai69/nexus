export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { generateUploadUrl, type UploadFolder } from '@/lib/storage/client'
import { rateLimit, rateLimitResponse } from '@/lib/utils/rateLimit'
import { ALLOWED_IMAGE_TYPES, ALLOWED_VIDEO_TYPES, ALLOWED_AUDIO_TYPES, MAX_FILE_SIZE } from '@/lib/utils/helpers'

const schema = z.object({
  fileName: z.string().min(1).max(255),
  contentType: z.string().min(1),
  fileSize: z.number().positive().max(MAX_FILE_SIZE),
  folder: z.enum(['avatars', 'covers', 'posts', 'chat', 'audio', 'stories']),
})

const ALLOWED_TYPES = [...ALLOWED_IMAGE_TYPES, ...ALLOWED_VIDEO_TYPES, ...ALLOWED_AUDIO_TYPES, 'application/pdf', 'application/zip', 'application/octet-stream']

export async function POST(req: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { success } = await rateLimit(`upload:${user.id}`, 100, 3600)
    if (!success) return rateLimitResponse()

    const body = schema.parse(await req.json())

    if (!ALLOWED_TYPES.some((t) => body.contentType.startsWith(t.split('/')[0]) || body.contentType === t)) {
      return NextResponse.json({ error: 'File type not allowed' }, { status: 400 })
    }

    const { uploadUrl, publicUrl, path } = await generateUploadUrl(
      body.folder as UploadFolder,
      body.fileName,
      user.id
    )

    return NextResponse.json({ uploadUrl, publicUrl, path })
  } catch (err) {
    if (err instanceof z.ZodError) return NextResponse.json({ error: err.errors[0].message }, { status: 400 })
    console.error('[presigned]', err)
    return NextResponse.json({ error: 'Failed to generate upload URL' }, { status: 500 })
  }
}
