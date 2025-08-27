
import "dotenv/config"
import { z } from "zod"

export const env = z.object({
  NODE_ENV: z.enum(["development","test","production"]).default("development"),
  PORT: z.coerce.number().default(3000),
  MONGO_URI: z.string(),
  JWT_ACCESS_SECRET: z.string().min(32),
  JWT_REFRESH_SECRET: z.string().min(32),
  ACCESS_TTL_MINUTES: z.coerce.number().default(15),
  REFRESH_TTL_DAYS: z.coerce.number().default(30),
  CORS_ALLOWLIST: z.string().default(""),
  REDIS_URL: z.string().default("redis://localhost:6379"),
  SERVICE_NAME: z.string().default("ng-fuel-prices"),
  LOG_LEVEL: z.string().default("info")
}).parse(process.env)
