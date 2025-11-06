// Admin access logs tab
"use client"

import { useEffect, useState } from "react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { CheckCircle2, XCircle, AlertCircle } from "lucide-react"

interface AccessLog {
  id: number
  device_name: string
  full_name: string
  access_method: string
  status: string
  face_confidence: number
  is_spoofed: boolean
  created_at: string
}

export default function AdminLogsTab({ token }: { token: string | null }) {
  const [logs, setLogs] = useState<AccessLog[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    fetchLogs()
  }, [])

  const fetchLogs = async () => {
    if (!token) return
    try {
      const response = await fetch("/api/access-logs?limit=100", {
        headers: { Authorization: `Bearer ${token}` },
      })
      const data = await response.json()
      setLogs(data.logs || [])
    } catch (error) {
      console.error("Error fetching logs:", error)
    } finally {
      setIsLoading(false)
    }
  }

  if (isLoading) {
    return <div className="text-center py-8 text-slate-400">Loading logs...</div>
  }

  return (
    <div className="space-y-4">
      <p className="text-slate-300">Total access attempts: {logs.length}</p>

      <div className="overflow-x-auto">
        <Table>
          <TableHeader className="border-b border-slate-700">
            <TableRow className="hover:bg-transparent">
              <TableHead className="text-slate-300">Device</TableHead>
              <TableHead className="text-slate-300">User</TableHead>
              <TableHead className="text-slate-300">Method</TableHead>
              <TableHead className="text-slate-300">Status</TableHead>
              <TableHead className="text-slate-300">Confidence</TableHead>
              <TableHead className="text-slate-300">Spoofed</TableHead>
              <TableHead className="text-slate-300">Time</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {logs.map((log) => (
              <TableRow key={log.id} className="border-b border-slate-700 hover:bg-slate-700/30">
                <TableCell className="text-white font-medium">{log.device_name}</TableCell>
                <TableCell className="text-slate-300">{log.full_name || "Unknown"}</TableCell>
                <TableCell>
                  <span className="inline-block px-2 py-1 rounded text-xs font-medium bg-blue-500/20 text-blue-300">
                    {log.access_method}
                  </span>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    {log.status === "success" ? (
                      <>
                        <CheckCircle2 className="w-4 h-4 text-green-500" />
                        <span className="text-green-400 text-sm">Success</span>
                      </>
                    ) : log.status === "unauthorized" ? (
                      <>
                        <AlertCircle className="w-4 h-4 text-orange-500" />
                        <span className="text-orange-400 text-sm">Unauthorized</span>
                      </>
                    ) : (
                      <>
                        <XCircle className="w-4 h-4 text-red-500" />
                        <span className="text-red-400 text-sm">Failed</span>
                      </>
                    )}
                  </div>
                </TableCell>
                <TableCell className="text-slate-300">
                  {log.face_confidence ? `${(log.face_confidence * 100).toFixed(1)}%` : "-"}
                </TableCell>
                <TableCell>
                  <span className={log.is_spoofed ? "text-red-400 text-sm" : "text-green-400 text-sm"}>
                    {log.is_spoofed ? "Detected" : "No"}
                  </span>
                </TableCell>
                <TableCell className="text-slate-400 text-sm">{new Date(log.created_at).toLocaleString()}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
