'use client'
import { useEffect } from 'react'
import { useInfiniteQuery } from '@tanstack/react-query'
import { useInView } from 'react-intersection-observer'
import { NotificationItem } from '@/components/notifications/NotificationItem'
import { useNotificationStore } from '@/store/notificationStore'
import { Button } from '@/components/ui/button'
import { PageLoader, LoadingSpinner } from '@/components/shared/LoadingSpinner'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faBell, faCheck } from '@fortawesome/free-solid-svg-icons'
import type { NotificationWithActor } from '@/types/database'

export default function NotificationsPage() {
  const { setNotifications, markAllRead, unreadCount } = useNotificationStore()
  const { ref: loadMoreRef, inView } = useInView()

  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading } = useInfiniteQuery({
    queryKey: ['notifications'],
    queryFn: async ({ pageParam }) => {
      const res = await fetch(`/api/notifications?cursor=${pageParam || ''}`)
      const result = await res.json()
      return result
    },
    initialPageParam: '',
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
  })

  useEffect(() => {
    if (data?.pages?.[0]) {
      const all = data.pages.flatMap((p) => p.notifications)
      setNotifications(all)
    }
  }, [data, setNotifications])

  useEffect(() => {
    if (inView && hasNextPage && !isFetchingNextPage) fetchNextPage()
  }, [inView, hasNextPage, isFetchingNextPage, fetchNextPage])

  const handleMarkAllRead = async () => {
    markAllRead()
    await fetch('/api/notifications', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ markAll: true }),
    })
  }

  const notifications: NotificationWithActor[] = data?.pages.flatMap((p) => p.notifications) ?? []

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Notifications</h1>
        {unreadCount > 0 && (
          <Button variant="ghost" size="sm" onClick={handleMarkAllRead} className="gap-2 text-xs">
            <FontAwesomeIcon icon={faCheck} className="h-3 w-3" />
            Mark all read
          </Button>
        )}
      </div>

      <div className="rounded-2xl border border-border bg-card overflow-hidden">
        {isLoading ? (
          <PageLoader />
        ) : notifications.length === 0 ? (
          <div className="py-16 text-center space-y-3">
            <FontAwesomeIcon icon={faBell} className="h-12 w-12 text-muted-foreground/30" />
            <p className="text-muted-foreground text-sm">No notifications yet</p>
          </div>
        ) : (
          <div className="p-2 space-y-0.5">
            {notifications.map((n) => (
              <NotificationItem key={n.id} notification={n} />
            ))}
          </div>
        )}
      </div>

      <div ref={loadMoreRef} className="flex justify-center py-4">
        {isFetchingNextPage && <LoadingSpinner size="sm" />}
      </div>
    </div>
  )
}
