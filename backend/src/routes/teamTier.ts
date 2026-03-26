import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { adminOnly } from '../middleware/admin';
import {
  getTeamTierConfigs,
  createTeamTierConfig,
  updateTeamTierConfig,
  deleteTeamTierConfig,
  getTeamTierPricing,
  getTeamFormula,
  updateTeamFormula
} from '../controllers/teamTierController';

const router = Router();

// Admin routes (require authentication and admin access)
router.get('/configs', authenticate, adminOnly, getTeamTierConfigs);
router.post('/configs', authenticate, adminOnly, createTeamTierConfig);
router.put('/configs/:id', authenticate, adminOnly, updateTeamTierConfig);
router.delete('/configs/:id', authenticate, adminOnly, deleteTeamTierConfig);

// Public route for getting pricing information
router.get('/pricing/:teamSize', getTeamTierPricing);

// Team formula configuration routes
router.get('/formula', authenticate, adminOnly, getTeamFormula);
router.post('/formula', authenticate, adminOnly, updateTeamFormula);

export default router;
