/**
 * Script để test MQTT connection với HiveMQ
 * Giả lập ESP32-CAM gửi dữ liệu
 *
 * Cách chạy:
 * node scripts/test-mqtt-client.js
 */

const mqtt = require("mqtt")

// Kết nối tới HiveMQ Public Broker
const brokerUrl = "mqtt://broker.hivemq.com:1883"

console.log("[MQTT Test] Connecting to HiveMQ broker...")
const client = mqtt.connect(brokerUrl, {
  clientId: `esp32-sim-${Math.random().toString(16).substr(2, 9)}`,
  clean: true,
  reconnectPeriod: 1000,
})

client.on("connect", () => {
  console.log("[MQTT Test] ✅ Connected to HiveMQ successfully!")

  // Subscribe to topics để nghe thông báo từ server
  const topics = ["device/1/unlock", "device/1/status", "device/1/alerts"]

  client.subscribe(topics, (err) => {
    if (err) {
      console.error("[MQTT Test] ❌ Subscribe error:", err)
    } else {
      console.log("[MQTT Test] ✅ Subscribed to topics:", topics)
    }
  })

  // Giả lập: ESP32 gửi thông báo unlock mỗi 5 giây
  console.log("\n[MQTT Test] Simulating device unlock events...\n")

  let unlockCount = 0
  const unlockInterval = setInterval(() => {
    unlockCount++

    const unlockData = {
      device_id: 1,
      user_id: 1,
      timestamp: new Date().toISOString(),
      access_method: "face_recognition",
      status: "success",
      message: `Device unlocked - Event #${unlockCount}`,
    }

    // Publish unlock event
    client.publish("device/1/unlock", JSON.stringify(unlockData), { qos: 1 }, (err) => {
      if (err) {
        console.error("[MQTT Test] ❌ Publish error:", err)
      } else {
        console.log(`[MQTT Test] 📤 Published unlock event #${unlockCount}:`, unlockData)
      }
    })

    // Sau 3 events, simulate alert
    if (unlockCount === 3) {
      setTimeout(() => {
        const alertData = {
          device_id: 1,
          timestamp: new Date().toISOString(),
          alert_type: "unauthorized_access",
          message: "Face recognition failed - Unknown person detected",
        }

        client.publish("device/1/alerts", JSON.stringify(alertData), { qos: 1 }, (err) => {
          if (err) {
            console.error("[MQTT Test] ❌ Alert publish error:", err)
          } else {
            console.log("[MQTT Test] 🚨 Published alert:", alertData)
          }
        })
      }, 2000)
    }

    if (unlockCount >= 5) {
      clearInterval(unlockInterval)
      console.log("\n[MQTT Test] ✅ Test completed! Press Ctrl+C to exit.")
    }
  }, 5000)
})

client.on("message", (topic, message) => {
  console.log(`[MQTT Test] 📥 Received from ${topic}:`, message.toString())
})

client.on("error", (err) => {
  console.error("[MQTT Test] ❌ Connection error:", err)
})

client.on("disconnect", () => {
  console.log("[MQTT Test] ⚠️  Disconnected")
})

// Graceful shutdown
process.on("SIGINT", () => {
  console.log("\n[MQTT Test] Closing connection...")
  client.end()
  process.exit(0)
})
