import { Router } from 'express';
import { VideoAdvertisementController } from '../controllers/videoAdvertisementController';
import { AdminAdvertisementController } from '../controllers/adminAdvertisementController';
import { AdminRotationController } from '../controllers/adminRotationController';
import { AdvertisementPricingController } from '../controllers/advertisementPricingController';
import { authenticate } from '../middleware/auth';
import { adminOnly } from '../middleware/admin';
import { advertisementUpload } from '../middleware/advertisementUpload';

const router = Router();
const videoAdController = new VideoAdvertisementController();
const adminAdController = new AdminAdvertisementController();
const adminRotationController = new AdminRotationController();
const pricingController = new AdvertisementPricingController();

// Use the advertisement upload middleware which handles all file types and directories properly

// Public routes (no authentication required)
router.get('/areas', videoAdController.getAdvertisementAreas.bind(videoAdController));
router.post('/calculate-cost', videoAdController.calculateCost.bind(videoAdController));
router.get('/active', videoAdController.getActiveAdvertisements.bind(videoAdController));
// Public rotation config endpoint (for displaying ads)
router.get('/rotation-configs/:areaName', 
  adminRotationController.getRotationConfigByArea.bind(adminRotationController)
);
// Public tracking routes (no authentication required) - must be before /:id route
router.post('/:id/impression', videoAdController.trackImpression.bind(videoAdController));
router.post('/:id/click', videoAdController.trackClick.bind(videoAdController));
router.post('/:id/view', videoAdController.trackView.bind(videoAdController));

// User routes (authentication required)
router.post('/create', 
  authenticate,
  advertisementUpload.fields([
    { name: 'video_file', maxCount: 1 },
    { name: 'image_file', maxCount: 1 },
    { name: 'animation_file', maxCount: 1 },
    { name: 'thumbnail', maxCount: 1 },
    // Legacy support
    { name: 'video', maxCount: 1 },
    { name: 'image', maxCount: 1 }
  ]),
  videoAdController.createAdvertisement.bind(videoAdController)
);

router.get('/my-advertisements', 
  authenticate,
  videoAdController.getUserAdvertisements.bind(videoAdController)
);

router.post('/:id/confirm-payment',
  authenticate,
  videoAdController.confirmPaymentSuccess.bind(videoAdController)
);

router.get('/:id', 
  authenticate,
  videoAdController.getAdvertisementById.bind(videoAdController)
);

router.put('/:id', 
  authenticate,
  advertisementUpload.fields([
    { name: 'video_file', maxCount: 1 },
    { name: 'video', maxCount: 1 },
    { name: 'thumbnail', maxCount: 1 },
    { name: 'image_file', maxCount: 1 },
    { name: 'image', maxCount: 1 }
  ]),
  videoAdController.updateAdvertisement.bind(videoAdController)
);

router.delete('/:id', 
  authenticate,
  videoAdController.deleteAdvertisement.bind(videoAdController)
);

router.post('/:id/close', 
  videoAdController.closeAdvertisement.bind(videoAdController)
);

// Admin routes
router.get('/admin/all', 
  authenticate,
  adminOnly,
  adminAdController.getAllAdvertisements.bind(adminAdController)
);

router.get('/admin/areas', 
  authenticate,
  adminOnly,
  adminAdController.getAdvertisementAreas.bind(adminAdController)
);

router.put('/admin/areas/:id', 
  authenticate,
  adminOnly,
  adminAdController.updateAdvertisementArea.bind(adminAdController)
);

// Clean up all advertisement data
// TODO: Implement cleanUpAllData method in AdminAdvertisementController
// router.delete('/admin/cleanup',
//   authenticate,
//   adminOnly,
//   adminAdController.cleanUpAllData.bind(adminAdController)
// );

// Upload preview image for area
router.post('/admin/areas/:id/preview-image',
  authenticate,
  adminOnly,
  advertisementUpload.single('preview_image'),
  adminAdController.uploadAreaPreviewImage.bind(adminAdController)
);

// Pricing configuration routes (must be before /admin/:id routes to avoid route conflicts)
router.get('/admin/pricing-configs', 
  authenticate,
  adminOnly,
  pricingController.getAllPricingConfigs.bind(pricingController)
);

router.get('/admin/pricing-configs/:id', 
  authenticate,
  adminOnly,
  pricingController.getPricingConfigById.bind(pricingController)
);

router.post('/admin/pricing-configs', 
  authenticate,
  adminOnly,
  pricingController.createPricingConfig.bind(pricingController)
);

router.put('/admin/pricing-configs/:id', 
  authenticate,
  adminOnly,
  pricingController.updatePricingConfig.bind(pricingController)
);

router.delete('/admin/pricing-configs/:id', 
  authenticate,
  adminOnly,
  pricingController.deletePricingConfig.bind(pricingController)
);

router.put('/admin/:id/approve', 
  authenticate,
  adminOnly,
  adminAdController.approveAdvertisement.bind(adminAdController)
);

router.put('/admin/:id/reject', 
  authenticate,
  adminOnly,
  adminAdController.rejectAdvertisement.bind(adminAdController)
);

router.put('/admin/:id/slides',
  authenticate,
  adminOnly,
  adminAdController.updateAdvertisementSlides.bind(adminAdController)
);

router.put('/admin/:id/toggle',
  authenticate,
  adminOnly,
  adminAdController.toggleAdvertisementStatus.bind(adminAdController)
);

// Bulk toggle all advertisements (pause/resume all)
router.put('/admin/toggle-all',
  authenticate,
  adminOnly,
  adminAdController.toggleAllAdvertisements.bind(adminAdController)
);

// Rotation configuration routes
router.get('/admin/rotation-configs', 
  authenticate,
  adminOnly,
  adminRotationController.getAllRotationConfigs.bind(adminRotationController)
);

router.get('/admin/rotation-configs/:areaName', 
  authenticate,
  adminOnly,
  adminRotationController.getRotationConfigByArea.bind(adminRotationController)
);

router.put('/admin/rotation-configs/:areaName', 
  authenticate,
  adminOnly,
  adminRotationController.updateRotationConfig.bind(adminRotationController)
);

router.post('/admin/rotation-configs', 
  authenticate,
  adminOnly,
  adminRotationController.createRotationConfig.bind(adminRotationController)
);

router.delete('/admin/rotation-configs/:areaName', 
  authenticate,
  adminOnly,
  adminRotationController.deleteRotationConfig.bind(adminRotationController)
);

// Public route for getting pricing (for users to see pricing)
router.get('/pricing', 
  pricingController.getPricingForCombination.bind(pricingController)
);

// Payment management routes
// TODO: Implement getPaymentStatistics and updatePaymentStatus methods in AdminAdvertisementController
// router.get('/admin/payment-statistics',
//   authenticate,
//   adminOnly,
//   adminAdController.getPaymentStatistics.bind(adminAdController)
// );

// router.put('/admin/:id/payment-status',
//   authenticate,
//   adminOnly,
//   adminAdController.updatePaymentStatus.bind(adminAdController)
// );

export default router;