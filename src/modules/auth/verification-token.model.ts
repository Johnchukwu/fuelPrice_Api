

import mongoose, { Schema } from "mongoose"

const VerificationTokenSchema = new Schema({
  user_id: { type: Schema.Types.ObjectId, ref: "User", index: true, required: true },
  token: { type: String, unique: true, index: true, required: true },
  expires_at: { type: Date, required: true },
  used_at: { type: Date }
}, { timestamps: true })

export const VerificationToken = mongoose.model("VerificationToken", VerificationTokenSchema)
