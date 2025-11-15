import express, { Request, Response } from 'express'
import { body, validationResult } from 'express-validator'
import jwt from 'jsonwebtoken'
import User from '../models/User'

const router = express.Router()

// Register
router.post(
  '/register',
  [
    body('email').isEmail().normalizeEmail(),
    body('password').isLength({ min: 6 }),
    body('firstName').notEmpty().trim(),
    body('lastName').notEmpty().trim(),
    body('role').isIn(['admin', 'manager', 'staff']),
  ],
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req)
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() })
      }

      const { email, password, firstName, lastName, role } = req.body

      // Check if user exists
      const existingUser = await User.findOne({ email })
      if (existingUser) {
        return res.status(400).json({ message: 'User already exists' })
      }

      // Create user
      const user = new User({
        email,
        password,
        firstName,
        lastName,
        role: role || 'staff',
      })

      await user.save()

      // Generate JWT
      const token = jwt.sign(
        { id: user._id, email: user.email, role: user.role, type: 'user' },
        process.env.JWT_SECRET || 'your-secret-key',
        { expiresIn: process.env.JWT_EXPIRES_IN || '1d' }
      )

      res.status(201).json({
        token,
        user: {
          id: user._id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role,
        },
      })
    } catch (error: any) {
      console.error('Registration error:', error)
      res.status(500).json({ message: 'Server error', error: error.message })
    }
  }
)

// Login
router.post(
  '/login',
  [
    body('email').isEmail().normalizeEmail(),
    body('password').notEmpty(),
  ],
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req)
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() })
      }

      const { email, password } = req.body

      // Find user
      const user = await User.findOne({ email })
      if (!user) {
        return res.status(401).json({ message: 'Invalid credentials' })
      }

      // Check password
      const isMatch = await user.comparePassword(password)
      if (!isMatch) {
        return res.status(401).json({ message: 'Invalid credentials' })
      }

      // Check if user is active
      if (!user.isActive) {
        return res.status(401).json({ message: 'Account is deactivated' })
      }

      // Generate JWT
      const token = jwt.sign(
        { id: user._id, email: user.email, role: user.role, type: 'user' },
        process.env.JWT_SECRET || 'your-secret-key',
        { expiresIn: process.env.JWT_EXPIRES_IN || '1d' }
      )

      res.json({
        token,
        user: {
          id: user._id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role,
        },
      })
    } catch (error: any) {
      console.error('Login error:', error)
      res.status(500).json({ message: 'Server error', error: error.message })
    }
  }
)

export default router



