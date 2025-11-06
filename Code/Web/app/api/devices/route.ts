// Get all devices (for admin) or user's devices
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

    let devices
    if (decoded.role === "admin") {
      // Admin sees all devices
      devices = await queryDb(`
        SELECT d.*, u.full_name as created_by_name 
        FROM devices d 
        JOIN users u ON d.created_by = u.id 
        ORDER BY d.created_at DESC
      `)
    } else {
      // Users see only their devices
      devices = await queryDb(
        `
        SELECT d.*, u.full_name as created_by_name 
        FROM devices d 
        JOIN users u ON d.created_by = u.id 
        JOIN user_device_access uda ON d.id = uda.device_id 
        WHERE uda.user_id = ? 
        ORDER BY d.created_at DESC
      `,
        [decoded.userId],
      )
    }

    return NextResponse.json({ devices })
  } catch (error) {
    console.error("Error fetching devices:", error)
    return NextResponse.json({ error: "Failed to fetch devices" }, { status: 500 })
  }
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

    const { deviceId, deviceName, location } = await request.json()

    if (!deviceId || !deviceName) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    const result = await queryDb(
      "INSERT INTO devices (device_id, device_name, location, created_by) VALUES (?, ?, ?, ?)",
      [deviceId, deviceName, location || "", decoded.userId],
    )

    return NextResponse.json({ message: "Device created", deviceId: (result as any).insertId }, { status: 201 })
  } catch (error) {
    console.error("Error creating device:", error)
    return NextResponse.json({ error: "Failed to create device" }, { status: 500 })
  }
}
