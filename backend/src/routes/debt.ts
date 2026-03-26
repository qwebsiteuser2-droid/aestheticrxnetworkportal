import { Router } from 'express';
import { authenticate, adminOnly } from '../middleware/auth';
import { 
  getDebtThresholds,
  updateDebtThreshold,
  initializeDefaultDebtThresholds,
  checkUserDebtStatus,
  setCustomDebtLimit,
  removeCustomDebtLimit,
  getUsersWithDebt,
  syncDebtThresholdsWithTiers
} from '../controllers/debtController';

const router = Router();

// Get all debt thresholds
router.get('/thresholds', authenticate, adminOnly, getDebtThresholds);

// Update debt threshold for a tier
router.put('/thresholds', authenticate, adminOnly, updateDebtThreshold);

// Initialize default debt thresholds
router.post('/thresholds/initialize', authenticate, adminOnly, initializeDefaultDebtThresholds);

// Check user debt status
router.get('/user/:doctorId', authenticate, adminOnly, checkUserDebtStatus);

// Set custom debt limit for a user (admin override)
router.post('/user/:doctorId/custom-limit', authenticate, adminOnly, setCustomDebtLimit);

// Remove custom debt limit for a user
router.delete('/user/:doctorId/custom-limit', authenticate, adminOnly, removeCustomDebtLimit);

// Get users with debt issues
router.get('/users-with-debt', authenticate, adminOnly, getUsersWithDebt);

// Sync debt thresholds with tier configurations
router.post('/sync-with-tiers', authenticate, adminOnly, syncDebtThresholdsWithTiers);

export default router;
