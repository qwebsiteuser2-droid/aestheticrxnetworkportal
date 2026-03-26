import { Request, Response } from 'express';
import { OAuth2Client } from 'google-auth-library';
import { AppDataSource } from '../db/data-source';
import { Doctor, UserType } from '../models/Doctor';
import { generateTokenPair } from '../utils/jwt';
import { hashPassword } from '../utils/password';
import { v4 as uuidv4 } from 'uuid';

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

/**
 * Google Sign-In / Sign-Up
 * 
 * This endpoint handles both login and registration via Google.
 * - If user exists: logs them in (skips OTP since Google verified email)
 * - If user doesn't exist: creates new account and logs them in
 */
export const googleAuth = async (req: Request, res: Response): Promise<void> => {
  try {
    const { idToken, userType = 'regular_user' } = req.body;

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
    
    // Check if user already exists (by email or Google ID)
    let user = await doctorRepository.findOne({
      where: [
        { email: googleUser.email.toLowerCase() },
        { google_id: googleUser.sub }
      ]
    });

    let isNewUser = false;

    if (user) {
      // Existing user - update Google info if not already set
      if (!user.google_id) {
        user.google_id = googleUser.sub;
        user.is_google_user = true;
        user.google_email_verified = true;
        await doctorRepository.save(user);
        console.log('🔗 Linked Google account to existing user:', user.email);
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

      console.log('🔑 Google Sign-In - Existing user:', user.email);
    } else {
      // New user - create account
      isNewUser = true;
      
      // Determine user type
      let newUserType: UserType;
      const userTypeStr = String(userType || 'regular_user').toLowerCase();
      if (userTypeStr === 'regular_user' || userTypeStr === 'regular') {
        newUserType = UserType.REGULAR;
      } else if (userTypeStr === 'employee') {
        newUserType = UserType.EMPLOYEE;
      } else {
        newUserType = UserType.REGULAR; // Default to regular for Google sign-ups
      }

      // Generate a random password (user won't need it since they use Google)
      const randomPassword = uuidv4() + uuidv4();
      const hashedPassword = await hashPassword(randomPassword);

      // Create new user
      user = doctorRepository.create({
        email: googleUser.email.toLowerCase(),
        password_hash: hashedPassword,
        doctor_name: googleUser.name || googleUser.email.split('@')[0],
        clinic_name: '', // Can be updated later
        user_type: newUserType,
        google_id: googleUser.sub,
        is_google_user: true,
        google_email_verified: true,
        profile_photo_url: googleUser.picture,
        consent_flag: true,
        consent_at: new Date(),
        // Google users are auto-approved since their email is verified
        is_approved: newUserType === UserType.REGULAR, // Auto-approve regular users
        approved_at: newUserType === UserType.REGULAR ? new Date() : undefined,
      });

      await doctorRepository.save(user);
      console.log('✨ Created new Google user:', user.email, 'Type:', newUserType);
    }

    // Generate JWT tokens (skip OTP since Google verified the email)
    const { accessToken, refreshToken } = generateTokenPair({
      userId: user.id,
      email: user.email,
      doctorId: user.doctor_id || 0,
      isAdmin: user.is_admin,
      isApproved: user.is_approved,
    });

    // Return success response
    res.status(200).json({
      success: true,
      message: isNewUser ? 'Account created successfully via Google' : 'Login successful via Google',
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
        // Skip OTP for Google users
        requiresOTP: false,
      },
    });
  } catch (error) {
    console.error('❌ Google auth error:', error);
    res.status(500).json({
      success: false,
      message: 'An error occurred during Google authentication',
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
