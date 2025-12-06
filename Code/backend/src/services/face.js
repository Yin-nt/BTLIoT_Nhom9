const axios = require("axios")
const { pool } = require("../config/database")
const FormData = require("form-data")
const fs = require("fs")
const path = require("path")

class FaceService {
  constructor() {
    this.aiServiceUrl = process.env.AI_SERVICE_URL || "http://localhost:8000"
  }

  // Extract embedding from image using AI service
  async extractEmbedding(imageBuffer) {
    try {
      const formData = new FormData()
      formData.append("file", imageBuffer, { filename: "image.jpg" })

      const response = await axios.post(`${this.aiServiceUrl}/api/extract-embedding`, formData, {
        headers: formData.getHeaders(),
        timeout: 30000,
      })

      if (response.data && response.data.embedding) {
        return response.data.embedding
      }

      throw new Error("No embedding returned from AI service")
    } catch (error) {
      console.error("Error extracting embedding:", error.message)
      if (error.code === "ECONNREFUSED") {
        throw new Error(`AI service not running at ${this.aiServiceUrl}`)
      }
      throw new Error("AI service unavailable")
    }
  }

  // Register face images for user (5-20 images)
  async registerFaceImages(userId, images) {
    const embeddings = []

    for (const image of images) {
      try {
        // Save image to storage
        const imageUrl = await this.saveImage(image, userId)

        // Insert into user_face_images
        const [result] = await pool.execute(
          "INSERT INTO user_face_images (user_id, image_path, image_type) VALUES (?, ?, ?)",
          [userId, imageUrl, "registration"],
        )
        const imageId = result.insertId

        // Extract embedding from Python AI service
        const formData = new FormData()
        formData.append("file", image.buffer, { filename: "image.jpg" })

        const response = await axios.post(`${this.aiServiceUrl}/api/verify`, formData, {
          headers: formData.getHeaders(),
        })

        if (response.data.status === "success" && response.data.faces.length > 0) {
          const faceData = response.data.faces[0]

          // Save embedding to database
          await pool.execute("INSERT INTO face_embeddings (user_id, source_image_id, embedding) VALUES (?, ?, ?)", [
            userId,
            imageId,
            JSON.stringify(faceData.embedding || []),
          ])

          embeddings.push({ imageId, score: faceData.score })
        }
      } catch (error) {
        console.error("Error processing image:", error)
      }
    }

    return { success: true, count: embeddings.length }
  }

  // Verify face (1 image) against all user embeddings
  async verifyFace(imageBuffer, userId = null) {
    try {
      // Extract embedding from input image
      const inputEmbedding = await this.extractEmbedding(imageBuffer)

      // Get all embeddings from database
      let query = `
        SELECT 
          fe.embedding,
          ufi.user_id,
          u.username,
          u.email
        FROM face_embeddings fe
        JOIN user_face_images ufi ON fe.source_image_id = ufi.id
        JOIN users u ON ufi.user_id = u.id
      `

      const params = []
      if (userId) {
        query += " WHERE ufi.user_id = ?"
        params.push(userId)
      }

      const [rows] = await pool.execute(query, params)

      if (rows.length === 0) {
        return { success: false, message: "No face data found" }
      }

      // Compare with all embeddings
      let bestMatch = { similarity: 0, user: null }

      for (const row of rows) {
        const storedEmbedding = JSON.parse(row.embedding)
        const similarity = this.cosineSimilarity(inputEmbedding, storedEmbedding)

        if (similarity > bestMatch.similarity) {
          bestMatch = {
            similarity,
            user: {
              user_id: row.user_id,
              username: row.username,
              email: row.email,
            },
          }
        }
      }

      // Threshold for face recognition (0.6 = 60% similarity)
      const threshold = Number.parseFloat(process.env.FACE_SIMILARITY_THRESHOLD || "0.6")

      if (bestMatch.similarity >= threshold) {
        return {
          success: true,
          user_id: bestMatch.user.user_id,
          username: bestMatch.user.username,
          similarity: bestMatch.similarity,
        }
      } else {
        return {
          success: false,
          message: "Face not recognized",
          best_similarity: bestMatch.similarity,
        }
      }
    } catch (error) {
      console.error("Error verifying face:", error)
      throw error
    }
  }

  // Verify from ESP32 (base64 image)
  async verifyFromESP32(base64Image, cabinetId) {
    try {
      // Decode base64 to buffer
      const imageBuffer = Buffer.from(base64Image, "base64")

      // Verify face
      const result = await this.verifyFace(imageBuffer)

      // Get cabinet info for owner notification
      const [cabinets] = await pool.query("SELECT id, cabinet_id, name, owner_id FROM cabinets WHERE cabinet_id = ?", [
        cabinetId,
      ])

      if (cabinets.length === 0) {
        throw new Error("Cabinet not found")
      }

      const cabinet = cabinets[0]

      const alertType = result.success ? "none" : "unauthorized"

      // Log access attempt with alert type
      await pool.query(
        `INSERT INTO access_logs 
        (cabinet_id, user_id, access_type, success, alert_type, timestamp) 
        VALUES (?, ?, 'face', ?, ?, NOW())`,
        [cabinet.id, result.user_id || null, result.success, alertType],
      )

      if (!result.success && cabinet.owner_id) {
        // Send alert via MQTT or WebSocket
        const mqttService = require("./mqtt")
        mqttService.publish(`user/${cabinet.owner_id}/alerts`, {
          type: "unauthorized_access",
          cabinet_id: cabinet.cabinet_id,
          cabinet_name: cabinet.name,
          timestamp: new Date().toISOString(),
          message: "Người lạ cố gắng mở tủ",
        })
      }

      return result
    } catch (error) {
      console.error("Error in ESP32 verification:", error)
      throw error
    }
  }

  // Calculate cosine similarity between two vectors
  cosineSimilarity(vecA, vecB) {
    const dotProduct = vecA.reduce((sum, a, i) => sum + a * vecB[i], 0)
    const magA = Math.sqrt(vecA.reduce((sum, a) => sum + a * a, 0))
    const magB = Math.sqrt(vecB.reduce((sum, b) => sum + b * b, 0))
    return dotProduct / (magA * magB)
  }

  // Save image to storage using proper file system storage
  async saveImage(image, userId) {
    const uploadDir = path.join(__dirname, "../../uploads/faces", userId.toString())

    // Create directory if not exists
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true })
    }

    const filename = `face_${Date.now()}_${Math.random().toString(36).substr(2, 9)}.jpg`
    const filePath = path.join(uploadDir, filename)

    // Write file
    fs.writeFileSync(filePath, image.buffer)

    return `/uploads/faces/${userId}/${filename}`
  }
}

module.exports = new FaceService()
