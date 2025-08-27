

import mongoose, { Schema } from "mongoose";

export type ProductType = "PMS" | "AGO" | "DPK" | "CNG";

const PriceSchema = new Schema(
  {
    station_id: { type: Schema.Types.ObjectId, ref: "Station", required: true, index: true },
    product_type: { type: String, enum: ["PMS","AGO","DPK","CNG"], required: true, index: true },
    price_per_liter: { type: Number, required: true },
    currency: { type: String, default: "NGN" },
    effective_from: { type: Date, required: true, index: true },
    source: { type: String, required: true },
    is_admin_override: { type: Boolean, default: false },
    reason: String,
    attachment_url: String
  },
  { timestamps: true }
);

PriceSchema.index({ station_id: 1, product_type: 1, effective_from: -1 }, { unique: true });

export const Price = mongoose.model("Price", PriceSchema);
