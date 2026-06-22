'use client'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useAuthStore } from '@/store/authStore'
import { UserAvatar } from '@/components/shared/UserAvatar'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faCamera } from '@fortawesome/free-solid-svg-icons'
import toast from 'react-hot-toast'

const schema = z.object({
  full_name: z.string().min(1).max(100),
  username: z.string().min(3).max(30).regex(/^[a-zA-Z0-9_]+$/),
  bio: z.string().max(500).optional(),
  website: z.string().url().optional().or(z.literal('')),
  location: z.string().max(100).optional(),
})
type FormData = z.infer<typeof schema>

export default function EditProfilePage() {
  const { user, updateProfile } = useAuthStore()
  const [loading, setLoading] = useState(false)
  const [uploading, setUploading] = useState(false)

  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      full_name: user?.full_name ?? '',
      username: user?.username ?? '',
      bio: user?.bio ?? '',
      website: user?.website ?? '',
      location: user?.location ?? '',
    },
  })

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !user) return
    setUploading(true)
    try {
      const res = await fetch('/api/upload/presigned', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileName: file.name, contentType: file.type, fileSize: file.size, folder: 'avatars' }),
      })
      const { uploadUrl, publicUrl } = await res.json()
      await fetch(uploadUrl, { method: 'PUT', body: file, headers: { 'Content-Type': file.type } })

      const patchRes = await fetch('/api/users/me', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ avatar_url: publicUrl }),
      })
      const data = await patchRes.json()
      if (data.profile) { updateProfile({ avatar_url: publicUrl }); toast.success('Avatar updated!') }
    } catch { toast.error('Upload failed') }
    finally { setUploading(false) }
  }

  const onSubmit = async (data: FormData) => {
    setLoading(true)
    try {
      const res = await fetch('/api/users/me', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      const result = await res.json()
      if (!res.ok) { toast.error(result.error); return }
      updateProfile(result.profile)
      toast.success('Profile updated!')
    } catch { toast.error('Update failed') }
    finally { setLoading(false) }
  }

  if (!user) return null

  return (
    <div className="max-w-lg space-y-6">
      <h1 className="text-xl font-bold">Edit Profile</h1>

      {/* Avatar */}
      <div className="flex items-center gap-4">
        <div className="relative group">
          <UserAvatar user={user} size="xl" />
          <label className="absolute inset-0 flex items-center justify-center rounded-full bg-black/50 opacity-0 group-hover:opacity-100 cursor-pointer transition-opacity">
            <FontAwesomeIcon icon={faCamera} className="h-5 w-5 text-white" />
            <input type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} />
          </label>
        </div>
        <div>
          <p className="text-sm font-semibold">{user.full_name || user.username}</p>
          <p className="text-xs text-muted-foreground">Click avatar to change photo</p>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <label className="text-sm font-medium mb-1.5 block">Full Name</label>
          <Input {...register('full_name')} error={errors.full_name?.message} />
        </div>
        <div>
          <label className="text-sm font-medium mb-1.5 block">Username</label>
          <Input {...register('username')} error={errors.username?.message} />
        </div>
        <div>
          <label className="text-sm font-medium mb-1.5 block">Bio</label>
          <Textarea {...register('bio')} rows={3} placeholder="Tell the world about yourself..." />
        </div>
        <div>
          <label className="text-sm font-medium mb-1.5 block">Website</label>
          <Input {...register('website')} placeholder="https://yoursite.com" />
        </div>
        <div>
          <label className="text-sm font-medium mb-1.5 block">Location</label>
          <Input {...register('location')} placeholder="City, Country" />
        </div>
        <Button type="submit" variant="gradient" className="w-full" loading={loading}>
          Save Changes
        </Button>
      </form>
    </div>
  )
}
