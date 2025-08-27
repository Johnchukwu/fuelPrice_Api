

import { Router } from "express"
import { parse } from "csv-parse/sync"
import mongoose from "mongoose"
import { z } from "zod"
import { requireAuth, requireRole } from "../../common/middleware/auth"
import { Price } from "../prices/price.model"
import { cacheInvalidate } from "../../common/middleware/cache"

export const uploadRoutes = Router()

const CreatePrice = z.object({
  station_id: z.string(),
  product_type: z.enum(["PMS","AGO","DPK","CNG"]),
  price_per_liter: z.coerce.number().positive(),
  effective_from: z.coerce.date(),
  source: z.string().min(2),
  reason: z.string().min(3).optional()
})

uploadRoutes.post("/prices/csv", requireAuth, requireRole("admin"), async (req, res) => {
  if (typeof req.body !== "string") return res.status(400).json({ message: "text/csv body required" })
  const dry = req.query.dry === "true"
  const rows = parse(req.body, { columns: true, skip_empty_lines: true })
  const report: any[] = []
  for (const [i, row] of rows.entries()) {
    try {
      const v = CreatePrice.parse(row)
      if (!dry) {
        await Price.create({ ...v, station_id: new mongoose.Types.ObjectId(v.station_id) })
      }
      report.push({ row: i + 1, status: "ok" })
    } catch (e: any) {
      report.push({ row: i + 1, status: "error", error: e.message })
    }
  }
  if (!dry) cacheInvalidate()
  res.json({ dry, report })
})
