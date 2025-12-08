import express, { Request, Response } from 'express'
import { body, validationResult } from 'express-validator'
import { authenticate, authorize } from '../middleware/auth'
import { enforceCompanyFilter } from '../middleware/companyFilter'
import Service from '../models/Service'
import { validateCompanyExists } from '../utils/companyValidation'
import { extractCompanyId } from '../utils/queryHelper'

const router = express.Router()

// Get all services - automatically filtered by user's company
router.get('/', authenticate, enforceCompanyFilter, async (req: any, res: Response) => {
  try {
    const { company } = req.query
    const filter: any = {}

    // Company filtering - admin users without company can see all
    const companyParam = company || req.userCompanyId
    
    if (companyParam) {
      const companyId = extractCompanyId(companyParam as string)
      if (companyId) {
        filter.company = companyId
        console.log(`Filtering services by company ID: ${companyId}`)
      } else {
        console.warn(`Invalid company parameter: ${companyParam}`)
        return res.status(400).json({ message: 'Invalid company parameter' })
      }
    } else if (req.isAdmin) {
      // Admin users without company can see all services
      console.log(`Admin user - fetching all services`)
    } else {
      if (req.userCompanyId) {
        filter.company = req.userCompanyId
        console.log(`Using user's company ID from middleware: ${req.userCompanyId}`)
      } else {
        return res.status(403).json({ message: 'Company information not available' })
      }
    }

    const services = await Service.find(filter)
      .populate('company', 'name')
      .sort({ createdAt: -1 })
    
    console.log(`Fetched ${services.length} services with filter:`, filter)
    res.json(services)
  } catch (error: any) {
    console.error('Error fetching services:', error)
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

// Create service - allow all authenticated users (mobile employees can create)
router.post(
  '/',
  authenticate,
  enforceCompanyFilter,
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

      // Validate company exists
      const companyValidation = await validateCompanyExists(req.body.company)
      if (!companyValidation.valid) {
        return res.status(400).json({ message: companyValidation.error })
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

// Update service - allow all authenticated users (mobile employees can update)
router.put(
  '/:id',
  authenticate,
  enforceCompanyFilter,
  async (req: Request, res: Response) => {
    try {
      // Validate company exists if company is being updated
      if (req.body.company) {
        const companyValidation = await validateCompanyExists(req.body.company)
        if (!companyValidation.valid) {
          return res.status(400).json({ message: companyValidation.error })
        }
      }

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

// Delete service - allow all authenticated users (mobile employees can delete)
router.delete('/:id', authenticate, enforceCompanyFilter, async (req: Request, res: Response) => {
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



