const { initializeDatabase } = require("../config/database")

async function setup() {
  try {
    console.log("Setting up database...")
    await initializeDatabase()
    console.log("Database setup completed successfully!")
    process.exit(0)
  } catch (error) {
    console.error("Database setup failed:", error.message)
    process.exit(1)
  }
}

setup()
