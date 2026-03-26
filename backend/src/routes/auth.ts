import { Router } from 'express';
import { register, login, getProfile, updateProfile, changePassword, logout, saveLocation, getLocation, refreshToken, requestPasswordReset, confirmPasswordReset } from '../controllers/authController';
import { googleAuth, linkGoogleAccount, unlinkGoogleAccount, getGoogleClientId } from '../controllers/googleAuthController';
import { getUserLeaderboardPosition } from '../controllers/leaderboardController';
import { updateAvailability } from '../controllers/doctorSearchController';
import { authenticate, authRateLimit } from '../middleware/auth';

const router = Router();

// Public routes - SECURITY: Stricter rate limits to prevent brute force
// In development mode, use much higher limits for testing
const isDevelopment = process.env.NODE_ENV === 'development';
const devMaxAttempts = 1000; // 1000 attempts in dev
const devWindowMs = 60000; // 1 minute in dev
const prodMaxAttempts = 5; // 5 attempts in production
const prodWindowMs = 15 * 60 * 1000; // 15 minutes in production

const loginMaxAttempts = isDevelopment ? devMaxAttempts : prodMaxAttempts;
const loginWindowMs = isDevelopment ? devWindowMs : prodWindowMs;
const refreshMaxAttempts = isDevelopment ? devMaxAttempts : 10;
const refreshWindowMs = isDevelopment ? devWindowMs : prodWindowMs;

router.post('/register', authRateLimit(loginMaxAttempts, loginWindowMs), register);
router.post('/login', authRateLimit(loginMaxAttempts, loginWindowMs), login);
router.post('/refresh', authRateLimit(refreshMaxAttempts, refreshWindowMs), refreshToken);
router.post('/password-reset/request', authRateLimit(loginMaxAttempts, loginWindowMs), requestPasswordReset);
router.post('/password-reset/confirm', authRateLimit(loginMaxAttempts, loginWindowMs), confirmPasswordReset);

// Google OAuth routes
router.get('/google/client-id', getGoogleClientId); // Public - get client ID for frontend
router.post('/google', authRateLimit(loginMaxAttempts, loginWindowMs), googleAuth); // Google Sign-In/Sign-Up

// Protected routes
router.get('/profile', authenticate, getProfile);
router.put('/profile', authenticate, updateProfile);
router.put('/change-password', authenticate, changePassword);
router.post('/logout', authenticate, logout);

// Test authentication endpoint
router.get('/test', authenticate, (req: any, res: any) => {
  res.json({
    success: true,
    message: 'Authentication successful',
    user: {
      id: req.user.id,
      email: req.user.email,
      is_admin: req.user.is_admin,
      is_approved: req.user.is_approved
    }
  });
});

// Location routes
router.post('/location', authenticate, saveLocation);
router.get('/location', authenticate, getLocation);

// Availability status route (for doctors)
router.put('/availability', authenticate, updateAvailability);

// Google account linking (protected)
router.post('/google/link', authenticate, linkGoogleAccount);
router.post('/google/unlink', authenticate, unlinkGoogleAccount);

// Leaderboard routes
router.get('/leaderboard/position', authenticate, getUserLeaderboardPosition);

export default router;
