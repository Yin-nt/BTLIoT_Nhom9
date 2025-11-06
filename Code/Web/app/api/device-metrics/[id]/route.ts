// Get device metrics and health data
import { type NextRequest, NextResponse } from "next/server"
import { verifyToken, extractToken } from "@/lib/auth"
import { queryDb } from "@/lib/db"

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const token = extractToken(request.headers.get("authorization"))
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const decoded = verifyToken(token)
    if (!decoded) {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 })
    }

    const deviceId = params.id

    // Get device access logs from last 7 days
    const logs = await queryDb(
      `
      SELECT DATE(created_at) as date, status, COUNT(*) as count
      FROM access_logs
      WHERE device_id = ? AND created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
      GROUP BY DATE(created_at), status
      ORDER BY date DESC
    `,
      [deviceId],
    )

    if (!Array.isArray(logs)) {
      return NextResponse.json({ error: "Failed to fetch logs" }, { status: 500 })
    }

    // Calculate metrics
    const totalLogs = logs as any[]
    const successCount = totalLogs.filter((log) => log.status === "success").length
    const failedCount = totalLogs.filter((log) => log.status === "failed" || log.status === "unauthorized").length

    const metrics = {
      uptime: 99.5, // Placeholder
      failedAttempts: failedCount,
      successfulAttempts: successCount,
      avgResponseTime: 450, // Placeholder in ms
    }

    // Format chart data
    const chartData = Array.from({ length: 7 }, (_, i) => {
      const date = new Date()
      date.setDate(date.getDate() - i)
      const dateStr = date.toISOString().split("T")[0]

      const dayLogs = totalLogs.filter((log) => log.date === dateStr)
      return {
        name: new Date(dateStr).toLocaleDateString("en-US", { weekday: "short" }),
        success: dayLogs.filter((log) => log.status === "success").reduce((sum, log) => sum + log.count, 0),
        failed: dayLogs.filter((log) => log.status !== "success").reduce((sum, log) => sum + log.count, 0),
      }
    }).reverse()

    return NextResponse.json({ metrics, chartData })
  } catch (error) {
    console.error("Error fetching device metrics:", error)
    return NextResponse.json({ error: "Failed to fetch metrics" }, { status: 500 })
  }
}
