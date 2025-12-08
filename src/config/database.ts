import mongoose from 'mongoose'
import globalConfig from './globalConfig'

const connectDB = async () => {
  try {
    // Validate MongoDB URI is set
    if (!globalConfig.mongodbURI || globalConfig.mongodbURI.trim() === '') {
      console.error('❌ MongoDB URI is not configured!')
      console.error('Please set MONGODB_URI or MONGO_URI in your .env file')
      console.error('Example: MONGODB_URI=mongodb://localhost:27017/hotel_management')
      process.exit(1)
    }

    // Use global config for MongoDB URI (supports both MONGODB_URI and MONGO_URI env vars)
    console.log(`Connecting to MongoDB: ${globalConfig.mongodbURI.replace(/\/\/[^:]+:[^@]+@/, '//***:***@')}`) // Hide credentials in logs
    await mongoose.connect(globalConfig.mongodbURI)
    
    console.log('✅ MongoDB Connected Successfully')
  } catch (error) {
    console.error('❌ MongoDB connection error:', error)
    console.error('Please check:')
    console.error('1. MongoDB is running')
    console.error('2. MONGODB_URI or MONGO_URI is correctly set in .env file')
    console.error('3. The connection string format is correct')
    process.exit(1)
  }
}

export default connectDB



