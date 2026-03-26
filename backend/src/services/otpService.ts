import { AppDataSource } from '../db/data-source';
import { OTP } from '../entities/OTP';
import { Doctor } from '../models/Doctor';
import gmailService from './gmailService';
import gmailApiService from './gmailApiService';
import { getOTPConfigForUserType, isOTPRequiredForUserType, getOTPDurationForUserType } from '../controllers/otpConfigController';

export class OTPService {
  private static generateOTP(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  private static getExpirationTime(): Date {
    const now = new Date();
    now.setMinutes(now.getMinutes() + 2); // OTP expires in 2 minutes
    return now;
  }

  static async generateAndSendOTP(userId: string, purpose: string = 'login'): Promise<string> {
    try {
      // Get user details
      const userRepository = AppDataSource.getRepository(Doctor);
      const user = await userRepository.findOne({ where: { id: userId } });

      if (!user) {
        throw new Error('User not found');
      }

      // Invalidate any existing unused OTPs for this user
      const otpRepository = AppDataSource.getRepository(OTP);
      await otpRepository.update(
        { user_id: userId, is_used: false },
        { is_used: true }
      );

      // Generate new OTP
      const otpCode = this.generateOTP();
      const expiresAt = this.getExpirationTime();

      // Save OTP to database
      const otp = otpRepository.create({
        user_id: userId,
        otp_code: otpCode,
        expires_at: expiresAt,
        purpose: purpose,
      });

      await otpRepository.save(otp);

      // Send OTP via email (pass userId for tracking)
      // Note: This is now called in background for login to prevent timeout
      // OTP is already saved, so verification can proceed even if email is delayed
      await this.sendOTPEmail(user.email, user.doctor_name || user.email, otpCode, purpose, userId);

      return otpCode;
    } catch (error: unknown) {
      console.error('Error generating OTP:', error);
      throw new Error('Failed to generate OTP');
    }
  }

  static async verifyOTP(userId: string, otpCode: string, purpose: string = 'login'): Promise<boolean> {
    try {
      const otpRepository = AppDataSource.getRepository(OTP);
      
      const otp = await otpRepository.findOne({
        where: {
          user_id: userId,
          otp_code: otpCode,
          purpose: purpose,
          is_used: false,
        },
      });

      if (!otp) {
        return false;
      }

      // Check if OTP is expired
      if (new Date() > otp.expires_at) {
        return false;
      }

      // Mark OTP as used
      await otpRepository.update(
        { id: otp.id },
        { 
          is_used: true,
          used_at: new Date()
        }
      );

      return true;
    } catch (error: unknown) {
      console.error('Error verifying OTP:', error);
      return false;
    }
  }

  static async isOTPRequired(userId: string, userRole: string): Promise<boolean> {
    try {
      // Determine user type based on role
      // Map 'user' role to 'regular' for OTP config lookup
      const userType = (userRole === 'admin' || userRole === 'full_admin' || userRole === 'viewer_admin') ? 'admin' : 'regular';
      
      console.log(`🔍 OTP Check - userId: ${userId}, userRole: ${userRole}, mapped userType: ${userType}`);
      
      // Check if OTP is required for this user type (from database)
      // CRITICAL: Must await these async functions and handle errors!
      let isRequired: boolean;
      try {
        isRequired = await isOTPRequiredForUserType(userType);
        console.log(`🔍 OTP Check - isRequired from DB: ${isRequired}`);
      } catch (error) {
        console.error(`❌ Error calling isOTPRequiredForUserType for ${userType}:`, error);
        console.error('Error details:', error instanceof Error ? error.message : String(error));
        // Default to requiring OTP for security if query fails
        isRequired = true;
        console.log(`⚠️ Defaulting isRequired to true (secure default) due to error`);
      }
      
      if (!isRequired) {
        console.log(`✅ OTP Check - OTP not required (isRequired=false) for ${userType}`);
        return false;
      }

      // Get the configured duration for this user type (from database)
      // CRITICAL: Must await this async function and handle errors!
      let durationHours: number;
      try {
        durationHours = await getOTPDurationForUserType(userType);
        console.log(`🔍 OTP Check - durationHours from DB: ${durationHours}`);
      } catch (error) {
        console.error(`❌ Error calling getOTPDurationForUserType for ${userType}:`, error);
        console.error('Error details:', error instanceof Error ? error.message : String(error));
        // Default to requiring OTP (Every Time) if query fails
        durationHours = 1;
        console.log(`⚠️ Defaulting durationHours to 1 (Every Time) due to error`);
      }
      
      if (durationHours === 0) {
        console.log(`✅ OTP Check - OTP not required (duration=0) for ${userType}`);
        return false; // Not required
      }

      // For "every time" (1 hour), always require OTP
      if (durationHours === 1) {
        console.log(`✅ OTP Check - OTP required (Every Time - duration=1 hour) for ${userType}`);
        return true;
      }

      // Check if user has used OTP within the configured duration
      const otpRepository = AppDataSource.getRepository(OTP);
      const now = new Date();
      const durationAgo = new Date(now.getTime() - (durationHours * 60 * 60 * 1000));

      const recentOTP = await otpRepository
        .createQueryBuilder('otp')
        .where('otp.user_id = :userId', { userId })
        .andWhere('otp.purpose = :purpose', { purpose: 'login' })
        .andWhere('otp.is_used = :isUsed', { isUsed: true })
        .andWhere('otp.used_at >= :durationAgo', { durationAgo })
        .orderBy('otp.used_at', 'DESC')
        .getOne();

      const requiresOTP = !recentOTP;
      console.log(`🔍 OTP Check - durationHours: ${durationHours}, durationAgo: ${durationAgo.toISOString()}, recentOTP found: ${!!recentOTP}, recentOTP used_at: ${recentOTP?.used_at?.toISOString() || 'N/A'}, requiresOTP: ${requiresOTP}`);
      
      // If no OTP was used within the duration, require OTP
      return requiresOTP;
    } catch (error: unknown) {
      console.error('❌ Error checking OTP requirement:', error);
      console.error('Error details:', error instanceof Error ? error.message : String(error));
      console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace');
      return true; // Default to requiring OTP for security
    }
  }

  /**
   * Send OTP email (public method for sending email after OTP is already generated)
   */
  static async sendOTPEmailOnly(email: string, name: string, otpCode: string, purpose: string, userId?: string): Promise<void> {
    return this.sendOTPEmail(email, name, otpCode, purpose, userId);
  }

  private static async sendOTPEmail(email: string, name: string, otpCode: string, purpose: string, userId?: string): Promise<void> {
    // OTP emails are sent for password reset, login verification, and admin access
    let subject = '';
    let message = '';
    
    switch (purpose) {
      case 'password_reset':
        subject = `Your OTP for Password Reset - AestheticRxNetwork`;
        message = 'You have requested a password reset to your AestheticRxNetwork account.';
        break;
      case 'login':
        subject = `Your OTP for Login Verification - AestheticRxNetwork`;
        message = 'You are attempting to log in to your AestheticRxNetwork account. Please use the OTP below to complete your login.';
        break;
      case 'admin_access':
        subject = `Your OTP for Admin Dashboard Access - AestheticRxNetwork`;
        message = 'You are attempting to access the Admin Dashboard. Please use the OTP below to verify your admin access.';
        break;
      default:
        subject = `Your OTP Verification - AestheticRxNetwork`;
        message = 'Please use the OTP below to verify your access.';
    }
    
    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>OTP Verification</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #f4f4f4; }
          .container { max-width: 600px; margin: 0 auto; background-color: #ffffff; padding: 20px; border-radius: 10px; box-shadow: 0 0 10px rgba(0,0,0,0.1); }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; text-align: center; border-radius: 10px 10px 0 0; margin: -20px -20px 20px -20px; }
          .otp-code { background-color: #f8f9fa; border: 2px dashed #007bff; padding: 20px; text-align: center; margin: 20px 0; border-radius: 8px; }
          .otp-number { font-size: 32px; font-weight: bold; color: #007bff; letter-spacing: 5px; }
          .warning { background-color: #fff3cd; border: 1px solid #ffeaa7; color: #856404; padding: 15px; border-radius: 5px; margin: 20px 0; }
          .footer { text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; color: #666; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🔐 OTP Verification</h1>
            <p>Secure Access to AestheticRxNetwork</p>
          </div>
          
          <h2>Hello ${name}!</h2>
          <p>${message}</p>
          
          <div class="otp-code">
            <p style="margin: 0 0 10px 0; font-weight: bold;">Your One-Time Password (OTP) is:</p>
            <div class="otp-number">${otpCode}</div>
          </div>
          
          <div class="warning">
            <strong>⚠️ Important Security Information:</strong>
            <ul style="margin: 10px 0; padding-left: 20px;">
              <li>This OTP is valid for <strong>2 minutes only</strong></li>
              <li>Do not share this code with anyone</li>
              <li>Our team will never ask for your OTP</li>
              <li>If you didn't request this, please ignore this email</li>
            </ul>
          </div>
          
          <div class="footer">
            <p>This is an automated message from AestheticRxNetwork Security System</p>
            <p>If you have any concerns, please contact our support team</p>
          </div>
        </div>
      </body>
      </html>
    `;

    // OTP emails are time-sensitive and must be sent immediately
    // Try Gmail API first (OAuth2, more reliable), fall back to SMTP
    if (gmailApiService.isConfigured()) {
      console.log('📧 Sending OTP via Gmail API (OAuth2)...');
      try {
        await gmailApiService.sendEmail(email, subject, htmlContent);
        console.log('✅ OTP sent via Gmail API');
        return;
      } catch (apiError) {
        console.warn('⚠️ Gmail API failed, falling back to SMTP:', apiError instanceof Error ? apiError.message : apiError);
      }
    }

    // Fallback to SMTP
    console.log('📧 Sending OTP via Gmail SMTP...');
    await gmailService.sendEmail(email, subject, htmlContent, {
      isOTP: true,
      bypassQuota: true, // OTP is critical, bypass quota check
      userId: userId // Pass userId for proper tracking
    });
  }
}
