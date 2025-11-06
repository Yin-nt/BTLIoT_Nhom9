// Banner to encourage users to register their face
"use client"

import { useState, useEffect } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { X, Camera } from "lucide-react"
import FaceRegistrationDialog from "./face-registration-dialog"

export default function FaceRegistrationBanner({ token }: { token: string | null }) {
  const [isDismissed, setIsDismissed] = useState(false)
  const [hasFaceData, setHasFaceData] = useState(false)

  useEffect(() => {
    // Check if user has registered face data
    const checkFaceRegistration = async () => {
      if (!token) return
      try {
        const response = await fetch("/api/face/status", {
          headers: { Authorization: `Bearer ${token}` },
        })
        const data = await response.json()
        setHasFaceData(data.registered)
      } catch (error) {
        console.error("Error checking face registration:", error)
      }
    }

    checkFaceRegistration()
  }, [token])

  if (isDismissed || hasFaceData) return null

  return (
    <Card className="bg-linear-to-r from-blue-500/20 to-blue-600/20 border-blue-400/30 mb-6">
      <CardContent className="pt-6">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-4 flex-1">
            <Camera className="w-5 h-5 text-blue-400 mt-1 shrink-0" />
            <div>
              <h3 className="font-semibold text-white mb-1">Enable Face Recognition</h3>
              <p className="text-sm text-slate-300">
                Register your face to unlock your locker with just a glance. Quick, secure, and convenient.
              </p>
            </div>
          </div>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setIsDismissed(true)}
            className="text-slate-400 hover:text-slate-200 h-auto p-0"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
        <div className="mt-4 flex gap-2">
          <FaceRegistrationDialog token={token} onSuccess={() => setHasFaceData(true)} />
          <Button variant="outline" onClick={() => setIsDismissed(true)} className="text-slate-300">
            Maybe Later
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
