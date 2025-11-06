// Authentication utilities with JWT and password hashing
import bcrypt from "bcryptjs"
import jwt from "jsonwebtoken"

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key-change-in-production-minimum-32-chars"

export async function hashPassword(password: string): Promise<string> {
  const saltRounds = 10
  return bcrypt.hash(password, saltRounds)
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash)
}

export function generateToken(userId: number, email: string, role: string): string {
  const token = jwt.sign({ userId, email, role }, JWT_SECRET, {
    expiresIn: "7d",
  })
  return token
}

export function verifyToken(token: string): any {
  try {
    const verified = jwt.verify(token, JWT_SECRET)
    return verified
  } catch (error) {
    return null
  }
}

export function extractToken(authorization: string | undefined): string | null {
  if (!authorization) return null
  const parts = authorization.split(" ")
  if (parts.length === 2 && parts[0] === "Bearer") {
    return parts[1]
  }
  return null
}
