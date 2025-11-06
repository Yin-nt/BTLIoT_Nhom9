// MQTT client configuration for ESP32-CAM communication
import mqtt from "mqtt"

let client: mqtt.MqttClient | null = null

export function getMqttClient(): mqtt.MqttClient {
  if (!client) {
    const brokerUrl = process.env.MQTT_BROKER_URL || "mqtt://78d8793546994db586dfc8c11c07f3b3.s1.eu.hivemq.cloud:8883"
    client = mqtt.connect(brokerUrl, {
      username: process.env.MQTT_USERNAME,
      password: process.env.MQTT_PASSWORD,
      clientId: `smart-locker-server-${Date.now()}`,
    })

    client.on("connect", () => {
      console.log("Connected to MQTT broker")
      // Subscribe to device status topics
      client?.subscribe("device/+/status")
      client?.subscribe("device/+/heartbeat")
    })

    client.on("message", async (topic, message) => {
      console.log(`MQTT message: ${topic} - ${message.toString()}`)
      // Handle incoming messages from ESP32
      await handleMqttMessage(topic, message)
    })

    client.on("error", (error) => {
      console.error("MQTT error:", error)
    })
  }

  return client
}

async function handleMqttMessage(topic: string, message: Buffer) {
  try {
    const payload = JSON.parse(message.toString())

    if (topic.includes("/status")) {
      const deviceId = topic.split("/")[1]
      // Update device status in database
      console.log(`Device ${deviceId} status:`, payload)
    } else if (topic.includes("/heartbeat")) {
      const deviceId = topic.split("/")[1]
      // Update device last seen time
      console.log(`Device ${deviceId} heartbeat received`)
    }
  } catch (error) {
    console.error("Error handling MQTT message:", error)
  }
}

export async function publishUnlockCommand(deviceId: string) {
  const client = getMqttClient()
  const topic = `device/${deviceId}/command`
  const payload = JSON.stringify({ action: "unlock", timestamp: Date.now() })

  return new Promise((resolve, reject) => {
    client.publish(topic, payload, { qos: 1 }, (error) => {
      if (error) reject(error)
      else resolve(true)
    })
  })
}

export function disconnectMqtt() {
  if (client) {
    client.end()
    client = null
  }
}
