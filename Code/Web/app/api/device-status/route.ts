// Update device status from ESP32-CAM
import { type NextRequest, NextResponse } from "next/server"
import { queryDb } from "@/lib/db"

export async function POST(request: NextRequest) {
  try {
    const { deviceId, status, batteryLevel, lastSeen } = await request.json()

    if (!deviceId) {
      return NextResponse.json({ error: "Missing device ID" }, { status: 400 })
    }

    // Update device status
    await queryDb("UPDATE devices SET status = ?, battery_level = ?, updated_at = NOW() WHERE device_id = ?", [
      status || "online",
      batteryLevel || 100,
      deviceId,
    ])

    return NextResponse.json({ message: "Device status updated" }, { status: 200 })
  } catch (error) {
    console.error("Error updating device status:", error)
    return NextResponse.json({ error: "Failed to update device status" }, { status: 500 })
  }
}
