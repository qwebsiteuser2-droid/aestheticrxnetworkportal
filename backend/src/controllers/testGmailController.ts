import { Request, Response } from 'express';
import gmailService from '../services/gmailService';

export const testGmailConnection = async (req: Request, res: Response): Promise<void> => {
  try {
    console.log('🧪 Testing Gmail connection...');
    
    // Test Gmail API configuration (primary method)
    const gmailApiClientId = process.env.GMAIL_API_CLIENT_ID;
    const gmailApiClientSecret = process.env.GMAIL_API_CLIENT_SECRET;
    const gmailApiRefreshToken = process.env.GMAIL_API_REFRESH_TOKEN;
    const gmailApiUserEmail = process.env.GMAIL_API_USER_EMAIL;
    
    // Test SMTP configuration (fallback)
    const gmailUser = process.env.GMAIL_USER;
    const gmailPassword = process.env.GMAIL_APP_PASSWORD;
    const mainAdminEmail = process.env.MAIN_ADMIN_EMAIL;
    const secondaryAdminEmail = process.env.SECONDARY_ADMIN_EMAIL;

    const hasGmailApi = !!(gmailApiClientId && gmailApiClientSecret && gmailApiRefreshToken && gmailApiUserEmail);
    const hasSmtp = !!(gmailUser && gmailPassword);

    console.log('📧 Gmail Configuration:');
    console.log('   === Gmail API (Primary) ===');
    console.log('   Client ID:', gmailApiClientId ? '✅ configured' : '❌ NOT SET');
    console.log('   Client Secret:', gmailApiClientSecret ? '✅ configured' : '❌ NOT SET');
    console.log('   Refresh Token:', gmailApiRefreshToken ? '✅ configured' : '❌ NOT SET');
    console.log('   User Email:', gmailApiUserEmail || '❌ NOT SET');
    console.log('   === SMTP (Fallback) ===');
    console.log('   Gmail User:', gmailUser || '❌ NOT SET');
    console.log('   Gmail Password:', gmailPassword ? '✅ configured' : '❌ NOT SET');
    console.log('   Main Admin Email:', mainAdminEmail);
    console.log('   Secondary Admin Email:', secondaryAdminEmail);

    if (!hasGmailApi && !hasSmtp) {
      res.status(400).json({
        success: false,
        message: 'No email service configured. Please set Gmail API or SMTP credentials.',
        details: {
          gmailApi: {
            configured: hasGmailApi,
            clientId: !!gmailApiClientId,
            clientSecret: !!gmailApiClientSecret,
            refreshToken: !!gmailApiRefreshToken,
            userEmail: !!gmailApiUserEmail
          },
          smtp: {
            configured: hasSmtp,
            gmailUser: !!gmailUser,
            gmailPassword: !!gmailPassword
          }
        }
      });
      return;
    }

    // Send test email
    const testHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">Gmail Test Email</h2>
        <p>This is a test email to verify Gmail SMTP configuration.</p>
        
        <div style="background-color: #f5f5f5; padding: 20px; border-radius: 5px; margin: 20px 0;">
          <h3 style="margin-top: 0;">Test Details</h3>
          <p><strong>Timestamp:</strong> ${new Date().toLocaleString()}</p>
          <p><strong>From:</strong> ${gmailUser}</p>
          <p><strong>To:</strong> ${mainAdminEmail}</p>
          <p><strong>Status:</strong> <span style="color: green;">✅ Gmail SMTP Working</span></p>
        </div>
        
        <p>If you receive this email, Gmail notifications are working correctly!</p>
        
        <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; color: #666; font-size: 12px;">
          <p>This is a test message from AestheticRxNetwork system.</p>
        </div>
      </div>
    `;

    const recipientEmail = mainAdminEmail || gmailApiUserEmail || gmailUser || '';
    
    await gmailService.sendEmail(
      recipientEmail,
      'Gmail Test - AestheticRxNetwork',
      testHtml
    );

    res.json({
      success: true,
      message: 'Gmail test email sent successfully',
      details: {
        method: hasGmailApi ? 'Gmail API' : 'SMTP',
        from: gmailApiUserEmail || gmailUser,
        to: recipientEmail,
        timestamp: new Date().toISOString(),
        configuration: {
          gmailApi: hasGmailApi,
          smtp: hasSmtp
        }
      }
    });

  } catch (error: unknown) {
    console.error('❌ Gmail test failed:', error);
    res.status(500).json({
      success: false,
      message: 'Gmail test failed',
      error: error instanceof Error ? (error instanceof Error ? error.message : String(error)) : 'Unknown error'
    });
  }
};

export const testOrderNotification = async (req: Request, res: Response) => {
  try {
    console.log('🧪 Testing order notification...');
    
    // Create a mock order for testing
    const mockOrder = {
      order_number: 'TEST-001',
      doctor: {
        doctor_name: 'Dr. Test User',
        clinic_name: 'Test Clinic',
        email: 'test@example.com'
      },
      product: {
        name: 'Test Product',
        description: 'This is a test product for Gmail notification',
        category: 'Test Category',
        price: 100
      },
      qty: 1,
      order_total: 100,
      order_location: {
        address: 'Test Address, Test City',
        lat: 29.3896,
        lng: 71.7051
      },
      notes: 'This is a test order notification',
      created_at: new Date(),
      payment_status: 'pending',
      payment_transaction_id: null
    };

    // Test both payment methods
    const paymentMethod = req.query.method as string || 'cash_on_delivery';
    
    await gmailService.sendOrderPlacedAlert(mockOrder as any, paymentMethod);

    res.json({
      success: true,
      message: `Order notification test sent successfully (${paymentMethod})`,
      details: {
        orderNumber: mockOrder.order_number,
        paymentMethod: paymentMethod,
        timestamp: new Date().toISOString()
      }
    });

  } catch (error: unknown) {
    console.error('❌ Order notification test failed:', error);
    res.status(500).json({
      success: false,
      message: 'Order notification test failed',
      error: error instanceof Error ? (error instanceof Error ? error.message : String(error)) : 'Unknown error'
    });
  }
};

export const testPaymentConfirmation = async (req: Request, res: Response) => {
  try {
    console.log('🧪 Testing payment confirmation with PDF attachments...');
    
    // Create a mock order for testing
    const mockOrder = {
      order_number: 'ORD-1759049187',
      doctor: {
        doctor_name: 'Dr. Full Administrator',
        clinic_name: 'Full Admin Clinic',
        email: 'asadkhanbloch4949@gmail.com',
        whatsapp: '+1234567890',
        id: '42000',
        created_at: new Date('2025-09-28')
      },
      product: {
        name: 'Stethoscope - Professional',
        description: 'High-quality stethoscope with excellent acoustic performance. Lightweight and durable.',
        category: 'Diagnostic Equipment',
        price: 125
      },
      qty: 1,
      order_total: 125,
      order_location: {
        address: 'Location from Google Maps',
        lat: 29.3896459,
        lng: 71.7051437
      },
      notes: 'Order placed via web interface. Delivery to: Location from Google Maps',
      created_at: new Date('2025-10-17T08:41:05'),
      payment_status: 'paid',
      payment_transaction_id: 'PF-TXN-123456789'
    };

    const paymentMethod = req.query.method as string || 'payfast_online';
    
    await gmailService.sendOrderPlacedAlert(mockOrder as any, paymentMethod);

    res.json({
      success: true,
      message: `Payment confirmation test with PDF attachments sent successfully (${paymentMethod})`,
      details: {
        orderNumber: mockOrder.order_number,
        paymentMethod: paymentMethod,
        paymentStatus: mockOrder.payment_status,
        transactionId: mockOrder.payment_transaction_id,
        attachments: [
          `PayFast_Integration_Report_${mockOrder.order_number}.pdf`,
          `Order_Summary_${mockOrder.order_number}.pdf`
        ],
        timestamp: new Date().toISOString()
      }
    });

  } catch (error: unknown) {
    console.error('❌ Payment confirmation test failed:', error);
    res.status(500).json({
      success: false,
      message: 'Payment confirmation test failed',
      error: error instanceof Error ? (error instanceof Error ? error.message : String(error)) : 'Unknown error'
    });
  }
};
