// Face upload endpoint for face recognition registration
import { type NextRequest, NextResponse } from "next/server"
import { verifyToken, extractToken } from "@/lib/auth"
import { queryDb } from "@/lib/db"

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const token = extractToken(request.headers.get("authorization"))
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const decoded = verifyToken(token)
    if (!decoded) {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 })
    }

    // Users can only upload their own face data
    if (decoded.userId !== Number.parseInt(params.id) && decoded.role !== "admin") {
      return NextResponse.json({ error: "Access denied" }, { status: 403 })
    }

    const formData = await request.formData()
    const file = formData.get("file") as File

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 })
    }

    // TODO: Process face image with face detection model
    // 1. Extract face from image
    // 2. Generate embedding using FaceNet
    // 3. Store embedding in database

    const embedding = JSON.stringify([]) // Placeholder

    await queryDb("INSERT INTO face_embeddings (user_id, embedding_vector, image_path) VALUES (?, ?, ?)", [
      params.id,
      embedding,
      `/uploads/faces/${file.name}`,
    ])

    return NextResponse.json({ message: "Face data uploaded successfully" }, { status: 201 })
  } catch (error) {
    console.error("Error uploading face:", error)
    return NextResponse.json({ error: "Face upload failed" }, { status: 500 })
  }
}
