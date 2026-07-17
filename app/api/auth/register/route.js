import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import User from "@/models/User";
import { hashPassword } from "@/lib/auth";

export async function POST(req) {
  try {
    await connectDB();
    const { name, email, password, role } = await req.json();

    if (!name || !email || !password) {
      return NextResponse.json({ error: "All fields are required" }, { status: 400 });
    }

    const existing = await User.findOne({ email: email.toLowerCase() });
    if (existing) {
      return NextResponse.json({ error: "Email already registered" }, { status: 409 });
    }

    const hashed = await hashPassword(password);

    // NOTE: In production, don't let self-registration set role="admin" freely.
    // Restrict that via an invite code or manual DB assignment.
    const safeRole = role === "admin" ? "admin" : "student";

    const user = await User.create({
      name,
      email: email.toLowerCase(),
      password: hashed,
      role: safeRole,
    });

    return NextResponse.json(
      { message: "User registered", user: { id: user._id, name: user.name, role: user.role } },
      { status: 201 }
    );
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
