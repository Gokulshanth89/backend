import express, { Request, Response } from 'express'
import { body, validationResult } from 'express-validator'
import jwt from 'jsonwebtoken'
import Employee from '../models/Employee'
import OTP from '../models/OTP'
import { sendOTPEmail } from '../utils/emailService'

const router = express.Router()

// Generate random 6-digit OTP
const generateOTP = (): string => {
  return Math.floor(100000 + Math.random() * 900000).toString()
}

// Request OTP for employee login
router.post(
  '/request-otp',
  [body('email').isEmail().normalizeEmail()],
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req)
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() })
      }

      const { email } = req.body

      // Check if employee exists
      const employee = await Employee.findOne({ email, isActive: true })
      if (!employee) {
        return res.status(404).json({ message: 'Employee not found or inactive' })
      }

      // Generate OTP
      const otp = generateOTP()
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000) // 10 minutes

      // Delete any existing OTPs for this email
      await OTP.deleteMany({ email })

      // Save new OTP
      const otpRecord = new OTP({
        email,
        otp,
        expiresAt,
      })
      await otpRecord.save()

      // Send OTP via email
      const emailSent = await sendOTPEmail(email, otp)
      if (!emailSent) {
        await OTP.deleteOne({ email, otp })
        return res.status(500).json({ message: 'Failed to send OTP email' })
      }

      res.json({
        message: 'OTP sent successfully to your email',
        expiresIn: 600, // 10 minutes in seconds
      })
    } catch (error: any) {
      console.error('Request OTP error:', error)
      res.status(500).json({ message: 'Server error', error: error.message })
    }
  }
)

// Verify OTP and login
router.post(
  '/verify-otp',
  [
    body('email').isEmail().normalizeEmail(),
    body('otp').isLength({ min: 6, max: 6 }).isNumeric(),
  ],
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req)
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() })
      }

      const { email, otp } = req.body

      // Find OTP record
      const otpRecord = await OTP.findOne({ email, otp })
      if (!otpRecord) {
        return res.status(401).json({ message: 'Invalid or expired OTP' })
      }

      // Check if OTP is expired
      if (new Date() > otpRecord.expiresAt) {
        await OTP.deleteOne({ email, otp })
        return res.status(401).json({ message: 'OTP has expired' })
      }

      // Find employee
      const employee = await Employee.findOne({ email, isActive: true })
      if (!employee) {
        await OTP.deleteOne({ email, otp })
        return res.status(404).json({ message: 'Employee not found or inactive' })
      }

      // Delete used OTP
      await OTP.deleteOne({ email, otp })

      // Generate JWT token
      const token = jwt.sign(
        {
          id: employee._id,
          email: employee.email,
          role: 'employee',
          type: 'employee',
        },
        process.env.JWT_SECRET || 'your-secret-key',
        {
          expiresIn: process.env.JWT_EXPIRES_IN || '1d',
        }
      )

      res.json({
        token,
        employee: {
          id: employee._id,
          email: employee.email,
          firstName: employee.firstName,
          lastName: employee.lastName,
          role: employee.role,
          department: employee.department,
          company: employee.company,
        },
        message: 'Login successful',
      })
    } catch (error: any) {
      console.error('Verify OTP error:', error)
      res.status(500).json({ message: 'Server error', error: error.message })
    }
  }
)

export default router

