import mongoose, { Document, Schema } from 'mongoose'

export interface IOperation extends Document {
  type: 'check-in' | 'check-out' | 'service-request' | 'maintenance' | 'welfare-check' | 'meal-marker' | 'food-image' | 'food-feedback' | 'other'
  description: string
  company: mongoose.Types.ObjectId
  employee?: mongoose.Types.ObjectId
  service?: mongoose.Types.ObjectId
  status: 'pending' | 'in-progress' | 'completed' | 'cancelled'
  // Guest information (for check-in/check-out)
  guestName?: string
  numberOfPeople?: number
  visitorsAllowed?: boolean
  durationOfStay?: number // in days
  checkInDate?: Date
  checkOutDate?: Date
  roomNumber?: string
  // Services and preferences
  servicesEnabled?: string[] // Array of service IDs or names
  hotelFoodRequired?: boolean
  foodPreferences?: string
  specialRequests?: string
  // Task assignment
  assignedToDepartment?: string // 'housekeeping', 'food-beverage', 'operations', 'reception'
  assignedBy?: mongoose.Types.ObjectId // Reception employee who assigned the task
  createdAt: Date
  updatedAt: Date
}

const OperationSchema = new Schema<IOperation>(
  {
    type: {
      type: String,
      enum: ['check-in', 'check-out', 'service-request', 'maintenance', 'welfare-check', 'meal-marker', 'food-image', 'food-feedback', 'other'],
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
    // Guest information (for check-in/check-out)
    guestName: {
      type: String,
      trim: true,
    },
    numberOfPeople: {
      type: Number,
      min: 1,
    },
    visitorsAllowed: {
      type: Boolean,
      default: false,
    },
    durationOfStay: {
      type: Number, // in days
      min: 1,
    },
    checkInDate: {
      type: Date,
    },
    checkOutDate: {
      type: Date,
    },
    roomNumber: {
      type: String,
      trim: true,
      required: true,
    },
    // Services and preferences
    servicesEnabled: {
      type: [String], // Array of service IDs or names
      default: [],
    },
    hotelFoodRequired: {
      type: Boolean,
      default: false,
    },
    foodPreferences: {
      type: String,
      trim: true,
    },
    specialRequests: {
      type: String,
      trim: true,
    },
    // Task assignment
    assignedToDepartment: {
      type: String,
      enum: ['housekeeping', 'food-beverage', 'operations', 'reception', null],
      default: null,
    },
    assignedBy: {
      type: Schema.Types.ObjectId,
      ref: 'Employee',
    },
  },
  {
    timestamps: true,
  }
)

export default mongoose.model<IOperation>('Operation', OperationSchema)



