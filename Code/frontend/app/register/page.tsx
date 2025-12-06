"use client"

import type React from "react"
import { useState, useRef, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Camera, X, UserPlus } from "lucide-react"
import Link from "next/link"

export default function RegisterPage() {
  const router = useRouter()
  const videoRef = useRef<HTMLVideoElement>(null)
  const [stream, setStream] = useState<MediaStream | null>(null)
  const [isCameraOn, setIsCameraOn] = useState(false)
  const [capturedImages, setCapturedImages] = useState<string[]>([])
  const [formData, setFormData] = useState({
    username: "",
    fullName: "",
    email: "",
    password: "",
  })
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream
      videoRef.current.play().catch((err) => {
        console.log("[v0] Video play error:", err)
        setError("Không thể phát video từ camera")
      })
    }
  }, [stream])

  const startCamera = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: 640, height: 480 },
      })
      setStream(mediaStream)
      setIsCameraOn(true)
      setError("")
    } catch (err) {
      console.log("[v0] Camera error:", err)
      setError("Không thể truy cập camera. Vui lòng kiểm tra quyền truy cập.")
    }
  }

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop())
      setStream(null)
      setIsCameraOn(false)
    }
  }

  const capturePhoto = () => {
    if (videoRef.current && capturedImages.length < 20) {
      const canvas = document.createElement("canvas")
      canvas.width = videoRef.current.videoWidth
      canvas.height = videoRef.current.videoHeight
      const ctx = canvas.getContext("2d")
      if (ctx) {
        ctx.drawImage(videoRef.current, 0, 0)
        const imageData = canvas.toDataURL("image/jpeg")
        setCapturedImages([...capturedImages, imageData])
      }
    }
  }

  const removeImage = (index: number) => {
    setCapturedImages(capturedImages.filter((_, i) => i !== index))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (capturedImages.length < 5) {
      setError("Vui lòng chụp ít nhất 5 ảnh khuôn mặt")
      return
    }

    setLoading(true)
    setError("")

    try {
      const formDataToSend = new FormData()
      formDataToSend.append("username", formData.username)
      formDataToSend.append("fullName", formData.fullName)
      formDataToSend.append("email", formData.email)
      formDataToSend.append("password", formData.password)

      for (let i = 0; i < capturedImages.length; i++) {
        const response = await fetch(capturedImages[i])
        const blob = await response.blob()
        formDataToSend.append("images", blob, `face_${i}.jpg`)
      }

      const res = await fetch("http://localhost:3001/api/users/register", {
        method: "POST",
        body: formDataToSend,
      })

      const data = await res.json()

      if (res.ok) {
        alert("Đăng ký thành công! Vui lòng đợi admin phê duyệt.")
        router.push("/login")
      } else {
        setError(data.error || "Đăng ký thất bại")
      }
    } catch (err) {
      setError("Lỗi kết nối đến server")
    } finally {
      setLoading(false)
      stopCamera()
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-linear-to-br from-orange-50 to-red-50 p-4">
      <Card className="w-full max-w-4xl shadow-xl">
        <CardHeader className="text-center border-b border-orange-200 bg-linear-to-r from-orange-500 to-red-600 text-white">
          <div className="flex justify-center mb-4">
            <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center shadow-lg">
              <UserPlus className="w-8 h-8 text-orange-600" />
            </div>
          </div>
          <CardTitle className="text-3xl font-bold">Đăng Ký Tài Khoản</CardTitle>
          <CardDescription className="text-orange-100">Tủ Thông Minh - PTIT Face Recognition System</CardDescription>
        </CardHeader>

        <CardContent className="p-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="username">Tên đăng nhập *</Label>
                <Input
                  id="username"
                  required
                  value={formData.username}
                  onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                  placeholder="nguyen_van_a"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="fullName">Họ và tên *</Label>
                <Input
                  id="fullName"
                  required
                  value={formData.fullName}
                  onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                  placeholder="Nguyễn Văn A"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email *</Label>
                <Input
                  id="email"
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="email@ptit.edu.vn"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Mật khẩu *</Label>
                <Input
                  id="password"
                  type="password"
                  required
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  placeholder="••••••••"
                />
              </div>
            </div>

            <div className="space-y-4 border-t border-orange-200 pt-6">
              <div className="flex items-center justify-between">
                <Label className="text-lg font-semibold">Chụp ảnh khuôn mặt (5-20 ảnh) *</Label>
                <span className="text-sm text-muted-foreground">{capturedImages.length}/20 ảnh</span>
              </div>

              {!isCameraOn ? (
                <Button
                  type="button"
                  onClick={startCamera}
                  className="w-full bg-linear-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700"
                >
                  <Camera className="w-4 h-4 mr-2" />
                  Bật Camera
                </Button>
              ) : (
                <div className="space-y-4">
                  <div className="relative rounded-lg overflow-hidden bg-black aspect-video">
                    <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
                  </div>

                  <div className="flex gap-2">
                    <Button
                      type="button"
                      onClick={capturePhoto}
                      disabled={capturedImages.length >= 20}
                      className="flex-1 bg-green-600 hover:bg-green-700"
                    >
                      <Camera className="w-4 h-4 mr-2" />
                      Chụp Ảnh
                    </Button>
                    <Button type="button" onClick={stopCamera} variant="outline" className="flex-1 bg-transparent">
                      Tắt Camera
                    </Button>
                  </div>
                </div>
              )}

              {capturedImages.length > 0 && (
                <div className="grid grid-cols-4 md:grid-cols-6 gap-2">
                  {capturedImages.map((img, index) => (
                    <div key={index} className="relative group">
                      <img
                        src={img || "/placeholder.svg"}
                        alt={`Captured ${index + 1}`}
                        className="w-full h-20 object-cover rounded border-2 border-orange-200"
                      />
                      <button
                        type="button"
                        onClick={() => removeImage(index)}
                        className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {capturedImages.length > 0 && capturedImages.length < 5 && (
                <p className="text-sm text-orange-600">Cần chụp thêm {5 - capturedImages.length} ảnh nữa</p>
              )}
            </div>

            <div className="flex gap-4">
              <Button
                type="submit"
                disabled={loading || capturedImages.length < 5}
                className="flex-1 bg-linear-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700"
              >
                {loading ? "Đang đăng ký..." : "Đăng Ký"}
              </Button>
              <Link href="/login" className="flex-1">
                <Button type="button" variant="outline" className="w-full bg-transparent">
                  Quay lại
                </Button>
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
