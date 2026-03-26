import { Router } from 'express';
import paymentControllerTest from '../controllers/paymentControllerTest';

const router = Router();

/**
 * @route POST /api/payments/test/payfast/initialize
 * @desc Initialize PayFast payment for testing (no authentication required)
 * @access Public
 */
router.post('/payfast/initialize', paymentControllerTest.initializePayFastPayment);

/**
 * @route POST /api/payments/test/payfast/notify
 * @desc Handle PayFast notification (ITN) for testing
 * @access Public (PayFast calls this endpoint)
 */
router.post('/payfast/notify', paymentControllerTest.handlePayFastNotification);

/**
 * @route GET /api/payments/test/payfast/service
 * @desc Test PayFast service directly
 * @access Public
 */
router.get('/payfast/service', paymentControllerTest.testPayFastService);

export default router;
