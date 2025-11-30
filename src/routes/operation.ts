import express, { Request, Response } from 'express'
import { body, validationResult } from 'express-validator'
import { authenticate } from '../middleware/auth'
import Operation from '../models/Operation'
import { validateOperationCompanyRelationships, validateCompanyExists } from '../utils/companyValidation'
import { getIO } from '../config/socket'

const router = express.Router()

// Get all operations
router.get('/', authenticate, async (req: Request, res: Response) => {
  try {
    const { type, status, company, assignedToDepartment, roomNumber, guestName } = req.query
    const filter: any = {}

    if (type) filter.type = type
    if (status) filter.status = status
    if (company) filter.company = company
    if (assignedToDepartment) filter.assignedToDepartment = assignedToDepartment
    if (roomNumber) filter.roomNumber = roomNumber
    if (guestName) filter.guestName = { $regex: guestName, $options: 'i' } // Case-insensitive search

    const operations = await Operation.find(filter)
      .populate('company', 'name')
      .populate('employee', 'firstName lastName')
      .populate('assignedBy', 'firstName lastName')
      .populate('service', 'name')
      .sort({ createdAt: -1 })
      .limit(100)

    res.json(operations)
  } catch (error: any) {
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
    if (!operation) {
      return res.status(404).json({ message: 'Operation not found' })
    }
    res.json(operation)
  } catch (error: any) {
    res.status(500).json({ message: 'Server error', error: error.message })
  }
})

// Create operation
router.post(
  '/',
  authenticate,
  [
    body('type').isIn(['check-in', 'check-out', 'service-request', 'maintenance', 'welfare-check', 'meal-marker', 'food-image', 'food-feedback', 'other']),
    body('description').notEmpty().trim(),
    body('company').notEmpty(),
    // Guest information validation (optional, but required for check-in/check-out)
    body('guestName').optional().trim(),
    body('numberOfPeople').optional().isInt({ min: 1 }),
    body('visitorsAllowed').optional().isBoolean(),
    body('durationOfStay').optional().isInt({ min: 1 }),
    body('checkInDate').optional().isISO8601(),
    body('checkOutDate').optional().isISO8601(),
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
        if (!req.body.guestName) {
          return res.status(400).json({ message: 'Guest name is required for check-in/check-out' })
        }
        if (!req.body.numberOfPeople) {
          return res.status(400).json({ message: 'Number of people is required for check-in/check-out' })
        }
        if (req.body.type === 'check-in' && !req.body.checkInDate) {
          req.body.checkInDate = new Date() // Default to current date if not provided
        }
        if (req.body.type === 'check-out' && !req.body.checkOutDate) {
          req.body.checkOutDate = new Date() // Default to current date if not provided
        }
      }

      // For service-request and maintenance, validate department assignment
      if (req.body.type === 'service-request' || req.body.type === 'maintenance') {
        if (!req.body.assignedToDepartment) {
          return res.status(400).json({ message: 'Department assignment is required for service requests and maintenance tasks' })
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

      const operation = new Operation(req.body)
      await operation.save()
      await operation.populate('company', 'name')
      await operation.populate('employee', 'firstName lastName')
      await operation.populate('assignedBy', 'firstName lastName')
      await operation.populate('service', 'name')
      
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



