const express = require("express")
const bcrypt = require("bcryptjs")
const jwt = require("jsonwebtoken")
const db = require("../config/database")
const authController = require("../controllers/authController")

const router = express.Router()

// Login
router.post("/login", authController.login)

// Register
router.post("/register", authController.register)

module.exports = router
