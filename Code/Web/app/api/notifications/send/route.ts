// Send push notifications to users
import { type NextRequest, NextResponse } from "next/server"
import { verifyToken, extractToken } from "@/lib/auth"
import { queryDb } from "@/lib/db"
import { broadcastToUser } from "@/lib/websocket-server"

interface NotificationPayload {
  title: string
  body: string
  icon?: string
  badge?: string
  tag: string
  requireInteraction?: boolean
}

export async function POST(request: NextRequest) {
  try {
    const token = extractToken(request.headers.get("authorization"))
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const decoded = verifyToken(token)
    if (!decoded || decoded.role !== "admin") {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 })
    }

    const { userId, title, body, tag, deviceId } = await request.json()

    // Store notification in database
    await queryDb("INSERT INTO alerts (device_id, alert_type, message, user_id) VALUES (?, ?, ?, ?)", [
      deviceId,
      tag,
      `${title}: ${body}`,
      userId,
    ])

    broadcastToUser(userId, {
      type: tag as any,
      deviceId,
      deviceName: `Device ${deviceId}`,
      userId,
      message: body,
      timestamp: new Date().toISOString(),
      alertType: tag,
    })

    return NextResponse.json({ message: "Notification sent" }, { status: 200 })
  } catch (error) {
    console.error("Error sending notification:", error)
    return NextResponse.json({ error: "Failed to send notification" }, { status: 500 })
  }
}
