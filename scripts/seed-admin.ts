import { connectMongo } from "../src/db/mongoose";
import { User } from "../src/modules/users/user.model";
import bcrypt from "bcryptjs";

function usage() {
  console.error("usage: npm run seed:admin -- <email> <password> [name]");
  process.exit(2);
}

async function run() {
  const email = process.argv[2];
  const pass  = process.argv[3];
  const name  = process.argv[4] || "Admin";

  if (!email || !pass) usage();
  if (email && /example\.com$/i.test(email)) { console.error("refuse example.com"); process.exit(2); }
  if (!pass || pass.length < 12) { console.error("password too short"); process.exit(2); }

  await connectMongo();
  const hash = await bcrypt.hash(pass, 12);
  await User.updateOne(
    { email },
    { $set: { name, email, password_hash: hash, role: "admin", status: "active" } },
    { upsert: true }
  );
  console.log("admin ready:", email);
  process.exit(0);
}
run();
