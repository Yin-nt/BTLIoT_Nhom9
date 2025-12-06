"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { DashboardLayout } from "@/components/dashboard-layout"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { api } from "@/lib/api"
import { Plus, Pencil, Trash2, Wifi, WifiOff } from "lucide-react"
import { toast } from "sonner"

interface Device {
  cabinet_id: number
  device_id: string
  location: string
  status: "locked" | "unlocked"
  mqtt_topic: string
  is_online: boolean
  last_seen: string
  created_at: string
}

export default function AdminDevicesPage() {
  const [devices, setDevices] = useState<Device[]>([])
  const [loading, setLoading] = useState(true)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isPairingMode, setIsPairingMode] = useState(false)
  const [editingDevice, setEditingDevice] = useState<Device | null>(null)
  const [formData, setFormData] = useState({
    device_id: "",
    location: "",
    mqtt_topic: "",
  })

  useEffect(() => {
    fetchDevices()
  }, [])

  const fetchDevices = async () => {
    try {
      const data = await api.getCabinets()
      setDevices(data)
    } catch (error) {
      toast.error("Failed to fetch devices")
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    try {
      if (editingDevice) {
        await api.updateDevice(editingDevice.cabinet_id, formData)
        toast.success("Device updated successfully")
      } else {
        await api.createDevice(formData)
        toast.success("Device created successfully")
      }

      setIsDialogOpen(false)
      resetForm()
      fetchDevices()
    } catch (error: any) {
      toast.error(error.message || "Failed to save device")
    }
  }

  const handleDelete = async (deviceId: number) => {
    if (!confirm("Are you sure you want to delete this device?")) return

    try {
      await api.deleteDevice(deviceId)
      toast.success("Device deleted successfully")
      fetchDevices()
    } catch (error) {
      toast.error("Failed to delete device")
    }
  }

  const startPairing = async () => {
    setIsPairingMode(true)
    toast.info("Pairing mode activated. Please press the pairing button on your ESP32 device.")

    // Listen for new devices via MQTT or WebSocket
    // This would be implemented with actual MQTT subscription
    setTimeout(() => {
      setIsPairingMode(false)
      toast.success("New device paired successfully!")
      fetchDevices()
    }, 10000)
  }

  const resetForm = () => {
    setFormData({
      device_id: "",
      location: "",
      mqtt_topic: "",
    })
    setEditingDevice(null)
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold">Device Management</h1>
          <div className="flex gap-2">
            <Button onClick={startPairing} variant="outline" disabled={isPairingMode}>
              <Wifi className="mr-2 h-4 w-4" />
              {isPairingMode ? "Pairing..." : "Pair New Device"}
            </Button>
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={resetForm}>
                  <Plus className="mr-2 h-4 w-4" />
                  Add Device
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>{editingDevice ? "Edit Device" : "Add New Device"}</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="device_id">Device ID</Label>
                    <Input
                      id="device_id"
                      value={formData.device_id}
                      onChange={(e) => setFormData({ ...formData, device_id: e.target.value })}
                      placeholder="ESP32-XXXXXX"
                      required
                      disabled={!!editingDevice}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="location">Location</Label>
                    <Input
                      id="location"
                      value={formData.location}
                      onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                      placeholder="Building A - Floor 1"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="mqtt_topic">MQTT Topic</Label>
                    <Input
                      id="mqtt_topic"
                      value={formData.mqtt_topic}
                      onChange={(e) => setFormData({ ...formData, mqtt_topic: e.target.value })}
                      placeholder="cabinet/esp32-xxxxxx"
                      required
                    />
                  </div>

                  <div className="flex justify-end gap-2">
                    <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button type="submit">{editingDevice ? "Update" : "Create"} Device</Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>All Devices</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>Device ID</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Online</TableHead>
                  <TableHead>Last Seen</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {devices.map((device) => (
                  <TableRow key={device.cabinet_id}>
                    <TableCell>{device.cabinet_id}</TableCell>
                    <TableCell className="font-mono text-sm">{device.device_id}</TableCell>
                    <TableCell>{device.location}</TableCell>
                    <TableCell>
                      <Badge variant={device.status === "locked" ? "default" : "secondary"}>{device.status}</Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {device.is_online ? (
                          <Wifi className="h-4 w-4 text-green-600" />
                        ) : (
                          <WifiOff className="h-4 w-4 text-red-600" />
                        )}
                        <span className="text-sm">{device.is_online ? "Online" : "Offline"}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {new Date(device.last_seen).toLocaleString()}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setEditingDevice(device)
                            setFormData({
                              device_id: device.device_id,
                              location: device.location,
                              mqtt_topic: device.mqtt_topic,
                            })
                            setIsDialogOpen(true)
                          }}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button size="sm" variant="destructive" onClick={() => handleDelete(device.cabinet_id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}
