import express, { Request, Response } from 'express'
import { body, validationResult } from 'express-validator'
import { authenticate, authorize } from '../middleware/auth'
import Service from '../models/Service'

const router = express.Router()

// Get all services
router.get('/', authenticate, async (req: Request, res: Response) => {
  try {
    const services = await Service.find()
      .populate('company', 'name')
      .sort({ createdAt: -1 })
    res.json(services)
  } catch (error: any) {
    res.status(500).json({ message: 'Server error', error: error.message })
  }
})

// Get service by ID
router.get('/:id', authenticate, async (req: Request, res: Response) => {
  try {
    const service = await Service.findById(req.params.id).populate('company', 'name')
    if (!service) {
      return res.status(404).json({ message: 'Service not found' })
    }
    res.json(service)
  } catch (error: any) {
    res.status(500).json({ message: 'Server error', error: error.message })
  }
})

// Create service
router.post(
  '/',
  authenticate,
  authorize('admin', 'manager'),
  [
    body('name').notEmpty().trim(),
    body('description').notEmpty().trim(),
    body('category').notEmpty().trim(),
    body('status').isIn(['active', 'inactive', 'pending']),
    body('company').notEmpty(),
  ],
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req)
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() })
      }

      const service = new Service(req.body)
      await service.save()
      await service.populate('company', 'name')
      res.status(201).json(service)
    } catch (error: any) {
      res.status(500).json({ message: 'Server error', error: error.message })
    }
  }
)

// Update service
router.put(
  '/:id',
  authenticate,
  authorize('admin', 'manager'),
  async (req: Request, res: Response) => {
    try {
      const service = await Service.findByIdAndUpdate(
        req.params.id,
        req.body,
        { new: true, runValidators: true }
      ).populate('company', 'name')
      if (!service) {
        return res.status(404).json({ message: 'Service not found' })
      }
      res.json(service)
    } catch (error: any) {
      res.status(500).json({ message: 'Server error', error: error.message })
    }
  }
)

// Delete service
router.delete('/:id', authenticate, authorize('admin'), async (req: Request, res: Response) => {
  try {
    const service = await Service.findByIdAndDelete(req.params.id)
    if (!service) {
      return res.status(404).json({ message: 'Service not found' })
    }
    res.json({ message: 'Service deleted successfully' })
  } catch (error: any) {
    res.status(500).json({ message: 'Server error', error: error.message })
  }
})

export default router



