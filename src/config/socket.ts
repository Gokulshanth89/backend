import { Server as HttpServer } from 'http'
import { Server as SocketIOServer, Socket } from 'socket.io'
import jwt from 'jsonwebtoken'
import globalConfig from './globalConfig'

interface AuthenticatedSocket extends Socket {
  user?: {
    id: string
    email: string
    role: string
  }
}

let io: SocketIOServer | null = null

export const initializeSocket = (httpServer: HttpServer) => {
  io = new SocketIOServer(httpServer, {
    cors: {
      origin: globalConfig.frontendURL,
      methods: ['GET', 'POST'],
      credentials: true,
    },
  })

  // Authentication middleware for Socket.io
  io.use((socket: AuthenticatedSocket, next) => {
    const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.replace('Bearer ', '')

    if (!token) {
      return next(new Error('Authentication error: No token provided'))
    }

    try {
      const decoded = jwt.verify(token, globalConfig.jwtSecret) as {
        id: string
        email: string
        role: string
      }
      socket.user = decoded
      next()
    } catch (error) {
      next(new Error('Authentication error: Invalid token'))
    }
  })

  io.on('connection', (socket: AuthenticatedSocket) => {
    console.log(`User connected: ${socket.user?.email} (${socket.id})`)

    // Join user-specific room
    if (socket.user) {
      socket.join(`user:${socket.user.id}`)
      socket.join(`role:${socket.user.role}`)
    }

    // Handle disconnection
    socket.on('disconnect', () => {
      console.log(`User disconnected: ${socket.user?.email} (${socket.id})`)
    })

    // Handle join room (for filtering by company, department, etc.)
    socket.on('join:room', (room: string) => {
      socket.join(room)
      console.log(`User ${socket.user?.email} joined room: ${room}`)
    })

    socket.on('leave:room', (room: string) => {
      socket.leave(room)
      console.log(`User ${socket.user?.email} left room: ${room}`)
    })
  })

  return io
}

export const getIO = (): SocketIOServer => {
  if (!io) {
    throw new Error('Socket.io not initialized. Call initializeSocket first.')
  }
  return io
}
