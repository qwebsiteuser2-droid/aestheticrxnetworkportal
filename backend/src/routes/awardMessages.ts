import { Router } from 'express';
import { AwardMessageController } from '../controllers/awardMessageController';
import { authenticate, adminOnly } from '../middleware/auth';

const router = Router();

// All routes require authentication and admin access
router.use(authenticate);
router.use(adminOnly);

// Get all templates
router.get('/', AwardMessageController.getAllTemplates);

// Get template by ID
router.get('/:id', AwardMessageController.getTemplateById);

// Create new template
router.post('/', AwardMessageController.createTemplate);

// Update template
router.put('/:id', AwardMessageController.updateTemplate);

// Delete template
router.delete('/:id', AwardMessageController.deleteTemplate);

// Toggle template status
router.patch('/:id/toggle', AwardMessageController.toggleTemplateStatus);

export default router;
