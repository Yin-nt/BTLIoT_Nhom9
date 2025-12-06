const express = require("express")
const multer = require("multer")
const userController = require("../controllers/userController")
const auth = require("../middleware/auth")

const router = express.Router()

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB per file
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith("image/")) {
      cb(null, true)
    } else {
      cb(new Error("Only image files are allowed"))
    }
  },
})

router.post("/register", upload.array("images", 20), userController.registerUser)

// Get all users
router.get("/", auth, userController.getAllUsers)

// Get user by ID
router.get("/:id", auth, userController.getUserById)

// Update user by ID
router.put("/:id", auth, userController.updateUser)

// Delete user by ID
router.delete("/:id", auth, userController.deleteUser)

router.put("/:id/password", auth, userController.changePassword)

module.exports = router
