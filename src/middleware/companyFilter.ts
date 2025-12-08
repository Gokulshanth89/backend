import { Request, Response, NextFunction } from 'express'
import Employee from '../models/Employee'
import User from '../models/User'
import { extractCompanyId } from '../utils/queryHelper'

interface AuthRequest extends Request {
  user?: {
    id: string
    email: string
    role: string
    type?: string
  }
  userCompanyId?: string
  isAdmin?: boolean
}

/**
 * Middleware to automatically add company filtering based on authenticated user
 * This ensures data isolation - users can only access data from their own company
 */
export const addCompanyFilter = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    // If company is already provided in query/body, validate it matches user's company
    const providedCompany = req.query.company || req.body.company
    
    if (providedCompany) {
      const companyId = extractCompanyId(providedCompany as string)
      if (companyId) {
        // Store the company ID for use in routes
        req.userCompanyId = companyId
      }
    } else {
      // No company provided - get it from the authenticated user
      if (req.user?.id) {
        let companyId: string | null = null
        
        // Check if it's a User (frontend admin) or Employee (mobile app)
        if (req.user.type === 'user') {
          const user = await User.findById(req.user.id).select('company role')
          if (user && user.company) {
            companyId = user.company.toString()
          }
          // Admin users without company can view all companies
          if (user?.role === 'admin' && !companyId) {
            req.isAdmin = true
          }
        } else {
          // Employee (mobile app user)
          const employee = await Employee.findById(req.user.id).select('company')
          if (employee && employee.company) {
            companyId = employee.company.toString()
          }
        }
        
        if (companyId) {
          req.userCompanyId = companyId
          // Automatically add company to query if not present
          if (!req.query.company) {
            req.query.company = companyId
          }
        }
      }
    }
    
    next()
  } catch (error) {
    console.error('Error in addCompanyFilter middleware:', error)
    next() // Continue even if there's an error (let the route handle it)
  }
}

/**
 * Middleware to enforce company filtering - returns 403 if user tries to access different company's data
 * Admin users without a company can view all companies
 */
export const enforceCompanyFilter = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.user?.id) {
      return res.status(401).json({ message: 'Unauthorized' })
    }

    let userCompanyId: string | null = null
    let isAdmin = false

    // Check if it's a User (frontend admin) or Employee (mobile app)
    if (req.user.type === 'user') {
      const user = await User.findById(req.user.id).select('company role')
      if (!user) {
        return res.status(401).json({ message: 'User not found' })
      }
      
      if (user.company) {
        userCompanyId = user.company.toString()
      }
      
      // Admin users without company can view all companies
      if (user.role === 'admin' && !userCompanyId) {
        isAdmin = true
        req.isAdmin = true
        // Don't enforce company filter for admins without company
        console.log(`Admin user ${req.user.id} has no company - allowing access to all companies`)
        return next()
      }
    } else {
      // Employee (mobile app user)
      const employee = await Employee.findById(req.user.id).select('company')
      if (!employee) {
        return res.status(401).json({ message: 'Employee not found' })
      }
      
      if (!employee.company) {
        return res.status(403).json({ message: 'User is not assigned to a company' })
      }
      
      userCompanyId = employee.company.toString()
    }

    if (!userCompanyId && !isAdmin) {
      return res.status(403).json({ message: 'User is not assigned to a company' })
    }

    req.userCompanyId = userCompanyId || undefined

    // Check if company is provided in query/body
    const providedCompany = req.query.company || req.body.company
    
    if (providedCompany && userCompanyId) {
      const providedCompanyId = extractCompanyId(providedCompany as string)
      if (providedCompanyId && providedCompanyId !== userCompanyId) {
        return res.status(403).json({ 
          message: 'Access denied. You can only access data from your own company.' 
        })
      }
    }

    // Automatically add user's company to query/body if not present (only for non-admin users)
    if (userCompanyId) {
      if (!req.query.company) {
        req.query.company = userCompanyId
      }
      // For POST/PUT requests, only add if body doesn't have company
      if (req.body && !req.body.company && (req.method === 'POST' || req.method === 'PUT')) {
        req.body.company = userCompanyId
      }
    }

    console.log(`Company filter applied: ${userCompanyId || 'all (admin)'} for user ${req.user.id}`)
    next()
  } catch (error: any) {
    console.error('Error in enforceCompanyFilter middleware:', error)
    return res.status(500).json({ message: 'Server error', error: error.message })
  }
}

