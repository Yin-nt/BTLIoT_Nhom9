// AI Service for face recognition using YOLOFace and ArcFace
import axios from "axios"

export interface FaceDetectionResult {
  bbox: [number, number, number, number] // [x, y, width, height]
  confidence: number
}

export interface FaceRecognitionResult {
  userId: number | null
  userName: string | null
  confidence: number
  embedding: number[]
  isMatch: boolean
}

class AIService {
  private yoloServiceUrl: string
  private arcfaceServiceUrl: string

  constructor() {
    // AI service URLs - can be Python Flask/FastAPI servers
    this.yoloServiceUrl = process.env.YOLO_SERVICE_URL || "http://localhost:5000"
    this.arcfaceServiceUrl = process.env.ARCFACE_SERVICE_URL || "http://localhost:5001"
  }

  /**
   * Detect faces in image using YOLOFace
   */
  async detectFaces(imageData: Buffer | string): Promise<FaceDetectionResult[]> {
    try {
      const formData = new FormData()

      if (Buffer.isBuffer(imageData)) {
        const blob = new Blob([imageData], { type: "image/jpeg" })
        formData.append("image", blob, "face.jpg")
      } else {
        // Base64 string
        formData.append("image", imageData)
      }

      const response = await axios.post(`${this.yoloServiceUrl}/detect`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
        timeout: 10000,
      })

      return response.data.faces || []
    } catch (error) {
      console.error("Face detection error:", error)
      throw new Error("Failed to detect faces")
    }
  }

  /**
   * Extract face embedding using ArcFace
   */
  async extractEmbedding(imageData: Buffer | string): Promise<number[]> {
    try {
      const formData = new FormData()

      if (Buffer.isBuffer(imageData)) {
        const blob = new Blob([imageData], { type: "image/jpeg" })
        formData.append("image", blob, "face.jpg")
      } else {
        formData.append("image", imageData)
      }

      const response = await axios.post(`${this.arcfaceServiceUrl}/extract`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
        timeout: 10000,
      })

      return response.data.embedding || []
    } catch (error) {
      console.error("Embedding extraction error:", error)
      throw new Error("Failed to extract face embedding")
    }
  }

  /**
   * Compare face embedding with database embeddings
   */
  async recognizeFace(
    embedding: number[],
    dbEmbeddings: Array<{ userId: number; userName: string; embedding: number[] }>,
    threshold = 0.75,
  ): Promise<FaceRecognitionResult> {
    let bestMatch: FaceRecognitionResult = {
      userId: null,
      userName: null,
      confidence: 0,
      embedding,
      isMatch: false,
    }

    for (const dbEntry of dbEmbeddings) {
      const similarity = this.cosineSimilarity(embedding, dbEntry.embedding)
      const confidence = similarity * 100 // Convert to percentage

      if (confidence > bestMatch.confidence) {
        bestMatch = {
          userId: dbEntry.userId,
          userName: dbEntry.userName,
          confidence,
          embedding,
          isMatch: confidence >= threshold,
        }
      }
    }

    return bestMatch
  }

  /**
   * Calculate cosine similarity between two embeddings
   */
  private cosineSimilarity(vecA: number[], vecB: number[]): number {
    if (vecA.length !== vecB.length) {
      throw new Error("Vectors must have the same length")
    }

    let dotProduct = 0
    let normA = 0
    let normB = 0

    for (let i = 0; i < vecA.length; i++) {
      dotProduct += vecA[i] * vecB[i]
      normA += vecA[i] * vecA[i]
      normB += vecB[i] * vecB[i]
    }

    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB))
  }

  /**
   * Process face recognition pipeline
   */
  async processFaceRecognition(
    imageData: Buffer | string,
    dbEmbeddings: Array<{ userId: number; userName: string; embedding: number[] }>,
    threshold?: number,
  ): Promise<FaceRecognitionResult> {
    // Step 1: Detect face
    const faces = await this.detectFaces(imageData)

    if (faces.length === 0) {
      throw new Error("No face detected in image")
    }

    if (faces.length > 1) {
      console.warn("Multiple faces detected, using the first one")
    }

    // Step 2: Extract embedding
    const embedding = await this.extractEmbedding(imageData)

    // Step 3: Recognize face
    const result = await this.recognizeFace(embedding, dbEmbeddings, threshold)

    return result
  }
}

export const aiService = new AIService()
export default aiService
