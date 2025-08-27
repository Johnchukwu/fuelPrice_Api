

import mongoose, { Schema } from "mongoose";

const UserSchema = new Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true, index: true },
  role: { type: String, enum: ["user","admin"], default: "user", index: true },
  password_hash: { type: String, required: true },
  status: { type: String, enum: ["active","pending"], default: "active" },
  last_login_at: { type: Date }
}, { timestamps: true });

export const User = mongoose.model("User", UserSchema);
