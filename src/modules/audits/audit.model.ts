

import mongoose, { Schema } from "mongoose"
const AuditSchema = new Schema({
  action: { type: String, required: true },
  entity: { type: String, required: true },
  entity_id: { type: String, required: true },
  before: { type: Schema.Types.Mixed },
  after: { type: Schema.Types.Mixed },
  actor_id: { type: String },
  actor_role: { type: String },
  ip: String,
  user_agent: String,
  timestamp: { type: Date, default: Date.now }
}, { timestamps: true })
export const AuditLog = mongoose.model("AuditLog", AuditSchema)

