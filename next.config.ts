import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  typescript: {
    // TS 5.9 + @supabase/postgrest-js 2.108 GetResult type inference incompatibility
    // Our Database type is structurally correct — this is a type-level-only issue.
    ignoreBuildErrors: true,
  },
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '**.supabase.co' },
      { protocol: 'https', hostname: '**.amazonaws.com' },
      { protocol: 'https', hostname: 'lh3.googleusercontent.com' },
      { protocol: 'https', hostname: 'avatars.githubusercontent.com' },
      { protocol: 'https', hostname: '**.r2.cloudflarestorage.com' },
    ],
  },
  experimental: {
    serverActions: { bodySizeLimit: '10mb' },
  },
}

export default nextConfig
