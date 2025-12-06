const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001"

export async function apiRequest(endpoint: string, options: RequestInit = {}) {
  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null

  const headers: HeadersInit = {
    ...options.headers,
  }

  if (!(options.body instanceof FormData)) {
    headers["Content-Type"] = "application/json"
  }

  if (token) {
    headers.Authorization = `Bearer ${token}`
  }

  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers,
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: response.statusText }))
    throw new Error(error.error || error.message || "API request failed")
  }

  return response.json()
}

export const api = {
  // Auth
  login: (credentials: { username: string; password: string }) =>
    apiRequest("/api/auth/login", {
      method: "POST",
      body: JSON.stringify(credentials),
    }),

  // Users
  getUsers: () => apiRequest("/api/users"),

  getUser: (id: number) => apiRequest(`/api/users/${id}`),

  registerUser: (formData: FormData) =>
    apiRequest("/api/users/register", {
      method: "POST",
      body: formData,
    }),

  updateUser: (id: number, data: any) =>
    apiRequest(`/api/users/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),

  deleteUser: (id: number) =>
    apiRequest(`/api/users/${id}`, {
      method: "DELETE",
    }),

  // Cabinets/Devices
  getCabinets: () => apiRequest("/api/cabinets"),

  getCabinet: (id: number) => apiRequest(`/api/cabinets/${id}`),

  createDevice: (data: any) =>
    apiRequest("/api/cabinets", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  updateDevice: (id: number, data: any) =>
    apiRequest(`/api/cabinets/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),

  deleteDevice: (id: number) =>
    apiRequest(`/api/cabinets/${id}`, {
      method: "DELETE",
    }),

  unlockCabinet: (cabinetId: string) =>
    apiRequest(`/api/cabinets/${cabinetId}/unlock`, {
      method: "POST",
    }),

  lockCabinet: (cabinetId: string) =>
    apiRequest(`/api/cabinets/${cabinetId}/lock`, {
      method: "POST",
    }),

  // Access Logs
  getAccessLogs: (limit = 50) => apiRequest(`/api/access-logs?limit=${limit}`),

  getCabinetLogs: (cabinetId: string, limit = 50) => apiRequest(`/api/cabinets/${cabinetId}/logs?limit=${limit}`),

  // Face Recognition
  verifyFace: (formData: FormData) =>
    apiRequest("/api/face/verify", {
      method: "POST",
      body: formData,
    }),
}
