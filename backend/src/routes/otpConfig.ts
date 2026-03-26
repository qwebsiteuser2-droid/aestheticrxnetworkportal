import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { adminOnly } from '../middleware/admin';
import { getOTPConfigs, updateOTPConfigs } from '../controllers/otpConfigController';

const router = Router();

// Get OTP configurations (admin only)
router.get('/configs', authenticate, adminOnly, getOTPConfigs);

// Update OTP configurations (admin only)
router.post('/configs', authenticate, adminOnly, updateOTPConfigs);

export default router;
