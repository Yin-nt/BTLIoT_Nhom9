const bcrypt = require("bcryptjs")
const jwt = require("jsonwebtoken")
const { pool } = require("../config/database")

const login = async (req, res) => {
  try {
    const { username, email, password } = req.body
    const loginIdentifier = username || email

    if (!loginIdentifier || !password) {
      return res.status(400).json({ message: "Vui lòng nhập đầy đủ thông tin" })
    }

    // Find user by username or email
    const [users] = await pool.query("SELECT * FROM users WHERE username = ? OR email = ?", [
      loginIdentifier,
      loginIdentifier,
    ])

    if (users.length === 0) {
      return res.status(401).json({ message: "Tên đăng nhập hoặc mật khẩu không đúng" })
    }

    const user = users[0]

    // Check password
    const isValid = await bcrypt.compare(password, user.password_hash)
    if (!isValid) {
      return res.status(401).json({ message: "Tên đăng nhập hoặc mật khẩu không đúng" })
    }

    // Generate JWT
    const token = jwt.sign({ userId: user.id, email: user.email, role: user.role }, process.env.JWT_SECRET, {
      expiresIn: "24h",
    })

    res.json({
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
      },
    })
  } catch (error) {
    console.error("Login error:", error)
    res.status(500).json({ message: "Lỗi hệ thống" })
  }
}

const register = async (req, res) => {
  try {
    const { username, email, password } = req.body

    // Check if user exists
    const [existing] = await pool.query("SELECT id FROM users WHERE email = ?", [email])

    if (existing.length > 0) {
      return res.status(400).json({ error: "Email already registered" })
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10)

    // Insert user
    const [result] = await pool.query("INSERT INTO users (username, email, password_hash, role) VALUES (?, ?, ?, ?)", [
      username,
      email,
      passwordHash,
      "user",
    ])

    res.status(201).json({
      message: "User registered successfully",
      user_id: result.insertId,
    })
  } catch (error) {
    console.error("Register error:", error)
    res.status(500).json({ error: "Internal server error" })
  }
}

module.exports = {
  login,
  register,
}
