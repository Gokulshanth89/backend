import express, { Request, Response } from 'express'
import { body, validationResult } from 'express-validator'
import Food from '../models/Food'
import { authenticate, authorize } from '../middleware/auth'
import { enforceCompanyFilter } from '../middleware/companyFilter'
import { extractCompanyId } from '../utils/queryHelper'

const router = express.Router()

// Get all food items - automatically filtered by user's company
router.get('/', authenticate, enforceCompanyFilter, async (req: any, res: Response) => {
  try {
    const { company, category, isAvailable } = req.query
    const filter: any = {}

    // Company filtering - admin users without company can see all
    const companyParam = company || req.userCompanyId
    
    if (companyParam) {
      const companyId = extractCompanyId(companyParam as string)
      if (companyId) {
        filter.company = companyId
        console.log(`Filtering foods by company ID: ${companyId}`)
      } else {
        console.warn(`Invalid company parameter: ${companyParam}`)
        return res.status(400).json({ message: 'Invalid company parameter' })
      }
    } else if (req.isAdmin) {
      // Admin users without company can see all foods
      console.log(`Admin user - fetching all foods`)
    } else {
      if (req.userCompanyId) {
        filter.company = req.userCompanyId
        console.log(`Using user's company ID from middleware: ${req.userCompanyId}`)
      } else {
        return res.status(403).json({ message: 'Company information not available' })
      }
    }
    
    if (category) {
      filter.category = category
    }
    if (isAvailable !== undefined) {
      filter.isAvailable = isAvailable === 'true'
    }

    const foods = await Food.find(filter)
      .populate('company', 'name')
      .sort({ category: 1, name: 1 })

    console.log(`Fetched ${foods.length} foods with filter:`, filter)
    res.json(foods)
  } catch (error: any) {
    console.error('Error fetching foods:', error)
    res.status(500).json({ message: 'Server error', error: error.message })
  }
})

// Get food item by ID
router.get('/:id', authenticate, async (req: Request, res: Response) => {
  try {
    const food = await Food.findById(req.params.id).populate('company', 'name')
    if (!food) {
      return res.status(404).json({ message: 'Food item not found' })
    }
    res.json(food)
  } catch (error: any) {
    res.status(500).json({ message: 'Server error', error: error.message })
  }
})

// Create food item (Admin/Manager only)
router.post(
  '/',
  authenticate,
  authorize('admin', 'manager'),
  [
    body('name').trim().notEmpty().withMessage('Name is required'),
    body('description').trim().notEmpty().withMessage('Description is required'),
    body('category')
      .isIn(['breakfast', 'lunch', 'dinner', 'snack', 'beverage', 'dessert', 'other'])
      .withMessage('Invalid category'),
    body('company').notEmpty().withMessage('Company is required'),
    body('price')
      .optional({ nullable: true, checkFalsy: true })
      .custom((value) => {
        if (value === undefined || value === null || value === '') return true
        const num = parseFloat(value)
        return !isNaN(num) && num >= 0
      })
      .withMessage('Price must be a positive number'),
    body('imageUrl')
      .optional({ nullable: true, checkFalsy: true })
      .custom((value) => {
        if (!value || value === '') return true
        // Allow base64 data URLs
        if (value.startsWith('data:image/')) return true
        // Validate URL format
        try {
          new URL(value)
          return true
        } catch {
          return false
        }
      })
      .withMessage('Image URL must be a valid URL or base64 data URL'),
    body('isAvailable').optional().isBoolean().withMessage('isAvailable must be a boolean'),
  ],
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req)
      if (!errors.isEmpty()) {
        return res.status(400).json({ 
          message: 'Validation failed',
          errors: errors.array() 
        })
      }

      // Prepare food data
      const foodData: any = {
        name: req.body.name,
        description: req.body.description,
        category: req.body.category,
        company: req.body.company,
        isAvailable: req.body.isAvailable !== undefined ? req.body.isAvailable : true,
      }

      // Add optional fields only if they exist
      if (req.body.price !== undefined && req.body.price !== null && req.body.price !== '') {
        foodData.price = parseFloat(req.body.price)
      }
      if (req.body.imageUrl !== undefined && req.body.imageUrl !== null && req.body.imageUrl !== '') {
        foodData.imageUrl = req.body.imageUrl
      }

      const food = new Food(foodData)
      await food.save()
      await food.populate('company', 'name')

      res.status(201).json(food)
    } catch (error: any) {
      res.status(500).json({ message: 'Server error', error: error.message })
    }
  }
)

// Update food item (Admin/Manager only)
router.put(
  '/:id',
  authenticate,
  authorize('admin', 'manager'),
    [
    body('name').optional().trim().notEmpty().withMessage('Name cannot be empty'),
    body('description').optional().trim().notEmpty().withMessage('Description cannot be empty'),
    body('category')
      .optional()
      .isIn(['breakfast', 'lunch', 'dinner', 'snack', 'beverage', 'dessert', 'other'])
      .withMessage('Invalid category'),
    body('price')
      .optional({ nullable: true, checkFalsy: true })
      .custom((value) => {
        if (value === undefined || value === null || value === '') return true
        const num = parseFloat(value)
        return !isNaN(num) && num >= 0
      })
      .withMessage('Price must be a positive number'),
    body('imageUrl')
      .optional({ nullable: true, checkFalsy: true })
      .custom((value) => {
        if (!value || value === '') return true
        // Allow base64 data URLs
        if (value.startsWith('data:image/')) return true
        // Validate URL format
        try {
          new URL(value)
          return true
        } catch {
          return false
        }
      })
      .withMessage('Image URL must be a valid URL or base64 data URL'),
    body('isAvailable').optional().isBoolean().withMessage('isAvailable must be a boolean'),
  ],
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req)
      if (!errors.isEmpty()) {
        return res.status(400).json({ 
          message: 'Validation failed',
          errors: errors.array() 
        })
      }

      // Prepare update data
      const updateData: any = {}
      if (req.body.name !== undefined) updateData.name = req.body.name
      if (req.body.description !== undefined) updateData.description = req.body.description
      if (req.body.category !== undefined) updateData.category = req.body.category
      if (req.body.isAvailable !== undefined) updateData.isAvailable = req.body.isAvailable
      
      // Handle optional fields
      if (req.body.price !== undefined && req.body.price !== null && req.body.price !== '') {
        updateData.price = parseFloat(req.body.price)
      } else if (req.body.price === null || req.body.price === '') {
        updateData.price = undefined
      }
      
      if (req.body.imageUrl !== undefined) {
        if (req.body.imageUrl === null || req.body.imageUrl === '') {
          updateData.imageUrl = undefined
        } else {
          updateData.imageUrl = req.body.imageUrl
        }
      }

      const food = await Food.findByIdAndUpdate(req.params.id, updateData, {
        new: true,
        runValidators: true,
      }).populate('company', 'name')

      if (!food) {
        return res.status(404).json({ message: 'Food item not found' })
      }

      res.json(food)
    } catch (error: any) {
      res.status(500).json({ message: 'Server error', error: error.message })
    }
  }
)

// Delete food item (Admin/Manager only)
router.delete('/:id', authenticate, authorize('admin', 'manager'), async (req: Request, res: Response) => {
  try {
    const food = await Food.findByIdAndDelete(req.params.id)
    if (!food) {
      return res.status(404).json({ message: 'Food item not found' })
    }
    res.json({ message: 'Food item deleted successfully' })
  } catch (error: any) {
    res.status(500).json({ message: 'Server error', error: error.message })
  }
})

export default router

