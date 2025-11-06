// Authentication context for managing user state
"use client"

import type React from "react"
import { createContext, useContext, useEffect, useState } from "react"

interface User {
  id: number
  email: string
  fullName: string
  role: "user" | "admin"
}

interface AuthContextType {
  user: User | null
  token: string | null
  isLoading: boolean
  login: (email: string, password: string) => Promise<void>
  register: (email: string, password: string, fullName: string) => Promise<void>
  logout: () => void
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [token, setToken] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    // Restore session from localStorage
    try {
      const savedToken = localStorage.getItem("token")
      const savedUser = localStorage.getItem("user")

      // Only parse if both exist and savedUser is not the string "undefined"
      if (savedToken && savedUser && savedUser !== "undefined") {
        setToken(savedToken)
        setUser(JSON.parse(savedUser))
      }
    } catch (error) {
      console.error("[smart-locker] Failed to restore session:", error)
      localStorage.removeItem("token")
      localStorage.removeItem("user")
      localStorage.removeItem("userRole")
    }
    setIsLoading(false)
  }, [])

  const login = async (email: string, password: string) => {
    const response = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    })

    if (!response.ok) throw new Error("Login failed")

    const { user: userData, token: newToken } = await response.json()
    setUser(userData)
    setToken(newToken)
    localStorage.setItem("token", newToken)
    localStorage.setItem("user", JSON.stringify(userData))
    localStorage.setItem("userRole", userData.role)
  }

  const register = async (email: string, password: string, fullName: string) => {
    const response = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password, fullName }),
    })

    if (!response.ok) throw new Error("Registration failed")

    const { user: userData, token: newToken } = await response.json()
    setUser(userData)
    setToken(newToken)
    localStorage.setItem("token", newToken)
    localStorage.setItem("user", JSON.stringify(userData))
    localStorage.setItem("userRole", userData.role)
  }

  const logout = () => {
    setUser(null)
    setToken(null)
    localStorage.removeItem("token")
    localStorage.removeItem("user")
    localStorage.removeItem("userRole")
  }

  return (
    <AuthContext.Provider value={{ user, token, isLoading, login, register, logout }}>{children}</AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider")
  }
  return context
}
