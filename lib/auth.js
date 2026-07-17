import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";

const JWT_SECRET = process.env.JWT_SECRET;

export async function hashPassword(password) {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(password, salt);
}

export async function comparePassword(password, hashed) {
  return bcrypt.compare(password, hashed);
}

export function signToken(payload) {
  // payload should include: { id, role, name }
  return jwt.sign(payload, JWT_SECRET, { expiresIn: "12h" });
}

export function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (err) {
    return null;
  }
}

// Extracts and verifies the user from a request's Authorization header (Bearer token)
export function getUserFromRequest(req) {
  const authHeader = req.headers.get("authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) return null;
  const token = authHeader.split(" ")[1];
  return verifyToken(token);
}
