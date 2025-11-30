import mongoose from 'mongoose'
import globalConfig from './globalConfig'

const connectDB = async () => {
  try {
    // Use global config for MongoDB URI (supports both MONGODB_URI and MONGO_URI env vars)
    await mongoose.connect(globalConfig.mongodbURI)
    
    console.log('MongoDB Connected Successfully')
  } catch (error) {
    console.error('MongoDB connection error:', error)
    process.exit(1)
  }
}

export default connectDB



