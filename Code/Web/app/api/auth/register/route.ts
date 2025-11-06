import { type NextRequest, NextResponse } from "next/server"
import { hashPassword, generateToken } from "@/lib/auth"
import { queryDb } from "@/lib/db"

export async function POST(request: NextRequest) {
  try {
    const { email, password, fullName } = await request.json()
    console.log("[smart-locker] Register attempt:", { email, fullName })

    if (!email || !password || !fullName) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    // Check if user already exists
    const existing = await queryDb("SELECT id FROM users WHERE email = ?", [email])
    console.log("[smart-locker] Existing users check:", existing)

    if (Array.isArray(existing) && existing.length > 0) {
      return NextResponse.json({ error: "Email already registered" }, { status: 409 })
    }

    const passwordHash = await hashPassword(password)
    const result = await queryDb("INSERT INTO users (email, password_hash, full_name, role) VALUES (?, ?, ?, ?)", [
      email,
      passwordHash,
      fullName,
      "user",
    ])

    console.log("[smart-locker] User created:", result)
    const userId = (result as any).insertId
    const token = generateToken(userId, email, "user")

    return NextResponse.json(
      {
        user: { id: userId, email, fullName, role: "user" },
        token,
      },
      { status: 201 },
    )
  } catch (error) {
    console.error("[smart-locker] Registration error:", error)
    return NextResponse.json({ error: error instanceof Error ? error.message : "Registration failed" }, { status: 500 })
  }
}
