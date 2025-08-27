

import swaggerUi from "swagger-ui-express"
import type { Express } from "express"
import { swaggerSpec } from "./swagger"

export function mountSwagger(app: Express) {
  app.use("/fuelprice/docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec))
  app.get("/fuelprice/docs.json", (_req, res) => res.json(swaggerSpec))
}
