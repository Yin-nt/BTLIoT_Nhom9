export interface WebSocketClient {
  userId: number
  socketId: string
  lastPing: number
}

export interface AlertMessage {
  type: "device_unlocked" | "unauthorized_access" | "spoofing_detected" | "device_locked"
  deviceId: number
  deviceName: string
  userId: number
  message: string
  timestamp: string
  alertType?: string
}

// Store active WebSocket connections globally
export const wsClients: Map<string, WebSocketClient> = new Map()

// Broadcast alert to specific user's all connections
export function broadcastToUser(userId: number, alert: AlertMessage) {
  console.log(`[smart-locker] Broadcasting to user ${userId}:`, alert.message)

  // In production, you'd use a proper WebSocket library like 'ws' or 'socket.io'
  // For now, we'll use Server-Sent Events (SSE) which is simpler for Next.js
  wsClients.forEach((client, socketId) => {
    if (client.userId === userId) {
      console.log(`[smart-locker] Client ${socketId} would receive alert`)
    }
  })
}

// Broadcast to all admins
export function broadcastToAdmins(alert: AlertMessage) {
  console.log(`[smart-locker] Broadcasting to all admins:`, alert.message)
  // Implementation for admin notifications
}

// Register new client
export function registerClient(socketId: string, userId: number) {
  wsClients.set(socketId, {
    userId,
    socketId,
    lastPing: Date.now(),
  })
  console.log(`[smart-locker] Client registered: ${socketId}`)
}

// Unregister client
export function unregisterClient(socketId: string) {
  wsClients.delete(socketId)
  console.log(`[smart-locker] Client unregistered: ${socketId}`)
}
