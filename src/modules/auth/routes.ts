import { Router } from "express"
import { z } from "zod"
import * as c from "./service"

export const authRoutes = Router()

const RegisterSchema = z.object({ name: z.string().min(2), email: z.string().email(), password: z.string().min(8) })
const LoginSchema    = z.object({ email: z.string().email(), password: z.string().min(8) })
const RefreshSchema  = z.object({ refresh_token: z.string().min(10) })
const VerifySchema = z.object({ token: z.string().min(10) })

authRoutes.post("/register", async (req, res) => {
  const body = RegisterSchema.parse(req.body)
  const data = await c.register(body.name, body.email, body.password)
  res.status(201).json({ data })
})

authRoutes.post("/login", async (req, res) => {
  const body = LoginSchema.parse(req.body)
  const out = await c.login(body.email, body.password, req.get("user-agent") || undefined, req.ip)
  res.json(out)
})

authRoutes.post("/refresh", async (req, res) => {
  const { refresh_token } = RefreshSchema.parse(req.body)
  const out = await c.refresh(refresh_token, req.get("user-agent") || undefined, req.ip)
  res.json(out)
})

authRoutes.post("/logout", async (req, res) => {
  const { refresh_token } = RefreshSchema.parse(req.body)
  await c.logout(refresh_token)
  res.status(204).end()
})

authRoutes.post("/verify", async (req, res) => {
  const { token } = VerifySchema.parse(req.body)
  const out = await c.verifyEmail(token)
  res.json(out)
})
