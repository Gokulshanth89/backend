import mongoose, { Document, Schema } from 'mongoose'

export interface IOTP extends Document {
  email: string
  otp: string
  expiresAt: Date
  createdAt: Date
}

const OTPSchema = new Schema<IOTP>(
  {
    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    otp: {
      type: String,
      required: true,
    },
    expiresAt: {
      type: Date,
      required: true,
      index: { expireAfterSeconds: 0 }, // Auto-delete expired OTPs
    },
  },
  {
    timestamps: true,
  }
)

// Create index for faster lookups
OTPSchema.index({ email: 1, otp: 1 })

export default mongoose.model<IOTP>('OTP', OTPSchema)

