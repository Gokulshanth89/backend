import express, { Request, Response } from 'express'
import { authenticate } from '../middleware/auth'
import Company from '../models/Company'
import Employee from '../models/Employee'
import Service from '../models/Service'
import Operation from '../models/Operation'

const router = express.Router()

// Get dashboard statistics
router.get('/dashboard', authenticate, async (req: Request, res: Response) => {
  try {
    const totalCompanies = await Company.countDocuments({ isActive: true })
    const totalEmployees = await Employee.countDocuments({ isActive: true })
    const activeServices = await Service.countDocuments({ status: 'active' })
    
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const todayOperations = await Operation.countDocuments({
      createdAt: { $gte: today },
    })

    res.json({
      totalCompanies,
      totalEmployees,
      activeServices,
      todayOperations,
    })
  } catch (error: any) {
    res.status(500).json({ message: 'Server error', error: error.message })
  }
})

// Get occupancy report
router.get('/occupancy', authenticate, async (req: Request, res: Response) => {
  try {
    const { startDate, endDate, companyId } = req.query
    
    const filter: any = {
      type: { $in: ['check-in', 'check-out'] },
    }

    if (startDate && endDate) {
      filter.createdAt = {
        $gte: new Date(startDate as string),
        $lte: new Date(endDate as string),
      }
    }

    if (companyId) {
      filter.company = companyId
    }

    const operations = await Operation.find(filter)
      .populate('company', 'name')
      .sort({ createdAt: 1 })

    res.json(operations)
  } catch (error: any) {
    res.status(500).json({ message: 'Server error', error: error.message })
  }
})

// Get service usage report
router.get('/service-usage', authenticate, async (req: Request, res: Response) => {
  try {
    const { startDate, endDate, companyId } = req.query
    
    const filter: any = {
      type: 'service-request',
    }

    if (startDate && endDate) {
      filter.createdAt = {
        $gte: new Date(startDate as string),
        $lte: new Date(endDate as string),
      }
    }

    if (companyId) {
      filter.company = companyId
    }

    const operations = await Operation.find(filter)
      .populate('service', 'name category')
      .populate('company', 'name')
      .sort({ createdAt: -1 })

    res.json(operations)
  } catch (error: any) {
    res.status(500).json({ message: 'Server error', error: error.message })
  }
})

export default router



