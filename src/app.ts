

import express from "express"
import helmet from "helmet"
import cors from "cors"
import pinoHttp from "pino-http"
import { env } from "./config/env"
import { logger } from "./observability/logger"
import { requestId } from "./common/middleware/requestId"
import { errorHandler } from "./common/middleware/error"
import { priceRoutes } from "./modules/prices/routes"
import { authRoutes } from "./modules/auth/routes"
import { stationRoutes } from "./modules/stations/routes"
import { statsRoutes } from "./modules/stats/routes"
import { withEtag } from "./common/middleware/etag"
import { cacheGet } from "./common/middleware/cache"
import { limiter, speedLimiter } from "./common/middleware/rate"
import { uploadRoutes } from "./modules/uploads/routes"
import { metricsHandler } from "./observability/metrics"
import { mountSwagger } from "./docs/ui"
import { readyHandler } from "./observability/ready"






export function createApp() {
  const app = express()
  const allow = env.CORS_ALLOWLIST.split(",").filter(Boolean)

app.use(cors({
  origin(origin, cb) {
    if (!origin) return cb(null, false)
    cb(null, allow.includes(origin))
  },
  methods: ["GET","POST","PATCH","OPTIONS"],
  allowedHeaders: ["authorization","content-type","if-none-match"],
  maxAge: 600,
  credentials: false
}))

  app.use(helmet())
  app.use(cors({ origin: allow.length ? allow : true }))
  app.use(express.json({ limit: "1mb" }))
  app.use(requestId)
  app.use(pinoHttp({ logger }))
  app.use(withEtag)
  app.use(limiter)
  app.use(speedLimiter)
  app.use(express.text({ type: "text/csv" }))

  app.get("/fuelprice/metrics", metricsHandler)

  app.get("/fuelprice", (_req, res) =>
    res.json({ service: env.SERVICE_NAME, version: "1.0.0", uptime: process.uptime() })
  )
  app.get("/ready", readyHandler)
  app.get("/metrics", metricsHandler)


  app.use("/fuelprice/prices", priceRoutes)
  app.use("/fuelprice/auth", authRoutes)
  app.use("/fuelprice/stations", stationRoutes)
  app.use("/fuelprice/stats", statsRoutes)
  app.use("/fuelprice/stations", cacheGet, stationRoutes)
  app.use("/fuelprice/prices", cacheGet, priceRoutes)
  app.use("/fuelprice/stats", cacheGet, statsRoutes)
  app.use("/fuelprice/uploads", uploadRoutes)
 

  app.use(errorHandler)
  mountSwagger(app)
  return app
}
