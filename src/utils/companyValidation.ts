import mongoose from 'mongoose'
import Company from '../models/Company'
import Employee from '../models/Employee'
import Service from '../models/Service'

/**
 * Validate that a company exists
 */
export async function validateCompanyExists(companyId: string): Promise<{ valid: boolean; error?: string }> {
  if (!mongoose.Types.ObjectId.isValid(companyId)) {
    return { valid: false, error: 'Invalid company ID format' }
  }

  const company = await Company.findById(companyId)
  if (!company) {
    return { valid: false, error: 'Company not found' }
  }

  if (!company.isActive) {
    return { valid: false, error: 'Company is not active' }
  }

  return { valid: true }
}

/**
 * Validate that an employee exists and belongs to the specified company
 */
export async function validateEmployeeBelongsToCompany(
  employeeId: string | undefined,
  companyId: string
): Promise<{ valid: boolean; error?: string }> {
  if (!employeeId) {
    return { valid: true } // Employee is optional
  }

  if (!mongoose.Types.ObjectId.isValid(employeeId)) {
    return { valid: false, error: 'Invalid employee ID format' }
  }

  const employee = await Employee.findById(employeeId)
  if (!employee) {
    return { valid: false, error: 'Employee not found' }
  }

  if (employee.company.toString() !== companyId) {
    return { valid: false, error: 'Employee does not belong to the specified company' }
  }

  return { valid: true }
}

/**
 * Validate that a service exists and belongs to the specified company
 */
export async function validateServiceBelongsToCompany(
  serviceId: string | undefined,
  companyId: string
): Promise<{ valid: boolean; error?: string }> {
  if (!serviceId) {
    return { valid: true } // Service is optional
  }

  if (!mongoose.Types.ObjectId.isValid(serviceId)) {
    return { valid: false, error: 'Invalid service ID format' }
  }

  const service = await Service.findById(serviceId)
  if (!service) {
    return { valid: false, error: 'Service not found' }
  }

  if (service.company.toString() !== companyId) {
    return { valid: false, error: 'Service does not belong to the specified company' }
  }

  return { valid: true }
}

/**
 * Validate that assignedBy employee exists and belongs to the specified company
 */
export async function validateAssignedByBelongsToCompany(
  assignedById: string | undefined,
  companyId: string
): Promise<{ valid: boolean; error?: string }> {
  if (!assignedById) {
    return { valid: true } // assignedBy is optional
  }

  return validateEmployeeBelongsToCompany(assignedById, companyId)
}

/**
 * Comprehensive validation for operation creation/update
 */
export async function validateOperationCompanyRelationships(
  companyId: string,
  employeeId?: string,
  serviceId?: string,
  assignedById?: string
): Promise<{ valid: boolean; error?: string }> {
  // Validate company exists
  const companyValidation = await validateCompanyExists(companyId)
  if (!companyValidation.valid) {
    return companyValidation
  }

  // Validate employee belongs to company
  if (employeeId) {
    const employeeValidation = await validateEmployeeBelongsToCompany(employeeId, companyId)
    if (!employeeValidation.valid) {
      return employeeValidation
    }
  }

  // Validate service belongs to company
  if (serviceId) {
    const serviceValidation = await validateServiceBelongsToCompany(serviceId, companyId)
    if (!serviceValidation.valid) {
      return serviceValidation
    }
  }

  // Validate assignedBy belongs to company
  if (assignedById) {
    const assignedByValidation = await validateAssignedByBelongsToCompany(assignedById, companyId)
    if (!assignedByValidation.valid) {
      return assignedByValidation
    }
  }

  return { valid: true }
}

