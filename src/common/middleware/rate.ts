import rateLimit from "express-rate-limit"
import slowDown from "express-slow-down"

export const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false
})

export const speedLimiter = slowDown({
  windowMs: 15 * 60 * 1000,
  delayAfter: 200,
  delayMs: (used, req) => {
    const delayAfter = req.slowDown?.limit ?? 200
    return (used - delayAfter) * 250
  }
})
