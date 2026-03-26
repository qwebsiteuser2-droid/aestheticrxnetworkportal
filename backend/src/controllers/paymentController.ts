import { Request, Response } from 'express';
import { AppDataSource } from '../db/data-source';
import { Order } from '../models/Order';
import { Doctor } from '../models/Doctor';
import { Product } from '../models/Product';
import { PayFastITN } from '../models/PayFastITN';
import PayFastService from '../services/payfastService';
import { AuthenticatedRequest } from '../types/auth';
import gmailService from '../services/gmailService';
import { whatsappService } from '../services/whatsappService';
import { DebtService } from '../services/debtService';
import { updateUserProfileAndRanking } from './orderController';
import { In } from 'typeorm';

export class PaymentController {
  /**
   * Initialize PayFast OnSite payment for orders (Public endpoint for testing)
   */
  initializePayFastOnSitePayment = async (req: Request, res: Response): Promise<void> => {
    try {
      const { orderIds, customerEmail, customerName, totalAmount } = req.body;

      console.log('🚀 PayFast OnSite payment initialization requested');
      console.log('   Order IDs:', orderIds);
      console.log('   Customer Email:', customerEmail);
      console.log('   Customer Name:', customerName);
      console.log('   Total Amount:', totalAmount);

      if (!orderIds || !Array.isArray(orderIds) || orderIds.length === 0) {
        res.status(400).json({
          success: false,
          message: 'Order IDs are required'
        });
        return;
      }

      if (!totalAmount || totalAmount <= 0) {
        res.status(400).json({
          success: false,
          message: 'Valid total amount is required'
        });
        return;
      }

      // For now, return a mock UUID for testing
      // TODO: Implement proper PayFast OnSite API integration
      const mockUuid = `mock-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

      console.log('✅ Mock PayFast OnSite UUID generated:', mockUuid);

      res.json({
        success: true,
        data: {
          uuid: mockUuid,
          amount: totalAmount,
          orderIds: orderIds
        }
      });

    } catch (error: unknown) {
      console.error('❌ PayFast OnSite initialization error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to initialize PayFast OnSite payment',
        error: error instanceof Error ? (error instanceof Error ? error.message : String(error)) : 'Unknown error'
      });
    }
  };

  /**
   * Initialize PayFast payment for orders
   */
  initializePayFastPayment = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const user = req.user!;
      const { orderIds } = req.body;

      console.log('🚀 PayFast payment initialization requested');
      console.log('   User:', user.email);
      console.log('   Order IDs:', orderIds);

      if (!orderIds || !Array.isArray(orderIds) || orderIds.length === 0) {
        res.status(400).json({
          success: false,
          message: 'Order IDs are required'
        });
        return;
      }

      // Get orders from database
      const orderRepository = AppDataSource.getRepository(Order);
      const orders = await orderRepository.find({
        where: { id: In(orderIds) },
        relations: ['product', 'doctor']
      });

      if (orders.length === 0) {
        res.status(404).json({
          success: false,
          message: 'No orders found'
        });
        return;
      }

      // Verify all orders belong to the current user
      const invalidOrders = orders.filter(order => order.doctor_id !== user.id);
      if (invalidOrders.length > 0) {
        res.status(403).json({
          success: false,
          message: 'You can only pay for your own orders'
        });
        return;
      }

      // Calculate total amount - ensure we're using the correct order_total field
      console.log('📊 Calculating total amount for PayFast payment:');
      let totalAmount = 0;
      orders.forEach((order, index) => {
        // Use order.order_total (already calculated: price * qty) instead of recalculating
        const orderTotal = parseFloat(order.order_total?.toString() || '0');
        totalAmount += orderTotal;
        const productPrice = parseFloat(order.product?.price?.toString() || '0');
        const calculatedSubtotal = productPrice * order.qty;
        console.log(`   Order ${index + 1}: ${order.order_number}`);
        console.log(`      Product: ${order.product?.name || 'N/A'}`);
        console.log(`      Quantity: ${order.qty}`);
        console.log(`      Unit Price: ${productPrice}`);
        console.log(`      Calculated (price × qty): ${calculatedSubtotal}`);
        console.log(`      Stored order_total: ${orderTotal}`);
        console.log(`      ✅ Using stored order_total: ${orderTotal}`);
      });
      console.log(`   ✅ Grand Total (sum of all order_totals): ${totalAmount.toFixed(2)}`);
      
      // Double-check: also calculate from product prices to verify
      const verificationTotal = orders.reduce((sum, order) => {
        const productPrice = parseFloat(order.product?.price?.toString() || '0');
        return sum + (productPrice * order.qty);
      }, 0);
      console.log(`   🔍 Verification (sum of price × qty for all orders): ${verificationTotal.toFixed(2)}`);
      
      if (Math.abs(totalAmount - verificationTotal) > 0.01) {
        console.warn(`   ⚠️ WARNING: Total mismatch! Using stored total: ${totalAmount.toFixed(2)}, but calculated total: ${verificationTotal.toFixed(2)}`);
        // Use the verification total if there's a mismatch (more accurate)
        totalAmount = verificationTotal;
      }

      // Get frontend URL from request headers (for mobile support)
      // Check Origin header first, then Referer, then fall back to env var
      const origin = req.headers.origin || req.headers.referer;
      let frontendUrl: string | undefined;
      if (origin) {
        // Extract base URL from origin/referer (remove path)
        try {
          const url = new URL(origin);
          frontendUrl = `${url.protocol}//${url.host}`;
          console.log('🌐 Using frontend URL from request:', frontendUrl);
        } catch (e) {
          console.warn('⚠️ Failed to parse origin/referer URL, using default');
        }
      }

      // Create payment data for PayFast
      const paymentData = PayFastService.createPaymentFormData({
        orderIds: orderIds,
        totalAmount: totalAmount,
        customerName: user.doctor_name || user.email,
        customerEmail: user.email,
        customerPhone: user.whatsapp || '',
        items: orders.map(order => ({
          name: order.product?.name || 'Product',
          description: order.product?.description || 'Product description',
          quantity: order.qty,
          price: order.product?.price || 0
        })),
        frontendUrl: frontendUrl // Pass dynamic frontend URL
      });

      // Generate PayFast payment form
      const paymentForm = PayFastService.generatePaymentForm(paymentData);

      console.log('✅ PayFast payment form generated successfully');
      console.log('   Total Amount:', totalAmount);
      console.log('   Order Count:', orders.length);

      // NOTE: Gmail notifications are now sent via:
      // 1. PayFast ITN handler (handlePayFastNotification) - when payment is confirmed
      // 2. Frontend confirmation (confirmPaymentSuccess) - when user confirms payment
      // 
      // We removed immediate notifications here to prevent duplicates.
      // The idempotency check (payment_completed_at) ensures emails are only sent once.
      console.log('📧 Gmail notifications will be sent after payment confirmation (ITN or frontend)');

      res.json({
        success: true,
        message: 'PayFast payment initialized successfully',
        paymentUrl: PayFastService.getProcessUrl(),
        data: {
          paymentForm: paymentForm,
          processUrl: PayFastService.getProcessUrl(),
          isSandbox: PayFastService.isSandboxMode(),
          totalAmount: totalAmount,
          orderCount: orders.length,
          orderIds: orderIds
        }
      });

    } catch (error: unknown) {
      console.error('❌ Error initializing PayFast payment:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to initialize payment',
        error: error instanceof Error ? (error instanceof Error ? error.message : String(error)) : 'Unknown error'
      });
    }
  }

  /**
   * Handle PayFast notification (ITN - Instant Transaction Notification)
   * EXACT PHP IMPLEMENTATION from PayFast documentation
   */
  handlePayFastNotification = async (req: Request, res: Response) => {
    try {
      console.log('🔔 Received PayFast notification (ITN)');
      console.log('   Headers:', req.headers);
      console.log('   Body:', req.body);

      // Tell PayFast that this page is reachable by triggering a header 200
      res.status(200).setHeader('HTTP/1.0', '200 OK');
      res.flushHeaders();

      const notificationData = req.body;

      // Store the real ITN data for legal evidence
      await this.storeITNNotification(notificationData);

      // ENHANCED SECURITY IMPLEMENTATION - Comprehensive security checks
      console.log('🔍 Conducting PayFast enhanced security checks...');

      // Check 1: Verify the signature
      const check1 = PayFastService.verifyNotificationSignature(notificationData);
      console.log('   Check 1 - Signature:', check1 ? '✅ VALID' : '❌ INVALID');

      // Check 2: Validate PayFast IP
      const check2 = PayFastService.validatePayFastIP();
      console.log('   Check 2 - IP Validation:', check2 ? '✅ VALID' : '❌ INVALID');

      // Check 3: Validate payment data (we'll get expected amount from orders)
      // Extract order IDs from custom_str1 (comma-separated) or fallback to m_payment_id
      let orderIds: string[] = [];
      if (notificationData.custom_str1) {
        orderIds = notificationData.custom_str1.split(',').filter((id: string) => id.trim().length > 0);
        console.log('📋 Order IDs from custom_str1:', orderIds);
      } else if (notificationData.m_payment_id) {
        // Fallback: try to find orders by matching payment amount and customer email
        console.log('⚠️ custom_str1 not found, attempting to find orders by payment details');
        orderIds = [notificationData.m_payment_id];
      }
      
      console.log('📦 Extracted order IDs:', orderIds);
      let check3 = true;
      if (orderIds.length > 0) {
        const orderRepository = AppDataSource.getRepository(Order);
        const orders = await orderRepository.find({
          where: { id: In(orderIds) }
        });
        
        if (orders.length > 0) {
          const expectedAmount = orders.reduce((sum, order) => sum + (order.order_total || 0), 0);
          check3 = PayFastService.validatePaymentData(expectedAmount, notificationData);
        }
      }
      console.log('   Check 3 - Payment Data:', check3 ? '✅ VALID' : '❌ INVALID');

      // Check 4: Server confirmation with PayFast
      const check4 = await PayFastService.validateServerConfirmation(notificationData);
      console.log('   Check 4 - Server Confirmation:', check4 ? '✅ VALID' : '❌ INVALID');

      // Check 5: Security pattern validation
      const check5 = PayFastService.validateSecurityPatterns(notificationData);
      console.log('   Check 5 - Security Patterns:', check5 ? '✅ VALID' : '❌ INVALID');

      // Check 6: Merchant credentials validation
      const check6 = PayFastService.validateMerchantCredentials(notificationData);
      console.log('   Check 6 - Merchant Credentials:', check6 ? '✅ VALID' : '❌ INVALID');

      // All checks must pass
      if (check1 && check2 && check3 && check4 && check5 && check6) {
        console.log('✅ All PayFast security checks passed - Payment is successful');

        // Extract order information
        const paymentStatus = notificationData.payment_status;
        const transactionId = notificationData.pf_payment_id;
        const amount = parseFloat(notificationData.amount_gross || '0');
        const amountFee = parseFloat(notificationData.amount_fee || '0');
        const amountNet = parseFloat(notificationData.amount_net || '0');

        console.log('   Payment Details:');
        console.log('     Status:', paymentStatus);
        console.log('     Transaction ID:', transactionId);
        console.log('     Amount Gross:', amount);
        console.log('     Amount Fee:', amountFee);
        console.log('     Amount Net:', amountNet);

        // Update orders based on payment status
        if (paymentStatus === 'COMPLETE') {
          // Update payment status FIRST (this sets payment_completed_at)
          await this.updateOrdersPaymentStatus(orderIds, 'paid', transactionId, amount, amountFee, amountNet);
          console.log('✅ Orders marked as paid');
          
          // Send payment confirmation notifications to admins with ITN data
          // The idempotency check in sendPaymentConfirmationNotifications will prevent duplicates
          await this.sendPaymentConfirmationNotifications(orderIds, transactionId, amount, amountFee, amountNet, notificationData);
        } else if (paymentStatus === 'FAILED' || paymentStatus === 'CANCELLED') {
          await this.updateOrdersPaymentStatus(orderIds, 'failed', transactionId, amount, amountFee, amountNet);
          console.log('❌ Orders marked as failed');
        }

        // Send success response to PayFast
        res.send('OK');
      } else {
        console.error('❌ PayFast security checks failed - Payment verification failed');
        console.error('   Check 1 (Signature):', check1);
        console.error('   Check 2 (IP):', check2);
        console.error('   Check 3 (Payment Data):', check3);
        console.error('   Check 4 (Server Confirmation):', check4);
        
        // Log for investigation
        console.error('🔍 PayFast notification data for investigation:', notificationData);
        
        res.status(400).send('INVALID');
      }

    } catch (error: unknown) {
      console.error('❌ Error handling PayFast notification:', error);
      res.status(500).send('ERROR');
    }
  }

  /**
   * Update orders payment status with PayFast details
   */
  private async updateOrdersPaymentStatus(
    orderIds: string[], 
    status: 'paid' | 'failed', 
    transactionId: string, 
    amount: number,
    amountFee?: number,
    amountNet?: number
  ) {
    try {
      const orderRepository = AppDataSource.getRepository(Order);
      const doctorRepository = AppDataSource.getRepository(Doctor);
      
      // Track doctors that need tier updates
      const doctorsToUpdate = new Set<string>();
      
      // Get all orders first to calculate individual payment amounts
      const orders = await orderRepository.find({
        where: { id: In(orderIds) }
      });

      console.log(`📦 Found ${orders.length} orders to update out of ${orderIds.length} requested`);

      for (const order of orders) {
        // Use the order's own order_total as payment_amount (not the total amount from PayFast)
        // PayFast sends the total for all orders, but each order should be marked with its own total
        const orderPaymentAmount = Number(order.order_total) || 0;
        
        console.log(`   Processing order ${order.order_number}: order_total=${order.order_total}, payment_amount will be=${orderPaymentAmount}`);
        
        // Update order fields directly (using save() instead of update() for better reliability)
        order.payment_status = status;
        order.payment_transaction_id = transactionId;
        order.payment_amount = orderPaymentAmount; // Use order's own total, not the PayFast total
        if (status === 'paid') {
          order.payment_completed_at = new Date();
        }
        order.payment_method = 'payfast_online';

        // If payment is successful, also mark order as completed
        if (status === 'paid') {
          order.status = 'completed';
          order.completed_at = new Date();
        }

        // Add PayFast specific details if available (proportional to order amount)
        if (amountFee !== undefined && amount > 0) {
          // Calculate proportional fee for this order
          const orderProportion = orderPaymentAmount / amount;
          (order as any).payment_fee = amountFee * orderProportion;
        }
        if (amountNet !== undefined && amount > 0) {
          // Calculate proportional net for this order
          const orderProportion = orderPaymentAmount / amount;
          (order as any).payment_net = amountNet * orderProportion;
        }

        // Use save() instead of update() to ensure all changes are persisted
        await orderRepository.save(order);
        console.log(`   ✅ Saved order ${order.order_number}: payment_amount=${order.payment_amount}, payment_status=${order.payment_status}, status=${order.status}`);
        
        // If payment is successful, track doctor for tier update
        if (status === 'paid') {
          doctorsToUpdate.add(order.doctor_id);
        }
      }

      console.log(`✅ Updated ${orderIds.length} orders with status: ${status}`);
      console.log(`   Transaction ID: ${transactionId}`);
      console.log(`   Amount: ${amount}`);
      if (amountFee !== undefined) console.log(`   Fee: ${amountFee}`);
      if (amountNet !== undefined) console.log(`   Net: ${amountNet}`);
      
      // Update tier progression for all affected doctors
      if (status === 'paid' && doctorsToUpdate.size > 0) {
        console.log(`🔄 Updating tier progression for ${doctorsToUpdate.size} doctors`);
        for (const doctorId of doctorsToUpdate) {
          try {
            // Get all paid orders for this doctor (use payment_status = 'paid' to include all paid orders)
            const paidOrders = await orderRepository.find({
              where: {
                doctor_id: doctorId,
                payment_status: 'paid'
              }
            });

            // Calculate total amount received from all paid orders
            const totalReceived = paidOrders.reduce((sum, order) => {
              const amount = Number(order.payment_amount) || 0;
              console.log(`   Order ${order.order_number}: payment_amount=${order.payment_amount}, converted=${amount}`);
              return sum + amount;
            }, 0);

            console.log(`   Total received for doctor ${doctorId}: ${totalReceived} PKR`);

            // Update doctor's current_sales (only for doctors, not regular users or employees)
            const doctor = await doctorRepository.findOne({ where: { id: doctorId } });
            if (doctor && doctor.user_type === 'doctor') {
              // Update current_sales with total received amount
              doctor.current_sales = totalReceived;
              await doctorRepository.save(doctor);
              
              console.log(`   Updated doctor ${doctor.doctor_name} current_sales to ${totalReceived} PKR`);
              
              // Trigger full tier progression update (only for doctors)
              // This will recalculate tier, tier_progress, and all related fields
              await updateUserProfileAndRanking(doctorId, totalReceived);
              console.log(`✅ Updated tier progression for doctor ${doctor.doctor_name} (ID: ${doctorId})`);
            } else if (doctor) {
              console.log(`⏭️ Skipping tier update for ${doctor.user_type} user: ${doctor.doctor_name}`);
            } else {
              console.error(`❌ Doctor not found: ${doctorId}`);
            }
          } catch (error: unknown) {
            console.error(`❌ Error updating tier progression for doctor ${doctorId}:`, error);
            if (error instanceof Error) {
              console.error(`   Error message: ${error.message}`);
              console.error(`   Error stack: ${error.stack}`);
            }
          }
        }
      }
    } catch (error: unknown) {
      console.error('❌ Error updating orders payment status:', error);
      throw error;
    }
  }

  /**
   * Store ITN notification data for legal evidence
   */
  private async storeITNNotification(notificationData: any): Promise<void> {
    try {
      const itnRepository = AppDataSource.getRepository(PayFastITN);
      
      const itnRecord = itnRepository.create({
        ...(notificationData.m_payment_id && { m_payment_id: notificationData.m_payment_id }),
        pf_payment_id: notificationData.pf_payment_id,
        payment_status: notificationData.payment_status,
        item_name: notificationData.item_name,
        item_description: notificationData.item_description,
        amount_gross: notificationData.amount_gross ? parseFloat(notificationData.amount_gross) : null,
        amount_fee: notificationData.amount_fee ? parseFloat(notificationData.amount_fee) : null,
        amount_net: notificationData.amount_net ? parseFloat(notificationData.amount_net) : null,
        custom_str1: notificationData.custom_str1,
        custom_str2: notificationData.custom_str2,
        custom_str3: notificationData.custom_str3,
        custom_str4: notificationData.custom_str4,
        custom_str5: notificationData.custom_str5,
        custom_int1: notificationData.custom_int1 ? parseInt(notificationData.custom_int1) : null,
        custom_int2: notificationData.custom_int2 ? parseInt(notificationData.custom_int2) : null,
        custom_int3: notificationData.custom_int3 ? parseInt(notificationData.custom_int3) : null,
        custom_int4: notificationData.custom_int4 ? parseInt(notificationData.custom_int4) : null,
        custom_int5: notificationData.custom_int5 ? parseInt(notificationData.custom_int5) : null,
        name_first: notificationData.name_first,
        name_last: notificationData.name_last,
        email_address: notificationData.email_address,
        merchant_id: notificationData.merchant_id,
        token: notificationData.token,
        billing_date: notificationData.billing_date,
        signature: notificationData.signature,
        raw_payload: notificationData,
        status: 'received',
        processing_notes: 'ITN notification received from PayFast'
      });

      await itnRepository.save(itnRecord);
      console.log('✅ ITN notification stored for legal evidence:', notificationData.pf_payment_id);
    } catch (error: unknown) {
      console.error('❌ Error storing ITN notification:', error);
      // Don't throw error to avoid breaking the payment flow
    }
  }

  /**
   * Send payment confirmation notifications to admins
   * Same as Cash on Delivery - sends to all admins (Full Admins and Viewer Admins)
   */
  private async sendPaymentConfirmationNotifications(
    orderIds: string[],
    transactionId: string,
    amount: number,
    amountFee: number,
    amountNet: number,
    itnData?: any
  ) {
    try {
      const orderRepository = AppDataSource.getRepository(Order);
      const doctorRepository = AppDataSource.getRepository(Doctor);
      const itnRepository = AppDataSource.getRepository(PayFastITN);
      
      const orders = await orderRepository.find({
        where: { id: In(orderIds) },
        relations: ['doctor', 'product']
      });

      if (orders.length === 0) {
        console.error('❌ No orders found for PayFast payment notification!');
        console.error('   Order IDs requested:', orderIds);
        return;
      }

      console.log(`📦 Found ${orders.length} order(s) to send notifications for`);

      // Get all admin emails (main admin, secondary admin, and all admins from database)
      const adminEmails: string[] = [];
      
      // Add main and secondary admin emails from environment
      if (process.env.MAIN_ADMIN_EMAIL) {
        adminEmails.push(process.env.MAIN_ADMIN_EMAIL);
        console.log('✅ Added MAIN_ADMIN_EMAIL:', process.env.MAIN_ADMIN_EMAIL);
      }
      if (process.env.SECONDARY_ADMIN_EMAIL) {
        adminEmails.push(process.env.SECONDARY_ADMIN_EMAIL);
        console.log('✅ Added SECONDARY_ADMIN_EMAIL:', process.env.SECONDARY_ADMIN_EMAIL);
      }
      
      // Get all admins from database (including full admins and viewer admins)
      const allAdmins = await doctorRepository.find({
        where: { is_admin: true, is_deactivated: false }
      });
      
      console.log(`📋 Found ${allAdmins.length} admin(s) in database for PayFast payment notification`);
      
      // Add admin emails from database (both full admins and viewer admins)
      for (const admin of allAdmins) {
        if (admin.email && !adminEmails.includes(admin.email)) {
          adminEmails.push(admin.email);
          console.log('✅ Added admin email from database:', admin.email);
        }
      }
      
      console.log(`📬 Total admin emails to notify for PayFast payment: ${adminEmails.length}`);
      console.log('📧 Admin emails:', adminEmails);

      // Get the stored ITN data for this transaction
      const storedITNData = await itnRepository.findOne({
        where: { pf_payment_id: transactionId }
      });

      for (const orderId of orderIds) {
        // Reload order to get latest payment_status (after updateOrdersPaymentStatus)
        // Use a lock to prevent race conditions with frontend confirmation
        const order = await orderRepository.findOne({
          where: { id: orderId },
          relations: ['product', 'doctor']
        });

        if (!order) {
          console.error(`❌ Order ${orderId} not found for notification`);
          continue;
        }

        // STRICT IDEMPOTENCY CHECK: Only send if payment_completed_at is not set (first time)
        // This prevents duplicate emails if ITN is received multiple times
        // OR if frontend confirmation already sent the email
        if (order.payment_completed_at) {
          console.log(`⏭️ Skipping ITN notification for order ${order.order_number} - already sent (payment_completed_at: ${order.payment_completed_at})`);
          continue;
        }

        // Double-check: Reload with lock to ensure we have the latest state
        // This prevents race conditions where frontend confirmation might have just set payment_completed_at
        const freshOrder = await orderRepository.findOne({
          where: { id: orderId },
          relations: ['product', 'doctor']
        });

        if (!freshOrder) {
          console.error(`❌ Order ${orderId} not found after reload`);
          continue;
        }

        // Check again after reload (in case frontend confirmation set it in the meantime)
        if (freshOrder.payment_completed_at) {
          console.log(`⏭️ Skipping ITN notification for order ${freshOrder.order_number} - already sent by another process (payment_completed_at: ${freshOrder.payment_completed_at})`);
          continue;
        }

        // Send email notification with real ITN data
        const realITNData = storedITNData || itnData;
        
        if (adminEmails.length > 0) {
          console.log(`🚀 Sending PayFast ITN payment notification for order ${freshOrder.order_number} to ${adminEmails.length} admin(s)`);
          console.log(`   Payment Status: ${freshOrder.payment_status}`);
          console.log(`   Admin emails: ${adminEmails.join(', ')}`);
          // Set payment_completed_at BEFORE sending to prevent race conditions
          // This ensures only one notification is sent even if both ITN and frontend trigger simultaneously
          // IMPORTANT: Payment is marked as completed even if email fails - email is non-blocking
          freshOrder.payment_completed_at = new Date();
          await orderRepository.save(freshOrder);
          
          // Send email notification (non-blocking - payment processing continues even if email fails)
          gmailService.sendOrderPlacedAlert(freshOrder, 'payfast_online', realITNData, adminEmails)
            .then(() => {
              console.log(`✅ Gmail notification sent successfully for order ${freshOrder.order_number} (Status: ${freshOrder.payment_status})`);
            })
            .catch((err: unknown) => {
              console.error(`❌ Failed to send payment confirmation email for order ${freshOrder.order_number}:`, err);
              console.error('Error details:', err instanceof Error ? err.message : String(err));
              console.error('Error stack:', err instanceof Error ? err.stack : 'No stack trace');
              // Payment is still marked as completed - email failure does not affect order status
            });
        } else {
          console.warn('⚠️ No admin emails found! PayFast payment notifications will not be sent.');
        }
        
        // Send WhatsApp notification (non-blocking)
        whatsappService.sendOrderPlacedAlert(freshOrder, 'payfast_online').catch(err => 
          console.error('❌ Failed to send payment confirmation WhatsApp:', err)
        );
      }

      console.log('✅ Payment confirmation notifications sent for orders:', orderIds);
    } catch (error: unknown) {
      console.error('❌ Error sending payment confirmation notifications:', error);
    }
  }

  /**
   * Handle successful payment confirmation (called when user clicks OK after payment)
   */
  confirmPaymentSuccess = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const user = req.user!;
      const { orderIds, paymentMethod = 'payfast_online' } = req.body;

      console.log('🎉 Payment success confirmation received');
      console.log('   User:', user.email);
      console.log('   Order IDs:', orderIds);
      console.log('   Payment Method:', paymentMethod);

      if (!orderIds || !Array.isArray(orderIds) || orderIds.length === 0) {
        res.status(400).json({
          success: false,
          message: 'Order IDs are required'
        });
        return;
      }

      // Get orders from database - try by ID first, then by order_number if IDs are temporary
      const orderRepository = AppDataSource.getRepository(Order);
      let orders: Order[] = [];
      
      // Filter out temporary IDs (those that don't look like UUIDs)
      const validOrderIds = orderIds.filter(id => {
        // Check if it's a valid UUID format (8-4-4-4-12 hex characters)
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        return uuidRegex.test(id);
      });
      
      console.log(`📋 Order IDs provided: ${orderIds.length}`);
      console.log(`   Valid UUIDs: ${validOrderIds.length}`);
      console.log(`   Temporary IDs: ${orderIds.length - validOrderIds.length}`);
      
      // Try to find orders by valid UUIDs first
      if (validOrderIds.length > 0) {
        try {
          orders = await orderRepository.find({
            where: { id: In(validOrderIds) },
            relations: ['product', 'doctor']
          });
          console.log(`✅ Found ${orders.length} order(s) by ID`);
        } catch (error) {
          console.error('❌ Error finding orders by ID:', error);
        }
      }

      // If no orders found by ID (might be temporary IDs), try finding recent orders for this user
      // Check both pending AND paid orders (ITN might have already processed payment)
      if (orders.length === 0) {
        console.log('⚠️ No orders found by ID, trying to find recent orders for user...');
        console.log('   User ID:', user.id);
        console.log('   Order IDs provided:', orderIds);
        
        // Try to find orders that match the user and were recently created
        // Use QueryBuilder for flexible OR conditions
        const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
        const queryBuilder = orderRepository
          .createQueryBuilder('order')
          .leftJoinAndSelect('order.product', 'product')
          .leftJoinAndSelect('order.doctor', 'doctor')
          .where('order.doctor_id = :doctorId', { doctorId: user.id })
          .andWhere('order.created_at > :oneHourAgo', { oneHourAgo })
          .andWhere(
            '(order.payment_status = :pending OR order.payment_status = :paid)',
            { pending: 'pending', paid: 'paid' }
          )
          .andWhere(
            '(order.payment_method = :payfast OR order.payment_method IS NULL)',
            { payfast: 'payfast_online' }
          )
          .orderBy('order.created_at', 'DESC')
          .take(10);
        
        const recentOrders = await queryBuilder.getMany();
        
        console.log(`📦 Found ${recentOrders.length} recent order(s) for user (pending or paid, PayFast or no method)`);
        if (recentOrders.length > 0) {
          recentOrders.forEach(order => {
            console.log(`   - Order ${order.order_number}: status=${order.status}, payment_status=${order.payment_status}, payment_method=${order.payment_method || 'NULL'}`);
          });
        }
        
        orders = recentOrders;
      }

      if (orders.length === 0) {
        console.error('❌ No orders found for payment confirmation');
        console.error('   Order IDs provided:', orderIds);
        console.error('   User ID:', user.id);
        res.status(404).json({
          success: false,
          message: 'No orders found. Please ensure orders are created before payment confirmation.'
        });
        return;
      }

      console.log(`✅ Found ${orders.length} order(s) for payment confirmation:`);
      orders.forEach(order => {
        console.log(`   - Order ${order.order_number} (${order.id}): PKR ${order.order_total}`);
      });

      // Verify all orders belong to the current user
      const invalidOrders = orders.filter(order => order.doctor_id !== user.id);
      if (invalidOrders.length > 0) {
        res.status(403).json({
          success: false,
          message: 'You can only confirm payment for your own orders'
        });
        return;
      }

      // Get all admin emails (main admin, secondary admin, and all admins from database)
      const adminEmails: string[] = [];
      const doctorRepository = AppDataSource.getRepository(Doctor);
      
      // Add main and secondary admin emails from environment
      if (process.env.MAIN_ADMIN_EMAIL) {
        adminEmails.push(process.env.MAIN_ADMIN_EMAIL);
        console.log('✅ Added MAIN_ADMIN_EMAIL:', process.env.MAIN_ADMIN_EMAIL);
      }
      if (process.env.SECONDARY_ADMIN_EMAIL) {
        adminEmails.push(process.env.SECONDARY_ADMIN_EMAIL);
        console.log('✅ Added SECONDARY_ADMIN_EMAIL:', process.env.SECONDARY_ADMIN_EMAIL);
      }
      
      // Get all admins from database (including full admins and viewer admins)
      const allAdmins = await doctorRepository.find({
        where: { is_admin: true, is_deactivated: false }
      });
      
      console.log(`📋 Found ${allAdmins.length} admin(s) in database for payment confirmation`);
      
      // Add admin emails from database (both full admins and viewer admins)
      for (const admin of allAdmins) {
        if (admin.email && !adminEmails.includes(admin.email)) {
          adminEmails.push(admin.email);
          console.log('✅ Added admin email from database:', admin.email);
        }
      }
      
      console.log(`📬 Total admin emails to notify: ${adminEmails.length}`);
      console.log('📧 Admin emails:', adminEmails);

      // Send Gmail notifications to admins for each order (with idempotency check)
      // IMPORTANT: Only send if ITN hasn't already processed it
      // ITN is the authoritative source - if payment_status is 'paid', ITN already sent the email
      if (adminEmails.length > 0) {
        console.log(`📧 Checking if Gmail notifications needed for ${orders.length} order(s)...`);
        for (const order of orders) {
          // STRICT IDEMPOTENCY CHECK: Skip if EITHER condition is true:
          // 1. payment_completed_at is already set (email already sent)
          // 2. payment_status is 'paid' (ITN already processed it and sent email)
          if (order.payment_completed_at) {
            console.log(`⏭️ Skipping notification for order ${order.order_number} - already sent (payment_completed_at: ${order.payment_completed_at})`);
            continue;
          }

          // Reload order to get latest payment_status (in case ITN already updated it)
          const freshOrder = await orderRepository.findOne({
            where: { id: order.id },
            relations: ['product', 'doctor']
          });

          if (!freshOrder) {
            console.error(`❌ Order ${order.order_number} not found after reload`);
            continue;
          }

          // If payment_status is already 'paid', ITN likely already processed it
          // Skip sending to avoid duplicate emails
          if (freshOrder.payment_status === 'paid' && freshOrder.payment_method === 'payfast_online') {
            console.log(`⏭️ Skipping notification for order ${freshOrder.order_number} - ITN already processed (payment_status: 'paid', payment_method: 'payfast_online')`);
            // Mark as completed even if we didn't send (to prevent future attempts)
            if (!freshOrder.payment_completed_at) {
              freshOrder.payment_completed_at = new Date();
              await orderRepository.save(freshOrder);
            }
            continue;
          }

          try {
            // Update payment status to 'paid' if not already set (for frontend confirmation)
            // Also set payment_amount to order_total if not already set
            if (freshOrder.payment_status !== 'paid' && paymentMethod === 'payfast_online') {
              freshOrder.payment_status = 'paid';
              freshOrder.payment_method = 'payfast_online';
              // Set payment_amount to order_total if not already set
              if (!freshOrder.payment_amount || freshOrder.payment_amount === 0) {
                freshOrder.payment_amount = Number(freshOrder.order_total) || 0;
                console.log(`   Setting payment_amount to order_total: ${freshOrder.payment_amount}`);
              }
              // Mark order as completed
              if (freshOrder.status !== 'completed') {
                freshOrder.status = 'completed';
                freshOrder.completed_at = new Date();
              }
              await orderRepository.save(freshOrder);
              console.log(`✅ Updated order ${freshOrder.order_number}: payment_status='paid', payment_amount=${freshOrder.payment_amount}, status='completed'`);
              
              // Trigger tier update for this order
              try {
                await updateUserProfileAndRanking(freshOrder.doctor_id, Number(freshOrder.payment_amount));
                console.log(`✅ Updated tier progression for doctor ${freshOrder.doctor_id}`);
              } catch (tierError) {
                console.error(`❌ Error updating tier for doctor ${freshOrder.doctor_id}:`, tierError);
              }
            }

            console.log(`🚀 Sending payment confirmation notification for order ${freshOrder.order_number} to ${adminEmails.length} admin(s)`);
            console.log(`   Payment Status: ${freshOrder.payment_status}`);
            console.log(`   Admin emails: ${adminEmails.join(', ')}`);
            
            // Use await to ensure email is sent
            await gmailService.sendOrderPlacedAlert(freshOrder, paymentMethod, undefined, adminEmails);
            
            // Mark payment as completed to prevent duplicate sends (if not already set)
            if (!freshOrder.payment_completed_at) {
              freshOrder.payment_completed_at = new Date();
              await orderRepository.save(freshOrder);
            }
            
            console.log(`✅ Gmail notification sent successfully for order: ${freshOrder.order_number} (Status: ${freshOrder.payment_status})`);
          } catch (error: unknown) {
            console.error(`❌ Failed to send Gmail notification for order ${order.order_number}:`, error);
            console.error('Error details:', error instanceof Error ? error.message : String(error));
            console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace');
          }
        }
      } else {
        console.warn('⚠️ No admin emails found! Notifications will not be sent.');
      }

      res.json({
        success: true,
        message: 'Payment confirmed and admin notifications sent',
        data: {
          orderCount: orders.length,
          orderNumbers: orders.map(order => order.order_number)
        }
      });

    } catch (error: unknown) {
      console.error('❌ Error confirming payment success:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to confirm payment',
        error: error instanceof Error ? (error instanceof Error ? error.message : String(error)) : 'Unknown error'
      });
    }
  }

  /**
   * Get payment status for orders
   */
  getPaymentStatus = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const user = req.user!;
      const { orderIds } = req.query;

      console.log('📋 Payment status requested');
      console.log('   User:', user.email);
      console.log('   Order IDs:', orderIds);

      if (!orderIds) {
        res.status(400).json({
          success: false,
          message: 'Order IDs are required'
        });
        return;
      }

      const orderIdArray = Array.isArray(orderIds) ? orderIds : [orderIds];
      
      const orderRepository = AppDataSource.getRepository(Order);
      const orders = await orderRepository.find({
        where: { 
          id: In(orderIdArray),
          doctor_id: user.id
        },
        relations: ['product']
      });

      const paymentStatus = orders.map(order => ({
        orderId: order.id,
        orderNumber: order.order_number,
        status: order.payment_status || 'pending',
        amount: order.order_total,
        transactionId: order.payment_transaction_id,
        completedAt: order.payment_completed_at
      }));

      res.json({
        success: true,
        data: paymentStatus
      });

    } catch (error: unknown) {
      console.error('❌ Error getting payment status:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get payment status',
        error: error instanceof Error ? (error instanceof Error ? error.message : String(error)) : 'Unknown error'
      });
    }
  }

  /**
   * Create order and initialize payment
   */
  createOrderAndPay = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const user = req.user!;
      const { product_id, qty, order_location, notes } = req.body;

      console.log('🛒 Creating order and initializing payment');
      console.log('   User:', user.email);
      console.log('   Product ID:', product_id);
      console.log('   Quantity:', qty);

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

      // Get product details
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

      // Create order
      const orderRepository = AppDataSource.getRepository(Order);
      const order = orderRepository.create({
        order_number,
        doctor_id: user.id,
        product_id: product.id,
        qty,
        order_location: order_location,
        order_total,
        notes: notes || `Order placed by ${user.doctor_name} from ${user.clinic_name}. Delivery to: ${order_location.address}`,
        status: 'pending_payment',
        payment_status: 'pending'
      });

      const savedOrder = await orderRepository.save(order);

      console.log('✅ Order created successfully:', savedOrder.id);

      // Get frontend URL from request headers (for mobile support)
      const origin = req.headers.origin || req.headers.referer;
      let frontendUrl: string | undefined;
      if (origin) {
        try {
          const url = new URL(origin);
          frontendUrl = `${url.protocol}//${url.host}`;
          console.log('🌐 Using frontend URL from request:', frontendUrl);
        } catch (e) {
          console.warn('⚠️ Failed to parse origin/referer URL, using default');
        }
      }

      // Initialize PayFast payment for this order
      const paymentData = PayFastService.createPaymentFormData({
        orderIds: [savedOrder.id],
        totalAmount: order_total,
        customerName: user.doctor_name || user.email,
        customerEmail: user.email,
        customerPhone: user.whatsapp || '',
        items: [{
          name: product.name,
          description: product.description || 'Product description',
          quantity: qty,
          price: product.price || 0
        }],
        frontendUrl: frontendUrl // Pass dynamic frontend URL
      });

      const paymentForm = PayFastService.generatePaymentForm(paymentData);

      res.json({
        success: true,
        message: 'Order created and payment initialized successfully',
        data: {
          order: {
            id: savedOrder.id,
            orderNumber: savedOrder.order_number,
            total: savedOrder.order_total,
            status: savedOrder.status
          },
          payment: {
            paymentForm: paymentForm,
            processUrl: PayFastService.getProcessUrl(),
            isSandbox: PayFastService.isSandboxMode(),
            totalAmount: order_total
          }
        }
      });

    } catch (error: unknown) {
      console.error('❌ Error creating order and initializing payment:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to create order and initialize payment',
        error: error instanceof Error ? (error instanceof Error ? error.message : String(error)) : 'Unknown error'
      });
    }
  }
}

const paymentController = new PaymentController();
export default paymentController;
