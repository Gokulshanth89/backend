import express, { Request, Response } from 'express'
import { body, validationResult } from 'express-validator'
import { authenticate } from '../middleware/auth'
import Operation from '../models/Operation'

const router = express.Router()

// Get all operations
router.get('/', authenticate, async (req: Request, res: Response) => {
  try {
    const { type, status, company } = req.query
    const filter: any = {}

    if (type) filter.type = type
    if (status) filter.status = status
    if (company) filter.company = company

    const operations = await Operation.find(filter)
      .populate('company', 'name')
      .populate('employee', 'firstName lastName')
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
    body('type').isIn(['check-in', 'check-out', 'service-request', 'maintenance', 'other']),
    body('description').notEmpty().trim(),
    body('company').notEmpty(),
  ],
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req)
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() })
      }

      const operation = new Operation(req.body)
      await operation.save()
      await operation.populate('company', 'name')
      res.status(201).json(operation)
    } catch (error: any) {
      res.status(500).json({ message: 'Server error', error: error.message })
    }
  }
)

// Update operation
router.put('/:id', authenticate, async (req: Request, res: Response) => {
  try {
    const operation = await Operation.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    ).populate('company', 'name')
    if (!operation) {
      return res.status(404).json({ message: 'Operation not found' })
    }
    res.json(operation)
  } catch (error: any) {
    res.status(500).json({ message: 'Server error', error: error.message })
  }
})

// Delete operation
router.delete('/:id', authenticate, async (req: Request, res: Response) => {
  try {
    const operation = await Operation.findByIdAndDelete(req.params.id)
    if (!operation) {
      return res.status(404).json({ message: 'Operation not found' })
    }
    res.json({ message: 'Operation deleted successfully' })
  } catch (error: any) {
    res.status(500).json({ message: 'Server error', error: error.message })
  }
})

export default router



