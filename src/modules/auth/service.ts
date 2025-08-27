import jwt from "jsonwebtoken"
import bcrypt from "bcryptjs"
import { randomUUID } from "crypto"
import dayjs from "dayjs"
import { env } from "../../config/env"
import { VerificationToken } from "./verification-token.model"
import { User } from "../users/user.model"
import { RefreshToken } from "./refresh-token.model"



//Register Function
export async function register(name: string, email: string, password: string) {
  const existing = await User.findOne({ email })
  if (existing) throw Object.assign(new Error("Email exists"), { status: 409 })
  const hash = await bcrypt.hash(password, 12)
  const u = await User.create({ name, email, password_hash: hash, role: "user", status: "pending" })
  const token = randomUUID()
  await VerificationToken.create({ user_id: u._id, token, expires_at: dayjs().add(24, "hour").toDate() })
  // return token in dev for testing
  return { id: u.id, email: u.email, verify_token: token }
}

function signAccess(u: { id: string; role: string }) {
  return jwt.sign({ sub: u.id, role: u.role }, env.JWT_ACCESS_SECRET, { expiresIn: `${env.ACCESS_TTL_MINUTES}m` })
}

function signRefresh(u: { id: string; role: string }, family_id?: string) {
  const jti = randomUUID()
  const fam = family_id || randomUUID()
  const token = jwt.sign({ sub: u.id, role: u.role, typ: "refresh", jti, fam }, env.JWT_REFRESH_SECRET, {
    expiresIn: `${env.REFRESH_TTL_DAYS}d`
  })
  const expires_at = dayjs().add(env.REFRESH_TTL_DAYS, "day").toDate()
  return { token, jti, family_id: fam, expires_at }
}


//VeryEmail function

export async function verifyEmail(token: string) {
  const t = await VerificationToken.findOne({ token })
  if (!t) throw Object.assign(new Error("Invalid token"), { status: 400 })
  if (t.used_at) throw Object.assign(new Error("Token already used"), { status: 400 })
  if (t.expires_at <= new Date()) throw Object.assign(new Error("Token expired"), { status: 400 })
  await User.updateOne({ _id: t.user_id }, { $set: { status: "active" } })
  await VerificationToken.updateOne({ _id: t._id }, { $set: { used_at: new Date() } })
  return { ok: true }
}



//Login function
export async function login(email: string, password: string, ua?: string, ip?: string) {
  const u = await User.findOne({ email })
  if (!u) throw Object.assign(new Error("Invalid credentials"), { status: 401 })
    if (u.status !== "active") throw Object.assign(new Error("Email not verified"), { status: 403 })
  const ok = await bcrypt.compare(password, u.password_hash)
  if (!ok) throw Object.assign(new Error("Invalid credentials"), { status: 401 })

  await User.updateOne({ _id: u._id }, { $set: { last_login_at: new Date() } })

  const access_token = signAccess({ id: u.id, role: u.role })
  const { token: refresh_token, jti, family_id, expires_at } = signRefresh({ id: u.id, role: u.role })

  await RefreshToken.create({ jti, family_id, user_id: u._id, expires_at, user_agent: ua, ip })

  return { access_token, refresh_token, user: { id: u.id, role: u.role, email: u.email } }
}



//Refresh function 
export async function refresh(oldToken: string, ua?: string, ip?: string) {
  let payload: any
  try {
    payload = jwt.verify(oldToken, env.JWT_REFRESH_SECRET)
  } catch {
    throw Object.assign(new Error("Invalid refresh token"), { status: 401 })
  }
  if (payload.typ !== "refresh") throw Object.assign(new Error("Invalid token type"), { status: 401 })

  const dbTok = await RefreshToken.findOne({ jti: payload.jti })
  if (!dbTok) throw Object.assign(new Error("Token not found"), { status: 401 })

  if (dbTok.revoked_at || dbTok.replaced_by_jti) {
    // reuse detected → revoke whole family
    await RefreshToken.updateMany({ family_id: dbTok.family_id, revoked_at: { $exists: false } }, { $set: { revoked_at: new Date() } })
    throw Object.assign(new Error("Refresh token reuse"), { status: 401 })
  }
  if (dbTok.expires_at <= new Date()) throw Object.assign(new Error("Refresh expired"), { status: 401 })

  const user = await User.findById(dbTok.user_id)
  if (!user) throw Object.assign(new Error("User not found"), { status: 401 })

  // rotate
  const access_token = signAccess({ id: user.id, role: user.role })
  const { token: new_refresh, jti: new_jti, family_id, expires_at } = signRefresh({ id: user.id, role: user.role }, dbTok.family_id)

  await RefreshToken.create({ jti: new_jti, family_id, user_id: user._id, expires_at, user_agent: ua, ip })
  await RefreshToken.updateOne({ jti: dbTok.jti }, { $set: { revoked_at: new Date(), replaced_by_jti: new_jti } })

  return { access_token, refresh_token: new_refresh }
}


//Logout function
export async function logout(refreshToken: string) {
  let payload: any
  try {
    payload = jwt.verify(refreshToken, env.JWT_REFRESH_SECRET)
  } catch {
    return // treat as logged out
  }
  await RefreshToken.updateOne({ jti: payload.jti }, { $set: { revoked_at: new Date() } })
}
