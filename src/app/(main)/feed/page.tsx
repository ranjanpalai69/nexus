import type { Metadata } from 'next'
import { FeedList } from '@/components/feed/FeedList'
import { StoriesBar } from '@/components/stories/StoriesBar'
import { MobileWhoToFollow } from '@/components/shared/MobileWhoToFollow'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'

export const metadata: Metadata = { title: 'Home' }

export default function FeedPage() {
  return (
    <div className="space-y-4">
      <StoriesBar />
      <MobileWhoToFollow />
      <Tabs defaultValue="explore">
        <TabsList className="w-full">
          <TabsTrigger value="explore" className="flex-1">Explore</TabsTrigger>
          <TabsTrigger value="feed" className="flex-1">Following</TabsTrigger>
        </TabsList>
        <TabsContent value="explore">
          <FeedList type="explore" />
        </TabsContent>
        <TabsContent value="feed">
          <FeedList type="feed" />
        </TabsContent>
      </Tabs>
    </div>
  )
}
