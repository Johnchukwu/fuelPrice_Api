

import mongoose, { Schema } from "mongoose"

const RefreshTokenSchema = new Schema({
  jti: { type: String, unique: true, index: true, required: true },
  family_id: { type: String, index: true, required: true },
  user_id: { type: Schema.Types.ObjectId, ref: "User", index: true, required: true },
  issued_at: { type: Date, default: Date.now },
  expires_at: { type: Date, index: true, required: true },
  revoked_at: { type: Date },
  replaced_by_jti: { type: String },
  user_agent: String,
  ip: String
}, { timestamps: true })

export const RefreshToken = mongoose.model("RefreshToken", RefreshTokenSchema)
