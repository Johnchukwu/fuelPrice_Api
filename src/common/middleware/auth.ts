// src/common/middleware/auth.ts
import type { Request, Response, NextFunction } from "express"
import jwt from "jsonwebtoken"
import process from "process"

function problem(res: Response, status: number, title: string, detail: string, req: Request) {
  return res
    .status(status)
    .type("application/problem+json")
    .json({
      type: "about:blank",
      title,
      status,
      detail,
      instance: req.originalUrl,
      correlation_id: (req as any).requestId
    })
}

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const h = req.header("authorization") // header names are case-insensitive
  if (!h) return problem(res, 401, "Unauthorized", "Missing Authorization header", req)

  const [scheme, token] = h.trim().split(/\s+/, 2)
  if (!/^bearer$/i.test(scheme || "") || !token) {
    return problem(res, 401, "Unauthorized", "Invalid Authorization scheme", req)
  }

  const secret = process.env.JWT_ACCESS_SECRET
  if (!secret) return problem(res, 500, "Server Misconfiguration", "JWT secret not configured", req)

  try {
    const payload = jwt.verify(token, secret) as { sub?: string; role?: "admin" | "user" }
    if (!payload?.sub || !payload?.role) {
      return problem(res, 401, "Unauthorized", "Token payload missing claims", req)
    }
    ;(req as any).user = { id: payload.sub, role: payload.role }
    next()
  } catch {
    return problem(res, 401, "Unauthorized", "Invalid or expired token", req)
  }
}

export function requireRole(role: "admin" | "user") {
  return (req: Request, res: Response, next: NextFunction) => {
    const u = (req as any).user
    if (!u || u.role !== role) return problem(res, 403, "Forbidden", "Insufficient role", req)
    next()
  }
}
