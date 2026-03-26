import { Request, Response } from 'express';
import { AppDataSource } from '../db/data-source';
import { Order } from '../models/Order';
import { Doctor, UserType } from '../models/Doctor';
import { AuthenticatedRequest } from '../types/auth';
import gmailService from '../services/gmailService';

export class EmployeeController {
  /**
   * Get orders assigned to the employee
   */
  async getMyOrders(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const employeeId = req.user?.id;
      
      if (!employeeId) {
        res.status(401).json({
          success: false,
          message: 'Unauthorized'
        });
        return;
      }

      // Verify user is an employee
      if (req.user?.user_type !== UserType.EMPLOYEE) {
        res.status(403).json({
          success: false,
          message: 'Access denied. Employee access only.'
        });
        return;
      }

      const orderRepository = AppDataSource.getRepository(Order);
      
      // Get all orders assigned to this employee (including delivered for "Done" tab)
      const orders = await orderRepository
        .createQueryBuilder('order')
        .where('order.assigned_employee_id = :employeeId', { employeeId })
        .leftJoinAndSelect('order.doctor', 'doctor')
        .leftJoinAndSelect('order.product', 'product')
        .orderBy('order.delivery_assigned_at', 'DESC')
        .addOrderBy('order.created_at', 'DESC')
        .getMany();

      const mappedOrders = orders.map(order => {
        const orderJson = order.toJSON();
        // Ensure delivery_status is included explicitly
        return {
          ...orderJson,
          delivery_status: order.delivery_status || orderJson.delivery_status || null,
          delivery_assigned_at: order.delivery_assigned_at || orderJson.delivery_assigned_at || null,
          delivery_started_at: order.delivery_started_at || orderJson.delivery_started_at || null,
          delivery_completed_at: order.delivery_completed_at || orderJson.delivery_completed_at || null,
          customer: order.doctor ? {
            name: order.doctor.doctor_name,
            email: order.doctor.email,
            whatsapp: order.doctor.whatsapp,
            clinic_name: order.doctor.clinic_name
          } : null,
          product: order.product ? {
            name: order.product.name,
            description: order.product.description
          } : null
        };
      });
      
      console.log(`📦 Employee ${employeeId} orders:`, mappedOrders.map((o: any) => ({
        order_number: o.order_number,
        delivery_status: o.delivery_status,
        status: o.status
      })));

      res.json({
        success: true,
        data: mappedOrders
      });
    } catch (error: unknown) {
      console.error('Error fetching employee orders:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch orders'
      });
    }
  }

  /**
   * Get available orders that can be assigned
   */
  async getAvailableOrders(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const employeeId = req.user?.id;
      
      if (!employeeId) {
        res.status(401).json({
          success: false,
          message: 'Unauthorized'
        });
        return;
      }

      if (req.user?.user_type !== UserType.EMPLOYEE) {
        res.status(403).json({
          success: false,
          message: 'Access denied. Employee access only.'
        });
        return;
      }

      const orderRepository = AppDataSource.getRepository(Order);
      
      // Get orders that are accepted but not yet assigned or assigned to this employee
      const orders = await orderRepository.find({
        where: [
          { status: 'accepted', assigned_employee_id: undefined as any },
          { status: 'accepted', assigned_employee_id: employeeId }
        ],
        relations: ['doctor', 'product'],
        order: { created_at: 'DESC' }
      });

      res.json({
        success: true,
        data: orders.map(order => ({
          ...order.toJSON(),
          customer: order.doctor ? {
            name: order.doctor.doctor_name,
            email: order.doctor.email,
            whatsapp: order.doctor.whatsapp,
            clinic_name: order.doctor.clinic_name,
            address: order.order_location
          } : null,
          product: order.product ? {
            name: order.product.name,
            description: order.product.description
          } : null
        }))
      });
    } catch (error: unknown) {
      console.error('Error fetching available orders:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch available orders'
      });
    }
  }

  /**
   * Accept a delivery task
   */
  async acceptDelivery(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const employeeId = req.user?.id;
      const { orderId } = req.body;

      if (!employeeId) {
        res.status(401).json({
          success: false,
          message: 'Unauthorized'
        });
        return;
      }

      if (req.user?.user_type !== UserType.EMPLOYEE) {
        res.status(403).json({
          success: false,
          message: 'Access denied. Employee access only.'
        });
        return;
      }

      if (!orderId) {
        res.status(400).json({
          success: false,
          message: 'Order ID is required'
        });
        return;
      }

      const orderRepository = AppDataSource.getRepository(Order);
      const order = await orderRepository.findOne({
        where: { id: orderId },
        relations: ['doctor', 'product', 'assigned_employee']
      });

      if (!order) {
        res.status(404).json({
          success: false,
          message: 'Order not found'
        });
        return;
      }

      if (order.status !== 'accepted') {
        res.status(400).json({
          success: false,
          message: 'Order must be accepted before assignment'
        });
        return;
      }

      // Assign order to employee
      order.assigned_employee_id = employeeId;
      order.delivery_status = 'assigned';
      order.delivery_assigned_at = new Date();

      await orderRepository.save(order);

      // Send Gmail notification to customer in background (non-blocking)
      if (order.doctor) {
        gmailService.sendDeliveryAssignedNotification(order)
          .then(() => {
            console.log('✅ Delivery acceptance - Customer notification sent successfully (background)');
          })
          .catch((error: unknown) => {
            console.error('⚠️ Delivery acceptance - Customer notification failed (non-blocking):', error);
          });
      }

      // Return response immediately after saving to database
      res.json({
        success: true,
        message: 'Delivery task accepted successfully',
        data: order.toJSON()
      });
    } catch (error: unknown) {
      console.error('Error accepting delivery:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to accept delivery task'
      });
    }
  }

  /**
   * Start delivery (mark as in transit)
   */
  async startDelivery(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const employeeId = req.user?.id;
      const { orderId } = req.body;

      if (!employeeId) {
        res.status(401).json({
          success: false,
          message: 'Unauthorized'
        });
        return;
      }

      if (req.user?.user_type !== UserType.EMPLOYEE) {
        res.status(403).json({
          success: false,
          message: 'Access denied. Employee access only.'
        });
        return;
      }

      if (!orderId) {
        res.status(400).json({
          success: false,
          message: 'Order ID is required'
        });
        return;
      }

      const orderRepository = AppDataSource.getRepository(Order);
      const order = await orderRepository.findOne({
        where: { id: orderId, assigned_employee_id: employeeId },
        relations: ['doctor', 'product', 'assigned_employee']
      });

      if (!order) {
        res.status(404).json({
          success: false,
          message: 'Order not found or not assigned to you'
        });
        return;
      }

      // Check if order is already in transit or delivered
      if (order.delivery_status === 'in_transit') {
        res.status(400).json({
          success: false,
          message: 'Order is already in transit. Please check the "In Progress" tab.'
        });
        return;
      }
      
      if (order.delivery_status === 'delivered') {
        res.status(400).json({
          success: false,
          message: 'Order has already been delivered.'
        });
        return;
      }
      
      // If order doesn't have delivery_status but is accepted or pending, set it to assigned first
      if (!order.delivery_status && (order.status === 'accepted' || order.status === 'pending')) {
        order.delivery_status = 'assigned';
        order.delivery_assigned_at = new Date();
      }
      
      // Only allow starting if status is 'assigned' or if we just set it to assigned
      if (order.delivery_status !== 'assigned') {
        res.status(400).json({
          success: false,
          message: `Order is not in assigned status. Current delivery status: ${order.delivery_status || 'none'}, Order status: ${order.status}`
        });
        return;
      }

      order.delivery_status = 'in_transit';
      order.delivery_started_at = new Date();

      await orderRepository.save(order);

      // Send Gmail notification to customer that order is on its way
      const employeeName = req.user?.doctor_name || 'Delivery Personnel';
      try {
        await gmailService.sendDeliveryOnTheWayNotification(order, employeeName);
      } catch (error: unknown) {
        console.error('Failed to send delivery notification:', error);
        // Don't fail the request if email fails
      }

      res.json({
        success: true,
        message: 'Delivery started and customer notified',
        data: order.toJSON()
      });
    } catch (error: unknown) {
      console.error('Error starting delivery:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to start delivery'
      });
    }
  }

  /**
   * Update delivery location (for live tracking)
   */
  async updateDeliveryLocation(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const employeeId = req.user?.id;
      const { orderId, location } = req.body;

      if (!employeeId || !orderId || !location) {
        res.status(400).json({
          success: false,
          message: 'Order ID and location are required'
        });
        return;
      }

      if (req.user?.user_type !== UserType.EMPLOYEE) {
        res.status(403).json({
          success: false,
          message: 'Access denied. Employee access only.'
        });
        return;
      }

      const orderRepository = AppDataSource.getRepository(Order);
      const order = await orderRepository.findOne({
        where: { id: orderId, assigned_employee_id: employeeId },
        relations: ['doctor', 'product', 'assigned_employee']
      });

      if (!order) {
        res.status(404).json({
          success: false,
          message: 'Order not found or not assigned to you'
        });
        return;
      }

      // Only update location if delivery is in transit
      if (order.delivery_status !== 'in_transit') {
        res.status(400).json({
          success: false,
          message: 'Delivery must be in transit to update location'
        });
        return;
      }

      order.delivery_location = {
        lat: location.lat,
        lng: location.lng,
        timestamp: new Date()
      };

      await orderRepository.save(order);

      // Send Gmail notifications with updated location to customer and admins
      const employeeName = req.user?.doctor_name || 'Delivery Personnel';
      try {
        await gmailService.sendLiveLocationNotification(order, location, employeeName);
      } catch (error: unknown) {
        console.error('Failed to send live location notification:', error);
        // Don't fail the request if email fails
      }

      res.json({
        success: true,
        message: 'Location updated and notifications sent'
      });
    } catch (error: unknown) {
      console.error('Error updating delivery location:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update location'
      });
    }
  }

  /**
   * Mark order as delivered
   */
  async markDelivered(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const employeeId = req.user?.id;
      const { orderId } = req.body;

      if (!employeeId) {
        res.status(401).json({
          success: false,
          message: 'Unauthorized'
        });
        return;
      }

      if (req.user?.user_type !== UserType.EMPLOYEE) {
        res.status(403).json({
          success: false,
          message: 'Access denied. Employee access only.'
        });
        return;
      }

      if (!orderId) {
        res.status(400).json({
          success: false,
          message: 'Order ID is required'
        });
        return;
      }

      const orderRepository = AppDataSource.getRepository(Order);
      const order = await orderRepository.findOne({
        where: { id: orderId, assigned_employee_id: employeeId },
        relations: ['doctor']
      });

      if (!order) {
        res.status(404).json({
          success: false,
          message: 'Order not found or not assigned to you'
        });
        return;
      }

      // Check if order is already delivered to prevent duplicate emails
      if (order.delivery_status === 'delivered') {
        res.status(400).json({
          success: false,
          message: 'Order has already been marked as delivered'
        });
        return;
      }

      order.delivery_status = 'delivered';
      order.delivery_completed_at = new Date();
      // Also mark order as completed
      order.status = 'completed';
      order.completed_at = new Date();

      await orderRepository.save(order);

      // Reload order with relations for email
      const orderWithRelations = await orderRepository.findOne({
        where: { id: orderId },
        relations: ['doctor', 'product', 'assigned_employee']
      });

      // Send delivery confirmation email to customer and admins (only once)
      if (orderWithRelations && orderWithRelations.doctor) {
        try {
          await gmailService.sendDeliveryCompletedNotification(orderWithRelations);
          console.log(`✅ Delivery completed notification sent for order ${order.order_number}`);
        } catch (error: unknown) {
          console.error('Failed to send delivery confirmation:', error);
          // Don't fail the request if email fails
        }
      }

      res.json({
        success: true,
        message: 'Order marked as delivered',
        data: order.toJSON()
      });
    } catch (error: unknown) {
      console.error('Error marking order as delivered:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to mark order as delivered'
      });
    }
  }
}
