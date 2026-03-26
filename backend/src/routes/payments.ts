import { Router } from 'express';
import paymentController from '../controllers/paymentController';
import { authenticate } from '../middleware/auth';
import { adminOnly } from '../middleware/admin';

const router = Router();

/**
 * @route POST /api/payments/payfast/initialize
 * @desc Initialize PayFast payment for existing orders
 * @access Private - Authenticated users only
 */
router.post('/payfast/initialize', authenticate, paymentController.initializePayFastPayment);

/**
 * @route POST /api/payments/payfast/onsite/initialize
 * @desc Initialize PayFast OnSite payment for existing orders
 * @access SECURITY: Protected - Admin only in production
 */
if (process.env.NODE_ENV === 'development' || process.env.ALLOW_TEST_ENDPOINTS === 'true') {
  router.post('/payfast/onsite/initialize', authenticate, adminOnly, paymentController.initializePayFastOnSitePayment);
} else {
  // SECURITY: Disable in production
  router.post('/payfast/onsite/initialize', (req, res) => {
    res.status(404).json({ success: false, message: 'Not found' });
  });
}

/**
 * @route POST /api/payments/payfast/notify
 * @desc Handle PayFast notification (ITN)
 * @access Public (PayFast calls this endpoint) - SECURITY: Validate signature
 */
router.post('/payfast/notify', paymentController.handlePayFastNotification);

/**
 * @route GET /api/payments/status
 * @desc Get payment status for orders
 * @access Private - Authenticated users only
 */
router.get('/status', authenticate, paymentController.getPaymentStatus);

/**
 * @route POST /api/payments/create-order-and-pay
 * @desc Create order and initialize payment in one step
 * @access Private - Authenticated users only
 */
router.post('/create-order-and-pay', authenticate, paymentController.createOrderAndPay);

/**
 * @route POST /api/payments/confirm-success
 * @desc Confirm payment success and send admin notifications
 * @access Private - Authenticated users only
 */
router.post('/confirm-success', authenticate, paymentController.confirmPaymentSuccess);

export default router;
