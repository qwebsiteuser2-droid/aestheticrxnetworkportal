import { Router } from 'express';
import { 
  getProducts, 
  getProductById, 
  getProductBySlot, 
  getProductCategories, 
  searchProducts 
} from '../controllers/productController';
import {
  listProductReviews,
  createProductReview,
} from '../controllers/productReviewController';
import { authenticate } from '../middleware/auth';

const router = Router();

// Public routes
router.get('/', getProducts);
router.get('/search', searchProducts);
router.get('/categories', getProductCategories);
router.get('/slot/:slot', getProductBySlot);
router.get('/:productId/reviews', listProductReviews);
router.post('/:productId/reviews', authenticate, createProductReview);
router.get('/:id', getProductById);

export default router;
