import type { Request, Response, NextFunction } from "express"
import { ZodError } from "zod"

export function errorHandler(err: any, req: Request, res: Response, _next: NextFunction) {
  let status = err.status || 500
  let title = err.title || (status >= 500 ? "Internal Server Error" : "Bad Request")
  let detail = err.message || "Unexpected error"
  let extra: any = {}

  if (err instanceof ZodError) {
    status = 400
    title = "Validation Error"
    detail = "One or more fields are invalid"
    extra.errors = err.issues.map(e => ({
      origin: "zod",
      code: e.code,
      path: e.path,
      message: e.message,
      minimum: (e as any).minimum
    }))
  }

  res.status(status).type("application/problem+json").json({
    type: "about:blank",
    title,
    status,
    detail,
    instance: req.originalUrl,
    correlation_id: (req as any).requestId,
    ...extra
  })
}
