/**
 * Email tracking service
 * Tracks email delivery status, opens, clicks, bounces, etc.
 */

import { EmailDelivery, EmailStatus, EmailType } from '../models/EmailDelivery';
import { AppDataSource } from '../db/data-source';

/**
 * Create a new email delivery record
 */
export async function createEmailDeliveryRecord(
  recipientEmail: string,
  subject: string,
  emailType: EmailType,
  recipientId?: string,
  campaignId?: string
): Promise<EmailDelivery> {
  const emailDeliveryRepository = AppDataSource.getRepository(EmailDelivery);

  const emailDelivery = emailDeliveryRepository.create({
    recipient_email: recipientEmail,
    subject,
    email_type: emailType,
    status: 'pending',
    recipient_id: recipientId,
    campaign_id: campaignId,
    retry_count: 0,
  });

  return await emailDeliveryRepository.save(emailDelivery);
}

/**
 * Update email delivery status
 */
export async function updateEmailDeliveryStatus(
  emailDeliveryId: string,
  status: EmailStatus,
  errorMessage?: string
): Promise<void> {
  const emailDeliveryRepository = AppDataSource.getRepository(EmailDelivery);

  const emailDelivery = await emailDeliveryRepository.findOne({
    where: { id: emailDeliveryId }
  });

  if (!emailDelivery) {
    console.error(`Email delivery record not found: ${emailDeliveryId}`);
    return;
  }

  emailDelivery.status = status;
  emailDelivery.error_message = errorMessage;

  switch (status) {
    case 'sent':
      emailDelivery.sent_at = new Date();
      break;
    case 'delivered':
      emailDelivery.delivered_at = new Date();
      break;
    case 'bounced':
      emailDelivery.bounced_at = new Date();
      emailDelivery.bounce_reason = errorMessage;
      break;
    case 'failed':
      emailDelivery.failed_at = new Date();
      break;
  }

  await emailDeliveryRepository.save(emailDelivery);
}

/**
 * Track email open
 */
export async function trackEmailOpen(emailDeliveryId: string): Promise<void> {
  const emailDeliveryRepository = AppDataSource.getRepository(EmailDelivery);

  const emailDelivery = await emailDeliveryRepository.findOne({
    where: { id: emailDeliveryId }
  });

  if (!emailDelivery) {
    console.error(`Email delivery record not found: ${emailDeliveryId}`);
    return;
  }

  if (!emailDelivery.is_opened) {
    emailDelivery.is_opened = true;
    emailDelivery.opened_at = new Date();
    await emailDeliveryRepository.save(emailDelivery);
  }
}

/**
 * Track email click
 */
export async function trackEmailClick(emailDeliveryId: string): Promise<void> {
  const emailDeliveryRepository = AppDataSource.getRepository(EmailDelivery);

  const emailDelivery = await emailDeliveryRepository.findOne({
    where: { id: emailDeliveryId }
  });

  if (!emailDelivery) {
    console.error(`Email delivery record not found: ${emailDeliveryId}`);
    return;
  }

  if (!emailDelivery.is_clicked) {
    emailDelivery.is_clicked = true;
    emailDelivery.clicked_at = new Date();
    await emailDeliveryRepository.save(emailDelivery);
  }
}

/**
 * Get email delivery statistics
 */
export interface EmailStats {
  total: number;
  sent: number;
  delivered: number;
  failed: number;
  bounced: number;
  pending: number;
  opened: number;
  clicked: number;
  deliveryRate: number;
  openRate: number;
  clickRate: number;
  bounceRate: number;
}

export async function getEmailStats(
  startDate?: Date,
  endDate?: Date,
  emailType?: EmailType
): Promise<EmailStats> {
  const emailDeliveryRepository = AppDataSource.getRepository(EmailDelivery);

  console.log('📊 Getting email stats from database:', { startDate, endDate, emailType });

  const queryBuilder = emailDeliveryRepository.createQueryBuilder('email');

  if (startDate) {
    queryBuilder.andWhere('email.created_at >= :startDate', { startDate });
  }
  if (endDate) {
    queryBuilder.andWhere('email.created_at <= :endDate', { endDate });
  }
  if (emailType) {
    queryBuilder.andWhere('email.email_type = :emailType', { emailType });
  }

  const total = await queryBuilder.getCount();
  console.log('📊 Total emails found:', total);

  // Reset query builder for each count
  const sentQuery = emailDeliveryRepository.createQueryBuilder('email');
  if (startDate) sentQuery.andWhere('email.created_at >= :startDate', { startDate });
  if (endDate) sentQuery.andWhere('email.created_at <= :endDate', { endDate });
  if (emailType) sentQuery.andWhere('email.email_type = :emailType', { emailType });
  const sent = await sentQuery.andWhere('email.status = :status', { status: 'sent' }).getCount();

  const deliveredQuery = emailDeliveryRepository.createQueryBuilder('email');
  if (startDate) deliveredQuery.andWhere('email.created_at >= :startDate', { startDate });
  if (endDate) deliveredQuery.andWhere('email.created_at <= :endDate', { endDate });
  if (emailType) deliveredQuery.andWhere('email.email_type = :emailType', { emailType });
  const delivered = await deliveredQuery.andWhere('email.status = :status', { status: 'delivered' }).getCount();

  const failedQuery = emailDeliveryRepository.createQueryBuilder('email');
  if (startDate) failedQuery.andWhere('email.created_at >= :startDate', { startDate });
  if (endDate) failedQuery.andWhere('email.created_at <= :endDate', { endDate });
  if (emailType) failedQuery.andWhere('email.email_type = :emailType', { emailType });
  const failed = await failedQuery.andWhere('email.status = :status', { status: 'failed' }).getCount();

  const bouncedQuery = emailDeliveryRepository.createQueryBuilder('email');
  if (startDate) bouncedQuery.andWhere('email.created_at >= :startDate', { startDate });
  if (endDate) bouncedQuery.andWhere('email.created_at <= :endDate', { endDate });
  if (emailType) bouncedQuery.andWhere('email.email_type = :emailType', { emailType });
  const bounced = await bouncedQuery.andWhere('email.status = :status', { status: 'bounced' }).getCount();

  const pendingQuery = emailDeliveryRepository.createQueryBuilder('email');
  if (startDate) pendingQuery.andWhere('email.created_at >= :startDate', { startDate });
  if (endDate) pendingQuery.andWhere('email.created_at <= :endDate', { endDate });
  if (emailType) pendingQuery.andWhere('email.email_type = :emailType', { emailType });
  const pending = await pendingQuery.andWhere('email.status = :status', { status: 'pending' }).getCount();

  const openedQuery = emailDeliveryRepository.createQueryBuilder('email');
  if (startDate) openedQuery.andWhere('email.created_at >= :startDate', { startDate });
  if (endDate) openedQuery.andWhere('email.created_at <= :endDate', { endDate });
  if (emailType) openedQuery.andWhere('email.email_type = :emailType', { emailType });
  const opened = await openedQuery.andWhere('email.is_opened = :isOpened', { isOpened: true }).getCount();

  const clickedQuery = emailDeliveryRepository.createQueryBuilder('email');
  if (startDate) clickedQuery.andWhere('email.created_at >= :startDate', { startDate });
  if (endDate) clickedQuery.andWhere('email.created_at <= :endDate', { endDate });
  if (emailType) clickedQuery.andWhere('email.email_type = :emailType', { emailType });
  const clicked = await clickedQuery.andWhere('email.is_clicked = :isClicked', { isClicked: true }).getCount();

  const deliveryRate = total > 0 ? (delivered / total) * 100 : 0;
  const openRate = delivered > 0 ? (opened / delivered) * 100 : 0;
  const clickRate = delivered > 0 ? (clicked / delivered) * 100 : 0;
  const bounceRate = total > 0 ? (bounced / total) * 100 : 0;

  const stats = {
    total,
    sent,
    delivered,
    failed,
    bounced,
    pending,
    opened,
    clicked,
    deliveryRate: Math.round(deliveryRate * 100) / 100,
    openRate: Math.round(openRate * 100) / 100,
    clickRate: Math.round(clickRate * 100) / 100,
    bounceRate: Math.round(bounceRate * 100) / 100,
  };

  console.log('📊 Email stats calculated:', stats);
  return stats;
}

