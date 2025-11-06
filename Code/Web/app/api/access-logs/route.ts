// Get access logs for audit trail
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

    const searchParams = request.nextUrl.searchParams
    const deviceId = searchParams.get("deviceId")
    const limit = searchParams.get("limit") || "50"

    let query = `
      SELECT al.*, d.device_name, u.full_name 
      FROM access_logs al
      JOIN devices d ON al.device_id = d.id
      LEFT JOIN users u ON al.user_id = u.id
    `
    const params: any[] = []

    if (deviceId) {
      query += " WHERE al.device_id = ?"
      params.push(deviceId)
    }

    query += " ORDER BY al.created_at DESC LIMIT ?"
    params.push(Number.parseInt(limit))

    const logs = await queryDb(query, params)
    return NextResponse.json({ logs })
  } catch (error) {
    console.error("Error fetching access logs:", error)
    return NextResponse.json({ error: "Failed to fetch logs" }, { status: 500 })
  }
}
