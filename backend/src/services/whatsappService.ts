import twilio from 'twilio';
import { Doctor } from '../models/Doctor';
import { Order } from '../models/Order';
import { ResearchPaper } from '../models/ResearchPaper';

const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID?.trim();
const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN?.trim();
const WHATSAPP_PHONE_NUMBER = process.env.WHATSAPP_PHONE_NUMBER?.trim();

/** Twilio Account SID must start with AC; otherwise the SDK throws at construct time. */
function isValidTwilioAccountSid(sid: string | undefined): sid is string {
  if (!sid) return false;
  return sid.startsWith('AC') && sid.length >= 34;
}

function createTwilioClient(): twilio.Twilio | null {
  if (!isValidTwilioAccountSid(TWILIO_ACCOUNT_SID) || !TWILIO_AUTH_TOKEN) {
    if (TWILIO_ACCOUNT_SID || process.env.TWILIO_AUTH_TOKEN) {
      console.warn(
        'WhatsApp/Twilio: TWILIO_ACCOUNT_SID must start with "AC" (real Twilio Account SID). ' +
          'Invalid or placeholder credentials — WhatsApp notifications disabled.'
      );
    }
    return null;
  }
  try {
    return twilio(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN);
  } catch (err) {
    console.warn('WhatsApp/Twilio: failed to initialize client:', err);
    return null;
  }
}

let twilioClient: twilio.Twilio | null = createTwilioClient();

class WhatsAppService {
  private isConfigured(): boolean {
    return !!(twilioClient && WHATSAPP_PHONE_NUMBER);
  }

  /**
   * Send new registration alert to admins
   */
  async sendNewRegistrationAlert(doctor: Doctor): Promise<void> {
    if (!this.isConfigured()) {
      console.log('WhatsApp not configured, skipping notification');
      return;
    }

    try {
      const mainAdminPhone = process.env.MAIN_ADMIN_PHONE;
      const secondaryAdminPhone = process.env.SECONDARY_ADMIN_PHONE;

      const message = `🏥 *New Doctor Registration*

*Clinic:* ${doctor.clinic_name}
*Doctor:* ${doctor.doctor_name}
*Email:* ${doctor.email}
*WhatsApp:* ${doctor.whatsapp || 'Not provided'}
*Signup ID:* ${doctor.signup_id}

Please review and approve in admin panel.

_AestheticRxNetwork System_`;

      const adminPhones = [mainAdminPhone, secondaryAdminPhone].filter(Boolean);
      
      for (const phone of adminPhones) {
        await twilioClient!.messages.create({
          from: `whatsapp:${WHATSAPP_PHONE_NUMBER}`,
          to: `whatsapp:${phone}`,
          body: message
        });
      }

      console.log('New registration alert sent via WhatsApp');
    } catch (error: unknown) {
      console.error('Failed to send new registration alert via WhatsApp:', error);
      throw error;
    }
  }

  /**
   * Send user approval notification
   */
  async sendUserApproved(doctor: Doctor): Promise<void> {
    if (!this.isConfigured() || !doctor.whatsapp) {
      console.log('WhatsApp not configured or doctor has no WhatsApp number');
      return;
    }

    try {
      const message = `🎉 *Account Approved!*

Dear Dr. ${doctor.doctor_name},

Your account has been approved! You can now access all features of AestheticRxNetwork.

*Account Details:*
• Clinic: ${doctor.clinic_name}
• Doctor ID: ${doctor.doctor_id}
• Approved: ${doctor.approved_at?.toLocaleDateString()}

You can now:
✅ Browse and order products
✅ View leaderboard
✅ Submit research papers
✅ Access all platform features

Welcome to AestheticRxNetwork!

_AestheticRxNetwork System_`;

      await twilioClient!.messages.create({
        from: `whatsapp:${WHATSAPP_PHONE_NUMBER}`,
        to: `whatsapp:${doctor.whatsapp}`,
        body: message
      });

      console.log(`User approval notification sent via WhatsApp to ${doctor.whatsapp}`);
    } catch (error: unknown) {
      console.error('Failed to send user approval notification via WhatsApp:', error);
      throw error;
    }
  }

  /**
   * Send order placed notification to admins
   */
  async sendOrderPlacedAlert(order: Order, paymentMethod: string = 'cash_on_delivery'): Promise<void> {
    if (!this.isConfigured()) {
      console.log('WhatsApp not configured, skipping notification');
      return;
    }

    try {
      const mainAdminPhone = process.env.MAIN_ADMIN_PHONE;
      const secondaryAdminPhone = process.env.SECONDARY_ADMIN_PHONE;

      // Format payment method for display
      const paymentMethodDisplay = paymentMethod === 'payfast_online' ? 
        'PayFast Online Payment' : 'Cash on Delivery';
      
      const paymentStatusDisplay = paymentMethod === 'payfast_online' ? 
        (order.payment_status === 'paid' ? '✅ PAID' : '⏳ PENDING') : '💰 CASH ON DELIVERY';

      const message = `📦 *New Order Placed*

*Order:* ${order.order_number}
*Clinic:* ${order.doctor?.clinic_name}
*Doctor:* ${order.doctor?.doctor_name}
*Product:* ${order.product?.name}
*Description:* ${order.product?.description || 'No description'}
*Category:* ${order.product?.category || 'General'}
*Quantity:* ${order.qty}
*Unit Price:* PKR ${order.product?.price || 0}
*Total:* PKR ${order.order_total}
*Payment Method:* ${paymentMethodDisplay}
*Payment Status:* ${paymentStatusDisplay}
*Location:* ${order.order_location.address}
*Coordinates:* ${order.order_location.lat}, ${order.order_location.lng}
*Order Date:* ${order.created_at.toLocaleDateString()}, ${order.created_at.toLocaleTimeString()}
*Notes:* ${order.notes || 'No additional notes'}

${paymentMethod === 'payfast_online' && order.payment_status === 'paid' ? 
  `✅ *Payment Confirmed:* This order has been paid online through PayFast. Transaction ID: ${order.payment_transaction_id || 'N/A'}` :
  paymentMethod === 'payfast_online' ? 
  '⏳ *Payment Pending:* This order is awaiting online payment through PayFast.' :
  '💰 *Cash on Delivery:* Payment will be collected upon delivery.'
}

Please review and process in admin panel.

_AestheticRxNetwork System_`;

      const adminPhones = [mainAdminPhone, secondaryAdminPhone].filter(Boolean);
      
      for (const phone of adminPhones) {
        await twilioClient!.messages.create({
          from: `whatsapp:${WHATSAPP_PHONE_NUMBER}`,
          to: `whatsapp:${phone}`,
          body: message
        });
      }

      console.log('Order placed alert sent via WhatsApp');
    } catch (error: unknown) {
      console.error('Failed to send order placed alert via WhatsApp:', error);
      throw error;
    }
  }

  /**
   * Send tier advancement notification
   */
  async sendTierUpNotification(doctor: Doctor, newTier: string): Promise<void> {
    if (!this.isConfigured() || !doctor.whatsapp) {
      console.log('WhatsApp not configured or doctor has no WhatsApp number');
      return;
    }

    try {
      const message = `🏆 *Tier Advancement!*

🎉 Congratulations Dr. ${doctor.doctor_name}!

*${doctor.clinic_name}* has advanced to the *${newTier}* tier!

*Achievement Details:*
• New Tier: ${newTier}
• Current Sales: $${doctor.current_sales.toLocaleString()}
• Achievement Date: ${new Date().toLocaleDateString()}

This is a significant milestone! Keep up the excellent work.

_AestheticRxNetwork System_`;

      await twilioClient!.messages.create({
        from: `whatsapp:${WHATSAPP_PHONE_NUMBER}`,
        to: `whatsapp:${doctor.whatsapp}`,
        body: message
      });

      console.log(`Tier up notification sent via WhatsApp to ${doctor.whatsapp}`);
    } catch (error: unknown) {
      console.error('Failed to send tier up notification via WhatsApp:', error);
      throw error;
    }
  }

  /**
   * Send research paper approval notification
   */
  async sendResearchApproved(doctor: Doctor, researchPaper: ResearchPaper): Promise<void> {
    if (!this.isConfigured() || !doctor.whatsapp) {
      console.log('WhatsApp not configured or doctor has no WhatsApp number');
      return;
    }

    try {
      const message = `📄 *Research Paper Approved*

Dear Dr. ${doctor.doctor_name},

Great news! Your research paper has been approved and is now public.

*Paper Details:*
• Title: ${researchPaper.title}
• Abstract: ${researchPaper.abstract.substring(0, 100)}...
• Approved: ${researchPaper.approved_at?.toLocaleDateString()}

Your research is now visible to all doctors and can receive upvotes and views.

_AestheticRxNetwork System_`;

      await twilioClient!.messages.create({
        from: `whatsapp:${WHATSAPP_PHONE_NUMBER}`,
        to: `whatsapp:${doctor.whatsapp}`,
        body: message
      });

      console.log(`Research approval notification sent via WhatsApp to ${doctor.whatsapp}`);
    } catch (error: unknown) {
      console.error('Failed to send research approval notification via WhatsApp:', error);
      throw error;
    }
  }

  /**
   * Send user rejection notification
   */
  async sendUserRejected(doctor: Doctor, reason: string): Promise<void> {
    if (!this.isConfigured() || !doctor.whatsapp) {
      console.log('WhatsApp not configured or doctor has no WhatsApp number');
      return;
    }

    try {
      const message = `❌ *Registration Review Update*

Dear Dr. ${doctor.doctor_name},

Thank you for your interest in joining AestheticRxNetwork. After careful review by our admin team, we are unable to approve your registration at this time.

*Admin Review Result:*
• Status: Not Approved
• Reason: ${reason}

*Need Help or Have Questions?*
If you believe this is an error or have additional information to provide, please contact our support team:

📱 WhatsApp: +92 325 1531780
📧 Email: support@aestheticrx1.com

We appreciate your understanding and look forward to potentially welcoming you to our platform in the future.

_AestheticRxNetwork System_`;

      await twilioClient!.messages.create({
        from: `whatsapp:${WHATSAPP_PHONE_NUMBER}`,
        to: `whatsapp:${doctor.whatsapp}`,
        body: message
      });

      console.log(`User rejection notification sent via WhatsApp to ${doctor.whatsapp}`);
    } catch (error: unknown) {
      console.error('Failed to send user rejection notification via WhatsApp:', error);
      throw error;
    }
  }

  /**
   * Send monthly report notification to admins
   */
  async sendMonthlyReport(reportData: any): Promise<void> {
    if (!this.isConfigured()) {
      console.log('WhatsApp not configured, skipping notification');
      return;
    }

    try {
      const mainAdminPhone = process.env.MAIN_ADMIN_PHONE;
      const secondaryAdminPhone = process.env.SECONDARY_ADMIN_PHONE;

      const message = `📊 *Monthly Report*

*${new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })} Summary:*

• Total Orders: ${reportData.totalOrders}
• Total Sales: $${reportData.totalSales.toLocaleString()}
• New Registrations: ${reportData.newRegistrations}
• Research Papers: ${reportData.researchSubmissions}

Detailed reports sent via email.

_AestheticRxNetwork System_`;

      const adminPhones = [mainAdminPhone, secondaryAdminPhone].filter(Boolean);
      
      for (const phone of adminPhones) {
        await twilioClient!.messages.create({
          from: `whatsapp:${WHATSAPP_PHONE_NUMBER}`,
          to: `whatsapp:${phone}`,
          body: message
        });
      }

      console.log('Monthly report sent via WhatsApp');
    } catch (error: unknown) {
      console.error('Failed to send monthly report via WhatsApp:', error);
      throw error;
    }
  }

  /**
   * Send custom message
   */
  async sendCustomMessage(phoneNumber: string, message: string): Promise<void> {
    if (!this.isConfigured()) {
      console.log('WhatsApp not configured, skipping message');
      return;
    }

    try {
      await twilioClient!.messages.create({
        from: `whatsapp:${WHATSAPP_PHONE_NUMBER}`,
        to: `whatsapp:${phoneNumber}`,
        body: message
      });

      console.log(`Custom message sent via WhatsApp to ${phoneNumber}`);
    } catch (error: unknown) {
      console.error('Failed to send custom message via WhatsApp:', error);
      throw error;
    }
  }

  /**
   * Send user removal notification via WhatsApp
   */
  async sendUserRemoved(doctor: Doctor): Promise<void> {
    if (!this.isConfigured() || !doctor.whatsapp) {
      console.log('WhatsApp not configured or no WhatsApp number provided, skipping notification');
      return;
    }

    try {
      const message = `❌ *Account Removed*

Dear Dr. ${doctor.doctor_name},

We regret to inform you that your account has been removed from our platform.

*Account Details:*
• Name: Dr. ${doctor.doctor_name}
• Clinic: ${doctor.clinic_name}
• Email: ${doctor.email}

If you believe this is an error or have any questions, please contact our support team.

Thank you for your understanding.

_AestheticRxNetwork System_`;

      await twilioClient!.messages.create({
        from: `whatsapp:${WHATSAPP_PHONE_NUMBER}`,
        to: `whatsapp:${doctor.whatsapp}`,
        body: message
      });

      console.log(`User removal notification sent via WhatsApp to ${doctor.whatsapp}`);
    } catch (error: unknown) {
      console.error('Failed to send user removal notification via WhatsApp:', error);
      throw error;
    }
  }
}

export const whatsappService = new WhatsAppService();
