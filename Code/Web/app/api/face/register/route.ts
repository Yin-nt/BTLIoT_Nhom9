// Face registration endpoint - store user face embeddings
import { type NextRequest, NextResponse } from "next/server"
import { verifyToken, extractToken } from "@/lib/auth"
import { queryDb } from "@/lib/db"
import { detectFaceFromImage } from "@/lib/face-recognition"

export async function POST(request: NextRequest) {
  try {
    const token = extractToken(request.headers.get("authorization"))
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const decoded = verifyToken(token)
    if (!decoded) {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 })
    }

    const { imageBase64 } = await request.json()

    if (!imageBase64) {
      return NextResponse.json({ error: "No image provided" }, { status: 400 })
    }

    // Detect face and extract embedding
    const detectionResult = await detectFaceFromImage(imageBase64)

    if (!detectionResult.detected) {
      return NextResponse.json(
        { error: "No face detected in image. Please take a clear photo of your face" },
        { status: 400 },
      )
    }

    // Check spoofing in registration
    if (detectionResult.spoofingRisk > 0.5) {
      return NextResponse.json(
        { error: "Liveness check failed. Please ensure you are facing the camera directly" },
        { status: 400 },
      )
    }

    // Store face embedding
    const embeddingVector = JSON.stringify(detectionResult.embeddings[0].descriptor)

    const result = await queryDb(
      `
      INSERT INTO face_embeddings (user_id, embedding_vector, is_verified)
      VALUES (?, ?, ?)
    `,
      [decoded.userId, embeddingVector, true],
    )

    return NextResponse.json(
      {
        message: "Face registered successfully",
        embeddingId: (result as any).insertId,
        confidence: detectionResult.embeddings[0].confidence,
      },
      { status: 201 },
    )
  } catch (error) {
    console.error("Face registration error:", error)
    return NextResponse.json({ error: "Face registration failed" }, { status: 500 })
  }
}
