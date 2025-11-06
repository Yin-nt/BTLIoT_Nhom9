// Face registration dialog component
"use client"

import { useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Loader2, Camera, CheckCircle2 } from "lucide-react"

export default function FaceRegistrationDialog({ token, onSuccess }: { token: string | null; onSuccess: () => void }) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [isOpen, setIsOpen] = useState(false)
  const [step, setStep] = useState<"camera" | "preview" | "success">("camera")
  const [isLoading, setIsLoading] = useState(false)
  const [capturedImage, setCapturedImage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user" },
      })
      if (videoRef.current) {
        videoRef.current.srcObject = stream
      }
    } catch (err) {
      setError("Failed to access camera. Please check permissions.")
    }
  }

  const captureImage = () => {
    const video = videoRef.current
    const canvas = canvasRef.current

    if (video && canvas) {
      const context = canvas.getContext("2d")
      if (context) {
        context.drawImage(video, 0, 0, canvas.width, canvas.height)
        const imageData = canvas.toDataURL("image/jpeg")
        setCapturedImage(imageData)
        setStep("preview")

        // Stop video stream
        const stream = video.srcObject as MediaStream
        if (stream) {
          stream.getTracks().forEach((track) => track.stop())
        }
      }
    }
  }

  const uploadFace = async () => {
    if (!token || !capturedImage) return

    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch("/api/face/register", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ imageBase64: capturedImage }),
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || "Failed to register face")
        return
      }

      setStep("success")
      setTimeout(() => {
        setIsOpen(false)
        onSuccess()
      }, 2000)
    } catch (err) {
      setError("Network error. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  const resetDialog = () => {
    setStep("camera")
    setCapturedImage(null)
    setError(null)
  }

  const handleOpenChange = (open: boolean) => {
    setIsOpen(open)
    if (open) {
      resetDialog()
      startCamera()
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button className="bg-blue-600 hover:bg-blue-700 text-white">
          <Camera className="w-4 h-4 mr-2" />
          Register Face
        </Button>
      </DialogTrigger>
      <DialogContent className="bg-slate-800 border-slate-700 max-w-md">
        <DialogHeader>
          <DialogTitle className="text-white">Register Your Face</DialogTitle>
          <DialogDescription>We'll use face recognition to allow quick access to your locker</DialogDescription>
        </DialogHeader>

        {step === "camera" && (
          <div className="space-y-4">
            <div className="relative bg-black rounded-lg overflow-hidden aspect-video">
              <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover" />
            </div>
            <div className="text-sm text-slate-300 text-center">
              <p>Position your face in the center of the camera frame</p>
            </div>
            {error && <div className="text-sm text-red-400 bg-red-500/10 p-2 rounded">{error}</div>}
            <div className="flex gap-2">
              <Button onClick={() => handleOpenChange(false)} variant="outline" className="flex-1">
                Cancel
              </Button>
              <Button onClick={captureImage} className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white">
                <Camera className="w-4 h-4 mr-2" />
                Capture
              </Button>
            </div>
          </div>
        )}

        {step === "preview" && (
          <div className="space-y-4">
            <div className="bg-black rounded-lg overflow-hidden aspect-video">
              {capturedImage && (
                <img src={capturedImage || "/placeholder.svg"} alt="Captured" className="w-full h-full object-cover" />
              )}
            </div>
            <p className="text-sm text-slate-300">Does this look good?</p>
            {error && <div className="text-sm text-red-400 bg-red-500/10 p-2 rounded">{error}</div>}
            <div className="flex gap-2">
              <Button
                onClick={() => {
                  setStep("camera")
                  startCamera()
                }}
                variant="outline"
                className="flex-1"
              >
                Retake
              </Button>
              <Button
                onClick={uploadFace}
                disabled={isLoading}
                className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Uploading...
                  </>
                ) : (
                  "Confirm & Register"
                )}
              </Button>
            </div>
          </div>
        )}

        {step === "success" && (
          <div className="space-y-4 text-center py-8">
            <CheckCircle2 className="w-12 h-12 text-green-500 mx-auto" />
            <div>
              <p className="text-white font-medium">Face registered successfully!</p>
              <p className="text-slate-400 text-sm mt-1">You can now use face recognition to unlock your locker</p>
            </div>
          </div>
        )}

        <canvas ref={canvasRef} width={640} height={480} className="hidden" />
      </DialogContent>
    </Dialog>
  )
}
