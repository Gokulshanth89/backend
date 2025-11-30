import dotenv from 'dotenv'
import path from 'path'

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../../.env') })

interface GlobalConfig {
  port: number
  networkIP: string
  frontendURL: string
  apiURL: string
  socketURL: string
  mongodbURI: string
  jwtSecret: string
  nodeEnv: string
}

// Get network IP from environment or use default
const getNetworkIP = (): string => {
  // Priority: 1. NETWORK_IP, 2. BACKEND_IP, 3. Default to localhost
  const networkIP = process.env.NETWORK_IP || process.env.BACKEND_IP || 'localhost'
  return networkIP
}

const networkIP = getNetworkIP()
const port = Number(process.env.PORT) || 5050

export const globalConfig: GlobalConfig = {
  port,
  networkIP,
  frontendURL: process.env.FRONTEND_URL || 'http://localhost:3000',
  apiURL: process.env.API_URL || `http://${networkIP}:${port}`,
  socketURL: process.env.SOCKET_URL || `http://${networkIP}:${port}`,
  // Support both MONGODB_URI and MONGO_URI for compatibility
  mongodbURI: process.env.MONGODB_URI || process.env.MONGO_URI || 'mongodb://localhost:27017/hotel_management',
  jwtSecret: process.env.JWT_SECRET || 'your-secret-key-change-this-in-production',
  nodeEnv: process.env.NODE_ENV || 'development',
}

// Helper function to get full API URL
export const getAPIURL = (): string => {
  return globalConfig.apiURL
}

// Helper function to get full Socket URL
export const getSocketURL = (): string => {
  return globalConfig.socketURL
}

// Helper function to get server addresses
export const getServerAddresses = (): string[] => {
  return [
    `http://localhost:${globalConfig.port}`,
    `http://127.0.0.1:${globalConfig.port}`,
    `http://${globalConfig.networkIP}:${globalConfig.port}`,
  ]
}

// Log configuration on startup
export const logConfig = () => {
  console.log('\n=== Global Configuration ===')
  console.log(`Network IP: ${globalConfig.networkIP}`)
  console.log(`Port: ${globalConfig.port}`)
  console.log(`API URL: ${globalConfig.apiURL}`)
  console.log(`Socket URL: ${globalConfig.socketURL}`)
  console.log(`Frontend URL: ${globalConfig.frontendURL}`)
  console.log(`Environment: ${globalConfig.nodeEnv}`)
  console.log('===========================\n')
}

export default globalConfig

