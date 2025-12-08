const express = require("express")
const db = require("../config/database")
const auth = require("../middleware/auth")
const accessLogController = require("../controllers/accessLogController")
// const { accessLogController, createAccessLogFromESP32 } = require("../controllers/accessLogController");


const router = express.Router()

// Get all access logs with filtering
router.get("/", auth, accessLogController.getAllLogs)

// Get access logs for specific cabinet
router.get("/cabinet/:cabinetId", auth, accessLogController.getCabinetLogs)

// Get access logs for specific user
router.get("/user/:userId", auth, accessLogController.getUserLogs)

// Get access statistics
router.get("/statistics", auth, accessLogController.getStatistics)

router.post("/esp32", accessLogController.createAccessLogFromESP32);

module.exports = router
