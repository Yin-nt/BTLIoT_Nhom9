const express = require("express")
const multer = require("multer")
const faceController = require("../controllers/faceController")
const auth = require("../middleware/auth")

const router = express.Router()

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
})

// Register face images (5-20 images)
router.post("/register", auth, upload.array("images", 20), faceController.registerFaces)

// Verify face from uploaded image
router.post("/verify", upload.single("images"), faceController.verifyFace)

// Verify face from ESP32 (base64 image)
router.post("/verify-esp32", faceController.verifyFromESP32)

// Get user face images
router.get("/user/:userId", auth, faceController.getUserFaceImages)

// Delete face image
router.delete("/image/:imageId", auth, faceController.deleteFaceImage)

module.exports = router
