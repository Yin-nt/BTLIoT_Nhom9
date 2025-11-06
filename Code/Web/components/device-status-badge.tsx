// Device status badge component
"use client"

import { Wifi, WifiOff, AlertTriangle } from "lucide-react"

export default function DeviceStatusBadge({
  status,
  batteryLevel,
}: {
  status: string
  batteryLevel: number
}) {
  const isOnline = status === "online"
  const isMaintenance = status === "maintenance"
  const batteryLow = batteryLevel < 20

  return (
    <div className="flex items-center gap-2">
      {isMaintenance ? (
        <>
          <AlertTriangle className="w-4 h-4 text-yellow-500" />
          <span className="text-xs font-medium text-yellow-400">Maintenance</span>
        </>
      ) : isOnline ? (
        <>
          <Wifi className="w-4 h-4 text-green-500" />
          <span className="text-xs font-medium text-green-400">Online</span>
        </>
      ) : (
        <>
          <WifiOff className="w-4 h-4 text-slate-500" />
          <span className="text-xs font-medium text-slate-400">Offline</span>
        </>
      )}

      {batteryLow && (
        <span className="text-xs font-medium px-2 py-1 bg-red-500/20 text-red-300 rounded">
          Low Battery ({batteryLevel}%)
        </span>
      )}
    </div>
  )
}
