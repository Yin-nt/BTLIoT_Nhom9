// Server-Sent Events (SSE) endpoint for real-time notifications
// Frontend connects: const eventSource = new EventSource('/api/events')
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

    const userId = decoded.id as number
    console.log(`[smart-locker] SSE connection opened for user ${userId}`)

    // SSE is simpler to implement in Next.js without additional libraries
    const encoder = new TextEncoder()
    const stream = new ReadableStream({
      async start(controller) {
        // Send initial connection message
        controller.enqueue(encoder.encode('data: {"type": "connected"}\n\n'))

        // Function to check for new alerts
        const checkAlerts = async () => {
          try {
            const result = (await queryDb(
              `SELECT id, device_id, alert_type, message, is_read, created_at 
               FROM alerts 
               WHERE user_id = ? AND is_read = false 
               ORDER BY created_at DESC 
               LIMIT 5`,
              [userId],
            )) as any[]

            if (result && result.length > 0) {
              result.forEach((alert) => {
                const message = {
                  type: "new_alert",
                  id: alert.id,
                  alertType: alert.alert_type,
                  message: alert.message,
                  timestamp: alert.created_at,
                }
                controller.enqueue(encoder.encode(`data: ${JSON.stringify(message)}\n\n`))
              })
            }
          } catch (error) {
            console.error("[smart-locker] Error checking alerts:", error)
          }
        }

        // Check for alerts every 2 seconds
        const interval = setInterval(checkAlerts, 2000)

        // Cleanup on client disconnect
        request.signal.addEventListener("abort", () => {
          clearInterval(interval)
          controller.close()
          console.log(`[smart-locker] SSE connection closed for user ${userId}`)
        })
      },
    })

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    })
  } catch (error) {
    console.error("[smart-locker] SSE error:", error)
    return NextResponse.json({ error: "SSE connection failed" }, { status: 500 })
  }
}
