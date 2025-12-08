const { pool } = require("../config/database")

// Get all access logs with pagination
exports.getAllLogs = async (req, res) => {
  try {
    const limit = Number.parseInt(req.query.limit) || 50
    const offset = Number.parseInt(req.query.offset) || 0
    const cabinetId = req.query.cabinetId
    const userId = req.query.userId
    const success = req.query.success

    let query = `
      SELECT 
        al.id,
        al.timestamp,
        al.access_type,
        al.success,
        al.alert_type,
        c.name as cabinet_name,
        c.cabinet_id,
        u.username,
        u.email
      FROM access_logs al
      JOIN cabinets c ON al.cabinet_id = c.id
      LEFT JOIN users u ON al.user_id = u.id
      WHERE 1=1
    `

    const params = []

    if (cabinetId) {
      query += " AND c.cabinet_id = ?"
      params.push(cabinetId)
    }

    if (userId) {
      query += " AND al.user_id = ?"
      params.push(userId)
    }

    if (success !== undefined) {
      query += " AND al.success = ?"
      params.push(success === "true" ? 1 : 0)
    }

    query += " ORDER BY al.timestamp DESC LIMIT ? OFFSET ?"
    params.push(limit, offset)

    const [logs] = await pool.query(query, params)

    // Get total count
    let countQuery = "SELECT COUNT(*) as total FROM access_logs al JOIN cabinets c ON al.cabinet_id = c.id WHERE 1=1"
    const countParams = []

    if (cabinetId) {
      countQuery += " AND c.cabinet_id = ?"
      countParams.push(cabinetId)
    }
    if (userId) {
      countQuery += " AND al.user_id = ?"
      countParams.push(userId)
    }
    if (success !== undefined) {
      countQuery += " AND al.success = ?"
      countParams.push(success === "true" ? 1 : 0)
    }

    const [countResult] = await pool.query(countQuery, countParams)

    res.json({
      logs,
      total: countResult[0].total,
      limit,
      offset,
    })
  } catch (error) {
    console.error("Error fetching access logs:", error)
    res.status(500).json({ error: "Internal server error" })
  }
}

exports.getCabinetLogs = async (req, res) => {
  try {
    const { cabinetId } = req.params
    const limit = Number.parseInt(req.query.limit) || 100

    const [logs] = await pool.query(
      `SELECT 
        al.id,
        al.timestamp,
        al.access_type,
        al.success,
        al.alert_type,
        u.username,
        u.email
      FROM access_logs al
      JOIN cabinets c ON al.cabinet_id = c.id
      LEFT JOIN users u ON al.user_id = u.id
      WHERE c.cabinet_id = ?
      ORDER BY al.timestamp DESC
      LIMIT ?`,
      [cabinetId, limit],
    )

    res.json(logs)
  } catch (error) {
    console.error("Error fetching cabinet logs:", error)
    res.status(500).json({ error: "Internal server error" })
  }
}

exports.getUserLogs = async (req, res) => {
  try {
    const { userId } = req.params
    const limit = Number.parseInt(req.query.limit) || 100

    const [logs] = await pool.query(
      `SELECT 
        al.id,
        al.timestamp,
        al.access_type,
        al.success,
        al.alert_type,
        c.name as cabinet_name,
        c.cabinet_id
      FROM access_logs al
      JOIN cabinets c ON al.cabinet_id = c.id
      WHERE al.user_id = ?
      ORDER BY al.timestamp DESC
      LIMIT ?`,
      [userId, limit],
    )

    res.json(logs)
  } catch (error) {
    console.error("Error fetching user logs:", error)
    res.status(500).json({ error: "Internal server error" })
  }
}

exports.getStatistics = async (req, res) => {
  try {
    const { cabinetId, userId, startDate, endDate } = req.query

    let query = `
      SELECT 
        COUNT(*) as total_attempts,
        SUM(CASE WHEN status = 'success' THEN 1 ELSE 0 END) as successful,
        SUM(CASE WHEN status = 'denied' THEN 1 ELSE 0 END) as failed,
        AVG(confidence_score) as avg_confidence
      FROM access_logs al
      JOIN cabinets c ON al.cabinet_id = c.id
      WHERE 1=1
    `

    const params = []

    if (cabinetId) {
      query += " AND c.cabinet_id = ?"
      params.push(cabinetId)
    }

    if (userId) {
      query += " AND al.user_id = ?"
      params.push(userId)
    }

    if (startDate) {
      query += " AND al.timestamp >= ?"
      params.push(startDate)
    }

    if (endDate) {
      query += " AND al.timestamp <= ?"
      params.push(endDate)
    }

    const [stats] = await pool.query(query, params)

    res.json(stats[0])
  } catch (error) {
    console.error("Error fetching statistics:", error)
    res.status(500).json({ error: "Internal server error" })
  }
}

exports.createAccessLogFromESP32 = async (req, res) => {
  try {
    const { device_id, event_type, timestamp, data } = req.body;

    // Validate required fields
    if (!device_id || !event_type || !timestamp) {
      return res.status(400).json({
        error: "Missing required fields: device_id, event_type, timestamp",
      });
    }

    // Find cabinet by device_id
    const [cabinets] = await pool.query(
      "SELECT id, owner_id FROM cabinets WHERE cabinet_id = ?", 
      [device_id]
    );

    if (cabinets.length === 0) {
      return res.status(404).json({ error: `Cabinet not found: ${device_id}` });
    }

    const cabinet = cabinets[0];

    // Default values
    let success = false;
    let alert_type = "none";
    let user_id = null;
    const access_type = "face"; // default as required

    switch (event_type) {
      case "verify_success":
        success = true;
        alert_type = "none";

        if (data?.acc) {
          const [users] = await pool.query(
            "SELECT id FROM users WHERE username = ?", 
            [data.acc]
          );
          if (users.length > 0) user_id = users[0].id;
        }
        break;

      case "verify_failed":
      case "unauthorized":
        success = false;
        alert_type = "unauthorized";
        break;

      case "tamper":
        success = false;
        alert_type = "tamper";
        break;

      default:
        alert_type = "none";
    }

    const [result] = await pool.query(
      `INSERT INTO access_logs 
        (cabinet_id, user_id, access_type, success, alert_type, timestamp) 
       VALUES (?, ?, ?, ?, ?, FROM_UNIXTIME(?))`,
      [
        cabinet.id,
        user_id,
        access_type,
        success ? 1 : 0,
        alert_type,
        timestamp / 1000
      ]
    );

    console.log(`[ESP32 Event] ${event_type} from ${device_id} -> Success: ${success}, Alert: ${alert_type}`);

    res.status(201).json({
      message: "Access log recorded",
      log_id: result.insertId,
      success,
      alert_type
    });

  } catch (error) {
    console.error("Error saving access log:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

