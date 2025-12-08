const { pool } = require("../config/database")
const bcrypt = require("bcryptjs")
const path = require("path")
const fs = require("fs")
const faceService = require("../services/face") // Import face service for AI integration

const registerUser = async (req, res) => {
  try {
    const { username, email, password, fullName } = req.body
    const images = req.files // multer uploads

    // Validate required fields
    if (!username || !email || !password) {
      return res.status(400).json({ error: "Username, email, and password are required" })
    }

    // Validate images (5-20 images required)
    if (!images || images.length < 5 || images.length > 20) {
      return res.status(400).json({ error: "Please upload 5-20 face images" })
    }

    // Check if username or email already exists
    const [existing] = await pool.query("SELECT id FROM users WHERE username = ? OR email = ?", [username, email])

    if (existing.length > 0) {
      return res.status(400).json({ error: "Username or email already exists" })
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10)

    const [result] = await pool.query(
      `INSERT INTO users (username, email, password_hash, full_name, role) 
       VALUES (?, ?, ?, ?, 'user')`,
      [username, email, passwordHash, fullName || null],
    )

    const userId = result.insertId

    // Create upload directory
    const uploadDir = path.join(__dirname, "../../uploads/faces", userId.toString())
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true })
    }

    const embeddings = []
    for (let i = 0; i < images.length; i++) {
      const image = images[i]
      const filename = `face_${Date.now()}_${i}.jpg`
      const imagePath = `/uploads/faces/${userId}/${filename}`
      const filepath = path.join(uploadDir, filename)

      // Move file to permanent location
      fs.writeFileSync(filepath, image.buffer)

      // Insert image record
      const [imageResult] = await pool.query(
        `INSERT INTO user_face_images (user_id, image_url) 
         VALUES (?, ?)`,
        [userId, imagePath],
      )

      const imageId = imageResult.insertId

      // Extract embedding from AI service
      try {
        const embedding = await faceService.extractEmbedding(image.buffer)

        // Save embedding to database
        await pool.query(
          `INSERT INTO face_embeddings (image_id, user_id, embedding) 
           VALUES (?, ?, ?)`,
          [imageId, userId, JSON.stringify(embedding)],
        )

        embeddings.push({ imageId, success: true })
      } catch (error) {
        console.error(`Error extracting embedding for image ${i}:`, error.message)
        embeddings.push({ imageId, success: false, error: error.message })
      }
    }

    res.status(201).json({
      message: "Registration successful",
      userId: userId,
      embeddings: embeddings.filter((e) => e.success).length,
      total_images: images.length,
    })
  } catch (error) {
    console.error("Error registering user:", error)
    res.status(500).json({ error: "Internal server error" })
  }
}

const getAllUsers = async (req, res) => {
  try {
    const [users] = await pool.query(`
      SELECT 
        u.id, 
        u.username, 
        u.email, 
        u.full_name,
        u.role, 
        u.created_at,
        COUNT(DISTINCT ufi.id) as image_count
      FROM users u
      LEFT JOIN user_face_images ufi ON u.id = ufi.user_id
      GROUP BY u.id
      ORDER BY u.created_at DESC
    `)

    res.json(users)
  } catch (error) {
    console.error("Error fetching users:", error)
    res.status(500).json({ error: "Internal server error" })
  }
}

const getUserById = async (req, res) => {
  try {
    const [users] = await pool.query(
      `
      SELECT 
        u.id, 
        u.username, 
        u.email,
        u.full_name, 
        u.role, 
        u.created_at,
        COUNT(DISTINCT ufi.id) as image_count
      FROM users u
      LEFT JOIN user_face_images ufi ON u.id = ufi.user_id
      WHERE u.id = ?
      GROUP BY u.id
    `,
      [req.params.id],
    )

    if (users.length === 0) {
      return res.status(404).json({ error: "User not found" })
    }

    res.json(users[0])
  } catch (error) {
    console.error("Error fetching user:", error)
    res.status(500).json({ error: "Internal server error" })
  }
}

const updateUser = async (req, res) => {
  try {
    const { username, email, fullName, role } = req.body

    // Check if user is admin
    if (req.user.role !== "admin") {
      return res.status(403).json({ error: "Admin access required" })
    }

    await pool.query(
      `UPDATE users 
       SET username = ?, email = ?, full_name = ?, role = ?
       WHERE id = ?`,
      [username, email, fullName || null, role, req.params.id],
    )

    res.json({ message: "User updated successfully" })
  } catch (error) {
    console.error("Error updating user:", error)
    res.status(500).json({ error: "Internal server error" })
  }
}

const deleteUser = async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.role !== "admin") {
      return res.status(403).json({ error: "Admin access required" })
    }

    // Delete user's face images and embeddings first
    await pool.query("DELETE FROM face_embeddings WHERE user_id = ?", [req.params.id])
    await pool.query("DELETE FROM user_face_images WHERE user_id = ?", [req.params.id])
    await pool.query("DELETE FROM users WHERE id = ?", [req.params.id])

    res.json({ message: "User deleted successfully" })
  } catch (error) {
    console.error("Error deleting user:", error)
    res.status(500).json({ error: "Internal server error" })
  }
}

const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body
    const userId = req.params.id

    // Check if user can change this password (self or admin)
    if (req.user.id !== Number.parseInt(userId) && req.user.role !== "admin") {
      return res.status(403).json({ error: "Unauthorized" })
    }

    // Validate new password
    if (!newPassword || newPassword.length < 6) {
      return res.status(400).json({ error: "New password must be at least 6 characters" })
    }

    // Get current password hash
    const [users] = await pool.query("SELECT password_hash FROM users WHERE id = ?", [userId])

    if (users.length === 0) {
      return res.status(404).json({ error: "User not found" })
    }

    // Verify current password
    const isValidPassword = await bcrypt.compare(currentPassword, users[0].password_hash)

    if (!isValidPassword) {
      return res.status(400).json({ error: "Current password is incorrect" })
    }

    // Hash new password
    const newPasswordHash = await bcrypt.hash(newPassword, 10)

    // Update password
    await pool.query("UPDATE users SET password_hash = ? WHERE id = ?", [newPasswordHash, userId])

    res.json({ message: "Password changed successfully" })
  } catch (error) {
    console.error("Error changing password:", error)
    res.status(500).json({ error: "Internal server error" })
  }
}

module.exports = {
  registerUser,
  getAllUsers,
  getUserById,
  updateUser,
  deleteUser,
  changePassword,
}
