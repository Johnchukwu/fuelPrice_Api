
import { Router } from "express"
import { Price } from "../prices/price.model"
import { nowLagos } from "../../common/utils/time"
import { now } from "mongoose"

export const statsRoutes = Router()

type StateAgg = {
  state: string
  product_type: "PMS" | "AGO" | "DPK" | "CNG"
  avg_price: number
  count: number
  last_updated?: Date
}

statsRoutes.get("/summary", async (req, res) => {
  const product_type =
    typeof req.query.product_type === "string"
      ? (req.query.product_type as StateAgg["product_type"])
      : undefined

  const now = nowLagos()
  const match: any = { effective_from: { $lte: now } }
  if (product_type) match.product_type = product_type

  const pipeline: any[] = [
    { $match: match },
    { $sort: { station_id: 1, product_type: 1, effective_from: -1, createdAt: -1 } },
    { $group: { _id: { station_id: "$station_id", product_type: "$product_type" }, doc: { $first: "$$ROOT" } } },
    { $replaceRoot: { newRoot: "$doc" } },
    { $lookup: { from: "stations", localField: "station_id", foreignField: "_id", as: "station" } },
    { $unwind: "$station" },
    { $group: { _id: { state: "$station.state", product_type: "$product_type" }, avg_price: { $avg: "$price_per_liter" }, count: { $sum: 1 }, last_updated: { $max: "$updatedAt" } } },
    { $project: { _id: 0, state: "$_id.state", product_type: "$_id.product_type", avg_price: 1, count: 1, last_updated: 1 } }
  ]

  const states = await Price.aggregate<StateAgg>(pipeline)

  type NatEntry = { sum: number; cnt: number; last: Date | undefined }
  const natMap: Record<string, NatEntry> = {}

  for (const r of states) {
    const e = natMap[r.product_type] ?? (natMap[r.product_type] = { sum: 0, cnt: 0, last: r.last_updated })
    e.sum += r.avg_price * r.count
    e.cnt += r.count
    if (!e.last || (r.last_updated && r.last_updated > e.last)) e.last = r.last_updated
  }

  const national = Object.entries(natMap).map(([product_type, v]) => ({
    product_type,
    avg_price: v.cnt ? v.sum / v.cnt : 0,
    last_updated: v.last
  }))

  res.json({ data: { national, states }, meta: { generated_at: new Date().toISOString() } })
})
