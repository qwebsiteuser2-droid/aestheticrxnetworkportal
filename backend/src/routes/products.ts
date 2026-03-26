import { Router } from 'express';
import { 
  getProducts, 
  getProductById, 
  getProductBySlot, 
  getProductCategories, 
  searchProducts 
} from '../controllers/productController';

const router = Router();

// Public routes
router.get('/', getProducts);
router.get('/search', searchProducts);
router.get('/categories', getProductCategories);
router.get('/slot/:slot', getProductBySlot);
router.get('/:id', getProductById);

export default router;
