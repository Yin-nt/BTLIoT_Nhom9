// Get alerts for users
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

    // Get unread alerts for devices the user has access to
    const alerts = await queryDb(
      `
      SELECT a.*, d.device_name
      FROM alerts a
      JOIN devices d ON a.device_id = d.id
      JOIN user_device_access uda ON d.id = uda.device_id
      WHERE uda.user_id = ? AND a.is_read = FALSE
      ORDER BY a.created_at DESC
      LIMIT 20
    `,
      [decoded.userId],
    )

    return NextResponse.json({ alerts })
  } catch (error) {
    console.error("Error fetching alerts:", error)
    return NextResponse.json({ error: "Failed to fetch alerts" }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const token = extractToken(request.headers.get("authorization"))
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const decoded = verifyToken(token)
    if (!decoded) {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 })
    }

    const { alertId } = await request.json()

    await queryDb("UPDATE alerts SET is_read = TRUE WHERE id = ?", [alertId])

    return NextResponse.json({ message: "Alert marked as read" })
  } catch (error) {
    console.error("Error updating alert:", error)
    return NextResponse.json({ error: "Failed to update alert" }, { status: 500 })
  }
}
