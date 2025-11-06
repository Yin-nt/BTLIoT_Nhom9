import { type NextRequest, NextResponse } from "next/server"
import { verifyPassword, generateToken } from "@/lib/auth"
import { queryDb } from "@/lib/db"

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json()
    console.log("[smart-locker] Login attempt:", email)

    if (!email || !password) {
      return NextResponse.json({ error: "Missing email or password" }, { status: 400 })
    }

    const users = await queryDb("SELECT id, email, password_hash, full_name, role FROM users WHERE email = ?", [email])
    console.log("[smart-locker] User query result:", users)

    if (!Array.isArray(users) || users.length === 0) {
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 })
    }

    const user = users[0] as any
    const passwordMatch = await verifyPassword(password, user.password_hash)
    console.log("[smart-locker] Password verification:", passwordMatch)

    if (!passwordMatch) {
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 })
    }

    const token = generateToken(user.id, user.email, user.role)

    return NextResponse.json({
      user: { id: user.id, email: user.email, fullName: user.full_name, role: user.role },
      token,
    })
  } catch (error) {
    console.error("[smart-locker] Login error:", error)
    return NextResponse.json({ error: error instanceof Error ? error.message : "Login failed" }, { status: 500 })
  }
}
