const express = require("express")
const cors = require("cors")
const dotenv = require("dotenv")
const authRoutes = require("./routes/auth")
const userRoutes = require("./routes/users")
const faceRoutes = require("./routes/face")
const cabinetRoutes = require("./routes/cabinets")
const accessLogsRoutes = require("./routes/access-logs")
const alertsRoutes = require("./routes/alerts") // Adding alerts routes for unauthorized access notifications
const mqttService = require("./services/mqtt")
const { initializeDatabase } = require("./config/database")

dotenv.config()

const app = express()
const PORT = process.env.PORT || 3001

// Middleware
app.use(cors())
app.use(express.json())
app.use(express.urlencoded({ extended: true }))

// Routes
app.use("/api/auth", authRoutes)
app.use("/api/users", userRoutes)
app.use("/api/face", faceRoutes)
app.use("/api/cabinets", cabinetRoutes)
app.use("/api/access-logs", accessLogsRoutes)
app.use("/api/alerts", alertsRoutes) // Adding alerts endpoint

// Health check
app.get("/health", (req, res) => {
  res.json({ status: "ok", message: "Backend service is running" })
})

const startServer = async () => {
  try {
    // Ensure database exists and is initialized
    await initializeDatabase()

    // Start MQTT service
    mqttService.connect()

    // Start server
    app.listen(PORT, () => {
      console.log(`Backend server running on port ${PORT}`)
      console.log(`MQTT Broker: ${process.env.MQTT_BROKER}`)
      console.log(`AI Service: ${process.env.AI_SERVICE_URL}`)
    })
  } catch (error) {
    console.error("Failed to start server:", error.message)
    process.exit(1)
  }
}

startServer()
