import { createClient } from 'redis'

declare global {
  // eslint-disable-next-line no-var
  var _redisClient: ReturnType<typeof createClient> | undefined
}

function getRedisClient() {
  if (!global._redisClient) {
    const client = createClient({ url: process.env.REDIS_URL })
    client.on('error', (err) => console.error('[Redis]', err))
    global._redisClient = client
  }
  return global._redisClient
}

const redis = getRedisClient()

export async function getRedis() {
  if (!redis.isOpen) await redis.connect()
  return redis
}

// Helpers
export async function rget(key: string) {
  const r = await getRedis()
  return r.get(key)
}

export async function rset(key: string, value: string, ttlSeconds?: number) {
  const r = await getRedis()
  if (ttlSeconds) return r.set(key, value, { EX: ttlSeconds })
  return r.set(key, value)
}

export async function rdel(key: string) {
  const r = await getRedis()
  return r.del(key)
}

export async function rincr(key: string, ttlSeconds?: number) {
  const r = await getRedis()
  const val = await r.incr(key)
  if (ttlSeconds && val === 1) await r.expire(key, ttlSeconds)
  return val
}

export { redis }
