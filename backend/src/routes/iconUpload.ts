import { Router } from 'express';
import { authenticate, adminOnly } from '../middleware/auth';
import { uploadIcon, handleIconUpload, deleteIcon } from '../controllers/iconUploadController';

const router = Router();

// Upload icon endpoint
router.post('/upload', authenticate, adminOnly, uploadIcon, handleIconUpload);

// Delete icon endpoint
router.delete('/:filename', authenticate, adminOnly, deleteIcon);

export default router;
