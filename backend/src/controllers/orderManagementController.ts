import { Request, Response } from 'express';
import { AppDataSource } from '../db/data-source';
import { Order } from '../models/Order';
import { Doctor } from '../models/Doctor';
import { Product } from '../models/Product';
import { Notification } from '../models/Notification';
import { updateUserProfileAndRanking } from './orderController';
import { AuthenticatedRequest } from '../types/auth';

export const getAllOrders = async (req: Request, res: Response) => {
  try {
    // Use direct SQL query to avoid TypeORM column issues
    const ordersQuery = `
      SELECT 
        o.id,
        o.order_number,
        o.doctor_id,
        o.product_id,
        o.qty,
        o.order_total,
        o.status,
        o.payment_status,
        o.payment_method,
        o.payment_reference,
        o.payment_date,
        o.payment_transaction_id,
        CAST(o.payment_amount AS FLOAT) as payment_amount,
        o.payment_completed_at,
        o.notes,
        o.created_at,
        o.updated_at,
        d.doctor_name,
        d.email as doctor_email,
        p.name as product_name,
        p.price as product_price
      FROM orders o
      LEFT JOIN doctors d ON o.doctor_id = d.id
      LEFT JOIN products p ON o.product_id = p.id
      ORDER BY o.created_at DESC
    `;

    const orders = await AppDataSource.query(ordersQuery);

    const ordersWithDetails = orders.map((order: any) => {
      // Determine payment status based on payment information
      let paymentStatus = 'pending';
      if (order.payment_status === 'paid' && order.payment_completed_at) {
        paymentStatus = 'completed';
      } else if (order.payment_amount && order.payment_amount > 0 && order.payment_amount < order.order_total) {
        paymentStatus = 'partial';
      } else if (order.payment_status === 'pending' || !order.payment_amount) {
        paymentStatus = 'pending';
      }
      
      // Debug logging for payment status mapping
      if (order.doctor_email && order.doctor_email.includes('muhammadqasimshabbir825@gmail.com')) {
        console.log(`Order ${order.order_number}: payment_status=${order.payment_status}, payment_amount=${order.payment_amount}, payment_completed_at=${order.payment_completed_at}, mapped_status=${paymentStatus}`);
      }

      return {
        id: order.id,
        order_number: order.order_number,
        doctor_id: order.doctor_id,
        doctor_name: order.doctor_name || 'Unknown',
        doctor_email: order.doctor_email || 'Unknown',
        product_id: order.product_id,
        product_name: order.product_name || 'Unknown Product',
        product_price: order.product_price || 0,
        qty: order.qty,
        order_total: order.order_total,
        payment_amount: Number(order.payment_amount) || 0,
        remaining_amount: order.order_total - (Number(order.payment_amount) || 0),
        payment_status: paymentStatus,
        payment_method: order.payment_method || 'payfast',
        order_date: order.created_at,
        payment_date: order.payment_date,
        notes: order.notes,
        status: order.status,
        created_at: order.created_at,
        updated_at: order.updated_at
      };
    });

    // Calculate statistics
    const totalOrders = ordersWithDetails.length;
    const completedOrders = ordersWithDetails.filter((order: any) => order.payment_status === 'completed').length;
    const partialOrders = ordersWithDetails.filter((order: any) => order.payment_status === 'partial').length;
    const pendingOrders = ordersWithDetails.filter((order: any) => order.payment_status === 'pending').length;
    
    const totalRevenue = ordersWithDetails
      .filter((order: any) => order.payment_status === 'completed')
      .reduce((sum: number, order: any) => sum + Number(order.payment_amount), 0);
    
    const partialRevenue = ordersWithDetails
      .filter((order: any) => order.payment_status === 'partial')
      .reduce((sum: number, order: any) => sum + Number(order.payment_amount), 0);
    
    // Debug logging for statistics
    console.log(`📊 Statistics: total=${totalOrders}, completed=${completedOrders}, partial=${partialOrders}, pending=${pendingOrders}, revenue=${totalRevenue}, partialRevenue=${partialRevenue}`);
    
    const pendingRevenue = ordersWithDetails
      .filter((order: any) => order.payment_status === 'pending')
      .reduce((sum: number, order: any) => sum + (Number(order.order_total) - Number(order.payment_amount)), 0);

    res.json({
      success: true,
      data: ordersWithDetails,
      statistics: {
        totalOrders,
        completedOrders,
        partialOrders,
        pendingOrders,
        totalRevenue,
        partialRevenue,
        pendingRevenue
      }
    });
  } catch (error: unknown) {
    console.error('Error fetching orders:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch orders', error: (error instanceof Error ? error.message : String(error)) });
  }
};

export const updateOrderPaymentStatus = async (req: Request, res: Response): Promise<void> => {
  try {
    const { orderId } = req.params;
    const { paymentStatus, paymentAmount, notes } = req.body;

    const orderRepository = AppDataSource.getRepository(Order);
    const order = await orderRepository.findOne({ where: { id: orderId } });

    if (!order) {
      res.status(404).json({ success: false, message: 'Order not found' });
      return;
    }

    // Update payment information
    if (paymentStatus === 'completed') {
      order.payment_status = 'paid';
      order.payment_amount = paymentAmount !== undefined && paymentAmount !== null ? paymentAmount : order.order_total;
      order.payment_completed_at = new Date();
      order.status = 'completed';
      order.completed_at = new Date();
    } else if (paymentStatus === 'partial') {
      order.payment_status = 'partial';
      // If paymentAmount is provided, use it; otherwise keep existing payment_amount
      if (paymentAmount !== undefined && paymentAmount !== null) {
        order.payment_amount = paymentAmount;
      }
      // If no payment amount is set, default to 0
      if (!order.payment_amount) {
        order.payment_amount = 0;
      }
      order.status = 'pending_payment';
    } else if (paymentStatus === 'pending') {
      order.payment_status = 'pending';
      order.payment_amount = 0;
      order.status = 'pending';
    }

    if (notes) {
      order.notes = notes;
    }

    await orderRepository.save(order);

    // Update doctor tier based on status change (both directions)
    if (paymentStatus === 'completed' || paymentStatus === 'pending') {
      console.log(`🔄 Order ${order.order_number} status changed to ${paymentStatus} - updating tier`);
      await updateDoctorTierBasedOnPayments(order.doctor_id);
      
      // Create notification for status change
      const doctorRepository = AppDataSource.getRepository(Doctor);
      const notificationRepository = AppDataSource.getRepository(Notification);
      
      const doctor = await doctorRepository.findOne({ where: { id: order.doctor_id } });
      if (doctor) {
        const notification = new Notification();
        notification.recipient_id = doctor.id;
        notification.type = paymentStatus === 'completed' ? 'order_completed' : 'order_cancelled';
        notification.payload = {
          title: paymentStatus === 'completed' ? 'Order Completed' : 'Order Status Changed',
          message: `Your order #${order.order_number} has been ${paymentStatus === 'completed' ? 'completed' : 'changed to pending'}. Your tier has been updated accordingly.`,
          data: { 
            orderNumber: order.order_number, 
            orderTotal: order.order_total,
            newStatus: paymentStatus
          }
        };
        await notificationRepository.save(notification);
        console.log(`📧 Notification created for ${doctor.doctor_name} - Order ${paymentStatus}`);
      }
    }

    res.json({
      success: true,
      message: 'Order payment status updated successfully',
      data: order
    });
  } catch (error: unknown) {
    console.error('Error updating order payment status:', error);
    res.status(500).json({ success: false, message: 'Failed to update order', error: (error instanceof Error ? error.message : String(error)) });
  }
};

export const addPaymentToOrder = async (req: Request, res: Response): Promise<void> => {
  try {
    const { orderId } = req.params;
    const { paymentAmount, notes } = req.body;

    const orderRepository = AppDataSource.getRepository(Order);
    const order = await orderRepository.findOne({ where: { id: orderId } });

    if (!order) {
      res.status(404).json({ success: false, message: 'Order not found' });
      return;
    }

    const currentPayment = order.payment_amount || 0;
    const newPayment = currentPayment + paymentAmount;
    const totalAmount = order.order_total;

    // Update payment amount
    order.payment_amount = newPayment;

    // Determine new payment status
    if (newPayment >= totalAmount) {
      order.payment_status = 'paid';
      order.payment_completed_at = new Date();
      order.status = 'completed';
      order.completed_at = new Date();
    } else {
      order.payment_status = 'partial';
      order.status = 'pending_payment';
    }

    if (notes) {
      order.notes = notes;
    }

    await orderRepository.save(order);

    // Update doctor tier if payment is completed
    if (newPayment >= totalAmount) {
      await updateDoctorTierBasedOnPayments(order.doctor_id);
    }

    res.json({
      success: true,
      message: 'Payment added successfully',
      data: order
    });
  } catch (error: unknown) {
    console.error('Error adding payment to order:', error);
    res.status(500).json({ success: false, message: 'Failed to add payment', error: (error instanceof Error ? error.message : String(error)) });
  }
};

/**
 * Fix orders that are marked as completed but have payment_amount = 0
 * This is useful for fixing orders that were processed before the payment_amount fix
 */
export const fixCompletedOrdersPaymentAmount = async (req: Request, res: Response): Promise<void> => {
  try {
    const orderRepository = AppDataSource.getRepository(Order);
    const doctorRepository = AppDataSource.getRepository(Doctor);
    
    // Find all orders that are:
    // 1. Status = 'completed'
    // 2. Payment_status = 'paid' OR payment_method = 'payfast_online'
    // 3. Payment_amount = 0 OR payment_amount is NULL
    const ordersToFix = await orderRepository
      .createQueryBuilder('order')
      .where('order.status = :status', { status: 'completed' })
      .andWhere('(order.payment_status = :paidStatus OR order.payment_method = :payfastMethod)', {
        paidStatus: 'paid',
        payfastMethod: 'payfast_online'
      })
      .andWhere('(order.payment_amount = 0 OR order.payment_amount IS NULL)')
      .getMany();

    console.log(`🔧 Found ${ordersToFix.length} orders to fix`);

    const doctorsToUpdate = new Set<string>();
    let fixedCount = 0;

    for (const order of ordersToFix) {
      const orderTotal = Number(order.order_total) || 0;
      
      // Set payment_amount to order_total
      order.payment_amount = orderTotal;
      order.payment_status = 'paid';
      if (!order.payment_completed_at) {
        order.payment_completed_at = new Date();
      }
      
      await orderRepository.save(order);
      console.log(`   ✅ Fixed order ${order.order_number}: payment_amount=${orderTotal}`);
      
      doctorsToUpdate.add(order.doctor_id);
      fixedCount++;
    }

    // Update tier for all affected doctors
    if (doctorsToUpdate.size > 0) {
      console.log(`🔄 Updating tier progression for ${doctorsToUpdate.size} doctors`);
      for (const doctorId of doctorsToUpdate) {
        try {
          await updateDoctorTierBasedOnPayments(doctorId);
          console.log(`   ✅ Updated tier for doctor ${doctorId}`);
        } catch (error) {
          console.error(`   ❌ Error updating tier for doctor ${doctorId}:`, error);
        }
      }
    }

    res.json({
      success: true,
      message: `Fixed ${fixedCount} orders and updated tier for ${doctorsToUpdate.size} doctors`,
      data: {
        fixedOrders: fixedCount,
        doctorsUpdated: doctorsToUpdate.size
      }
    });
  } catch (error: unknown) {
    console.error('Error fixing completed orders:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fix orders',
      error: (error instanceof Error ? error.message : String(error))
    });
  }
};

const updateDoctorTierBasedOnPayments = async (doctorId: string) => {
  try {
    const orderRepository = AppDataSource.getRepository(Order);
    const doctorRepository = AppDataSource.getRepository(Doctor);

    // Get doctor first to check user type
    const doctor = await doctorRepository.findOne({ where: { id: doctorId } });
    if (!doctor) {
      console.error('Doctor not found for tier update:', doctorId);
      return;
    }
    
    // Skip tier updates for regular users and employees - they are not part of the tier system
    if (doctor.user_type !== 'doctor') {
      console.log(`Skipping tier update for ${doctor.user_type} user: ${doctorId}`);
      return;
    }

    // Get all completed orders for this doctor
    const completedOrders = await orderRepository.find({
      where: {
        doctor_id: doctorId,
        payment_status: 'paid'
      }
    });

    // Calculate total amount received - ensure proper number conversion
    const totalReceived = completedOrders.reduce((sum, order) => {
      const amount = Number(order.payment_amount) || 0;
      console.log(`Order ${order.order_number}: payment_amount=${order.payment_amount} (type: ${typeof order.payment_amount}), converted=${amount}`);
      return sum + amount;
    }, 0);
    
    console.log(`Total received for doctor ${doctorId}: ${totalReceived} (type: ${typeof totalReceived})`);

    // Update doctor's current_sales based on total received amount
    // Update the current_sales field which exists in the database
    doctor.current_sales = totalReceived;
    await doctorRepository.save(doctor);
    
    console.log(`Updated doctor ${doctor.doctor_name} sales to ${totalReceived} PKR`);
    
    // Trigger full tier progression update
    await updateUserProfileAndRanking(doctorId, totalReceived);
  } catch (error: unknown) {
    console.error('Error updating doctor tier:', error);
  }
};

/**
 * Delete all orders (admin only)
 * CRITICAL: This is a destructive operation that permanently deletes all orders
 */
export const deleteAllOrders = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const queryRunner = AppDataSource.createQueryRunner();
  await queryRunner.connect();
  await queryRunner.startTransaction();

  try {
    const admin = req.user!;
    
    if (!admin.is_admin) {
      await queryRunner.rollbackTransaction();
      res.status(403).json({
        success: false,
        message: 'Admin access required'
      });
      return;
    }

    const orderRepository = queryRunner.manager.getRepository(Order);
    
    // Get count before deletion for logging
    const totalOrders = await orderRepository.count();
    
    console.log(`⚠️ CRITICAL: Admin ${admin.email} (${admin.id}) is deleting ALL ${totalOrders} orders`);
    
    // Delete all orders
    await orderRepository.delete({});
    
    // SECURITY: Log this critical action
    try {
      const auditLogger = require('../middleware/auditLog').default;
      if (auditLogger && typeof auditLogger.log === 'function') {
        auditLogger.log({
          userId: admin.id,
          userEmail: admin.email,
          userType: admin.user_type || 'unknown',
          action: 'DELETE_ALL_ORDERS',
          resource: 'orders',
          ipAddress: auditLogger.getClientIp ? auditLogger.getClientIp(req) : req.ip || 'unknown',
          userAgent: req.headers['user-agent'] || 'unknown',
          details: {
            totalOrdersDeleted: totalOrders,
            timestamp: new Date().toISOString()
          },
          success: true
        });
      }
    } catch (auditError) {
      console.warn('Failed to log audit trail (non-critical):', auditError);
    }
    
    await queryRunner.commitTransaction();
    
    console.log(`✅ Successfully deleted ${totalOrders} orders`);
    
    res.json({
      success: true,
      message: `Successfully deleted ${totalOrders} orders`,
      deletedCount: totalOrders
    });
  } catch (error: unknown) {
    await queryRunner.rollbackTransaction();
    console.error('Error deleting all orders:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete all orders',
      error: error instanceof Error ? error.message : String(error)
    });
  } finally {
    await queryRunner.release();
  }
};

// Test endpoint to manually trigger tier progression for a doctor
export const testTierProgression = async (req: Request, res: Response): Promise<void> => {
  try {
    const { doctorId } = req.params;
    
    console.log(`🧪 Testing tier progression for doctor: ${doctorId}`);
    
    // First, let's check the doctor's orders
    const orderRepository = AppDataSource.getRepository(Order);
    const doctorRepository = AppDataSource.getRepository(Doctor);
    
    const doctor = await doctorRepository.findOne({ where: { id: doctorId } });
    if (!doctor) {
      res.status(404).json({ success: false, message: 'Doctor not found' });
      return;
    }
    
    const allOrders = await orderRepository.find({ where: { doctor_id: doctorId } });
    const paidOrders = allOrders.filter(order => order.payment_status === 'paid' && order.payment_amount > 0);
    
    console.log(`📊 Doctor ${doctor.doctor_name} orders:`, {
      totalOrders: allOrders.length,
      paidOrders: paidOrders.length,
      currentSales: doctor.current_sales,
      currentTier: doctor.tier
    });
    
    // Trigger tier progression update
    if (doctorId) {
      await updateDoctorTierBasedOnPayments(doctorId);
    }
    
    res.json({
      success: true,
      message: 'Tier progression test completed',
      doctorId: doctorId,
      debug: {
        totalOrders: allOrders.length,
        paidOrders: paidOrders.length,
        currentSales: doctor.current_sales,
        currentTier: doctor.tier
      }
    });
  } catch (error: unknown) {
    console.error('Error testing tier progression:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to test tier progression', 
      error: (error instanceof Error ? error.message : String(error)) 
    });
  }
};
