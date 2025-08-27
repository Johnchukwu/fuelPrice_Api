// src/modules/prices/routes.ts
import { Router, type Request, type Response } from "express"
import mongoose from "mongoose"
import { z } from "zod"
import multer from "multer"
import { parse as parseCsv } from "csv-parse/sync"

import { Price } from "./price.model"
import { requireAuth, requireRole } from "../../common/middleware/auth"
import { writeAudit } from "../audits/audit.service"
import { cacheInvalidate } from "../../common/middleware/cache"
import { nowLagos } from "../../common/utils/time"

export const priceRoutes = Router()

// ---------- Schemas ----------
const CreatePrice = z.object({
  station_id: z.string(),
  product_type: z.enum(["PMS", "AGO", "DPK", "CNG"]),
  price_per_liter: z.number().positive(),
  effective_from: z.coerce.date(),
  source: z.string().min(2),
  is_admin_override: z.boolean().optional(),
  reason: z.string().min(3).optional(),
  attachment_url: z.string().url().optional()
})
const UpdatePrice = CreatePrice.partial()

const BulkRow = z.object({
  station_id: z.string().length(24),
  product_type: z.enum(["PMS","AGO","DPK","CNG"]),
  price_per_liter: z.coerce.number().positive(),
  effective_from: z.coerce.date(),
  reason: z.string().min(3),
  source: z.string().min(2),
  attachment_url: z.string().url().optional()
})

// ---------- GET /prices – latest effective per station ----------
priceRoutes.get("/", async (req, res) => {
  const q = req.query as Record<string, string>
  const now = nowLagos()

  const match: any = { effective_from: { $lte: now } }
  if (q.product_type) match.product_type = q.product_type
  if (q.station_id) match.station_id = new mongoose.Types.ObjectId(q.station_id)

 const stationMatch: any = {}
if (q.state) stationMatch["station.state"] = q.state
if (q.lga) stationMatch["station.lga"] = q.lga
if (q.brand) stationMatch["station.brand"] = q.brand

  const sort = q.sort || "-price_per_liter"
  const dir = sort.startsWith("-") ? -1 : 1
  const field = sort.replace(/^[-+]/, "")
  const page = Math.max(1, parseInt(q.page || "1", 10))
  const limit = Math.max(1, Math.min(100, parseInt(q.limit || "20", 10)))
  const skip = (page - 1) * limit

  const pipeline: any[] = [
    { $match: match },
    { $sort: { station_id: 1, product_type: 1, effective_from: -1, createdAt: -1 } },
    { $group: { _id: { station_id: "$station_id", product_type: "$product_type" }, doc: { $first: "$$ROOT" } } },
    { $replaceRoot: { newRoot: "$doc" } },
    { $lookup: { from: "stations", localField: "station_id", foreignField: "_id", as: "station" } },
    { $unwind: "$station" },
    { $match: stationMatch },
    {
      $project: {
        station_id: 1,
        product_type: 1,
        price_per_liter: 1,
        currency: 1,
        effective_from: 1,
        source: 1,
        is_admin_override: 1,
        last_updated: "$updatedAt",
        station_name: "$station.name",
        brand: "$station.brand",
        state: "$station.state",
        lga: "$station.lga"
      }
    },
    { $sort: { [field]: dir } },
    { $skip: skip },
    { $limit: limit }
  ]

  const data = await Price.aggregate(pipeline)
  const countAgg = await Price.aggregate(pipeline.slice(0, -2).concat({ $count: "cnt" }))
  const total = countAgg[0]?.cnt || data.length

  res.json({
    data,
    pagination: { page, limit, total, has_next: skip + data.length < total },
    meta: { generated_at: new Date().toISOString() }
  })
})

// ---------- GET /prices/:stationId/history ----------
priceRoutes.get("/:stationId/history", async (req, res) => {
  const stationId = req.params.stationId
  const product_type = typeof req.query.product_type === "string" ? req.query.product_type : undefined
  const page = Math.max(1, parseInt((req.query.page as string) || "1", 10))
  const limit = Math.max(1, Math.min(100, parseInt((req.query.limit as string) || "20", 10)))
  const skip = (page - 1) * limit

  const match: any = { station_id: new mongoose.Types.ObjectId(stationId) }
  if (product_type) match.product_type = product_type

  const data = await Price.find(match).sort({ effective_from: -1, createdAt: -1 }).skip(skip).limit(limit)
  const total = await Price.countDocuments(match)

  res.json({
    data,
    pagination: { page, limit, total, has_next: skip + data.length < total },
    meta: { generated_at: new Date().toISOString() }
  })
})


// ---------- GET /prices/station/:stationId/current ----------
priceRoutes.get("/station/:stationId/current", async (req: Request, res: Response) => {
  const stationId = req.params.stationId
  const product = (req.query.product_type as string) || "PMS"
  const now = nowLagos()

  const rows = await Price.aggregate([
    {
      $match: {
        station_id: new mongoose.Types.ObjectId(stationId),
        product_type: product,
        effective_from: { $lte: now }
      }
    },
    { $sort: { effective_from: -1, createdAt: -1 } },
    { $limit: 1 },
    { $lookup: { from: "stations", localField: "station_id", foreignField: "_id", as: "station" } },
    { $unwind: "$station" },
    {
      $project: {
        station_id: 1,
        product_type: 1,
        price_per_liter: 1,
        currency: 1,
        effective_from: 1,
        source: 1,
        is_admin_override: 1,
        last_updated: "$updatedAt",
        station_name: "$station.name",
        brand: "$station.brand",
        state: "$station.state",
        lga: "$station.lga"
      }
    }
  ])

  if (!rows.length) return res.status(404).json({ message: "No current price" })
  res.json({ data: rows[0] })
})


// ---------- POST /prices/bulk ----------
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 2 * 1024 * 1024 } })

priceRoutes.post(
  "/bulk",
  requireAuth,
  requireRole("admin"),
  upload.single("file"),
  async (req: Request, res: Response) => {
    const dryRun = String(req.query.dry_run || "false") === "true"
    if (!req.file) {
      return res.status(400).type("application/problem+json").json({
        type: "about:blank",
        title: "Validation Error",
        status: 400,
        detail: "file is required",
        instance: req.originalUrl,
        correlation_id: (req as any).requestId
      })
    }

    const rows = parseCsv(req.file.buffer.toString("utf8"), {
      columns: true, skip_empty_lines: true, trim: true
    }) as any[]

    const report: { total: number; valid: number; invalid: number; created: number; errors: any[] } =
      { total: rows.length, valid: 0, invalid: 0, created: 0, errors: [] }

    const toInsert: any[] = []

    for (let i = 0; i < rows.length; i++) {
      const parsed = BulkRow.safeParse(rows[i])
      if (!parsed.success) {
        report.invalid++
        report.errors.push({ row: i + 1, issues: parsed.error.issues })
        continue
      }
      const v = parsed.data
      toInsert.push({
        station_id: new mongoose.Types.ObjectId(v.station_id),
        product_type: v.product_type,
        price_per_liter: v.price_per_liter,
        currency: "NGN",
        effective_from: v.effective_from,
        source: v.source,
        is_admin_override: true,
        reason: v.reason,
        attachment_url: v.attachment_url
      })
      report.valid++
    }

    if (dryRun) return res.json({ data: report })

    for (const doc of toInsert) {
      const created = await Price.create(doc)
      report.created++
      await writeAudit({
        action: "create",
        entity: "price",
        entity_id: created.id,
        after: created.toObject(),
        actor_id: (req as any).user?.id,
        actor_role: (req as any).user?.role,
        ip: req.ip ?? "",
        user_agent: req.get("user-agent") || ""
      })
    }

    await cacheInvalidate()
    res.status(201).json({ data: report })
  }
)

// ---------- POST /prices ----------
priceRoutes.post("/", requireAuth, requireRole("admin"), async (req, res) => {
  const body = CreatePrice.parse(req.body)
  const doc = await Price.create({
    ...body,
    station_id: new mongoose.Types.ObjectId(body.station_id)
  })

  await writeAudit({
    action: "create",
    entity: "price",
    entity_id: doc.id,
    after: doc.toObject(),
    actor_id: (req as any).user?.id,
    actor_role: (req as any).user?.role,
    ip: req.ip ?? "",
    user_agent: req.get("user-agent") || ""
  })

  await cacheInvalidate()
  res.status(201).json({ data: doc })
})

// ---------- PATCH /prices/:priceId ----------
priceRoutes.patch("/:priceId", requireAuth, requireRole("admin"), async (req, res) => {
  const patch = UpdatePrice.parse(req.body)
  const p = await Price.findById(req.params.priceId)
  if (!p) return res.status(404).json({ message: "Not found" })

  const now = new Date()
  if (p.effective_from <= now) return res.status(409).json({ message: "Only future effective records updatable" })

  const before = p.toObject()
  if (patch.station_id) (patch as any).station_id = new mongoose.Types.ObjectId(patch.station_id)

  const updated = await Price.findByIdAndUpdate(req.params.priceId, { $set: patch }, { new: true })

  await writeAudit({
    action: "update",
    entity: "price",
    entity_id: String(p._id),
    before,
    after: updated?.toObject(),
    actor_id: (req as any).user?.id,
    actor_role: (req as any).user?.role,
    ip: req.ip ?? "",
    user_agent: req.get("user-agent") || ""
  })

  await cacheInvalidate()
  res.json({ data: updated })
})
