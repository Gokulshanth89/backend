import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import path from 'path'
import connectDB from './config/database'
import authRoutes from './routes/auth'
import employeeAuthRoutes from './routes/employeeAuth'
import companyRoutes from './routes/company'
import employeeRoutes from './routes/employee'
import serviceRoutes from './routes/service'
import operationRoutes from './routes/operation'
import reportRoutes from './routes/report'

// Load environment variables from backend/.env
dotenv.config({ path: path.resolve(__dirname, '../.env') })

const app = express()
const PORT = process.env.PORT || 5000

// Connect to MongoDB
connectDB()

// Middleware
app.use(cors())
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

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`)
})



