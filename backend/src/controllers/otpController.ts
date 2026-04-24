import { Request, Response } from 'express';
import { OTPRateLimitError, OTPService } from '../services/otpService';
import { AppDataSource } from '../db/data-source';
import { Doctor } from '../models/Doctor';
import { AuthenticatedRequest } from '../types/auth';

const UUID_V4_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const isEmailTransportError = (message: string): boolean => {
  const lower = message.toLowerCase();
  return (
    lower.includes('gmail') ||
    lower.includes('smtp') ||
    lower.includes('access token') ||
    lower.includes('email transport') ||
    lower.includes('send otp email')
  );
};

export class OTPController {
  static async generateOTP(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { userId } = req.body;

      if (!userId) {
        res.status(400).json({ 
          success: false, 
          message: 'User ID is required' 
        });
        return;
      }

      if (typeof userId !== 'string' || !UUID_V4_REGEX.test(userId)) {
        res.status(400).json({
          success: false,
          message: 'Invalid user ID format',
        });
        return;
      }

      if (!req.user) {
        res.status(401).json({
          success: false,
          message: 'Authentication required',
        });
        return;
      }

      if (req.user.id !== userId && !req.user.is_admin) {
        res.status(403).json({
          success: false,
          message: 'Access denied. You can only request OTP for your own account.',
        });
        return;
      }

      // Verify user exists
      const userRepository = AppDataSource.getRepository(Doctor);
      const user = await userRepository.findOne({ where: { id: userId } });

      if (!user) {
        res.status(404).json({ 
          success: false, 
          message: 'User not found' 
        });
        return;
      }

      // Get purpose from request body - allow 'password_reset', 'login', and 'admin_access'
      const purpose = req.body.purpose || 'password_reset';
      
      // Validate purpose - only allow specific purposes
      const allowedPurposes = ['password_reset', 'login', 'admin_access'];
      if (!allowedPurposes.includes(purpose)) {
        res.status(400).json({ 
          success: false, 
          message: `Invalid purpose. Allowed purposes: ${allowedPurposes.join(', ')}` 
        });
        return;
      }
      
      // Generate and send OTP
      await OTPService.generateAndSendOTP(userId, purpose);

      res.status(200).json({
        success: true,
        message: 'OTP sent successfully to your email',
        data: {
          userId: userId,
          email: user.email,
          expiresIn: '2 minutes'
        }
      });
    } catch (error: unknown) {
      console.error('Error generating OTP:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to generate OTP';
      const isOTPRateLimitError = error instanceof OTPRateLimitError;
      const isRateLimitError = /wait|too many/i.test(errorMessage);
      const statusCode = isOTPRateLimitError || isRateLimitError ? 429 : 500;
      const isTransportFailure = statusCode === 500 && isEmailTransportError(errorMessage);

      res.status(statusCode).json({
        success: false,
        message: isTransportFailure ? 'Failed to send OTP email. Please try again shortly.' : (statusCode === 500 ? 'Failed to generate OTP' : errorMessage),
        ...(statusCode === 429
          ? {
              code: isOTPRateLimitError ? error.code : 'OTP_RATE_LIMITED',
              retryAfterSeconds: isOTPRateLimitError ? error.retryAfterSeconds : undefined,
            }
          : statusCode === 500
            ? { code: isTransportFailure ? 'OTP_EMAIL_DELIVERY_FAILED' : 'OTP_GENERATION_FAILED' }
            : {}),
      });
    }
  }

  // New method for resending OTP without authentication (for expired tokens)
  static async resendOTP(req: Request, res: Response): Promise<void> {
    try {
      const { email } = req.body;

      if (!email) {
        res.status(400).json({ 
          success: false, 
          message: 'Email is required' 
        });
        return;
      }

      // Verify user exists by email (case-insensitive lookup)
      const userRepository = AppDataSource.getRepository(Doctor);
      const user = await userRepository
        .createQueryBuilder('doctor')
        .where('LOWER(TRIM(doctor.email)) = LOWER(TRIM(:email))', { email: email.trim() })
        .getOne();

      if (!user) {
        res.status(404).json({ 
          success: false, 
          message: 'User not found' 
        });
        return;
      }

      // Get purpose from request body or default to 'login' for resend during login flow
      const purpose = req.body.purpose || 'login';
      const allowedPurposes = ['password_reset', 'login', 'admin_access'];
      if (!allowedPurposes.includes(purpose)) {
        res.status(400).json({
          success: false,
          message: `Invalid purpose. Allowed purposes: ${allowedPurposes.join(', ')}`
        });
        return;
      }
      
      // Generate and send OTP (for login or password reset)
      await OTPService.generateAndSendOTP(user.id, purpose);

      res.status(200).json({
        success: true,
        message: 'OTP resent successfully to your email',
        data: {
          userId: user.id,
          email: user.email,
          expiresIn: '2 minutes'
        }
      });
    } catch (error: unknown) {
      console.error('Error resending OTP:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to resend OTP';
      const isOTPRateLimitError = error instanceof OTPRateLimitError;
      const isRateLimitError = /wait|too many/i.test(errorMessage);
      const statusCode = isOTPRateLimitError || isRateLimitError ? 429 : 500;
      const isTransportFailure = statusCode === 500 && isEmailTransportError(errorMessage);

      res.status(statusCode).json({
        success: false,
        message: isTransportFailure ? 'Failed to send OTP email. Please try again shortly.' : (statusCode === 500 ? 'Failed to resend OTP' : errorMessage),
        ...(statusCode === 429
          ? {
              code: isOTPRateLimitError ? error.code : 'OTP_RATE_LIMITED',
              retryAfterSeconds: isOTPRateLimitError ? error.retryAfterSeconds : undefined,
            }
          : statusCode === 500
            ? { code: isTransportFailure ? 'OTP_EMAIL_DELIVERY_FAILED' : 'OTP_RESEND_FAILED' }
            : {}),
      });
    }
  }

  static async verifyOTP(req: Request, res: Response): Promise<void> {
    try {
      const { userId, otpCode, purpose } = req.body;
      const normalizedOtpCode = typeof otpCode === 'string' ? otpCode.trim() : '';

      if (!userId || !normalizedOtpCode) {
        res.status(400).json({ 
          success: false, 
          message: 'User ID and OTP code are required' 
        });
        return;
      }

      // Get purpose from request body or default to 'login'
      const otpPurpose = purpose || 'login';

      // Verify OTP
      const isValid = await OTPService.verifyOTP(userId, normalizedOtpCode, otpPurpose);

      if (!isValid) {
        res.status(400).json({
          success: false,
          message: 'Invalid or expired OTP'
        });
        return;
      }

      res.status(200).json({
        success: true,
        message: 'OTP verified successfully',
        data: {
          userId: userId,
          verified: true
        }
      });
    } catch (error: unknown) {
      console.error('Error verifying OTP:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to verify OTP'
      });
    }
  }

  static async checkOTPRequirement(req: Request, res: Response): Promise<void> {
    try {
      const { userId, userRole } = req.body;

      if (!userId || !userRole) {
        res.status(400).json({ 
          success: false, 
          message: 'User ID and role are required' 
        });
        return;
      }

      const isRequired = await OTPService.isOTPRequired(userId, userRole);

      res.status(200).json({
        success: true,
        data: {
          userId: userId,
          userRole: userRole,
          otpRequired: isRequired
        }
      });
    } catch (error: unknown) {
      console.error('Error checking OTP requirement:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to check OTP requirement'
      });
    }
  }
}
