import "dotenv/config"
import fs from "fs"
import path from "path"
import { parse } from "csv-parse/sync"
import dayjs from "dayjs"
import mongoose from "mongoose"
import { connectMongo } from "../src/db/mongoose"
import { Station } from "../src/modules/stations/station.model"
import { Price } from "../src/modules/prices/price.model"

type Row = { name: string, state: string }

const BRAND_PREFIXES = [
  "AA Rano", "AYM Shafa", "TotalEnergies", "Northwest",
  "Conoil", "Oando", "Mobil", "Enyo", "Ardova", "Eterna",
  "Rainoil", "Bovas", "Matrix", "NNPC", "Ascon", "NIPCO"
]

function inferBrand(name: string): string {
  for (const b of BRAND_PREFIXES) if (name.toLowerCase().startsWith(b.toLowerCase())) return b
  return "Unknown"
}

async function run() {
  await connectMongo()
  const csvPath = path.resolve("data/lagos-simple.csv")
  const text = fs.readFileSync(csvPath, "utf8")
  const rows = parse(text, { columns: true, skip_empty_lines: true, trim: true }) as Row[]

  let upserts = 0
  for (const r of rows) {
    const brand = inferBrand(r.name)
    await Station.updateOne(
      { name: r.name, state: r.state }, // idempotent on name+state
      { $set: { name: r.name, brand, state: r.state, lga: "", address: "", services: [] } },
      { upsert: true }
    )
    upserts++
  }

  const stations = await Station.find({ state: "Lagos" }).select({ _id: 1 })
  const eff = dayjs().subtract(1, "day").toDate()
  const prods: Array<"PMS"|"AGO"|"DPK"|"CNG"> = ["PMS","AGO","DPK","CNG"]
  const defaults: Record<string, number> = { PMS: 700, AGO: 1200, DPK: 950, CNG: 350 }

  let prices = 0
  for (const s of stations) {
    for (const p of prods) {
      const exists = await Price.findOne({ station_id: s._id, product_type: p, effective_from: { $lte: eff } })
      if (exists) continue
      await Price.create({
        station_id: new mongoose.Types.ObjectId(s._id),
        product_type: p,
        price_per_liter: defaults[p],
        currency: "NGN",
        effective_from: eff,
        source: "seed",
        is_admin_override: false
      })
      prices++
    }
  }

  console.log(`stations upserted: ${upserts}`)
  console.log(`prices inserted: ${prices}`)
  process.exit(0)
}

run().catch(e => { console.error(e); process.exit(1) })
