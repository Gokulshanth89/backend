import mongoose from 'mongoose'

/**
 * Extract company ID from query parameter
 * Handles cases where company might be:
 * - A plain ObjectId string: "692731f5fb24684b323106b3"
 * - A stringified object: "{ _id: new ObjectId('692731f5fb24684b323106b3'), name: 'new company' }"
 * - A JSON string: '{"_id":"692731f5fb24684b323106b3","name":"new company"}'
 */
export function extractCompanyId(company: string | undefined | any): string | null {
  if (!company) {
    console.log('extractCompanyId: company is null/undefined')
    return null
  }
  
  // If company is an object (from request body), extract _id or id
  if (typeof company === 'object' && company !== null) {
    const id = company._id?.toString() || company.id?.toString()
    if (id && mongoose.Types.ObjectId.isValid(id)) {
      console.log('extractCompanyId: extracted from object:', id)
      return id
    }
    // Try to stringify and parse
    try {
      const str = JSON.stringify(company)
      const parsed = JSON.parse(str)
      if (parsed._id) {
        const id = parsed._id.toString()
        if (mongoose.Types.ObjectId.isValid(id)) {
          console.log('extractCompanyId: extracted from stringified object:', id)
          return id
        }
      }
    } catch (e) {
      // Continue to string processing
    }
  }
  
  // Convert to string if it's not already
  const companyStr = typeof company === 'string' ? company : String(company)
  console.log('extractCompanyId: processing company value:', companyStr, 'original type:', typeof company)
  
  // If it's already a valid ObjectId format (24 hex characters), return it
  if (mongoose.Types.ObjectId.isValid(companyStr) && companyStr.length === 24) {
    console.log('extractCompanyId: valid ObjectId found:', companyStr)
    return companyStr
  }
  
  // Try to parse as JSON if it looks like a JSON string
  try {
    // Check if it starts with { or [ (JSON object/array)
    if (companyStr.trim().startsWith('{') || companyStr.trim().startsWith('[')) {
      const parsed = JSON.parse(companyStr)
      
      // If it's an object with _id field
      if (parsed && typeof parsed === 'object' && parsed._id) {
        const id = parsed._id.toString()
        if (mongoose.Types.ObjectId.isValid(id)) {
          return id
        }
      }
      
      // If _id is an ObjectId object
      if (parsed && typeof parsed === 'object' && parsed._id && parsed._id.toString) {
        const id = parsed._id.toString()
        if (mongoose.Types.ObjectId.isValid(id)) {
          return id
        }
      }
    }
    
    // Try to extract ObjectId from string like: "{ _id: new ObjectId('692731f5fb24684b323106b3'), ... }"
    const objectIdMatch = companyStr.match(/ObjectId\(['"]([a-fA-F0-9]{24})['"]\)/)
    if (objectIdMatch && objectIdMatch[1]) {
      const id = objectIdMatch[1]
      if (mongoose.Types.ObjectId.isValid(id)) {
        console.log('extractCompanyId: extracted from ObjectId pattern:', id)
        return id
      }
    }
    
    // Try to extract just the hex string pattern
    const hexMatch = companyStr.match(/([a-fA-F0-9]{24})/)
    if (hexMatch && hexMatch[1]) {
      const id = hexMatch[1]
      if (mongoose.Types.ObjectId.isValid(id)) {
        console.log('extractCompanyId: extracted from hex pattern:', id)
        return id
      }
    }
  } catch (e) {
    console.log('extractCompanyId: JSON parsing failed:', e)
    // If JSON parsing fails, continue to other methods
  }
  
  // Last resort: try to use the string as-is if it's a valid ObjectId
  if (mongoose.Types.ObjectId.isValid(companyStr)) {
    console.log('extractCompanyId: using string as-is:', companyStr)
    return companyStr
  }
  
  console.log('extractCompanyId: failed to extract valid company ID from:', companyStr)
  return null
}

/**
 * Extract employee ID from query parameter (similar logic)
 */
export function extractEmployeeId(employee: string | undefined): string | null {
  if (!employee) return null
  
  if (mongoose.Types.ObjectId.isValid(employee) && employee.length === 24) {
    return employee
  }
  
  try {
    if (employee.trim().startsWith('{') || employee.trim().startsWith('[')) {
      const parsed = JSON.parse(employee)
      if (parsed && typeof parsed === 'object' && parsed._id) {
        const id = parsed._id.toString()
        if (mongoose.Types.ObjectId.isValid(id)) {
          return id
        }
      }
    }
    
    const objectIdMatch = employee.match(/ObjectId\(['"]([a-fA-F0-9]{24})['"]\)/)
    if (objectIdMatch && objectIdMatch[1]) {
      return objectIdMatch[1]
    }
    
    const hexMatch = employee.match(/([a-fA-F0-9]{24})/)
    if (hexMatch && hexMatch[1] && mongoose.Types.ObjectId.isValid(hexMatch[1])) {
      return hexMatch[1]
    }
  } catch (e) {
    // Continue
  }
  
  if (mongoose.Types.ObjectId.isValid(employee)) {
    return employee
  }
  
  return null
}

