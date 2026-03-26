import { Request, Response } from 'express';
import { AppDataSource } from '../db/data-source';
import { Doctor, UserType } from '../models/Doctor';
import { AllowedSignupId } from '../models/AllowedSignupId';
import { Notification } from '../models/Notification';
import { OTP } from '../entities/OTP';
import { OTPService } from '../services/otpService';
import { RegisterRequest, LoginRequest, AuthResponse } from '../types/auth';
import { hashPassword, comparePassword, validatePasswordStrength } from '../utils/password';
import { generateTokenPair, verifyRefreshToken, generatePasswordResetToken, verifyPasswordResetToken } from '../utils/jwt';
import gmailService from '../services/gmailService';
import { whatsappService } from '../services/whatsappService';
import { OTPService } from '../services/otpService';

/**
 * Register a new doctor
 */
export const register = async (req: Request, res: Response): Promise<void> => {
  try {
    // SECURITY: Don't log sensitive data like passwords
    console.log('📝 Registration request received for:', req.body.email);
    
    const {
      email,
      password,
      clinic_name,
      doctor_name,
      signup_id,
      whatsapp,
      google_location,
      consent,
      user_type = 'doctor' // Default to doctor for backward compatibility
    }: RegisterRequest = req.body;

    // Determine user type - handle both 'regular_user' (frontend and database enum)
    let userType: UserType;
    const userTypeStr = String(user_type || 'doctor').toLowerCase();
    if (userTypeStr === 'regular_user' || userTypeStr === 'regular') {
      userType = UserType.REGULAR; // UserType.REGULAR = 'regular_user'
    } else if (userTypeStr === 'employee') {
      userType = UserType.EMPLOYEE;
    } else {
      userType = UserType.DOCTOR; // Default to doctor
    }
    
    // Note: Regular users don't need signup IDs, only doctors do
    console.log('👤 User type (normalized):', userType, 'Original:', user_type);
    console.log('📋 Field validation:', {
      email: !!email,
      password: !!password,
      doctor_name: !!doctor_name,
      clinic_name: !!clinic_name,
      signup_id: !!signup_id,
      consent: !!consent
    });

    // Validate required fields based on user type
    if (!email || (typeof email === 'string' && email.trim() === '') || 
        !password || (typeof password === 'string' && password.trim() === '') || 
        !doctor_name || (typeof doctor_name === 'string' && doctor_name.trim() === '')) {
      res.status(400).json({
        success: false,
        message: 'Email, password, and name are required'
      });
      return;
    }

    // For doctors, require clinic_name and signup_id
    if (userType === UserType.DOCTOR) {
      if (!clinic_name || (typeof clinic_name === 'string' && clinic_name.trim() === '') || 
          !signup_id || (typeof signup_id === 'string' && signup_id.trim() === '')) {
        res.status(400).json({
          success: false,
          message: 'Clinic name and signup ID are required for doctor registration'
        });
        return;
      }
    }

    // For regular users, clinic_name is optional but recommended
    // For employees, clinic_name is not required

    // Validate consent
    if (!consent) {
      res.status(400).json({
        success: false,
        message: 'Consent is required to register'
      });
      return;
    }

    // Validate password strength
    const passwordValidation = validatePasswordStrength(password);
    if (!passwordValidation.isValid) {
      res.status(400).json({
        success: false,
        message: 'Password does not meet requirements',
        errors: passwordValidation.errors
      });
      return;
    }

    // Check if email already exists (case-insensitive)
    const doctorRepository = AppDataSource.getRepository(Doctor);
    const normalizedEmail = email.trim().toLowerCase();
    console.log('🔍 Registration - Checking for existing email:', normalizedEmail);
    
    const existingDoctor = await doctorRepository
      .createQueryBuilder('doctor')
      .where('LOWER(TRIM(doctor.email)) = LOWER(TRIM(:email))', { email: email.trim() })
      .getOne();
    
    if (existingDoctor) {
      console.log('⚠️ Registration - Email already exists:', existingDoctor.email, 'ID:', existingDoctor.id);
      res.status(409).json({
        success: false,
        message: 'You can make only one type of account'
      });
      return;
    }
    
    console.log('✅ Registration - Email is available:', normalizedEmail);

    // Verify signup ID only for doctors
    let allowedSignupId = null;
    if (userType === UserType.DOCTOR && signup_id) {
      const signupIdRepository = AppDataSource.getRepository(AllowedSignupId);
      allowedSignupId = await signupIdRepository.findOne({ 
        where: { signup_id, is_used: false } 
      });

      if (!allowedSignupId) {
        res.status(400).json({
          success: false,
          message: 'Invalid or already used signup ID'
        });
        return;
      }
    }

    // Hash password
    const passwordHash = await hashPassword(password);

    // Generate unique doctor_id only for doctors
    let doctorId: number | undefined = undefined;
    if (userType === UserType.DOCTOR) {
      const getNextDoctorId = async (): Promise<number> => {
        const lastDoctor = await doctorRepository
          .createQueryBuilder('doctor')
          .where('doctor.doctor_id IS NOT NULL')
          .orderBy('doctor.doctor_id', 'DESC')
          .getOne();
        return lastDoctor && lastDoctor.doctor_id ? lastDoctor.doctor_id + 1 : 42001;
      };
      doctorId = await getNextDoctorId();
    }

    // Auto-approve only regular users (doctors and employees need admin approval)
    const isAutoApproved = userType === UserType.REGULAR;

    // Create user (using Doctor entity for all user types)
    console.log('🔍 Registration - Creating user with data:', {
      email: normalizedEmail,
      user_type: userType,
      doctor_name,
      has_clinic_name: !!clinic_name,
      has_whatsapp: !!whatsapp,
      doctor_id: doctorId,
      isAutoApproved
    });
    
    const doctor = doctorRepository.create({
      doctor_id: doctorId,
      email: normalizedEmail, // Use normalized email
      password_hash: passwordHash,
      clinic_name: clinic_name || undefined,
      doctor_name: doctor_name.trim(),
      whatsapp: whatsapp ? whatsapp.trim() : undefined,
      google_location,
      signup_id: signup_id || undefined,
      user_type: userType,
      consent_flag: consent,
      consent_at: new Date(),
      is_approved: isAutoApproved,
      is_admin: false,
      approved_at: isAutoApproved ? new Date() : undefined
    });

    console.log('🔍 Registration - Attempting to save user...');
    const savedDoctor = await doctorRepository.save(doctor);
    console.log('✅ Registration - User saved successfully:', savedDoctor.id, savedDoctor.email);

    // Mark signup ID as used (only for doctors)
    if (allowedSignupId) {
      console.log('🔑 Registration - Marking signup ID as used:', allowedSignupId.signup_id, 'for email:', email);
      allowedSignupId.markAsUsed(email);
      const signupIdRepository = AppDataSource.getRepository(AllowedSignupId);
      const saved = await signupIdRepository.save(allowedSignupId);
      console.log('✅ Registration - Signup ID marked as used:', saved.signup_id, 'is_used:', saved.is_used, 'used_by_email:', saved.used_by_email);
    }

    // Create notification for admins (only for doctors, regular users and employees are auto-approved)
    if (userType === UserType.DOCTOR) {
      const notificationRepository = AppDataSource.getRepository(Notification);
      const adminNotification = notificationRepository.create({
        recipient_id: savedDoctor.id, // Will be sent to admins via service
        type: 'admin_alert',
        payload: {
          title: 'New Doctor Registration',
          message: `New doctor registration from ${clinic_name} (${doctor_name})`,
          data: {
            doctorId: savedDoctor.id,
            clinicName: clinic_name,
            doctorName: doctor_name,
            email,
            signupId: signup_id
          }
        }
      });

      await notificationRepository.save(adminNotification);

      // Send notification to admins
      try {
        await gmailService.sendNewRegistrationAlert(savedDoctor);
        await whatsappService.sendNewRegistrationAlert(savedDoctor);
      } catch (error: unknown) {
        console.error('Failed to send admin notifications:', error);
      }
    }

    // Generate tokens if auto-approved
    let accessToken = '';
    let refreshToken = '';
    if (isAutoApproved) {
      const tokens = generateTokenPair({
        userId: savedDoctor.id,
        email: savedDoctor.email,
        doctorId: savedDoctor.doctor_id || 0,
        isAdmin: savedDoctor.is_admin,
        isApproved: savedDoctor.is_approved
      });
      accessToken = tokens.accessToken;
      refreshToken = tokens.refreshToken;
    }

    const response: AuthResponse = {
      success: true,
      message: isAutoApproved 
        ? 'Registration successful! Welcome.'
        : 'Registration successful. Please wait for admin approval.',
      data: {
        user: savedDoctor.toPublicJSON(),
        accessToken,
        refreshToken
      }
    };

    res.status(201).json(response);
  } catch (error: unknown) {
    console.error('❌ Registration error:', error);
    if (error instanceof Error) {
      console.error('❌ Error message:', error.message);
      console.error('❌ Error stack:', error.stack);
    }
    
    // Provide more specific error messages
    let errorMessage = 'Registration failed';
    if (error instanceof Error) {
      // Check for common database errors
      if (error.message.includes('duplicate key') || error.message.includes('unique constraint')) {
        errorMessage = 'You can make only one type of account';
      } else if (error.message.includes('violates not-null constraint')) {
        errorMessage = 'Missing required fields';
      } else if (error.message.includes('violates foreign key constraint')) {
        errorMessage = 'Invalid reference data';
      } else {
        errorMessage = `Registration failed: ${error.message}`;
      }
    }
    
    res.status(500).json({
      success: false,
      message: errorMessage,
      error: process.env.NODE_ENV === 'development' ? (error instanceof Error ? error.message : String(error)) : undefined
    });
  }
};

/**
 * Login doctor
 */
export const login = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password, otpCode }: LoginRequest = req.body;

    // Validate required fields
    if (!email || !password) {
      res.status(400).json({
        success: false,
        message: 'Email and password are required'
      });
      return;
    }

    // Find doctor (case-insensitive email lookup)
    const doctorRepository = AppDataSource.getRepository(Doctor);
    const normalizedEmail = email.trim().toLowerCase();
    
    // Use query builder for case-insensitive lookup
    // Note: Using ILIKE for PostgreSQL or LOWER() comparison for case-insensitive search
    const doctor = await doctorRepository
      .createQueryBuilder('doctor')
      .where('LOWER(TRIM(doctor.email)) = LOWER(TRIM(:email))', { email: email.trim() })
      .getOne();
    
    console.log('🔍 Login - Searching for email:', email.trim());
    console.log('🔍 Login - Normalized email:', normalizedEmail);
    console.log('🔍 Login - Doctor found?', !!doctor);
    console.log('🔍 Login - Doctor email (if found):', doctor?.email);

    if (!doctor) {
      console.log('🔍 Login - User not found for email:', normalizedEmail);
      console.log('🔍 Login - Returning 404 with userNotFound flag');
      res.status(404).json({
        success: false,
        message: 'User not found. Please sign up to create an account.',
        userNotFound: true
      });
      return;
    }
    
    console.log('🔍 Login - User found:', doctor.email, 'ID:', doctor.id);

    // Check if account is deactivated
    if (doctor.is_deactivated) {
      res.status(403).json({
        success: false,
        message: 'Account has been deactivated. Please contact support.'
      });
      return;
    }

    // Check password
    const isPasswordValid = await comparePassword(password, doctor.password_hash);
    if (!isPasswordValid) {
      res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
      return;
    }

    // Allow login even if not approved - they will be redirected to waiting-approval page
    // Regular users are auto-approved, so they won't see this page

    // OTP DISABLED TEMPORARILY - Email service not working (Gmail SMTP blocked on Railway Free/Hobby)
    // TODO: Re-enable OTP after reliable email delivery is configured
    // Check if OTP is required (for admin users)
    // IMPORTANT: Only check OTP requirement if OTP code is NOT provided
    // If OTP is provided, we should verify it directly without checking requirement again
    const userRole = doctor.is_admin ? 'admin' : 'user';
    
    // TEMPORARILY DISABLED: Skip OTP check for all users (including admin)
    const OTP_ENABLED = false; // Set to true to re-enable OTP
    
    if (!OTP_ENABLED) {
      console.log('🔐 Login - OTP disabled temporarily, skipping OTP verification');
      // Skip OTP check and proceed with login
    } else if (!otpCode) {
      // No OTP provided - check if OTP is required
      const isOTPRequired = await OTPService.isOTPRequired(doctor.id, userRole);
      
      if (isOTPRequired) {
        try {
          console.log('🔐 Login - OTP required for user:', doctor.email, 'Role:', userRole);
          
          // Generate OTP and save to database first (synchronous)
          // This ensures OTP is available even if email sending fails
          const otpRepository = AppDataSource.getRepository(OTP);
          
          // Invalidate any existing unused OTPs for this user
          await otpRepository.update(
            { user_id: doctor.id, is_used: false },
            { is_used: true }
          );
          
          // Generate new OTP
          const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
          const expiresAt = new Date();
          expiresAt.setMinutes(expiresAt.getMinutes() + 2);
          
          // Save OTP to database
          const otp = otpRepository.create({
            user_id: doctor.id,
            otp_code: otpCode,
            expires_at: expiresAt,
            purpose: 'login',
          });
          await otpRepository.save(otp);
          
          console.log('✅ Login - OTP saved to database');
          
          // Send email in background (non-blocking) to prevent timeout
          // OTP is already saved, so user can verify even if email is delayed
          OTPService.sendOTPEmailOnly(doctor.email, doctor.doctor_name || doctor.email, otpCode, 'login', doctor.id)
            .then(() => {
              console.log('✅ Login - OTP email sent successfully (background)');
            })
            .catch((emailError: unknown) => {
              console.error('⚠️ Login - OTP email sending failed (non-blocking):', emailError);
              // Don't throw - OTP is already saved, user can still verify
            });
          
          // Return response immediately without waiting for email
          res.status(200).json({
            success: false,
            message: 'OTP verification required',
            data: {
              otpRequired: true,
              userId: doctor.id,
              userRole: userRole,
              message: userRole === 'admin' 
                ? 'Admin accounts require OTP verification for every login. OTP sent to your email.'
                : 'OTP verification required. OTP sent to your email.'
            }
          });
          return;
        } catch (error: unknown) {
          console.error('❌ Error generating OTP:', error);
          res.status(500).json({
            success: false,
            message: 'Failed to generate OTP. Please try again.'
          });
          return;
        }
      }
    } else {
      // OTP code is provided - verify it directly without checking requirement again
      // TEMPORARILY DISABLED: Skip OTP verification
      if (OTP_ENABLED) {
        console.log('🔐 Login - OTP code provided, verifying...');
        const isOTPValid = await OTPService.verifyOTP(doctor.id, otpCode, 'login');
        if (!isOTPValid) {
          console.log('❌ Login - Invalid or expired OTP');
          res.status(400).json({
            success: false,
            message: 'Invalid or expired OTP'
          });
          return;
        }
        console.log('✅ Login - OTP verified successfully');
      } else {
        console.log('🔐 Login - OTP verification skipped (OTP disabled)');
      }
    }

    // Generate tokens
    console.log('🔐 Login - Generating tokens for user:', doctor.email);
    let tokens;
    try {
      tokens = generateTokenPair({
        userId: doctor.id,
        email: doctor.email,
        doctorId: doctor.doctor_id || 0,
        isAdmin: doctor.is_admin,
        isApproved: doctor.is_approved
      });
      console.log('✅ Login - Tokens generated successfully');
    } catch (tokenError) {
      console.error('❌ Login - Token generation failed:', tokenError);
      throw tokenError;
    }

    // Convert doctor to JSON
    console.log('📋 Login - Converting doctor to JSON');
    let userJson;
    try {
      userJson = doctor.toJSON();
      console.log('✅ Login - Doctor converted to JSON successfully');
    } catch (jsonError) {
      console.error('❌ Login - JSON conversion failed:', jsonError);
      throw jsonError;
    }

    const response: AuthResponse = {
      success: true,
      message: 'Login successful',
      data: {
        user: userJson,
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken
      }
    };

    console.log('✅ Login - Sending successful response');
    res.json(response);
  } catch (error: unknown) {
    console.error('❌ Login error:', error);
    if (error instanceof Error) {
      console.error('❌ Login error name:', error.name);
      console.error('❌ Login error message:', error.message);
      console.error('❌ Login error stack:', error.stack);
    }
    res.status(500).json({
      success: false,
      message: 'Login failed',
      ...(process.env.NODE_ENV === 'development' && { 
        error: error instanceof Error ? error.message : String(error) 
      })
    });
  }
};

/**
 * Get current user profile
 */
export const getProfile = async (req: Request, res: Response): Promise<void> => {
  try {
    const user = (req as any).user as Doctor;

    if (!user) {
      res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
      return;
    }

    // Load user with orders relation to get accurate sales data
    const doctorRepository = AppDataSource.getRepository(Doctor);
    const userWithOrders = await doctorRepository.findOne({
      where: { id: user.id },
      relations: ['orders']
    });

    if (!userWithOrders) {
      res.status(404).json({
        success: false,
        message: 'User not found'
      });
      return;
    }

    res.json({
      success: true,
      data: {
        user: userWithOrders.toPublicJSON()
      }
    });
  } catch (error: unknown) {
    console.error('Get profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get profile'
    });
  }
};

/**
 * Update user profile
 */
export const updateProfile = async (req: Request, res: Response): Promise<void> => {
  try {
    const user = (req as any).user as Doctor;
    const { clinic_name, doctor_name, whatsapp, google_location } = req.body;

    if (!user) {
      res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
      return;
    }

    const doctorRepository = AppDataSource.getRepository(Doctor);

    // Update allowed fields
    if (clinic_name) user.clinic_name = clinic_name;
    if (doctor_name) user.doctor_name = doctor_name;
    if (whatsapp !== undefined) user.whatsapp = whatsapp;
    if (google_location) user.google_location = google_location;

    const updatedUser = await doctorRepository.save(user);

    res.json({
      success: true,
      message: 'Profile updated successfully',
      data: {
        user: updatedUser.toJSON()
      }
    });
  } catch (error: unknown) {
    console.error('Update profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update profile'
    });
  }
};

/**
 * Save user location
 */
export const saveLocation = async (req: Request, res: Response): Promise<void> => {
  try {
    const user = (req as any).user as Doctor;
    const { google_location } = req.body;

    if (!user) {
      res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
      return;
    }

    if (!google_location || (!google_location.address && !google_location.placeUrl)) {
      res.status(400).json({
        success: false,
        message: 'Valid location data is required (address or placeUrl)'
      });
      return;
    }

    const doctorRepository = AppDataSource.getRepository(Doctor);
    
    // Update user's location
    user.google_location = google_location;
    const updatedUser = await doctorRepository.save(user);

    res.json({
      success: true,
      message: 'Location saved successfully',
      data: {
        location: updatedUser.google_location
      }
    });
  } catch (error: unknown) {
    console.error('Save location error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to save location'
    });
  }
};

/**
 * Get user location
 */
export const getLocation = async (req: Request, res: Response): Promise<void> => {
  try {
    const user = (req as any).user as Doctor;

    if (!user) {
      res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
      return;
    }

    res.json({
      success: true,
      data: {
        location: user.google_location
      }
    });
  } catch (error: unknown) {
    console.error('Get location error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get location'
    });
  }
};

/**
 * Change password
 */
export const changePassword = async (req: Request, res: Response): Promise<void> => {
  try {
    const user = (req as any).user as Doctor;
    const { currentPassword, newPassword } = req.body;

    if (!user) {
      res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
      return;
    }

    // Validate current password
    const isCurrentPasswordValid = await comparePassword(currentPassword, user.password_hash);
    if (!isCurrentPasswordValid) {
      res.status(400).json({
        success: false,
        message: 'Current password is incorrect'
      });
      return;
    }

    // Validate new password strength
    const passwordValidation = validatePasswordStrength(newPassword);
    if (!passwordValidation.isValid) {
      res.status(400).json({
        success: false,
        message: 'New password does not meet requirements',
        errors: passwordValidation.errors
      });
      return;
    }

    // Hash new password
    const newPasswordHash = await hashPassword(newPassword);

    // Update password
    const doctorRepository = AppDataSource.getRepository(Doctor);
    user.password_hash = newPasswordHash;
    await doctorRepository.save(user);

    res.json({
      success: true,
      message: 'Password changed successfully'
    });
  } catch (error: unknown) {
    console.error('Change password error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to change password'
    });
  }
};

/**
 * Logout (client-side token removal)
 */
export const refreshToken = async (req: Request, res: Response): Promise<void> => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      res.status(400).json({
        success: false,
        message: 'Refresh token is required'
      });
      return;
    }

    // Verify refresh token
    const payload = verifyRefreshToken(refreshToken);
    
    // Get user from database
    const doctorRepository = AppDataSource.getRepository(Doctor);
    const user = await doctorRepository.findOne({
      where: { id: payload.userId }
    });

    if (!user) {
      res.status(401).json({
        success: false,
        message: 'User not found'
      });
      return;
    }

    // Generate new token pair
    const tokens = generateTokenPair({
      userId: user.id,
      email: user.email,
      doctorId: user.doctor_id || 0,
      isAdmin: user.is_admin,
      isApproved: user.is_approved
    });

    res.status(200).json({
      success: true,
      message: 'Token refreshed successfully',
      data: {
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken
      }
    });
  } catch (error: any) {
    console.error('Token refresh error:', error);
    res.status(401).json({
      success: false,
      message: 'Invalid or expired refresh token'
    });
  }
};

export const logout = async (req: Request, res: Response): Promise<void> => {
  res.json({
    success: true,
    message: 'Logout successful'
  });
};

/**
 * Request password reset - sends OTP to user's email
 */
export const requestPasswordReset = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email } = req.body;

    if (!email || typeof email !== 'string' || email.trim() === '') {
      res.status(400).json({
        success: false,
        message: 'Email is required'
      });
      return;
    }

    const normalizedEmail = email.trim().toLowerCase();
    console.log('🔐 Password Reset - Request received for email:', email.trim());

    const doctorRepository = AppDataSource.getRepository(Doctor);
    // Use query builder for case-insensitive lookup (same as login)
    const queryBuilder = doctorRepository
      .createQueryBuilder('doctor')
      .where('LOWER(TRIM(doctor.email)) = LOWER(TRIM(:email))', { email: email.trim() });
    
    const user = await queryBuilder.getOne();

    // Always return success message to prevent email enumeration
    // But only send OTP if user exists
    if (user) {
      // Check if user is deactivated
      if (user.is_deactivated) {
        res.status(400).json({
          success: false,
          message: 'This account has been deactivated. Please contact support.'
        });
        return;
      }

      // Generate and save OTP first (must be in DB before response)
      console.log('🔐 Password Reset - Generating OTP for user:', user.id);
      
      // Generate OTP and save to database (synchronous, fast)
      const otpRepository = AppDataSource.getRepository(OTP);
      const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
      const expiresAt = new Date();
      expiresAt.setMinutes(expiresAt.getMinutes() + 2);
      
      // Invalidate existing OTPs
      await otpRepository.update(
        { user_id: user.id, is_used: false },
        { is_used: true }
      );
      
      // Save new OTP
      const otp = otpRepository.create({
        user_id: user.id,
        otp_code: otpCode,
        expires_at: expiresAt,
        purpose: 'password_reset',
      });
      await otpRepository.save(otp);
      console.log('🔐 Password Reset - OTP saved to database');
      
      // Send response immediately (don't wait for email to avoid timeout)
      res.status(200).json({
        success: true,
        message: 'If an account with this email exists, a password reset OTP has been sent.'
      });
      
      // Send email in background (non-blocking to avoid timeout)
      const emailSubject = '🔐 Password Reset OTP - BioAestheticAx Network';
      const emailMessage = 'You have requested to reset your password. Use the OTP below to complete the process:';
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
              <p>Secure Access to BioAestheticAx Network</p>
            </div>
            
            <h2>Hello ${user.doctor_name || user.email}!</h2>
            <p>${emailMessage}</p>
            
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
              <p>This is an automated message from BioAestheticAx Network Security System</p>
              <p>If you have any concerns, please contact our support team</p>
            </div>
          </div>
        </body>
        </html>
      `;
      
      // Verify Gmail is configured before attempting to send
      const gmailUser = process.env.GMAIL_USER;
      const gmailPassword = process.env.GMAIL_APP_PASSWORD;
      
      if (!gmailUser || !gmailPassword) {
        console.error('🔐 Password Reset - Gmail not configured!', {
          gmailUser: gmailUser ? '✅ Set' : '❌ Not Set',
          gmailPassword: gmailPassword ? '✅ Set' : '❌ Not Set',
          recipientEmail: user.email
        });
        // Don't throw error - OTP is already saved, user can request again
        return;
      }
      
      console.log('🔐 Password Reset - Sending OTP email to:', user.email);
      console.log('🔐 Password Reset - From Gmail account:', gmailUser);
      
      // Send email in background with detailed error logging
      gmailService.sendEmail(user.email, emailSubject, htmlContent, {
        isOTP: true,
        bypassQuota: true,
        userId: user.id
      })
        .then(() => {
          console.log('🔐 Password Reset - OTP email sent successfully to:', user.email);
        })
        .catch((error: any) => {
          console.error('🔐 Password Reset - Failed to send OTP email:', error);
          console.error('🔐 Password Reset - Error details:', {
            message: error?.message,
            code: error?.code,
            response: error?.response,
            responseCode: error?.responseCode,
            command: error?.command,
            stack: error?.stack
          });
          // Log Gmail configuration status
          console.error('🔐 Password Reset - Gmail Config Check:', {
            gmailUser: gmailUser ? '✅ Set' : '❌ Not Set',
            gmailPassword: gmailPassword ? '✅ Set' : '❌ Not Set',
            recipientEmail: user.email,
            fromEmail: gmailUser
          });
        });
    } else {
      // User doesn't exist - redirect to signup
      console.log('🔐 Password Reset - User not found for email:', normalizedEmail);
      console.log('🔐 Password Reset - Returning redirectToSignup response');
      
      // Removed expensive debug queries that were causing timeouts:
      // - Fetching all users from database
      // - Redundant SQL queries
      // - Similar email searches
      // These operations were taking >10 seconds with large user bases
      
      res.status(200).json({
        success: false,
        message: 'No account found with this email. Please create a new account.',
        redirectToSignup: true
      });
    }
  } catch (error: any) {
    console.error('Password reset request error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to process password reset request. Please try again.'
    });
  }
};

/**
 * Confirm password reset with OTP and set new password
 */
export const confirmPasswordReset = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, otpCode, newPassword } = req.body;

    if (!email || !otpCode || !newPassword) {
      res.status(400).json({
        success: false,
        message: 'Email, OTP code, and new password are required'
      });
      return;
    }

    // Validate password strength
    const passwordValidation = validatePasswordStrength(newPassword);
    if (!passwordValidation.isValid) {
      res.status(400).json({
        success: false,
        message: passwordValidation.errors.join('. ') || 'Password does not meet requirements'
      });
      return;
    }

    const doctorRepository = AppDataSource.getRepository(Doctor);
    // Use query builder for case-insensitive lookup (same as login)
    const user = await doctorRepository
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

    // Check if user is deactivated
    if (user.is_deactivated) {
      res.status(400).json({
        success: false,
        message: 'This account has been deactivated. Please contact support.'
      });
      return;
    }

    // Verify OTP
    const otpRepository = AppDataSource.getRepository(OTP);
    const otp = await otpRepository.findOne({
      where: {
        user_id: user.id,
        otp_code: otpCode,
        purpose: 'password_reset',
        is_used: false
      }
    });

    if (!otp) {
      res.status(400).json({
        success: false,
        message: 'Invalid or expired OTP code'
      });
      return;
    }

    // Check if OTP is expired
    if (new Date() > otp.expires_at) {
      res.status(400).json({
        success: false,
        message: 'OTP code has expired. Please request a new one.'
      });
      return;
    }

    // Hash new password
    const hashedPassword = await hashPassword(newPassword);

    // Update user password
    user.password_hash = hashedPassword;
    await doctorRepository.save(user);

    // Mark OTP as used
    otp.is_used = true;
    await otpRepository.save(otp);

    res.status(200).json({
      success: true,
      message: 'Password has been reset successfully. You can now login with your new password.'
    });
  } catch (error: any) {
    console.error('Password reset confirm error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to reset password. Please try again.'
    });
  }
};
