/**
 * Run this once to create your first admin account:
 *   node scripts/createAdmin.js "Admin Name" admin@example.com yourpassword
 *
 * Requires MONGODB_URI to be set (loads from .env.local automatically).
 */
require("dotenv").config({ path: ".env.local" });
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

async function main() {
  const [, , name, email, password] = process.argv;
  if (!name || !email || !password) {
    console.error("Usage: node scripts/createAdmin.js <name> <email> <password>");
    process.exit(1);
  }

  await mongoose.connect(process.env.MONGODB_URI);

  const userSchema = new mongoose.Schema({
    name: String,
    email: String,
    password: String,
    role: String,
  });
  const User = mongoose.models.User || mongoose.model("User", userSchema);

  const existing = await User.findOne({ email: email.toLowerCase() });
  if (existing) {
    console.log("A user with this email already exists.");
    process.exit(0);
  }

  const hashed = await bcrypt.hash(password, 10);
  await User.create({ name, email: email.toLowerCase(), password: hashed, role: "admin" });

  console.log(`Admin account created for ${email}`);
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
