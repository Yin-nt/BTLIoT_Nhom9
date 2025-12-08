const mqtt = require("mqtt")

class MQTTService {
  constructor() {
    this.client = null
    this.topics = {
      status: "cabinet/+/status",
      control: "cabinet/+/control",
      verify: "cabinet/+/verify",
    }
  }

  connect() {
    const options = {
      clientId: `backend_${Date.now()}`,
      clean: true,
      reconnectPeriod: 1000,
    }

    // Add credentials if provided
    if (process.env.MQTT_USERNAME) {
      options.username = process.env.MQTT_USERNAME
      options.password = process.env.MQTT_PASSWORD
    }

    this.client = mqtt.connect(process.env.MQTT_BROKER, options)

    this.client.on("connect", () => {
      console.log("Connected to MQTT broker")

      // Subscribe to topics
      Object.values(this.topics).forEach((topic) => {
        this.client.subscribe(topic, (err) => {
          if (!err) {
            console.log(`Subscribed to ${topic}`)
          }
        })
      })
    })

    this.client.on("message", (topic, message) => {
      this.handleMessage(topic, message)
    })

    this.client.on("error", (error) => {
      console.error("MQTT Error:", error)
    })

    this.client.on("reconnect", () => {
      console.log("Reconnecting to MQTT broker...")
    })
  }

  handleMessage(topic, message) {
    try {
      const data = JSON.parse(message.toString())
      console.log(`[MQTT] ${topic}:`, data)

      if (topic.includes("/status")) {
        this.handleStatusUpdate(topic, data)
      } else if (topic.includes("/verify")) {
        this.handleVerifyRequest(topic, data)
      }
    } catch (error) {
      console.error("Error handling MQTT message:", error)
    }
  }

  handleStatusUpdate(topic, data) {
    // Extract cabinet_id from topic (e.g., cabinet/CAB001/status)
    const cabinetId = topic.split("/")[1]

    // Update cabinet status in database
    const db = require("../config/database")
    db.execute("UPDATE cabinets SET status = ?, lock_status = ?, last_seen = NOW() WHERE cabinet_id = ?", [
      data.status || "online",
      data.lock_status || "locked",
      cabinetId,
    ]).catch((err) => console.error("Error updating cabinet status:", err))
  }

  async handleVerifyRequest(topic, data) {
    // Handle face verification request from ESP32
    const cabinetId = topic.split("/")[1]
    console.log(`Verify request from ${cabinetId}:`, data)

    // Forward to face verification service
    const faceService = require("./face")
    try {
      const result = await faceService.verifyFromESP32(data.image, cabinetId)

      // Send result back to ESP32
      this.publish(`cabinet/${cabinetId}/verify/result`, {
        success: result.success,
        user_id: result.user_id,
        username: result.username,
        action: result.success ? "unlock" : "deny",
      })
    } catch (error) {
      console.error("Error in face verification:", error)
      this.publish(`cabinet/${cabinetId}/verify/result`, {
        success: false,
        error: error.message,
      })
    }
  }

  publish(topic, message) {
    if (this.client && this.client.connected) {
      this.client.publish(topic, JSON.stringify(message), { qos: 1 })
      console.log(`[MQTT] Published to ${topic}:`, message)
    } else {
      console.error("MQTT client not connected")
    }
  }

  sendControlCommand(cabinetId, action, userId) {
    const topic = "iot/door/control"
    const message = {
      action, // 'lock' or 'unlock'
      cabinet_id: cabinetId,
      user_id: userId,
      timestamp: Date.now(),
    }
    
    this.publish(topic, message)
    console.log(`🚪 Sent ${action} command to ${cabinetId}`)
  }


  disconnect() {
    if (this.client) {
      this.client.end()
    }
  }
}

module.exports = new MQTTService()
