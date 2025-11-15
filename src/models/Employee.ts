import mongoose, { Document, Schema } from 'mongoose'

export interface IEmployee extends Document {
  firstName: string
  lastName: string
  email: string
  phone: string
  role: string
  department: string
  startDate: Date
  company: mongoose.Types.ObjectId
  isActive: boolean
  createdAt: Date
  updatedAt: Date
}

const EmployeeSchema = new Schema<IEmployee>(
  {
    firstName: {
      type: String,
      required: true,
    },
    lastName: {
      type: String,
      required: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    phone: {
      type: String,
      required: true,
    },
    role: {
      type: String,
      required: true,
    },
    department: {
      type: String,
      required: true,
    },
    startDate: {
      type: Date,
      required: true,
    },
    company: {
      type: Schema.Types.ObjectId,
      ref: 'Company',
      required: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
)

export default mongoose.model<IEmployee>('Employee', EmployeeSchema)



