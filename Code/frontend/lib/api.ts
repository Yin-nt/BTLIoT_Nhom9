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

  changePassword: (userId: number, data: { currentPassword: string; newPassword: string }) =>
    apiRequest(`/api/users/${userId}/change-password`, {
      method: "POST",
      body: JSON.stringify(data),
    }),

  // Cabinets/Devices
  getCabinets: () => apiRequest("/api/cabinets"),

  getCabinet: (id: number) => apiRequest(`/api/cabinets/${id}`),

  createDevice: (data: { cabinet_id: string; name: string; location: string }) =>
    apiRequest("/api/cabinets", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  updateDevice: (id: number, data: { name: string; location: string }) =>
    apiRequest(`/api/cabinets/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),

  deleteDevice: (id: number) =>
    apiRequest(`/api/cabinets/${id}`, {
      method: "DELETE",
    }),

  unlockCabinet: (cabinetId: number) =>
    apiRequest(`/api/cabinets/${cabinetId}/unlock`, {
      method: "POST",
    }),

  lockCabinet: (cabinetId: number) =>
    apiRequest(`/api/cabinets/${cabinetId}/lock`, {
      method: "POST",
    }),

  assignCabinetOwner: (cabinetId: number, ownerId: number) =>
    apiRequest(`/api/cabinets/${cabinetId}/assign-owner`, {
      method: "POST",
      body: JSON.stringify({ owner_id: ownerId }),
    }),

  requestCabinetAccess: (data: any) =>
    apiRequest("/api/cabinets/request-access", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  getCabinetRequests: () => apiRequest("/api/cabinets/requests"),

  approveCabinetRequest: (requestId: number) =>
    apiRequest(`/api/cabinets/requests/${requestId}/approve`, {
      method: "POST",
    }),

  rejectCabinetRequest: (requestId: number) =>
    apiRequest(`/api/cabinets/requests/${requestId}/reject`, {
      method: "POST",
    }),

  // Access Logs
  getAccessLogs: (limit = 50) => apiRequest(`/api/access-logs?limit=${limit}`),

  getCabinetLogs: (cabinetId: string, limit = 50) => apiRequest(`/api/cabinets/${cabinetId}/logs?limit=${limit}`),

  // Alerts
  getAlerts: (limit = 20) => apiRequest(`/api/cabinets/alerts?limit=${limit}`),

  // Face Recognition
  verifyFace: (formData: FormData) =>
    apiRequest("/api/face/verify", {
      method: "POST",
      body: formData,
    }),
}
