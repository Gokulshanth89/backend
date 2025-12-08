import express, { Request, Response } from 'express'
import { body, query, validationResult } from 'express-validator'
import { authenticate, authorize } from '../middleware/auth'
import { enforceCompanyFilter } from '../middleware/companyFilter'
import Rota from '../models/Rota'
import { validateCompanyExists, validateEmployeeBelongsToCompany } from '../utils/companyValidation'
import { extractCompanyId, extractEmployeeId } from '../utils/queryHelper'

const router = express.Router()

// Get rotas with optional filters - automatically filtered by user's company
router.get(
  '/',
  authenticate,
  enforceCompanyFilter,
  [
    query('company').optional().isString(),
    query('employee').optional().isString(),
    query('from').optional().isISO8601(),
    query('to').optional().isISO8601(),
  ],
  async (req: any, res: Response) => {
    try {
      const errors = validationResult(req)
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() })
      }

      const { company, employee, from, to } = req.query
      const filter: any = {}

      // Company filtering - admin users without company can see all
      const companyParam = company || req.userCompanyId
      
      if (companyParam) {
        const companyId = extractCompanyId(companyParam as string)
        if (companyId) {
          filter.company = companyId
          console.log(`Filtering rotas by company ID: ${companyId}`)
        } else {
          console.warn(`Invalid company parameter: ${companyParam}`)
          return res.status(400).json({ message: 'Invalid company parameter' })
        }
      } else if (req.isAdmin) {
        // Admin users without company can see all rotas
        console.log(`Admin user - fetching all rotas`)
      } else {
        return res.status(403).json({ message: 'Company information not available' })
      }
      if (employee) {
        const employeeId = extractEmployeeId(employee as string)
        if (employeeId) {
          filter.employee = employeeId
        }
      }
      if (from || to) {
        filter.date = {}
        if (from) filter.date.$gte = new Date(from as string)
        if (to) filter.date.$lte = new Date(to as string)
      }

      const rotas = await Rota.find(filter)
        .populate('employee', 'firstName lastName email department')
        .populate('company', 'name')
        .sort({ date: 1, 'employee.lastName': 1 })

      console.log(`Fetched ${rotas.length} rotas with filter:`, filter)
      res.json(rotas)
    } catch (error: any) {
      console.error('Error fetching rotas:', error)
      res.status(500).json({ message: 'Server error', error: error.message })
    }
  }
)

// Create rota entry
router.post(
  '/',
  authenticate,
  authorize('admin', 'manager'),
  [
    body('employee').notEmpty().withMessage('Employee is required'),
    body('company').notEmpty().withMessage('Company is required'),
    body('date').isISO8601().withMessage('Date is required'),
    body('shiftType')
      .isIn(['morning', 'afternoon', 'night', 'custom'])
      .withMessage('Invalid shift type'),
    body('startTime').optional().isString(),
    body('endTime').optional().isString(),
    body('notes').optional().isString(),
  ],
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req)
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() })
      }

      const { employee, company, date, shiftType, startTime, endTime, notes } = req.body

      // Validate company
      const companyValidation = await validateCompanyExists(company)
      if (!companyValidation.valid) {
        return res.status(400).json({ message: companyValidation.error })
      }

      // Validate employee belongs to company
      const employeeValidation = await validateEmployeeBelongsToCompany(employee, company)
      if (!employeeValidation.valid) {
        return res.status(400).json({ message: employeeValidation.error })
      }

      // Normalise date to start of day for uniqueness
      const rotaDate = new Date(date)
      rotaDate.setHours(0, 0, 0, 0)

      const rota = new Rota({
        employee,
        company,
        date: rotaDate,
        shiftType,
        startTime,
        endTime,
        notes,
      })

      await rota.save()
      await rota.populate('employee', 'firstName lastName email department')
      await rota.populate('company', 'name')

      res.status(201).json(rota)
    } catch (error: any) {
      if (error.code === 11000) {
        return res.status(400).json({
          message: 'A rota entry for this employee and date already exists for this company',
        })
      }

      res.status(500).json({ message: 'Server error', error: error.message })
    }
  }
)

// Update rota entry
router.put(
  '/:id',
  authenticate,
  authorize('admin', 'manager'),
  [
    body('shiftType')
      .optional()
      .isIn(['morning', 'afternoon', 'night', 'custom'])
      .withMessage('Invalid shift type'),
    body('date').optional().isISO8601(),
    body('startTime').optional().isString(),
    body('endTime').optional().isString(),
    body('notes').optional().isString(),
  ],
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req)
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() })
      }

      const updateData: any = { ...req.body }

      if (updateData.date) {
        const rotaDate = new Date(updateData.date)
        rotaDate.setHours(0, 0, 0, 0)
        updateData.date = rotaDate
      }

      const rota = await Rota.findByIdAndUpdate(req.params.id, updateData, {
        new: true,
        runValidators: true,
      })
        .populate('employee', 'firstName lastName email department')
        .populate('company', 'name')

      if (!rota) {
        return res.status(404).json({ message: 'Rota entry not found' })
      }

      res.json(rota)
    } catch (error: any) {
      if (error.code === 11000) {
        return res.status(400).json({
          message: 'A rota entry for this employee and date already exists for this company',
        })
      }

      res.status(500).json({ message: 'Server error', error: error.message })
    }
  }
)

// Delete rota entry
router.delete(
  '/:id',
  authenticate,
  authorize('admin', 'manager'),
  async (req: Request, res: Response) => {
    try {
      const rota = await Rota.findByIdAndDelete(req.params.id)
      if (!rota) {
        return res.status(404).json({ message: 'Rota entry not found' })
      }
      res.json({ message: 'Rota entry deleted successfully' })
    } catch (error: any) {
      res.status(500).json({ message: 'Server error', error: error.message })
    }
  }
)

export default router


