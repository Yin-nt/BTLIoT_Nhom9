// Admin devices management tab
"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Plus, Trash2, Wifi, WifiOff } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"

interface Device {
  id: number
  device_id: string
  device_name: string
  location: string
  status: string
  battery_level: number
  created_by_name: string
  created_at: string
}

export default function AdminDevicesTab({ token }: { token: string | null }) {
  const [devices, setDevices] = useState<Device[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [newDevice, setNewDevice] = useState({ deviceId: "", deviceName: "", location: "" })

  useEffect(() => {
    fetchDevices()
  }, [])

  const fetchDevices = async () => {
    if (!token) return
    try {
      const response = await fetch("/api/devices", {
        headers: { Authorization: `Bearer ${token}` },
      })
      const data = await response.json()
      setDevices(data.devices || [])
    } catch (error) {
      console.error("Error fetching devices:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleAddDevice = async () => {
    if (!token || !newDevice.deviceId || !newDevice.deviceName) return

    try {
      const response = await fetch("/api/devices", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(newDevice),
      })

      if (response.ok) {
        setNewDevice({ deviceId: "", deviceName: "", location: "" })
        setIsDialogOpen(false)
        fetchDevices()
      }
    } catch (error) {
      console.error("Error adding device:", error)
    }
  }

  if (isLoading) {
    return <div className="text-center py-8 text-slate-400">Loading devices...</div>
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <p className="text-slate-300">{devices.length} devices registered</p>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-emerald-500 hover:bg-emerald-600 text-white">
              <Plus className="w-4 h-4 mr-2" />
              Add Device
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-slate-800 border-slate-700">
            <DialogHeader>
              <DialogTitle className="text-white">Add New Device</DialogTitle>
              <DialogDescription>Register a new smart locker to the system</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-slate-200">Device ID (MAC Address)</label>
                <Input
                  type="text"
                  placeholder="AA:BB:CC:DD:EE:FF"
                  value={newDevice.deviceId}
                  onChange={(e) => setNewDevice({ ...newDevice, deviceId: e.target.value })}
                  className="bg-slate-900/50 border-slate-600 text-white mt-1"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-slate-200">Device Name</label>
                <Input
                  type="text"
                  placeholder="Locker 01"
                  value={newDevice.deviceName}
                  onChange={(e) => setNewDevice({ ...newDevice, deviceName: e.target.value })}
                  className="bg-slate-900/50 border-slate-600 text-white mt-1"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-slate-200">Location</label>
                <Input
                  type="text"
                  placeholder="Floor 2, Room 201"
                  value={newDevice.location}
                  onChange={(e) => setNewDevice({ ...newDevice, location: e.target.value })}
                  className="bg-slate-900/50 border-slate-600 text-white mt-1"
                />
              </div>
              <Button onClick={handleAddDevice} className="w-full bg-emerald-500 hover:bg-emerald-600 text-white">
                Register Device
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="overflow-x-auto">
        <Table>
          <TableHeader className="border-b border-slate-700">
            <TableRow className="hover:bg-transparent">
              <TableHead className="text-slate-300">Device Name</TableHead>
              <TableHead className="text-slate-300">Device ID</TableHead>
              <TableHead className="text-slate-300">Location</TableHead>
              <TableHead className="text-slate-300">Status</TableHead>
              <TableHead className="text-slate-300">Battery</TableHead>
              <TableHead className="text-slate-300">Created By</TableHead>
              <TableHead className="text-slate-300">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {devices.map((device) => (
              <TableRow key={device.id} className="border-b border-slate-700 hover:bg-slate-700/30">
                <TableCell className="text-white font-medium">{device.device_name}</TableCell>
                <TableCell className="text-slate-300 text-sm font-mono">{device.device_id}</TableCell>
                <TableCell className="text-slate-300">{device.location || "-"}</TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    {device.status === "online" ? (
                      <>
                        <Wifi className="w-4 h-4 text-green-500" />
                        <span className="text-green-400 text-sm">Online</span>
                      </>
                    ) : (
                      <>
                        <WifiOff className="w-4 h-4 text-slate-500" />
                        <span className="text-slate-400 text-sm">Offline</span>
                      </>
                    )}
                  </div>
                </TableCell>
                <TableCell className="text-slate-300">{device.battery_level}%</TableCell>
                <TableCell className="text-slate-400 text-sm">{device.created_by_name}</TableCell>
                <TableCell>
                  <Button size="sm" variant="ghost" className="text-red-400 hover:text-red-300 hover:bg-red-500/10">
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
