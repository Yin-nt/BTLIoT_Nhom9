const express = require("express")
const router = express.Router()
const authenticateToken = require("../middleware/auth")
const { pool } = require("../config/database")

// Get alerts for current user's cabinets
router.get("/", authenticateToken, async (req, res) => {
  try {
    const [alerts] = await pool.query(
      `SELECT 
        al.id,
        al.cabinet_id,
        c.name as cabinet_name,
        al.user_id,
        u.username,
        al.timestamp,
        al.success,
        al.action_type
      FROM access_logs al
      JOIN cabinets c ON al.cabinet_id = c.id
      LEFT JOIN users u ON al.user_id = u.id
      WHERE c.owner_id = ? AND al.success = 0
      ORDER BY al.timestamp DESC
      LIMIT 50`,
      [req.user.userId],
    )

    res.json({ alerts })
  } catch (error) {
    console.error("Error fetching alerts:", error)
    res.status(500).json({ error: "Failed to fetch alerts" })
  }
})

// Mark alert as read
router.put("/:id/read", authenticateToken, async (req, res) => {
  try {
    await pool.query("UPDATE access_logs SET is_read = 1 WHERE id = ?", [req.params.id])
    res.json({ message: "Alert marked as read" })
  } catch (error) {
    console.error("Error marking alert as read:", error)
    res.status(500).json({ error: "Failed to mark alert as read" })
  }
})

module.exports = router
