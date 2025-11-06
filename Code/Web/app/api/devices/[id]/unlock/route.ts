// Unlock device endpoint
import { type NextRequest, NextResponse } from "next/server"
import { verifyToken, extractToken } from "@/lib/auth"
import { queryDb } from "@/lib/db"

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const token = extractToken(request.headers.get("authorization"))
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const decoded = verifyToken(token)
    if (!decoded) {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 })
    }

    // Check if user has access to this device
    const access = await queryDb(
      `
      SELECT uda.* FROM user_device_access uda
      JOIN devices d ON uda.device_id = d.id
      WHERE uda.user_id = ? AND d.id = ?
    `,
      [decoded.userId, params.id],
    )

    if (!Array.isArray(access) || access.length === 0) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 })
    }

    // Log the access attempt
    await queryDb("INSERT INTO access_logs (device_id, user_id, access_method, status) VALUES (?, ?, ?, ?)", [
      params.id,
      decoded.userId,
      "remote",
      "success",
    ])

    // TODO: Send MQTT command to ESP32-CAM to unlock device
    // await mqtt.publish(`device/${params.id}/unlock`, JSON.stringify({ unlock: true }));

    return NextResponse.json({
      message: "Device unlock command sent",
      deviceId: params.id,
    })
  } catch (error) {
    console.error("Error unlocking device:", error)
    return NextResponse.json({ error: "Failed to unlock device" }, { status: 500 })
  }
}
