import { Request, Response } from 'express';
import { AppDataSource } from '../db/data-source';
import { Doctor } from '../models/Doctor';
import { In } from 'typeorm';
import gmailService from '../services/gmailService';

interface MessageRequest {
  userIds: string[];
  messageType: 'template' | 'custom';
  template?: {
    id: string;
    name: string;
    subject: string;
    content: string;
    whatsapp_content: string;
  };
  customMessage?: string;
  customSubject?: string;
  channels: {
    gmail: boolean;
    whatsapp: boolean;
  };
}

export const sendMessages = async (req: Request, res: Response): Promise<void> => {
  try {
    const { userIds, messageType, template, customMessage, customSubject, channels }: MessageRequest = req.body;

    console.log('📨 Received send-messages request:', { userIds: userIds?.length, messageType, channels });

    // Validate input
    if (!userIds || userIds.length === 0) {
      res.status(400).json({
        success: false,
        message: 'No users selected'
      });
      return;
    }

    if (!channels || (!channels.gmail && !channels.whatsapp)) {
      res.status(400).json({
        success: false,
        message: 'No messaging channels selected'
      });
      return;
    }

    if (messageType === 'template' && !template) {
      res.status(400).json({
        success: false,
        message: 'Template is required for template messages'
      });
      return;
    }

    if (messageType === 'custom' && (!customMessage || !customSubject)) {
      res.status(400).json({
        success: false,
        message: 'Custom message and subject are required for custom messages'
      });
      return;
    }

    // Get users from database
    const doctorRepository = AppDataSource.getRepository(Doctor);
    const users = await doctorRepository.find({
      where: { id: In(userIds) }
    });

    if (users.length === 0) {
      res.status(404).json({
        success: false,
        message: 'No users found'
      });
      return;
    }

    // Filter out unsubscribed users for marketing emails
    const usersToEmail = users.filter(user => !user.email_unsubscribed);
    const unsubscribedCount = users.length - usersToEmail.length;

    if (unsubscribedCount > 0) {
      console.log(`⚠️ Skipping ${unsubscribedCount} unsubscribed users`);
    }

    // Return immediately - process emails in background
    res.status(200).json({
      success: true,
      message: `Processing ${usersToEmail.length} messages in the background${unsubscribedCount > 0 ? ` (${unsubscribedCount} unsubscribed users skipped)` : ''}`,
      data: {
        queuedCount: usersToEmail.length,
        totalUsers: users.length,
        unsubscribedCount,
        status: 'processing'
      }
    });

    // Process emails in background (non-blocking)
    processEmailsInBackground(usersToEmail, messageType, template, customMessage, customSubject, channels).catch(err => {
      console.error('❌ Background email processing error:', err);
    });

  } catch (error: unknown) {
    console.error('Error sending messages:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to send messages'
    });
  }
};

// Background email processing function
async function processEmailsInBackground(
  usersToEmail: Doctor[],
  messageType: 'template' | 'custom',
  template: MessageRequest['template'],
  customMessage: string | undefined,
  customSubject: string | undefined,
  channels: { gmail: boolean; whatsapp: boolean }
): Promise<void> {
  console.log(`📧 Starting background email processing for ${usersToEmail.length} users...`);
  
  let sentCount = 0;
  const errors: string[] = [];

  // SPAM REDUCTION: Send emails in batches with delays for bulk messages
  const BATCH_SIZE = parseInt(process.env.EMAIL_BATCH_SIZE || '10', 10);
  const DELAY_BETWEEN_EMAILS = parseInt(process.env.EMAIL_DELAY_MS || '2000', 10);
  const DELAY_BETWEEN_BATCHES = parseInt(process.env.EMAIL_BATCH_DELAY_MS || '10000', 10);
  const useBatching = usersToEmail.length > 5; // Use batching for more than 5 users

  if (useBatching) {
    console.log(`📧 Sending ${usersToEmail.length} messages in batches of ${BATCH_SIZE}`);
    
    // Split users into batches
    const batches: typeof usersToEmail[] = [];
    for (let i = 0; i < usersToEmail.length; i += BATCH_SIZE) {
      batches.push(usersToEmail.slice(i, i + BATCH_SIZE));
    }

    // Process each batch
    for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
      const batch = batches[batchIndex];
      if (!batch || batch.length === 0) continue;
      
      console.log(`📤 Processing batch ${batchIndex + 1}/${batches.length} (${batch.length} emails)...`);

      for (let userIndex = 0; userIndex < batch.length; userIndex++) {
        const user = batch[userIndex];
        if (!user) continue;
        
        try {
          let subject = '';
          let content = '';
          let whatsappContent = '';

          if (messageType === 'template' && template) {
            subject = replaceTemplateVariables(template.subject, user);
            content = replaceTemplateVariables(template.content, user);
            whatsappContent = replaceTemplateVariables(template.whatsapp_content, user);
          } else if (messageType === 'custom') {
            subject = customSubject || '';
            content = customMessage || '';
            whatsappContent = customMessage || '';
          }

          // Send Gmail message (marketing emails include unsubscribe link)
          if (channels.gmail && user.email) {
            try {
              await gmailService.sendEmail(user.email, subject, content, {
                isMarketing: true,
                userId: user.id
              });
              sentCount++;
              console.log(`  ✅ Email ${userIndex + 1}/${batch.length} sent to ${user.email}`);
            } catch (error: unknown) {
              console.error(`  ❌ Failed to send Gmail to ${user.email}:`, error);
              errors.push(`Failed to send Gmail to ${user.email}`);
            }
          }

          // Delay between emails (except for the last email in batch)
          if (userIndex < batch.length - 1) {
            await new Promise(resolve => setTimeout(resolve, DELAY_BETWEEN_EMAILS));
          }
        } catch (error: unknown) {
          console.error(`Error processing user ${user.email || 'unknown'}:`, error);
          errors.push(`Error processing user ${user.email || 'unknown'}`);
        }
      }

      // Delay between batches (except for the last batch)
      if (batchIndex < batches.length - 1) {
        console.log(`⏳ Waiting ${DELAY_BETWEEN_BATCHES / 1000}s before next batch...`);
        await new Promise(resolve => setTimeout(resolve, DELAY_BETWEEN_BATCHES));
      }
    }
  } else {
    // For small batches (5 or fewer), send immediately without delays
    for (const user of usersToEmail) {
      try {
        let subject = '';
        let content = '';
        let whatsappContent = '';

        if (messageType === 'template' && template) {
          subject = replaceTemplateVariables(template.subject, user);
          content = replaceTemplateVariables(template.content, user);
          whatsappContent = replaceTemplateVariables(template.whatsapp_content, user);
        } else if (messageType === 'custom') {
          subject = customSubject || '';
          content = customMessage || '';
          whatsappContent = customMessage || '';
        }

        // Send Gmail message (marketing emails include unsubscribe link)
        if (channels.gmail && user.email) {
          try {
            await gmailService.sendEmail(user.email, subject, content, {
              isMarketing: true,
              userId: user.id
            });
            sentCount++;
            console.log(`✅ Gmail sent to ${user.email}`);
          } catch (error: unknown) {
            console.error(`❌ Failed to send Gmail to ${user.email}:`, error);
            errors.push(`Failed to send Gmail to ${user.email}`);
          }
        }

        // Send WhatsApp message (placeholder for now)
        if (channels.whatsapp && user.whatsapp) {
          try {
            // TODO: Implement WhatsApp Business API integration
            console.log(`WhatsApp message would be sent to ${user.whatsapp}: ${whatsappContent}`);
          } catch (error: unknown) {
            console.error(`Failed to send WhatsApp to ${user.whatsapp}:`, error);
            errors.push(`Failed to send WhatsApp to ${user.whatsapp}`);
          }
        }
      } catch (error: unknown) {
        console.error(`Error processing user ${user.email}:`, error);
        errors.push(`Error processing user ${user.email}`);
      }
    }
  }

  console.log(`📧 Background email processing complete: ${sentCount} sent, ${errors.length} errors`);
  if (errors.length > 0) {
    console.log('📧 Errors:', errors);
  }
}

// Helper function to replace template variables
const replaceTemplateVariables = (content: string, user: Doctor): string => {
  return content
    .replace(/\{\{doctor_name\}\}/g, user.doctor_name || 'Doctor')
    .replace(/\{\{clinic_name\}\}/g, user.clinic_name || 'Clinic')
    .replace(/\{\{tier_progress\}\}/g, (user.tier_progress || 0).toString())
    .replace(/\{\{current_sales\}\}/g, (user.current_sales || 0).toLocaleString())
    .replace(/\{\{email\}\}/g, user.email || '')
    .replace(/\{\{whatsapp\}\}/g, user.whatsapp || '');
};

// Get users with tier progress information
export const getUsersWithTierProgress = async (req: Request, res: Response): Promise<void> => {
  try {
    const doctorRepository = AppDataSource.getRepository(Doctor);
    
    // Get all approved users with tier information
    const users = await doctorRepository.find({
      where: { is_approved: true },
      select: [
        'id', 'email', 'doctor_name', 'clinic_name', 'whatsapp',
        'tier', 'tier_progress', 'current_sales'
      ]
    });

    // Calculate next tier and remaining amount for each user
    const usersWithProgress = users.map(user => {
      const tierThresholds = {
        'Bronze': 0,
        'Silver': 50000,
        'Gold': 150000,
        'Platinum': 300000,
        'Diamond': 500000
      };

      const tiers = ['Bronze', 'Silver', 'Gold', 'Platinum', 'Diamond'];
      const currentTierIndex = tiers.indexOf(user.tier || 'Bronze');
      const nextTier = currentTierIndex < tiers.length - 1 ? tiers[currentTierIndex + 1] : null;
      const nextTierThreshold = nextTier ? tierThresholds[nextTier as keyof typeof tierThresholds] : 0;
      const remainingAmount = nextTier ? Math.max(0, nextTierThreshold - (user.current_sales || 0)) : 0;

      return {
        ...user,
        next_tier: nextTier,
        remaining_amount: remainingAmount
      };
    });

    res.status(200).json({
      success: true,
      data: usersWithProgress
    });

  } catch (error: unknown) {
    console.error('Error getting users with tier progress:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get users with tier progress'
    });
  }
};
