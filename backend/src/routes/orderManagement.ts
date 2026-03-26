import { Router } from 'express';
import { authenticate, adminOnly } from '../middleware/auth';
import { 
  getAllOrders, 
  updateOrderPaymentStatus, 
  addPaymentToOrder,
  deleteAllOrders,
  testTierProgression,
  fixCompletedOrdersPaymentAmount
} from '../controllers/orderManagementController';

const router = Router();

// Get all orders with statistics
router.get('/', authenticate, adminOnly, getAllOrders);

// Temporary test endpoint without authentication
router.get('/test', getAllOrders);

// Delete all orders (CRITICAL - requires admin authentication)
// IMPORTANT: This route must come BEFORE parameterized routes like /:orderId/*
router.delete('/all', authenticate, adminOnly, deleteAllOrders);

// Update order payment status
router.put('/:orderId/status', authenticate, adminOnly, updateOrderPaymentStatus);

// Add payment to order
router.post('/:orderId/payment', authenticate, adminOnly, addPaymentToOrder);

// Test tier progression (for debugging)
router.post('/test-tier-progression/:doctorId', testTierProgression);

// Fix completed orders with payment_amount = 0 (admin only)
router.post('/fix-completed-payments', authenticate, adminOnly, fixCompletedOrdersPaymentAmount);

export default router;
