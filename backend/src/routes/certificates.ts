import { Router } from 'express';
import { authenticate, adminOnly } from '../middleware/auth';
import { 
  sendCertificateToDoctor, 
  sendCertificatesToAllDoctors, 
  getCertificateStats,
  backfillCertificates,
  generateMyCertificate,
  downloadCertificate
} from '../controllers/certificateController';

const router = Router();

// Public route - download certificate by ID (for sharing/verification)
router.get('/download/:certificateId', downloadCertificate);

// User-facing route (requires authentication but not admin)
router.post('/generate-my-certificate', authenticate, generateMyCertificate);

// All other certificate routes require authentication and admin access
router.use(authenticate);
router.use(adminOnly);

// Send certificate to specific doctor
router.post('/send-to-doctor', sendCertificateToDoctor);

// Send certificates to all doctors with specific tier
router.post('/send-to-all', sendCertificatesToAllDoctors);

// Get certificate statistics
router.get('/stats', getCertificateStats);

// Backfill certificates for existing users
router.post('/backfill', backfillCertificates);

export default router;
