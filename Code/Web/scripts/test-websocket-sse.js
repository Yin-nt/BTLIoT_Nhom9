/**
 * Script để test WebSocket/SSE (Server-Sent Events)
 * Kiểm tra xem real-time alerts có hoạt động không
 *
 * Cách chạy:
 * node scripts/test-websocket-sse.js
 */

const http = require("http")

console.log("[SSE Test] Connecting to Server-Sent Events stream...")
console.log("[SSE Test] Connecting to: http://localhost:3000/api/events\n")

const options = {
  hostname: "localhost",
  port: 3000,
  path: "/api/events",
  method: "GET",
  headers: {
    Accept: "text/event-stream",
    "Cache-Control": "no-cache",
    Connection: "keep-alive",
  },
}

const req = http.request(options, (res) => {
  console.log("[SSE Test] ✅ Connected! Status:", res.statusCode)
  console.log("[SSE Test] Headers:", res.headers)
  console.log("[SSE Test] Listening for events...\n")

  let buffer = ""

  res.on("data", (chunk) => {
    buffer += chunk.toString()

    // Parse SSE format: "data: {...}\n\n"
    const lines = buffer.split("\n")
    buffer = lines.pop() // Keep incomplete line

    lines.forEach((line) => {
      if (line.startsWith("data: ")) {
        try {
          const data = JSON.parse(line.slice(6))
          console.log("[SSE Test] 📨 Received event:", data)
        } catch (e) {
          console.log("[SSE Test] Received raw:", line)
        }
      }
    })
  })

  res.on("end", () => {
    console.log("[SSE Test] ⚠️  Stream ended")
  })

  res.on("error", (err) => {
    console.error("[SSE Test] ❌ Stream error:", err)
  })
})

req.on("error", (err) => {
  console.error("[SSE Test] ❌ Connection error:", err.message)
  console.log("\n⚠️  Make sure your Next.js dev server is running:")
  console.log("   npm run dev")
})

// Listen for 30 seconds then exit
setTimeout(() => {
  console.log("\n[SSE Test] Test duration complete. Closing connection...")
  req.abort()
  process.exit(0)
}, 30000)

process.on("SIGINT", () => {
  console.log("\n[SSE Test] Closing connection...")
  req.abort()
  process.exit(0)
})
