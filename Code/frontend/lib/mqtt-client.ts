// MQTT Client for communicating with ESP32-CAM devices
import mqtt from "mqtt"

export type MQTTConfig = {
  broker: "mosquitto" | "hivemq"
  host?: string
  port?: number
  username?: string
  password?: string
}

class MQTTClientManager {
  private client: mqtt.MqttClient | null = null
  private config: MQTTConfig

  constructor(config: MQTTConfig) {
    this.config = config
  }

  connect(): Promise<mqtt.MqttClient> {
    return new Promise((resolve, reject) => {
      let brokerUrl: string

      // Configure based on broker type
      if (this.config.broker === "mosquitto") {
        // Local Mosquitto broker
        brokerUrl = `mqtt://${this.config.host || "localhost"}:${this.config.port || 1883}`
      } else {
        // HiveMQ Cloud broker
        brokerUrl = `mqtts://${this.config.host || process.env.HIVEMQ_HOST}:${this.config.port || 8883}`
      }

      const options: mqtt.IClientOptions = {
        clean: true,
        connectTimeout: 4000,
        reconnectPeriod: 1000,
      }

      // Add credentials if provided
      if (this.config.username && this.config.password) {
        options.username = this.config.username
        options.password = this.config.password
      }

      this.client = mqtt.connect(brokerUrl, options)

      this.client.on("connect", () => {
        console.log(`✅ Connected to ${this.config.broker} MQTT broker`)
        resolve(this.client!)
      })

      this.client.on("error", (error) => {
        console.error("❌ MQTT connection error:", error)
        reject(error)
      })

      this.client.on("disconnect", () => {
        console.log("⚠️ MQTT client disconnected")
      })
    })
  }

  subscribe(topic: string, callback: (message: string, topic: string) => void) {
    if (!this.client) {
      throw new Error("MQTT client not connected")
    }

    this.client.subscribe(topic, (error) => {
      if (error) {
        console.error(`Error subscribing to ${topic}:`, error)
        return
      }
      console.log(`📡 Subscribed to topic: ${topic}`)
    })

    this.client.on("message", (receivedTopic, message) => {
      if (receivedTopic === topic) {
        callback(message.toString(), receivedTopic)
      }
    })
  }

  publish(topic: string, message: string | object): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.client) {
        reject(new Error("MQTT client not connected"))
        return
      }

      const payload = typeof message === "string" ? message : JSON.stringify(message)

      this.client.publish(topic, payload, { qos: 1 }, (error) => {
        if (error) {
          console.error(`Error publishing to ${topic}:`, error)
          reject(error)
        } else {
          console.log(`📤 Published to ${topic}:`, payload)
          resolve()
        }
      })
    })
  }

  disconnect() {
    if (this.client) {
      this.client.end()
      this.client = null
      console.log("🔌 MQTT client disconnected")
    }
  }
}

// Singleton instance
let mqttClient: MQTTClientManager | null = null

export function getMQTTClient(config?: MQTTConfig): MQTTClientManager {
  if (!mqttClient && config) {
    mqttClient = new MQTTClientManager(config)
  }
  if (!mqttClient) {
    throw new Error("MQTT client not initialized. Provide config first.")
  }
  return mqttClient
}

export default MQTTClientManager
