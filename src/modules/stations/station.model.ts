

import mongoose, { Schema } from "mongoose";

const StationSchema = new Schema(
  {
    name: { type: String, required: true },
    brand: { type: String, required: true, index: true },
    state: { type: String, required: true, index: true },
    lga: { type: String, required: true, index: true },
    address: String,
    geo: {
      type: { type: String, enum: ["Point"], default: "Point" },
      coordinates: { type: [Number], index: "2dsphere" }
    },
    opening_hours: String,
    services: { type: [String], default: [] }
  },
  { timestamps: true }
);

export const Station = mongoose.model("Station", StationSchema);
