import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import { v4 as uuidv4 } from 'uuid'

const s3 = new S3Client({
  region: process.env.AWS_REGION!,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
  ...(process.env.AWS_S3_ENDPOINT
    ? { endpoint: process.env.AWS_S3_ENDPOINT, forcePathStyle: true }
    : {}),
})

const BUCKET = process.env.AWS_S3_BUCKET!
const CDN_URL = process.env.NEXT_PUBLIC_CDN_URL || `https://${BUCKET}.s3.${process.env.AWS_REGION}.amazonaws.com`

export type UploadFolder = 'avatars' | 'covers' | 'posts' | 'chat' | 'audio'

export async function generatePresignedUploadUrl(
  folder: UploadFolder,
  fileName: string,
  contentType: string,
  userId: string
) {
  const ext = fileName.split('.').pop()
  const key = `${folder}/${userId}/${uuidv4()}.${ext}`

  const command = new PutObjectCommand({
    Bucket: BUCKET,
    Key: key,
    ContentType: contentType,
  })

  const url = await getSignedUrl(s3, command, { expiresIn: 300 })
  const publicUrl = `${CDN_URL}/${key}`

  return { uploadUrl: url, publicUrl, key }
}

export async function deleteS3Object(key: string) {
  const command = new DeleteObjectCommand({ Bucket: BUCKET, Key: key })
  await s3.send(command)
}

export function getPublicUrl(key: string) {
  return `${CDN_URL}/${key}`
}

export { s3 }
