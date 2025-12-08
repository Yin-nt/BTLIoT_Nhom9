"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { DashboardLayout } from "@/components/dashboard-layout"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { AlertTriangle, CheckCircle, Clock } from "lucide-react"

interface Alert {
  id: number
  cabinet_id: string
  cabinet_name: string
  username: string | null
  alert_type: "unauthorized" | "tamper"
  timestamp: string
  success: boolean
  image_url: string | null
}

export default function AlertsPage() {
  const router = useRouter()
  const [alerts, setAlerts] = useState<Alert[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const token = localStorage.getItem("token")
    if (!token) {
      router.push("/login")
      return
    }
    fetchAlerts()
  }, [])

  const fetchAlerts = async () => {
    try {
      const token = localStorage.getItem("token")
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/cabinets/alerts`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      const data = await response.json()
      setAlerts(data)
    } catch (error) {
      console.error("Error fetching alerts:", error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Cảnh báo An ninh</h1>
          <p className="text-gray-600 mt-1">Danh sách các cảnh báo truy cập trái phép</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Cảnh báo gần đây</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {loading ? (
                <p className="text-center text-gray-500">Đang tải...</p>
              ) : alerts.length === 0 ? (
                <div className="text-center py-8">
                  <CheckCircle className="h-12 w-12 text-green-600 mx-auto mb-4" />
                  <p className="text-gray-600">Không có cảnh báo nào</p>
                </div>
              ) : (
                alerts.map((alert) => (
                  <div key={alert.id} className="flex items-start gap-4 p-4 border border-red-200 bg-red-50 rounded-lg">
                    <AlertTriangle className="h-6 w-6 text-red-600 mt-1" />
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold text-red-900">{alert.cabinet_name}</h3>
                        <Badge variant="destructive" className="text-xs">
                          {alert.alert_type === "unauthorized" ? "Truy cập trái phép" : "Phá hoại"}
                        </Badge>
                      </div>
                      <p className="text-sm text-red-700 mb-2">
                        {alert.username
                          ? `Người dùng không có quyền: ${alert.username}`
                          : "Khuôn mặt không nhận diện được"}
                      </p>
                      <div className="flex items-center gap-2 text-xs text-red-600">
                        <Clock className="h-3 w-3" />
                        <span>{new Date(alert.timestamp).toLocaleString("vi-VN")}</span>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}
