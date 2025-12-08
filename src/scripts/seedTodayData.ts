import mongoose from 'mongoose'
import dotenv from 'dotenv'
import Company from '../models/Company'
import Employee from '../models/Employee'
import Operation from '../models/Operation'
import Rota from '../models/Rota'
import globalConfig from '../config/globalConfig'

dotenv.config()

async function seedTodayData() {
  try {
    // Connect to database
    await mongoose.connect(globalConfig.mongodbURI)
    console.log('Connected to MongoDB')

    // Find "new company"
    let company = await Company.findOne({ name: 'new company' })
    if (!company) {
      console.log('Creating "new company"...')
      company = new Company({
        name: 'new company',
        address: '123 Hotel Street',
        city: 'London',
        postcode: 'SW1A 1AA',
        phone: '+44 20 1234 5678',
        email: 'info@newcompany.com',
        description: 'New company hotel',
        roomCount: 20,
        isActive: true,
      })
      await company.save()
      console.log('Created company:', company._id)
    } else {
      console.log('Found company:', company._id)
    }

    const companyId = company._id
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    // Get or create employees
    const employeeEmails = [
      'john.reception@newcompany.com',
      'sarah.housekeeping@newcompany.com',
      'mike.operations@newcompany.com',
      'emma.food@newcompany.com',
      'david.manager@newcompany.com',
    ]

    const employees = []
    for (const email of employeeEmails) {
      let employee = await Employee.findOne({ email })
      if (!employee) {
        const [firstName, department] = email.split('@')[0].split('.')
        employee = new Employee({
          firstName: firstName.charAt(0).toUpperCase() + firstName.slice(1),
          lastName: department.charAt(0).toUpperCase() + department.slice(1),
          email,
          phone: '+44 20 1234 5678',
          role: department === 'manager' ? 'manager' : 'employee',
          department: department === 'food' ? 'food-beverage' : department,
          startDate: new Date(),
          company: companyId,
          isActive: true,
        })
        await employee.save()
        console.log(`Created employee: ${employee.firstName} ${employee.lastName}`)
      }
      employees.push(employee)
    }

    const [receptionEmp, housekeepingEmp, operationsEmp, foodEmp, managerEmp] = employees

    // Clear existing operations for today (optional - comment out if you want to keep existing)
    // await Operation.deleteMany({ company: companyId, createdAt: { $gte: today } })

    // Create Check-in operations
    console.log('Creating check-in operations...')
    const checkIns = [
      {
        type: 'check-in',
        description: 'Check-in for John Smith - Room 101',
        company: companyId,
        employee: receptionEmp._id,
        status: 'completed',
        guestName: 'John Smith',
        numberOfPeople: 2,
        visitorsAllowed: true,
        durationOfStay: 3,
        checkInDate: today,
        roomNumber: '101',
        hotelFoodRequired: true,
        foodPreferences: 'Vegetarian',
        specialRequests: 'Late checkout requested',
      },
      {
        type: 'check-in',
        description: 'Check-in for Mary Johnson - Room 102',
        company: companyId,
        employee: receptionEmp._id,
        status: 'completed',
        guestName: 'Mary Johnson',
        numberOfPeople: 1,
        visitorsAllowed: false,
        durationOfStay: 5,
        checkInDate: today,
        roomNumber: '102',
        hotelFoodRequired: false,
      },
      {
        type: 'check-in',
        description: 'Check-in for Robert Williams - Room 103',
        company: companyId,
        employee: receptionEmp._id,
        status: 'completed',
        guestName: 'Robert Williams',
        numberOfPeople: 3,
        visitorsAllowed: true,
        durationOfStay: 2,
        checkInDate: today,
        roomNumber: '103',
        hotelFoodRequired: true,
        foodPreferences: 'Halal',
      },
    ]

    for (const checkIn of checkIns) {
      const operation = new Operation(checkIn)
      await operation.save()
      console.log(`Created check-in: ${checkIn.guestName} - Room ${checkIn.roomNumber}`)
    }

    // Create Meal Marker operations
    console.log('Creating meal marker operations...')
    const mealMarkers = [
      {
        type: 'meal-marker',
        description: 'Breakfast marked for Room 101',
        company: companyId,
        employee: foodEmp._id,
        status: 'completed',
        roomNumber: '101',
        assignedToDepartment: 'food-beverage',
      },
      {
        type: 'meal-marker',
        description: 'Lunch marked for Room 102',
        company: companyId,
        employee: foodEmp._id,
        status: 'completed',
        roomNumber: '102',
        assignedToDepartment: 'food-beverage',
      },
      {
        type: 'meal-marker',
        description: 'Dinner marked for Room 103',
        company: companyId,
        employee: foodEmp._id,
        status: 'in-progress',
        roomNumber: '103',
        assignedToDepartment: 'food-beverage',
      },
    ]

    for (const meal of mealMarkers) {
      const operation = new Operation(meal)
      await operation.save()
      console.log(`Created meal marker: ${meal.description}`)
    }

    // Create Food Image operations
    console.log('Creating food image operations...')
    const foodImages = [
      {
        type: 'food-image',
        description: 'Food picture for Room 101 breakfast',
        company: companyId,
        employee: foodEmp._id,
        status: 'completed',
        roomNumber: '101',
        assignedToDepartment: 'food-beverage',
      },
      {
        type: 'food-image',
        description: 'Food picture for Room 102 lunch',
        company: companyId,
        employee: foodEmp._id,
        status: 'completed',
        roomNumber: '102',
        assignedToDepartment: 'food-beverage',
      },
    ]

    for (const foodImg of foodImages) {
      const operation = new Operation(foodImg)
      await operation.save()
      console.log(`Created food image: ${foodImg.description}`)
    }

    // Create Food Feedback operations
    console.log('Creating food feedback operations...')
    const foodFeedbacks = [
      {
        type: 'food-feedback',
        description: 'Food feedback from Room 101',
        company: companyId,
        employee: foodEmp._id,
        status: 'completed',
        roomNumber: '101',
        specialRequests: 'Food was excellent, very satisfied',
        assignedToDepartment: 'food-beverage',
      },
      {
        type: 'food-feedback',
        description: 'Food feedback from Room 102',
        company: companyId,
        employee: foodEmp._id,
        status: 'completed',
        roomNumber: '102',
        specialRequests: 'Would like more variety in breakfast options',
        assignedToDepartment: 'food-beverage',
      },
    ]

    for (const feedback of foodFeedbacks) {
      const operation = new Operation(feedback)
      await operation.save()
      console.log(`Created food feedback: ${feedback.description}`)
    }

    // Create Welfare Check operations
    console.log('Creating welfare check operations...')
    const welfareChecks = [
      {
        type: 'welfare-check',
        description: 'Welfare check for Room 101',
        company: companyId,
        employee: operationsEmp._id,
        status: 'completed',
        roomNumber: '101',
        specialRequests: 'Guest is doing well, no issues',
        assignedToDepartment: 'operations',
      },
      {
        type: 'welfare-check',
        description: 'Welfare check for Room 102',
        company: companyId,
        employee: operationsEmp._id,
        status: 'in-progress',
        roomNumber: '102',
        assignedToDepartment: 'operations',
      },
    ]

    for (const welfare of welfareChecks) {
      const operation = new Operation(welfare)
      await operation.save()
      console.log(`Created welfare check: ${welfare.description}`)
    }

    // Create Service Request operations
    console.log('Creating service request operations...')
    const serviceRequests = [
      {
        type: 'service-request',
        description: 'Extra towels requested for Room 101',
        company: companyId,
        employee: housekeepingEmp._id,
        status: 'completed',
        roomNumber: '101',
        assignedToDepartment: 'housekeeping',
        assignedBy: receptionEmp._id,
      },
      {
        type: 'service-request',
        description: 'Room cleaning requested for Room 102',
        company: companyId,
        employee: housekeepingEmp._id,
        status: 'in-progress',
        roomNumber: '102',
        assignedToDepartment: 'housekeeping',
        assignedBy: receptionEmp._id,
      },
    ]

    for (const service of serviceRequests) {
      const operation = new Operation(service)
      await operation.save()
      console.log(`Created service request: ${service.description}`)
    }

    // Create Maintenance operations
    console.log('Creating maintenance operations...')
    const maintenanceOps = [
      {
        type: 'maintenance',
        description: 'AC unit repair needed in Room 103',
        company: companyId,
        employee: operationsEmp._id,
        status: 'pending',
        roomNumber: '103',
        assignedToDepartment: 'operations',
        assignedBy: receptionEmp._id,
      },
    ]

    for (const maint of maintenanceOps) {
      const operation = new Operation(maint)
      await operation.save()
      console.log(`Created maintenance: ${maint.description}`)
    }

    // Create Other operations (Observations, Safeguarding, Incident Reports)
    console.log('Creating other operations...')
    const otherOps = [
      {
        type: 'other',
        description: 'Daily observation log - Room 101',
        company: companyId,
        employee: operationsEmp._id,
        status: 'completed',
        roomNumber: '101',
        specialRequests: 'Guest observed to be in good spirits, engaging with staff',
        assignedToDepartment: 'operations',
      },
      {
        type: 'other',
        description: 'Safeguarding check - Room 102',
        company: companyId,
        employee: operationsEmp._id,
        status: 'completed',
        roomNumber: '102',
        specialRequests: 'All safeguarding protocols followed, no concerns',
        assignedToDepartment: 'operations',
      },
      {
        type: 'other',
        description: 'Incident report - Minor spill in Room 103',
        company: companyId,
        employee: operationsEmp._id,
        status: 'completed',
        roomNumber: '103',
        specialRequests: 'Minor water spill reported and cleaned immediately, no damage',
        assignedToDepartment: 'operations',
      },
    ]

    for (const other of otherOps) {
      const operation = new Operation(other)
      await operation.save()
      console.log(`Created other operation: ${other.description}`)
    }

    // Create Rotas for today
    console.log('Creating rotas for today...')
    const rotaData = [
      {
        employee: receptionEmp._id,
        company: companyId,
        date: today,
        shiftType: 'morning',
        startTime: '08:00',
        endTime: '16:00',
        notes: 'Reception morning shift',
      },
      {
        employee: housekeepingEmp._id,
        company: companyId,
        date: today,
        shiftType: 'morning',
        startTime: '07:00',
        endTime: '15:00',
        notes: 'Housekeeping morning shift',
      },
      {
        employee: operationsEmp._id,
        company: companyId,
        date: today,
        shiftType: 'afternoon',
        startTime: '12:00',
        endTime: '20:00',
        notes: 'Operations afternoon shift',
      },
      {
        employee: foodEmp._id,
        company: companyId,
        date: today,
        shiftType: 'custom',
        startTime: '06:00',
        endTime: '14:00',
        notes: 'Food service morning shift',
      },
      {
        employee: managerEmp._id,
        company: companyId,
        date: today,
        shiftType: 'custom',
        startTime: '09:00',
        endTime: '17:00',
        notes: 'Manager shift',
      },
    ]

    for (const rota of rotaData) {
      try {
        const rotaEntry = new Rota(rota)
        await rotaEntry.save()
        console.log(`Created rota: ${rota.employee} - ${rota.shiftType}`)
      } catch (error: any) {
        if (error.code === 11000) {
          console.log(`Rota already exists for employee ${rota.employee} on ${today.toISOString()}`)
        } else {
          throw error
        }
      }
    }

    console.log('\n✅ Successfully seeded today\'s data for "new company"!')
    console.log(`Company ID: ${companyId}`)
    console.log(`Date: ${today.toISOString()}`)
    console.log(`Employees: ${employees.length}`)
    
    // Count operations
    const operationCount = await Operation.countDocuments({ company: companyId, createdAt: { $gte: today } })
    console.log(`Operations created: ${operationCount}`)
    
    // Count rotas
    const rotaCount = await Rota.countDocuments({ company: companyId, date: today })
    console.log(`Rotas created: ${rotaCount}`)

    await mongoose.disconnect()
    console.log('Disconnected from MongoDB')
    process.exit(0)
  } catch (error) {
    console.error('Error seeding data:', error)
    await mongoose.disconnect()
    process.exit(1)
  }
}

// Run the seed function
seedTodayData()

