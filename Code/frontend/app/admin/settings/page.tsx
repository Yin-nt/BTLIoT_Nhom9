"use client"

import { DashboardLayout } from "@/components/dashboard-layout"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Database, Wifi, Bell } from "lucide-react"

export default function AdminSettingsPage() {
  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Cài đặt hệ thống</h1>
          <p className="text-gray-600 mt-1">Quản lý cấu hình hệ thống Smart Cabinet</p>
        </div>

        <div className="grid gap-6">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Database className="h-5 w-5" />
                <CardTitle>Cơ sở dữ liệu</CardTitle>
              </div>
              <CardDescription>Cấu hình kết nối database</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-2">
                <Label>Database Host</Label>
                <Input defaultValue="localhost" />
              </div>
              <div className="grid gap-2">
                <Label>Database Name</Label>
                <Input defaultValue="smart_cabinet" />
              </div>
              <Button>Lưu thay đổi</Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Wifi className="h-5 w-5" />
                <CardTitle>MQTT Broker</CardTitle>
              </div>
              <CardDescription>Cấu hình MQTT cho IoT devices</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-2">
                <Label>MQTT Host</Label>
                <Input defaultValue="mqtt://localhost:1883" />
              </div>
              <div className="grid gap-2">
                <Label>Username</Label>
                <Input />
              </div>
              <Button>Lưu thay đổi</Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Bell className="h-5 w-5" />
                <CardTitle>Cảnh báo</CardTitle>
              </div>
              <CardDescription>Cấu hình thông báo và cảnh báo</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Email notifications</p>
                  <p className="text-sm text-gray-600">Gửi email khi có truy cập trái phép</p>
                </div>
                <Button variant="outline">Bật</Button>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Push notifications</p>
                  <p className="text-sm text-gray-600">Thông báo đẩy qua web browser</p>
                </div>
                <Button variant="outline">Bật</Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  )
}
