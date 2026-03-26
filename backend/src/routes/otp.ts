import { Router } from 'express';
import { OTPController } from '../controllers/otpController';
import { authenticate } from '../middleware/auth';

const router = Router();

// Generate OTP for user (requires authentication)
router.post('/generate', authenticate, OTPController.generateOTP);

// Resend OTP (no authentication required - for expired tokens)
router.post('/resend', OTPController.resendOTP);

// Verify OTP
router.post('/verify', authenticate, OTPController.verifyOTP);

// Check if OTP is required for user
router.post('/check-requirement', authenticate, OTPController.checkOTPRequirement);

export default router;
