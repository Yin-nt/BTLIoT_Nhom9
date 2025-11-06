// Landing page / Login redirect
"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"

export default function Home() {
  const router = useRouter()

  useEffect(() => {
    const token = localStorage.getItem("token")
    if (token) {
      // User is logged in, redirect to dashboard
      const role = localStorage.getItem("userRole")
      router.push(role === "admin" ? "/admin-dashboard" : "/dashboard")
    } else {
      // No token, redirect to login
      router.push("/login")
    }
  }, [router])

  return (
    <div className="flex items-center justify-center min-h-screen">
      <p>Redirecting...</p>
    </div>
  )
}
