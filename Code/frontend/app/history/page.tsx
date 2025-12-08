"use client"

import { useEffect, useState } from "react"
import { DashboardLayout } from "@/components/dashboard-layout"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { CheckCircle, XCircle, Clock, Filter } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

interface AccessLog {
  id: number
  username: string
  email: string
  cabinet_name: string
  cabinet_id: string
  access_type: string
  success: string
  timestamp: string
  confidence_score: number
}

export default function HistoryPage() {
  const [logs, setLogs] = useState<AccessLog[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState("")

  useEffect(() => {
    fetchHistory()
  }, [])

  const fetchHistory = async () => {
    try {
      const token = localStorage.getItem("token")
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/access-logs`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      const data = await response.json()
      setLogs(data.logs || [])
    } catch (error) {
      console.error("Error fetching history:", error)
    } finally {
      setLoading(false)
    }
  }

  const filteredLogs = logs.filter(
    (log) =>
      log.username?.toLowerCase().includes(filter.toLowerCase()) ||
      log.cabinet_name?.toLowerCase().includes(filter.toLowerCase()),
  )

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Lịch sử truy cập</h1>
          <p className="text-gray-600 mt-1">Theo dõi hoạt động của hệ thống</p>
        </div>

        <div className="flex gap-2">
          <Input
            placeholder="Tìm kiếm theo tên người dùng hoặc tủ..."
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="max-w-md"
          />
          <Button variant="outline">
            <Filter className="h-4 w-4 mr-2" />
            Lọc
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Nhật ký truy cập</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {loading ? (
                <p className="text-center text-gray-500">Đang tải...</p>
              ) : filteredLogs.length === 0 ? (
                <p className="text-center text-gray-500">Chưa có lịch sử</p>
              ) : (
                filteredLogs.map((log) => (
                  <div
                    key={log.id}
                    className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50"
                  >
                    <div className="flex items-center gap-4">
                      <div
                        className={`w-10 h-10 rounded-full flex items-center justify-center ${
                          log.success === "success" ? "bg-green-100" : "bg-red-100"
                        }`}
                      >
                        {log.success === "success" ? (
                          <CheckCircle className="h-5 w-5 text-green-600" />
                        ) : (
                          <XCircle className="h-5 w-5 text-red-600" />
                        )}
                      </div>
                      <div>
                        <p className="font-semibold">
                          {log.username || "Unknown"} - {log.cabinet_name || log.cabinet_id}
                        </p>
                        <p className="text-sm text-gray-600">{log.email}</p>
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <Clock className="h-3 w-3" />
                          <span>{new Date(log.timestamp).toLocaleString("vi-VN")}</span>
                          {log.confidence_score && (
                            <span className="ml-2 text-xs">Độ tin cậy: {(log.confidence_score * 100).toFixed(1)}%</span>
                          )}
                        </div>
                      </div>
                    </div>
                    <Badge
                      variant={log.success === "success" ? "default" : "destructive"}
                      className={
                        log.success === "success"
                          ? "bg-green-100 text-green-700 hover:bg-green-100"
                          : "bg-red-100 text-red-700 hover:bg-red-100"
                      }
                    >
                      {log.success === "success" ? "Thành công" : "Thất bại"}
                    </Badge>
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
