
import type { Request, Response } from "express";
import { RegisterSchema, LoginSchema } from "./schemas";
import * as svc from "./service";

export async function register(req: Request, res: Response) {
  const body = RegisterSchema.parse(req.body);
  const data = await svc.register(body.name, body.email, body.password);
  res.status(201).json({ data });
}
export async function login(req: Request, res: Response) {
  const body = LoginSchema.parse(req.body);
  const out = await svc.login(body.email, body.password, req.get("user-agent") || undefined, req.ip);
  res.json(out);
}
