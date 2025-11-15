import express, { Request, Response } from 'express'
import { body, validationResult } from 'express-validator'
import mongoose from 'mongoose'
import { authenticate, authorize } from '../middleware/auth'
import Employee from '../models/Employee'
import { sendWelcomeEmail } from '../utils/emailService'
import { validateCompanyExists } from '../utils/companyValidation'

const router = express.Router()

// Get all employees
router.get('/', authenticate, async (req: Request, res: Response) => {
  try {
    const employees = await Employee.find({ isActive: true })
      .populate('company', 'name')
      .sort({ createdAt: -1 })
    res.json(employees)
  } catch (error: any) {
    res.status(500).json({ message: 'Server error', error: error.message })
  }
})

// Resend welcome email to employee (must be before /:id route)
router.post('/:id/resend-welcome-email', authenticate, authorize('admin', 'manager'), async (req: Request, res: Response) => {
  try {
    const employeeId = req.params.id
    console.log('Resending welcome email for employee ID:', employeeId)

    // Validate ObjectId format
    if (!mongoose.Types.ObjectId.isValid(employeeId)) {
      console.error('Invalid ObjectId format:', employeeId)
      return res.status(400).json({ message: 'Invalid employee ID format' })
    }

    const employee = await Employee.findById(employeeId)
    if (!employee) {
      console.error('Employee not found with ID:', employeeId)
      return res.status(404).json({ message: 'Employee not found' })
    }

    console.log('Found employee:', {
      id: employee._id,
      email: employee.email,
      firstName: employee.firstName,
      lastName: employee.lastName,
      isActive: employee.isActive
    })

    if (!employee.isActive) {
      return res.status(400).json({ message: 'Cannot send email to inactive employee' })
    }

    // Validate required fields
    if (!employee.email || !employee.firstName || !employee.lastName) {
      console.error('Employee missing required fields:', {
        email: !!employee.email,
        firstName: !!employee.firstName,
        lastName: !!employee.lastName
      })
      return res.status(400).json({ 
        message: 'Employee missing required information (email, firstName, or lastName)' 
      })
    }

    // Send welcome email
    console.log('Attempting to send welcome email to:', employee.email)
    const emailResult = await sendWelcomeEmail(employee.email, employee.firstName, employee.lastName)
    
    if (emailResult.success) {
      console.log('Welcome email sent successfully to:', employee.email)
      res.json({ message: 'Welcome email sent successfully', email: employee.email })
    } else {
      console.error('Failed to send welcome email to:', employee.email, emailResult.error)
      res.status(500).json({ 
        message: emailResult.error || 'Failed to send welcome email. Please check email configuration.' 
      })
    }
  } catch (error: any) {
    console.error('Error resending welcome email:', error)
    console.error('Error stack:', error.stack)
    res.status(500).json({ 
      message: 'Server error', 
      error: error.message || 'An unexpected error occurred' 
    })
  }
})

// Get employee by ID
router.get('/:id', authenticate, async (req: Request, res: Response) => {
  try {
    const employee = await Employee.findById(req.params.id).populate('company', 'name')
    if (!employee) {
      return res.status(404).json({ message: 'Employee not found' })
    }
    res.json(employee)
  } catch (error: any) {
    res.status(500).json({ message: 'Server error', error: error.message })
  }
})

// Create employee
router.post(
  '/',
  authenticate,
  authorize('admin', 'manager'),
  [
    body('firstName').notEmpty().trim(),
    body('lastName').notEmpty().trim(),
    body('email').isEmail().normalizeEmail(),
    body('phone').notEmpty().trim(),
    body('role').notEmpty().trim(),
    body('department').notEmpty().trim(),
    body('startDate').isISO8601(),
    body('company').notEmpty(),
  ],
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req)
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() })
      }

      // Validate company exists
      const companyValidation = await validateCompanyExists(req.body.company)
      if (!companyValidation.valid) {
        return res.status(400).json({ message: companyValidation.error })
      }

      // Check if employee with this email already exists
      const existingEmployee = await Employee.findOne({ email: req.body.email })
      if (existingEmployee) {
        return res.status(400).json({ 
          message: 'An employee with this email address already exists',
          error: 'Email already registered'
        })
      }

      const employee = new Employee(req.body)
      await employee.save()
      await employee.populate('company', 'name')
      
      // Send welcome email with login instructions
      try {
        const emailResult = await sendWelcomeEmail(employee.email, employee.firstName, employee.lastName)
        if (emailResult.success) {
          console.log(`Welcome email sent to ${employee.email}`)
        } else {
          console.error(`Failed to send welcome email to ${employee.email}:`, emailResult.error)
        }
      } catch (emailError) {
        console.error('Failed to send welcome email:', emailError)
        // Don't fail the request if email fails, just log it
      }
      
      res.status(201).json(employee)
    } catch (error: any) {
      // Handle duplicate key error (MongoDB E11000)
      if (error.code === 11000) {
        const field = Object.keys(error.keyPattern || {})[0] || 'email'
        return res.status(400).json({ 
          message: `An employee with this ${field} already exists`,
          error: 'Duplicate entry'
        })
      }
      
      // Handle validation errors
      if (error.name === 'ValidationError') {
        const messages = Object.values(error.errors).map((err: any) => err.message)
        return res.status(400).json({ 
          message: messages.join(', '),
          error: 'Validation error'
        })
      }
      
      console.error('Employee creation error:', error)
      res.status(500).json({ message: 'Server error', error: error.message })
    }
  }
)

// Update employee
router.put(
  '/:id',
  authenticate,
  authorize('admin', 'manager'),
  async (req: Request, res: Response) => {
    try {
      // Validate company exists if company is being updated
      if (req.body.company) {
        const companyValidation = await validateCompanyExists(req.body.company)
        if (!companyValidation.valid) {
          return res.status(400).json({ message: companyValidation.error })
        }
      }

      // Check if email is being updated and if it already exists for another employee
      if (req.body.email) {
        const existingEmployee = await Employee.findOne({ 
          email: req.body.email,
          _id: { $ne: req.params.id } // Exclude current employee
        })
        if (existingEmployee) {
          return res.status(400).json({ 
            message: 'An employee with this email address already exists',
            error: 'Email already registered'
          })
        }
      }

      const employee = await Employee.findByIdAndUpdate(
        req.params.id,
        req.body,
        { new: true, runValidators: true }
      ).populate('company', 'name')
      if (!employee) {
        return res.status(404).json({ message: 'Employee not found' })
      }
      res.json(employee)
    } catch (error: any) {
      // Handle duplicate key error (MongoDB E11000)
      if (error.code === 11000) {
        const field = Object.keys(error.keyPattern || {})[0] || 'email'
        return res.status(400).json({ 
          message: `An employee with this ${field} already exists`,
          error: 'Duplicate entry'
        })
      }
      
      // Handle validation errors
      if (error.name === 'ValidationError') {
        const messages = Object.values(error.errors).map((err: any) => err.message)
        return res.status(400).json({ 
          message: messages.join(', '),
          error: 'Validation error'
        })
      }
      
      console.error('Employee update error:', error)
      res.status(500).json({ message: 'Server error', error: error.message })
    }
  }
)

// Delete employee (soft delete)
router.delete('/:id', authenticate, authorize('admin'), async (req: Request, res: Response) => {
  try {
    const employee = await Employee.findByIdAndUpdate(
      req.params.id,
      { isActive: false },
      { new: true }
    )
    if (!employee) {
      return res.status(404).json({ message: 'Employee not found' })
    }
    res.json({ message: 'Employee deleted successfully' })
  } catch (error: any) {
    res.status(500).json({ message: 'Server error', error: error.message })
  }
})

export default router



