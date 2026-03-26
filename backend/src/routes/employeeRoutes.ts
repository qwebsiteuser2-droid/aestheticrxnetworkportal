import { Router } from 'express';
import { EmployeeController } from '../controllers/employeeController';
import { authenticate } from '../middleware/auth';

const router = Router();
const employeeController = new EmployeeController();

// All routes require authentication
router.use(authenticate);

// Employee routes
router.get('/orders', employeeController.getMyOrders.bind(employeeController));
router.get('/available-orders', employeeController.getAvailableOrders.bind(employeeController));
router.post('/accept-delivery', employeeController.acceptDelivery.bind(employeeController));
router.post('/start-delivery', employeeController.startDelivery.bind(employeeController));
router.post('/update-location', employeeController.updateDeliveryLocation.bind(employeeController));
router.post('/mark-delivered', employeeController.markDelivered.bind(employeeController));

export default router;
