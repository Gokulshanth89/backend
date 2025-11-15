import nodemailer from 'nodemailer'
import dotenv from 'dotenv'
import path from 'path'

// Load environment variables from backend/.env
dotenv.config({ path: path.resolve(__dirname, '../../.env') })

// Get email credentials from environment variables
// Remove spaces from password (Gmail App Passwords don't have spaces)
const getEmailCredentials = () => {
  const emailUser = process.env.EMAIL_USER?.trim()
  const emailPass = process.env.EMAIL_PASS?.trim().replace(/\s+/g, '') || ''
  
  // Debug logging (only in development)
  if (process.env.NODE_ENV === 'development') {
    console.log('Email credentials check:', {
      EMAIL_USER_exists: !!process.env.EMAIL_USER,
      EMAIL_USER_length: process.env.EMAIL_USER?.length || 0,
      EMAIL_PASS_exists: !!process.env.EMAIL_PASS,
      EMAIL_PASS_length: process.env.EMAIL_PASS?.length || 0,
      emailUser_after_trim: !!emailUser,
      emailPass_after_trim: !!emailPass
    })
  }
  
  return { emailUser, emailPass }
}

// Create transporter function that reads credentials dynamically
const createTransporter = () => {
  const { emailUser, emailPass } = getEmailCredentials()
  
  if (!emailUser || !emailPass) {
    console.warn('Warning: Email credentials not configured. Email functionality will not work.')
    console.warn(`EMAIL_USER: ${emailUser ? 'Set' : 'Missing'}, EMAIL_PASS: ${emailPass ? 'Set' : 'Missing'}`)
  }
  
  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: emailUser,
      pass: emailPass,
    },
  })
}

const transporter = createTransporter()

// Verify transporter configuration (async, won't block)
setTimeout(() => {
  transporter.verify((error, success) => {
    if (error) {
      console.error('Email transporter verification failed:', error.message)
      // Type guard for nodemailer errors
      if (error && typeof error === 'object' && 'code' in error && error.code === 'EAUTH') {
        console.error('Authentication failed. Please check your EMAIL_USER and EMAIL_PASS in .env file')
        console.error('Note: Gmail App Passwords should not contain spaces')
      }
    } else {
      console.log('Email transporter is ready to send messages')
    }
  })
}, 1000) // Delay to ensure dotenv is loaded

export const sendOTPEmail = async (email: string, otp: string): Promise<boolean> => {
  try {
    const { emailUser, emailPass } = getEmailCredentials()
    if (!emailUser || !emailPass) {
      console.error('Email credentials not configured')
      return false
    }
    
    const transporter = createTransporter()

    const mailOptions = {
      from: emailUser,
      to: email,
      subject: 'Your OTP for Hotel Management System Login',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">Hotel Management System</h2>
          <p>Hello,</p>
          <p>Your One-Time Password (OTP) for login is:</p>
          <div style="background-color: #f4f4f4; padding: 20px; text-align: center; margin: 20px 0;">
            <h1 style="color: #007bff; font-size: 32px; margin: 0; letter-spacing: 5px;">${otp}</h1>
          </div>
          <p>This OTP will expire in 10 minutes.</p>
          <p>If you didn't request this OTP, please ignore this email.</p>
          <p style="color: #666; font-size: 12px; margin-top: 30px;">This is an automated message, please do not reply.</p>
        </div>
      `,
    }

    await transporter.sendMail(mailOptions)
    return true
  } catch (error) {
    console.error('Error sending email:', error)
    return false
  }
}

export const sendWelcomeEmail = async (
  email: string,
  firstName: string,
  lastName: string
): Promise<{ success: boolean; error?: string }> => {
  try {
    const { emailUser, emailPass } = getEmailCredentials()
    if (!emailUser || !emailPass) {
      const errorMsg = 'Email credentials not configured. Please check EMAIL_USER and EMAIL_PASS in .env file'
      console.error(errorMsg)
      console.error(`Current EMAIL_USER: ${process.env.EMAIL_USER ? 'Set' : 'Missing'}, EMAIL_PASS: ${process.env.EMAIL_PASS ? 'Set' : 'Missing'}`)
      return { success: false, error: errorMsg }
    }
    
    const transporter = createTransporter()

    const mailOptions = {
      from: emailUser,
      to: email,
      subject: 'Welcome to Hotel Management System - Mobile App Login Instructions',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
            <h1 style="color: white; margin: 0; font-size: 28px;">Welcome to Hotel Management System!</h1>
          </div>
          
          <div style="background-color: #ffffff; padding: 30px; border: 1px solid #e0e0e0; border-top: none;">
            <p style="color: #333; font-size: 16px; line-height: 1.6;">
              Hello <strong>${firstName} ${lastName}</strong>,
            </p>
            
            <p style="color: #555; font-size: 15px; line-height: 1.6;">
              Your employee account has been successfully created! You can now access the Hotel Management System mobile app using your email address.
            </p>

            <div style="background-color: #f0f7ff; border-left: 4px solid #007bff; padding: 20px; margin: 25px 0; border-radius: 5px;">
              <h2 style="color: #007bff; margin-top: 0; font-size: 20px;">📱 Mobile App Login Instructions</h2>
              
              <div style="margin: 20px 0;">
                <div style="display: flex; align-items: flex-start; margin-bottom: 20px;">
                  <div style="background-color: #007bff; color: white; width: 30px; height: 30px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: bold; margin-right: 15px; flex-shrink: 0;">1</div>
                  <div>
                    <h3 style="color: #333; margin: 0 0 5px 0; font-size: 16px;">Open the Mobile App</h3>
                    <p style="color: #666; margin: 0; font-size: 14px; line-height: 1.5;">Launch the Hotel Management mobile application on your device</p>
                  </div>
                </div>

                <div style="display: flex; align-items: flex-start; margin-bottom: 20px;">
                  <div style="background-color: #007bff; color: white; width: 30px; height: 30px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: bold; margin-right: 15px; flex-shrink: 0;">2</div>
                  <div>
                    <h3 style="color: #333; margin: 0 0 5px 0; font-size: 16px;">Enter Your Email</h3>
                    <p style="color: #666; margin: 0; font-size: 14px; line-height: 1.5;">
                      Use your registered email address: <strong style="color: #007bff;">${email}</strong>
                    </p>
                  </div>
                </div>

                <div style="display: flex; align-items: flex-start; margin-bottom: 20px;">
                  <div style="background-color: #007bff; color: white; width: 30px; height: 30px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: bold; margin-right: 15px; flex-shrink: 0;">3</div>
                  <div>
                    <h3 style="color: #333; margin: 0 0 5px 0; font-size: 16px;">Request OTP</h3>
                    <p style="color: #666; margin: 0; font-size: 14px; line-height: 1.5;">Click the "Request OTP" button. A 6-digit verification code will be sent to this email address</p>
                  </div>
                </div>

                <div style="display: flex; align-items: flex-start;">
                  <div style="background-color: #007bff; color: white; width: 30px; height: 30px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: bold; margin-right: 15px; flex-shrink: 0;">4</div>
                  <div>
                    <h3 style="color: #333; margin: 0 0 5px 0; font-size: 16px;">Enter OTP & Login</h3>
                    <p style="color: #666; margin: 0; font-size: 14px; line-height: 1.5;">Check your email for the OTP code, enter it in the app, and click "Verify" to complete login</p>
                  </div>
                </div>
              </div>
            </div>

            <div style="background-color: #fff3cd; border: 1px solid #ffc107; border-radius: 5px; padding: 15px; margin: 25px 0;">
              <p style="color: #856404; margin: 0; font-size: 14px; line-height: 1.6;">
                <strong>⚠️ Important Notes:</strong><br>
                • The OTP code is valid for <strong>10 minutes</strong> only<br>
                • You do <strong>not need a password</strong> - authentication is done via email OTP only<br>
                • Make sure to check your spam folder if you don't receive the OTP email
              </p>
            </div>

            <div style="background-color: #f8f9fa; padding: 20px; border-radius: 5px; margin-top: 25px;">
              <p style="color: #666; font-size: 14px; margin: 0; line-height: 1.6;">
                If you have any questions or need assistance, please contact your system administrator.
              </p>
            </div>

            <p style="color: #999; font-size: 12px; margin-top: 30px; text-align: center; border-top: 1px solid #e0e0e0; padding-top: 20px;">
              This is an automated message. Please do not reply to this email.<br>
              © ${new Date().getFullYear()} Hotel Management System. All rights reserved.
            </p>
          </div>
        </div>
      `,
    }

    console.log(`Attempting to send welcome email to: ${email}`)
    const result = await transporter.sendMail(mailOptions)
    console.log(`Welcome email sent successfully to: ${email}`, result.messageId)
    return { success: true }
  } catch (error: unknown) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown error occurred while sending email'
    console.error('Error sending welcome email:', error)
    
    // Type guard for nodemailer errors
    const isNodemailerError = (err: unknown): err is { code?: string; command?: string; response?: string; responseCode?: number; message?: string } => {
      return typeof err === 'object' && err !== null
    }
    
    if (isNodemailerError(error)) {
      console.error('Error details:', {
        code: error.code,
        command: error.command,
        response: error.response,
        responseCode: error.responseCode,
        message: error.message
      })
      
      // Provide more specific error messages
      if (error.code === 'EAUTH') {
        return { 
          success: false, 
          error: 'Email authentication failed. Please check EMAIL_USER and EMAIL_PASS in .env file. Make sure you are using a Gmail App Password, not your regular password.' 
        }
      } else if (error.code === 'ECONNECTION' || error.code === 'ETIMEDOUT') {
        return { 
          success: false, 
          error: 'Failed to connect to email server. Please check your internet connection.' 
        }
      }
    }
    
    return { 
      success: false, 
      error: `Failed to send email: ${errorMsg}` 
    }
  }
}

