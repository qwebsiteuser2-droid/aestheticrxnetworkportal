import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { adminOnly } from '../middleware/admin';
import {
  getResearchReports,
  dismissResearchReport,
  deleteResearchReport,
  removeResearchPaper,
  getResearchReportsStats,
  getResearchBenefits,
  deleteResearchBenefit,
  getResearchBenefitConfigs,
  createResearchBenefitConfig,
  updateResearchBenefitConfig,
  deleteResearchBenefitConfig,
  getRewardEligibility,
  updateRewardDeliveryStatus,
  checkRewardEligibility,
  getAdminPermissions,
  createOrUpdateAdminPermission,
  deleteAdminPermission,
  getAvailableDoctorsForAdmin,
  approveResearchPaper,
  rejectResearchPaper,
  getUsers,
  getEmployees,
  getSoloDoctors,
  updateUserProfile,
  getProducts,
  createProduct,
  updateProduct,
  deleteProduct,
  getSignupIds,
  createSignupId,
  deleteSignupId,
  approveUser,
  rejectUser,
  deactivateUser,
  reactivateUser,
  deleteUser,
  assignOrderToEmployee,
  updateResearchSettings,
  getResearchSettings,
  getCurrentUserAdminPermission
} from '../controllers/adminController';
import {
  getTierConfigsAdmin,
  createTierConfig,
  updateTierConfig,
  deleteTierConfig,
  updateAllUserTiers
} from '../controllers/tierController';
import {
  getAdminLeaderboard,
  getLeaderboardSettings,
  updateLeaderboardSettings
} from '../controllers/leaderboardController';
import {
  getAdminHallOfPrideEntries,
  createHallOfPrideEntry,
  updateHallOfPrideEntry,
  deleteHallOfPrideEntry,
  getAvailableDoctorsForHallOfPride
} from '../controllers/hallOfPrideController';
import { uploadSingle } from '../middleware/upload';
import { uploadProductImage } from '../middleware/productImageUpload';
import { getEmailQuota, getEmailQuotaStats } from '../controllers/emailQuotaController';
import { getEmailMonitoringStats, getEmailDeliveryDetails } from '../controllers/emailMonitoringController';
import { checkMissingImages, fixMissingUploadImages, migrateUploadsPaths, reassignAvailableImages } from '../controllers/imageDiagnosticsController';
import { getAdminFeaturedItems, setFeaturedProducts, setFeaturedDoctors } from '../controllers/featuredItemsController';

const router = Router();

// All admin routes require authentication
router.use(authenticate);

// CRITICAL: /permissions/current must be FIRST, before adminOnly middleware
// This allows ANY authenticated user (including child admins) to check their own permissions
// Child admins don't have is_admin flag but have permission records
router.get('/permissions/current', getCurrentUserAdminPermission);

// All other admin routes require admin privileges
router.use(adminOnly);

// Email Quota Management
router.get('/email-quota', getEmailQuota);
router.get('/email-quota/stats', getEmailQuotaStats);

// Email Monitoring & Delivery Tracking
router.get('/email-monitoring/stats', getEmailMonitoringStats);
router.get('/email-delivery/:id', getEmailDeliveryDetails);

// Image Management
router.post('/images/fix-missing', fixMissingUploadImages);
router.post('/images/migrate-uploads', migrateUploadsPaths);
router.post('/images/reassign-available', reassignAvailableImages);

// Leaderboard Management
router.get('/leaderboard', getAdminLeaderboard);
router.get('/leaderboard-settings', getLeaderboardSettings);
router.put('/leaderboard-settings', updateLeaderboardSettings);

// Research Reports Management
router.get('/research-reports', getResearchReports);
router.get('/research-reports/stats', getResearchReportsStats);
router.post('/research-reports/:reportId/dismiss', dismissResearchReport);
router.delete('/research-reports/:reportId', deleteResearchReport);
router.post('/research-papers/:paperId/remove', removeResearchPaper);

// Research Benefits Management
router.get('/research-benefits', getResearchBenefits);
router.delete('/research-benefits/:id', deleteResearchBenefit);

// Research Benefit Configuration Management
router.get('/research-benefit-configs', getResearchBenefitConfigs);
router.post('/research-benefit-configs', createResearchBenefitConfig);
router.put('/research-benefit-configs/:id', updateResearchBenefitConfig);
router.delete('/research-benefit-configs/:id', deleteResearchBenefitConfig);

// Reward Eligibility Management
router.get('/reward-eligibility', getRewardEligibility);
router.put('/reward-eligibility/:id/status', updateRewardDeliveryStatus);
router.post('/reward-eligibility/check', checkRewardEligibility);

// Admin Permission Management
// /permissions/current is already defined above (before adminOnly middleware)
router.get('/permissions', getAdminPermissions);
router.post('/permissions', createOrUpdateAdminPermission);
router.put('/permissions/:id', createOrUpdateAdminPermission);
router.delete('/permissions/:id', deleteAdminPermission);
router.get('/available-doctors', getAvailableDoctorsForAdmin);

// Research Paper Management
router.post('/research-papers/:paperId/approve', approveResearchPaper);
router.post('/research-papers/:paperId/reject', rejectResearchPaper);

// Tier Configuration Management
router.get('/tier-configs', getTierConfigsAdmin);
router.post('/tier-configs', createTierConfig);
router.put('/tier-configs/:id', updateTierConfig);
router.delete('/tier-configs/:id', deleteTierConfig);
router.post('/tier-configs/update-all-tiers', updateAllUserTiers);

// Basic Admin Management
router.get('/users', getUsers);
router.get('/employees', getEmployees);
router.get('/solo-doctors', getSoloDoctors);
router.put('/user-profiles/:id', updateUserProfile);

// Research Settings Management
router.get('/research-settings', getResearchSettings);
router.put('/research-settings', updateResearchSettings);

import { uploadProductImage } from '../middleware/productImageUpload';

router.get('/products', getProducts);
router.post('/products', uploadProductImage, createProduct);
router.put('/products/:id', uploadProductImage, updateProduct);
router.delete('/products/:id', deleteProduct);

// User Management
router.post('/users/:id/approve', approveUser);
router.post('/users/:id/reject', rejectUser);
router.post('/users/:id/deactivate', deactivateUser);
router.post('/users/:id/reactivate', reactivateUser);
router.delete('/users/:id', deleteUser);
router.get('/signup-ids', getSignupIds);
router.post('/signup-ids', createSignupId);
router.delete('/signup-ids/:id', deleteSignupId);

// Employee Management
router.post('/assign-order', assignOrderToEmployee);

// Hall of Pride Management
router.get('/hall-of-pride', getAdminHallOfPrideEntries);
router.post('/hall-of-pride', createHallOfPrideEntry);
router.put('/hall-of-pride/:id', updateHallOfPrideEntry);
router.delete('/hall-of-pride/:id', deleteHallOfPrideEntry);
router.get('/available-doctors-hall-of-pride', getAvailableDoctorsForHallOfPride);

// Featured Items Management (Landing Page Hero Cards)
router.get('/featured', getAdminFeaturedItems);
router.post('/featured/products', setFeaturedProducts);
router.post('/featured/doctors', setFeaturedDoctors);

export default router;