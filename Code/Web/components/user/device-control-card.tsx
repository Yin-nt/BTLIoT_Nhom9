// Device control card for users
"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Lock, Unlock, Battery, MapPin, Wifi, WifiOff } from "lucide-react"

interface Device {
  id: number
  device_id: string
  device_name: string
  location: string
  status: string
  battery_level: number
}

export default function DeviceControlCard({
  device,
  token,
  onRefresh,
}: {
  device: Device
  token: string | null
  onRefresh: () => void
}) {
  const [isUnlocking, setIsUnlocking] = useState(false)
  const [lastAction, setLastAction] = useState<"unlock" | "lock" | null>(null)

  const handleUnlock = async () => {
    if (!token) return

    setIsUnlocking(true)
    try {
      const response = await fetch(`/api/devices/${device.id}/unlock`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      })

      if (response.ok) {
        setLastAction("unlock")
        setTimeout(() => setLastAction(null), 2000)
        onRefresh()
      }
    } catch (error) {
      console.error("Error unlocking device:", error)
    } finally {
      setIsUnlocking(false)
    }
  }

  const isOnline = device.status === "online"
  const batteryLow = device.battery_level < 20

  return (
    <Card className="bg-slate-800/50 border-slate-700 hover:border-emerald-500/30 transition-colors">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="text-white text-lg">{device.device_name}</CardTitle>
            <div className="flex items-center gap-2 mt-2">
              {isOnline ? (
                <>
                  <Wifi className="w-4 h-4 text-green-500" />
                  <span className="text-sm text-green-400">Online</span>
                </>
              ) : (
                <>
                  <WifiOff className="w-4 h-4 text-slate-500" />
                  <span className="text-sm text-slate-400">Offline</span>
                </>
              )}
            </div>
          </div>
          <div
            className={`p-2 rounded-lg ${batteryLow ? "bg-red-500/20" : device.battery_level > 50 ? "bg-green-500/20" : "bg-yellow-500/20"}`}
          >
            <Battery
              className={`w-5 h-5 ${batteryLow ? "text-red-400" : device.battery_level > 50 ? "text-green-400" : "text-yellow-400"}`}
            />
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {device.location && (
          <div className="flex items-center gap-2 text-sm text-slate-300">
            <MapPin className="w-4 h-4 text-slate-500" />
            {device.location}
          </div>
        )}

        <div className="space-y-2">
          <p className="text-xs text-slate-400">Battery Level: {device.battery_level}%</p>
          <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
            <div
              className={`h-full ${batteryLow ? "bg-red-500" : device.battery_level > 50 ? "bg-green-500" : "bg-yellow-500"}`}
              style={{ width: `${device.battery_level}%` }}
            />
          </div>
        </div>

        <Button
          onClick={handleUnlock}
          disabled={isUnlocking || !isOnline}
          className={`w-full font-medium transition-all ${
            lastAction === "unlock"
              ? "bg-green-500 hover:bg-green-600 text-white"
              : "bg-emerald-500 hover:bg-emerald-600 text-white disabled:opacity-50 disabled:cursor-not-allowed"
          }`}
        >
          {isUnlocking ? (
            <>Loading...</>
          ) : lastAction === "unlock" ? (
            <>
              <Unlock className="w-4 h-4 mr-2" />
              Unlocked
            </>
          ) : (
            <>
              <Lock className="w-4 h-4 mr-2" />
              Unlock Now
            </>
          )}
        </Button>

        <div className="text-xs text-slate-500 text-center">Device ID: {device.device_id}</div>
      </CardContent>
    </Card>
  )
}
