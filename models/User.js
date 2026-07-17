import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true }, // hashed
    role: { type: String, enum: ["admin", "student"], default: "student" },
  },
  { timestamps: true }
);

export default mongoose.models.User || mongoose.model("User", userSchema);
