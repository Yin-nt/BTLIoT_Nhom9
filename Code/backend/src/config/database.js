const mysql = require("mysql2/promise");
const fs = require("fs");
const path = require("path");

const createTablesIfNotExists = async (connection, dbName) => {
  try {
    const criticalTables = [
      "users",
      "cabinets",
      "access_logs",
      "cabinet_requests",
    ];

    for (const tableName of criticalTables) {
      const [tables] = await connection.query(
        `SELECT COUNT(*) as count FROM information_schema.tables 
         WHERE table_schema = ? AND table_name = ?`,
        [dbName, tableName]
      );

      if (tables[0].count === 0) {
        console.log(`Table '${tableName}' not found. Creating...`);
      }
    }

    // Check if users table exists (main indicator)
    const [tables] = await connection.query(
      `SELECT COUNT(*) as count FROM information_schema.tables 
       WHERE table_schema = ? AND table_name = 'users'`,
      [dbName]
    );

    if (tables[0].count === 0) {
      console.log("Tables not found. Creating schema...");

      // Create tables one by one with exact SQL
      const tableSQLs = [
        // Users table
        `CREATE TABLE IF NOT EXISTS users (
          id INT PRIMARY KEY AUTO_INCREMENT,
          username VARCHAR(100) NOT NULL,
          email VARCHAR(255) UNIQUE NOT NULL,
          password_hash VARCHAR(255) NOT NULL,
          full_name VARCHAR(200) NULL COMMENT 'User full name',
          role ENUM('admin', 'user') DEFAULT 'user',
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          INDEX idx_email (email)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,

        // User face images table
        `CREATE TABLE IF NOT EXISTS user_face_images (
          id INT PRIMARY KEY AUTO_INCREMENT,
          user_id INT NOT NULL,
          image_url VARCHAR(500) NOT NULL,
          uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
          INDEX idx_user_id (user_id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,

        // Face embeddings table
        `CREATE TABLE IF NOT EXISTS face_embeddings (
          id INT PRIMARY KEY AUTO_INCREMENT,
          image_id INT NOT NULL,
          user_id INT NOT NULL COMMENT 'Reference to user for quick lookup',
          embedding JSON NOT NULL COMMENT '512-dimensional vector from ArcFace',
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (image_id) REFERENCES user_face_images(id) ON DELETE CASCADE,
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
          INDEX idx_image_id (image_id),
          INDEX idx_user_id (user_id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,

        // Cabinets table
        `CREATE TABLE IF NOT EXISTS cabinets (
          id INT PRIMARY KEY AUTO_INCREMENT,
          cabinet_id VARCHAR(50) UNIQUE NOT NULL COMMENT 'Unique identifier like CAB001',
          name VARCHAR(200) NOT NULL,
          location VARCHAR(300),
          owner_id INT NULL COMMENT 'User who owns this cabinet',
          status ENUM('online', 'offline') DEFAULT 'offline',
          lock_status ENUM('locked', 'unlocked') DEFAULT 'locked',
          last_seen TIMESTAMP NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE SET NULL,
          INDEX idx_cabinet_id (cabinet_id),
          INDEX idx_owner_id (owner_id),
          INDEX idx_status (status)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,

        // Access logs table
        `CREATE TABLE IF NOT EXISTS access_logs (
          id INT PRIMARY KEY AUTO_INCREMENT,
          cabinet_id INT NOT NULL,
          user_id INT NULL COMMENT 'NULL if face not recognized',
          access_type ENUM('face', 'remote', 'manual') NOT NULL,
          success BOOLEAN NOT NULL,
          alert_type ENUM('none', 'unauthorized', 'tamper') DEFAULT 'none',
          image_url VARCHAR(500) NULL COMMENT 'Face verification image',
          timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (cabinet_id) REFERENCES cabinets(id) ON DELETE CASCADE,
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
          INDEX idx_cabinet_id (cabinet_id),
          INDEX idx_user_id (user_id),
          INDEX idx_timestamp (timestamp),
          INDEX idx_alert_type (alert_type)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,

        // Device pairings table
        `CREATE TABLE IF NOT EXISTS device_pairings (
          id INT PRIMARY KEY AUTO_INCREMENT,
          pairing_code VARCHAR(20) UNIQUE NOT NULL COMMENT '6-digit pairing code',
          cabinet_id INT NULL COMMENT 'NULL until paired',
          device_mac VARCHAR(50) NULL COMMENT 'ESP32 MAC address',
          expires_at TIMESTAMP NOT NULL,
          paired_at TIMESTAMP NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (cabinet_id) REFERENCES cabinets(id) ON DELETE CASCADE,
          INDEX idx_pairing_code (pairing_code),
          INDEX idx_expires_at (expires_at)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,

        // Cabinet requests table
        `CREATE TABLE IF NOT EXISTS cabinet_requests (
          id INT PRIMARY KEY AUTO_INCREMENT,
          cabinet_id INT NOT NULL,
          user_id INT NOT NULL,
          status ENUM('pending', 'approved', 'rejected') DEFAULT 'pending',
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          processed_at TIMESTAMP NULL,
          FOREIGN KEY (cabinet_id) REFERENCES cabinets(id) ON DELETE CASCADE,
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
          INDEX idx_status (status),
          INDEX idx_cabinet_user (cabinet_id, user_id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
      ];

      // Execute each table creation
      for (let i = 0; i < tableSQLs.length; i++) {
        try {
          await connection.query(tableSQLs[i]);
          console.log(
            `✅ Table ${i + 1}/${tableSQLs.length} created successfully`
          );
        } catch (err) {
          console.error(`❌ Error creating table ${i + 1}:`, err.message);
        }
      }

      console.log("✅ All tables created successfully");

      // Insert seed data if available
      const seedPath = path.join(__dirname, "../../scripts/02-seed-data.sql");
      if (fs.existsSync(seedPath)) {
        console.log("Inserting seed data...");
        const seed = fs.readFileSync(seedPath, "utf8");
        const statements = seed
          .replace(/USE.*?;/gi, "")
          .split(";")
          .filter((s) => s.trim());

        for (const statement of statements) {
          if (statement.trim()) {
            try {
              await connection.query(statement);
            } catch (err) {
              console.log("Seed data skipped:", err.message);
            }
          }
        }
        console.log("✅ Seed data inserted successfully");
      }
    } else {
      console.log("✅ Tables already exist");

      const [reqTable] = await connection.query(
        `SELECT COUNT(*) as count FROM information_schema.tables 
         WHERE table_schema = ? AND table_name = 'cabinet_requests'`,
        [dbName]
      );

      if (reqTable[0].count === 0) {
        console.log("Creating missing cabinet_requests table...");
        await connection.query(`
          CREATE TABLE IF NOT EXISTS cabinet_requests (
            id INT PRIMARY KEY AUTO_INCREMENT,
            cabinet_id INT NOT NULL,
            user_id INT NOT NULL,
            status ENUM('pending', 'approved', 'rejected') DEFAULT 'pending',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            processed_at TIMESTAMP NULL,
            FOREIGN KEY (cabinet_id) REFERENCES cabinets(id) ON DELETE CASCADE,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
            INDEX idx_status (status),
            INDEX idx_cabinet_user (cabinet_id, user_id)
          ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
        `);
        console.log("✅ cabinet_requests table created");
      }
    }
  } catch (error) {
    console.error("Error creating tables:", error.message);
    throw error;
  }
};

const createDatabaseIfNotExists = async () => {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || "localhost",
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER || "root",
    password: process.env.DB_PASSWORD || "22312125",
  });

  const dbName = process.env.DB_NAME || "smart_cabinet";

  try {
    const [databases] = await connection.query(
      `SHOW DATABASES LIKE '${dbName}'`
    );

    if (databases.length === 0) {
      console.log(`Database '${dbName}' not found. Creating...`);
      await connection.query(`CREATE DATABASE ${dbName}`);
      console.log(`✅ Database '${dbName}' created successfully`);
    } else {
      console.log(`Database '${dbName}' already exists`);
    }

    await connection.query(`USE ${dbName}`);
    await createTablesIfNotExists(connection, dbName);
  } catch (error) {
    console.error("Error checking/creating database:", error.message);
    throw error;
  } finally {
    await connection.end();
  }
};

const pool = mysql.createPool({
  host: process.env.DB_HOST || "localhost",
  port: process.env.DB_PORT || 3306,
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "22312125",
  database: process.env.DB_NAME || "smart_cabinet",
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

const initializeDatabase = async () => {
  await createDatabaseIfNotExists();
  console.log("✅ Database initialized successfully");
};

module.exports = { pool, initializeDatabase };
