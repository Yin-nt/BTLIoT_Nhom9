"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/components/auth-context"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Users, Boxes, AlertTriangle, LogOut, Menu, X } from "lucide-react"
import AdminUsersTab from "@/components/admin/users-tab"
import AdminDevicesTab from "@/components/admin/devices-tab"
import AdminLogsTab from "@/components/admin/logs-tab"
import AlertsPanel from "@/components/alerts-panel"

export default function AdminDashboard() {
  const router = useRouter()
  const { user, token, logout } = useAuth()
  const [stats, setStats] = useState({ users: 0, devices: 0, alerts: 0 })
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  useEffect(() => {
    if (!user || user.role !== "admin") {
      router.push("/login")
    }
  }, [user, router])

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
              <h1 className="text-xl sm:text-2xl font-bold text-white">Admin Dashboard</h1>
              <p className="text-slate-400 text-xs sm:text-sm hidden sm:block">Smart Locker Management System</p>
            </div>

            {/* Desktop - Right section */}
            <div className="hidden sm:flex items-center gap-3 lg:gap-4">
              <AlertsPanel token={token} />
              <div className="text-right">
                <p className="text-white font-medium text-sm">{user?.fullName}</p>
                <p className="text-slate-400 text-xs">Administrator</p>
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
                <p className="text-slate-400 text-xs">Administrator</p>
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

      {/* Stats Cards */}
      <div className="w-full px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 mb-8">
          <Card className="bg-slate-800/50 border-slate-700">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-xs sm:text-sm font-medium text-slate-200">Total Users</CardTitle>
              <Users className="w-4 h-4 text-emerald-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl sm:text-3xl font-bold text-white">{stats.users}</div>
              <p className="text-xs text-slate-400 mt-1">Active users in system</p>
            </CardContent>
          </Card>

          <Card className="bg-slate-800/50 border-slate-700">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-xs sm:text-sm font-medium text-slate-200">Total Devices</CardTitle>
              <Boxes className="w-4 h-4 text-blue-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl sm:text-3xl font-bold text-white">{stats.devices}</div>
              <p className="text-xs text-slate-400 mt-1">Smart lockers registered</p>
            </CardContent>
          </Card>

          <Card className="bg-slate-800/50 border-slate-700">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-xs sm:text-sm font-medium text-slate-200">Active Alerts</CardTitle>
              <AlertTriangle className="w-4 h-4 text-orange-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl sm:text-3xl font-bold text-white">{stats.alerts}</div>
              <p className="text-xs text-slate-400 mt-1">Pending review</p>
            </CardContent>
          </Card>
        </div>

        {/* Tabs for Management */}
        <Card className="bg-slate-800/50 border-slate-700">
          <CardHeader className="pb-3 sm:pb-6">
            <CardTitle className="text-white text-lg sm:text-xl">Management</CardTitle>
            <CardDescription>Manage users, devices, and view system logs</CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="users" className="space-y-4">
              <TabsList className="bg-slate-700/50 w-full flex-wrap">
                <TabsTrigger value="users" className="data-[state=active]:bg-emerald-500 text-xs sm:text-sm">
                  Users
                </TabsTrigger>
                <TabsTrigger value="devices" className="data-[state=active]:bg-emerald-500 text-xs sm:text-sm">
                  Devices
                </TabsTrigger>
                <TabsTrigger value="logs" className="data-[state=active]:bg-emerald-500 text-xs sm:text-sm">
                  Access Logs
                </TabsTrigger>
              </TabsList>

              <TabsContent value="users">
                <AdminUsersTab token={token} />
              </TabsContent>

              <TabsContent value="devices">
                <AdminDevicesTab token={token} />
              </TabsContent>

              <TabsContent value="logs">
                <AdminLogsTab token={token} />
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
