import { Router } from 'express';
import { DataExportController } from '../controllers/dataExportController';
import { adminOnly } from '../middleware/admin';
import { authenticate } from '../middleware/auth';
import { auditDataExport } from '../middleware/auditLog';
import { validateDataExportPermissions, rateLimitDataExport, protectSensitiveData } from '../middleware/dataProtection';

const router = Router();
const dataExportController = new DataExportController();

// All routes require admin authentication
router.use(authenticate);
router.use(adminOnly);
router.use(protectSensitiveData); // Protect sensitive data in all responses

// Export jobs management
router.get('/export-jobs', dataExportController.getExportJobs.bind(dataExportController));
router.post('/export-data', 
  // Removed daily limit - unlimited exports allowed
  validateDataExportPermissions,
  auditDataExport,
  dataExportController.startExport.bind(dataExportController)
);
router.get('/export-jobs/:jobId/download', 
  auditDataExport,
  dataExportController.downloadExport.bind(dataExportController)
);

// Full database export (complete backup)
router.post('/export-full-database',
  validateDataExportPermissions,
  auditDataExport,
  dataExportController.exportFullDatabase.bind(dataExportController)
);

// Google Drive integration
router.get('/google-drive/status', dataExportController.getGoogleDriveStatus.bind(dataExportController));
router.post('/google-drive/connect', dataExportController.connectGoogleDrive.bind(dataExportController));
router.post('/test-gmail', dataExportController.testGmailConnection.bind(dataExportController));
router.get('/gmail-status-public', dataExportController.getGmailStatusPublic.bind(dataExportController));

export default router;
