// Check if user has face data registered
import { type NextRequest, NextResponse } from "next/server"
import { verifyToken, extractToken } from "@/lib/auth"
import { queryDb } from "@/lib/db"

export async function GET(request: NextRequest) {
  try {
    const token = extractToken(request.headers.get("authorization"))
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const decoded = verifyToken(token)
    if (!decoded) {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 })
    }

    const embeddings = await queryDb("SELECT id FROM face_embeddings WHERE user_id = ? AND is_verified = TRUE", [
      decoded.userId,
    ])

    return NextResponse.json({
      registered: Array.isArray(embeddings) && embeddings.length > 0,
      count: Array.isArray(embeddings) ? embeddings.length : 0,
    })
  } catch (error) {
    console.error("Error checking face status:", error)
    return NextResponse.json({ error: "Failed to check status" }, { status: 500 })
  }
}
