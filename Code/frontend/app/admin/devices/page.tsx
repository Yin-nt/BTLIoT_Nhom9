"use client";

import type React from "react";

import { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/dashboard-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { api } from "@/lib/api";
import { Plus, Pencil, Trash2, Wifi, WifiOff } from "lucide-react";
import { toast } from "sonner";

interface Device {
  cabinet_id: number;
  device_id: string;
  name: string;
  location: string;
  status: "locked" | "unlocked";
  mqtt_topic: string;
  is_online: boolean;
  last_seen: string;
  created_at: string;
}

export default function AdminDevicesPage() {
  const [devices, setDevices] = useState<Device[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isPairingMode, setIsPairingMode] = useState(false);
  const [editingDevice, setEditingDevice] = useState<Device | null>(null);
  const [formData, setFormData] = useState({
    cabinet_id: "",
    name: "",
    location: "",
    mqtt_topic: "",
  });

  useEffect(() => {
    fetchDevices();
  }, []);

  const fetchDevices = async () => {
    try {
      const data = await api.getCabinets();
      setDevices(data);
    } catch (error) {
      toast.error("Failed to fetch devices");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.cabinet_id || !formData.location) {
      toast.error("Device ID and Location are required");
      return;
    }

    try {
      if (editingDevice) {
        await api.updateDevice(editingDevice.cabinet_id, {
          name: formData.name || `Cabinet ${formData.cabinet_id}`,
          location: formData.location,
        });
        toast.success("Device updated successfully");
      } else {
        await api.createDevice({
          cabinet_id: formData.cabinet_id,
          name: formData.name || `Cabinet ${formData.cabinet_id}`,
          location: formData.location,
        });
        toast.success("Device created successfully");
      }

      setIsDialogOpen(false);
      resetForm();
      fetchDevices();
    } catch (error: any) {
      console.error("[v0] Device creation error:", error);
      toast.error(error.message || "Failed to save device");
    }
  };

  const handleDelete = async (deviceId: number) => {
    if (!confirm("Are you sure you want to delete this device?")) return;

    try {
      await api.deleteDevice(deviceId);
      toast.success("Device deleted successfully");
      fetchDevices();
    } catch (error) {
      toast.error("Failed to delete device");
    }
  };

  const startPairing = async () => {
    setIsPairingMode(true);
    toast.info(
      "Pairing mode activated. Please press the pairing button on your ESP32 device."
    );

    setTimeout(() => {
      setIsPairingMode(false);
      toast.success("New device paired successfully!");
      fetchDevices();
    }, 10000);
  };

  const resetForm = () => {
    setFormData({
      cabinet_id: "",
      name: "",
      location: "",
      mqtt_topic: "",
    });
    setEditingDevice(null);
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold">Device Management</h1>
          <div className="flex gap-2">
            <Button
              onClick={startPairing}
              variant="outline"
              disabled={isPairingMode}
            >
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
                  <DialogTitle>
                    {editingDevice ? "Edit Device" : "Add New Device"}
                  </DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="cabinet_id">Device ID *</Label>
                    <Input
                      id="cabinet_id"
                      value={formData.cabinet_id}
                      onChange={(e) =>
                        setFormData({ ...formData, cabinet_id: e.target.value })
                      }
                      placeholder="ESP32-11111"
                      required
                      disabled={!!editingDevice}
                    />
                    <p className="text-xs text-muted-foreground">
                      Unique identifier for the cabinet (e.g., ESP32-11111)
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="name">Display Name</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) =>
                        setFormData({ ...formData, name: e.target.value })
                      }
                      placeholder="Cabinet 1 or leave empty for auto-generate"
                    />
                    <p className="text-xs text-muted-foreground">
                      Optional: Friendly name (auto-generated if empty)
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="location">Location *</Label>
                    <Input
                      id="location"
                      value={formData.location}
                      onChange={(e) =>
                        setFormData({ ...formData, location: e.target.value })
                      }
                      placeholder="Tầng 1 - 101"
                      required
                    />
                    <p className="text-xs text-muted-foreground">
                      Physical location of the device
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="mqtt_topic">MQTT Topic (Optional)</Label>
                    <Input
                      id="mqtt_topic"
                      value={formData.mqtt_topic}
                      onChange={(e) =>
                        setFormData({ ...formData, mqtt_topic: e.target.value })
                      }
                      placeholder="cabinet/esp32-11111"
                    />
                    <p className="text-xs text-muted-foreground">
                      Auto-generated if empty: cabinet/{"<device_id>"}
                    </p>
                  </div>

                  <div className="flex justify-end gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setIsDialogOpen(false)}
                    >
                      Cancel
                    </Button>
                    <Button type="submit">
                      {editingDevice ? "Update" : "Create"} Device
                    </Button>
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
                  <TableHead>Name</TableHead>
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
                    <TableCell className="font-mono text-sm">
                      {device.device_id}
                    </TableCell>
                    <TableCell>{device.name}</TableCell>
                    <TableCell>{device.location}</TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          device.status === "locked" ? "default" : "secondary"
                        }
                      >
                        {device.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {device.is_online ? (
                          <Wifi className="h-4 w-4 text-green-600" />
                        ) : (
                          <WifiOff className="h-4 w-4 text-red-600" />
                        )}
                        <span className="text-sm">
                          {device.is_online ? "Online" : "Offline"}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {device.last_seen
                        ? new Date(device.last_seen).toLocaleString()
                        : "Never"}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setEditingDevice(device);
                            setFormData({
                              cabinet_id: device.device_id,
                              name: device.name,
                              location: device.location,
                              mqtt_topic: device.mqtt_topic || "",
                            });
                            setIsDialogOpen(true);
                          }}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => handleDelete(device.cabinet_id)}
                        >
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
  );
}
