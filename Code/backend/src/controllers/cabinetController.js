const { pool } = require("../config/database")
const mqttService = require("../services/mqtt")

const getAllCabinets = async (req, res) => {
  try {
    const [cabinets] = await pool.query(`
      SELECT 
        id,
        cabinet_id,
        name,
        location,
        lock_status as status,
        status as online_status,
        last_seen,
        created_at
      FROM cabinets 
      ORDER BY created_at DESC
    `)
    res.json(cabinets)
  } catch (error) {
    console.error("Error fetching cabinets:", error)
    res.status(500).json({ error: "Internal server error" })
  }
}

const unlockCabinet = async (req, res) => {
  try {
    const { cabinet_id } = req.params
    const userId = req.user.userId

    // Send MQTT command
    mqttService.sendControlCommand(cabinet_id, "unlock", userId)

    await pool.query("UPDATE cabinets SET lock_status = 'unlocked' WHERE cabinet_id = ?", [cabinet_id])

    // Log access
    await pool.query(
      `INSERT INTO access_logs 
      (cabinet_id, user_id, access_type, success) 
      VALUES ((SELECT id FROM cabinets WHERE cabinet_id = ?), ?, 'remote', TRUE)`,
      [cabinet_id, userId],
    )

    res.json({ success: true, message: "Cabinet unlocked successfully" })
  } catch (error) {
    console.error("Error unlocking cabinet:", error)
    res.status(500).json({ error: "Internal server error" })
  }
}

const lockCabinet = async (req, res) => {
  try {
    const { cabinet_id } = req.params
    const userId = req.user.userId

    // Send MQTT command
    mqttService.sendControlCommand(cabinet_id, "lock", userId)

    await pool.query("UPDATE cabinets SET lock_status = 'locked' WHERE cabinet_id = ?", [cabinet_id])

    // Log access
    await pool.query(
      `INSERT INTO access_logs 
      (cabinet_id, user_id, access_type, success) 
      VALUES ((SELECT id FROM cabinets WHERE cabinet_id = ?), ?, 'remote', TRUE)`,
      [cabinet_id, userId],
    )

    res.json({ success: true, message: "Cabinet locked successfully" })
  } catch (error) {
    console.error("Error locking cabinet:", error)
    res.status(500).json({ error: "Internal server error" })
  }
}

const getCabinetStatus = async (req, res) => {
  try {
    const { cabinet_id } = req.params

    const [cabinets] = await pool.query("SELECT * FROM cabinets WHERE cabinet_id = ?", [cabinet_id])

    if (cabinets.length === 0) {
      return res.status(404).json({ error: "Cabinet not found" })
    }

    res.json(cabinets[0])
  } catch (error) {
    console.error("Error fetching cabinet status:", error)
    res.status(500).json({ error: "Internal server error" })
  }
}

const getAccessLogs = async (req, res) => {
  try {
    const { cabinet_id } = req.params
    const limit = Number.parseInt(req.query.limit) || 50

    const [logs] = await pool.query(
      `SELECT 
        al.*,
        u.username,
        c.cabinet_id,
        c.name as cabinet_name
      FROM access_logs al
      LEFT JOIN users u ON al.user_id = u.id
      JOIN cabinets c ON al.cabinet_id = c.id
      WHERE c.cabinet_id = ?
      ORDER BY al.timestamp DESC
      LIMIT ?`,
      [cabinet_id, limit],
    )

    res.json(logs)
  } catch (error) {
    console.error("Error fetching logs:", error)
    res.status(500).json({ error: "Internal server error" })
  }
}

const createCabinet = async (req, res) => {
  try {
    const { cabinet_id, name, location } = req.body

    // Check if user is admin
    if (req.user.role !== "admin") {
      return res.status(403).json({ error: "Admin access required" })
    }

    // Check if cabinet already exists
    const [existing] = await pool.query("SELECT id FROM cabinets WHERE cabinet_id = ?", [cabinet_id])

    if (existing.length > 0) {
      return res.status(400).json({ error: "Cabinet already exists" })
    }

    const [result] = await pool.query(
      "INSERT INTO cabinets (cabinet_id, name, location, status, lock_status) VALUES (?, ?, ?, 'offline', 'locked')",
      [cabinet_id, name || `Cabinet ${cabinet_id}`, location],
    )

    res.status(201).json({
      message: "Cabinet created successfully",
      id: result.insertId,
      cabinet_id,
    })
  } catch (error) {
    console.error("Error creating cabinet:", error)
    res.status(500).json({ error: "Internal server error" })
  }
}

const updateCabinet = async (req, res) => {
  try {
    const { name, location } = req.body

    // Check if user is admin
    if (req.user.role !== "admin") {
      return res.status(403).json({ error: "Admin access required" })
    }

    await pool.query("UPDATE cabinets SET name = ?, location = ? WHERE id = ?", [name, location, req.params.id])

    res.json({ message: "Cabinet updated successfully" })
  } catch (error) {
    console.error("Error updating cabinet:", error)
    res.status(500).json({ error: "Internal server error" })
  }
}

const deleteCabinet = async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.role !== "admin") {
      return res.status(403).json({ error: "Admin access required" })
    }

    // Delete access logs first (foreign key constraint)
    await pool.query("DELETE FROM access_logs WHERE cabinet_id = ?", [req.params.id])
    await pool.query("DELETE FROM cabinets WHERE id = ?", [req.params.id])

    res.json({ message: "Cabinet deleted successfully" })
  } catch (error) {
    console.error("Error deleting cabinet:", error)
    res.status(500).json({ error: "Internal server error" })
  }
}

const assignOwner = async (req, res) => {
  try {
    const { owner_id } = req.body
    const cabinetId = req.params.id

    // Check if user is admin
    if (req.user.role !== "admin") {
      return res.status(403).json({ error: "Admin access required" })
    }

    // Verify owner exists
    const [users] = await pool.query("SELECT id FROM users WHERE id = ?", [owner_id])
    if (users.length === 0) {
      return res.status(404).json({ error: "User not found" })
    }

    await pool.query("UPDATE cabinets SET owner_id = ? WHERE id = ?", [owner_id, cabinetId])

    res.json({ message: "Owner assigned successfully" })
  } catch (error) {
    console.error("Error assigning owner:", error)
    res.status(500).json({ error: "Internal server error" })
  }
}

const generatePairingCode = async (req, res) => {
  try {
    const { cabinet_id } = req.body

    // Check if user is admin
    if (req.user.role !== "admin") {
      return res.status(403).json({ error: "Admin access required" })
    }

    // Generate 6-digit code
    const code = Math.floor(100000 + Math.random() * 900000).toString()

    // Set expiration to 10 minutes
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000)

    const [result] = await pool.query(
      "INSERT INTO device_pairings (pairing_code, cabinet_id, expires_at) VALUES (?, (SELECT id FROM cabinets WHERE cabinet_id = ?), ?)",
      [code, cabinet_id, expiresAt],
    )

    res.json({
      pairing_code: code,
      expires_in: 600, // seconds
      expires_at: expiresAt,
    })
  } catch (error) {
    console.error("Error generating pairing code:", error)
    res.status(500).json({ error: "Internal server error" })
  }
}

const pairDevice = async (req, res) => {
  try {
    const { pairing_code, device_mac } = req.body

    // Validate code
    const [pairings] = await pool.query(
      "SELECT * FROM device_pairings WHERE pairing_code = ? AND paired_at IS NULL AND expires_at > NOW()",
      [pairing_code],
    )

    if (pairings.length === 0) {
      return res.status(400).json({ error: "Invalid or expired pairing code" })
    }

    const pairing = pairings[0]

    // Mark as paired
    await pool.query("UPDATE device_pairings SET device_mac = ?, paired_at = NOW() WHERE id = ?", [
      device_mac,
      pairing.id,
    ])

    // Update cabinet status
    await pool.query("UPDATE cabinets SET status = 'online' WHERE id = ?", [pairing.cabinet_id])

    // Get cabinet info
    const [cabinets] = await pool.query("SELECT * FROM cabinets WHERE id = ?", [pairing.cabinet_id])

    res.json({
      success: true,
      cabinet: cabinets[0],
      message: "Device paired successfully",
    })
  } catch (error) {
    console.error("Error pairing device:", error)
    res.status(500).json({ error: "Internal server error" })
  }
}

const getAlerts = async (req, res) => {
  try {
    const userId = req.user.userId
    const limit = Number.parseInt(req.query.limit) || 20

    let query = `
      SELECT 
        al.*,
        c.cabinet_id,
        c.name as cabinet_name,
        c.owner_id,
        u.username as attempted_by
      FROM access_logs al
      JOIN cabinets c ON al.cabinet_id = c.id
      LEFT JOIN users u ON al.user_id = u.id
      WHERE al.alert_type != 'none'
    `

    const params = []

    // If not admin, only show alerts for owned cabinets
    if (req.user.role !== "admin") {
      query += " AND c.owner_id = ?"
      params.push(userId)
    }

    query += " ORDER BY al.timestamp DESC LIMIT ?"
    params.push(limit)

    const [alerts] = await pool.query(query, params)

    res.json(alerts)
  } catch (error) {
    console.error("Error fetching alerts:", error)
    res.status(500).json({ error: "Internal server error" })
  }
}

module.exports = {
  getAllCabinets,
  unlockCabinet,
  lockCabinet,
  getCabinetStatus,
  getAccessLogs,
  createCabinet,
  updateCabinet,
  deleteCabinet,
  assignOwner,
  generatePairingCode,
  pairDevice,
  getAlerts,
}
