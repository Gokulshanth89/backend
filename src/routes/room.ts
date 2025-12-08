import express, { Request, Response } from 'express'
import { authenticate } from '../middleware/auth'
import { enforceCompanyFilter } from '../middleware/companyFilter'
import Operation from '../models/Operation'
import { extractCompanyId } from '../utils/queryHelper'

const router = express.Router()

// Get all rooms with their status - automatically filtered by user's company
router.get('/', authenticate, enforceCompanyFilter, async (req: any, res: Response) => {
  try {
    const { company } = req.query
    const filter: any = {}

    // Company filtering - admin users without company can see all
    if (company) {
      const companyId = extractCompanyId(company as string)
      if (companyId) {
        filter.company = companyId
        console.log(`Filtering rooms by company ID: ${companyId}`)
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
        // Admin users without company can see all rooms
        console.log(`Admin user - fetching all rooms`)
      } else {
        return res.status(403).json({ message: 'Company information not available' })
      }
    }

    // Get all check-in and check-out operations for the company
    const operations = await Operation.find({
      ...filter,
      type: { $in: ['check-in', 'check-out'] },
      roomNumber: { $exists: true, $ne: null, $ne: '' }
    })
      .sort({ createdAt: -1 })
      .lean()

    console.log(`Found ${operations.length} check-in/check-out operations`)

    // Process operations to determine room status
    const roomsMap = new Map<string, any>()

    // Separate check-ins and check-outs
    const checkIns = operations.filter((op: any) => op.type === 'check-in')
    const checkOuts = operations.filter((op: any) => op.type === 'check-out')

    // Process all unique room numbers
    const uniqueRoomNumbers = new Set<string>()
    operations.forEach((op: any) => {
      if (op.roomNumber) {
        uniqueRoomNumbers.add(op.roomNumber.toString())
      }
    })

    // For each room, determine its status
    uniqueRoomNumbers.forEach((roomNumber) => {
      // Get all check-ins for this room, sorted by date (newest first)
      const roomCheckIns = checkIns
        .filter((op: any) => op.roomNumber?.toString() === roomNumber)
        .sort((a: any, b: any) => {
          const aDate = new Date(a.checkInDate || a.createdAt).getTime()
          const bDate = new Date(b.checkInDate || b.createdAt).getTime()
          return bDate - aDate
        })

      // Get all check-outs for this room, sorted by date (newest first)
      const roomCheckOuts = checkOuts
        .filter((op: any) => op.roomNumber?.toString() === roomNumber)
        .sort((a: any, b: any) => {
          const aDate = new Date(a.checkOutDate || a.createdAt).getTime()
          const bDate = new Date(b.checkOutDate || b.createdAt).getTime()
          return bDate - aDate
        })

      // Determine if room is occupied
      let isOccupied = false
      let latestCheckIn: any = null
      let latestCheckOut: any = null

      if (roomCheckIns.length > 0) {
        latestCheckIn = roomCheckIns[0]
        
        if (roomCheckOuts.length === 0) {
          // Has check-in but no check-out = occupied
          isOccupied = true
        } else {
          latestCheckOut = roomCheckOuts[0]
          
          // Compare dates to see if check-in is after check-out
          const checkInDate = new Date(latestCheckIn.checkInDate || latestCheckIn.createdAt)
          const checkOutDate = new Date(latestCheckOut.checkOutDate || latestCheckOut.createdAt)
          
          isOccupied = checkInDate > checkOutDate
        }
      }

      // Build room object
      const room: any = {
        roomNumber: roomNumber,
        status: isOccupied ? 'Occupied' : 'Vacant',
        guestName: isOccupied && latestCheckIn ? (latestCheckIn.guestName || 'Occupied') : 'Vacant',
        checkInDate: isOccupied && latestCheckIn ? (latestCheckIn.checkInDate || latestCheckIn.createdAt) : null,
        numberOfPeople: isOccupied && latestCheckIn ? (latestCheckIn.numberOfPeople || 1) : 0,
      }

      roomsMap.set(roomNumber, room)
    })

    // Convert map to array and sort by room number
    const rooms = Array.from(roomsMap.values()).sort((a, b) => {
      const aNum = parseInt(a.roomNumber) || 0
      const bNum = parseInt(b.roomNumber) || 0
      return aNum - bNum
    })

    console.log(`Processed ${rooms.length} rooms for company`)
    res.json(rooms)
  } catch (error: any) {
    console.error('Error fetching rooms:', error)
    res.status(500).json({ message: 'Server error', error: error.message })
  }
})

export default router


