// Admin users management tab
"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Trash2, Plus } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"

interface User {
  id: number
  email: string
  full_name: string
  role: string
  is_active: boolean
  created_at: string
}

export default function AdminUsersTab({ token }: { token: string | null }) {
  const [users, setUsers] = useState<User[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [newUser, setNewUser] = useState({ email: "", fullName: "", role: "user" })

  useEffect(() => {
    fetchUsers()
  }, [])

  const fetchUsers = async () => {
    if (!token) return
    try {
      const response = await fetch("/api/users", {
        headers: { Authorization: `Bearer ${token}` },
      })
      const data = await response.json()
      setUsers(data.users || [])
    } catch (error) {
      console.error("Error fetching users:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleAddUser = async () => {
    if (!token || !newUser.email || !newUser.fullName) return

    try {
      const response = await fetch("/api/users", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(newUser),
      })

      if (response.ok) {
        setNewUser({ email: "", fullName: "", role: "user" })
        setIsDialogOpen(false)
        fetchUsers()
      }
    } catch (error) {
      console.error("Error adding user:", error)
    }
  }

  if (isLoading) {
    return <div className="text-center py-8 text-slate-400">Loading users...</div>
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <p className="text-slate-300">{users.length} users in system</p>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-emerald-500 hover:bg-emerald-600 text-white">
              <Plus className="w-4 h-4 mr-2" />
              Add User
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-slate-800 border-slate-700">
            <DialogHeader>
              <DialogTitle className="text-white">Add New User</DialogTitle>
              <DialogDescription>Create a new user account for the system</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-slate-200">Email</label>
                <Input
                  type="email"
                  value={newUser.email}
                  onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                  className="bg-slate-900/50 border-slate-600 text-white mt-1"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-slate-200">Full Name</label>
                <Input
                  type="text"
                  value={newUser.fullName}
                  onChange={(e) => setNewUser({ ...newUser, fullName: e.target.value })}
                  className="bg-slate-900/50 border-slate-600 text-white mt-1"
                />
              </div>
              <Button onClick={handleAddUser} className="w-full bg-emerald-500 hover:bg-emerald-600 text-white">
                Create User
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="overflow-x-auto">
        <Table>
          <TableHeader className="border-b border-slate-700">
            <TableRow className="hover:bg-transparent">
              <TableHead className="text-slate-300">Email</TableHead>
              <TableHead className="text-slate-300">Name</TableHead>
              <TableHead className="text-slate-300">Role</TableHead>
              <TableHead className="text-slate-300">Status</TableHead>
              <TableHead className="text-slate-300">Joined</TableHead>
              <TableHead className="text-slate-300">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.map((user) => (
              <TableRow key={user.id} className="border-b border-slate-700 hover:bg-slate-700/30">
                <TableCell className="text-white">{user.email}</TableCell>
                <TableCell className="text-slate-300">{user.full_name}</TableCell>
                <TableCell>
                  <span
                    className={`inline-block px-2 py-1 rounded text-xs font-medium ${
                      user.role === "admin" ? "bg-orange-500/20 text-orange-300" : "bg-emerald-500/20 text-emerald-300"
                    }`}
                  >
                    {user.role}
                  </span>
                </TableCell>
                <TableCell>
                  <span
                    className={`inline-block px-2 py-1 rounded text-xs font-medium ${
                      user.is_active ? "bg-green-500/20 text-green-300" : "bg-red-500/20 text-red-300"
                    }`}
                  >
                    {user.is_active ? "Active" : "Inactive"}
                  </span>
                </TableCell>
                <TableCell className="text-slate-400 text-sm">
                  {new Date(user.created_at).toLocaleDateString()}
                </TableCell>
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
