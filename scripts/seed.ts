import { connectMongo } from "../src/db/mongoose.js";
import { Station } from "../src/modules/stations/station.model.js";
import { Price } from "../src/modules/prices/price.model.js";

async function run() {
  await connectMongo();
  await Station.deleteMany({});
  await Price.deleteMany({});

  const stations = await Station.insertMany([
    { name: "NNPC Ikeja", brand: "NNPC", state: "Lagos", lga: "Ikeja", address: "Ikeja", geo: { type: "Point", coordinates: [3.35, 6.60] } },
    { name: "TotalEnergies VI", brand: "TotalEnergies", state: "Lagos", lga: "Eti-Osa", address: "VI", geo: { type: "Point", coordinates: [3.43, 6.43] } },
    { name: "Oando GRA", brand: "Oando", state: "Rivers", lga: "Port Harcourt", address: "GRA", geo: { type: "Point", coordinates: [7.01, 4.81] } },
    { name: "MRS Wuse", brand: "MRS", state: "FCT", lga: "Abuja Municipal", address: "Wuse", geo: { type: "Point", coordinates: [7.49, 9.07] } },
    { name: "Conoil Kano", brand: "Conoil", state: "Kano", lga: "Nassarawa", address: "Kano", geo: { type: "Point", coordinates: [8.52, 12.00] } }
  ]);

  const now = new Date();
  const daysAgo = (n: number) => new Date(now.getTime() - n * 86400000);

  const docs = [];
  for (const s of stations) {
    docs.push(
      { station_id: s._id, product_type: "PMS", price_per_liter: 680, effective_from: daysAgo(10), source: "seed" },
      { station_id: s._id, product_type: "PMS", price_per_liter: 700, effective_from: daysAgo(2),  source: "seed" },
      { station_id: s._id, product_type: "AGO", price_per_liter: 1200, effective_from: daysAgo(5), source: "seed" },
      { station_id: s._id, product_type: "DPK", price_per_liter: 950, effective_from: daysAgo(7), source: "seed" }
    );
  }

  await Price.insertMany(docs);
  // eslint-disable-next-line no-console
  console.log("seed complete");
  process.exit(0);
}

run();
