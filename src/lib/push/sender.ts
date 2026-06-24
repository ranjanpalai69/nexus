// @ts-nocheck
import webpush from 'web-push'
import { adminClient } from '@/lib/supabase/server'

let vapidSet = false

function ensureVapid() {
  if (vapidSet) return
  const pub = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
  const priv = process.env.VAPID_PRIVATE_KEY
  if (!pub || !priv) return
  webpush.setVapidDetails(
    `mailto:${process.env.VAPID_EMAIL || 'admin@nexus.app'}`,
    pub,
    priv,
  )
  vapidSet = true
}

export interface PushPayload {
  title: string
  body: string
  icon?: string
  badge?: string
  tag?: string
  url?: string
  data?: Record<string, unknown>
  actions?: Array<{ action: string; title: string }>
  requireInteraction?: boolean
  ttl?: number
  urgency?: 'very-low' | 'low' | 'normal' | 'high'
}

export async function sendPushToUser(userId: string, payload: PushPayload): Promise<void> {
  if (!process.env.VAPID_PRIVATE_KEY) return
  ensureVapid()

  const { data: subs } = await adminClient
    .from('push_subscriptions')
    .select('id, subscription')
    .eq('user_id', userId)

  if (!subs?.length) return

  const { ttl = 86400, urgency = 'normal', ...rest } = payload
  const body = JSON.stringify({
    ...rest,
    icon: rest.icon ?? '/logo.svg',
    badge: '/logo.svg',
  })

  await Promise.allSettled(
    subs.map(async ({ id, subscription }) => {
      try {
        await webpush.sendNotification(
          subscription as webpush.PushSubscription,
          body,
          { TTL: ttl, urgency },
        )
      } catch (err: unknown) {
        const code = (err as { statusCode?: number }).statusCode
        if (code === 410 || code === 404) {
          await adminClient.from('push_subscriptions').delete().eq('id', id)
        }
      }
    }),
  )
}

// ── Typed helpers ────────────────────────────────────────────────────────────

export async function pushFollow(recipientId: string, actorName: string) {
  await sendPushToUser(recipientId, {
    title: 'New follower',
    body: `${actorName} started following you`,
    tag: 'follow',
    url: '/notifications',
  })
}

export async function pushLike(recipientId: string, actorName: string) {
  await sendPushToUser(recipientId, {
    title: 'New like',
    body: `${actorName} liked your post`,
    tag: 'like',
    url: '/notifications',
  })
}

export async function pushComment(recipientId: string, actorName: string, preview: string) {
  await sendPushToUser(recipientId, {
    title: `${actorName} commented`,
    body: preview.slice(0, 80),
    tag: 'comment',
    url: '/notifications',
  })
}

export async function pushReply(recipientId: string, actorName: string, preview: string) {
  await sendPushToUser(recipientId, {
    title: `${actorName} replied`,
    body: preview.slice(0, 80),
    tag: 'reply',
    url: '/notifications',
  })
}

export async function pushMention(recipientId: string, actorName: string, preview: string) {
  await sendPushToUser(recipientId, {
    title: `${actorName} mentioned you`,
    body: preview.slice(0, 80),
    tag: 'mention',
    url: '/notifications',
  })
}

export async function pushMessage(
  recipientId: string,
  senderName: string,
  preview: string,
  conversationId: string,
) {
  await sendPushToUser(recipientId, {
    title: senderName,
    body: preview.slice(0, 80),
    tag: `msg-${conversationId}`,
    url: `/messages/${conversationId}`,
    data: { conversationId },
    urgency: 'high',
    ttl: 3600,
  })
}

export async function pushCallInvite(
  calleeId: string,
  callerName: string,
  callerAvatar: string | null,
  type: 'audio' | 'video',
  conversationId: string,
  callerId: string,
) {
  await sendPushToUser(calleeId, {
    title: type === 'video' ? '📹 Incoming video call' : '📞 Incoming audio call',
    body: `${callerName} is calling you`,
    tag: 'call',
    url: `/messages/${conversationId}`,
    requireInteraction: true,
    data: { conversationId, callerId, callerName, callerAvatar, callType: type },
    actions: [
      { action: 'accept', title: '✅ Accept' },
      { action: 'reject', title: '❌ Reject' },
    ],
    urgency: 'high',
    ttl: 45,
  })
}
