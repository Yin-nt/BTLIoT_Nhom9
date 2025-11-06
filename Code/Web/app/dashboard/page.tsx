"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/components/auth-context"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Lock, LogOut, History, Menu, X } from "lucide-react"
import DeviceControlCard from "@/components/user/device-control-card"
import UserAccessLogs from "@/components/user/access-logs"
import FaceRegistrationBanner from "@/components/user/face-registration-banner"
import AlertsPanel from "@/components/alerts-panel"

interface Device {
  id: number
  device_id: string
  device_name: string
  location: string
  status: string
  battery_level: number
  created_at: string
}

export default function UserDashboard() {
  const router = useRouter()
  const { user, token, logout } = useAuth()
  const [devices, setDevices] = useState<Device[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  useEffect(() => {
    if (!user) {
      router.push("/login")
    } else {
      fetchDevices()
    }
  }, [user, router])

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

  const handleLogout = () => {
    logout()
    router.push("/login")
  }

  return (
    <div className="min-h-screen bg-linear-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* Header */}
      <header className="bg-slate-800/50 border-b border-slate-700 sticky top-0 z-50">
        <div className="w-full px-4 sm:px-6 lg:px-8 py-3 sm:py-4">
          <div className="flex items-center justify-between">
            {/* Logo/Title */}
            <div className="flex-1">
              <h1 className="text-xl sm:text-2xl font-bold text-white">My Lockers</h1>
              <p className="text-slate-400 text-xs sm:text-sm hidden sm:block">
                Control and monitor your smart lockers
              </p>
            </div>

            {/* Desktop - Right section */}
            <div className="hidden sm:flex items-center gap-3 lg:gap-4">
              <AlertsPanel token={token} />
              <div className="text-right">
                <p className="text-white font-medium text-sm">{user?.fullName}</p>
                <p className="text-slate-400 text-xs">User Account</p>
              </div>
              <Button
                onClick={handleLogout}
                variant="outline"
                size="sm"
                className="border-slate-600 text-slate-200 hover:bg-slate-700 bg-transparent text-xs sm:text-sm"
              >
                <LogOut className="w-4 h-4 mr-2" />
                Logout
              </Button>
            </div>

            {/* Mobile - Menu button */}
            <div className="sm:hidden flex items-center gap-2">
              <AlertsPanel token={token} />
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="p-2 hover:bg-slate-700 rounded-lg text-slate-200"
              >
                {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
            </div>
          </div>

          {/* Mobile Menu */}
          {mobileMenuOpen && (
            <div className="sm:hidden mt-4 pt-4 border-t border-slate-700 flex flex-col gap-3">
              <div className="text-right pb-2">
                <p className="text-white font-medium text-sm">{user?.fullName}</p>
                <p className="text-slate-400 text-xs">User Account</p>
              </div>
              <Button
                onClick={() => {
                  handleLogout()
                  setMobileMenuOpen(false)
                }}
                variant="outline"
                size="sm"
                className="border-slate-600 text-slate-200 hover:bg-slate-700 bg-transparent w-full"
              >
                <LogOut className="w-4 h-4 mr-2" />
                Logout
              </Button>
            </div>
          )}
        </div>
      </header>

      {/* Main Content */}
      <div className="w-full px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        <FaceRegistrationBanner token={token} />

        {isLoading ? (
          <div className="text-center py-16 text-slate-400">Loading your devices...</div>
        ) : devices.length === 0 ? (
          <Card className="bg-slate-800/50 border-slate-700 text-center py-16">
            <CardContent>
              <Lock className="w-12 h-12 text-slate-500 mx-auto mb-4 opacity-50" />
              <p className="text-slate-300 mb-2">No lockers assigned yet</p>
              <p className="text-slate-400 text-sm">Contact your administrator to assign a locker to your account</p>
            </CardContent>
          </Card>
        ) : (
          <>
            <div className="mb-8">
              <h2 className="text-lg sm:text-xl font-semibold text-white mb-4">Your Devices</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                {devices.map((device) => (
                  <DeviceControlCard key={device.id} device={device} token={token} onRefresh={fetchDevices} />
                ))}
              </div>
            </div>

            <Card className="bg-slate-800/50 border-slate-700">
              <CardHeader className="pb-3 sm:pb-6">
                <CardTitle className="text-white text-lg sm:text-xl">Activity</CardTitle>
                <CardDescription>View your access history and device logs</CardDescription>
              </CardHeader>
              <CardContent>
                <Tabs defaultValue="logs" className="space-y-4">
                  <TabsList className="bg-slate-700/50 w-full">
                    <TabsTrigger value="logs" className="data-[state=active]:bg-emerald-500 text-xs sm:text-sm flex-1">
                      <History className="w-4 h-4 mr-1 sm:mr-2" />
                      <span className="hidden sm:inline">Access History</span>
                      <span className="sm:hidden">History</span>
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="logs">
                    <UserAccessLogs token={token} />
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </div>
  )
}
