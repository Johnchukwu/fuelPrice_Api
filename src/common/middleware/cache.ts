import Redis from "ioredis"
import { LRUCache } from "lru-cache"
import type { Request, Response, NextFunction } from "express"
import { env } from "../../config/env"

const redis = new Redis(env.REDIS_URL)
const lru = new LRUCache<string, any>({ max: 1000, ttl: 60_000 })
const k = (u: string) => `cache:${u}`

export async function cacheGet(req: Request, res: Response, next: NextFunction) {
  if (req.method !== "GET") return next()
  const key = k(req.originalUrl)
  try {
    const hit = await redis.get(key)
    if (hit) return res.json(JSON.parse(hit))
  } catch {}
  const json = res.json.bind(res)
  res.json = (body: any) => {
    json(body)
    const payload = JSON.stringify(body)
    lru.set(key, body)
    redis.setex(key, 60, payload).catch(() => {})
    return res
  }
  next()
}

export async function cacheInvalidate(prefixes: string[] = ["/fuelprice/prices", "/fuelprice/stats"]) {
  try {
    const keys = await redis.keys("cache:*")
    const victims = keys.filter(x => prefixes.some(p => x.includes(p)))
    if (victims.length) await redis.del(victims)
  } catch {}
  for (const key of lru.keys()) if (prefixes.some(p => key.includes(p))) lru.delete(key)
}
