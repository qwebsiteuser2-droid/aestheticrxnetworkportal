import { Request, Response } from 'express';
import { getEmailStats, EmailStats } from '../services/emailTrackingService';
import { AppDataSource } from '../db/data-source';
import { EmailDelivery, EmailType, EmailStatus } from '../models/EmailDelivery';

/**
 * Get email delivery statistics dashboard data
 */
export const getEmailMonitoringStats = async (req: Request, res: Response): Promise<void> => {
  try {
    const { startDate, endDate, emailType } = req.query;

    console.log('📧 Email monitoring stats request:', { startDate, endDate, emailType });

    const start = startDate ? new Date(startDate as string) : undefined;
    const end = endDate ? new Date(endDate as string) : undefined;
    const type = emailType as EmailType | undefined;

    // Get overall stats (will return zeros if no data)
    let overallStats: EmailStats;
    try {
      overallStats = await getEmailStats(start, end, type);
      console.log('✅ Overall stats retrieved:', overallStats);
    } catch (error) {
      console.error('❌ Error getting email stats, returning empty data:', error);
      // Return empty stats if there's an error
      overallStats = {
        total: 0,
        sent: 0,
        delivered: 0,
        failed: 0,
        bounced: 0,
        pending: 0,
        opened: 0,
        clicked: 0,
        deliveryRate: 0,
        openRate: 0,
        clickRate: 0,
        bounceRate: 0,
      };
    }

    // Get stats by type (only if not filtered by type)
    const emptyStats: EmailStats = {
      total: 0,
      sent: 0,
      delivered: 0,
      failed: 0,
      bounced: 0,
      pending: 0,
      opened: 0,
      clicked: 0,
      deliveryRate: 0,
      openRate: 0,
      clickRate: 0,
      bounceRate: 0,
    };

    let marketingStats: EmailStats;
    let transactionalStats: EmailStats;
    let campaignStats: EmailStats;
    let otpStats: EmailStats;

    if (type) {
      // If filtered by type, only get that type's stats
      try {
        const filteredStats = await getEmailStats(start, end, type);
        marketingStats = type === 'marketing' ? filteredStats : emptyStats;
        transactionalStats = type === 'transactional' ? filteredStats : emptyStats;
        campaignStats = type === 'campaign' ? filteredStats : emptyStats;
        otpStats = type === 'otp' ? filteredStats : emptyStats;
      } catch (error) {
        console.error('Error getting filtered email stats, returning empty data:', error);
        marketingStats = emptyStats;
        transactionalStats = emptyStats;
        campaignStats = emptyStats;
        otpStats = emptyStats;
      }
    } else {
      // Get all types
      try {
        marketingStats = await getEmailStats(start, end, 'marketing');
        transactionalStats = await getEmailStats(start, end, 'transactional');
        campaignStats = await getEmailStats(start, end, 'campaign');
        otpStats = await getEmailStats(start, end, 'otp');
      } catch (error) {
        console.error('Error getting email stats by type, returning empty data:', error);
        marketingStats = emptyStats;
        transactionalStats = emptyStats;
        campaignStats = emptyStats;
        otpStats = emptyStats;
      }
    }

    // Get recent email deliveries
    let recentEmails: EmailDelivery[] = [];
    let failedEmails: EmailDelivery[] = [];

    try {
      const emailDeliveryRepository = AppDataSource.getRepository(EmailDelivery);
      
      // First, check total count in database
      const totalInDb = await emailDeliveryRepository.count();
      console.log('📧 Total email deliveries in database:', totalInDb);
      
      let recentEmailsQuery = emailDeliveryRepository.createQueryBuilder('email')
        .leftJoinAndSelect('email.recipient', 'recipient')
        .orderBy('email.created_at', 'DESC')
        .take(50);

      if (start) {
        recentEmailsQuery = recentEmailsQuery.andWhere('email.created_at >= :startDate', { startDate: start });
      }
      if (end) {
        recentEmailsQuery = recentEmailsQuery.andWhere('email.created_at <= :endDate', { endDate: end });
      }
      if (type) {
        recentEmailsQuery = recentEmailsQuery.andWhere('email.email_type = :emailType', { emailType: type });
      }

      recentEmails = await recentEmailsQuery.getMany();
      console.log('📧 Recent emails fetched:', recentEmails.length);

      // Get failed emails that need retry
      failedEmails = await emailDeliveryRepository
        .createQueryBuilder('email')
        .where('email.status = :status', { status: 'failed' })
        .andWhere('email.retry_count < :maxRetries', { maxRetries: 3 })
        .orderBy('email.created_at', 'DESC')
        .take(20)
        .getMany();
      console.log('📧 Failed emails fetched:', failedEmails.length);
    } catch (error) {
      console.error('❌ Error fetching email deliveries, returning empty arrays:', error);
      // Return empty arrays if there's an error
      recentEmails = [];
      failedEmails = [];
    }

    res.json({
      success: true,
      data: {
        overall: overallStats,
        byType: {
          marketing: marketingStats,
          transactional: transactionalStats,
          campaign: campaignStats,
          otp: otpStats,
        },
        recentEmails: recentEmails.map(email => ({
          id: email.id,
          recipientEmail: email.recipient_email,
          subject: email.subject,
          status: email.status,
          emailType: email.email_type,
          sentAt: email.sent_at,
          deliveredAt: email.delivered_at,
          failedAt: email.failed_at,
          errorMessage: email.error_message,
          retryCount: email.retry_count,
          isOpened: email.is_opened,
          isClicked: email.is_clicked,
          createdAt: email.created_at,
          orderNumber: email.campaign_id, // campaign_id stores order number/ID for order emails
        })),
        failedEmails: failedEmails.map(email => ({
          id: email.id,
          recipientEmail: email.recipient_email,
          subject: email.subject,
          errorMessage: email.error_message,
          retryCount: email.retry_count,
          createdAt: email.created_at,
        })),
      },
    });
  } catch (error: unknown) {
    console.error('Error getting email monitoring stats:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get email monitoring statistics',
    });
  }
};

/**
 * Get email delivery details by ID
 */
export const getEmailDeliveryDetails = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const emailDeliveryRepository = AppDataSource.getRepository(EmailDelivery);
    const email = await emailDeliveryRepository.findOne({
      where: { id },
      relations: ['recipient'],
    });

    if (!email) {
      res.status(404).json({
        success: false,
        message: 'Email delivery record not found',
      });
      return;
    }

    res.json({
      success: true,
      data: {
        id: email.id,
        recipientEmail: email.recipient_email,
        recipientName: email.recipient?.doctor_name,
        subject: email.subject,
        status: email.status,
        emailType: email.email_type,
        sentAt: email.sent_at,
        deliveredAt: email.delivered_at,
        bouncedAt: email.bounced_at,
        failedAt: email.failed_at,
        errorMessage: email.error_message,
        bounceReason: email.bounce_reason,
        retryCount: email.retry_count,
        isOpened: email.is_opened,
        openedAt: email.opened_at,
        isClicked: email.is_clicked,
        clickedAt: email.clicked_at,
        campaignId: email.campaign_id,
        createdAt: email.created_at,
        updatedAt: email.updated_at,
      },
    });
  } catch (error: unknown) {
    console.error('Error getting email delivery details:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get email delivery details',
    });
  }
};

