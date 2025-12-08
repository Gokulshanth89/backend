import express from 'express'
import cors from 'cors'
import { createServer } from 'http'
import connectDB from './config/database'
import { initializeSocket } from './config/socket'
import globalConfig, { getServerAddresses, logConfig } from './config/globalConfig'
import authRoutes from './routes/auth'
import employeeAuthRoutes from './routes/employeeAuth'
import companyRoutes from './routes/company'
import employeeRoutes from './routes/employee'
import serviceRoutes from './routes/service'
import operationRoutes from './routes/operation'
import reportRoutes from './routes/report'
import rotaRoutes from './routes/rota'
import foodRoutes from './routes/food'
import roomRoutes from './routes/room'

const app = express()
const httpServer = createServer(app)

// Connect to MongoDB
connectDB()

// Initialize Socket.io
initializeSocket(httpServer)

// Middleware
// CORS configuration - allow both frontend and mobile app requests
app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps or Postman)
    if (!origin) return callback(null, true)
    
    // Allow frontend URL
    if (origin === globalConfig.frontendURL) {
      return callback(null, true)
    }
    
    // Allow any localhost or network IP requests (for mobile app development)
    const allowedOrigins = [
      globalConfig.frontendURL,
      `http://localhost:${globalConfig.port}`,
      `http://127.0.0.1:${globalConfig.port}`,
      `http://${globalConfig.networkIP}:${globalConfig.port}`,
      `http://192.168.8.163:${globalConfig.port}`,
    ]
    
    // In development, allow all origins for mobile app testing
    if (globalConfig.nodeEnv === 'development') {
      return callback(null, true)
    }
    
    // In production, check against allowed origins
    if (allowedOrigins.includes(origin)) {
      return callback(null, true)
    }
    
    callback(new Error('Not allowed by CORS'))
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}))
app.use(express.json())
app.use(express.urlencoded({ extended: true }))

// Routes
app.use('/api/auth', authRoutes)
app.use('/api/employee-auth', employeeAuthRoutes)
app.use('/api/companies', companyRoutes)
app.use('/api/employees', employeeRoutes)
app.use('/api/services', serviceRoutes)
app.use('/api/operations', operationRoutes)
app.use('/api/reports', reportRoutes)
app.use('/api/rotas', rotaRoutes)
app.use('/api/foods', foodRoutes)
app.use('/api/rooms', roomRoutes)

// Root API route
app.get('/api', (req, res) => {
  res.json({ 
    status: 'OK', 
    message: 'Hotel Management System API',
    version: '1.0.0',
    endpoints: {
      health: '/api/health',
      employeeAuth: {
        requestOTP: 'POST /api/employee-auth/request-otp',
        verifyOTP: 'POST /api/employee-auth/verify-otp'
      }
    }
  })
})

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'Server is running' })
})

// Error handling middleware
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error(err.stack)
  res.status(err.status || 500).json({
    message: err.message || 'Internal Server Error',
    error: process.env.NODE_ENV === 'development' ? err : {},
  })
})

httpServer.listen(globalConfig.port, '0.0.0.0', () => {
  // Log configuration
  logConfig()
  
  console.log(`\n Server is running on port ${globalConfig.port}`)
  console.log(` Server accessible at:`)
  const addresses = getServerAddresses()
  addresses.forEach((address, index) => {
    const label = index === addresses.length - 1 ? ' (Network IP)' : ''
    console.log(`   ${index + 1}. ${address}${label}`)
  })
  console.log(`\n Socket.io server initialized for real-time updates`)
  console.log(` Make sure your mobile device is on the same WiFi network!`)
  console.log(`\n To change network IP, set NETWORK_IP in backend/.env file\n`)
})



