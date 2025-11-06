// Face recognition endpoint - processes image from ESP32-CAM
import { type NextRequest, NextResponse } from "next/server"
import { queryDb } from "@/lib/db"
import { detectFaceFromImage, verifyFaceMatch } from "@/lib/face-recognition"

export async function POST(request: NextRequest) {
  try {
    const { imageBase64, deviceId, userId } = await request.json()

    if (!imageBase64 || !deviceId) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    // Detect face in image
    const detectionResult = await detectFaceFromImage(imageBase64)

    if (!detectionResult.detected) {
      // Log failed attempt
      await queryDb("INSERT INTO access_logs (device_id, access_method, status) VALUES (?, ?, ?)", [
        deviceId,
        "face",
        "failed",
      ])

      return NextResponse.json({ success: false, message: "No face detected in image" }, { status: 200 })
    }

    // Check for spoofing
    if (detectionResult.spoofingRisk > 0.7) {
      await queryDb("INSERT INTO access_logs (device_id, access_method, status, is_spoofed) VALUES (?, ?, ?, ?)", [
        deviceId,
        "face",
        "failed",
        true,
      ])

      // Send spoofing alert
      await queryDb("INSERT INTO alerts (device_id, alert_type, message, image_path) VALUES (?, ?, ?, ?)", [
        deviceId,
        "spoofing_detected",
        "Potential spoofing attempt detected",
        imageBase64.substring(0, 100),
      ])

      return NextResponse.json({ success: false, message: "Spoofing detected", isSpoofed: true }, { status: 200 })
    }

    // Get device with authorized users
    const devices = await queryDb(
      `
      SELECT DISTINCT uda.user_id 
      FROM user_device_access uda
      WHERE uda.device_id = ?
    `,
      [deviceId],
    )

    if (!Array.isArray(devices) || devices.length === 0) {
      await queryDb("INSERT INTO access_logs (device_id, access_method, status) VALUES (?, ?, ?)", [
        deviceId,
        "face",
        "unauthorized",
      ])

      return NextResponse.json({ success: false, message: "No authorized users for this device" }, { status: 200 })
    }

    // Try to match against registered face embeddings
    for (const device of devices as any[]) {
      const embeddings = await queryDb("SELECT embedding_vector FROM face_embeddings WHERE user_id = ?", [
        device.user_id,
      ])

      if (!Array.isArray(embeddings) || embeddings.length === 0) continue

      const registered = embeddings[0] as any
      const registeredEmbedding = JSON.parse(registered.embedding_vector)

      if (registeredEmbedding.length === 0) continue

      const match = await verifyFaceMatch(detectionResult.embeddings[0].descriptor, registeredEmbedding, 0.6)

      if (match.match) {
        // Access granted
        await queryDb(
          "INSERT INTO access_logs (device_id, user_id, access_method, status, face_confidence) VALUES (?, ?, ?, ?, ?)",
          [deviceId, device.user_id, "face", "success", detectionResult.embeddings[0].confidence],
        )

        return NextResponse.json(
          {
            success: true,
            message: "Face recognized",
            userId: device.user_id,
            confidence: detectionResult.embeddings[0].confidence,
            similarity: match.similarity,
          },
          { status: 200 },
        )
      }
    }

    // No match found
    await queryDb("INSERT INTO access_logs (device_id, access_method, status) VALUES (?, ?, ?)", [
      deviceId,
      "face",
      "unauthorized",
    ])

    // Send unauthorized access alert
    await queryDb("INSERT INTO alerts (device_id, alert_type, message, image_path) VALUES (?, ?, ?, ?)", [
      deviceId,
      "unauthorized_access",
      "Unknown face detected",
      imageBase64.substring(0, 100),
    ])

    return NextResponse.json({ success: false, message: "Face not recognized" }, { status: 200 })
  } catch (error) {
    console.error("Face recognition error:", error)
    return NextResponse.json({ error: "Face recognition failed" }, { status: 500 })
  }
}
