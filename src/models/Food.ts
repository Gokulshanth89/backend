import mongoose, { Document, Schema } from 'mongoose'

export interface IFood extends Document {
  name: string
  description: string
  category: 'breakfast' | 'lunch' | 'dinner' | 'snack' | 'beverage' | 'dessert' | 'other'
  imageUrl?: string
  price?: number
  isAvailable: boolean
  company: mongoose.Types.ObjectId
  createdAt: Date
  updatedAt: Date
}

const FoodSchema = new Schema<IFood>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      required: true,
      trim: true,
    },
    category: {
      type: String,
      enum: ['breakfast', 'lunch', 'dinner', 'snack', 'beverage', 'dessert', 'other'],
      required: true,
    },
    imageUrl: {
      type: String,
      trim: true,
    },
    price: {
      type: Number,
      min: 0,
    },
    isAvailable: {
      type: Boolean,
      default: true,
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

export default mongoose.model<IFood>('Food', FoodSchema)

