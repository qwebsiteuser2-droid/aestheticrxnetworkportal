import { Request, Response } from 'express';
import { OAuth2Client } from 'google-auth-library';
import { AppDataSource } from '../db/data-source';
import { Doctor, UserType } from '../models/Doctor';
import { AllowedSignupId } from '../models/AllowedSignupId';
import { Notification } from '../models/Notification';
import { generateTokenPair } from '../utils/jwt';
import { hashPassword, generateRandomPassword } from '../utils/password';
import gmailService from '../services/gmailService';
import { whatsappService } from '../services/whatsappService';

// Initialize Google OAuth client
const GOOGLE_CLIENT_ID = process.env.CLIENT_ID_GOOGLESIGNIN;
const GOOGLE_CLIENT_SECRET = process.env.CLIENT_SECRETE_GOOGLESIGIN;

const client = new OAuth2Client(GOOGLE_CLIENT_ID);

interface GoogleTokenPayload {
  sub: string; // Google user ID
  email: string;
  email_verified: boolean;
  name: string;
  picture?: string;
  given_name?: string;
  family_name?: string;
}

/**
 * Verify Google ID token and extract user info
 */
async function verifyGoogleToken(idToken: string): Promise<GoogleTokenPayload | null> {
  try {
    const ticket = await client.verifyIdToken({
      idToken,
      audience: GOOGLE_CLIENT_ID,
    });
    
    const payload = ticket.getPayload();
    if (!payload) {
      return null;
    }
    
    return {
      sub: payload.sub,
      email: payload.email || '',
      email_verified: payload.email_verified || false,
      name: payload.name || '',
      picture: payload.picture,
      given_name: payload.given_name,
      family_name: payload.family_name,
    };
  } catch (error) {
    console.error('❌ Error verifying Google token:', error);
    return null;
  }
}

function normalizeUserType(userTypeRaw: unknown): UserType {
  const userTypeStr = String(userTypeRaw || 'regular_user').toLowerCase();
  if (userTypeStr === 'regular_user' || userTypeStr === 'regular') {
    return UserType.REGULAR;
  }
  if (userTypeStr === 'employee') {
    return UserType.EMPLOYEE;
  }
  return UserType.DOCTOR;
}

/**
 * Google Sign-In / Sign-Up
 *
 * Login (default): existing accounts only; missing account → redirectToSignup
 * Signup (mode=signup): creates account with Google profile
 *   - regular_user: auto-approved
 *   - doctor: requires signup_id; waits for admin approval
 */
export const googleAuth = async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      idToken,
      mode = 'login',
      userType: userTypeRaw,
      signup_id,
      clinic_name,
      consent,
    } = req.body;

    if (!idToken) {
      res.status(400).json({
        success: false,
        message: 'Google ID token is required',
      });
      return;
    }

    // Verify the Google token
    const googleUser = await verifyGoogleToken(idToken);
    if (!googleUser) {
      res.status(401).json({
        success: false,
        message: 'Invalid Google token',
      });
      return;
    }

    // Check if email is verified by Google
    if (!googleUser.email_verified) {
      res.status(400).json({
        success: false,
        message: 'Google email is not verified',
      });
      return;
    }

    console.log('✅ Google token verified for:', googleUser.email);

    const doctorRepository = AppDataSource.getRepository(Doctor);
    const normalizedEmail = googleUser.email.toLowerCase().trim();

    // Check if user already exists (by email or Google ID)
    let user = await doctorRepository.findOne({
      where: [
        { email: normalizedEmail },
        { google_id: googleUser.sub },
      ],
    });

    let isNewUser = false;

    if (!user) {
      if (mode !== 'signup') {
        console.log('❌ Google Sign-In - No account found for:', googleUser.email);
        res.status(404).json({
          success: false,
          message: 'No account found for this Google email. Please sign up first.',
          redirectToSignup: true,
        });
        return;
      }

      // --- Sign up with Google ---
      const userType = normalizeUserType(userTypeRaw);

      if (userType === UserType.EMPLOYEE) {
        res.status(400).json({
          success: false,
          message: 'Employee accounts cannot be created with Google. Please use email signup.',
        });
        return;
      }

      // Consent defaults to true for Google (user chose Continue with Google)
      const hasConsent = consent !== false && consent !== 'false';
      if (!hasConsent) {
        res.status(400).json({
          success: false,
          message: 'Consent is required to register',
        });
        return;
      }

      let allowedSignupId: AllowedSignupId | null = null;
      const signupId = typeof signup_id === 'string' ? signup_id.trim() : '';

      if (userType === UserType.DOCTOR) {
        if (!signupId) {
          res.status(400).json({
            success: false,
            message: 'Signup ID is required for doctor registration with Google',
          });
          return;
        }

        const signupIdRepository = AppDataSource.getRepository(AllowedSignupId);
        allowedSignupId = await signupIdRepository.findOne({
          where: { signup_id: signupId, is_used: false },
        });

        if (!allowedSignupId) {
          res.status(400).json({
            success: false,
            message: 'Invalid or already used signup ID',
          });
          return;
        }
      }

      // Unusable random password — Google users sign in via Google
      const passwordHash = await hashPassword(generateRandomPassword(24));

      let doctorId: number | undefined;
      if (userType === UserType.DOCTOR) {
        const lastDoctor = await doctorRepository
          .createQueryBuilder('doctor')
          .where('doctor.doctor_id IS NOT NULL')
          .orderBy('doctor.doctor_id', 'DESC')
          .getOne();
        doctorId = lastDoctor?.doctor_id ? lastDoctor.doctor_id + 1 : 42001;
      }

      const isAutoApproved = userType === UserType.REGULAR;
      const doctorName = (googleUser.name || googleUser.given_name || 'Google User').trim();
      const clinicName =
        typeof clinic_name === 'string' && clinic_name.trim()
          ? clinic_name.trim()
          : undefined;

      user = doctorRepository.create({
        doctor_id: doctorId,
        email: normalizedEmail,
        password_hash: passwordHash,
        clinic_name: clinicName,
        doctor_name: doctorName,
        signup_id: userType === UserType.DOCTOR ? signupId : undefined,
        user_type: userType,
        consent_flag: true,
        consent_at: new Date(),
        is_approved: isAutoApproved,
        is_admin: false,
        approved_at: isAutoApproved ? new Date() : undefined,
        google_id: googleUser.sub,
        is_google_user: true,
        google_email_verified: true,
        profile_photo_url: googleUser.picture || undefined,
      });

      user = await doctorRepository.save(user);
      isNewUser = true;
      console.log('✅ Google Sign-Up - Created user:', user.email, user.user_type);

      if (allowedSignupId) {
        allowedSignupId.markAsUsed(normalizedEmail);
        await AppDataSource.getRepository(AllowedSignupId).save(allowedSignupId);
      }

      if (userType === UserType.DOCTOR) {
        const notificationRepository = AppDataSource.getRepository(Notification);
        const adminNotification = notificationRepository.create({
          recipient_id: user.id,
          type: 'admin_alert',
          payload: {
            title: 'New Doctor Registration (Google)',
            message: `New doctor registration via Google from ${doctorName}`,
            data: {
              doctorId: user.id,
              clinicName: clinicName,
              doctorName,
              email: normalizedEmail,
              signupId,
            },
          },
        });
        await notificationRepository.save(adminNotification);

        try {
          await gmailService.sendNewRegistrationAlert(user);
          await whatsappService.sendNewRegistrationAlert(user);
        } catch (error: unknown) {
          console.error('Failed to send admin notifications:', error);
        }
      }
    } else {
      // Existing user — link Google ID if not already linked
      if (!user.google_id) {
        user.google_id = googleUser.sub;
        user.is_google_user = true;
        user.google_email_verified = true;
        if (!user.profile_photo_url && googleUser.picture) {
          user.profile_photo_url = googleUser.picture;
        }
        await doctorRepository.save(user);
        console.log('🔗 Linked Google account to existing user:', user.email);
      }

      // If they tried signup but already have an account, continue as login
      if (mode === 'signup') {
        console.log('ℹ️ Google Sign-Up - Account already exists, signing in:', user.email);
      }
    }

    // Check if user is deactivated
    if (user.is_deactivated) {
      res.status(403).json({
        success: false,
        message: 'Your account has been deactivated. Please contact support.',
        requiresReactivation: true,
      });
      return;
    }

    console.log('🔑 Google Auth - User:', user.email, isNewUser ? '(new)' : '(existing)');

    const { accessToken, refreshToken } = generateTokenPair({
      userId: user.id,
      email: user.email,
      doctorId: user.doctor_id || 0,
      isAdmin: user.is_admin,
      isApproved: user.is_approved,
    });

    res.status(isNewUser ? 201 : 200).json({
      success: true,
      message: isNewUser
        ? user.is_approved
          ? 'Account created successfully via Google'
          : 'Registration successful. Please wait for admin approval.'
        : 'Login successful via Google',
      data: {
        user: {
          id: user.id,
          email: user.email,
          doctor_name: user.doctor_name,
          clinic_name: user.clinic_name,
          user_type: user.user_type,
          is_admin: user.is_admin,
          is_approved: user.is_approved,
          is_google_user: user.is_google_user,
          profile_photo_url: user.profile_photo_url,
          tier: user.tier,
        },
        accessToken,
        refreshToken,
        isNewUser,
        requiresOTP: false,
      },
    });
  } catch (error) {
    console.error('❌ Google auth error:', error);
    let message = 'An error occurred during Google authentication';
    if (error instanceof Error) {
      if (error.message.includes('duplicate key') || error.message.includes('unique constraint')) {
        message = 'You can make only one type of account';
      }
    }
    res.status(500).json({
      success: false,
      message,
    });
  }
};

/**
 * Link Google account to existing user
 * Requires authentication
 */
export const linkGoogleAccount = async (req: Request, res: Response): Promise<void> => {
  try {
    const { idToken } = req.body;
    const userId = (req as any).user?.id;

    if (!userId) {
      res.status(401).json({
        success: false,
        message: 'Authentication required',
      });
      return;
    }

    if (!idToken) {
      res.status(400).json({
        success: false,
        message: 'Google ID token is required',
      });
      return;
    }

    // Verify the Google token
    const googleUser = await verifyGoogleToken(idToken);
    if (!googleUser) {
      res.status(401).json({
        success: false,
        message: 'Invalid Google token',
      });
      return;
    }

    const doctorRepository = AppDataSource.getRepository(Doctor);

    // Check if this Google account is already linked to another user
    const existingGoogleUser = await doctorRepository.findOne({
      where: { google_id: googleUser.sub }
    });

    if (existingGoogleUser && existingGoogleUser.id !== userId) {
      res.status(400).json({
        success: false,
        message: 'This Google account is already linked to another user',
      });
      return;
    }

    // Get current user
    const user = await doctorRepository.findOne({ where: { id: userId } });
    if (!user) {
      res.status(404).json({
        success: false,
        message: 'User not found',
      });
      return;
    }

    // Link Google account
    user.google_id = googleUser.sub;
    user.is_google_user = true;
    user.google_email_verified = googleUser.email_verified;
    
    // Update profile photo if not set
    if (!user.profile_photo_url && googleUser.picture) {
      user.profile_photo_url = googleUser.picture;
    }

    await doctorRepository.save(user);

    res.status(200).json({
      success: true,
      message: 'Google account linked successfully',
      data: {
        is_google_user: true,
        google_email_verified: googleUser.email_verified,
      },
    });
  } catch (error) {
    console.error('❌ Link Google account error:', error);
    res.status(500).json({
      success: false,
      message: 'An error occurred while linking Google account',
    });
  }
};

/**
 * Unlink Google account from user
 * Requires authentication and that user has a password set
 */
export const unlinkGoogleAccount = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user?.id;

    if (!userId) {
      res.status(401).json({
        success: false,
        message: 'Authentication required',
      });
      return;
    }

    const doctorRepository = AppDataSource.getRepository(Doctor);
    const user = await doctorRepository.findOne({ where: { id: userId } });

    if (!user) {
      res.status(404).json({
        success: false,
        message: 'User not found',
      });
      return;
    }

    if (!user.google_id) {
      res.status(400).json({
        success: false,
        message: 'No Google account linked',
      });
      return;
    }

    // Unlink Google account
    user.google_id = undefined;
    user.is_google_user = false;
    user.google_email_verified = false;

    await doctorRepository.save(user);

    res.status(200).json({
      success: true,
      message: 'Google account unlinked successfully',
    });
  } catch (error) {
    console.error('❌ Unlink Google account error:', error);
    res.status(500).json({
      success: false,
      message: 'An error occurred while unlinking Google account',
    });
  }
};

/**
 * Get Google OAuth client ID for frontend
 * Public endpoint
 */
export const getGoogleClientId = async (req: Request, res: Response): Promise<void> => {
  if (!GOOGLE_CLIENT_ID) {
    res.status(503).json({
      success: false,
      message: 'Google Sign-In is not configured',
    });
    return;
  }

  res.status(200).json({
    success: true,
    data: {
      clientId: GOOGLE_CLIENT_ID,
    },
  });
};
