import mongoose, { Document, Schema } from 'mongoose'

export interface IRota extends Document {
  employee: mongoose.Types.ObjectId
  company: mongoose.Types.ObjectId
  date: Date
  shiftType: 'morning' | 'afternoon' | 'night' | 'custom'
  startTime?: string
  endTime?: string
  notes?: string
  createdAt: Date
  updatedAt: Date
}

const RotaSchema = new Schema<IRota>(
  {
    employee: {
      type: Schema.Types.ObjectId,
      ref: 'Employee',
      required: true,
    },
    company: {
      type: Schema.Types.ObjectId,
      ref: 'Company',
      required: true,
    },
    date: {
      type: Date,
      required: true,
    },
    shiftType: {
      type: String,
      enum: ['morning', 'afternoon', 'night', 'custom'],
      required: true,
    },
    startTime: {
      type: String,
    },
    endTime: {
      type: String,
    },
    notes: {
      type: String,
      trim: true,
    },
  },
  {
    timestamps: true,
  }
)

// Ensure one rota entry per employee per day per company
RotaSchema.index({ employee: 1, company: 1, date: 1 }, { unique: true })

export default mongoose.model<IRota>('Rota', RotaSchema)


