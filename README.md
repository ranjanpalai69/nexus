# Nexus

A full-stack social media platform with real-time messaging, audio/video calling, stories, push notifications, and PWA support.

**Live:** https://nexus-ezh1.onrender.com

---

## Features

### Social Feed
- Create, like, save, and comment on posts
- Image upload support
- Infinite scroll feed from followed users
- Explore page to discover new content and users

### Stories
- 24-hour expiring stories with image support
- Story view tracking and like reactions
- Horizontal story bar with auto-advance

### Profiles
- Public profiles with follower/following counts
- Avatar upload and bio editing
- Follow/unfollow with live count updates via Socket.io
- Profile search by username or name

### Messaging
- Real-time 1-on-1 conversations via Socket.io
- Text, image, audio, and file messages
- Typing indicators and read receipts
- Unread badge counts
- Optimistic message sends (instant UI, confirmed by server)

### Audio & Video Calling
- WebRTC peer-to-peer audio and video calls
- Inline call overlay (no separate window)
- Incoming call modal with accept/reject
- Busy signal when recipient is already in a call
- Instant reject/end with decline sound feedback
- Reliable signaling via module-level event bus — no dropped events on mount

### Notifications
- Real-time in-app notifications for likes, comments, follows, mentions
- Notification count badge in nav
- Mark all as read

### Push Notifications (PWA)
- Web Push via VAPID — works when the browser is backgrounded or closed
- Notifications for new messages and incoming calls
- Call push: `requireInteraction: true`, 45s TTL, `urgency: high`
- Message push: `urgency: high`, 1h TTL
- App-focused tab detection — skips notification if tab is already visible (except calls)
- Re-subscribe logic before expiry (7-day window)

### Auth
- Email + password sign-up and login
- OAuth (Google, GitHub) via Supabase
- Profile auto-created on first sign-in (handles `INITIAL_SESSION`, `SIGNED_IN`, OAuth callback)
- Password reset flow via email

### PWA
- Installable on desktop and mobile
- Service worker with offline cache (`nexus-v2`)
- `SKIP_WAITING` for instant SW updates

---

## Architecture

```
Browser
  ├── Next.js 15 App Router (React 19)
  │     ├── Server Components — data fetching, SEO
  │     ├── Client Components — interactive UI (Zustand, TanStack Query)
  │     └── API Routes — REST endpoints
  │
  ├── Socket.io client — real-time events
  └── Service Worker (public/sw.js) — push + offline cache

Server (server.ts via tsx)
  ├── Next.js request handler
  ├── Socket.io server
  │     ├── Rooms: user:{id} (personal), conversation:{id} (shared)
  │     ├── Presence tracking
  │     └── WebRTC signaling relay
  └── Redis adapter — multi-instance Socket.io scaling

Supabase
  ├── PostgreSQL — all persistent data
  ├── Row Level Security — per-user data isolation
  ├── Auth — email + OAuth sessions
  └── Storage — media uploads

Render — deployment platform
```

### State Management

| Layer | Tool | Purpose |
|---|---|---|
| Server state | TanStack Query | API data caching, background refetch |
| Real-time state | Zustand | Messages, notifications, call state, auth |
| WebRTC signaling | `callEvents.ts` singleton | Event bus survives React re-renders, buffers events before `CallOverlay` mounts |

### Database Schema (6 migrations)

| Table | Description |
|---|---|
| `profiles` | User profiles, bio, avatar, follower counts |
| `posts` | Feed posts with media |
| `post_likes` / `post_saves` | Many-to-many engagement |
| `comments` | Nested post comments |
| `follows` | Follow graph |
| `conversations` + `conversation_participants` | DM threads |
| `messages` | Chat messages with type (text/image/audio/file) |
| `stories` + `story_views` + `story_likes` | Ephemeral stories |
| `notifications` | Activity notifications |
| `push_subscriptions` | Web Push endpoint storage |

---

## Tech Stack

| Category | Library |
|---|---|
| Framework | Next.js 15.3.3 |
| UI | React 19 |
| Styling | Tailwind CSS |
| Components | Radix UI |
| Animation | Framer Motion 11 |
| Icons | FontAwesome, Lucide |
| Real-time | Socket.io 4.8.1 |
| Database | Supabase (PostgreSQL) |
| Auth | Supabase Auth |
| Server state | TanStack Query 5 |
| Client state | Zustand 5 |
| Push | web-push (VAPID) |
| Email | Resend |
| Cache/Scale | Redis (Socket.io adapter) |
| Deployment | Render |

---

## Local Setup

### Prerequisites

- Node.js 20+
- A [Supabase](https://supabase.com) project
- A Redis instance (local or [Upstash](https://upstash.com))
- VAPID keys (generate below)

### 1. Clone and install

```bash
git clone https://github.com/ranjanpalai69/nexus.git
cd nexus
npm install
```

### 2. Generate VAPID keys

```bash
npx web-push generate-vapid-keys
```

Save the output — you'll need both keys.

### 3. Set environment variables

Create a `.env.local` file in the project root:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# App URL (used for redirect URLs and push notifications)
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Redis (for Socket.io multi-instance adapter)
REDIS_URL=redis://localhost:6379

# Web Push (VAPID)
NEXT_PUBLIC_VAPID_PUBLIC_KEY=your-vapid-public-key
VAPID_PRIVATE_KEY=your-vapid-private-key
VAPID_EMAIL=mailto:your@email.com
```

### 4. Run database migrations

In the Supabase SQL Editor, run each migration file in order:

```
supabase/migrations/001_initial_schema.sql
supabase/migrations/002_stories.sql
supabase/migrations/003_notifications.sql
supabase/migrations/004_calls.sql
supabase/migrations/005_last_sender.sql
supabase/migrations/006_push_subscriptions.sql
```

### 5. Start the dev server

```bash
npm run dev
# or directly:
tsx server.ts
```

Open [http://localhost:3000](http://localhost:3000).

---

## Production Deployment (Render)

1. Create a new **Web Service** on Render pointing to this repo
2. Set **Build Command:** `npm run build`
3. Set **Start Command:** `NODE_ENV=production tsx server.ts`
4. Add all environment variables from `.env.local` in the Render dashboard (replace `localhost:3000` with your Render URL for `NEXT_PUBLIC_APP_URL`)
5. Run the 6 SQL migrations in your production Supabase project

### Required environment variables on Render

```
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
NEXT_PUBLIC_APP_URL
REDIS_URL
NEXT_PUBLIC_VAPID_PUBLIC_KEY
VAPID_PRIVATE_KEY
VAPID_EMAIL
```

---

## Scripts

```bash
npm run dev      # Development server (tsx server.ts + Next.js HMR)
npm run build    # Production build
npm start        # Production server
npm run lint     # ESLint
```

---

## Contributing

Contributions are welcome.

1. Fork the repo and create a branch from `main`
2. Make your changes with clear, focused commits
3. Ensure the app builds without TypeScript errors (`npm run build`)
4. Open a pull request describing what you changed and why

For bugs, open an issue with steps to reproduce. For features, open an issue first to discuss the approach before building.

---

## License

MIT
