import mongoose, { Document, Schema } from 'mongoose'

export interface ICompany extends Document {
  name: string
  address: string
  city: string
  postcode: string
  phone: string
  email: string
  description?: string
  roomCount?: number
  isActive: boolean
  createdAt: Date
  updatedAt: Date
}

const CompanySchema = new Schema<ICompany>(
  {
    name: {
      type: String,
      required: true,
    },
    address: {
      type: String,
      required: true,
    },
    city: {
      type: String,
      required: true,
    },
    postcode: {
      type: String,
      required: true,
    },
    phone: {
      type: String,
      required: true,
    },
    email: {
      type: String,
      required: true,
      lowercase: true,
    },
    description: {
      type: String,
    },
    roomCount: {
      type: Number,
      min: 0,
      default: 0,
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

export default mongoose.model<ICompany>('Company', CompanySchema)



