import { Request, Response } from 'express';
import { OAuth2Client } from 'google-auth-library';
import { AppDataSource } from '../db/data-source';
import { Doctor } from '../models/Doctor';
import { generateTokenPair } from '../utils/jwt';

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
 * Google Sign-In (login only)
 *
 * Google Sign-In is restricted to existing accounts only.
 * - If user exists: logs them in (skips OTP since Google verified email)
 * - If user does NOT exist: returns redirectToSignup so the frontend
 *   can redirect them to the regular signup page
 */
export const googleAuth = async (req: Request, res: Response): Promise<void> => {
  try {
    const { idToken } = req.body;

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
        { google_id: googleUser.sub },
      ],
    });

    if (!user) {
      // No account found — Google Sign-In is for existing users only
      console.log('❌ Google Sign-In - No account found for:', googleUser.email);
      res.status(404).json({
        success: false,
        message: 'No account found for this Google email. Please sign up first.',
        redirectToSignup: true,
      });
      return;
    }

    // Existing user — link Google ID if not already linked
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

    const isNewUser = false;

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
