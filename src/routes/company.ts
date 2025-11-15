import express, { Request, Response } from 'express'
import { body, validationResult } from 'express-validator'
import { authenticate, authorize } from '../middleware/auth'
import Company from '../models/Company'

const router = express.Router()

// Get all companies
router.get('/', authenticate, async (req: Request, res: Response) => {
  try {
    const companies = await Company.find({ isActive: true }).sort({ createdAt: -1 })
    res.json(companies)
  } catch (error: any) {
    res.status(500).json({ message: 'Server error', error: error.message })
  }
})

// Get company by ID
router.get('/:id', authenticate, async (req: Request, res: Response) => {
  try {
    const company = await Company.findById(req.params.id)
    if (!company) {
      return res.status(404).json({ message: 'Company not found' })
    }
    res.json(company)
  } catch (error: any) {
    res.status(500).json({ message: 'Server error', error: error.message })
  }
})

// Create company
router.post(
  '/',
  authenticate,
  authorize('admin', 'manager'),
  [
    body('name').notEmpty().trim(),
    body('address').notEmpty().trim(),
    body('city').notEmpty().trim(),
    body('postcode').notEmpty().trim(),
    body('phone').notEmpty().trim(),
    body('email').isEmail().normalizeEmail(),
  ],
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req)
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() })
      }

      const company = new Company(req.body)
      await company.save()
      res.status(201).json(company)
    } catch (error: any) {
      res.status(500).json({ message: 'Server error', error: error.message })
    }
  }
)

// Update company
router.put(
  '/:id',
  authenticate,
  authorize('admin', 'manager'),
  async (req: Request, res: Response) => {
    try {
      const company = await Company.findByIdAndUpdate(
        req.params.id,
        req.body,
        { new: true, runValidators: true }
      )
      if (!company) {
        return res.status(404).json({ message: 'Company not found' })
      }
      res.json(company)
    } catch (error: any) {
      res.status(500).json({ message: 'Server error', error: error.message })
    }
  }
)

// Delete company (soft delete)
router.delete('/:id', authenticate, authorize('admin'), async (req: Request, res: Response) => {
  try {
    const company = await Company.findByIdAndUpdate(
      req.params.id,
      { isActive: false },
      { new: true }
    )
    if (!company) {
      return res.status(404).json({ message: 'Company not found' })
    }
    res.json({ message: 'Company deleted successfully' })
  } catch (error: any) {
    res.status(500).json({ message: 'Server error', error: error.message })
  }
})

export default router



