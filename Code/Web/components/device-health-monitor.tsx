// Device health monitoring dashboard
"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts"

interface DeviceMetrics {
  uptime: number
  failedAttempts: number
  successfulAttempts: number
  avgResponseTime: number
}

export default function DeviceHealthMonitor({ deviceId, token }: { deviceId: number; token: string | null }) {
  const [metrics, setMetrics] = useState<DeviceMetrics | null>(null)
  const [chartData, setChartData] = useState<any[]>([])

  useEffect(() => {
    fetchMetrics()
  }, [deviceId, token])

  const fetchMetrics = async () => {
    if (!token) return

    try {
      // Generate metrics from access logs
      const response = await fetch(`/api/device-metrics/${deviceId}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      const data = await response.json()

      setMetrics(data.metrics)
      setChartData(data.chartData || [])
    } catch (error) {
      console.error("Error fetching metrics:", error)
    }
  }

  if (!metrics) return null

  return (
    <Card className="bg-slate-800/50 border-slate-700">
      <CardHeader>
        <CardTitle className="text-white">Device Health</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-slate-700/30 rounded p-3">
            <p className="text-slate-400 text-sm">Uptime</p>
            <p className="text-white text-lg font-semibold">{metrics.uptime}%</p>
          </div>
          <div className="bg-slate-700/30 rounded p-3">
            <p className="text-slate-400 text-sm">Avg Response</p>
            <p className="text-white text-lg font-semibold">{metrics.avgResponseTime}ms</p>
          </div>
          <div className="bg-slate-700/30 rounded p-3">
            <p className="text-slate-400 text-sm">Success Rate</p>
            <p className="text-white text-lg font-semibold">
              {Math.round((metrics.successfulAttempts / (metrics.successfulAttempts + metrics.failedAttempts)) * 100)}%
            </p>
          </div>
          <div className="bg-slate-700/30 rounded p-3">
            <p className="text-slate-400 text-sm">Failed Attempts</p>
            <p className="text-white text-lg font-semibold">{metrics.failedAttempts}</p>
          </div>
        </div>

        {chartData.length > 0 && (
          <div className="mt-6 -mx-6 -mb-6 bg-slate-900/50 p-4 rounded-b">
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis dataKey="name" stroke="#94a3b8" />
                <YAxis stroke="#94a3b8" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#1e293b",
                    border: "1px solid #475569",
                    borderRadius: "4px",
                  }}
                />
                <Legend />
                <Bar dataKey="success" stackId="a" fill="#10b981" name="Success" />
                <Bar dataKey="failed" stackId="a" fill="#ef4444" name="Failed" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
