import mysql from "mysql2/promise"

function parseConnectionString() {
  const dbUrl = process.env.DATABASE_URL

  if (!dbUrl) {
    console.error("[smart-locker] DATABASE_URL not found in environment variables")
    return {
      host: "localhost",
      user: "root",
      password: "22312125",
      database: "smart_locker",
    }
  }

  // Parse: mysql://user:password@host:port/database
  try {
    const url = new URL(dbUrl)
    return {
      host: url.hostname || "localhost",
      user: decodeURIComponent(url.username || "root"),
      password: decodeURIComponent(url.password || ""),
      database: url.pathname?.slice(1) || "smart_locker",
      port: url.port ? Number.parseInt(url.port) : 3306,
    }
  } catch (error) {
    console.error("[smart-locker] Failed to parse DATABASE_URL:", error)
    return {
      host: "localhost",
      user: "root",
      password:   "22312125",
      database: "smart_locker",
    }
  }
}

const connectionConfig = parseConnectionString()
console.log("[smart-locker] Database config:", {
  host: connectionConfig.host,
  user: connectionConfig.user,
  database: connectionConfig.database,
})

const pool = mysql.createPool({
  host: connectionConfig.host,
  user: connectionConfig.user,
  password: connectionConfig.password,
  database: connectionConfig.database,
  port: connectionConfig.port,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
})

export async function queryDb(sql: string, values?: any[]) {
  try {
    const connection = await pool.getConnection()
    try {
      const [results] = await connection.execute(sql, values || [])
      return results
    } finally {
      connection.release()
    }
  } catch (error) {
    console.error("[smart-locker] Database query error:", error)
    throw error
  }
}

export async function executeDb(sql: string, values?: any[]) {
  try {
    const connection = await pool.getConnection()
    try {
      const [results] = await connection.execute(sql, values || [])
      return results
    } finally {
      connection.release()
    }
  } catch (error) {
    console.error("[smart-locker] Database execute error:", error)
    throw error
  }
}

export default pool
