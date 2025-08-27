#!/usr/bin/env ts-node


import "dotenv/config"

async function main() {
  const base = process.env.API_BASE || "http://localhost:3000/fuelprice"
  const email = process.argv[2]
  const password = process.argv[3]
  const station_id = process.argv[4]
  const product_type = process.argv[5] // PMS|AGO|DPK|CNG
  const price = Number(process.argv[6])
  const effective_from = process.argv[7] // ISO, e.g. 2025-09-01T09:00:00+01:00
  const source = process.argv[8] || "cli"
  const reason = process.argv[9] || "manual update"

  if (!email || !password || !station_id || !product_type || !price || !effective_from) {
    console.error("usage: npm run cli:update-price -- <email> <password> <station_id> <product_type> <price> <effective_from> [source] [reason]")
    process.exit(2)
  }

  const login = await fetch(`${base}/auth/login`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ email, password })
  }).then(r => r.json())

  if (!login.access_token) throw new Error("login failed")

  const resp = await fetch(`${base}/prices`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${login.access_token}`
    },
    body: JSON.stringify({
      station_id,
      product_type,
      price_per_liter: price,
      effective_from,
      source,
      reason
    })
  }).then(r => r.json())

  console.log(JSON.stringify(resp, null, 2))
}

main().catch(e => {
  console.error(e)
  process.exit(1)
})
