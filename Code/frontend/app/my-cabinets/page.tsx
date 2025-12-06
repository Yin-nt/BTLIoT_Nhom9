"use client"

import type React from "react"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { DashboardLayout } from "@/components/dashboard-layout"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Lock, Unlock, Plus } from "lucide-react"
import { api } from "@/lib/api"

interface Cabinet {
  id: number
  cabinet_id: string
  name: string
  location: string
  lock_status: "locked" | "unlocked"
  online_status: "online" | "offline"
}

export default function MyCabinetsPage() {
  const router = useRouter()
  const [cabinets, setCabinets] = useState<Cabinet[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [formData, setFormData] = useState({ cabinet_id: "", name: "", location: "" })

  useEffect(() => {
    const token = localStorage.getItem("token")
    if (!token) {
      router.push("/login")
      return
    }
    fetchMyCabinets()
  }, [])

  const fetchMyCabinets = async () => {
    try {
      const token = localStorage.getItem("token")
      const user = JSON.parse(localStorage.getItem("user") || "{}")

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001"}/api/cabinets`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      const data = await response.json()
      // Filter cabinets owned by current user
      const myCabinets = data.filter((c: any) => c.owner_id === user.id)
      setCabinets(myCabinets)
    } catch (error) {
      console.error("Error fetching cabinets:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleControl = async (cabinetId: string, action: "lock" | "unlock") => {
    try {
      if (action === "lock") {
        await api.lockCabinet(cabinetId)
      } else {
        await api.unlockCabinet(cabinetId)
      }
      fetchMyCabinets()
    } catch (error) {
      console.error("Error controlling cabinet:", error)
      alert("Lỗi: " + (error as Error).message)
    }
  }

  const handleAddCabinet = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await api.createDevice(formData)
      setDialogOpen(false)
      setFormData({ cabinet_id: "", name: "", location: "" })
      fetchMyCabinets()
    } catch (error) {
      console.error("Error adding cabinet:", error)
      alert("Lỗi: " + (error as Error).message)
    }
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Tủ của tôi</h1>
            <p className="text-gray-600 mt-1">Quản lý các tủ bạn sở hữu</p>
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-linear-to-r from-[#E4002B] to-[#FF6B35]">
                <Plus className="h-4 w-4 mr-2" />
                Thêm tủ mới
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Thêm tủ mới</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleAddCabinet} className="space-y-4">
                <div>
                  <Label>Mã tủ (Cabinet ID)</Label>
                  <Input
                    required
                    value={formData.cabinet_id}
                    onChange={(e) => setFormData({ ...formData, cabinet_id: e.target.value })}
                    placeholder="CAB001"
                  />
                </div>
                <div>
                  <Label>Tên tủ</Label>
                  <Input
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Tủ phòng khách"
                  />
                </div>
                <div>
                  <Label>Vị trí</Label>
                  <Input
                    required
                    value={formData.location}
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                    placeholder="Tầng 1, Phòng A"
                  />
                </div>
                <Button type="submit" className="w-full bg-linear-to-r from-[#E4002B] to-[#FF6B35]">
                  Thêm tủ
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <Card>
          <CardContent className="p-6">
            {loading ? (
              <p className="text-center text-gray-500 py-8">Đang tải...</p>
            ) : cabinets.length === 0 ? (
              <div className="text-center py-12">
                <Lock className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500 mb-4">Bạn chưa có tủ nào</p>
                <Button onClick={() => setDialogOpen(true)} className="bg-linear-to-r from-[#E4002B] to-[#FF6B35]">
                  <Plus className="h-4 w-4 mr-2" />
                  Thêm tủ đầu tiên
                </Button>
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {cabinets.map((cabinet) => (
                  <Card key={cabinet.id} className="overflow-hidden">
                    <CardHeader className="bg-linear-to-br from-[#E4002B]/10 to-[#FF6B35]/10">
                      <div className="flex items-center justify-between">
                        <div className="w-12 h-12 bg-linear-to-br from-[#E4002B] to-[#FF6B35] rounded-lg flex items-center justify-center">
                          {cabinet.lock_status === "locked" ? (
                            <Lock className="h-6 w-6 text-white" />
                          ) : (
                            <Unlock className="h-6 w-6 text-white" />
                          )}
                        </div>
                        <Badge
                          variant={cabinet.online_status === "online" ? "default" : "secondary"}
                          className={
                            cabinet.online_status === "online"
                              ? "bg-green-100 text-green-700"
                              : "bg-gray-100 text-gray-700"
                          }
                        >
                          {cabinet.online_status === "online" ? "Trực tuyến" : "Ngoại tuyến"}
                        </Badge>
                      </div>
                      <CardTitle className="mt-4">{cabinet.name}</CardTitle>
                      <p className="text-sm text-gray-600">{cabinet.location}</p>
                    </CardHeader>
                    <CardContent className="p-4">
                      <div className="flex items-center gap-2">
                        {cabinet.lock_status === "locked" ? (
                          <Button
                            className="flex-1 bg-green-600 hover:bg-green-700"
                            onClick={() => handleControl(cabinet.cabinet_id, "unlock")}
                            disabled={cabinet.online_status === "offline"}
                          >
                            <Unlock className="h-4 w-4 mr-2" />
                            Mở khóa
                          </Button>
                        ) : (
                          <Button
                            variant="outline"
                            className="flex-1 bg-transparent"
                            onClick={() => handleControl(cabinet.cabinet_id, "lock")}
                            disabled={cabinet.online_status === "offline"}
                          >
                            <Lock className="h-4 w-4 mr-2" />
                            Khóa
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}
