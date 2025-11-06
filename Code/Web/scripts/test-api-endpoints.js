/**
 * Script để test tất cả API endpoints
 *
 * Cách chạy:
 * node scripts/test-api-endpoints.js
 */

const http = require("http")

const API_URL = "http://localhost:3000"
let token = ""

// Helper function để gửi HTTP request
function makeRequest(method, path, body = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, API_URL)
    const options = {
      hostname: url.hostname,
      port: url.port || 3000,
      path: url.pathname + url.search,
      method: method,
      headers: {
        "Content-Type": "application/json",
      },
    }

    // Thêm JWT token nếu đã login
    if (token) {
      options.headers["Authorization"] = `Bearer ${token}`
    }

    const req = http.request(options, (res) => {
      let data = ""
      res.on("data", (chunk) => (data += chunk))
      res.on("end", () => {
        try {
          resolve({
            status: res.statusCode,
            data: JSON.parse(data),
          })
        } catch (e) {
          resolve({
            status: res.statusCode,
            data: data,
          })
        }
      })
    })

    req.on("error", reject)

    if (body) {
      req.write(JSON.stringify(body))
    }

    req.end()
  })
}

// Test sequence
async function runTests() {
  console.log("[API Test] Starting API endpoint tests...\n")

  try {
    // 1. Test Register (đổi "name" thành "fullName", thêm role nếu cần)
    console.log("1️⃣  Testing REGISTER endpoint...")
    const uniqueEmail = `test-script-${Date.now()}@example.com`;
    const registerRes = await makeRequest("POST", "/api/auth/register", {
      email: uniqueEmail,
      password: "TestPassword123",
      fullName: "Test Script User",  
      role: "user"  // Optional, API default "user" nhưng thêm an toàn
    })
    console.log("   Status:", registerRes.status)
    console.log("   Response:", registerRes.data)
    console.log()

    // 2. Test Login (fallback seed user1 nếu register fail)
    console.log("2️⃣  Testing LOGIN endpoint...")
    const loginEmail = (registerRes.status === 201 ? uniqueEmail : "user1@example.com");  // Fallback seed
    const loginRes = await makeRequest("POST", "/api/auth/login", {
      email: loginEmail,
      password: "TestPassword123"  // Match hash mới
    })
    console.log("   Status:", loginRes.status)
    console.log("   Token:", loginRes.data.token ? "✅ Received" : "❌ No token")
    token = loginRes.data.token || "";  // Set token
    console.log("   User:", loginRes.data.user ? `${loginRes.data.user.email} (${loginRes.data.user.role})` : "None")
    console.log()

    // 3. Test Get Devices 
    console.log("3️⃣  Testing GET DEVICES endpoint...")
    const devicesRes = await makeRequest("GET", "/api/devices")
    console.log("   Status:", devicesRes.status)
    console.log("   Devices count:", devicesRes.data.devices ? devicesRes.data.devices.length : (devicesRes.data.length || 0))
    console.log()

    // 4. Test Get Alerts
    console.log("4️⃣  Testing GET ALERTS endpoint...")
    const alertsRes = await makeRequest("GET", "/api/alerts")
    console.log("   Status:", alertsRes.status)
    console.log("   Alerts count:", alertsRes.data.alerts ? alertsRes.data.alerts.length : (alertsRes.data.length || 0))
    console.log()

    // 5. Test Face Status
    console.log("5️⃣  Testing FACE STATUS endpoint...")
    const faceStatusRes = await makeRequest("GET", "/api/face/status")
    console.log("   Status:", faceStatusRes.status)
    console.log("   Response:", faceStatusRes.data)
    console.log()

    // 6. Test Send Notification
    console.log("6️⃣  Testing SEND NOTIFICATION endpoint...")
    const notifyRes = await makeRequest("POST", "/api/notifications/send", {
      user_id: 1,  // Admin ID từ seed
      title: "Test Alert",
      message: "This is a test notification from API test script",
      type: "alert",
      priority: "high"
    })
    console.log("   Status:", notifyRes.status)
    console.log("   Response:", notifyRes.data)
    console.log()

    // 7. Test Access Logs (fix lặp: Chỉ console 1 lần)
    console.log("7️⃣  Testing GET ACCESS LOGS endpoint...")
    const logsRes = await makeRequest("GET", "/api/access-logs")
    console.log("   Status:", logsRes.status)
    console.log("   Logs count:", logsRes.data.logs ? logsRes.data.logs.length : (logsRes.data.length || 0))
    console.log()

    console.log("✅ All API tests completed!")
  } catch (error) {
    console.error("❌ Test error:", error.message)
    console.log("\n⚠️  Make sure your Next.js dev server is running: npm run dev")
  }
}

// Run tests
runTests()
