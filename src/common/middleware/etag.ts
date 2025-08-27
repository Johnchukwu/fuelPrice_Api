

import type { Request, Response, NextFunction } from "express"
import crypto from "crypto"

function etag(body: string | Buffer) {
  const h = crypto.createHash("sha1").update(body).digest("base64")
  return `W/"${h}"`
}

export function withEtag(req: Request, res: Response, next: NextFunction) {
  const send = res.send.bind(res)
  res.send = (body?: any) => {
    if (body) {
      const payload = typeof body === "string" ? body : JSON.stringify(body)
      const tag = etag(payload)
      res.setHeader("ETag", tag)
      if (req.headers["if-none-match"] === tag) return res.status(304).end()
      return send(payload)
    }
    return send(body)
  }
  next()
}
