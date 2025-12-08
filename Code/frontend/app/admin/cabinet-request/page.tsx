"use client"

import { useEffect, useState } from "react"
import { DashboardLayout } from "@/components/dashboard-layout"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { api } from "@/lib/api"
import { Check, X, Clock } from "lucide-react"

interface CabinetRequest {
  request_id: number
  cabinet_id: number
  user_id: number
  cabinet_device_id: string
  cabinet_name: string
  location: string
  username: string
  email: string
  full_name: string
  created_at: string
  status: "pending" | "approved" | "rejected"
}

export default function CabinetRequestsPage() {
  const [requests, setRequests] = useState<CabinetRequest[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchRequests()
  }, [])

  const fetchRequests = async () => {
    try {
      const data = await api.getCabinetRequests()
      setRequests(data)
    } catch (error) {
      console.error("Error fetching requests:", error)
      alert("Lỗi khi tải danh sách yêu cầu")
    } finally {
      setLoading(false)
    }
  }

  const handleApprove = async (requestId: number) => {
    if (!confirm("Phê duyệt yêu cầu này và gán quyền sở hữu tủ cho người dùng?")) return

    try {
      await api.approveCabinetRequest(requestId)
      alert("✅ Đã phê duyệt yêu cầu thành công!")
      fetchRequests()
    } catch (error) {
      console.error("Error approving request:", error)
      alert("Lỗi: " + (error as Error).message)
    }
  }

  const handleReject = async (requestId: number) => {
    if (!confirm("Từ chối yêu cầu này?")) return

    try {
      await api.rejectCabinetRequest(requestId)
      alert("Đã từ chối yêu cầu")
      fetchRequests()
    } catch (error) {
      console.error("Error rejecting request:", error)
      alert("Lỗi: " + (error as Error).message)
    }
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Yêu cầu đăng ký tủ</h1>
            <p className="text-gray-600 mt-1">Phê duyệt hoặc từ chối yêu cầu đăng ký tủ từ người dùng</p>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>
              Yêu cầu chờ xử lý{" "}
              <Badge variant="secondary" className="ml-2">
                {requests.length}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-center text-gray-500 py-8">Đang tải...</p>
            ) : requests.length === 0 ? (
              <div className="text-center py-12">
                <Clock className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500">Không có yêu cầu nào đang chờ xử lý</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Mã tủ</TableHead>
                    <TableHead>Tên tủ</TableHead>
                    <TableHead>Vị trí</TableHead>
                    <TableHead>Người yêu cầu</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Thời gian</TableHead>
                    <TableHead>Hành động</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {requests.map((request) => (
                    <TableRow key={request.request_id}>
                      <TableCell className="font-mono text-sm">{request.cabinet_device_id}</TableCell>
                      <TableCell className="font-medium">{request.cabinet_name}</TableCell>
                      <TableCell>{request.location}</TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium">{request.full_name}</p>
                          <p className="text-sm text-gray-500">@{request.username}</p>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm">{request.email}</TableCell>
                      <TableCell className="text-sm text-gray-600">
                        {new Date(request.created_at).toLocaleString("vi-VN")}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            className="bg-green-600 hover:bg-green-700"
                            onClick={() => handleApprove(request.request_id)}
                          >
                            <Check className="h-4 w-4 mr-1" />
                            Phê duyệt
                          </Button>
                          <Button size="sm" variant="destructive" onClick={() => handleReject(request.request_id)}>
                            <X className="h-4 w-4 mr-1" />
                            Từ chối
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}
