import mongoose, { Document, Schema } from 'mongoose'

export interface IOperation extends Document {
  type: 'check-in' | 'check-out' | 'service-request' | 'maintenance' | 'other'
  description: string
  company: mongoose.Types.ObjectId
  employee?: mongoose.Types.ObjectId
  service?: mongoose.Types.ObjectId
  status: 'pending' | 'in-progress' | 'completed' | 'cancelled'
  createdAt: Date
  updatedAt: Date
}

const OperationSchema = new Schema<IOperation>(
  {
    type: {
      type: String,
      enum: ['check-in', 'check-out', 'service-request', 'maintenance', 'other'],
      required: true,
    },
    description: {
      type: String,
      required: true,
    },
    company: {
      type: Schema.Types.ObjectId,
      ref: 'Company',
      required: true,
    },
    employee: {
      type: Schema.Types.ObjectId,
      ref: 'Employee',
    },
    service: {
      type: Schema.Types.ObjectId,
      ref: 'Service',
    },
    status: {
      type: String,
      enum: ['pending', 'in-progress', 'completed', 'cancelled'],
      default: 'pending',
    },
  },
  {
    timestamps: true,
  }
)

export default mongoose.model<IOperation>('Operation', OperationSchema)



