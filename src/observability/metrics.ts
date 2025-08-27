
import { collectDefaultMetrics, register } from "prom-client"

collectDefaultMetrics()

export async function metricsHandler(_req: any, res: any) {
  res.set("Content-Type", register.contentType)
  res.end(await register.metrics())
}
