"use client"

import type React from "react"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/components/auth-context"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { AlertCircle } from "lucide-react"

export default function RegisterPage() {
  const router = useRouter()
  const { register } = useAuth()
  const [fullName, setFullName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [error, setError] = useState("")
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")

    if (password !== confirmPassword) {
      setError("Mật khẩu không khớp")
      return
    }

    if (password.length < 6) {
      setError("Mật khẩu phải ít nhất 6 ký tự")
      return
    }

    setIsLoading(true)
    try {
      console.log("[smart-locker] Registering user:", email, fullName)
      await register(email, password, fullName)
      console.log("[smart-locker] Registration successful")
      router.push("/dashboard")
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "Đăng ký thất bại. Email có thể đã được sử dụng."
      console.error("[smart-locker] Registration error:", errorMsg)
      setError(errorMsg)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-linear-to-br from-red-50 to-white px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center mb-4">
            <img
              src="/Logo_PTIT_University.png"
              alt="PTIT Logo"
              className="h-20 w-20"
            />
          </div>
          <h1 className="text-4xl font-bold text-red-600">Smart Locker</h1>
          <p className="text-gray-600 mt-2 font-medium">Tạo tài khoản để quản lý tủ của bạn</p>
        </div>

        <Card className="border-2 border-red-200 shadow-lg">
          <CardHeader className="bg-red-50 border-b-2 border-red-200">
            <CardTitle className="text-red-700 text-2xl">Đăng Ký</CardTitle>
            <CardDescription className="text-gray-600">Tạo tài khoản mới để bắt đầu</CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-semibold text-gray-700">Họ và Tên</label>
                <Input
                  type="text"
                  placeholder="Nguyễn Văn A"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="border-2 border-gray-300 focus:border-red-500 focus:ring-red-500"
                  required
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold text-gray-700">Email</label>
                <Input
                  type="email"
                  placeholder="your@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="border-2 border-gray-300 focus:border-red-500 focus:ring-red-500"
                  required
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold text-gray-700">Mật Khẩu</label>
                <Input
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="border-2 border-gray-300 focus:border-red-500 focus:ring-red-500"
                  required
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold text-gray-700">Xác Nhận Mật Khẩu</label>
                <Input
                  type="password"
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="border-2 border-gray-300 focus:border-red-500 focus:ring-red-500"
                  required
                />
              </div>

              {error && (
                <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 p-3 rounded-lg border border-red-200">
                  <AlertCircle className="h-4 w-4" />
                  {error}
                </div>
              )}

              <Button
                type="submit"
                disabled={isLoading}
                className="w-full bg-red-600 hover:bg-red-700 text-white font-bold text-lg py-6 rounded-lg transition-colors"
              >
                {isLoading ? "Đang xử lý..." : "Đăng Ký"}
              </Button>
            </form>

            <div className="mt-6 pt-6 border-t border-gray-200">
              <p className="text-center text-gray-600 text-sm">
                Đã có tài khoản?{" "}
                <button
                  onClick={() => router.push("/login")}
                  className="text-red-600 font-bold hover:text-red-700 underline"
                >
                  Đăng nhập
                </button>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
