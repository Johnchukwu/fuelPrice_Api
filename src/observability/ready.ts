

import type { Request, Response } from "express"
import mongoose from "mongoose"
import Redis from "ioredis"
import { env } from "../config/env"

const redis = new Redis(env.REDIS_URL)

export async function readyHandler(_req: Request, res: Response) {
  const mongoOk = mongoose.connection.readyState === 1
  let redisOk = false
  try { redisOk = (await redis.ping()) === "PONG" } catch { redisOk = false }

  const ok = mongoOk && redisOk
  res.status(ok ? 200 : 503).json({
    status: ok ? "ready" : "not_ready",
    checks: { mongo: mongoOk, redis: redisOk },
    uptime: process.uptime()
  })
}
