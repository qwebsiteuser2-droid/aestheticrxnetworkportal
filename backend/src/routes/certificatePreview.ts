import { Router } from 'express';
import { CertificatePreviewController } from '../controllers/certificatePreviewController';
import { authenticate } from '../middleware/auth';
import { adminOnly } from '../middleware/auth';

const router = Router();

// Apply authentication and admin middleware to all routes
router.use(authenticate);
router.use(adminOnly);

// Generate certificate preview PDF
router.post('/certificate-preview', CertificatePreviewController.generatePreview);

// Send test certificate email
router.post('/send-test-certificate', CertificatePreviewController.sendTestCertificate);

export default router;
