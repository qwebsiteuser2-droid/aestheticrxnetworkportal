import { Request, Response } from 'express';
import { AppDataSource } from '../db/data-source';
import { Doctor } from '../models/Doctor';
import { AutoEmailConfig } from '../models/AutoEmailConfig';
import gmailService from '../services/gmailService';

export const setupAutoEmail = async (req: Request, res: Response): Promise<void> => {
  try {
    const { subject, content, durationHours, enabled, channels } = req.body;

    if (!subject || !content) {
      res.status(400).json({ message: 'Subject and content are required' });
      return;
    }

    if (durationHours < 1) {
      res.status(400).json({ message: 'Duration must be at least 1 hour' });
      return;
    }

    const configRepository = AppDataSource.getRepository(AutoEmailConfig);
    const configId = 'auto-email-config';

    // Find existing config
    let config = await configRepository.findOne({
      where: { config_id: configId }
    });

    if (config) {
      // Update existing config
      config.subject = subject;
      config.content = content;
      config.duration_hours = durationHours;
      config.enabled = enabled;
      config.next_send = enabled ? new Date(Date.now() + (durationHours * 60 * 60 * 1000)) : undefined;
    } else {
      // Create new config
      config = configRepository.create({
        config_id: configId,
        subject,
        content,
        duration_hours: durationHours,
        enabled,
        next_send: enabled ? new Date(Date.now() + (durationHours * 60 * 60 * 1000)) : undefined,
      });
    }

    await configRepository.save(config);

    console.log('Auto email config saved to database:', config);

    res.json({ 
      message: `Automatic email ${enabled ? 'enabled' : 'disabled'} successfully`,
      config: {
        subject: config.subject,
        durationHours: config.duration_hours,
        enabled: config.enabled,
        nextSend: config.next_send,
        lastSent: config.last_sent
      }
    });
  } catch (error: unknown) {
    console.error('Error setting up auto email:', error);
    res.status(500).json({ message: 'Failed to setup automatic email' });
  }
};

export const getAutoEmailConfig = async (req: Request, res: Response): Promise<void> => {
  try {
    const configRepository = AppDataSource.getRepository(AutoEmailConfig);
    const config = await configRepository.findOne({
      where: { config_id: 'auto-email-config' }
    });
    
    if (!config) {
      res.json({ 
        config: null,
        message: 'No automatic email configuration found'
      });
      return;
    }

    res.json({ 
      config: {
        subject: config.subject,
        content: config.content,
        durationHours: config.duration_hours,
        enabled: config.enabled,
        lastSent: config.last_sent,
        nextSend: config.next_send
      }
    });
  } catch (error: unknown) {
    console.error('Error getting auto email config:', error);
    res.status(500).json({ message: 'Failed to get automatic email configuration' });
  }
};

export const sendAutoEmails = async () => {
  try {
    const configRepository = AppDataSource.getRepository(AutoEmailConfig);
    const config = await configRepository.findOne({
      where: { config_id: 'auto-email-config' }
    });
    
    if (!config || !config.enabled) {
      console.log('Auto email not enabled or no config found');
      return;
    }

    const now = new Date();
    if (config.next_send && now < config.next_send) {
      console.log('Auto email not due yet. Next send:', config.next_send);
      return;
    }

    console.log('Sending automatic emails...');

    // Get all users (excluding unsubscribed users)
    const userRepository = AppDataSource.getRepository(Doctor);
    const users = await userRepository.find({
      where: { 
        is_approved: true, 
        is_deactivated: false,
        email_unsubscribed: false // Filter out unsubscribed users
      },
      select: ['id', 'email', 'doctor_name', 'clinic_name']
    });

    if (users.length === 0) {
      console.log('No users found for auto email (or all users unsubscribed)');
      return;
    }

    let sentCount = 0;
    let errorCount = 0;

    // SPAM REDUCTION: Send emails in batches with delays
    // This prevents triggering spam filters and Gmail rate limits
    const BATCH_SIZE = parseInt(process.env.EMAIL_BATCH_SIZE || '10', 10); // Emails per batch
    const DELAY_BETWEEN_EMAILS = parseInt(process.env.EMAIL_DELAY_MS || '2000', 10); // 2 seconds between emails
    const DELAY_BETWEEN_BATCHES = parseInt(process.env.EMAIL_BATCH_DELAY_MS || '10000', 10); // 10 seconds between batches

    console.log(`📧 Starting batch email campaign: ${users.length} users, ${BATCH_SIZE} per batch`);

    // Split users into batches
    const batches: typeof users[] = [];
    for (let i = 0; i < users.length; i += BATCH_SIZE) {
      batches.push(users.slice(i, i + BATCH_SIZE));
    }

    console.log(`📦 Created ${batches.length} batches`);

    // Process each batch
    for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
      const batch = batches[batchIndex];
      if (!batch || batch.length === 0) continue;
      
      console.log(`📤 Processing batch ${batchIndex + 1}/${batches.length} (${batch.length} emails)...`);

      // Send emails in current batch with delay between each
      for (let userIndex = 0; userIndex < batch.length; userIndex++) {
        const user = batch[userIndex];
        if (!user) continue;
        
        try {
          const personalizedContent = config.content
            .replace(/\{\{doctor_name\}\}/g, user.doctor_name || 'Doctor')
            .replace(/\{\{clinic_name\}\}/g, user.clinic_name || 'Clinic')
            .replace(/\{\{email\}\}/g, user.email || '');

          await gmailService.sendEmail(
            user.email || '',
            config.subject,
            personalizedContent,
            {
              isMarketing: true,
              userId: user.id
            }
          );

          sentCount++;
          console.log(`  ✅ Email ${userIndex + 1}/${batch.length} sent to: ${user.email}`);

          // Delay between emails (except for the last email in batch)
          if (userIndex < batch.length - 1) {
            await new Promise(resolve => setTimeout(resolve, DELAY_BETWEEN_EMAILS));
          }
        } catch (error: unknown) {
          errorCount++;
          console.error(`  ❌ Failed to send email to ${user.email}:`, error);
          // Continue with next email even if one fails
        }
      }

      // Delay between batches (except for the last batch)
      if (batchIndex < batches.length - 1) {
        console.log(`⏳ Waiting ${DELAY_BETWEEN_BATCHES / 1000}s before next batch...`);
        await new Promise(resolve => setTimeout(resolve, DELAY_BETWEEN_BATCHES));
      }
    }

    // Update config with new send time
    config.last_sent = now;
    config.next_send = new Date(now.getTime() + (config.duration_hours * 60 * 60 * 1000));
    await configRepository.save(config);

    console.log(`Auto email campaign completed. Sent: ${sentCount}, Errors: ${errorCount}`);
  } catch (error: unknown) {
    console.error('Error in auto email sending:', error);
  }
};

// Function to check and send auto emails (call this periodically)
export const checkAndSendAutoEmails = async () => {
  try {
    await sendAutoEmails();
  } catch (error: unknown) {
    console.error('Error checking auto emails:', error);
  }
};
