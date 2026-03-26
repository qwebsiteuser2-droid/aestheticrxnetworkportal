/**
 * Email retry service with exponential backoff
 * Handles retrying failed emails with increasing delays
 */

import { EmailDelivery, EmailStatus } from '../models/EmailDelivery';
import { AppDataSource } from '../db/data-source';
import gmailService from './gmailService';

interface RetryOptions {
  maxRetries?: number;
  initialDelayMs?: number;
  maxDelayMs?: number;
  backoffMultiplier?: number;
}

const DEFAULT_OPTIONS: Required<RetryOptions> = {
  maxRetries: 3,
  initialDelayMs: 60000, // 1 minute
  maxDelayMs: 900000, // 15 minutes
  backoffMultiplier: 2,
};

/**
 * Calculate delay for retry attempt using exponential backoff
 */
function calculateRetryDelay(attempt: number, options: Required<RetryOptions>): number {
  const delay = options.initialDelayMs * Math.pow(options.backoffMultiplier, attempt - 1);
  return Math.min(delay, options.maxDelayMs);
}

/**
 * Retry sending a failed email
 */
export async function retryFailedEmail(
  emailDeliveryId: string,
  recipientEmail: string,
  subject: string,
  htmlContent: string,
  options?: RetryOptions
): Promise<boolean> {
  const retryOptions = { ...DEFAULT_OPTIONS, ...options };
  const emailDeliveryRepository = AppDataSource.getRepository(EmailDelivery);

  try {
    const emailDelivery = await emailDeliveryRepository.findOne({
      where: { id: emailDeliveryId }
    });

    if (!emailDelivery) {
      console.error(`Email delivery record not found: ${emailDeliveryId}`);
      return false;
    }

    // Check if max retries exceeded
    if (emailDelivery.retry_count >= retryOptions.maxRetries) {
      console.log(`Max retries (${retryOptions.maxRetries}) exceeded for email ${emailDeliveryId}`);
      emailDelivery.status = 'failed';
      emailDelivery.failed_at = new Date();
      emailDelivery.error_message = `Failed after ${retryOptions.maxRetries} retry attempts`;
      await emailDeliveryRepository.save(emailDelivery);
      return false;
    }

    // Calculate delay for this retry
    const delay = calculateRetryDelay(emailDelivery.retry_count + 1, retryOptions);
    console.log(`Retrying email ${emailDeliveryId} (attempt ${emailDelivery.retry_count + 1}/${retryOptions.maxRetries}) after ${delay}ms delay`);

    // Wait for the calculated delay
    await new Promise(resolve => setTimeout(resolve, delay));

    // Attempt to send the email
    try {
      await gmailService.sendEmail(
        recipientEmail,
        subject,
        htmlContent,
        {
          isMarketing: emailDelivery.email_type === 'marketing' || emailDelivery.email_type === 'campaign' || emailDelivery.email_type === 'bulk',
          userId: emailDelivery.recipient_id,
        }
      );

      // Success - update email delivery record
      emailDelivery.status = 'sent';
      emailDelivery.sent_at = new Date();
      emailDelivery.retry_count += 1;
      await emailDeliveryRepository.save(emailDelivery);

      console.log(`✅ Email ${emailDeliveryId} sent successfully on retry attempt ${emailDelivery.retry_count}`);
      return true;
    } catch (error: unknown) {
      // Failed again - update retry count
      emailDelivery.retry_count += 1;
      emailDelivery.error_message = error instanceof Error ? error.message : 'Unknown error';
      
      // If this was the last retry, mark as failed
      if (emailDelivery.retry_count >= retryOptions.maxRetries) {
        emailDelivery.status = 'failed';
        emailDelivery.failed_at = new Date();
        emailDelivery.error_message = `Failed after ${retryOptions.maxRetries} retry attempts: ${emailDelivery.error_message}`;
      } else {
        emailDelivery.status = 'pending'; // Will be retried again
      }

      await emailDeliveryRepository.save(emailDelivery);
      console.error(`❌ Email ${emailDeliveryId} failed on retry attempt ${emailDelivery.retry_count}:`, error);
      return false;
    }
  } catch (error: unknown) {
    console.error(`Error retrying email ${emailDeliveryId}:`, error);
    return false;
  }
}

/**
 * Process all pending emails that need retry
 */
export async function processPendingRetries(): Promise<void> {
  const emailDeliveryRepository = AppDataSource.getRepository(EmailDelivery);

  try {
    // Find all pending emails that have been retried at least once
    const pendingEmails = await emailDeliveryRepository.find({
      where: {
        status: 'pending',
      },
      order: {
        created_at: 'ASC',
      },
    });

    // Filter emails that are ready for retry (based on retry count and time)
    const now = new Date();
    const emailsToRetry = pendingEmails.filter(email => {
      if (email.retry_count === 0) {
        // First retry - wait at least 1 minute
        const timeSinceCreation = now.getTime() - email.created_at.getTime();
        return timeSinceCreation >= 60000; // 1 minute
      } else if (email.retry_count === 1) {
        // Second retry - wait at least 5 minutes
        const timeSinceLastUpdate = now.getTime() - (email.updated_at?.getTime() || email.created_at.getTime());
        return timeSinceLastUpdate >= 300000; // 5 minutes
      } else if (email.retry_count === 2) {
        // Third retry - wait at least 15 minutes
        const timeSinceLastUpdate = now.getTime() - (email.updated_at?.getTime() || email.created_at.getTime());
        return timeSinceLastUpdate >= 900000; // 15 minutes
      }
      return false;
    });

    console.log(`Found ${emailsToRetry.length} emails ready for retry`);

    // Process retries (limit to 10 at a time to avoid overwhelming the system)
    const emailsToProcess = emailsToRetry.slice(0, 10);
    for (const email of emailsToProcess) {
      // Note: We need the original email content to retry
      // For now, we'll just mark them for manual review if content is not stored
      // In a full implementation, you'd store the email content in the EmailDelivery model
      console.log(`Email ${email.id} is ready for retry but requires original content`);
    }
  } catch (error: unknown) {
    console.error('Error processing pending retries:', error);
  }
}

