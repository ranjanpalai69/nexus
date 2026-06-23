// @ts-nocheck
export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    // Fetch current user's profile
    const { data: me } = await supabase
      .from('profiles')
      .select('id, location, following_count')
      .eq('id', user.id)
      .single()

    // Get list of users I already follow
    const { data: following } = await supabase
      .from('follows')
      .select('following_id')
      .eq('follower_id', user.id)

    const followingIds = new Set(following?.map((f) => f.following_id) ?? [])
    followingIds.add(user.id) // Exclude self

    const excludeIds = Array.from(followingIds)

    const suggestions: Record<string, { profile: object; score: number; reason: string }> = {}

    // 1. Location-based: users with similar location (same city/area)
    if (me?.location) {
      const cityToken = me.location.split(',')[0].trim() // Take city part
      if (cityToken.length >= 3) {
        const { data: nearbyUsers } = await supabase
          .from('profiles')
          .select('id, username, full_name, avatar_url, bio, is_verified, followers_count, location')
          .ilike('location', `%${cityToken}%`)
          .not('id', 'in', `(${excludeIds.join(',')})`)
          .order('followers_count', { ascending: false })
          .limit(10)

        nearbyUsers?.forEach((u) => {
          if (!suggestions[u.id]) {
            suggestions[u.id] = { profile: u, score: 30, reason: `Near you · ${u.location ?? ''}` }
          }
        })
      }
    }

    // 2. Friends-of-friends: people followed by users I follow
    if (followingIds.size > 1) {
      const myFollowingList = Array.from(followingIds).filter((id) => id !== user.id)
      if (myFollowingList.length > 0) {
        const { data: fof } = await supabase
          .from('follows')
          .select('following_id, follower:profiles!follows_follower_id_fkey(id, username, full_name, avatar_url, bio, is_verified, followers_count, location)')
          .in('follower_id', myFollowingList.slice(0, 20))
          .not('following_id', 'in', `(${excludeIds.join(',')})`)
          .limit(30)

        const fofCount: Record<string, number> = {}
        fof?.forEach(({ following_id }) => {
          fofCount[following_id] = (fofCount[following_id] ?? 0) + 1
        })

        fof?.forEach(({ following_id, follower }) => {
          if (!follower) return
          const mutualCount = fofCount[following_id] ?? 1
          const score = mutualCount * 20
          if (!suggestions[following_id] || suggestions[following_id].score < score) {
            const reason = mutualCount > 1 ? `${mutualCount} mutual connections` : 'Followed by someone you follow'
            suggestions[following_id] = { profile: follower, score, reason }
          }
        })
      }
    }

    // 3. Popular users (fallback if we have fewer than 8 suggestions)
    if (Object.keys(suggestions).length < 8) {
      const existingSuggestedIds = [...excludeIds, ...Object.keys(suggestions)]
      const { data: popular } = await supabase
        .from('profiles')
        .select('id, username, full_name, avatar_url, bio, is_verified, followers_count, location')
        .not('id', 'in', `(${existingSuggestedIds.join(',')})`)
        .order('followers_count', { ascending: false })
        .limit(10)

      popular?.forEach((u) => {
        if (!suggestions[u.id]) {
          suggestions[u.id] = { profile: u, score: 5, reason: 'Popular on Nexus' }
        }
      })
    }

    // Sort by score desc, then followers_count
    const sorted = Object.values(suggestions)
      .sort((a, b) => {
        if (b.score !== a.score) return b.score - a.score
        return ((b.profile as { followers_count: number }).followers_count ?? 0) -
          ((a.profile as { followers_count: number }).followers_count ?? 0)
      })
      .slice(0, 15)

    return NextResponse.json({
      suggestions: sorted.map(({ profile, reason }) => ({ ...profile, reason })),
    })
  } catch (err) {
    console.error('[suggestions]', err)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}
