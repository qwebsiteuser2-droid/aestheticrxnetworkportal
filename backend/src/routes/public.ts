import { Router } from 'express';
import { getTierConfigs } from '../controllers/tierController';
import { getLeaderboard } from '../controllers/leaderboardController';
import { getPublicResearchBenefitConfigs } from '../controllers/adminController';
import { getHallOfPrideEntries } from '../controllers/hallOfPrideController';
import { checkMissingImages } from '../controllers/imageDiagnosticsController';
import { getNearbyDoctors, searchDoctors, getDoctorProfile } from '../controllers/doctorSearchController';
import { getFeaturedProducts, getFeaturedDoctors, getPublicProducts } from '../controllers/featuredItemsController';

const router = Router();

// Public routes (no authentication required)
router.get('/tier-configs', getTierConfigs);
router.get('/leaderboard', getLeaderboard);
router.get('/research-benefits', getPublicResearchBenefitConfigs);
router.get('/hall-of-pride', getHallOfPrideEntries);
router.get('/image-diagnostics', checkMissingImages);

// Public products (for landing page preview)
router.get('/products', getPublicProducts);

// Featured items routes (public)
router.get('/featured/products', getFeaturedProducts);
router.get('/featured/doctors', getFeaturedDoctors);

// Doctor search routes (public)
router.get('/doctors/nearby', getNearbyDoctors);
router.get('/doctors/search', searchDoctors);
router.get('/doctors/:id', getDoctorProfile);

export default router;
