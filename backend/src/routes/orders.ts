import { Router } from 'express';
import { 
  createOrder, 
  getMyOrders, 
  getOrderById, 
  updateOrderStatus, 
  getAllOrders,
  sendBatchOrderNotification
} from '../controllers/orderController';
import { authenticate, adminOnly, approvedOnly } from '../middleware/auth';

const router = Router();

// Protected routes - require authentication and approval
router.post('/', authenticate, approvedOnly, createOrder);
router.post('/batch-notify', authenticate, approvedOnly, sendBatchOrderNotification);
router.get('/my', authenticate, approvedOnly, getMyOrders);
router.get('/:id', authenticate, getOrderById);

// Admin only routes
router.get('/', authenticate, adminOnly, getAllOrders);
router.put('/:id/status', authenticate, adminOnly, updateOrderStatus);

export default router;
