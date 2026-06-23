import { adminClient } from '@/lib/supabase/server'
import { v4 as uuidv4 } from 'uuid'

export const STORAGE_BUCKET = 'media'

export type UploadFolder = 'avatars' | 'covers' | 'posts' | 'chat' | 'audio'

export async function generateUploadUrl(
  folder: UploadFolder,
  fileName: string,
  userId: string
) {
  const ext = fileName.split('.').pop() ?? 'bin'
  const path = `${folder}/${userId}/${uuidv4()}.${ext}`

  const { data, error } = await adminClient.storage
    .from(STORAGE_BUCKET)
    .createSignedUploadUrl(path)

  if (error) throw error

  const { data: { publicUrl } } = adminClient.storage
    .from(STORAGE_BUCKET)
    .getPublicUrl(path)

  return { uploadUrl: data.signedUrl, publicUrl, path }
}

export async function deleteStorageObject(path: string) {
  await adminClient.storage.from(STORAGE_BUCKET).remove([path])
}

export function getPublicUrl(path: string) {
  const { data: { publicUrl } } = adminClient.storage
    .from(STORAGE_BUCKET)
    .getPublicUrl(path)
  return publicUrl
}
