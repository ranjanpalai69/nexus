import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'
import { ProfileHeader } from '@/components/profile/ProfileHeader'
import { FeedList } from '@/components/feed/FeedList'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import type { Profile } from '@/types/database'

interface Props { params: Promise<{ username: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { username } = await params
  return { title: username }
}

async function getProfile(username: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: profile } = await supabase.from('profiles').select('*').eq('username', username).single()
  if (!profile) return null

  let is_following = false
  let is_followed_by = false
  if (user && user.id !== profile.id) {
    const [f1, f2] = await Promise.all([
      supabase.from('follows').select('id').eq('follower_id', user.id).eq('following_id', profile.id).single(),
      supabase.from('follows').select('id').eq('follower_id', profile.id).eq('following_id', user.id).single(),
    ])
    is_following = !!f1.data
    is_followed_by = !!f2.data
  }

  return { ...profile, is_following, is_followed_by, is_own: user?.id === profile.id }
}

export default async function ProfilePage({ params }: Props) {
  const { username } = await params
  const profile = await getProfile(username)
  if (!profile) notFound()

  return (
    <div className="space-y-4">
      <ProfileHeader profile={profile as Profile & { is_following?: boolean; is_own?: boolean; is_followed_by?: boolean }} />
      <Tabs defaultValue="posts">
        <TabsList className="w-full">
          <TabsTrigger value="posts" className="flex-1">Posts</TabsTrigger>
          <TabsTrigger value="media" className="flex-1">Media</TabsTrigger>
          <TabsTrigger value="likes" className="flex-1">Likes</TabsTrigger>
        </TabsList>
        <TabsContent value="posts">
          <FeedList type="feed" username={profile.username} />
        </TabsContent>
        <TabsContent value="media">
          <div className="py-8 text-center text-muted-foreground text-sm">Media grid coming soon</div>
        </TabsContent>
        <TabsContent value="likes">
          <div className="py-8 text-center text-muted-foreground text-sm">Liked posts coming soon</div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
