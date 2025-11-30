import express, { Request, Response } from 'express'
import { authenticate } from '../middleware/auth'
import Company from '../models/Company'
import Employee from '../models/Employee'
import Service from '../models/Service'
import Operation from '../models/Operation'
import PDFDocument from 'pdfkit'

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

    // Additional stats
    const pendingOperations = await Operation.countDocuments({ status: 'pending' })
    const inProgressOperations = await Operation.countDocuments({ status: 'in-progress' })
    const completedOperations = await Operation.countDocuments({ status: 'completed' })
    const todayCheckIns = await Operation.countDocuments({
      type: 'check-in',
      createdAt: { $gte: today },
    })
    const todayCheckOuts = await Operation.countDocuments({
      type: 'check-out',
      createdAt: { $gte: today },
    })

    // Get recent operations (last 10)
    const recentOperations = await Operation.find()
      .populate('company', 'name')
      .populate('employee', 'firstName lastName')
      .populate('assignedBy', 'firstName lastName')
      .sort({ createdAt: -1 })
      .limit(10)
      .lean()

    res.json({
      totalCompanies,
      totalEmployees,
      activeServices,
      todayOperations,
      pendingOperations,
      inProgressOperations,
      completedOperations,
      todayCheckIns,
      todayCheckOuts,
      recentOperations,
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

// Get company details with rooms and employees
router.get('/company-details/:companyId', authenticate, async (req: Request, res: Response) => {
  try {
    const { companyId } = req.params
    const { startDate, endDate } = req.query

    const dateFilter: any = {}
    if (startDate && endDate) {
      dateFilter.createdAt = {
        $gte: new Date(startDate as string),
        $lte: new Date(endDate as string),
      }
    }

    // Get company info
    const company = await Company.findById(companyId).lean()
    if (!company) {
      return res.status(404).json({ message: 'Company not found' })
    }

    // Get all operations for this company
    const operations = await Operation.find({ company: companyId, ...dateFilter })
      .populate('employee', 'firstName lastName department role')
      .populate('assignedBy', 'firstName lastName')
      .lean()

    // Get employees for this company
    const employees = await Employee.find({ company: companyId, isActive: true })
      .select('firstName lastName email phone department role startDate')
      .lean()

    // Room statistics
    const roomStats: any = {}
    operations.forEach((op: any) => {
      if (op.roomNumber) {
        if (!roomStats[op.roomNumber]) {
          roomStats[op.roomNumber] = {
            roomNumber: op.roomNumber,
            checkIns: 0,
            checkOuts: 0,
            serviceRequests: 0,
            maintenance: 0,
            totalOperations: 0,
            lastActivity: null,
          }
        }
        roomStats[op.roomNumber].totalOperations++
        if (op.type === 'check-in') roomStats[op.roomNumber].checkIns++
        if (op.type === 'check-out') roomStats[op.roomNumber].checkOuts++
        if (op.type === 'service-request') roomStats[op.roomNumber].serviceRequests++
        if (op.type === 'maintenance') roomStats[op.roomNumber].maintenance++
        
        const opDate = new Date(op.createdAt)
        if (!roomStats[op.roomNumber].lastActivity || opDate > new Date(roomStats[op.roomNumber].lastActivity)) {
          roomStats[op.roomNumber].lastActivity = op.createdAt
        }
      }
    })

    // Employee statistics
    const employeeStats: any = {}
    operations.forEach((op: any) => {
      if (op.employee) {
        const empId = op.employee._id?.toString() || op.employee.toString()
        if (!employeeStats[empId]) {
          const emp = employees.find((e: any) => e._id?.toString() === empId)
          employeeStats[empId] = {
            employeeId: empId,
            name: emp ? `${emp.firstName} ${emp.lastName}` : 'Unknown',
            department: emp?.department || 'Unknown',
            role: emp?.role || 'Unknown',
            totalOperations: 0,
            completed: 0,
            pending: 0,
            inProgress: 0,
            checkIns: 0,
            checkOuts: 0,
            serviceRequests: 0,
            maintenance: 0,
          }
        }
        employeeStats[empId].totalOperations++
        if (op.status === 'completed') employeeStats[empId].completed++
        if (op.status === 'pending') employeeStats[empId].pending++
        if (op.status === 'in-progress') employeeStats[empId].inProgress++
        if (op.type === 'check-in') employeeStats[empId].checkIns++
        if (op.type === 'check-out') employeeStats[empId].checkOuts++
        if (op.type === 'service-request') employeeStats[empId].serviceRequests++
        if (op.type === 'maintenance') employeeStats[empId].maintenance++
      }
    })

    // Calculate completion rates
    Object.values(employeeStats).forEach((emp: any) => {
      emp.completionRate = emp.totalOperations > 0 
        ? Math.round((emp.completed / emp.totalOperations) * 100) 
        : 0
    })

    // Overall company statistics
    const checkIns = operations.filter((op: any) => op.type === 'check-in')
    const checkOuts = operations.filter((op: any) => op.type === 'check-out')
    const activeCheckIns = checkIns.filter((checkIn: any) => {
      const hasCheckOut = checkOuts.some(
        (checkOut: any) =>
          checkOut.guestName === checkIn.guestName &&
          checkOut.roomNumber === checkIn.roomNumber &&
          new Date(checkOut.createdAt) > new Date(checkIn.createdAt)
      )
      return !hasCheckOut
    })

    const uniqueRooms = Object.keys(roomStats).length || 1
    const occupancyRate = Math.round((activeCheckIns.length / uniqueRooms) * 100)

    res.json({
      company,
      summary: {
        totalOperations: operations.length,
        totalEmployees: employees.length,
        totalRooms: uniqueRooms,
        activeCheckIns: activeCheckIns.length,
        occupancyRate,
        checkIns: checkIns.length,
        checkOuts: checkOuts.length,
        serviceRequests: operations.filter((op: any) => op.type === 'service-request').length,
        maintenance: operations.filter((op: any) => op.type === 'maintenance').length,
      },
      rooms: Object.values(roomStats).sort((a: any, b: any) => 
        parseInt(a.roomNumber) - parseInt(b.roomNumber)
      ),
      employees: Object.values(employeeStats).sort((a: any, b: any) => 
        b.totalOperations - a.totalOperations
      ),
      allEmployees: employees,
    })
  } catch (error: any) {
    res.status(500).json({ message: 'Server error', error: error.message })
  }
})

// Get comprehensive analytics report
router.get('/analytics', authenticate, async (req: Request, res: Response) => {
  try {
    const { startDate, endDate, companyId } = req.query
    
    const dateFilter: any = {}
    if (startDate && endDate) {
      dateFilter.createdAt = {
        $gte: new Date(startDate as string),
        $lte: new Date(endDate as string),
      }
    }

    const companyFilter = companyId ? { company: companyId } : {}

    // Get all operations
    const allOperations = await Operation.find({ ...dateFilter, ...companyFilter })
      .populate('company', 'name')
      .populate('employee', 'firstName lastName department')
      .populate('assignedBy', 'firstName lastName')
      .lean()

    // Calculate statistics
    const checkIns = allOperations.filter((op: any) => op.type === 'check-in')
    const checkOuts = allOperations.filter((op: any) => op.type === 'check-out')
    const serviceRequests = allOperations.filter((op: any) => op.type === 'service-request')
    const maintenance = allOperations.filter((op: any) => op.type === 'maintenance')

    // Calculate occupancy rate
    const activeCheckIns = checkIns.filter((checkIn: any) => {
      const hasCheckOut = checkOuts.some(
        (checkOut: any) =>
          checkOut.guestName === checkIn.guestName &&
          checkOut.roomNumber === checkIn.roomNumber &&
          new Date(checkOut.createdAt) > new Date(checkIn.createdAt)
      )
      return !hasCheckOut
    })

    // Get unique rooms
    const uniqueRooms = new Set<string>()
    allOperations.forEach((op: any) => {
      if (op.roomNumber) uniqueRooms.add(op.roomNumber)
    })
    const totalRooms = uniqueRooms.size || 100 // Default to 100 if no rooms found
    const occupancyRate = totalRooms > 0 ? Math.round((activeCheckIns.length / totalRooms) * 100) : 0

    // Department statistics
    const departmentStats: any = {}
    serviceRequests.forEach((op: any) => {
      const dept = op.assignedToDepartment || 'unassigned'
      departmentStats[dept] = (departmentStats[dept] || 0) + 1
    })

    // Status breakdown
    const statusBreakdown = {
      pending: allOperations.filter((op: any) => op.status === 'pending').length,
      'in-progress': allOperations.filter((op: any) => op.status === 'in-progress').length,
      completed: allOperations.filter((op: any) => op.status === 'completed').length,
      cancelled: allOperations.filter((op: any) => op.status === 'cancelled').length,
    }

    // Employee performance (operations completed)
    const employeePerformance: any = {}
    allOperations.forEach((op: any) => {
      if (op.employee) {
        const empId = op.employee._id?.toString() || op.employee.toString()
        const empName = op.employee.firstName && op.employee.lastName
          ? `${op.employee.firstName} ${op.employee.lastName}`
          : 'Unknown'
        const dept = op.employee.department || 'Unknown'
        
        if (!employeePerformance[empId]) {
          employeePerformance[empId] = {
            name: empName,
            department: dept,
            total: 0,
            completed: 0,
          }
        }
        employeePerformance[empId].total++
        if (op.status === 'completed') {
          employeePerformance[empId].completed++
        }
      }
    })

    // Convert to array and calculate completion rate
    const employeeStats = Object.values(employeePerformance).map((emp: any) => ({
      ...emp,
      completionRate: emp.total > 0 ? Math.round((emp.completed / emp.total) * 100) : 0,
    })).sort((a: any, b: any) => b.completionRate - a.completionRate).slice(0, 10)

    // Company statistics
    const companyStats: any = {}
    allOperations.forEach((op: any) => {
      const companyName = op.company?.name || 'Unknown'
      if (!companyStats[companyName]) {
        companyStats[companyName] = {
          checkIns: 0,
          checkOuts: 0,
          serviceRequests: 0,
          maintenance: 0,
        }
      }
      if (op.type === 'check-in') companyStats[companyName].checkIns++
      if (op.type === 'check-out') companyStats[companyName].checkOuts++
      if (op.type === 'service-request') companyStats[companyName].serviceRequests++
      if (op.type === 'maintenance') companyStats[companyName].maintenance++
    })

    res.json({
      period: {
        startDate: startDate || null,
        endDate: endDate || null,
      },
      summary: {
        totalOperations: allOperations.length,
        checkIns: checkIns.length,
        checkOuts: checkOuts.length,
        serviceRequests: serviceRequests.length,
        maintenance: maintenance.length,
        activeCheckIns: activeCheckIns.length,
        occupancyRate,
        totalRooms,
      },
      statusBreakdown,
      departmentStats,
      employeePerformance: employeeStats,
      companyStats,
      operations: allOperations.slice(0, 50), // Limit to 50 for response size
    })
  } catch (error: any) {
    res.status(500).json({ message: 'Server error', error: error.message })
  }
})

// Generate PDF report
router.get('/pdf', authenticate, async (req: Request, res: Response) => {
  try {
    const { startDate, endDate, companyId, reportType } = req.query
    
    // Fetch analytics data
    const dateFilter: any = {}
    if (startDate && endDate) {
      dateFilter.createdAt = {
        $gte: new Date(startDate as string),
        $lte: new Date(endDate as string),
      }
    }

    const companyFilter = companyId ? { company: companyId } : {}

    const allOperations = await Operation.find({ ...dateFilter, ...companyFilter })
      .populate('company', 'name address city phone email')
      .populate('employee', 'firstName lastName department role')
      .populate('assignedBy', 'firstName lastName')
      .lean()

    // Get companies data if not filtered
    let companies: any[] = []
    if (!companyId) {
      companies = await Company.find({ isActive: true })
        .select('name address city phone email roomCount')
        .lean()
    } else {
      const company = await Company.findById(companyId)
        .select('name address city phone email roomCount')
        .lean()
      if (company) companies = [company]
    }

    const checkIns = allOperations.filter((op: any) => op.type === 'check-in')
    const checkOuts = allOperations.filter((op: any) => op.type === 'check-out')
    const serviceRequests = allOperations.filter((op: any) => op.type === 'service-request')
    const maintenance = allOperations.filter((op: any) => op.type === 'maintenance')

    const activeCheckIns = checkIns.filter((checkIn: any) => {
      const hasCheckOut = checkOuts.some(
        (checkOut: any) =>
          checkOut.guestName === checkIn.guestName &&
          checkOut.roomNumber === checkIn.roomNumber &&
          new Date(checkOut.createdAt) > new Date(checkIn.createdAt)
      )
      return !hasCheckOut
    })

    const uniqueRooms = new Set<string>()
    allOperations.forEach((op: any) => {
      if (op.roomNumber) uniqueRooms.add(op.roomNumber)
    })
    const totalRooms = uniqueRooms.size || (companies[0]?.roomCount || 100)
    const occupancyRate = totalRooms > 0 ? Math.round((activeCheckIns.length / totalRooms) * 100) : 0

    // Department statistics
    const departmentStats: any = {}
    serviceRequests.forEach((op: any) => {
      const dept = op.assignedToDepartment || 'unassigned'
      departmentStats[dept] = (departmentStats[dept] || 0) + 1
    })

    // Status breakdown
    const statusBreakdown = {
      pending: allOperations.filter((op: any) => op.status === 'pending').length,
      'in-progress': allOperations.filter((op: any) => op.status === 'in-progress').length,
      completed: allOperations.filter((op: any) => op.status === 'completed').length,
      cancelled: allOperations.filter((op: any) => op.status === 'cancelled').length,
    }

    // Employee performance with detailed breakdown
    const employeePerformance: any = {}
    allOperations.forEach((op: any) => {
      if (op.employee) {
        const empId = op.employee._id?.toString() || op.employee.toString()
        const empName = op.employee.firstName && op.employee.lastName
          ? `${op.employee.firstName} ${op.employee.lastName}`
          : 'Unknown'
        const dept = op.employee.department || 'Unknown'
        const role = op.employee.role || 'Unknown'
        
        if (!employeePerformance[empId]) {
          employeePerformance[empId] = {
            name: empName,
            department: dept,
            role: role,
            total: 0,
            completed: 0,
            pending: 0,
            inProgress: 0,
            checkIns: 0,
            checkOuts: 0,
            serviceRequests: 0,
            maintenance: 0,
          }
        }
        employeePerformance[empId].total++
        if (op.status === 'completed') employeePerformance[empId].completed++
        if (op.status === 'pending') employeePerformance[empId].pending++
        if (op.status === 'in-progress') employeePerformance[empId].inProgress++
        if (op.type === 'check-in') employeePerformance[empId].checkIns++
        if (op.type === 'check-out') employeePerformance[empId].checkOuts++
        if (op.type === 'service-request') employeePerformance[empId].serviceRequests++
        if (op.type === 'maintenance') employeePerformance[empId].maintenance++
      }
    })

    const employeeStats = Object.values(employeePerformance).map((emp: any) => ({
      ...emp,
      completionRate: emp.total > 0 ? Math.round((emp.completed / emp.total) * 100) : 0,
    })).sort((a: any, b: any) => b.completionRate - a.completionRate)

    // Room statistics
    const roomStats: any = {}
    allOperations.forEach((op: any) => {
      if (op.roomNumber) {
        if (!roomStats[op.roomNumber]) {
          roomStats[op.roomNumber] = {
            roomNumber: op.roomNumber,
            checkIns: 0,
            checkOuts: 0,
            serviceRequests: 0,
            maintenance: 0,
            totalOperations: 0,
            company: op.company?.name || 'Unknown',
          }
        }
        roomStats[op.roomNumber].totalOperations++
        if (op.type === 'check-in') roomStats[op.roomNumber].checkIns++
        if (op.type === 'check-out') roomStats[op.roomNumber].checkOuts++
        if (op.type === 'service-request') roomStats[op.roomNumber].serviceRequests++
        if (op.type === 'maintenance') roomStats[op.roomNumber].maintenance++
      }
    })

    // Company statistics with detailed breakdown
    const companyStats: any = {}
    allOperations.forEach((op: any) => {
      const companyName = op.company?.name || 'Unknown'
      if (!companyStats[companyName]) {
        companyStats[companyName] = {
          checkIns: 0,
          checkOuts: 0,
          serviceRequests: 0,
          maintenance: 0,
          totalOperations: 0,
          employees: new Set(),
          rooms: new Set(),
        }
      }
      companyStats[companyName].totalOperations++
      if (op.type === 'check-in') companyStats[companyName].checkIns++
      if (op.type === 'check-out') companyStats[companyName].checkOuts++
      if (op.type === 'service-request') companyStats[companyName].serviceRequests++
      if (op.type === 'maintenance') companyStats[companyName].maintenance++
      if (op.employee) companyStats[companyName].employees.add(op.employee._id?.toString() || op.employee.toString())
      if (op.roomNumber) companyStats[companyName].rooms.add(op.roomNumber)
    })

    // Convert sets to counts
    Object.keys(companyStats).forEach((companyName) => {
      companyStats[companyName].employeeCount = companyStats[companyName].employees.size
      companyStats[companyName].roomCount = companyStats[companyName].rooms.size
      delete companyStats[companyName].employees
      delete companyStats[companyName].rooms
    })

    // Generate PDF
    const doc = new PDFDocument({ margin: 50, size: 'A4' })
    
    // Set response headers
    res.setHeader('Content-Type', 'application/pdf')
    const reportTypeLabel = reportType === 'daily' ? 'Daily' : reportType === 'weekly' ? 'Weekly' : reportType === 'monthly' ? 'Monthly' : 'Custom'
    const filename = `hotel-report-${reportTypeLabel.toLowerCase()}-${Date.now()}.pdf`
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`)
    
    // Pipe PDF to response
    doc.pipe(res)

    // Helper function to add page break if needed
    const checkPageBreak = (requiredSpace: number = 100) => {
      if (doc.y + requiredSpace > doc.page.height - 50) {
        doc.addPage()
      }
    }

    // Header
    doc.fontSize(24).font('Helvetica-Bold').text('Hotel Management System', { align: 'center' })
    doc.moveDown(0.5)
    doc.fontSize(18).font('Helvetica').text(`${reportTypeLabel} Analytics Report`, { align: 'center' })
    doc.moveDown()
    
    // Report period
    if (startDate && endDate) {
      doc.fontSize(12).text(
        `Report Period: ${new Date(startDate as string).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })} - ${new Date(endDate as string).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}`,
        { align: 'center' }
      )
    } else {
      doc.fontSize(12).text('Report Period: All Time', { align: 'center' })
    }
    if (companyId && companies.length > 0) {
      doc.fontSize(11).text(`Company: ${companies[0].name}`, { align: 'center' })
    }
    doc.moveDown(1.5)

    // Summary Section
    checkPageBreak(150)
    doc.fontSize(16).font('Helvetica-Bold').text('1. Executive Summary', { underline: true })
    doc.moveDown(0.5)
    doc.fontSize(12).font('Helvetica')
    doc.text(`Total Operations: ${allOperations.length}`, { continued: false })
    doc.text(`Check-Ins: ${checkIns.length}`, { continued: false })
    doc.text(`Check-Outs: ${checkOuts.length}`, { continued: false })
    doc.text(`Service Requests: ${serviceRequests.length}`, { continued: false })
    doc.text(`Maintenance Tasks: ${maintenance.length}`, { continued: false })
    doc.text(`Active Check-Ins: ${activeCheckIns.length}`, { continued: false })
    doc.text(`Total Rooms Tracked: ${totalRooms}`, { continued: false })
    doc.text(`Occupancy Rate: ${occupancyRate}%`, { continued: false })
    doc.moveDown(1)

    // Status Breakdown
    checkPageBreak(100)
    doc.fontSize(16).font('Helvetica-Bold').text('2. Status Breakdown', { underline: true })
    doc.moveDown(0.5)
    doc.fontSize(12).font('Helvetica')
    doc.text(`Pending Operations: ${statusBreakdown.pending}`, { continued: false })
    doc.text(`In Progress: ${statusBreakdown['in-progress']}`, { continued: false })
    doc.text(`Completed: ${statusBreakdown.completed}`, { continued: false })
    doc.text(`Cancelled: ${statusBreakdown.cancelled}`, { continued: false })
    const completionRate = allOperations.length > 0 
      ? Math.round((statusBreakdown.completed / allOperations.length) * 100) 
      : 0
    doc.text(`Overall Completion Rate: ${completionRate}%`, { continued: false })
    doc.moveDown(1)

    // Department Statistics
    if (Object.keys(departmentStats).length > 0) {
      checkPageBreak(100)
      doc.fontSize(16).font('Helvetica-Bold').text('3. Department Statistics', { underline: true })
      doc.moveDown(0.5)
      doc.fontSize(12).font('Helvetica')
      Object.entries(departmentStats)
        .sort(([, a]: [string, any], [, b]: [string, any]) => b - a)
        .forEach(([dept, count]: [string, any]) => {
          doc.text(`${dept.replace(/-/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase())}: ${count} service requests`)
        })
      doc.moveDown(1)
    }

    // Employee Performance
    if (employeeStats.length > 0) {
      checkPageBreak(200)
      doc.fontSize(16).font('Helvetica-Bold').text('4. Employee Performance Analysis', { underline: true })
      doc.moveDown(0.5)
      doc.fontSize(12).font('Helvetica')
      
      // Top performers
      const topPerformers = employeeStats.slice(0, 10)
      doc.fontSize(13).font('Helvetica-Bold').text('Top 10 Performers:', { continued: false })
      doc.moveDown(0.3)
      doc.fontSize(11).font('Helvetica')
      topPerformers.forEach((emp: any, index: number) => {
        checkPageBreak(30)
        doc.text(`${index + 1}. ${emp.name}`, { continued: false })
        doc.text(`   Department: ${emp.department} | Role: ${emp.role}`, { indent: 20, continued: false })
        doc.text(`   Completion Rate: ${emp.completionRate}% (${emp.completed}/${emp.total} tasks)`, { indent: 20, continued: false })
        doc.text(`   Breakdown: Check-Ins: ${emp.checkIns}, Check-Outs: ${emp.checkOuts}, Services: ${emp.serviceRequests}, Maintenance: ${emp.maintenance}`, { indent: 20, continued: false })
        doc.moveDown(0.3)
      })
      doc.moveDown(0.5)
    }

    // Company Statistics
    if (Object.keys(companyStats).length > 0) {
      checkPageBreak(300)
      doc.fontSize(16).font('Helvetica-Bold').text('5. Company-Wise Analysis', { underline: true })
      doc.moveDown(0.5)
      doc.fontSize(12).font('Helvetica')
      
      Object.entries(companyStats).forEach(([companyName, stats]: [string, any]) => {
        checkPageBreak(150)
        doc.fontSize(13).font('Helvetica-Bold').text(`${companyName}:`, { continued: false })
        doc.moveDown(0.3)
        doc.fontSize(11).font('Helvetica')
        doc.text(`  Total Operations: ${stats.totalOperations}`, { indent: 20, continued: false })
        doc.text(`  Check-Ins: ${stats.checkIns}`, { indent: 20, continued: false })
        doc.text(`  Check-Outs: ${stats.checkOuts}`, { indent: 20, continued: false })
        doc.text(`  Service Requests: ${stats.serviceRequests}`, { indent: 20, continued: false })
        doc.text(`  Maintenance Tasks: ${stats.maintenance}`, { indent: 20, continued: false })
        doc.text(`  Active Employees: ${stats.employeeCount}`, { indent: 20, continued: false })
        doc.text(`  Rooms with Activity: ${stats.roomCount}`, { indent: 20, continued: false })
        doc.moveDown(0.5)
      })
      doc.moveDown(0.5)
    }

    // Room Statistics (Top 20 most active rooms)
    if (Object.keys(roomStats).length > 0) {
      checkPageBreak(300)
      doc.fontSize(16).font('Helvetica-Bold').text('6. Room Activity Analysis', { underline: true })
      doc.moveDown(0.5)
      doc.fontSize(11).font('Helvetica')
      doc.text('Top 20 Most Active Rooms:', { continued: false })
      doc.moveDown(0.3)
      
      const sortedRooms = Object.values(roomStats)
        .sort((a: any, b: any) => b.totalOperations - a.totalOperations)
        .slice(0, 20)
      
      sortedRooms.forEach((room: any, index: number) => {
        checkPageBreak(25)
        doc.text(`${index + 1}. Room ${room.roomNumber} (${room.company}):`, { indent: 20, continued: false })
        doc.text(`   Total Operations: ${room.totalOperations} | Check-Ins: ${room.checkIns} | Check-Outs: ${room.checkOuts} | Services: ${room.serviceRequests} | Maintenance: ${room.maintenance}`, { indent: 30, continued: false })
        doc.moveDown(0.2)
      })
      doc.moveDown(0.5)
    }

    // Data Analysis Insights
    checkPageBreak(200)
    doc.fontSize(16).font('Helvetica-Bold').text('7. Key Insights & Analysis', { underline: true })
    doc.moveDown(0.5)
    doc.fontSize(11).font('Helvetica')
    
    const avgOperationsPerDay = startDate && endDate 
      ? Math.round(allOperations.length / Math.max(1, Math.ceil((new Date(endDate as string).getTime() - new Date(startDate as string).getTime()) / (1000 * 60 * 60 * 24))))
      : 0
    
    doc.text(`• Average Operations per Day: ${avgOperationsPerDay}`, { continued: false })
    doc.text(`• Service Request to Maintenance Ratio: ${maintenance.length > 0 ? Math.round((serviceRequests.length / maintenance.length) * 10) / 10 : 'N/A'}:1`, { continued: false })
    doc.text(`• Check-In to Check-Out Ratio: ${checkOuts.length > 0 ? Math.round((checkIns.length / checkOuts.length) * 10) / 10 : 'N/A'}:1`, { continued: false })
    
    if (employeeStats.length > 0) {
      const avgCompletionRate = Math.round(
        employeeStats.reduce((sum: number, emp: any) => sum + emp.completionRate, 0) / employeeStats.length
      )
      doc.text(`• Average Employee Completion Rate: ${avgCompletionRate}%`, { continued: false })
    }
    
    if (Object.keys(companyStats).length > 1) {
      const topCompany = Object.entries(companyStats)
        .sort(([, a]: [string, any], [, b]: [string, any]) => b.totalOperations - a.totalOperations)[0]
      doc.text(`• Most Active Company: ${topCompany[0]} (${topCompany[1].totalOperations} operations)`, { continued: false })
    }
    
    doc.moveDown(1)

    // Footer
    checkPageBreak(50)
    doc.fontSize(10).font('Helvetica')
    doc.text(`Report Generated: ${new Date().toLocaleString('en-US', { dateStyle: 'full', timeStyle: 'short' })}`, { align: 'center' })
    doc.moveDown(0.3)
    doc.text('Hotel Management System - Comprehensive Analytics Report', { align: 'center' })

    // Finalize PDF
    doc.end()
  } catch (error: any) {
    console.error('PDF Generation Error:', error)
    res.status(500).json({ message: 'Server error', error: error.message })
  }
})

export default router



