import mongoose, { Document, Schema } from 'mongoose'

export interface IService extends Document {
  name: string
  description: string
  category: string
  status: 'active' | 'inactive' | 'pending'
  company: mongoose.Types.ObjectId
  createdAt: Date
  updatedAt: Date
}

const ServiceSchema = new Schema<IService>(
  {
    name: {
      type: String,
      required: true,
    },
    description: {
      type: String,
      required: true,
    },
    category: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      enum: ['active', 'inactive', 'pending'],
      default: 'pending',
    },
    company: {
      type: Schema.Types.ObjectId,
      ref: 'Company',
      required: true,
    },
  },
  {
    timestamps: true,
  }
)

export default mongoose.model<IService>('Service', ServiceSchema)



