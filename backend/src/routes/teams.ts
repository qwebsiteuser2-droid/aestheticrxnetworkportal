import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { adminOnly } from '../middleware/auth';
import { 
  getTeams, 
  createTeam, 
  sendTeamInvitation, 
  getTeamInvitations, 
  getTeamBenefits,
  leaveTeam,
  requestTeamSeparation,
  respondToTeamInvitation, 
  getUserTeam 
} from '../controllers/teamController';

const router = Router();

// User routes
router.get('/my-team', authenticate, getUserTeam);
router.post('/create', authenticate, createTeam);
router.post('/invite', authenticate, sendTeamInvitation);
router.get('/invitations', authenticate, getTeamInvitations);
router.get('/:teamId/benefits', authenticate, getTeamBenefits);
router.post('/leave', authenticate, leaveTeam);
router.post('/request-separation', authenticate, requestTeamSeparation);
router.post('/invitations/:invitationId/respond', authenticate, respondToTeamInvitation);

// Admin routes
router.get('/', authenticate, adminOnly, getTeams);

export default router;
