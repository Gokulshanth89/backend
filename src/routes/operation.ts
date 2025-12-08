import express, { Request, Response } from 'express'
import { body, validationResult } from 'express-validator'
import { authenticate } from '../middleware/auth'
import { enforceCompanyFilter } from '../middleware/companyFilter'
import Operation from '../models/Operation'
import { validateOperationCompanyRelationships, validateCompanyExists } from '../utils/companyValidation'
import { getIO } from '../config/socket'
import { extractCompanyId, extractEmployeeId } from '../utils/queryHelper'

const router = express.Router()

// Get all operations - automatically filtered by user's company
router.get('/', authenticate, enforceCompanyFilter, async (req: any, res: Response) => {
  try {
    const { type, status, company, assignedToDepartment, roomNumber, guestName } = req.query
    const filter: any = {}

    // Company filtering - admin users without company can see all
    if (company) {
      const companyId = extractCompanyId(company as string)
      if (companyId) {
        filter.company = companyId
        console.log(`Filtering operations by company ID: ${companyId}`)
      } else {
        console.warn(`Invalid company parameter: ${company}`)
        return res.status(400).json({ message: 'Invalid company parameter' })
      }
    } else {
      // Use user's company from middleware (if available)
      if (req.userCompanyId) {
        filter.company = req.userCompanyId
        console.log(`Using user's company ID from middleware: ${req.userCompanyId}`)
      } else if (req.isAdmin) {
        // Admin users without company can see all operations
        console.log(`Admin user - fetching all operations`)
      } else {
        return res.status(403).json({ message: 'Company information not available' })
      }
    }

    if (type) filter.type = type
    if (status) filter.status = status
    if (assignedToDepartment) filter.assignedToDepartment = assignedToDepartment
    if (roomNumber) filter.roomNumber = roomNumber
    if (guestName) filter.guestName = { $regex: guestName, $options: 'i' } // Case-insensitive search

    const operations = await Operation.find(filter)
      .populate('company', 'name')
      .populate('employee', 'firstName lastName')
      .populate('assignedBy', 'firstName lastName')
      .populate('service', 'name')
      .populate('foodItems', 'name description category imageUrl price')
      .sort({ createdAt: -1 })
      // Removed limit to allow fetching all operations for company

    console.log(`Fetched ${operations.length} operations with filter:`, filter)
    res.json(operations)
  } catch (error: any) {
    console.error('Error fetching operations:', error)
    res.status(500).json({ message: 'Server error', error: error.message })
  }
})

// Get operation by ID
router.get('/:id', authenticate, async (req: Request, res: Response) => {
  try {
    const operation = await Operation.findById(req.params.id)
      .populate('company', 'name')
      .populate('employee', 'firstName lastName')
      .populate('service', 'name')
      .populate('foodItems', 'name description category imageUrl price')
    if (!operation) {
      return res.status(404).json({ message: 'Operation not found' })
    }
    res.json(operation)
  } catch (error: any) {
    res.status(500).json({ message: 'Server error', error: error.message })
  }
})

// Create operation - automatically uses user's company
router.post(
  '/',
  authenticate,
  enforceCompanyFilter,
  [
    body('type').isIn(['check-in', 'check-out', 'service-request', 'maintenance', 'welfare-check', 'meal-marker', 'food-image', 'food-feedback', 'other']),
    body('description').notEmpty().trim(),
    body('company').notEmpty(),
    // Guest information validation (optional, but required for check-in/check-out)
    body('guestName').optional().trim(),
    body('numberOfPeople').optional().isInt({ min: 1 }),
    body('visitorsAllowed').optional().isBoolean(),
    body('durationOfStay').optional().isInt({ min: 1 }),
    body('checkInDate').optional().custom((value) => {
      if (!value) return true
      // Try to parse as ISO8601 date
      const date = new Date(value)
      return !isNaN(date.getTime())
    }).withMessage('Invalid check-in date format'),
    body('checkOutDate').optional().custom((value) => {
      if (!value) return true
      // Try to parse as ISO8601 date
      const date = new Date(value)
      return !isNaN(date.getTime())
    }).withMessage('Invalid check-out date format'),
    body('roomNumber').optional().trim(),
    body('servicesEnabled').optional().isArray(),
    body('hotelFoodRequired').optional().isBoolean(),
    body('foodPreferences').optional().trim(),
    body('specialRequests').optional().trim(),
    body('assignedToDepartment').optional().isIn(['housekeeping', 'food-beverage', 'operations', 'reception']),
    body('assignedBy').optional(),
  ],
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req)
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() })
      }

      // Room number is mandatory for all operations
      if (!req.body.roomNumber || req.body.roomNumber.trim() === '') {
        return res.status(400).json({ message: 'Room number is required for all operations' })
      }

      // For check-in/check-out, validate required guest fields
      if (req.body.type === 'check-in' || req.body.type === 'check-out') {
        if (!req.body.guestName || req.body.guestName.trim() === '') {
          return res.status(400).json({ message: 'Guest name is required for check-in/check-out' })
        }
        if (!req.body.numberOfPeople || req.body.numberOfPeople < 1) {
          return res.status(400).json({ message: 'Number of people is required and must be at least 1 for check-in/check-out' })
        }
        // Parse and set dates
        if (req.body.type === 'check-in') {
          if (req.body.checkInDate) {
            req.body.checkInDate = new Date(req.body.checkInDate)
          } else {
            req.body.checkInDate = new Date() // Default to current date if not provided
          }
        }
        if (req.body.type === 'check-out') {
          if (req.body.checkOutDate) {
            req.body.checkOutDate = new Date(req.body.checkOutDate)
          } else {
            req.body.checkOutDate = new Date() // Default to current date if not provided
          }
        }
      }

      // For service-request and maintenance, validate department assignment
      if (req.body.type === 'service-request' || req.body.type === 'maintenance') {
        if (!req.body.assignedToDepartment) {
          return res.status(400).json({ message: 'Department assignment is required for service requests and maintenance tasks' })
        }
      }

      // Extract and normalize company ID
      // Company should already be set by enforceCompanyFilter middleware
      console.log('Received company value:', req.body.company, 'Type:', typeof req.body.company)
      
      let companyId: string | null = null
      if (req.body.company) {
        companyId = extractCompanyId(req.body.company)
      }
      
      // Fallback to user's company from middleware if not provided or invalid
      if (!companyId && (req as any).userCompanyId) {
        companyId = (req as any).userCompanyId
        console.log('Using user company ID from middleware:', companyId)
      }
      
      if (!companyId) {
        console.error('Failed to extract company ID from:', req.body.company)
        return res.status(400).json({ 
          message: 'Invalid company ID provided. Please ensure you are logged in with a valid company account.',
          received: req.body.company,
          type: typeof req.body.company
        })
      }
      req.body.company = companyId
      console.log('Using company ID for operation:', companyId)

      // Extract and normalize employee ID if provided
      if (req.body.employee) {
        const employeeId = extractEmployeeId(req.body.employee)
        if (employeeId) {
          req.body.employee = employeeId
        }
      }

      // Extract and normalize assignedBy ID if provided
      if (req.body.assignedBy) {
        const assignedById = extractEmployeeId(req.body.assignedBy)
        if (assignedById) {
          req.body.assignedBy = assignedById
        }
      }

      // Validate company relationships
      const companyValidation = await validateOperationCompanyRelationships(
        req.body.company,
        req.body.employee,
        req.body.service,
        req.body.assignedBy
      )
      if (!companyValidation.valid) {
        return res.status(400).json({ message: companyValidation.error })
      }

      console.log('Creating operation with data:', {
        type: req.body.type,
        company: req.body.company,
        employee: req.body.employee,
        guestName: req.body.guestName,
        roomNumber: req.body.roomNumber,
      })

      const operation = new Operation(req.body)
      await operation.save()
      await operation.populate('company', 'name')
      await operation.populate('employee', 'firstName lastName')
      await operation.populate('assignedBy', 'firstName lastName')
      await operation.populate('service', 'name')
      await operation.populate('foodItems', 'name description category imageUrl price')
      
      // Emit Socket.io event for new operation
      try {
        const io = getIO()
        io.emit('operation:created', operation)
        if (operation.company) {
          io.to(`company:${operation.company._id}`).emit('operation:created', operation)
        }
        if (operation.assignedToDepartment) {
          io.to(`department:${operation.assignedToDepartment}`).emit('operation:created', operation)
        }
      } catch (error) {
        console.error('Error emitting Socket.io event:', error)
      }
      
      res.status(201).json(operation)
    } catch (error: any) {
      res.status(500).json({ message: 'Server error', error: error.message })
    }
  }
)

// Update operation
router.put('/:id', authenticate, async (req: Request, res: Response) => {
  try {
    // Get existing operation to check company
    const existingOperation = await Operation.findById(req.params.id)
    if (!existingOperation) {
      return res.status(404).json({ message: 'Operation not found' })
    }

    // Use existing company if not provided in update
    const companyId = req.body.company || existingOperation.company.toString()

    // Validate company relationships if company, employee, service, or assignedBy is being updated
    if (req.body.company || req.body.employee || req.body.service || req.body.assignedBy) {
      const companyValidation = await validateOperationCompanyRelationships(
        companyId,
        req.body.employee,
        req.body.service,
        req.body.assignedBy
      )
      if (!companyValidation.valid) {
        return res.status(400).json({ message: companyValidation.error })
      }
    }

    const operation = await Operation.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    )
      .populate('company', 'name')
      .populate('employee', 'firstName lastName')
      .populate('assignedBy', 'firstName lastName')
      .populate('service', 'name')
      .populate('foodItems', 'name description category imageUrl price')
    if (!operation) {
      return res.status(404).json({ message: 'Operation not found' })
    }
    
    // Emit Socket.io event for updated operation
    try {
      const io = getIO()
      io.emit('operation:updated', operation)
      if (operation.company) {
        io.to(`company:${operation.company._id}`).emit('operation:updated', operation)
      }
      if (operation.assignedToDepartment) {
        io.to(`department:${operation.assignedToDepartment}`).emit('operation:updated', operation)
      }
    } catch (error) {
      console.error('Error emitting Socket.io event:', error)
    }
    
    res.json(operation)
  } catch (error: any) {
    res.status(500).json({ message: 'Server error', error: error.message })
  }
})

// Delete operation
router.delete('/:id', authenticate, async (req: Request, res: Response) => {
  try {
    const operation = await Operation.findById(req.params.id)
    if (!operation) {
      return res.status(404).json({ message: 'Operation not found' })
    }
    
    const companyId = operation.company?.toString()
    const department = operation.assignedToDepartment
    
    await Operation.findByIdAndDelete(req.params.id)
    
    // Emit Socket.io event for deleted operation
    try {
      const io = getIO()
      io.emit('operation:deleted', { id: req.params.id })
      if (companyId) {
        io.to(`company:${companyId}`).emit('operation:deleted', { id: req.params.id })
      }
      if (department) {
        io.to(`department:${department}`).emit('operation:deleted', { id: req.params.id })
      }
    } catch (error) {
      console.error('Error emitting Socket.io event:', error)
    }
    
    res.json({ message: 'Operation deleted successfully' })
  } catch (error: any) {
    res.status(500).json({ message: 'Server error', error: error.message })
  }
})

export default router



