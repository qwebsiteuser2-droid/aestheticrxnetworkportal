import { Router } from 'express';
import { AdvertisementController } from '../controllers/advertisementController';
import { authenticate } from '../middleware/auth';
import { adminOnly } from '../middleware/auth';

const router = Router();

// Public routes (for displaying ads)
router.get('/active', AdvertisementController.getActiveAdvertisements);
router.post('/:id/impression', AdvertisementController.trackImpression);
router.post('/:id/click', AdvertisementController.trackClick);
router.get('/placements/available', AdvertisementController.getAvailablePlacements);

// User routes (authenticated)
router.get('/applications/my', authenticate, AdvertisementController.getUserApplications);
router.post('/applications', authenticate, AdvertisementController.createApplication);

// Admin routes
router.get('/placements', authenticate, adminOnly, AdvertisementController.getPlacements);
router.post('/placements', authenticate, adminOnly, AdvertisementController.createPlacement);
router.put('/placements/:id', authenticate, adminOnly, AdvertisementController.updatePlacement);
router.delete('/placements/:id', authenticate, adminOnly, AdvertisementController.deletePlacement);

router.get('/applications', authenticate, adminOnly, AdvertisementController.getApplications);
router.get('/applications/:id', authenticate, adminOnly, AdvertisementController.getApplication);
router.post('/applications/:id/approve', authenticate, adminOnly, AdvertisementController.approveApplication);
router.post('/applications/:id/reject', authenticate, adminOnly, AdvertisementController.rejectApplication);

export default router;