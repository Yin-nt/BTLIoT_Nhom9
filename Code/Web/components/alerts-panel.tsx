"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { AlertCircle, CheckCircle2, X } from "lucide-react"

interface Alert {
  id: number
  device_name: string
  alert_type: string
  message: string
  is_read: boolean
  created_at: string
}

export default function AlertsPanel({ token }: { token: string | null }) {
  const [alerts, setAlerts] = useState<Alert[]>([])
  const [isOpen, setIsOpen] = useState(false)

  useEffect(() => {
    if (!token) return

    fetchAlerts()

    // EventSource doesn't support custom headers via constructor, use fetch for headers
    const controller = new AbortController()

    const connectSSE = async () => {
      try {
        const response = await fetch("/api/events", {
          headers: { Authorization: `Bearer ${token}` },
        })

        if (!response.body) return

        const reader = response.body.getReader()
        const decoder = new TextDecoder()

        while (true) {
          const { done, value } = await reader.read()
          if (done) break

          const text = decoder.decode(value)
          const lines = text.split("\n")

          lines.forEach((line) => {
            if (line.startsWith("data: ")) {
              try {
                const data = JSON.parse(line.slice(6))
                console.log("[smart-locker] SSE message received:", data)

                if (data.type === "new_alert") {
                  fetchAlerts()
                } else if (data.type === "connected") {
                  console.log("[smart-locker] SSE connected")
                }
              } catch (error) {
                console.error("[smart-locker] Error parsing SSE message:", error)
              }
            }
          })
        }
      } catch (error) {
        console.error("[smart-locker] SSE connection error:", error)
      }
    }

    connectSSE()

    return () => {
      controller.abort()
    }
  }, [token])

  const fetchAlerts = async () => {
    if (!token) return
    try {
      const response = await fetch("/api/alerts", {
        headers: { Authorization: `Bearer ${token}` },
      })
      const data = await response.json()
      setAlerts(data.alerts || [])
    } catch (error) {
      console.error("[smart-locker] Error fetching alerts:", error)
    }
  }

  const markAsRead = async (alertId: number) => {
    if (!token) return
    try {
      await fetch("/api/alerts", {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ alertId }),
      })
      fetchAlerts()
    } catch (error) {
      console.error("[smart-locker] Error marking alert as read:", error)
    }
  }

  const unreadCount = alerts.filter((a) => !a.is_read).length

  return (
    <div className="relative">
      <Button
        onClick={() => setIsOpen(!isOpen)}
        variant="outline"
        size="sm"
        className="relative border-slate-600 text-slate-200 hover:bg-slate-700 bg-transparent"
      >
        <AlertCircle className="w-4 h-4" />
        {unreadCount > 0 && (
          <span className="absolute top-0 right-0 w-4 h-4 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
            {unreadCount}
          </span>
        )}
      </Button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-slate-800 border border-slate-700 rounded-lg shadow-lg z-50 max-h-96 overflow-y-auto">
          <div className="p-3 sm:p-4 border-b border-slate-700 flex justify-between items-center">
            <h3 className="font-semibold text-white text-sm sm:text-base">Alerts (Real-time)</h3>
            <button onClick={() => setIsOpen(false)} className="text-slate-400 hover:text-slate-200">
              <X className="w-4 h-4" />
            </button>
          </div>

          {alerts.length === 0 ? (
            <div className="p-4 text-center text-slate-400">
              <p className="text-sm">No alerts</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-700">
              {alerts.map((alert) => (
                <div
                  key={alert.id}
                  className={`p-3 sm:p-4 ${alert.is_read ? "opacity-60" : "bg-slate-700/30"} hover:bg-slate-700/50 cursor-pointer`}
                >
                  <div className="flex items-start gap-3">
                    {alert.alert_type === "unauthorized_access" ? (
                      <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                    ) : alert.alert_type === "spoofing_detected" ? (
                      <AlertCircle className="w-5 h-5 text-orange-500 shrink-0 mt-0.5" />
                    ) : (
                      <CheckCircle2 className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-white font-medium text-xs sm:text-sm">{alert.device_name}</p>
                      <p className="text-slate-300 text-xs sm:text-sm wrap-break-word">{alert.message}</p>
                      <p className="text-slate-500 text-xs mt-1">{new Date(alert.created_at).toLocaleTimeString()}</p>
                    </div>
                    {!alert.is_read && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={(e) => {
                          e.stopPropagation()
                          markAsRead(alert.id)
                        }}
                        className="text-slate-400 hover:text-slate-200 text-xs"
                      >
                        ✓
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
