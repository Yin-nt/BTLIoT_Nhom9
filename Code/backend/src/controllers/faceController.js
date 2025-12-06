const faceService = require("../services/face")
const { pool } = require("../config/database")

// Register face images for a user
exports.registerFaces = async (req, res) => {
  try {
    const { userId } = req.body
    const images = req.files

    if (!images || images.length < 5) {
      return res.status(400).json({
        error: "At least 5 images required for registration",
      })
    }

    if (images.length > 20) {
      return res.status(400).json({
        error: "Maximum 20 images allowed",
      })
    }

    const result = await faceService.registerFaceImages(userId, images)

    res.json({
      success: true,
      message: `Registered ${result.count} face images`,
      count: result.count,
    })
  } catch (error) {
    console.error("Error registering faces:", error)
    res.status(500).json({ error: error.message })
  }
}

// Verify face from uploaded image
exports.verifyFace = async (req, res) => {
  try {
    const image = req.file

    if (!image) {
      return res.status(400).json({ error: "Image file required" })
    }

    const result = await faceService.verifyFace(image.buffer)

    res.json(result)
  } catch (error) {
    console.error("Error verifying face:", error)
    res.status(500).json({ error: error.message })
  }
}

// Verify face from ESP32 (base64 image)
exports.verifyFromESP32 = async (req, res) => {
  try {
    const { image, cabinetId } = req.body

    if (!image || !cabinetId) {
      return res.status(400).json({
        error: "Image and cabinetId required",
      })
    }

    const result = await faceService.verifyFromESP32(image, cabinetId)

    res.json(result)
  } catch (error) {
    console.error("Error verifying ESP32 face:", error)
    res.status(500).json({ error: error.message })
  }
}

// Get user face images
exports.getUserFaceImages = async (req, res) => {
  try {
    const { userId } = req.params

    const [images] = await pool.query(
      `SELECT id, image_path, image_type, uploaded_at 
       FROM user_face_images 
       WHERE user_id = ? 
       ORDER BY uploaded_at DESC`,
      [userId],
    )

    res.json(images)
  } catch (error) {
    console.error("Error fetching face images:", error)
    res.status(500).json({ error: "Internal server error" })
  }
}

// Delete face image
exports.deleteFaceImage = async (req, res) => {
  try {
    const { imageId } = req.params

    // Delete embedding first (foreign key constraint)
    await pool.query("DELETE FROM face_embeddings WHERE source_image_id = ?", [imageId])

    // Delete image record
    await pool.query("DELETE FROM user_face_images WHERE id = ?", [imageId])

    res.json({ success: true, message: "Face image deleted" })
  } catch (error) {
    console.error("Error deleting face image:", error)
    res.status(500).json({ error: "Internal server error" })
  }
}
