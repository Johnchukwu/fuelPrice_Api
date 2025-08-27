// src/modules/stations/routes.ts
import { Router } from "express"
import { z } from "zod"
import mongoose from "mongoose"
import { Station } from "./station.model"
import { requireAuth, requireRole } from "../../common/middleware/auth"
import { writeAudit } from "../audits/audit.service"
import { cacheInvalidate } from "../../common/middleware/cache"

export const stationRoutes = Router()

const StationQuery = z.object({
  state: z.string().optional(),
  lga: z.string().optional(),
  brand: z.string().optional(),
  services: z.string().optional(),
  lat: z.coerce.number().optional(),
  lng: z.coerce.number().optional(),
  radius_km: z.coerce.number().default(5).optional()
})

stationRoutes.get("/", async (req, res) => {
  const q = StationQuery.parse(req.query)
  const filter: any = {}
  if (q.state) filter.state = q.state
  if (q.lga) filter.lga = q.lga
  if (q.brand) filter.brand = q.brand
  if (q.services) filter.services = { $in: q.services.split(",") }
  if (q.lat && q.lng && q.radius_km) {
    filter.geo = {
      $near: {
        $geometry: { type: "Point", coordinates: [q.lng, q.lat] },
        $maxDistance: q.radius_km * 1000
      }
    }
  }
  const data = await Station.find(filter).limit(200)
  res.json({ data })
})

const CreateStation = z.object({
  name: z.string().min(2),
  brand: z.string(),
  state: z.string(),
  lga: z.string(),
  address: z.string().optional(),
  geo: z
    .object({
      type: z.literal("Point").default("Point"),
      coordinates: z.tuple([z.number(), z.number()]) // [lng, lat]
    })
    .optional(),
  opening_hours: z.string().optional(),
  services: z.array(z.string()).optional()
})

const UpdateStation = CreateStation.partial()

// POST /stations – admin create
stationRoutes.post("/", requireAuth, requireRole("admin"), async (req, res) => {
  const body = CreateStation.parse(req.body)
  const s = await Station.create(body as any)

  await writeAudit({
    action: "create",
    entity: "station",
    entity_id: s.id,
    after: s.toObject(),
    actor_id: (req as any).user?.id,
    actor_role: (req as any).user?.role,
    ip: req.ip || "",
    user_agent: req.get("user-agent") || ""
  })

  cacheInvalidate()
  res.status(201).json({ data: s })
})

// PATCH /stations/:id – admin update
stationRoutes.patch("/:id", requireAuth, requireRole("admin"), async (req, res) => {
  const body = UpdateStation.parse(req.body)
  const id = new mongoose.Types.ObjectId(req.params.id)

  const beforeDoc = await Station.findById(id)
  if (!beforeDoc) return res.status(404).json({ message: "Not found" })
  const before = beforeDoc.toObject()

  const s = await Station.findByIdAndUpdate(id, { $set: body }, { new: true })

  await writeAudit({
    action: "update",
    entity: "station",
    entity_id: String(id),
    before,
    after: s ? s.toObject() : undefined,
    actor_id: (req as any).user?.id,
    actor_role: (req as any).user?.role,
    ip: req.ip || "",
    user_agent: req.get("user-agent") || ""
  })

  cacheInvalidate()
  res.json({ data: s })
})
