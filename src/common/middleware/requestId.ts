

import { nanoid } from "nanoid"
import type { Request, Response, NextFunction } from "express"

export function requestId(req: Request, res: Response, next: NextFunction) {
  const id = req.header("x-request-id") || nanoid()
  res.setHeader("x-request-id", id)
  ;(req as any).requestId = id
  next()
}
