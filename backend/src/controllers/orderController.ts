import { Request, Response } from 'express';
import { AppDataSource } from '../db/data-source';
import { Order } from '../models/Order';
import { Product } from '../models/Product';
import { Doctor } from '../models/Doctor';
import { Notification } from '../models/Notification';
import { LeaderboardSnapshot } from '../models/LeaderboardSnapshot';
import { TierConfig } from '../models/TierConfig';
import { emailService } from '../services/emailService';
import gmailService from '../services/gmailService';
import { whatsappService } from '../services/whatsappService';
import { DebtService } from '../services/debtService';
import { AuthenticatedRequest } from '../types/auth';
import { In } from 'typeorm';

// Tier benefits information
const getTierBenefits = (tierName: string): string => {
  return `
    <ul style="margin: 0; padding-left: 20px;">
      <li>✅ ${tierName} access enabled</li>
      <li>✅ Order placement capability</li>
      <li>✅ Community member benefits</li>
    </ul>
  `;
};

// Rate limiting for order creation (prevent duplicate orders)
const orderCreationAttempts = new Map<string, { count: number; lastAttempt: number }>();
const ORDER_RATE_LIMIT_WINDOW = 500; // 0.5 seconds
const MAX_ORDERS_PER_WINDOW = 20; // Allow 20 orders per window for large orders

// Cleanup old entries every 5 minutes to prevent memory leaks
setInterval(() => {
  const now = Date.now();
  for (const [key, value] of orderCreationAttempts.entries()) {
    if (now - value.lastAttempt > ORDER_RATE_LIMIT_WINDOW * 2) {
      orderCreationAttempts.delete(key);
    }
  }
}, 5 * 60 * 1000); // 5 minutes

/**
 * Create a new order
 */
export const createOrder = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const user = req.user!;
    const { product_id, qty, order_location, notes } = req.body;

    // Rate limiting check to prevent duplicate orders
    const userKey = `${user.id}-${product_id}`;
    const now = Date.now();
    const userAttempts = orderCreationAttempts.get(userKey);

    if (userAttempts) {
      const timeDiff = now - userAttempts.lastAttempt;
      if (timeDiff < ORDER_RATE_LIMIT_WINDOW && userAttempts.count >= MAX_ORDERS_PER_WINDOW) {
        const waitTime = Math.ceil((ORDER_RATE_LIMIT_WINDOW - timeDiff) / 1000);
        res.status(429).json({
          success: false,
          message: `Please wait ${waitTime} seconds before placing another order for this product. This prevents accidental duplicate orders.`
        });
        return;
      }
      
      if (timeDiff >= ORDER_RATE_LIMIT_WINDOW) {
        // Reset counter if window has passed
        orderCreationAttempts.set(userKey, { count: 1, lastAttempt: now });
      } else {
        // Increment counter
        orderCreationAttempts.set(userKey, { count: userAttempts.count + 1, lastAttempt: now });
      }
    } else {
      // First attempt
      orderCreationAttempts.set(userKey, { count: 1, lastAttempt: now });
    }

    // Check debt limit before allowing new orders
    const debtStatus = await DebtService.canUserPlaceOrder(user.id);
    if (!debtStatus.canPlaceOrder) {
      res.status(403).json({
        success: false,
        message: `You have reached your debt limit of PKR ${debtStatus.debtLimit.toLocaleString()} for your ${debtStatus.tierName} tier. Your current debt is PKR ${debtStatus.currentDebt.toLocaleString()}. Please pay your outstanding debts before placing new orders, or contact admin for support.`,
        debtStatus: {
          currentDebt: debtStatus.currentDebt,
          debtLimit: debtStatus.debtLimit,
          tierName: debtStatus.tierName,
          remainingLimit: debtStatus.remainingLimit
        }
      });
      return;
    }

    // Validate required fields
    if (!product_id || !qty || !order_location) {
      res.status(400).json({
        success: false,
        message: 'Product ID, quantity, and order location are required'
      });
      return;
    }

    // Validate quantity
    if (qty <= 0) {
      res.status(400).json({
        success: false,
        message: 'Quantity must be greater than 0'
      });
      return;
    }

    // Get product
    const productRepository = AppDataSource.getRepository(Product);
    const product = await productRepository.findOne({ where: { id: product_id } });

    if (!product) {
      res.status(404).json({
        success: false,
        message: 'Product not found'
      });
      return;
    }

    if (!product.is_visible) {
      res.status(400).json({
        success: false,
        message: 'Product is not available for ordering'
      });
      return;
    }

    // Check stock if available
    if (product.stock_quantity !== null && product.stock_quantity < qty) {
      res.status(400).json({
        success: false,
        message: 'Insufficient stock available'
      });
      return;
    }

    // Calculate order total
    const order_total = product.price ? product.price * qty : 0;

    // Generate unique order number
    const generateOrderNumber = async (): Promise<string> => {
      const orderRepository = AppDataSource.getRepository(Order);
      const lastOrder = await orderRepository.findOne({
        where: {},
        order: { created_at: 'DESC' }
      });
      
      const orderNumber = lastOrder && lastOrder.order_number ? 
        `ORD-${String(parseInt(lastOrder.order_number.split('-')[1]!) + 1).padStart(6, '0')}` :
        'ORD-000001';
      
      return orderNumber;
    };

    const order_number = await generateOrderNumber();

    // Check if this is a PayFast order (from notes or request body)
    const isPayFastOrder = notes?.toLowerCase().includes('payfast') || 
                          req.body.payment_method === 'payfast_online' ||
                          req.body.skip_notification === true;
    
    // Check if this is a Cash on Delivery order
    // If payment_method is explicitly 'cash_on_delivery', or if it's not PayFast and no payment method specified
    const isCashOnDelivery = req.body.payment_method === 'cash_on_delivery' || 
                            (req.body.payment_method !== 'payfast_online' && !isPayFastOrder);
    
    // Debug logging
    console.log('🔍 Order Payment Method Debug:', {
      payment_method_from_body: req.body.payment_method,
      notes: notes,
      isPayFastOrder: isPayFastOrder,
      isCashOnDelivery: isCashOnDelivery,
      skip_notification: req.body.skip_notification
    });

    // Create order with comprehensive information
    const orderRepository = AppDataSource.getRepository(Order);
    const order = orderRepository.create({
      order_number,
      doctor_id: user.id,
      product_id: product.id,
      qty,
      order_location: order_location,
      order_total,
      notes: notes || `Order placed by ${user.doctor_name} from ${user.clinic_name}. Delivery to: ${order_location.address}`,
      status: 'pending', // Changed from 'completed' to 'pending' - admin must approve
      payment_method: isPayFastOrder ? 'payfast_online' : (isCashOnDelivery ? 'cash_on_delivery' : undefined), // Set payment method appropriately
      payment_status: isPayFastOrder ? 'pending' : 'pending' // Both start as pending
    });

    const savedOrder = await orderRepository.save(order);

    // Note: Tier progression will only happen when admin changes status to 'completed'
    // This ensures tier progression is based on actual order completion, not just placement

    // Load relations for notifications
    const orderWithRelations = await orderRepository.findOne({
      where: { id: savedOrder.id },
      relations: ['doctor', 'product']
    });

    if (!orderWithRelations) {
      throw new Error('Failed to load order with relations');
    }

    // Create notification for admins
    const notificationRepository = AppDataSource.getRepository(Notification);
    const adminNotification = notificationRepository.create({
      recipient_id: user.id, // Will be sent to admins via service
      type: 'order_placed',
      payload: {
        title: 'New Order Placed',
        message: `New order #${savedOrder.order_number} for ${product.name} has been placed`,
        data: {
          orderId: savedOrder.id,
          orderNumber: savedOrder.order_number,
          productName: product.name,
          quantity: qty,
          total: order_total
        }
      }
    });

    await notificationRepository.save(adminNotification);

    // Send detailed notifications to admins (non-blocking)
    // SKIP notifications for PayFast orders - they will be sent after payment confirmation
    // SKIP individual notifications if skip_notification is true (batch notification will be sent)
    // Send notifications for Cash on Delivery orders immediately (unless skip_notification is true)
    if (!isPayFastOrder && !req.body.skip_notification) {
      try {
        // Get all admin emails (same logic as PayFast payment confirmation)
        const adminEmails: string[] = [];
        
        // Add environment variable emails first
        if (process.env.MAIN_ADMIN_EMAIL) {
          adminEmails.push(process.env.MAIN_ADMIN_EMAIL);
          console.log('✅ Added MAIN_ADMIN_EMAIL:', process.env.MAIN_ADMIN_EMAIL);
        }
        if (process.env.SECONDARY_ADMIN_EMAIL) {
          adminEmails.push(process.env.SECONDARY_ADMIN_EMAIL);
          console.log('✅ Added SECONDARY_ADMIN_EMAIL:', process.env.SECONDARY_ADMIN_EMAIL);
        }
        
        // Get all admins from database (parent admins and child Full Admins only)
        const doctorRepository = AppDataSource.getRepository(Doctor);
        const { AdminPermission } = await import('../models/AdminPermission');
        const permissionRepository = AppDataSource.getRepository(AdminPermission);
        
        // Get parent admins (is_admin = true, no permission record)
        const parentAdmins = await doctorRepository.find({
          where: { is_admin: true, is_deactivated: false }
        });
        
        // Get child Full Admins only (permission_type = 'full')
        const fullAdminPermissions = await permissionRepository.find({
          where: { 
            is_active: true,
            permission_type: 'full' // Only Full Admins, not Viewer or Custom
          },
          relations: ['doctor']
        });
        
        console.log(`📋 Found ${parentAdmins.length} parent admin(s) and ${fullAdminPermissions.length} Full Admin child admin(s) for Cash on Delivery notification`);
        
        // Add parent admin emails (filter out test emails)
        for (const admin of parentAdmins) {
          // Check if this admin has a permission record (if yes, they're child admin)
          const hasPermission = fullAdminPermissions.some(p => p.doctor_id === admin.id);
          if (!hasPermission && admin.email && !adminEmails.includes(admin.email)) {
            adminEmails.push(admin.email);
            console.log('✅ Added parent admin email:', admin.email);
          }
        }
        
        // Add child Full Admin emails
        for (const permission of fullAdminPermissions) {
          if (permission.doctor && permission.doctor.email && permission.doctor.is_approved && !permission.doctor.is_deactivated) {
            if (!adminEmails.includes(permission.doctor.email)) {
              adminEmails.push(permission.doctor.email);
              console.log('✅ Added Full Admin child admin email:', permission.doctor.email);
            }
          }
        }
        
        console.log(`📬 Total admin emails to notify: ${adminEmails.length}`);
        console.log('📧 Admin emails:', adminEmails);
        
        // Send cash on delivery notifications for non-PayFast orders
        console.log(`📧 Attempting to send Cash on Delivery notification for order ${orderWithRelations.order_number}`);
        console.log(`   Payment Method: ${req.body.payment_method || 'not specified'}`);
        console.log(`   Order Payment Method: ${orderWithRelations.payment_method || 'not set'}`);
        
        if (adminEmails.length > 0) {
          // Send email notification (non-blocking - order processing continues even if email fails)
          gmailService.sendOrderPlacedAlert(orderWithRelations, 'cash_on_delivery', undefined, adminEmails)
            .then(() => {
              console.log(`✅ Gmail notification sent successfully for order ${orderWithRelations.order_number}`);
            })
            .catch((err: unknown) => {
              console.error('❌ Failed to send Gmail notification:', err);
              console.error('Error details:', err instanceof Error ? err.message : String(err));
              console.error('Error stack:', err instanceof Error ? err.stack : 'No stack trace');
              // Order processing continues even if email fails
            });
          
          // Send WhatsApp notification (non-blocking)
          whatsappService.sendOrderPlacedAlert(orderWithRelations, 'cash_on_delivery')
            .then(() => {
              console.log(`✅ WhatsApp notification sent successfully for order ${orderWithRelations.order_number}`);
            })
            .catch(err => {
              console.error('❌ Failed to send WhatsApp notification:', err);
            });
        } else {
          console.warn('⚠️ No admin emails found! Cash on Delivery notifications will not be sent.');
        }
      } catch (error: unknown) {
        console.error('❌ Error setting up order notifications:', error);
        console.error('Error details:', error instanceof Error ? error.message : String(error));
        console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace');
        // Order processing continues even if notification setup fails
      }
    } else {
      console.log('⏭️ Skipping cash on delivery notification - PayFast order (will send after payment confirmation)');
    }
      
      // Log order details for admin tracking
      console.log('📦 NEW ORDER PLACED:', {
        order_number: orderWithRelations.order_number,
        customer: {
          name: orderWithRelations.doctor?.doctor_name || user.doctor_name,
          clinic: orderWithRelations.doctor?.clinic_name || user.clinic_name,
          email: orderWithRelations.doctor?.email || user.email,
          whatsapp: orderWithRelations.doctor?.whatsapp || user.whatsapp
        },
        product: {
          name: orderWithRelations.product?.name || product.name,
          description: orderWithRelations.product?.description || product.description,
          price: orderWithRelations.product?.price || product.price,
          category: orderWithRelations.product?.category || product.category
        },
        order_details: {
          quantity: qty,
          total: order_total,
          location: order_location.address,
          coordinates: `${order_location.lat}, ${order_location.lng}`,
          notes: orderWithRelations.notes
        },
        timestamp: orderWithRelations.created_at
      });

    res.status(201).json({
      success: true,
      message: 'Order created successfully',
      data: {
        order: orderWithRelations.toPublicJSON()
      }
    });
  } catch (error: unknown) {
    console.error('Create order error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create order'
    });
  }
};

/**
 * Send batch notification for multiple orders (one email for all orders)
 */
export const sendBatchOrderNotification = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const user = req.user!;
    const { order_ids, payment_method } = req.body;

    if (!order_ids || !Array.isArray(order_ids) || order_ids.length === 0) {
      res.status(400).json({
        success: false,
        message: 'order_ids array is required and must not be empty'
      });
      return;
    }

    const orderRepository = AppDataSource.getRepository(Order);
    
    // Fetch all orders with relations
    // Use In() for array query (TypeORM requires In() for array queries)
    const orders = await orderRepository.find({
      where: {
        id: In(order_ids),
        doctor_id: user.id // Ensure user owns these orders
      },
      relations: ['product', 'doctor']
    });

    if (orders.length === 0) {
      res.status(404).json({
        success: false,
        message: 'No orders found with the provided IDs'
      });
      return;
    }

    if (orders.length !== order_ids.length) {
      console.warn(`⚠️ Only found ${orders.length} out of ${order_ids.length} requested orders`);
    }

    // Get all admin emails (same logic as createOrder)
    const adminEmails: string[] = [];
    
    if (process.env.MAIN_ADMIN_EMAIL) {
      adminEmails.push(process.env.MAIN_ADMIN_EMAIL);
    }
    if (process.env.SECONDARY_ADMIN_EMAIL) {
      adminEmails.push(process.env.SECONDARY_ADMIN_EMAIL);
    }
    
    const doctorRepository = AppDataSource.getRepository(Doctor);
    const { AdminPermission } = await import('../models/AdminPermission');
    const permissionRepository = AppDataSource.getRepository(AdminPermission);
    
    const parentAdmins = await doctorRepository.find({
      where: { is_admin: true, is_deactivated: false }
    });
    
    const fullAdminPermissions = await permissionRepository.find({
      where: { 
        is_active: true,
        permission_type: 'full'
      },
      relations: ['doctor']
    });
    
    // Add parent admin emails (filter out test emails)
    for (const admin of parentAdmins) {
      const hasPermission = fullAdminPermissions.some(p => p.doctor_id === admin.id);
      if (!hasPermission && admin.email && !adminEmails.includes(admin.email)) {
        adminEmails.push(admin.email);
      }
    }
    
    // Add child Full Admin emails
    for (const permission of fullAdminPermissions) {
      if (permission.doctor && permission.doctor.email && 
          permission.doctor.is_approved && !permission.doctor.is_deactivated &&
          !adminEmails.includes(permission.doctor.email)) {
        adminEmails.push(permission.doctor.email);
      }
    }

    const paymentMethod = payment_method || 'cash_on_delivery';

    // Send batch notification (non-blocking - return immediately, send email in background)
    // This prevents timeout errors if email sending takes too long
    gmailService.sendBatchOrderPlacedAlert(orders, paymentMethod, adminEmails)
      .then(() => {
        console.log(`✅ Batch notification sent for ${orders.length} order(s)`);
      })
      .catch((error: unknown) => {
        console.error('❌ Failed to send batch notification:', error);
        console.error('Error details:', error instanceof Error ? error.message : String(error));
        // Email failure doesn't affect the response
      });
    
    // Return immediately - don't wait for email to be sent
    res.status(200).json({
      success: true,
      message: `Batch notification queued for ${orders.length} order(s)`,
      data: {
        orders_count: orders.length,
        order_numbers: orders.map(o => o.order_number)
      }
    });
  } catch (error: unknown) {
    console.error('Send batch order notification error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to send batch order notification'
    });
  }
};

/**
 * Get orders for current user
 */
export const getMyOrders = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const user = req.user!;
    const { page = 1, limit = 20, status } = req.query;

    const orderRepository = AppDataSource.getRepository(Order);
    const queryBuilder = orderRepository.createQueryBuilder('order')
      .leftJoinAndSelect('order.product', 'product')
      .where('order.doctor_id = :doctorId', { doctorId: user.id });

    // Filter by status if provided
    if (status) {
      queryBuilder.andWhere('order.status = :status', { status });
    }

    // Order by creation date (newest first)
    queryBuilder.orderBy('order.created_at', 'DESC');

    // Pagination
    const skip = (Number(page) - 1) * Number(limit);
    queryBuilder.skip(skip).take(Number(limit));

    const [orders, total] = await queryBuilder.getManyAndCount();

    res.json({
      success: true,
      data: {
        orders: orders.map(order => order.toPublicJSON()),
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total,
          pages: Math.ceil(total / Number(limit))
        }
      }
    });
  } catch (error: unknown) {
    console.error('Get my orders error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch orders'
    });
  }
};

/**
 * Get order by ID (user's own orders or admin)
 */
export const getOrderById = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const user = req.user!;
    const { id } = req.params;

    const orderRepository = AppDataSource.getRepository(Order);
    const order = await orderRepository.findOne({
      where: { id },
      relations: ['doctor', 'product']
    });

    if (!order) {
      res.status(404).json({
        success: false,
        message: 'Order not found'
      });
      return;
    }

    // Check if user can access this order
    if (!user.is_admin && order.doctor_id !== user.id) {
      res.status(403).json({
        success: false,
        message: 'Access denied'
      });
      return;
    }

    const orderData = user.is_admin ? order.toAdminJSON() : order.toPublicJSON();

    res.json({
      success: true,
      data: {
        order: orderData
      }
    });
  } catch (error: unknown) {
    console.error('Get order by ID error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch order'
    });
  }
};

/**
 * Update order status (admin only)
 */
export const updateOrderStatus = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const user = req.user!;
    const { id } = req.params;
    const { status, notes } = req.body;

    if (!user.is_admin) {
      res.status(403).json({
        success: false,
        message: 'Admin access required'
      });
      return;
    }

    const validStatuses = ['pending', 'accepted', 'completed', 'cancelled'];
    if (!validStatuses.includes(status)) {
      res.status(400).json({
        success: false,
        message: 'Invalid status'
      });
      return;
    }

    const orderRepository = AppDataSource.getRepository(Order);
    const order = await orderRepository.findOne({
      where: { id },
      relations: ['doctor', 'product']
    });

    if (!order) {
      res.status(404).json({
        success: false,
        message: 'Order not found'
      });
      return;
    }

    // Update status
    order.status = status as any;
    if (notes) order.notes = notes;

    // Set timestamps based on status
    switch (status) {
      case 'accepted':
        order.accept();
        break;
      case 'completed':
        order.complete();
        // Update user profile and ranking when order is completed
        await updateUserProfileAndRanking(order.doctor_id, order.order_total);
        break;
      case 'cancelled':
        order.cancel(notes);
        break;
    }

    const updatedOrder = await orderRepository.save(order);

    // Create notification for doctor
    const notificationRepository = AppDataSource.getRepository(Notification);
    const doctorNotification = notificationRepository.create({
      recipient_id: order.doctor_id,
      type: `order_${status}` as any,
      payload: {
        title: `Order ${status.charAt(0).toUpperCase() + status.slice(1)}`,
        message: `Your order #${order.order_number} has been ${status}`,
        data: {
          orderId: order.id,
          orderNumber: order.order_number,
          status,
          notes
        }
      }
    });

    await notificationRepository.save(doctorNotification);

    res.json({
      success: true,
      message: `Order ${status} successfully`,
      data: {
        order: updatedOrder.toAdminJSON()
      }
    });
  } catch (error: unknown) {
    console.error('Update order status error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update order status'
    });
  }
};

/**
 * Get all orders (admin only)
 */
export const getAllOrders = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const user = req.user!;

    // SECURITY: Double-check admin status (middleware should handle this, but extra check)
    if (!user.is_admin) {
      // SECURITY: Log unauthorized access attempt
      const auditLogger = require('../middleware/auditLog').default;
      auditLogger.log({
        userId: user.id,
        userEmail: user.email,
        userType: user.user_type || 'unknown',
        action: 'UNAUTHORIZED_ORDER_ACCESS_ATTEMPT',
        resource: 'orders',
        ipAddress: auditLogger.getClientIp(req),
        userAgent: req.headers['user-agent'] || 'unknown',
        details: {
          method: req.method,
          path: req.path,
          reason: 'Non-admin attempted to access all orders'
        },
        success: false,
        error: 'Admin access required'
      });
      
      res.status(403).json({
        success: false,
        message: 'Admin access required'
      });
      return;
    }

    const { page = 1, limit = 20, status, doctor_id, product_id } = req.query;

    const orderRepository = AppDataSource.getRepository(Order);
    const queryBuilder = orderRepository.createQueryBuilder('order')
      .leftJoinAndSelect('order.doctor', 'doctor')
      .leftJoinAndSelect('order.product', 'product');

    // Apply filters
    if (status) {
      queryBuilder.andWhere('order.status = :status', { status });
    }

    if (doctor_id) {
      queryBuilder.andWhere('order.doctor_id = :doctorId', { doctorId: doctor_id });
    }

    if (product_id) {
      queryBuilder.andWhere('order.product_id = :productId', { productId: product_id });
    }

    // Order by creation date (newest first)
    queryBuilder.orderBy('order.created_at', 'DESC');

    // Pagination
    const skip = (Number(page) - 1) * Number(limit);
    queryBuilder.skip(skip).take(Number(limit));

    const [orders, total] = await queryBuilder.getManyAndCount();

    res.json({
      success: true,
      data: {
        orders: orders.map(order => order.toAdminJSON()),
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total,
          pages: Math.ceil(total / Number(limit))
        }
      }
    });
  } catch (error: unknown) {
    console.error('Get all orders error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch orders'
    });
  }
};

/**
 * Update user profile and ranking when order is completed
 */
export const updateUserProfileAndRanking = async (doctorId: string, orderTotal: number): Promise<void> => {
  try {
    const doctorRepository = AppDataSource.getRepository(Doctor);
    const doctor = await doctorRepository.findOne({
      where: { id: doctorId },
      relations: ['orders']
    });

    if (!doctor) {
      console.error('Doctor not found for ranking update:', doctorId);
      return;
    }

    // Skip tier updates for regular users and employees - they are not part of the tier system
    if (doctor.user_type !== 'doctor') {
      console.log(`Skipping tier update for ${doctor.user_type} user: ${doctorId}`);
      return;
    }

    // Calculate new sales total based on ACTUAL PAYMENTS RECEIVED (not order totals)
    const paidOrders = doctor.orders.filter(order => 
      order.payment_status === 'paid' && order.payment_amount > 0
    );
    const newSalesTotal = paidOrders.reduce((sum, order) => {
      const amount = Number(order.payment_amount) || 0;
      console.log(`Order ${order.order_number}: payment_amount=${order.payment_amount} (type: ${typeof order.payment_amount}), converted=${amount}`);
      return sum + amount;
    }, 0);
    
    console.log(`New sales total for doctor ${doctorId}: ${newSalesTotal} (type: ${typeof newSalesTotal})`);

    // Get tier configurations to calculate new tier
    const tierRepository = AppDataSource.getRepository(TierConfig);
    const tiers = await tierRepository.find({
      where: { is_active: true },
      order: { display_order: 'ASC' }
    });

    // Find current tier based on sales
    let currentTier: TierConfig | undefined = tiers[0]; // Default to first tier
    let currentTierIndex = 0;
    for (let i = tiers.length - 1; i >= 0; i--) {
      const threshold = parseFloat(String(tiers[i]?.threshold));
      if (newSalesTotal >= threshold) {
        currentTier = tiers[i];
        currentTierIndex = i;
        break;
      }
    }

    if (!currentTier) {
      console.error('❌ No tier configuration found');
      return;
    }

    // Find next tier for progress calculation
    const nextTier = currentTierIndex < tiers.length - 1 ? tiers[currentTierIndex + 1] : null;
    
    let tierProgress = 0;
    if (nextTier) {
      const currentTierThreshold = parseFloat(String(currentTier.threshold));
      const nextTierThreshold = parseFloat(String(nextTier.threshold));
      const progress = ((newSalesTotal - currentTierThreshold) / (nextTierThreshold - currentTierThreshold)) * 100;
      tierProgress = Math.min(Math.max(progress, 0), 100);
    } else {
      // If at highest tier, show 100% progress
      tierProgress = 100;
    }

    // Check if tier has changed and find all tiers achieved
    const oldTier = doctor.tier;
    const tierChanged = oldTier !== currentTier.name;
    
    // Find all tiers that were achieved (from old tier to new tier)
    const achievedTiers: TierConfig[] = [];
    if (tierChanged) {
      const oldTierIndex = tiers.findIndex(t => t.name === oldTier);
      const newTierIndex = currentTierIndex;
      
      // If old tier was found, include all tiers from old+1 to new
      if (oldTierIndex >= 0) {
        for (let i = oldTierIndex + 1; i <= newTierIndex; i++) {
          if (tiers[i]) {
            achievedTiers.push(tiers[i]!);
          }
        }
      } else {
        // If old tier not found, just include the new tier
        if (currentTier) {
          achievedTiers.push(currentTier);
        }
      }
    }

    // Update doctor's tier information in database
    doctor.tier = currentTier?.name || 'Lead Starter';
    doctor.tier_color = currentTier?.color || 'gray';
    doctor.tier_progress = tierProgress;
    doctor.current_sales = newSalesTotal;
    
    // Reset debt limit when order is completed (payment received)
    if (orderTotal > 0) {
      doctor.total_owed_amount = Math.max(0, (doctor.total_owed_amount || 0) - orderTotal);
      doctor.debt_limit_exceeded = false;
      console.log(`💰 Debt reset for ${doctor.doctor_name}: reduced by ${orderTotal} PKR, new debt: ${doctor.total_owed_amount} PKR`);
    }
    
    await doctorRepository.save(doctor);

    // Send tier update notifications for each tier achieved
    if (tierChanged && achievedTiers.length > 0) {
      console.log(`🎉 Tier changed for ${doctor.doctor_name}: ${oldTier} → ${currentTier.name}`);
      console.log(`🏆 Achieved ${achievedTiers.length} tier(s): ${achievedTiers.map(t => t.name).join(', ')}`);
      
      const notificationRepository = AppDataSource.getRepository(Notification);
      
      // Send notifications for each tier achieved
      for (let i = 0; i < achievedTiers.length; i++) {
        const tier = achievedTiers[i];
        if (!tier) continue;
        
        try {
          // Create notification in database
          const notification = Notification.createTierUp(
            doctor.id,
            tier.name,
            doctor.clinic_name || ''
          );
          notification.payload = {
            title: 'Tier Advancement!',
            message: `Congratulations! ${doctor.clinic_name} has advanced to ${tier.name} tier!`,
            data: { 
              newTier: tier.name, 
              clinicName: doctor.clinic_name,
              tierIndex: i + 1,
              totalTiers: achievedTiers.length,
              tierBenefits: getTierBenefits(tier.name)
            }
          };
          await notificationRepository.save(notification);
          console.log(`📧 Notification created for ${tier.name} tier (${i + 1}/${achievedTiers.length})`);
          
          // Send notifications in background (non-blocking)
          const tierBenefits = getTierBenefits(tier.name);
          
          // Send Gmail notification (non-blocking)
          gmailService.sendTierUpdateNotification(doctor, oldTier, tier.name, tierBenefits)
            .then(() => {
              console.log(`✅ Tier update - Gmail notification sent to ${doctor.email} for ${tier.name} tier (${i + 1}/${achievedTiers.length}) (background)`);
              // Mark notification as sent (non-blocking)
              notification.email_sent = true;
              notification.sent_at = new Date();
              notificationRepository.save(notification)
                .then(() => {
                  console.log(`✅ Tier update - Notification marked as sent for ${tier.name} tier`);
                })
                .catch((saveError: unknown) => {
                  console.error(`⚠️ Tier update - Failed to mark notification as sent for ${tier.name} tier:`, saveError);
                });
            })
            .catch((emailError: unknown) => {
              console.error(`⚠️ Tier update - Gmail notification failed for ${tier.name} tier (non-blocking):`, emailError);
            });
          
          // Send achievement certificate for this tier (non-blocking)
          (async () => {
            try {
              const { CertificateService } = await import('../services/certificateService');
              await CertificateService.sendCertificate(doctor, tier, new Date(), true, achievedTiers, i);
              console.log(`✅ Tier update - Achievement certificate sent to ${doctor.email} for ${tier.name} tier (${i + 1}/${achievedTiers.length}) (background)`);
            } catch (certError) {
              console.error(`⚠️ Tier update - Failed to send certificate for ${tier.name} tier (non-blocking):`, certError);
            }
          })();
          
        } catch (error: unknown) {
          console.error(`❌ Failed to send notifications for ${tier.name} tier:`, error);
        }
      }
    }

    // Get current tier info for logging
    const currentTierName = doctor.tier;
    const currentProgress = doctor.tier_progress;
    const currentSales = doctor.current_sales;

    // Log the ranking update
    console.log('🏆 RANKING UPDATE (Based on Actual Payments):', {
      doctor: {
        id: doctor.id,
        name: doctor.doctor_name,
        clinic: doctor.clinic_name,
        email: doctor.email
      },
      payments: {
        total_paid_orders: paidOrders.length,
        total_payments_received: newSalesTotal,
        trigger_order_total: orderTotal
      },
      tier_info: {
        old_tier: oldTier,
        new_tier: currentTier.name,
        tier_changed: tierChanged,
        current_progress: doctor.tier_progress,
        current_sales: doctor.current_sales
      }
    });

    // Create leaderboard snapshot for tracking
    const leaderboardRepository = AppDataSource.getRepository(LeaderboardSnapshot);
    const snapshot = leaderboardRepository.create({
      doctor_id: doctor.id,
      current_sales: newSalesTotal,
      tier: doctor.tier,
      rank: 1, // Will be calculated properly in a real implementation
      total_doctors: 1, // Will be calculated properly in a real implementation
      snapshot_date: new Date()
    });

    await leaderboardRepository.save(snapshot);

    // Create notification for tier progression
    if (oldTier !== doctor.tier) {
      const notificationRepository = AppDataSource.getRepository(Notification);
      const tierNotification = notificationRepository.create({
        recipient_id: doctor.id,
        type: 'tier_up',
        payload: {
          title: '🎉 Tier Upgrade!',
          message: `Congratulations! You've been promoted to ${doctor.tier} tier!`,
          data: {
            old_tier: currentTier.name,
            new_tier: doctor.tier,
            sales_total: newSalesTotal,
            progress: doctor.tier_progress
          }
        }
      });

      await notificationRepository.save(tierNotification);
      console.log('🎉 TIER UPGRADE:', {
        doctor: doctor.doctor_name,
        old_tier: currentTier,
        new_tier: doctor.tier,
        sales_total: newSalesTotal
      });
    }

  } catch (error: unknown) {
    console.error('Error updating user profile and ranking:', error);
  }
};
