"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { DashboardLayout } from "@/components/dashboard-layout"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Lock, Unlock, Users, Activity } from "lucide-react"

interface Cabinet {
  id: number
  cabinet_id: string
  name: string
  location: string
  lock_status: string
}

export default function DashboardPage() {
  const [cabinets, setCabinets] = useState<Cabinet[]>([])
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    const token = localStorage.getItem("token")
    if (!token) {
      router.push("/login")
      return
    }
    fetchCabinets()
  }, [router])

  const fetchCabinets = async () => {
    try {
      const token = localStorage.getItem("token")
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/cabinets`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      const data = await response.json()
      setCabinets(data)
    } catch (error) {
      console.error("Error fetching cabinets:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleToggleLock = async (cabinetId: number, currentStatus: string) => {
    try {
      const token = localStorage.getItem("token")
      const newStatus = currentStatus === "locked" ? "unlocked" : "locked"

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/cabinets/${cabinetId}/${newStatus}`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      })

      if (response.ok) {
        fetchCabinets()
      }
    } catch (error) {
      console.error("Error toggling lock:", error)
    }
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-600 mt-1">Quản lý tủ thông minh PTIT</p>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Tổng số tủ</CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{cabinets.length}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Đang khóa</CardTitle>
              <Lock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{cabinets.filter((c) => c.lock_status === "locked").length}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Đang mở</CardTitle>
              <Unlock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{cabinets.filter((c) => c.lock_status === "unlocked").length}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Người dùng</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">--</div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Danh sách tủ</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {loading ? (
                <p className="text-center text-gray-500">Đang tải...</p>
              ) : cabinets.length === 0 ? (
                <p className="text-center text-gray-500">Chưa có tủ nào</p>
              ) : (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {cabinets.map((cabinet) => (
                    <Card key={cabinet.id}>
                      <CardHeader>
                        <CardTitle className="text-lg">{cabinet.name}</CardTitle>
                        <p className="text-sm text-gray-600">{cabinet.location}</p>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-sm">Trạng thái:</span>
                          <div className="flex items-center gap-2">
                            {cabinet.lock_status === "locked" ? (
                              <>
                                <Lock className="h-4 w-4 text-red-500" />
                                <span className="text-sm font-semibold text-red-500">Đã khóa</span>
                              </>
                            ) : (
                              <>
                                <Unlock className="h-4 w-4 text-green-500" />
                                <span className="text-sm font-semibold text-green-500">Đã mở</span>
                              </>
                            )}
                          </div>
                        </div>
                        <Button
                          className="w-full bg-linear-to-r from-[#E4002B] to-[#FF6B35]"
                          onClick={() => handleToggleLock(cabinet.id, cabinet.lock_status)}
                        >
                          {cabinet.lock_status === "locked" ? "Mở khóa" : "Khóa lại"}
                        </Button>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}
