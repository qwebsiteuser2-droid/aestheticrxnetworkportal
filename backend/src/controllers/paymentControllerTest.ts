import { Request, Response } from 'express';
import PayFastService from '../services/payfastService';

export class PaymentControllerTest {
  /**
   * Initialize PayFast payment for testing (no authentication required)
   */
  initializePayFastPayment = async (req: Request, res: Response): Promise<void> => {
    try {
      const { orderIds, totalAmount, customerName, customerEmail, customerPhone, items } = req.body;

      console.log('🚀 PayFast payment initialization requested (TEST MODE)');
      console.log('   Order IDs:', orderIds);
      console.log('   Total Amount:', totalAmount);
      console.log('   Customer:', customerName, customerEmail);

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

      // Create payment data for PayFast
      const paymentData = PayFastService.createPaymentFormData({
        orderIds: orderIds,
        totalAmount: totalAmount,
        customerName: customerName || 'Test Customer',
        customerEmail: customerEmail || 'test@example.com',
        customerPhone: customerPhone || '+27821234567',
        items: items || []
      });

      // Generate PayFast payment form
      const paymentForm = PayFastService.generatePaymentForm(paymentData);

      console.log('✅ PayFast payment form generated successfully');
      console.log('   Total Amount:', totalAmount);
      console.log('   Order Count:', orderIds.length);

      res.json({
        success: true,
        message: 'PayFast payment initialized successfully',
        paymentUrl: PayFastService.getProcessUrl(),
        data: {
          paymentForm: paymentForm,
          processUrl: PayFastService.getProcessUrl(),
          isSandbox: PayFastService.isSandboxMode(),
          totalAmount: totalAmount,
          orderCount: orderIds.length,
          orderIds: orderIds,
          paymentData: paymentData
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
   */
  handlePayFastNotification = async (req: Request, res: Response): Promise<void> => {
    try {
      console.log('🔔 Received PayFast notification (TEST MODE)');
      console.log('   Headers:', req.headers);
      console.log('   Body:', req.body);

      const notificationData = req.body;

      // Verify the signature
      const isValidSignature = PayFastService.verifyNotificationSignature(notificationData);
      
      if (!isValidSignature) {
        console.error('❌ Invalid PayFast notification signature');
        res.status(400).send('INVALID');
        return;
      }

      console.log('✅ PayFast notification signature verified');

      // Extract order information
      const orderIds = notificationData.custom_str1?.split(',') || [];
      const paymentStatus = notificationData.payment_status;
      const transactionId = notificationData.pf_payment_id;
      const amount = parseFloat(notificationData.amount_gross || '0');

      console.log('   Order IDs:', orderIds);
      console.log('   Payment Status:', paymentStatus);
      console.log('   Transaction ID:', transactionId);
      console.log('   Amount:', amount);

      // Log the payment result
      if (paymentStatus === 'COMPLETE') {
        console.log('✅ Payment completed successfully');
      } else if (paymentStatus === 'FAILED' || paymentStatus === 'CANCELLED') {
        console.log('❌ Payment failed or cancelled');
      }

      // Send success response to PayFast
      res.status(200).send('OK');

    } catch (error: unknown) {
      console.error('❌ Error handling PayFast notification:', error);
      res.status(500).send('ERROR');
    }
  }

  /**
   * Test PayFast service directly
   */
  testPayFastService = async (req: Request, res: Response) => {
    try {
      console.log('🧪 Testing PayFast service directly');

      // Create test payment data
      const testPaymentData = PayFastService.createPaymentFormData({
        orderIds: ['test-order-001'],
        totalAmount: 100.00,
        customerName: 'Test Customer',
        customerEmail: 'test@example.com',
        customerPhone: '+27821234567',
        items: [
          { name: 'Test Item', description: 'Test item description', quantity: 1, price: 100.00 }
        ]
      });

      // Generate signature
      const signature = PayFastService.generateSignature(testPaymentData);

      // Test notification verification
      const mockNotification = {
        ...testPaymentData,
        amount_gross: '100.00',
        payment_status: 'COMPLETE',
        pf_payment_id: '123456789',
        signature: signature
      };

      const isValid = PayFastService.verifyNotificationSignature(mockNotification);

      res.json({
        success: true,
        message: 'PayFast service test completed',
        data: {
          paymentData: testPaymentData,
          signature: signature,
          notificationVerification: isValid,
          processUrl: PayFastService.getProcessUrl(),
          isSandbox: PayFastService.isSandboxMode()
        }
      });

    } catch (error: unknown) {
      console.error('❌ Error testing PayFast service:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to test PayFast service',
        error: error instanceof Error ? (error instanceof Error ? error.message : String(error)) : 'Unknown error'
      });
    }
  }
}

const paymentControllerTest = new PaymentControllerTest();
export default paymentControllerTest;
