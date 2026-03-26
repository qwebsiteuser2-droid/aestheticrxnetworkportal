import { Request, Response } from 'express';
import { AppDataSource } from '../db/data-source';
import { Doctor } from '../models/Doctor';
import { TierConfig } from '../models/TierConfig';
import { AwardMessageTemplate } from '../entities/AwardMessageTemplate';

export const generateEmailPreview = async (req: Request, res: Response): Promise<void> => {
  try {
    const { doctor, tier } = req.body;

    if (!doctor || !tier) {
      res.status(400).json({
        success: false,
        message: 'Doctor and tier are required'
      });
      return;
    }

    // Get the tier achievement email template
    const emailTemplate = await AppDataSource.getRepository(AwardMessageTemplate).findOne({
      where: { template_key: 'tier_achievement_email' }
    });

    if (!emailTemplate) {
      res.status(404).json({
        success: false,
        message: 'Email template not found'
      });
      return;
    }

    // Generate the email content with variables replaced
    const emailContent = generateEmailContent(emailTemplate, doctor, tier);

    res.json({
      success: true,
      data: {
        subject: emailContent.subject,
        htmlContent: emailContent.htmlContent,
        doctor: doctor,
        tier: tier
      }
    });

  } catch (error: unknown) {
    console.error('Error generating email preview:', error);
    res.status(500).json({
      success: false,
      message: 'Error generating email preview'
    });
  }
};

export const sendTestEmail = async (req: Request, res: Response): Promise<void> => {
  try {
    const { doctor, tier } = req.body;

    if (!doctor || !tier) {
      res.status(400).json({
        success: false,
        message: 'Doctor and tier are required'
      });
      return;
    }

    // Get the tier achievement email template
    const emailTemplate = await AppDataSource.getRepository(AwardMessageTemplate).findOne({
      where: { template_key: 'tier_achievement_email' }
    });

    if (!emailTemplate) {
      res.status(404).json({
        success: false,
        message: 'Email template not found'
      });
      return;
    }

    // Generate the email content
    const emailContent = generateEmailContent(emailTemplate, doctor, tier);

    // Send test email to admin using gmailService
    const gmailService = (await import('../services/gmailService')).default;
    const adminEmail = process.env.ADMIN_EMAIL || 'muhammadqasimshabbir3@gmail.com';

    await gmailService.sendEmail(
      adminEmail,
      `[TEST] ${emailContent.subject}`,
      emailContent.htmlContent,
      { isMarketing: false }
    );

    res.json({
      success: true,
      message: 'Test email sent successfully to admin email'
    });

  } catch (error: unknown) {
    console.error('Error sending test email:', error);
    res.status(500).json({
      success: false,
      message: 'Error sending test email'
    });
  }
};

function generateEmailContent(template: AwardMessageTemplate, doctor: any, tier: any) {
  let subject = template.subject_template || 'Congratulations on Your Achievement!';
  let htmlContent = template.content_template || '';

  // Replace variables in subject
  subject = subject
    .replace(/\{\{doctor_name\}\}/g, doctor.doctor_name || 'Dr. User')
    .replace(/\{\{clinic_name\}\}/g, doctor.clinic_name || 'Medical Center')
    .replace(/\{\{tier_name\}\}/g, tier.name || 'Achievement')
    .replace(/\{\{tier_icon\}\}/g, tier.icon || '🏆');

  // Replace variables in HTML content
  htmlContent = htmlContent
    .replace(/\{\{doctor_name\}\}/g, doctor.doctor_name || 'Dr. User')
    .replace(/\{\{clinic_name\}\}/g, doctor.clinic_name || 'Medical Center')
    .replace(/\{\{tier_name\}\}/g, tier.name || 'Achievement')
    .replace(/\{\{tier_icon\}\}/g, tier.icon || '🏆')
    .replace(/\{\{tier_color\}\}/g, tier.color || '#3b82f6')
    .replace(/\{\{tier_description\}\}/g, tier.description || 'Great achievement!')
    .replace(/\{\{tier_benefits\}\}/g, tier.benefits || 'Special benefits included');

  return {
    subject,
    htmlContent
  };
}
