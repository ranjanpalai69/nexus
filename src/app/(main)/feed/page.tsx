import type { Metadata } from 'next'
import { FeedList } from '@/components/feed/FeedList'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'

export const metadata: Metadata = { title: 'Home' }

export default function FeedPage() {
  return (
    <div className="space-y-4">
      <Tabs defaultValue="feed">
        <TabsList className="w-full">
          <TabsTrigger value="feed" className="flex-1">For You</TabsTrigger>
          <TabsTrigger value="explore" className="flex-1">Explore</TabsTrigger>
        </TabsList>
        <TabsContent value="feed">
          <FeedList type="feed" />
        </TabsContent>
        <TabsContent value="explore">
          <FeedList type="explore" />
        </TabsContent>
      </Tabs>
    </div>
  )
}
