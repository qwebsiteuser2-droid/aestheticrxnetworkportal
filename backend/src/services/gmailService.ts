import { Doctor } from '../models/Doctor';
import { Order } from '../models/Order';
import { AdminPermission } from '../models/AdminPermission';
import { AppDataSource } from '../db/data-source';
import pdfService from './pdfService';
import { getUnsubscribeUrl } from '../controllers/unsubscribeController';
import { checkEmailQuotaBeforeSend, incrementEmailCount, getEmailQuotaStatus } from './emailQuotaService';
import { isValidEmail, filterValidEmails } from '../utils/emailValidator';
import { createEmailDeliveryRecord, updateEmailDeliveryStatus } from './emailTrackingService';
import { getFrontendUrl, getFrontendUrlWithPath } from '../config/urlConfig';
import gmailApiService from './gmailApiService';
import nodemailer, { Transporter } from 'nodemailer';

/**
 * Retry configuration for email sending
 */
interface RetryConfig {
  maxRetries: number;
  initialDelayMs: number;
  maxDelayMs: number;
  backoffMultiplier: number;
}

const EMAIL_RETRY_CONFIG: RetryConfig = {
  maxRetries: 3,
  initialDelayMs: 2000,   // 2 seconds initial delay (increased for slow connections)
  maxDelayMs: 15000,      // 15 seconds max delay
  backoffMultiplier: 2,   // Double the delay each retry
};

// Timeout for email sending (increased for slow internet connections)
const EMAIL_SEND_TIMEOUT_MS = 60000; // 60 seconds (was 30 seconds)

/**
 * Calculate delay for retry attempt using exponential backoff
 */
function calculateRetryDelay(attempt: number, config: RetryConfig): number {
  const delay = config.initialDelayMs * Math.pow(config.backoffMultiplier, attempt - 1);
  return Math.min(delay, config.maxDelayMs);
}

/**
 * Determine if an error is retryable
 * Some errors like invalid credentials shouldn't be retried
 */
function isRetryableError(error: any): boolean {
  const errorMessage = error?.message?.toLowerCase() || '';
  const errorCode = error?.code?.toLowerCase() || '';
  
  // Non-retryable errors
  const nonRetryablePatterns = [
    'invalid login',
    'invalid credentials',
    'authentication failed',
    'invalid_grant',
    'unauthorized',
    'invalid email',
    'address rejected',
    'mailbox not found',
    'user unknown',
    'no such user',
    'recipient rejected',
  ];
  
  for (const pattern of nonRetryablePatterns) {
    if (errorMessage.includes(pattern) || errorCode.includes(pattern)) {
      return false;
    }
  }
  
  // Retryable errors (network issues, temporary failures, timeouts)
  const retryablePatterns = [
    'timeout',
    'etimedout',
    'econnreset',
    'econnrefused',
    'enotfound',
    'network',
    'socket',
    'temporary',
    'try again',
    'service unavailable',
    'rate limit',
    'too many',
    'quota',
  ];
  
  for (const pattern of retryablePatterns) {
    if (errorMessage.includes(pattern) || errorCode.includes(pattern)) {
      return true;
    }
  }
  
  // Default: retry unknown errors (could be transient)
  return true;
}

/**
 * Execute a function with retry logic and exponential backoff
 */
async function withRetry<T>(
  operation: () => Promise<T>,
  operationName: string,
  config: RetryConfig = EMAIL_RETRY_CONFIG
): Promise<T> {
  let lastError: Error | null = null;
  
  for (let attempt = 1; attempt <= config.maxRetries + 1; attempt++) {
    try {
      return await operation();
    } catch (error: any) {
      lastError = error;
      
      // Check if we should retry
      if (attempt > config.maxRetries || !isRetryableError(error)) {
        console.error(`❌ ${operationName} failed after ${attempt} attempt(s):`, error?.message || error);
        throw error;
      }
      
      // Calculate delay and wait
      const delay = calculateRetryDelay(attempt, config);
      console.warn(`⚠️ ${operationName} attempt ${attempt} failed: ${error?.message || 'Unknown error'}`);
      console.log(`🔄 Retrying in ${delay}ms (attempt ${attempt + 1}/${config.maxRetries + 1})...`);
      
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  // Should never reach here, but TypeScript needs this
  throw lastError || new Error(`${operationName} failed after all retries`);
}

class GmailService {
  private smtpTransporter: Transporter | null = null;

  constructor() {
    const smtpUser = process.env.GMAIL_USER;
    const smtpPassword = process.env.GMAIL_APP_PASSWORD;
    if (smtpUser && smtpPassword) {
      this.smtpTransporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user: smtpUser,
          pass: smtpPassword,
        },
        connectionTimeout: EMAIL_SEND_TIMEOUT_MS,
        greetingTimeout: EMAIL_SEND_TIMEOUT_MS,
        socketTimeout: EMAIL_SEND_TIMEOUT_MS,
      });
      console.log('✅ Gmail SMTP fallback initialized');
    } else {
      console.log('⚠️ Gmail SMTP fallback not configured. Set GMAIL_USER and GMAIL_APP_PASSWORD.');
    }

    if (gmailApiService.isConfigured()) {
      console.log('✅ GmailService using Gmail API as primary transport');
    } else {
      console.log('⚠️ Gmail API not configured. SMTP fallback will be used when available.');
    }
  }

  private isConfigured(): boolean {
    return gmailApiService.isConfigured() || !!this.smtpTransporter;
  }

  private isSmtpConfigured(): boolean {
    return !!this.smtpTransporter;
  }

  private async sendEmailViaSmtp(
    to: string[],
    subject: string,
    htmlContent: string,
    fromEmail: string,
    options?: { isOTP?: boolean }
  ): Promise<void> {
    if (!this.smtpTransporter) {
      throw new Error('SMTP transport not configured. Set GMAIL_USER and GMAIL_APP_PASSWORD.');
    }

    await withRetry(
      async () => {
        await this.smtpTransporter!.sendMail({
          from: fromEmail,
          to: to.join(', '),
          subject,
          html: htmlContent,
          text: htmlContent.replace(/<[^>]*>/g, ''),
        });
      },
      `SMTP send to ${to.join(', ')}`,
      EMAIL_RETRY_CONFIG
    );

    console.log('✅ Email sent successfully via SMTP', {
      to: to.join(', '),
      isOTP: options?.isOTP,
    });
  }

  /**
   * Add unsubscribe footer to marketing emails
   * NOTE: Only marketing/promotional emails get unsubscribe links.
   * Transactional emails (order confirmations, tier updates, account notifications, etc.)
   * are always sent regardless of unsubscribe status and do NOT include unsubscribe links.
   */
  private addUnsubscribeFooter(htmlContent: string, userId: string, email: string, isMarketing: boolean = false): string {
    if (!isMarketing) {
      return htmlContent; // Don't add unsubscribe link to transactional emails
    }

    const unsubscribeUrl = getUnsubscribeUrl(userId, email);
    const unsubscribeFooter = `
      <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; color: #666; font-size: 12px; text-align: center;">
        <p style="margin: 10px 0;">You are receiving this email because you are a registered user of AestheticRxNetwork.</p>
        <p style="margin: 10px 0;">
          <a href="${unsubscribeUrl}" style="color: #666; text-decoration: underline;">Unsubscribe from marketing emails</a>
        </p>
        <p style="margin: 10px 0; color: #999;">This is an automated message from AestheticRxNetwork system.</p>
      </div>
    `;

    return htmlContent + unsubscribeFooter;
  }

  /**
   * Send email using Gmail SMTP
   * 
   * IMPORTANT: Unsubscribe status only affects marketing emails (isMarketing: true).
   * Transactional emails (order confirmations, tier updates, account notifications, etc.)
   * are ALWAYS sent regardless of unsubscribe status and do NOT include unsubscribe links.
   * 
   * @param to - Recipient email address(es)
   * @param subject - Email subject
   * @param htmlContent - Email HTML content
   * @param options - Optional parameters:
   *   - isMarketing: Set to true for marketing/promotional emails (respects unsubscribe, adds unsubscribe link)
   *   - userId: User ID for generating unsubscribe links (required if isMarketing is true)
   *   - isOTP: Set to true for OTP emails (sent immediately, no batching, bypasses quota check for critical security)
   *   - bypassQuota: Set to true to bypass quota check (use with caution, only for critical emails)
   *   - orderId: Order ID for tracking order-related emails
   *   - orderNumber: Order number for tracking order-related emails
   */
  async sendEmail(to: string | string[], subject: string, htmlContent: string, options?: { isMarketing?: boolean; userId?: string; isOTP?: boolean; bypassQuota?: boolean; orderId?: string; orderNumber?: string; fromEmail?: string }): Promise<void> {
    if (!this.isConfigured()) {
      console.error('❌ Gmail API not configured, skipping email', {
        gmailApiClientEmail: process.env.GMAIL_API_CLIENT_EMAIL ? 'Set' : 'Not Set',
        gmailApiPrivateKey: process.env.GMAIL_API_PRIVATE_KEY ? 'Set' : 'Not Set',
        gmailApiUserEmail: process.env.GMAIL_API_USER_EMAIL ? 'Set' : 'Not Set'
      });
      throw new Error('Gmail transporter not configured. Please check GMAIL_USER and GMAIL_APP_PASSWORD environment variables.');
    }

    // Validate email addresses before sending
    const emailArray = Array.isArray(to) ? to : [to];
    const validEmails = filterValidEmails(emailArray);
    
    if (validEmails.length === 0) {
      const invalidEmails = emailArray.filter(email => !isValidEmail(email));
      console.error(`❌ All email addresses are invalid: ${invalidEmails.join(', ')}`);
      throw new Error(`Invalid email address(es): ${invalidEmails.join(', ')}`);
    }

    // Log invalid emails if any
    const invalidEmails = emailArray.filter(email => !isValidEmail(email));
    if (invalidEmails.length > 0) {
      console.warn(`⚠️ Skipping ${invalidEmails.length} invalid email address(es): ${invalidEmails.join(', ')}`);
    }

    // Use only valid emails
    const recipients = Array.isArray(to) ? validEmails : validEmails[0];

    // Check email quota (OTP and critical emails can bypass)
    if (!options?.isOTP && !options?.bypassQuota) {
      const canSend = checkEmailQuotaBeforeSend();
      if (!canSend) {
        throw new Error('Gmail daily limit exceeded. Cannot send email.');
      }
    }

    // Create email delivery record before sending (for tracking)
    const recipientEmail = Array.isArray(recipients) ? recipients[0] : recipients;
    if (!recipientEmail) {
      throw new Error('No valid recipient email address');
    }
    
    // Determine email type: 'otp', 'marketing', 'campaign', 'transactional', or 'bulk'
    let emailType: 'otp' | 'marketing' | 'transactional' | 'campaign' | 'bulk' = 'transactional';
    if (options?.isOTP) {
      emailType = 'otp';
    } else if (options?.isMarketing) {
      emailType = 'marketing'; // Use 'marketing' instead of 'campaign' for general marketing emails
    }
    
    let emailDeliveryId: string | undefined;

    try {
      // Use orderNumber or orderId for campaign_id to track order conversions
      const campaignId = options?.orderNumber || options?.orderId || undefined;
      
      const emailDelivery = await createEmailDeliveryRecord(
        recipientEmail,
        subject,
        emailType,
        options?.userId,
        campaignId // Store order number/ID in campaign_id for tracking conversions
      );
      emailDeliveryId = emailDelivery.id;
      console.log(`📧 Created email delivery record: ${emailDeliveryId} for ${recipientEmail} (${emailType})${campaignId ? ` - Order: ${campaignId}` : ''}`);
    } catch (error) {
      console.error('❌ Failed to create email delivery record:', error);
      // Continue with sending even if tracking fails, but log the error
    }

    try {
      let finalHtmlContent = htmlContent;
      let emailHeaders: { [key: string]: string } = {};
      
      // Add unsubscribe footer and headers for marketing emails
      if (options?.isMarketing && options?.userId && typeof recipients === 'string') {
        finalHtmlContent = this.addUnsubscribeFooter(htmlContent, options.userId, recipients, true);
        
        // Add List-Unsubscribe headers for Gmail native unsubscribe button
        // This improves deliverability and enables one-click unsubscribe
        // RFC 2369 compliant: List-Unsubscribe header with both URL and mailto
        const unsubscribeUrl = getUnsubscribeUrl(options.userId, recipients);
        emailHeaders['List-Unsubscribe'] = `<${unsubscribeUrl}>, <mailto:${process.env.GMAIL_USER}?subject=Unsubscribe>`;
        
        // RFC 8058 compliant: List-Unsubscribe-Post for one-click unsubscribe
        // This enables Gmail's native "Unsubscribe" button
        emailHeaders['List-Unsubscribe-Post'] = 'List-Unsubscribe=One-Click';
      }

      const recipientList = Array.isArray(recipients) ? recipients : [recipients];
      const fromEmail = options?.fromEmail || process.env.GMAIL_API_USER_EMAIL || process.env.GMAIL_USER;

      const canUseGmailApi = gmailApiService.isConfigured();
      const canUseSmtp = this.isSmtpConfigured();
      const selectedTransport = canUseGmailApi ? 'gmail_api' : 'smtp';

      if (!canUseGmailApi && !canUseSmtp) {
        throw new Error('No email transport configured. Configure Gmail API or SMTP credentials.');
      }

      console.log('📧 Attempting to send email...', {
        transport: selectedTransport,
        from: fromEmail,
        to: recipientList.join(', '),
        subject: subject.substring(0, 50),
        isOTP: options?.isOTP
      });

      if (canUseGmailApi) {
        await gmailApiService.sendEmail(
          recipientList,
          subject,
          finalHtmlContent,
          fromEmail,
          undefined,
          Object.keys(emailHeaders).length > 0 ? emailHeaders : undefined
        );
        console.log('✅ Email sent successfully via Gmail API', {
          to: recipientList.join(', ')
        });
      } else {
        await this.sendEmailViaSmtp(recipientList, subject, finalHtmlContent, fromEmail, {
          isOTP: options?.isOTP,
        });
      }
      
      // Update email delivery status to 'sent' (then mark as 'delivered' after a short delay)
      if (emailDeliveryId) {
        try {
          await updateEmailDeliveryStatus(emailDeliveryId, 'sent');
          console.log(`✅ Email delivery record ${emailDeliveryId} updated to 'sent'`);
          
          // Mark as delivered after successful send (Gmail SMTP doesn't provide delivery confirmation)
          // In a production system, you might want to use webhooks or polling for actual delivery status
          setTimeout(async () => {
            try {
              await updateEmailDeliveryStatus(emailDeliveryId!, 'delivered');
              console.log(`✅ Email delivery record ${emailDeliveryId} updated to 'delivered'`);
            } catch (error) {
              console.error('Failed to update email delivery status to delivered:', error);
            }
          }, 1000); // 1 second delay to mark as delivered
        } catch (error) {
          console.error('❌ Failed to update email delivery status:', error);
        }
      }
      
      // Increment email count (only for non-OTP emails, OTP emails are tracked separately)
      if (!options?.isOTP) {
        const newCount = incrementEmailCount();
        const quotaStatus = getEmailQuotaStatus();
        
        // Log quota status if approaching limit
        if (quotaStatus.status === 'warning' || quotaStatus.status === 'critical') {
          console.warn(`📧 ${quotaStatus.message}`);
        }
      }
      
      console.log(`✅ Gmail email sent to: ${Array.isArray(recipients) ? recipients.join(', ') : recipients}${options?.isMarketing ? ' (with List-Unsubscribe headers)' : ''}${options?.isOTP ? ' (OTP - immediate)' : ''}`);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      const errorCode = (error as any)?.code;
      
      console.error('❌ Failed to send Gmail email:', errorMessage);
      
      // Update email delivery status to 'failed' if we have a record
      if (emailDeliveryId) {
        try {
          await updateEmailDeliveryStatus(emailDeliveryId, 'failed', errorMessage);
        } catch (updateError) {
          console.error('Failed to update email delivery status to failed:', updateError);
        }
      }
      
      throw error;
    }
  }

  /**
   * Send email with attachments using Gmail SMTP
   * @param to - Recipient email address(es)
   * @param subject - Email subject
   * @param htmlContent - HTML content of the email
   * @param attachments - Array of attachment objects
   * @param options - Optional email options including fromEmail
   */
  async sendEmailWithAttachments(
    to: string | string[], 
    subject: string, 
    htmlContent: string, 
    attachments: Array<{
      filename: string;
      content: Buffer;
      contentType: string;
    }>,
    options?: { isMarketing?: boolean; userId?: string; isOTP?: boolean; bypassQuota?: boolean; orderId?: string; orderNumber?: string; fromEmail?: string }
  ): Promise<void> {
    if (!this.isConfigured()) {
      console.log('❌ Gmail not configured, skipping email');
      return;
    }

    // Validate email addresses before sending
    const emailArray = Array.isArray(to) ? to : [to];
    const validEmails = filterValidEmails(emailArray);
    
    if (validEmails.length === 0) {
      const invalidEmails = emailArray.filter(email => !isValidEmail(email));
      console.error(`❌ All email addresses are invalid: ${invalidEmails.join(', ')}`);
      throw new Error(`Invalid email address(es): ${invalidEmails.join(', ')}`);
    }

    const recipients = Array.isArray(to) ? validEmails : validEmails[0];
    const recipientEmail = Array.isArray(recipients) ? recipients[0] : recipients;
    
    if (!recipientEmail) {
      throw new Error('No valid recipient email address');
    }

    // Determine email type
    let emailType: 'otp' | 'marketing' | 'transactional' | 'campaign' | 'bulk' = 'transactional';
    if (options?.isOTP) {
      emailType = 'otp';
    } else if (options?.isMarketing) {
      emailType = 'marketing';
    }
    
    let emailDeliveryId: string | undefined;

    // Create email delivery record before sending (for tracking)
    try {
      // Use orderNumber or orderId for campaign_id to track order conversions
      const campaignId = options?.orderNumber || options?.orderId || undefined;
      
      const emailDelivery = await createEmailDeliveryRecord(
        recipientEmail,
        subject,
        emailType,
        options?.userId,
        campaignId // Store order number/ID in campaign_id for tracking conversions
      );
      emailDeliveryId = emailDelivery.id;
      console.log(`📧 Created email delivery record: ${emailDeliveryId} for ${recipientEmail} (${emailType}) with attachments${campaignId ? ` - Order: ${campaignId}` : ''}`);
    } catch (error) {
      console.error('❌ Failed to create email delivery record:', error);
      // Continue with sending even if tracking fails
    }

    try {
      const recipientList = Array.isArray(recipients) ? recipients : [recipients];
      const fromEmail = options?.fromEmail || process.env.GMAIL_API_USER_EMAIL || process.env.GMAIL_USER;

      const canUseGmailApi = gmailApiService.isConfigured();
      const canUseSmtp = this.isSmtpConfigured();

      if (!canUseGmailApi && !canUseSmtp) {
        throw new Error('No email transport configured. Configure Gmail API or SMTP credentials.');
      }

      console.log('📧 Attempting to send email with attachments...', {
        transport: canUseGmailApi ? 'gmail_api' : 'smtp',
        from: fromEmail,
        to: recipientList.join(', '),
        subject: subject.substring(0, 50),
        attachments: attachments.length
      });

      if (canUseGmailApi) {
        const gmailAttachments = attachments.map(attachment => ({
          filename: attachment.filename,
          content: attachment.content,
          contentType: attachment.contentType
        }));

        await gmailApiService.sendEmail(
          recipientList,
          subject,
          htmlContent,
          fromEmail,
          gmailAttachments
        );
      } else {
        await withRetry(
          async () => {
            await this.smtpTransporter!.sendMail({
              from: fromEmail,
              to: recipientList.join(', '),
              subject,
              html: htmlContent,
              text: htmlContent.replace(/<[^>]*>/g, ''),
              attachments: attachments.map(attachment => ({
                filename: attachment.filename,
                content: attachment.content,
                contentType: attachment.contentType
              }))
            });
          },
          `SMTP attachment send to ${recipientList.join(', ')}`,
          EMAIL_RETRY_CONFIG
        );
      }
      
      // Update email delivery status to 'sent' and then 'delivered'
      if (emailDeliveryId) {
        try {
          await updateEmailDeliveryStatus(emailDeliveryId, 'sent');
          console.log(`✅ Email delivery record ${emailDeliveryId} updated to 'sent'`);
          
          setTimeout(async () => {
            try {
              await updateEmailDeliveryStatus(emailDeliveryId!, 'delivered');
              console.log(`✅ Email delivery record ${emailDeliveryId} updated to 'delivered'`);
            } catch (error) {
              console.error('Failed to update email delivery status to delivered:', error);
            }
          }, 1000);
        } catch (error) {
          console.error('❌ Failed to update email delivery status:', error);
        }
      }
      
      console.log(`✅ Gmail email with ${attachments.length} attachments sent to: ${Array.isArray(recipients) ? recipients.join(', ') : recipients}`);
    } catch (error: unknown) {
      console.error('❌ Failed to send Gmail email with attachments:', error);
      
      // Update email delivery status to 'failed' if we have a record
      if (emailDeliveryId) {
        try {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          await updateEmailDeliveryStatus(emailDeliveryId, 'failed', errorMessage);
        } catch (updateError) {
          console.error('Failed to update email delivery status to failed:', updateError);
        }
      }
      
      throw error;
    }
  }

  /**
   * Send new registration alert to admins
   */
  async sendNewRegistrationAlert(doctor: Doctor): Promise<void> {
    if (!this.isConfigured()) {
      console.log('Gmail not configured, skipping registration alert');
      return;
    }

    try {
      const mainAdminEmail = process.env.MAIN_ADMIN_EMAIL;
      const secondaryAdminEmail = process.env.SECONDARY_ADMIN_EMAIL;

      const htmlContent = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">New Doctor Registration</h2>
          <p>A new doctor has registered and requires approval:</p>
          
          <div style="background-color: #f5f5f5; padding: 20px; border-radius: 5px; margin: 20px 0;">
            <h3 style="margin-top: 0;">Doctor Details</h3>
            <p><strong>Name:</strong> ${doctor.doctor_name}</p>
            <p><strong>Clinic:</strong> ${doctor.clinic_name}</p>
            <p><strong>Email:</strong> ${doctor.email}</p>
            <p><strong>Phone:</strong> ${doctor.whatsapp || 'Not provided'}</p>
            <p><strong>WhatsApp:</strong> ${doctor.whatsapp}</p>
            <p><strong>Registration Date:</strong> ${doctor.created_at.toLocaleDateString()}</p>
          </div>
          
          <p>Please review and approve this registration in the admin panel.</p>
          
          <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; color: #666; font-size: 12px;">
            <p>This is an automated message from AestheticRxNetwork system.</p>
          </div>
        </div>
      `;

      await this.sendEmail(
        [mainAdminEmail, secondaryAdminEmail].filter((email): email is string => Boolean(email)),
        `New Doctor Registration - ${doctor.doctor_name}`,
        htmlContent,
        { isMarketing: false } // Transactional email to admins
      );
    } catch (error: unknown) {
      console.error('Failed to send new registration alert:', error);
      throw error;
    }
  }

  /**
   * Send user approval notification
   */
  async sendUserApproved(doctor: Doctor): Promise<void> {
    if (!this.isConfigured()) {
      console.log('Gmail not configured, skipping approval notification');
      return;
    }

    try {
      const htmlContent = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #28a745;">Registration Approved!</h2>
          <p>Dear Dr. ${doctor.doctor_name},</p>
          
          <p>Great news! Your registration has been approved and you can now access the AestheticRxNetwork platform.</p>
          
          <div style="background-color: #d4edda; padding: 20px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #28a745;">
            <h3 style="margin-top: 0; color: #155724;">Account Details</h3>
            <p><strong>Name:</strong> ${doctor.doctor_name}</p>
            <p><strong>Clinic:</strong> ${doctor.clinic_name}</p>
            <p><strong>Email:</strong> ${doctor.email}</p>
            <p><strong>Status:</strong> <span style="color: #28a745; font-weight: bold;">ACTIVE</span></p>
          </div>
          
          <p>You can now log in to your account and start using our services.</p>
          
          <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; color: #666; font-size: 12px;">
            <p>This is an automated message from AestheticRxNetwork system.</p>
          </div>
        </div>
      `;

      await this.sendEmail(
        doctor.email,
        'Registration Approved - AestheticRxNetwork',
        htmlContent,
        { isMarketing: false, userId: doctor.id } // Transactional email to user
      );
    } catch (error: unknown) {
      console.error('Failed to send user approval notification:', error);
      throw error;
    }
  }

  /**
   * Send order placed notification to admins
   */
  async sendOrderPlacedAlert(order: Order, paymentMethod: string = 'cash_on_delivery', itnData?: any, adminEmails?: string[]): Promise<void> {
    console.log(`📧 sendOrderPlacedAlert called for order ${order.order_number}, paymentMethod: ${paymentMethod}`);
    
    if (!this.isConfigured()) {
      console.log('❌ Gmail API not configured, skipping order notification');
      console.log('   Gmail API Client Email:', process.env.GMAIL_API_CLIENT_EMAIL ? 'Set' : 'Not set');
      console.log('   Gmail API Private Key:', process.env.GMAIL_API_PRIVATE_KEY ? 'Set' : 'Not set');
      console.log('   Gmail API User Email:', process.env.GMAIL_API_USER_EMAIL ? 'Set' : 'Not set');
      return;
    }

    try {
      // Get all admin emails from database (parent admins and child admins)
      const adminEmailsList: string[] = [];
      
      // Get parent admins (is_admin = true, no permission record)
      const doctorRepository = AppDataSource.getRepository(Doctor);
      const parentAdmins = await doctorRepository.find({
        where: { is_admin: true, is_approved: true },
        select: ['email', 'id']
      });
      
      // Get child admins (has active AdminPermission record)
      const permissionRepository = AppDataSource.getRepository(AdminPermission);
      let activePermissions: AdminPermission[] = [];
      try {
        activePermissions = await permissionRepository.find({
          where: { is_active: true },
          relations: ['doctor']
        });
        console.log(`   Found ${activePermissions.length} active admin permissions`);
      } catch (error) {
        console.error('❌ Error fetching admin permissions:', error);
      }
      
      // Get all child admin IDs to avoid duplicates
      const childAdminIds = new Set(activePermissions.map(p => p.doctor_id));
      
      // Add parent admin emails (those with is_admin=true but no permission record)
      for (const admin of parentAdmins) {
        // Check if this admin has a permission record (if yes, they're child admin, skip to avoid duplicate)
        if (!childAdminIds.has(admin.id) && admin.email) {
          adminEmailsList.push(admin.email);
          console.log(`   ✅ Added parent admin: ${admin.email}`);
        }
      }
      
      // Add child admin emails (Full Admin, Custom Admin, Viewer Admin - all should receive notifications)
      for (const permission of activePermissions) {
        if (permission.doctor && permission.doctor.email && permission.doctor.is_approved) {
          // Only add if not already in list (avoid duplicates)
          if (!adminEmailsList.includes(permission.doctor.email)) {
            adminEmailsList.push(permission.doctor.email);
            console.log(`   ✅ Added child admin: ${permission.doctor.email} (${permission.permission_type})`);
          }
        } else {
          console.log(`   ⚠️ Skipping permission for doctor_id ${permission.doctor_id}:`, {
            hasDoctor: !!permission.doctor,
            hasEmail: !!permission.doctor?.email,
            isApproved: permission.doctor?.is_approved
          });
        }
      }
      
      // Fallback to environment variables if no admins found in database
      const mainAdminEmail = process.env.MAIN_ADMIN_EMAIL;
      const secondaryAdminEmail = process.env.SECONDARY_ADMIN_EMAIL;
      
      if (adminEmailsList.length === 0) {
        console.warn('⚠️ No admin emails found in database, falling back to environment variables');
        if (mainAdminEmail) {
          adminEmailsList.push(mainAdminEmail);
        }
        if (secondaryAdminEmail && !adminEmailsList.includes(secondaryAdminEmail)) {
          adminEmailsList.push(secondaryAdminEmail);
        }
      } else {
        // Also add environment variable emails if not already in list
        if (mainAdminEmail && !adminEmailsList.includes(mainAdminEmail)) {
          adminEmailsList.push(mainAdminEmail);
        }
        if (secondaryAdminEmail && !adminEmailsList.includes(secondaryAdminEmail)) {
          adminEmailsList.push(secondaryAdminEmail);
        }
      }
      
      console.log(`📧 Preparing to send order notification to admins:`, {
        totalAdmins: adminEmailsList.length,
        adminEmails: adminEmailsList,
        parentAdminsCount: parentAdmins.length,
        childAdminsCount: activePermissions.length,
        customAdminEmails: adminEmails?.length || 0
      });

      // Format payment method for display
      const paymentMethodDisplay = paymentMethod === 'payfast_online' ? 
        'PayFast Online Payment' : 'Cash on Delivery';
      
      const paymentStatusDisplay = paymentMethod === 'payfast_online' ? 
        (order.payment_status === 'paid' ? '✅ PAID' : '⏳ PENDING') : '💰 CASH ON DELIVERY';

      // Safely format dates (handle both Date objects and string dates)
      const formatDate = (date: any): string => {
        if (!date) return 'N/A';
        try {
          const d = date instanceof Date ? date : new Date(date);
          return d.toLocaleDateString() + ', ' + d.toLocaleTimeString();
        } catch {
          return String(date);
        }
      };

      const orderDate = formatDate(order.created_at);
      const memberSince = order.doctor?.created_at ? formatDate(order.doctor.created_at) : 'N/A';

      // Safely get order location
      const orderLocation = order.order_location || { address: 'Not specified', lat: 0, lng: 0 };
      const deliveryAddress = orderLocation.address || 'Not specified';
      const coordinates = `${orderLocation.lat || 0}, ${orderLocation.lng || 0}`;

      // Get customer statistics (mock data for now - you can implement this from database)
      const customerStats = {
        totalOrders: 64, // This should come from database
        totalSpent: 3273381.52, // This should come from database
        currentTier: 'Elite Lead', // This should come from database
        tierProgress: 100.00 // This should come from database
      };

      // Get system statistics (mock data for now - you can implement this from database)
      const systemStats = {
        totalOrders: 171, // This should come from database
        totalDoctors: 14, // This should come from database
        pendingOrders: 21, // This should come from database
        completedOrders: 150, // This should come from database
        systemUptime: 0 // This should come from database
      };

      // Log order details for debugging
      console.log('📧 Order details for email:', {
        orderNumber: order.order_number,
        productName: order.product?.name,
        doctorName: order.doctor?.doctor_name,
        orderTotal: order.order_total,
        paymentStatus: order.payment_status,
        hasProduct: !!order.product,
        hasDoctor: !!order.doctor
      });

      const htmlContent = `
        <div style="font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; background-color: #ffffff;">
          <!-- Header Banner -->
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; color: white; border-radius: 10px 10px 0 0;">
            <div style="font-size: 24px; margin-bottom: 10px;">📦 New Order Received</div>
            <div style="font-size: 18px; font-weight: bold;">Order #${order.order_number || 'N/A'}</div>
            <div style="font-size: 14px; margin-top: 10px; opacity: 0.9;">${orderDate}</div>
          </div>

          <!-- Main Content -->
          <div style="padding: 30px; background-color: #ffffff;">
            
            <!-- Order Details Section -->
            <div style="background-color: #f8f9fa; padding: 25px; border-radius: 10px; margin-bottom: 25px; border-left: 5px solid #007bff;">
              <h3 style="margin-top: 0; color: #333; font-size: 18px;">📋 Order Details</h3>
              <table style="width: 100%; border-collapse: collapse;">
                <tr><td style="padding: 8px 0; font-weight: bold; width: 30%;">Order Number:</td><td style="padding: 8px 0;">${order.order_number || 'N/A'}</td></tr>
                <tr><td style="padding: 8px 0; font-weight: bold;">Product:</td><td style="padding: 8px 0;">${order.product?.name || 'Product not loaded'}</td></tr>
                <tr><td style="padding: 8px 0; font-weight: bold;">Description:</td><td style="padding: 8px 0;">${order.product?.description || 'No description available'}</td></tr>
                <tr><td style="padding: 8px 0; font-weight: bold;">Category:</td><td style="padding: 8px 0;">${order.product?.category || 'General'}</td></tr>
                <tr><td style="padding: 8px 0; font-weight: bold;">Quantity:</td><td style="padding: 8px 0;">${order.qty || 1}</td></tr>
                <tr><td style="padding: 8px 0; font-weight: bold;">Unit Price:</td><td style="padding: 8px 0;">PKR ${order.product?.price || 0}</td></tr>
                <tr><td style="padding: 8px 0; font-weight: bold;">Total Amount:</td><td style="padding: 8px 0; color: #28a745; font-weight: bold; font-size: 16px;">PKR ${order.order_total || 0}</td></tr>
                <tr><td style="padding: 8px 0; font-weight: bold;">Payment Method:</td><td style="padding: 8px 0; color: #007bff; font-weight: bold;">${paymentMethodDisplay}</td></tr>
                <tr><td style="padding: 8px 0; font-weight: bold;">Payment Status:</td><td style="padding: 8px 0; color: ${paymentMethod === 'payfast_online' && order.payment_status === 'paid' ? '#28a745' : paymentMethod === 'payfast_online' ? '#ffc107' : '#17a2b8'}; font-weight: bold;">${paymentStatusDisplay}</td></tr>
                <tr><td style="padding: 8px 0; font-weight: bold;">Status:</td><td style="padding: 8px 0; background-color: #fff3cd; color: #856404; padding: 4px 8px; border-radius: 4px; font-weight: bold;">${order.status || 'PENDING'}</td></tr>
                <tr><td style="padding: 8px 0; font-weight: bold;">Order Date:</td><td style="padding: 8px 0;">${orderDate}</td></tr>
                <tr><td style="padding: 8px 0; font-weight: bold;">Notes:</td><td style="padding: 8px 0;">${order.notes || 'No additional notes'}</td></tr>
              </table>
            </div>

            <!-- Customer Information Section -->
            <div style="background-color: #e3f2fd; padding: 25px; border-radius: 10px; margin-bottom: 25px; border-left: 5px solid #2196f3;">
              <h3 style="margin-top: 0; color: #333; font-size: 18px;">👨‍⚕️ Customer Information</h3>
              <table style="width: 100%; border-collapse: collapse;">
                <tr><td style="padding: 8px 0; font-weight: bold; width: 30%;">Doctor Name:</td><td style="padding: 8px 0;">${order.doctor?.doctor_name || 'Customer not loaded'}</td></tr>
                <tr><td style="padding: 8px 0; font-weight: bold;">Clinic Name:</td><td style="padding: 8px 0;">${order.doctor?.clinic_name || 'N/A'}</td></tr>
                <tr><td style="padding: 8px 0; font-weight: bold;">Email:</td><td style="padding: 8px 0;">${order.doctor?.email || 'N/A'}</td></tr>
                <tr><td style="padding: 8px 0; font-weight: bold;">WhatsApp:</td><td style="padding: 8px 0;">${order.doctor?.whatsapp || 'N/A'}</td></tr>
                <tr><td style="padding: 8px 0; font-weight: bold;">Doctor ID:</td><td style="padding: 8px 0;">${order.doctor?.id || 'N/A'}</td></tr>
                <tr><td style="padding: 8px 0; font-weight: bold;">Member Since:</td><td style="padding: 8px 0;">${memberSince}</td></tr>
              </table>
            </div>

            <!-- Customer Statistics Section -->
            <div style="background-color: #f3e5f5; padding: 25px; border-radius: 10px; margin-bottom: 25px; border-left: 5px solid #9c27b0;">
              <h3 style="margin-top: 0; color: #333; font-size: 18px;">📊 Customer Statistics</h3>
              <table style="width: 100%; border-collapse: collapse;">
                <tr><td style="padding: 8px 0; font-weight: bold; width: 30%;">Total Orders:</td><td style="padding: 8px 0;">${customerStats.totalOrders}</td></tr>
                <tr><td style="padding: 8px 0; font-weight: bold;">Total Spent:</td><td style="padding: 8px 0; color: #28a745; font-weight: bold;">PKR ${customerStats.totalSpent.toLocaleString()}</td></tr>
                <tr><td style="padding: 8px 0; font-weight: bold;">Current Tier:</td><td style="padding: 8px 0; background-color: #007bff; color: white; padding: 4px 8px; border-radius: 4px; font-weight: bold;">${customerStats.currentTier}</td></tr>
                <tr><td style="padding: 8px 0; font-weight: bold;">Tier Progress:</td><td style="padding: 8px 0;">${customerStats.tierProgress}%</td></tr>
                <tr><td style="padding: 8px 0; font-weight: bold;">Last Order:</td><td style="padding: 8px 0;">${orderDate}</td></tr>
              </table>
            </div>

            <!-- Delivery Information Section -->
            <div style="background-color: #fff3cd; padding: 25px; border-radius: 10px; margin-bottom: 25px; border-left: 5px solid #ffc107;">
              <h3 style="margin-top: 0; color: #333; font-size: 18px;">📍 Delivery Information</h3>
              <table style="width: 100%; border-collapse: collapse;">
                <tr><td style="padding: 8px 0; font-weight: bold; width: 30%;">Delivery Address:</td><td style="padding: 8px 0;">${deliveryAddress}</td></tr>
                <tr><td style="padding: 8px 0; font-weight: bold;">Coordinates:</td><td style="padding: 8px 0;">${coordinates}</td></tr>
                <tr><td style="padding: 8px 0; font-weight: bold;">Google Maps:</td><td style="padding: 8px 0;"><a href="https://maps.google.com/?q=${orderLocation.lat || 0},${orderLocation.lng || 0}" style="color: #007bff; text-decoration: none;">View on Google Maps</a></td></tr>
              </table>
            </div>

            <!-- System Information Section -->
            <div style="background-color: #d4edda; padding: 25px; border-radius: 10px; margin-bottom: 25px; border-left: 5px solid #28a745;">
              <h3 style="margin-top: 0; color: #333; font-size: 18px;">📈 System Information</h3>
              <table style="width: 100%; border-collapse: collapse;">
                <tr><td style="padding: 8px 0; font-weight: bold; width: 30%;">Total Orders:</td><td style="padding: 8px 0;">${systemStats.totalOrders}</td></tr>
                <tr><td style="padding: 8px 0; font-weight: bold;">Total Doctors:</td><td style="padding: 8px 0;">${systemStats.totalDoctors}</td></tr>
                <tr><td style="padding: 8px 0; font-weight: bold;">Pending Orders:</td><td style="padding: 8px 0; color: #ffc107; font-weight: bold;">${systemStats.pendingOrders}</td></tr>
                <tr><td style="padding: 8px 0; font-weight: bold;">Completed Orders:</td><td style="padding: 8px 0; color: #28a745; font-weight: bold;">${systemStats.completedOrders}</td></tr>
                <tr><td style="padding: 8px 0; font-weight: bold;">System Uptime:</td><td style="padding: 8px 0;">${systemStats.systemUptime} hours</td></tr>
                <tr><td style="padding: 8px 0; font-weight: bold;">Notification Time:</td><td style="padding: 8px 0;">${orderDate}</td></tr>
              </table>
            </div>

            <!-- Payment Status Alert -->
            ${paymentMethod === 'payfast_online' && order.payment_status === 'paid' ? 
              `<div style="background-color: #d4edda; padding: 20px; border-radius: 10px; margin: 25px 0; border-left: 5px solid #28a745;">
                <h4 style="margin-top: 0; color: #155724;">✅ Payment Confirmed</h4>
                <p style="margin: 0; color: #155724;">This order has been paid online through PayFast. Transaction ID: <strong>${order.payment_transaction_id || 'N/A'}</strong></p>
              </div>` :
              paymentMethod === 'payfast_online' ? 
              `<div style="background-color: #fff3cd; padding: 20px; border-radius: 10px; margin: 25px 0; border-left: 5px solid #ffc107;">
                <h4 style="margin-top: 0; color: #856404;">⏳ Payment Pending</h4>
                <p style="margin: 0; color: #856404;">This order is awaiting online payment through PayFast.</p>
              </div>` :
              `<div style="background-color: #d1ecf1; padding: 20px; border-radius: 10px; margin: 25px 0; border-left: 5px solid #17a2b8;">
                <h4 style="margin-top: 0; color: #0c5460;">💰 Cash on Delivery</h4>
                <p style="margin: 0; color: #0c5460;">Payment will be collected upon delivery.</p>
              </div>`
            }

            <!-- Action Button -->
            <div style="text-align: center; margin: 30px 0;">
              <a href="#" style="background-color: #007bff; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block;">View Order Details</a>
            </div>

          </div>

          <!-- Footer -->
          <div style="background-color: #f8f9fa; padding: 20px; text-align: center; border-radius: 0 0 10px 10px; color: #666; font-size: 12px;">
            <p style="margin: 0;">This is an automated message from AestheticRxNetwork system.</p>
          </div>
        </div>
      `;

      // Use provided admin emails (from orderController) or fallback to database list
      const recipientEmails = adminEmails && adminEmails.length > 0 
        ? adminEmails 
        : adminEmailsList.filter((email): email is string => Boolean(email));
      
      console.log(`📧 Email recipient selection:`, {
        providedAdminEmails: adminEmails?.length || 0,
        databaseAdminEmails: adminEmailsList.length,
        finalRecipientCount: recipientEmails.length,
        finalRecipients: recipientEmails
      });
      
      if (recipientEmails.length === 0) {
        console.warn('⚠️ No admin emails available to send order notification');
        console.warn('   Provided adminEmails:', adminEmails);
        console.warn('   Database adminEmailsList:', adminEmailsList);
        return;
      }
      
      console.log(`📧 Sending order notification to ${recipientEmails.length} admin(s): ${recipientEmails.join(', ')}`);
      console.log(`   Checking if asadkhanbloch4949@gmail.com is in list: ${recipientEmails.includes('asadkhanbloch4949@gmail.com')}`);
      
      // Only generate and send PDF attachments for PayFast orders
      if (paymentMethod === 'payfast_online') {
        // Generate PDF attachments with actual ITN data
        const actualITNData = itnData || {
          m_payment_id: order.order_number,
          pf_payment_id: order.payment_transaction_id || 'PF-TXN-123456789',
          payment_status: order.payment_status === 'paid' ? 'COMPLETE' : 'PENDING',
          item_name: order.product?.name || 'Product',
          item_description: order.product?.description || 'Product Description',
          amount_gross: order.order_total?.toString() || '125.00',
          amount_fee: '4.60', // Typical PayFast fee
          amount_net: (order.order_total - 4.60).toString() || '120.40',
          custom_str1: order.order_number,
          custom_str2: order.doctor?.doctor_name || 'Dr. Full Administrator',
          custom_str3: order.doctor?.clinic_name || 'Full Admin Clinic',
          custom_int1: order.qty?.toString() || '1',
          name_first: order.doctor?.doctor_name?.split(' ')[0] || 'Dr.',
          name_last: order.doctor?.doctor_name?.split(' ').slice(1).join(' ') || 'Full Administrator',
          email_address: order.doctor?.email || 'asadkhanbloch4949@gmail.com',
          merchant_id: '10042666',
          signature: 'ad8e7685c9522c24365d7ccea8cb3db7'
        };
        
        const payfastIntegrationPDF = await pdfService.generatePayFastIntegrationPDF(order, paymentMethod, actualITNData);
        const orderSummaryPDF = await pdfService.generateOrderSummaryPDF(order, paymentMethod);
        
        await this.sendEmailWithAttachments(
          recipientEmails,
          `New Order #${order.order_number} - AestheticRxNetwork`,
          htmlContent,
          [
            {
              filename: `PayFast_Integration_Report_${order.order_number}.pdf`,
              content: payfastIntegrationPDF,
              contentType: 'application/pdf'
            },
            {
              filename: `Order_Summary_${order.order_number}.pdf`,
              content: orderSummaryPDF,
              contentType: 'application/pdf'
            }
          ],
          { 
            isMarketing: false, // Transactional email
            orderId: order.id,
            orderNumber: order.order_number
          }
        );
      } else {
        // For Cash on Delivery orders, send email without attachments
        // Send ONE email to ALL admins (they'll all be in TO field)
        console.log(`📧 Sending Cash on Delivery email for order ${order.order_number}`);
        console.log(`   Recipients: ${recipientEmails.join(', ')}`);
        console.log(`   Total recipients: ${recipientEmails.length}`);
        try {
          // Send ONE email to ALL recipients (all admins will receive it)
          await this.sendEmail(
            recipientEmails, // Pass array - all admins will be in TO field
            `New Order #${order.order_number} - AestheticRxNetwork`,
            htmlContent,
            { 
              isMarketing: false, // Transactional email to admins
              orderId: order.id,
              orderNumber: order.order_number
            }
          );
          console.log(`✅ Cash on Delivery email sent successfully to all ${recipientEmails.length} admin(s) for order ${order.order_number}`);
        } catch (emailError) {
          console.error(`❌ Error sending Cash on Delivery email for order ${order.order_number}:`, emailError);
          throw emailError; // Re-throw to be caught by outer try-catch
        }
      }
    } catch (error: unknown) {
      console.error('Failed to send order placed alert:', error);
      throw error;
    }
  }

  /**
   * Send batch order notification (one email for multiple orders)
   */
  async sendBatchOrderPlacedAlert(orders: Order[], paymentMethod: string = 'cash_on_delivery', adminEmails?: string[]): Promise<void> {
    console.log(`📧 sendBatchOrderPlacedAlert called for ${orders.length} order(s), paymentMethod: ${paymentMethod}`);
    
    if (!this.isConfigured()) {
      console.log('❌ Gmail not configured, skipping batch order notification');
      return;
    }

    if (!orders || orders.length === 0) {
      console.warn('⚠️ No orders provided for batch notification');
      return;
    }

    // Type guard: ensure we have at least one order
    const firstOrder = orders[0];
    if (!firstOrder) {
      console.warn('⚠️ First order is undefined');
      return;
    }

    try {
      // Get all admin emails (same logic as single order)
      const adminEmailsList: string[] = [];
      
      const doctorRepository = AppDataSource.getRepository(Doctor);
      const parentAdmins = await doctorRepository.find({
        where: { is_admin: true, is_approved: true },
        select: ['email', 'id']
      });
      
      const permissionRepository = AppDataSource.getRepository(AdminPermission);
      let activePermissions: AdminPermission[] = [];
      try {
        activePermissions = await permissionRepository.find({
          where: { is_active: true },
          relations: ['doctor']
        });
      } catch (error) {
        console.error('❌ Error fetching admin permissions:', error);
      }
      
      const childAdminIds = new Set(activePermissions.map(p => p.doctor_id));
      
      // Add parent admin emails
      for (const admin of parentAdmins) {
        if (!childAdminIds.has(admin.id) && admin.email) {
          adminEmailsList.push(admin.email);
        }
      }
      
      // Add child admin emails
      for (const permission of activePermissions) {
        if (permission.doctor && permission.doctor.email && permission.doctor.is_approved) {
          if (!adminEmailsList.includes(permission.doctor.email)) {
            adminEmailsList.push(permission.doctor.email);
          }
        }
      }
      
      // Add environment variable emails
      const mainAdminEmail = process.env.MAIN_ADMIN_EMAIL;
      const secondaryAdminEmail = process.env.SECONDARY_ADMIN_EMAIL;
      
      if (adminEmailsList.length === 0) {
        if (mainAdminEmail) {
          adminEmailsList.push(mainAdminEmail);
        }
        if (secondaryAdminEmail) {
          adminEmailsList.push(secondaryAdminEmail);
        }
      } else {
        if (mainAdminEmail && !adminEmailsList.includes(mainAdminEmail)) {
          adminEmailsList.push(mainAdminEmail);
        }
        if (secondaryAdminEmail && !adminEmailsList.includes(secondaryAdminEmail)) {
          adminEmailsList.push(secondaryAdminEmail);
        }
      }

      const recipientEmails = adminEmails && adminEmails.length > 0 
        ? adminEmails
        : adminEmailsList.filter((email): email is string => Boolean(email));
      
      if (recipientEmails.length === 0) {
        console.warn('⚠️ No admin emails available to send batch order notification');
        return;
      }

      // Calculate totals
      const totalAmount = orders.reduce((sum, order) => sum + parseFloat(order.order_total.toString()), 0);
      const totalItems = orders.reduce((sum, order) => sum + order.qty, 0);
      const customer = firstOrder.doctor;

      // Format payment method for display
      const paymentMethodDisplay = paymentMethod === 'payfast_online' ? 
        'PayFast Online Payment' : 'Cash on Delivery';
      
      const paymentStatusDisplay = paymentMethod === 'payfast_online' ? 
        '✅ PAID' : '💰 CASH ON DELIVERY';

      // Build order items HTML
      const orderItemsHtml = orders.map((order, index) => `
        <tr style="border-bottom: 1px solid #dee2e6;">
          <td style="padding: 12px; text-align: center;">${index + 1}</td>
          <td style="padding: 12px;">${order.order_number}</td>
          <td style="padding: 12px;">${order.product?.name || 'N/A'}</td>
          <td style="padding: 12px; text-align: center;">${order.qty}</td>
          <td style="padding: 12px; text-align: right;">PKR ${parseFloat(order.order_total.toString()).toLocaleString()}</td>
        </tr>
      `).join('');

      const htmlContent = `
        <div style="font-family: Arial, sans-serif; max-width: 900px; margin: 0 auto; background-color: #ffffff;">
          <!-- Header Banner -->
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; color: white; border-radius: 10px 10px 0 0;">
            <div style="font-size: 24px; margin-bottom: 10px;">📦 New Batch Order Received</div>
            <div style="font-size: 18px; font-weight: bold;">${orders.length} Order(s) - Total: PKR ${totalAmount.toLocaleString()}</div>
            <div style="font-size: 14px; margin-top: 10px; opacity: 0.9;">${firstOrder.created_at.toLocaleDateString()}, ${firstOrder.created_at.toLocaleTimeString()}</div>
          </div>

          <!-- Main Content -->
          <div style="padding: 30px; background-color: #ffffff;">
            
            <!-- Order Summary Section -->
            <div style="background-color: #f8f9fa; padding: 25px; border-radius: 10px; margin-bottom: 25px; border-left: 5px solid #007bff;">
              <h3 style="margin-top: 0; color: #333; font-size: 18px;">📋 Order Summary</h3>
              <table style="width: 100%; border-collapse: collapse;">
                <tr><td style="padding: 8px 0; font-weight: bold; width: 30%;">Total Orders:</td><td style="padding: 8px 0; font-weight: bold; color: #007bff;">${orders.length}</td></tr>
                <tr><td style="padding: 8px 0; font-weight: bold;">Total Items:</td><td style="padding: 8px 0; font-weight: bold;">${totalItems}</td></tr>
                <tr><td style="padding: 8px 0; font-weight: bold;">Total Amount:</td><td style="padding: 8px 0; color: #28a745; font-weight: bold; font-size: 18px;">PKR ${totalAmount.toLocaleString()}</td></tr>
                <tr><td style="padding: 8px 0; font-weight: bold;">Payment Method:</td><td style="padding: 8px 0; color: #007bff; font-weight: bold;">${paymentMethodDisplay}</td></tr>
                <tr><td style="padding: 8px 0; font-weight: bold;">Payment Status:</td><td style="padding: 8px 0; color: ${paymentMethod === 'payfast_online' ? '#28a745' : '#17a2b8'}; font-weight: bold;">${paymentStatusDisplay}</td></tr>
                <tr><td style="padding: 8px 0; font-weight: bold;">Order Date:</td><td style="padding: 8px 0;">${firstOrder.created_at.toLocaleDateString()}, ${firstOrder.created_at.toLocaleTimeString()}</td></tr>
              </table>
            </div>

            <!-- Order Items Table -->
            <div style="background-color: #ffffff; padding: 25px; border-radius: 10px; margin-bottom: 25px; border: 1px solid #dee2e6;">
              <h3 style="margin-top: 0; color: #333; font-size: 18px;">📦 Order Items</h3>
              <table style="width: 100%; border-collapse: collapse; border: 1px solid #dee2e6;">
                <thead>
                  <tr style="background-color: #f8f9fa;">
                    <th style="padding: 12px; text-align: center; border-bottom: 2px solid #dee2e6;">#</th>
                    <th style="padding: 12px; text-align: left; border-bottom: 2px solid #dee2e6;">Order Number</th>
                    <th style="padding: 12px; text-align: left; border-bottom: 2px solid #dee2e6;">Product</th>
                    <th style="padding: 12px; text-align: center; border-bottom: 2px solid #dee2e6;">Qty</th>
                    <th style="padding: 12px; text-align: right; border-bottom: 2px solid #dee2e6;">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  ${orderItemsHtml}
                </tbody>
                <tfoot>
                  <tr style="background-color: #f8f9fa; font-weight: bold;">
                    <td colspan="4" style="padding: 12px; text-align: right; border-top: 2px solid #dee2e6;">Total:</td>
                    <td style="padding: 12px; text-align: right; border-top: 2px solid #dee2e6; color: #28a745; font-size: 16px;">PKR ${totalAmount.toLocaleString()}</td>
                  </tr>
                </tfoot>
              </table>
            </div>

            <!-- Customer Information Section -->
            <div style="background-color: #e3f2fd; padding: 25px; border-radius: 10px; margin-bottom: 25px; border-left: 5px solid #2196f3;">
              <h3 style="margin-top: 0; color: #333; font-size: 18px;">👨‍⚕️ Customer Information</h3>
              <table style="width: 100%; border-collapse: collapse;">
                <tr><td style="padding: 8px 0; font-weight: bold; width: 30%;">Doctor Name:</td><td style="padding: 8px 0;">${customer?.doctor_name || 'N/A'}</td></tr>
                <tr><td style="padding: 8px 0; font-weight: bold;">Clinic Name:</td><td style="padding: 8px 0;">${customer?.clinic_name || 'N/A'}</td></tr>
                <tr><td style="padding: 8px 0; font-weight: bold;">Email:</td><td style="padding: 8px 0;">${customer?.email || 'N/A'}</td></tr>
                <tr><td style="padding: 8px 0; font-weight: bold;">WhatsApp:</td><td style="padding: 8px 0;">${customer?.whatsapp || 'N/A'}</td></tr>
                <tr><td style="padding: 8px 0; font-weight: bold;">Delivery Address:</td><td style="padding: 8px 0;">${firstOrder.order_location?.address || 'N/A'}</td></tr>
              </table>
            </div>

            <!-- Action Button -->
            <div style="text-align: center; margin: 30px 0;">
              <a href="#" style="background-color: #007bff; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block;">View All Orders</a>
            </div>

          </div>

          <!-- Footer -->
          <div style="background-color: #f8f9fa; padding: 20px; text-align: center; border-radius: 0 0 10px 10px; color: #666; font-size: 12px;">
            <p style="margin: 0;">This is an automated message from AestheticRxNetwork system.</p>
          </div>
        </div>
      `;

      console.log(`📧 Sending batch order notification to ${recipientEmails.length} admin(s): ${recipientEmails.join(', ')}`);
      
      // Send email
      await this.sendEmail(
        recipientEmails,
        `New Batch Order - ${orders.length} Order(s) - Total: PKR ${totalAmount.toLocaleString()} - AestheticRxNetwork`,
        htmlContent,
        { 
          isMarketing: false,
          orderId: firstOrder.id,
          orderNumber: firstOrder.order_number
        }
      );
      
      console.log(`✅ Batch order notification sent successfully to ${recipientEmails.length} admin(s) for ${orders.length} order(s)`);
    } catch (error: unknown) {
      console.error('Failed to send batch order placed alert:', error);
      throw error;
    }
  }

  /**
   * Send tier update notification to doctor
   */
  async sendTierUpdateNotification(doctor: Doctor, oldTier: string, newTier: string, tierBenefits: any): Promise<void> {
    if (!this.isConfigured()) {
      console.log('Gmail not configured, skipping tier update notification');
      return;
    }

    try {
      const subject = `🏆 Tier Advancement: ${oldTier} → ${newTier}`;
      
      const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Tier Advancement</title>
        </head>
        <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f4f4f4;">
          <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 10px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
            
            <!-- Header -->
            <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; color: white;">
              <h1 style="margin: 0; font-size: 28px; font-weight: bold;">🎉 Tier Advancement!</h1>
              <p style="margin: 10px 0 0 0; font-size: 16px; opacity: 0.9;">Congratulations on your achievement!</p>
            </div>

            <!-- Main Content -->
            <div style="padding: 30px;">
              <h2 style="color: #333; margin-top: 0;">Dear Dr. ${doctor.doctor_name},</h2>
              
              <p style="color: #666; line-height: 1.6; font-size: 16px;">
                We are thrilled to inform you that <strong>${doctor.clinic_name}</strong> has successfully advanced to the <strong>${newTier}</strong> tier!
              </p>

              <!-- Achievement Details -->
              <div style="background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%); padding: 25px; border-radius: 10px; margin: 25px 0; border-left: 5px solid #0ea5e9;">
                <h3 style="color: #0c4a6e; margin-top: 0; font-size: 20px;">🏆 Achievement Details</h3>
                <div style="display: flex; justify-content: space-between; margin: 15px 0;">
                  <span style="color: #374151; font-weight: 600;">Previous Tier:</span>
                  <span style="color: #6b7280;">${oldTier}</span>
                </div>
                <div style="display: flex; justify-content: space-between; margin: 15px 0;">
                  <span style="color: #374151; font-weight: 600;">New Tier:</span>
                  <span style="color: #059669; font-weight: bold;">${newTier}</span>
                </div>
                <div style="display: flex; justify-content: space-between; margin: 15px 0;">
                  <span style="color: #374151; font-weight: 600;">Achievement Date:</span>
                  <span style="color: #6b7280;">${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</span>
                </div>
              </div>

              <!-- Tier Benefits -->
              ${tierBenefits ? `
              <div style="background: #f0fdf4; padding: 25px; border-radius: 10px; margin: 25px 0; border-left: 5px solid #22c55e;">
                <h3 style="color: #166534; margin-top: 0; font-size: 20px;">🎁 New Tier Benefits</h3>
                <div style="color: #374151; line-height: 1.8; margin: 15px 0;">
                  ${tierBenefits}
                </div>
              </div>
              ` : ''}

              <!-- Call to Action -->
              <div style="text-align: center; margin: 30px 0;">
                <a href="${getFrontendUrlWithPath('/leaderboard')}" 
                   style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; display: inline-block; font-weight: bold; font-size: 16px;">
                  View Leaderboard
                </a>
              </div>

              <p style="color: #666; line-height: 1.6; font-size: 16px;">
                This is a significant milestone in your journey with us. Your dedication and contribution to the community are truly appreciated!
              </p>

              <p style="color: #666; line-height: 1.6; font-size: 16px;">
                Keep up the excellent work, and we look forward to seeing you reach even greater heights!
              </p>
            </div>

            <!-- Footer -->
            <div style="background-color: #f9fafb; padding: 20px; text-align: center; border-top: 1px solid #e5e7eb;">
              <p style="color: #6b7280; font-size: 14px; margin: 0;">
                This is an automated message from AestheticRxNetwork system.<br>
                For support, contact us at ${process.env.MAIN_ADMIN_EMAIL || 'support@aestheticrx.com'}
              </p>
            </div>
          </div>
        </body>
        </html>
      `;

      await this.sendEmail(doctor.email, subject, htmlContent, {
        isMarketing: false,
        userId: doctor.id
      });
      console.log(`🎉 Tier update notification sent to ${doctor.email}: ${oldTier} → ${newTier}`);
    } catch (error: unknown) {
      console.error('Failed to send tier update notification:', error);
      throw error;
    }
  }

  /**
   * Send certificate notification to user
   */
  async sendCertificateNotification(userEmail: string, userName: string, certificate: any): Promise<void> {
    try {
      const subject = `🏆 Certificate Issued: ${certificate.title}`;
      
      const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Certificate Issued</title>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px; }
            .certificate-card { background: white; border: 2px solid #e9ecef; border-radius: 10px; padding: 25px; margin: 20px 0; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
            .certificate-title { font-size: 24px; font-weight: bold; color: #2c3e50; margin-bottom: 10px; }
            .certificate-type { background: #3498db; color: white; padding: 5px 15px; border-radius: 20px; font-size: 12px; text-transform: uppercase; display: inline-block; margin-bottom: 15px; }
            .certificate-description { color: #7f8c8d; margin: 15px 0; }
            .verification-code { background: #ecf0f1; padding: 10px; border-radius: 5px; font-family: monospace; font-weight: bold; color: #2c3e50; }
            .footer { text-align: center; margin-top: 30px; color: #7f8c8d; font-size: 14px; }
            .btn { display: inline-block; background: #3498db; color: white; padding: 12px 25px; text-decoration: none; border-radius: 5px; margin: 10px 5px; }
            .achievement-badge { background: #f39c12; color: white; padding: 8px 15px; border-radius: 15px; font-size: 14px; display: inline-block; margin: 10px 0; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🏆 Certificate Issued!</h1>
              <p>Congratulations on your achievement!</p>
            </div>
            
            <div class="content">
              <h2>Dear ${userName},</h2>
              
              <p>We are pleased to inform you that you have been awarded a certificate for your outstanding performance and contributions to our platform.</p>
              
              <div class="certificate-card">
                <div class="certificate-type">${certificate.certificate_type.replace('_', ' ').toUpperCase()}</div>
                <div class="certificate-title">${certificate.title}</div>
                ${certificate.achievement ? `<div class="achievement-badge">${certificate.achievement}</div>` : ''}
                <div class="certificate-description">${certificate.description}</div>
                
                ${certificate.tier_name ? `<p><strong>Tier:</strong> ${certificate.tier_name}</p>` : ''}
                ${certificate.rank ? `<p><strong>Rank:</strong> #${certificate.rank}</p>` : ''}
                ${certificate.month && certificate.year ? `<p><strong>Period:</strong> ${certificate.month} ${certificate.year}</p>` : ''}
                
                <p><strong>Issued Date:</strong> ${new Date(certificate.issued_at).toLocaleDateString()}</p>
                <p><strong>Status:</strong> <span style="color: #27ae60; font-weight: bold;">${certificate.status.toUpperCase()}</span></p>
                
                <div class="verification-code">
                  <strong>Verification Code:</strong> ${certificate.verification_code}
                </div>
              </div>
              
              <p>This certificate is a testament to your dedication and excellence. Keep up the great work!</p>
              
              <p>You can view all your certificates in your profile dashboard.</p>
              
              <div style="text-align: center; margin: 30px 0;">
                <a href="${process.env.FRONTEND_URL}/user/${certificate.doctor_id}" class="btn">View Profile</a>
                <a href="${process.env.FRONTEND_URL}" class="btn">Visit Platform</a>
              </div>
              
              <div class="footer">
                <p>Best regards,<br>The AestheticRxNetwork Team</p>
                <p><small>This certificate is digitally verified and can be used for professional purposes.</small></p>
              </div>
            </div>
          </div>
        </body>
        </html>
      `;

      await this.sendEmail(userEmail, subject, htmlContent, {
        isMarketing: false,
        userId: certificate.doctor_id
      });
      console.log(`✅ Certificate notification sent to ${userEmail}`);

    } catch (error: unknown) {
      console.error('Failed to send certificate notification:', error);
      throw error;
    }
  }

  /**
   * Send delivery assigned notification to customer
   */
  async sendDeliveryAssignedNotification(order: Order): Promise<void> {
    if (!this.isConfigured() || !order.doctor) {
      return;
    }

    try {
      const customerEmail = order.doctor.email;
      const customerName = order.doctor.doctor_name;
      const employeeName = order.assigned_employee?.doctor_name || 'Delivery Personnel';
      
      const subject = `🚚 Your Order #${order.order_number} is on the way!`;
      
      const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Delivery Assigned</title>
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
            <h1 style="color: white; margin: 0;">🚚 Delivery Assigned</h1>
          </div>
          
          <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px;">
            <p>Dear ${customerName},</p>
            
            <p>Great news! Your order has been assigned to our delivery team and is on its way to you.</p>
            
            <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #667eea;">
              <h3 style="margin-top: 0; color: #333;">📦 Order Details</h3>
              <table style="width: 100%; border-collapse: collapse;">
                <tr><td style="padding: 8px 0; font-weight: bold; width: 30%;">Order Number:</td><td style="padding: 8px 0;">${order.order_number}</td></tr>
                <tr><td style="padding: 8px 0; font-weight: bold;">Product:</td><td style="padding: 8px 0;">${order.product?.name || 'N/A'}</td></tr>
                <tr><td style="padding: 8px 0; font-weight: bold;">Quantity:</td><td style="padding: 8px 0;">${order.qty}</td></tr>
                <tr><td style="padding: 8px 0; font-weight: bold;">Total Amount:</td><td style="padding: 8px 0;">PKR ${Number(order.order_total).toLocaleString()}</td></tr>
                <tr><td style="padding: 8px 0; font-weight: bold;">Delivery Address:</td><td style="padding: 8px 0;">${order.order_location.address}</td></tr>
              </table>
            </div>
            
            <div style="background: #e8f5e9; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #4caf50;">
              <h3 style="margin-top: 0; color: #2e7d32;">👤 Delivery Information</h3>
              <p style="margin: 0;"><strong>Assigned to:</strong> ${employeeName}</p>
              <p style="margin: 5px 0 0 0;"><strong>Status:</strong> Assigned - Delivery personnel will contact you soon</p>
            </div>
            
            <p>Our delivery team will contact you shortly. Please ensure someone is available to receive the order.</p>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${getFrontendUrl()}" style="background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">Visit Our Website</a>
            </div>
            
            <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; color: #666; font-size: 12px;">
              <p>Best regards,<br>The AestheticRxNetwork Team</p>
            </div>
          </div>
        </body>
        </html>
      `;

      await this.sendEmail(customerEmail, subject, htmlContent, {
        isMarketing: false,
        userId: order.doctor.id,
        orderId: order.id,
        orderNumber: order.order_number
      });
      console.log(`✅ Delivery assigned notification sent to ${customerEmail}`);
    } catch (error: unknown) {
      console.error('Failed to send delivery assigned notification:', error);
      throw error;
    }
  }

  /**
   * Send delivery completed notification to customer
   */
  async sendDeliveryCompletedNotification(order: Order): Promise<void> {
    if (!this.isConfigured() || !order.doctor) {
      return;
    }

    try {
      const customerEmail = order.doctor.email;
      const customerName = order.doctor.doctor_name;
      
      const subject = `✅ Your Order #${order.order_number} has been delivered!`;
      
      const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Delivery Completed</title>
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #4caf50 0%, #45a049 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
            <h1 style="color: white; margin: 0;">✅ Delivery Completed</h1>
          </div>
          
          <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px;">
            <p>Dear ${customerName},</p>
            
            <p>Your order has been successfully delivered! We hope you're satisfied with your purchase.</p>
            
            <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #4caf50;">
              <h3 style="margin-top: 0; color: #333;">📦 Order Details</h3>
              <table style="width: 100%; border-collapse: collapse;">
                <tr><td style="padding: 8px 0; font-weight: bold; width: 30%;">Order Number:</td><td style="padding: 8px 0;">${order.order_number}</td></tr>
                <tr><td style="padding: 8px 0; font-weight: bold;">Product:</td><td style="padding: 8px 0;">${order.product?.name || 'N/A'}</td></tr>
                <tr><td style="padding: 8px 0; font-weight: bold;">Quantity:</td><td style="padding: 8px 0;">${order.qty}</td></tr>
                <tr><td style="padding: 8px 0; font-weight: bold;">Total Amount:</td><td style="padding: 8px 0;">PKR ${Number(order.order_total).toLocaleString()}</td></tr>
                <tr><td style="padding: 8px 0; font-weight: bold;">Delivered At:</td><td style="padding: 8px 0;">${order.delivery_completed_at ? new Date(order.delivery_completed_at).toLocaleString() : 'N/A'}</td></tr>
              </table>
            </div>
            
            <div style="background: #e8f5e9; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #4caf50;">
              <p style="margin: 0; color: #2e7d32;"><strong>✅ Status:</strong> Delivered Successfully</p>
            </div>
            
            <p>Thank you for choosing us! If you have any questions or concerns, please don't hesitate to contact us.</p>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${getFrontendUrl()}" style="background: #4caf50; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">Visit Our Website</a>
            </div>
            
            <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; color: #666; font-size: 12px;">
              <p>Best regards,<br>The AestheticRxNetwork Team</p>
            </div>
          </div>
        </body>
        </html>
      `;

      await this.sendEmail(customerEmail, subject, htmlContent, {
        isMarketing: false,
        userId: order.doctor.id,
        orderId: order.id,
        orderNumber: order.order_number
      });
      console.log(`✅ Delivery completed notification sent to ${customerEmail}`);
      
      // Also send to admins
      const adminEmails = [
        process.env.MAIN_ADMIN_EMAIL,
        process.env.SECONDARY_ADMIN_EMAIL
      ].filter(Boolean) as string[];

      if (adminEmails.length > 0) {
        const adminSubject = `✅ Order Delivered - Order #${order.order_number}`;
        const adminHtml = `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Order Delivered</title>
          </head>
          <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: linear-gradient(135deg, #4caf50 0%, #45a049 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
              <h1 style="color: white; margin: 0;">✅ Order Delivered</h1>
            </div>
            
            <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px;">
              <p>An order has been successfully delivered:</p>
              
              <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #4caf50;">
                <h3 style="margin-top: 0; color: #333;">Order Details</h3>
                <p><strong>Order Number:</strong> ${order.order_number}</p>
                <p><strong>Customer:</strong> ${customerName}</p>
                <p><strong>Product:</strong> ${order.product?.name || 'N/A'} × ${order.qty}</p>
                <p><strong>Total Amount:</strong> PKR ${Number(order.order_total).toLocaleString()}</p>
                <p><strong>Delivery Personnel:</strong> ${order.assigned_employee?.doctor_name || 'N/A'}</p>
                <p><strong>Delivered At:</strong> ${order.delivery_completed_at ? new Date(order.delivery_completed_at).toLocaleString() : 'N/A'}</p>
                <p><strong>Status:</strong> <span style="background: #4caf50; color: white; padding: 4px 8px; border-radius: 4px; font-weight: bold;">DELIVERED</span></p>
              </div>
              
              <div style="background: #e8f5e9; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #4caf50;">
                <p style="margin: 0; color: #2e7d32;"><strong>✓ Delivery completed successfully!</strong></p>
              </div>
            </div>
          </body>
          </html>
        `;
        
        await this.sendEmail(adminEmails, adminSubject, adminHtml, {
          isMarketing: false,
          orderId: order.id,
          orderNumber: order.order_number
        });
        console.log(`✅ Delivery completed notification sent to admins: ${adminEmails.join(', ')}`);
      }
    } catch (error: unknown) {
      console.error('Failed to send delivery completed notification:', error);
      throw error;
    }
  }

  /**
   * Send live location tracking notification to customer and admins
   */
  async sendLiveLocationNotification(order: Order, location: { lat: number; lng: number }, employeeName: string): Promise<void> {
    if (!this.isConfigured()) {
      return;
    }

    try {
      const googleMapsLink = `https://www.google.com/maps?q=${location.lat},${location.lng}`;
      const timestamp = new Date().toLocaleString();
      
      // Email to customer
      if (order.doctor) {
        const customerEmail = order.doctor.email;
        const customerName = order.doctor.doctor_name;
        const subject = `📍 Live Location Update - Order #${order.order_number}`;
        
        const htmlContent = `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Live Location Update</title>
          </head>
          <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: linear-gradient(135deg, #4caf50 0%, #45a049 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
              <h1 style="color: white; margin: 0;">📍 Live Location Update</h1>
            </div>
            
            <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px;">
              <p>Dear ${customerName},</p>
              
              <p>Your delivery is on the way! Here's the current location of our delivery personnel.</p>
              
              <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #4caf50;">
                <h3 style="margin-top: 0; color: #333;">📦 Order Details</h3>
                <table style="width: 100%; border-collapse: collapse;">
                  <tr><td style="padding: 8px 0; font-weight: bold; width: 30%;">Order Number:</td><td style="padding: 8px 0;">${order.order_number}</td></tr>
                  <tr><td style="padding: 8px 0; font-weight: bold;">Product:</td><td style="padding: 8px 0;">${order.product?.name || 'N/A'}</td></tr>
                  <tr><td style="padding: 8px 0; font-weight: bold;">Delivery Personnel:</td><td style="padding: 8px 0;">${employeeName}</td></tr>
                  <tr><td style="padding: 8px 0; font-weight: bold;">Location Updated:</td><td style="padding: 8px 0;">${timestamp}</td></tr>
                </table>
              </div>
              
              <div style="background: #e3f2fd; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #2196f3; text-align: center;">
                <h3 style="margin-top: 0; color: #1976d2;">📍 Current Location</h3>
                <p style="margin: 10px 0;"><strong>Coordinates:</strong> ${location.lat.toFixed(6)}, ${location.lng.toFixed(6)}</p>
                <a href="${googleMapsLink}" target="_blank" style="background: #2196f3; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block; margin-top: 10px;">🗺️ View on Google Maps</a>
              </div>
              
              <div style="background: #fff3cd; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #ffc107;">
                <p style="margin: 0; color: #856404;"><strong>ℹ️ Note:</strong> You will receive periodic location updates as the delivery progresses.</p>
              </div>
              
              <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; color: #666; font-size: 12px;">
                <p>Best regards,<br>The AestheticRxNetwork Team</p>
              </div>
            </div>
          </body>
          </html>
        `;

        await this.sendEmail(customerEmail, subject, htmlContent, {
          isMarketing: false,
          userId: order.doctor.id,
          orderId: order.id,
          orderNumber: order.order_number
        });
        console.log(`✅ Live location notification sent to customer: ${customerEmail}`);
      }

      // Email to admins
      const mainAdminEmail = process.env.MAIN_ADMIN_EMAIL;
      const secondaryAdminEmail = process.env.SECONDARY_ADMIN_EMAIL;
      const adminEmails = [mainAdminEmail, secondaryAdminEmail].filter((email): email is string => Boolean(email));

      if (adminEmails.length > 0) {
        const adminSubject = `📍 Live Location Update - Order #${order.order_number} - ${order.doctor?.doctor_name || 'Customer'}`;
        
        const adminHtmlContent = `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Live Location Update - Admin</title>
          </head>
          <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: linear-gradient(135deg, #ff9800 0%, #f57c00 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
              <h1 style="color: white; margin: 0;">📍 Live Location Update - Admin</h1>
            </div>
            
            <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px;">
              <p>Dear Admin,</p>
              
              <p>Live location update for an active delivery:</p>
              
              <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #ff9800;">
                <h3 style="margin-top: 0; color: #333;">📦 Order Details</h3>
                <table style="width: 100%; border-collapse: collapse;">
                  <tr><td style="padding: 8px 0; font-weight: bold; width: 30%;">Order Number:</td><td style="padding: 8px 0;">${order.order_number}</td></tr>
                  <tr><td style="padding: 8px 0; font-weight: bold;">Customer:</td><td style="padding: 8px 0;">${order.doctor?.doctor_name || 'N/A'}</td></tr>
                  <tr><td style="padding: 8px 0; font-weight: bold;">Product:</td><td style="padding: 8px 0;">${order.product?.name || 'N/A'}</td></tr>
                  <tr><td style="padding: 8px 0; font-weight: bold;">Delivery Personnel:</td><td style="padding: 8px 0;">${employeeName}</td></tr>
                  <tr><td style="padding: 8px 0; font-weight: bold;">Location Updated:</td><td style="padding: 8px 0;">${timestamp}</td></tr>
                </table>
              </div>
              
              <div style="background: #e3f2fd; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #2196f3; text-align: center;">
                <h3 style="margin-top: 0; color: #1976d2;">📍 Current Location</h3>
                <p style="margin: 10px 0;"><strong>Coordinates:</strong> ${location.lat.toFixed(6)}, ${location.lng.toFixed(6)}</p>
                <a href="${googleMapsLink}" target="_blank" style="background: #2196f3; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block; margin-top: 10px;">🗺️ View on Google Maps</a>
              </div>
              
              <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; color: #666; font-size: 12px;">
                <p>Best regards,<br>The AestheticRxNetwork Team</p>
              </div>
            </div>
          </body>
          </html>
        `;

        for (const adminEmail of adminEmails) {
          await this.sendEmail(adminEmail, adminSubject, adminHtmlContent, {
            isMarketing: false,
            orderId: order.id,
            orderNumber: order.order_number
          });
          console.log(`✅ Live location notification sent to admin: ${adminEmail}`);
        }
      }
    } catch (error: unknown) {
      console.error('Failed to send live location notification:', error);
      throw error;
    }
  }

  /**
   * Send notification to employee when order is assigned to them
   */
  async sendEmployeeAssignmentNotification(order: Order, employee: Doctor): Promise<void> {
    if (!this.isConfigured()) {
      return;
    }

    try {
      const employeeEmail = employee.email;
      const employeeName = employee.doctor_name;
      const customerName = order.doctor?.doctor_name || 'Customer';
      const customerAddress = order.order_location?.address || 'Address not provided';
      
      const subject = `📦 New Delivery Assignment - Order #${order.order_number}`;
      
      const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>New Delivery Assignment</title>
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
            <h1 style="color: white; margin: 0;">📦 New Delivery Assignment</h1>
          </div>
          
          <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px;">
            <p>Dear ${employeeName},</p>
            
            <p>A new delivery order has been assigned to you. Please review the details below:</p>
            
            <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #667eea;">
              <h2 style="margin-top: 0; color: #667eea;">Order Details</h2>
              <p><strong>Order Number:</strong> ${order.order_number}</p>
              <p><strong>Product:</strong> ${order.product?.name || 'N/A'} × ${order.qty}</p>
              <p><strong>Customer:</strong> ${customerName}</p>
              <p><strong>Delivery Address:</strong> ${customerAddress}</p>
              <p><strong>Status:</strong> ${order.delivery_status ? order.delivery_status.replace('_', ' ').toUpperCase() : 'ASSIGNED'}</p>
            </div>
            
            <div style="background: #e3f2fd; padding: 15px; border-radius: 8px; margin: 20px 0;">
              <p style="margin: 0;"><strong>📱 Next Steps:</strong></p>
              <ul style="margin: 10px 0; padding-left: 20px;">
                <li>Log in to your employee dashboard</li>
                <li>Click "Start Delivery" when you begin the delivery</li>
                <li>Mark the order as "Delivered" when completed</li>
              </ul>
            </div>
            
            <p style="margin-top: 30px;">Thank you for your service!</p>
            
            <p style="color: #666; font-size: 12px; margin-top: 30px;">
              This is an automated notification. Please do not reply to this email.
            </p>
          </div>
        </body>
        </html>
      `;

      await this.sendEmail(employeeEmail, subject, htmlContent, {
        isMarketing: false,
        userId: employee.id,
        orderId: order.id,
        orderNumber: order.order_number
      });
      console.log(`✅ Employee assignment notification sent to ${employeeEmail}`);
    } catch (error: unknown) {
      console.error('Failed to send employee assignment notification:', error);
      throw error;
    }
  }

  /**
   * Send notification to customer that order is on its way (without live location)
   */
  async sendDeliveryOnTheWayNotification(order: Order, employeeName: string): Promise<void> {
    if (!this.isConfigured() || !order.doctor) {
      return;
    }

    try {
      const customerEmail = order.doctor.email;
      const customerName = order.doctor.doctor_name;
      
      const subject = `🚚 Your Order #${order.order_number} is on its way!`;
      
      const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Order On The Way</title>
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #4caf50 0%, #45a049 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
            <h1 style="color: white; margin: 0;">🚚 Order On The Way!</h1>
          </div>
          
          <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px;">
            <p>Dear ${customerName},</p>
            
            <p>Great news! Your order is now on its way to you. Our delivery personnel has started the delivery process.</p>
            
            <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #4caf50;">
              <h3 style="margin-top: 0; color: #333;">📦 Order Details</h3>
              <table style="width: 100%; border-collapse: collapse;">
                <tr><td style="padding: 8px 0; font-weight: bold; width: 30%;">Order Number:</td><td style="padding: 8px 0;">${order.order_number}</td></tr>
                <tr><td style="padding: 8px 0; font-weight: bold;">Product:</td><td style="padding: 8px 0;">${order.product?.name || 'N/A'}</td></tr>
                <tr><td style="padding: 8px 0; font-weight: bold;">Quantity:</td><td style="padding: 8px 0;">${order.qty}</td></tr>
                <tr><td style="padding: 8px 0; font-weight: bold;">Delivery Address:</td><td style="padding: 8px 0;">${order.order_location?.address || 'N/A'}</td></tr>
              </table>
            </div>
            
            <div style="background: #e8f5e9; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #4caf50;">
              <h3 style="margin-top: 0; color: #2e7d32;">👤 Delivery Information</h3>
              <p style="margin: 0;"><strong>Delivery Personnel:</strong> ${employeeName}</p>
              <p style="margin: 5px 0 0 0;"><strong>Status:</strong> In Transit - Your order is on its way!</p>
            </div>
            
            <div style="background: #fff3cd; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #ffc107;">
              <p style="margin: 0; color: #856404;"><strong>⏰ Estimated Delivery:</strong> Please ensure someone is available to receive the order. Our delivery personnel will contact you upon arrival.</p>
            </div>
            
            <p>Thank you for your patience. We appreciate your business!</p>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${getFrontendUrl()}" style="background: #4caf50; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">Visit Our Website</a>
            </div>
            
            <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; color: #666; font-size: 12px;">
              <p>Best regards,<br>The AestheticRxNetwork Team</p>
            </div>
          </div>
        </body>
        </html>
      `;

      await this.sendEmail(customerEmail, subject, htmlContent, {
        isMarketing: false,
        userId: order.doctor.id,
        orderId: order.id,
        orderNumber: order.order_number
      });
      
      // Also send to admins
      const adminEmails = [
        process.env.MAIN_ADMIN_EMAIL,
        process.env.SECONDARY_ADMIN_EMAIL
      ].filter(Boolean) as string[];

      if (adminEmails.length > 0) {
        const adminSubject = `📦 Delivery Started - Order #${order.order_number}`;
        const adminHtml = `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Delivery Started</title>
          </head>
          <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
              <h1 style="color: white; margin: 0;">📦 Delivery Started</h1>
            </div>
            
            <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px;">
              <p>Delivery has been started for the following order:</p>
              
              <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #667eea;">
                <h3 style="margin-top: 0; color: #333;">Order Details</h3>
                <p><strong>Order Number:</strong> ${order.order_number}</p>
                <p><strong>Customer:</strong> ${customerName}</p>
                <p><strong>Product:</strong> ${order.product?.name || 'N/A'} × ${order.qty}</p>
                <p><strong>Delivery Personnel:</strong> ${employeeName}</p>
                <p><strong>Status:</strong> In Transit</p>
              </div>
            </div>
          </body>
          </html>
        `;
        
        await this.sendEmail(adminEmails, adminSubject, adminHtml, {
          isMarketing: false,
          orderId: order.id,
          orderNumber: order.order_number
        });
      }
      
      console.log(`✅ Delivery on the way notification sent to ${customerEmail}`);
    } catch (error: unknown) {
      console.error('Failed to send delivery on the way notification:', error);
      throw error;
    }
  }

  /**
   * Send advertisement payment confirmation notification
   */
  async sendAdvertisementPaymentConfirmation(advertisement: any, paymentMethod: string = 'payfast_online', adminEmails?: string[]): Promise<void> {
    if (!this.isConfigured()) {
      console.log('❌ Gmail not configured, skipping advertisement payment notification');
      return;
    }

    try {
      const mainAdminEmail = process.env.MAIN_ADMIN_EMAIL;
      const secondaryAdminEmail = process.env.SECONDARY_ADMIN_EMAIL;

      // Format payment method for display
      const paymentMethodDisplay = paymentMethod === 'payfast_online' ? 
        'PayFast Online Payment' : 
        paymentMethod === 'cash_on_delivery' ? 'Cash on Delivery' :
        paymentMethod === 'bank_transfer' ? 'Bank Transfer' : 'Other';

      const paymentStatusDisplay = advertisement.payment_status === 'paid' ? '✅ PAID' : '⏳ PENDING';

      // Email to customer (doctor)
      if (advertisement.doctor?.email) {
        const customerEmail = advertisement.doctor.email;
        const customerName = advertisement.doctor.doctor_name || advertisement.doctor.clinic_name || 'Customer';
        
        const customerHtml = `
          <div style="font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; background-color: #ffffff;">
            <!-- Header Banner -->
            <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; color: white; border-radius: 10px 10px 0 0;">
              <div style="font-size: 24px; margin-bottom: 10px;">✅ Payment Confirmed</div>
              <div style="font-size: 18px; font-weight: bold;">Advertisement: ${advertisement.title}</div>
              <div style="font-size: 14px; margin-top: 10px; opacity: 0.9;">${new Date().toLocaleDateString()}, ${new Date().toLocaleTimeString()}</div>
            </div>

            <!-- Main Content -->
            <div style="padding: 30px; background-color: #ffffff;">
              
              <p>Dear ${customerName},</p>
              
              <p>Thank you for your payment! Your advertisement payment has been confirmed successfully.</p>

              <!-- Payment Details Section -->
              <div style="background-color: #f8f9fa; padding: 25px; border-radius: 10px; margin-bottom: 25px; border-left: 5px solid #28a745;">
                <h3 style="margin-top: 0; color: #333; font-size: 18px;">💰 Payment Details</h3>
                <table style="width: 100%; border-collapse: collapse;">
                  <tr><td style="padding: 8px 0; font-weight: bold; width: 30%;">Advertisement Title:</td><td style="padding: 8px 0;">${advertisement.title}</td></tr>
                  <tr><td style="padding: 8px 0; font-weight: bold;">Total Amount:</td><td style="padding: 8px 0; color: #28a745; font-weight: bold; font-size: 16px;">PKR ${parseFloat(advertisement.total_cost?.toString() || '0').toLocaleString()}</td></tr>
                  <tr><td style="padding: 8px 0; font-weight: bold;">Paid Amount:</td><td style="padding: 8px 0; color: #28a745; font-weight: bold;">PKR ${parseFloat(advertisement.paid_amount?.toString() || advertisement.total_cost?.toString() || '0').toLocaleString()}</td></tr>
                  <tr><td style="padding: 8px 0; font-weight: bold;">Payment Method:</td><td style="padding: 8px 0; color: #007bff; font-weight: bold;">${paymentMethodDisplay}</td></tr>
                  <tr><td style="padding: 8px 0; font-weight: bold;">Payment Status:</td><td style="padding: 8px 0; color: #28a745; font-weight: bold;">${paymentStatusDisplay}</td></tr>
                  ${advertisement.transaction_id ? `<tr><td style="padding: 8px 0; font-weight: bold;">Transaction ID:</td><td style="padding: 8px 0;">${advertisement.transaction_id}</td></tr>` : ''}
                  ${advertisement.payment_date ? `<tr><td style="padding: 8px 0; font-weight: bold;">Payment Date:</td><td style="padding: 8px 0;">${new Date(advertisement.payment_date).toLocaleDateString()}, ${new Date(advertisement.payment_date).toLocaleTimeString()}</td></tr>` : ''}
                </table>
              </div>

              <!-- Advertisement Details Section -->
              <div style="background-color: #e3f2fd; padding: 25px; border-radius: 10px; margin-bottom: 25px; border-left: 5px solid #2196f3;">
                <h3 style="margin-top: 0; color: #333; font-size: 18px;">📢 Advertisement Details</h3>
                <table style="width: 100%; border-collapse: collapse;">
                  <tr><td style="padding: 8px 0; font-weight: bold; width: 30%;">Title:</td><td style="padding: 8px 0;">${advertisement.title}</td></tr>
                  ${advertisement.description ? `<tr><td style="padding: 8px 0; font-weight: bold;">Description:</td><td style="padding: 8px 0;">${advertisement.description}</td></tr>` : ''}
                  <tr><td style="padding: 8px 0; font-weight: bold;">Placement Area:</td><td style="padding: 8px 0;">${advertisement.selected_area || 'N/A'}</td></tr>
                  <tr><td style="padding: 8px 0; font-weight: bold;">Status:</td><td style="padding: 8px 0; background-color: #d4edda; color: #155724; padding: 4px 8px; border-radius: 4px; font-weight: bold;">${advertisement.status?.toUpperCase() || 'APPROVED'}</td></tr>
                  ${advertisement.start_date ? `<tr><td style="padding: 8px 0; font-weight: bold;">Start Date:</td><td style="padding: 8px 0;">${new Date(advertisement.start_date).toLocaleDateString()}</td></tr>` : ''}
                  ${advertisement.end_date ? `<tr><td style="padding: 8px 0; font-weight: bold;">End Date:</td><td style="padding: 8px 0;">${new Date(advertisement.end_date).toLocaleDateString()}</td></tr>` : ''}
                </table>
              </div>

              <!-- Next Steps -->
              <div style="background-color: #fff3cd; padding: 20px; border-radius: 10px; margin: 25px 0; border-left: 5px solid #ffc107;">
                <h4 style="margin-top: 0; color: #856404;">📋 What happens next?</h4>
                <ol style="color: #856404; line-height: 1.8;">
                  <li>Your advertisement has been approved and will be reviewed by our team</li>
                  <li>Your advertisement will go live on the scheduled start date</li>
                  <li>You will receive updates about your advertisement's performance</li>
                </ol>
              </div>

              <!-- Action Button -->
              <div style="text-align: center; margin: 30px 0;">
                <a href="${getFrontendUrlWithPath('/advertisement/my-advertisements')}" style="background-color: #007bff; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block;">View My Advertisements</a>
              </div>

            </div>

            <!-- Footer -->
            <div style="background-color: #f8f9fa; padding: 20px; text-align: center; border-radius: 0 0 10px 10px; color: #666; font-size: 12px;">
              <p style="margin: 0;">This is an automated message from AestheticRxNetwork system.</p>
            </div>
          </div>
        `;

        await this.sendEmail(
          customerEmail,
          `Payment Confirmed - Advertisement: ${advertisement.title}`,
          customerHtml,
          { isMarketing: false, userId: advertisement.doctor_id } // Transactional email
        );
        console.log(`✅ Payment confirmation email sent to customer: ${customerEmail}`);
      }

      // Email to admins
      const recipientEmails = adminEmails && adminEmails.length > 0 
        ? adminEmails 
        : [mainAdminEmail, secondaryAdminEmail].filter((email): email is string => Boolean(email));
      
      if (recipientEmails.length === 0) {
        console.warn('⚠️ No admin emails available to send advertisement payment notification');
        return;
      }

      const adminHtml = `
        <div style="font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; background-color: #ffffff;">
          <!-- Header Banner -->
          <div style="background: linear-gradient(135deg, #28a745 0%, #20c997 100%); padding: 30px; text-align: center; color: white; border-radius: 10px 10px 0 0;">
            <div style="font-size: 24px; margin-bottom: 10px;">💰 Advertisement Payment Received</div>
            <div style="font-size: 18px; font-weight: bold;">${advertisement.title}</div>
            <div style="font-size: 14px; margin-top: 10px; opacity: 0.9;">${new Date().toLocaleDateString()}, ${new Date().toLocaleTimeString()}</div>
          </div>

          <!-- Main Content -->
          <div style="padding: 30px; background-color: #ffffff;">
            
            <p>Dear Admin,</p>
            
            <p>A new advertisement payment has been received and confirmed.</p>

            <!-- Payment Details Section -->
            <div style="background-color: #f8f9fa; padding: 25px; border-radius: 10px; margin-bottom: 25px; border-left: 5px solid #28a745;">
              <h3 style="margin-top: 0; color: #333; font-size: 18px;">💰 Payment Details</h3>
              <table style="width: 100%; border-collapse: collapse;">
                <tr><td style="padding: 8px 0; font-weight: bold; width: 30%;">Advertisement ID:</td><td style="padding: 8px 0;">${advertisement.id}</td></tr>
                <tr><td style="padding: 8px 0; font-weight: bold;">Title:</td><td style="padding: 8px 0;">${advertisement.title}</td></tr>
                <tr><td style="padding: 8px 0; font-weight: bold;">Total Amount:</td><td style="padding: 8px 0; color: #28a745; font-weight: bold; font-size: 16px;">PKR ${parseFloat(advertisement.total_cost?.toString() || '0').toLocaleString()}</td></tr>
                <tr><td style="padding: 8px 0; font-weight: bold;">Paid Amount:</td><td style="padding: 8px 0; color: #28a745; font-weight: bold;">PKR ${parseFloat(advertisement.paid_amount?.toString() || advertisement.total_cost?.toString() || '0').toLocaleString()}</td></tr>
                <tr><td style="padding: 8px 0; font-weight: bold;">Payment Method:</td><td style="padding: 8px 0; color: #007bff; font-weight: bold;">${paymentMethodDisplay}</td></tr>
                <tr><td style="padding: 8px 0; font-weight: bold;">Payment Status:</td><td style="padding: 8px 0; color: #28a745; font-weight: bold;">${paymentStatusDisplay}</td></tr>
                ${advertisement.transaction_id ? `<tr><td style="padding: 8px 0; font-weight: bold;">Transaction ID:</td><td style="padding: 8px 0;">${advertisement.transaction_id}</td></tr>` : ''}
                ${advertisement.payment_date ? `<tr><td style="padding: 8px 0; font-weight: bold;">Payment Date:</td><td style="padding: 8px 0;">${new Date(advertisement.payment_date).toLocaleDateString()}, ${new Date(advertisement.payment_date).toLocaleTimeString()}</td></tr>` : ''}
              </table>
            </div>

            <!-- Customer Information Section -->
            <div style="background-color: #e3f2fd; padding: 25px; border-radius: 10px; margin-bottom: 25px; border-left: 5px solid #2196f3;">
              <h3 style="margin-top: 0; color: #333; font-size: 18px;">👨‍⚕️ Customer Information</h3>
              <table style="width: 100%; border-collapse: collapse;">
                <tr><td style="padding: 8px 0; font-weight: bold; width: 30%;">Doctor Name:</td><td style="padding: 8px 0;">${advertisement.doctor?.doctor_name || 'N/A'}</td></tr>
                <tr><td style="padding: 8px 0; font-weight: bold;">Clinic Name:</td><td style="padding: 8px 0;">${advertisement.doctor?.clinic_name || 'N/A'}</td></tr>
                <tr><td style="padding: 8px 0; font-weight: bold;">Email:</td><td style="padding: 8px 0;">${advertisement.doctor?.email || 'N/A'}</td></tr>
                <tr><td style="padding: 8px 0; font-weight: bold;">Doctor ID:</td><td style="padding: 8px 0;">${advertisement.doctor?.id || 'N/A'}</td></tr>
              </table>
            </div>

            <!-- Advertisement Details Section -->
            <div style="background-color: #f3e5f5; padding: 25px; border-radius: 10px; margin-bottom: 25px; border-left: 5px solid #9c27b0;">
              <h3 style="margin-top: 0; color: #333; font-size: 18px;">📢 Advertisement Details</h3>
              <table style="width: 100%; border-collapse: collapse;">
                <tr><td style="padding: 8px 0; font-weight: bold; width: 30%;">Placement Area:</td><td style="padding: 8px 0;">${advertisement.selected_area || 'N/A'}</td></tr>
                <tr><td style="padding: 8px 0; font-weight: bold;">Type:</td><td style="padding: 8px 0;">${advertisement.type || 'N/A'}</td></tr>
                <tr><td style="padding: 8px 0; font-weight: bold;">Status:</td><td style="padding: 8px 0; background-color: #d4edda; color: #155724; padding: 4px 8px; border-radius: 4px; font-weight: bold;">${advertisement.status?.toUpperCase() || 'APPROVED'}</td></tr>
                ${advertisement.start_date ? `<tr><td style="padding: 8px 0; font-weight: bold;">Start Date:</td><td style="padding: 8px 0;">${new Date(advertisement.start_date).toLocaleDateString()}</td></tr>` : ''}
                ${advertisement.end_date ? `<tr><td style="padding: 8px 0; font-weight: bold;">End Date:</td><td style="padding: 8px 0;">${new Date(advertisement.end_date).toLocaleDateString()}</td></tr>` : ''}
              </table>
            </div>

            <!-- Payment Status Alert -->
            <div style="background-color: #d4edda; padding: 20px; border-radius: 10px; margin: 25px 0; border-left: 5px solid #28a745;">
              <h4 style="margin-top: 0; color: #155724;">✅ Payment Confirmed</h4>
              <p style="margin: 0; color: #155724;">This advertisement payment has been confirmed. The advertisement has been automatically approved and is ready to go live on the scheduled start date.</p>
            </div>

            <!-- Action Button -->
            <div style="text-align: center; margin: 30px 0;">
              <a href="${getFrontendUrlWithPath('/admin/advertisements')}" style="background-color: #007bff; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block;">View Advertisement Management</a>
            </div>

          </div>

          <!-- Footer -->
          <div style="background-color: #f8f9fa; padding: 20px; text-align: center; border-radius: 0 0 10px 10px; color: #666; font-size: 12px;">
            <p style="margin: 0;">This is an automated message from AestheticRxNetwork system.</p>
          </div>
        </div>
      `;

      console.log(`📧 Sending advertisement payment notification to ${recipientEmails.length} admin(s): ${recipientEmails.join(', ')}`);
      
      await this.sendEmail(
        recipientEmails,
        `💰 Advertisement Payment Received - ${advertisement.title}`,
        adminHtml,
        { isMarketing: false } // Transactional email to admins
      );
      console.log(`✅ Advertisement payment notification sent to admins`);
    } catch (error: unknown) {
      console.error('Failed to send advertisement payment confirmation:', error);
      throw error;
    }
  }

  /**
   * Send research reward notification for tier progress
   */
  async sendResearchRewardTierProgressNotification(
    doctor: Doctor,
    awardTitle: string,
    tierProgressBoost: number,
    currentProgress: number,
    newProgress: number
  ): Promise<void> {
    if (!this.isConfigured()) {
      console.log('❌ Gmail not configured, skipping research reward notification');
      return;
    }

    if (!doctor || !doctor.email) {
      console.error('❌ Doctor or doctor email is missing');
      return;
    }

    console.log(`📧 GmailService: Sending tier progress notification to ${doctor.email} for award: ${awardTitle}`);

    try {
      const subject = `✅ Your Award Has Been Delivered: ${awardTitle}`;
      
      const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Your Award Has Been Delivered</title>
        </head>
        <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f4f4f4;">
          <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 10px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
            
            <!-- Header -->
            <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 30px; text-align: center; color: white;">
              <h1 style="margin: 0; font-size: 28px; font-weight: bold;">✅ Your Award Has Been Delivered</h1>
              <p style="margin: 10px 0 0 0; font-size: 16px; opacity: 0.9;">Award: ${awardTitle}</p>
            </div>

            <!-- Main Content -->
            <div style="padding: 30px;">
              <h2 style="color: #333; margin-top: 0;">Dear Dr. ${doctor.doctor_name},</h2>
              
              <p style="color: #666; line-height: 1.6; font-size: 16px;">
                We are pleased to inform you that your research award <strong>"${awardTitle}"</strong> has been delivered and the benefits have been applied to your account.
              </p>

              <!-- Award Details -->
              <div style="background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%); padding: 25px; border-radius: 10px; margin: 25px 0; border-left: 5px solid #0ea5e9;">
                <h3 style="color: #0c4a6e; margin-top: 0; font-size: 20px;">🏆 Award Details</h3>
                <div style="margin: 15px 0;">
                  <p style="margin: 10px 0; color: #374151;">
                    <strong style="color: #1e40af;">Award:</strong> ${awardTitle}
                  </p>
                  <p style="margin: 10px 0; color: #374151;">
                    <strong style="color: #1e40af;">Tier Progress Boost:</strong> 
                    <span style="color: #059669; font-weight: bold; font-size: 18px;">+${tierProgressBoost}%</span>
                  </p>
                </div>
              </div>

              <!-- Progress Update -->
              <div style="background-color: #f9fafb; padding: 20px; border-radius: 10px; margin: 25px 0; border: 2px solid #e5e7eb;">
                <h3 style="color: #111827; margin-top: 0; font-size: 18px;">📊 Your Tier Progress</h3>
                <div style="display: flex; justify-content: space-between; align-items: center; margin: 15px 0;">
                  <span style="color: #6b7280; font-size: 14px;">Previous Progress:</span>
                  <span style="color: #374151; font-weight: 600; font-size: 16px;">${currentProgress.toFixed(1)}%</span>
                </div>
                <div style="display: flex; justify-content: space-between; align-items: center; margin: 15px 0;">
                  <span style="color: #059669; font-size: 14px; font-weight: 600;">New Progress:</span>
                  <span style="color: #059669; font-weight: bold; font-size: 18px;">${newProgress.toFixed(1)}%</span>
                </div>
                <div style="background-color: #e5e7eb; height: 8px; border-radius: 4px; margin-top: 15px; overflow: hidden;">
                  <div style="background: linear-gradient(90deg, #10b981 0%, #059669 100%); height: 100%; width: ${newProgress}%; transition: width 0.3s ease;"></div>
                </div>
              </div>

              <p style="color: #666; line-height: 1.6; font-size: 16px; margin-top: 25px;">
                Keep up the excellent work! Your research contributions are making a difference.
              </p>

              <!-- Action Button -->
              <div style="text-align: center; margin: 30px 0;">
                <a href="${getFrontendUrlWithPath('/research')}" 
                   style="background-color: #007bff; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block;">
                  View Research Papers
                </a>
              </div>

            </div>

            <!-- Footer -->
            <div style="background-color: #f8f9fa; padding: 20px; text-align: center; border-radius: 0 0 10px 10px; color: #666; font-size: 12px;">
              <p style="margin: 0;">This is an automated message from AestheticRxNetwork system.</p>
            </div>
          </div>
        </body>
        </html>
      `;

      await this.sendEmail(
        doctor.email,
        subject,
        htmlContent,
        { isMarketing: false, userId: doctor.id } // Transactional email
      );
      
      console.log(`✅ Research reward tier progress notification sent to ${doctor.email}`);
    } catch (error: unknown) {
      console.error('Failed to send research reward tier progress notification:', error);
      throw error;
    }
  }

  /**
   * Send research reward notification for bonus approvals
   */
  async sendResearchRewardBonusApprovalsNotification(
    doctor: Doctor,
    awardTitle: string,
    bonusApprovals: number,
    paperTitle: string
  ): Promise<void> {
    if (!this.isConfigured()) {
      console.log('❌ Gmail not configured, skipping research reward notification');
      return;
    }

    if (!doctor || !doctor.email) {
      console.error('❌ Doctor or doctor email is missing');
      return;
    }

    console.log(`📧 GmailService: Sending bonus approvals notification to ${doctor.email} for award: ${awardTitle}`);

    try {
      const subject = `✅ Your Award Has Been Delivered: ${awardTitle}`;
      
      const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Your Award Has Been Delivered</title>
        </head>
        <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f4f4f4;">
          <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 10px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
            
            <!-- Header -->
            <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 30px; text-align: center; color: white;">
              <h1 style="margin: 0; font-size: 28px; font-weight: bold;">✅ Your Award Has Been Delivered</h1>
              <p style="margin: 10px 0 0 0; font-size: 16px; opacity: 0.9;">Award: ${awardTitle}</p>
            </div>

            <!-- Main Content -->
            <div style="padding: 30px;">
              <h2 style="color: #333; margin-top: 0;">Dear Dr. ${doctor.doctor_name},</h2>
              
              <p style="color: #666; line-height: 1.6; font-size: 16px;">
                We are pleased to inform you that your research award <strong>"${awardTitle}"</strong> has been delivered and the benefits have been applied to your account.
              </p>

              <!-- Award Details -->
              <div style="background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%); padding: 25px; border-radius: 10px; margin: 25px 0; border-left: 5px solid #0ea5e9;">
                <h3 style="color: #0c4a6e; margin-top: 0; font-size: 20px;">🏆 Award Details</h3>
                <div style="margin: 15px 0;">
                  <p style="margin: 10px 0; color: #374151;">
                    <strong style="color: #1e40af;">Award:</strong> ${awardTitle}
                  </p>
                  <p style="margin: 10px 0; color: #374151;">
                    <strong style="color: #1e40af;">Bonus Approvals:</strong> 
                    <span style="color: #059669; font-weight: bold; font-size: 18px;">+${bonusApprovals}</span>
                  </p>
                  <p style="margin: 10px 0; color: #374151;">
                    <strong style="color: #1e40af;">Applied to Paper:</strong> ${paperTitle}
                  </p>
                </div>
              </div>

              <p style="color: #666; line-height: 1.6; font-size: 16px; margin-top: 25px;">
                ${bonusApprovals} bonus approval${bonusApprovals > 1 ? 's have' : ' has'} been added to your research paper "<strong>${paperTitle}</strong>".
              </p>
              
              ${bonusApprovals >= 100 ? `
              <div style="background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%); padding: 20px; border-radius: 10px; margin: 25px 0; border-left: 5px solid #f59e0b;">
                <h3 style="color: #92400e; margin-top: 0; font-size: 18px;">🌟 Boost Your Popularity!</h3>
                <p style="margin: 10px 0; color: #78350f; line-height: 1.6; font-size: 15px;">
                  With <strong>${bonusApprovals}+ bonus approvals</strong>, your research paper will gain significantly more visibility and popularity! This helps your work:
                </p>
                <ul style="margin: 15px 0; padding-left: 20px; color: #78350f; line-height: 1.8;">
                  <li>📈 Appear higher in search results and rankings</li>
                  <li>👥 Reach more doctors in the medical community</li>
                  <li>🏆 Gain recognition for your research contributions</li>
                  <li>⭐ Build your reputation as a leading researcher</li>
                </ul>
                <p style="margin: 15px 0 0 0; color: #78350f; font-weight: 600; font-size: 15px;">
                  More approvals = More visibility = More impact! Your research will be seen by more peers and help establish you as a thought leader in your field.
                </p>
              </div>
              ` : `
              <div style="background-color: #fef3c7; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #f59e0b;">
                <p style="margin: 0; color: #92400e; font-size: 14px;">
                  <strong>💡 Tip:</strong> These bonus approvals will help increase your paper's visibility and popularity, making it more likely to be seen and appreciated by other doctors in the community.
                </p>
              </div>
              `}

              <!-- Action Button -->
              <div style="text-align: center; margin: 30px 0;">
                <a href="${getFrontendUrlWithPath('/research')}" 
                   style="background-color: #007bff; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block;">
                  View Research Papers
                </a>
              </div>

            </div>

            <!-- Footer -->
            <div style="background-color: #f8f9fa; padding: 20px; text-align: center; border-radius: 0 0 10px 10px; color: #666; font-size: 12px;">
              <p style="margin: 0;">This is an automated message from AestheticRxNetwork system.</p>
            </div>
          </div>
        </body>
        </html>
      `;

      await this.sendEmail(
        doctor.email,
        subject,
        htmlContent,
        { isMarketing: false, userId: doctor.id } // Transactional email
      );
      
      console.log(`✅ Research reward bonus approvals notification sent to ${doctor.email}`);
    } catch (error: unknown) {
      console.error('Failed to send research reward bonus approvals notification:', error);
      throw error;
    }
  }

  /**
   * Send research reward notification for gift awards
   */
  async sendResearchRewardGiftNotification(
    doctor: Doctor,
    awardTitle: string,
    giftDescription: string
  ): Promise<void> {
    if (!this.isConfigured()) {
      console.log('❌ Gmail not configured, skipping research reward notification');
      return;
    }

    if (!doctor || !doctor.email) {
      console.error('❌ Doctor or doctor email is missing');
      return;
    }

    console.log(`📧 GmailService: Sending gift award notification to ${doctor.email} for award: ${awardTitle}`);

    try {
      const subject = `✅ Your Award Has Been Delivered: ${awardTitle}`;
      
      const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Your Award Has Been Delivered</title>
        </head>
        <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f4f4f4;">
          <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 10px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
            
            <!-- Header -->
            <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 30px; text-align: center; color: white;">
              <h1 style="margin: 0; font-size: 28px; font-weight: bold;">✅ Your Award Has Been Delivered</h1>
              <p style="margin: 10px 0 0 0; font-size: 16px; opacity: 0.9;">Award: ${awardTitle}</p>
            </div>

            <!-- Main Content -->
            <div style="padding: 30px;">
              <h2 style="color: #333; margin-top: 0;">Dear Dr. ${doctor.doctor_name},</h2>
              
              <p style="color: #666; line-height: 1.6; font-size: 16px;">
                We are pleased to inform you that your research award <strong>"${awardTitle}"</strong> has been delivered!
              </p>

              <!-- Award Details -->
              <div style="background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%); padding: 25px; border-radius: 10px; margin: 25px 0; border-left: 5px solid #0ea5e9;">
                <h3 style="color: #0c4a6e; margin-top: 0; font-size: 20px;">🎁 Gift Award Details</h3>
                <div style="margin: 15px 0;">
                  <p style="margin: 10px 0; color: #374151;">
                    <strong style="color: #1e40af;">Award:</strong> ${awardTitle}
                  </p>
                  <p style="margin: 10px 0; color: #374151;">
                    <strong style="color: #1e40af;">Gift Description:</strong> ${giftDescription}
                  </p>
                </div>
              </div>

              <p style="color: #666; line-height: 1.6; font-size: 16px; margin-top: 25px;">
                Your gift reward has been processed and will be delivered to you. Thank you for your outstanding research contributions!
              </p>

              <!-- Action Button -->
              <div style="text-align: center; margin: 30px 0;">
                <a href="${getFrontendUrlWithPath('/research')}" 
                   style="background-color: #007bff; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block;">
                  View Research Papers
                </a>
              </div>

            </div>

            <!-- Footer -->
            <div style="background-color: #f8f9fa; padding: 20px; text-align: center; border-radius: 0 0 10px 10px; color: #666; font-size: 12px;">
              <p style="margin: 0;">This is an automated message from AestheticRxNetwork system.</p>
            </div>
          </div>
        </body>
        </html>
      `;

      await this.sendEmail(
        doctor.email,
        subject,
        htmlContent,
        { isMarketing: false, userId: doctor.id } // Transactional email
      );
      
      console.log(`✅ Research reward gift notification sent to ${doctor.email}`);
    } catch (error: unknown) {
      console.error('Failed to send research reward gift notification:', error);
      throw error;
    }
  }
}

export { GmailService };
export default new GmailService();
