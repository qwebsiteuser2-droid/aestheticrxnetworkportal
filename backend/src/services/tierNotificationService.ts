import { AppDataSource } from '../db/data-source';
import { Doctor } from '../models/Doctor';
import { TierConfig } from '../models/TierConfig';
import { CertificateService } from './certificateService';
import gmailService from './gmailService';
import { getFrontendUrlWithPath } from '../config/urlConfig';

export class TierNotificationService {
  /**
   * Check if a doctor has achieved new tiers and send notifications for each tier achieved
   */
  static async checkTierAchievement(doctorId: string): Promise<void> {
    try {
      const doctorRepository = AppDataSource.getRepository(Doctor);
      const tierRepository = AppDataSource.getRepository(TierConfig);

      // Get doctor with current sales
      const doctor = await doctorRepository.findOne({ where: { id: doctorId } });
      if (!doctor) {
        console.log(`Doctor not found: ${doctorId}`);
        return;
      }

      // Get all active tier configurations
      const tiers = await tierRepository.find({
        where: { is_active: true },
        order: { display_order: 'ASC' }
      });

      if (tiers.length === 0) {
        console.log('No tier configurations found');
        return;
      }

      const currentSales = parseFloat(doctor.current_sales?.toString() || '0');
      const previousTier = doctor.tier;

      // Find the highest tier the doctor qualifies for based on sales
      let newTier = tiers[0]; // Default to first tier
      for (let i = tiers.length - 1; i >= 0; i--) {
        const tier = tiers[i];
        if (tier && tier.threshold !== null && tier.threshold !== undefined) {
          const thresholdValue = parseFloat(tier.threshold.toString());
          if (!isNaN(thresholdValue) && currentSales >= thresholdValue) {
            newTier = tier;
            break;
          }
        }
      }

      // Check if doctor has achieved a new tier
      if (newTier && newTier.name !== previousTier) {
        console.log(`🎉 Tier achievement detected for ${doctor.doctor_name}: ${previousTier} → ${newTier.name}`);

        // Find all tiers achieved in this order (multiple tier jumps)
        const achievedTiers = await this.findAchievedTiers(previousTier, newTier.name, tiers);
        
        console.log(`📈 Multiple tier achievement detected: ${achievedTiers.map(t => t.name).join(' → ')}`);

        // Update doctor's tier to the highest achieved
        if (newTier.name) {
          doctor.tier = newTier.name;
          await doctorRepository.save(doctor);
        }

        // Send notifications and certificates for each tier achieved
        await this.sendMultipleTierAchievementNotifications(doctor, achievedTiers, previousTier);
      }
    } catch (error: unknown) {
      console.error('Error checking tier achievement:', error);
    }
  }

  /**
   * Find all tiers that were achieved between the previous tier and new tier
   */
  private static async findAchievedTiers(
    previousTier: string, 
    newTier: string, 
    allTiers: TierConfig[]
  ): Promise<TierConfig[]> {
    const previousTierIndex = allTiers.findIndex(tier => tier.name === previousTier);
    const newTierIndex = allTiers.findIndex(tier => tier.name === newTier);
    
    if (previousTierIndex === -1 || newTierIndex === -1) {
      // If we can't find the tiers, just return the new tier
      return allTiers.filter(tier => tier.name === newTier);
    }

    // Return all tiers from the previous tier (exclusive) to the new tier (inclusive)
    const achievedTiers: TierConfig[] = [];
    for (let i = previousTierIndex + 1; i <= newTierIndex; i++) {
      const tier = allTiers[i];
      if (tier !== undefined && tier !== null) {
        achievedTiers.push(tier);
      }
    }

    return achievedTiers;
  }

  /**
   * Send multiple tier achievement notifications (emails + certificates for each tier)
   */
  private static async sendMultipleTierAchievementNotifications(
    doctor: Doctor,
    achievedTiers: TierConfig[],
    previousTier: string
  ): Promise<void> {
    try {
      console.log(`🎊 Sending notifications for ${achievedTiers.length} tier achievements to ${doctor.doctor_name}`);

      // Send notifications for each tier achieved
      for (let i = 0; i < achievedTiers.length; i++) {
        const tier = achievedTiers[i];
        const isLastTier = i === achievedTiers.length - 1;
        
        console.log(`📧 Sending notification for tier ${i + 1}/${achievedTiers.length}: ${tier?.name || 'Unknown'}`);

        // Send achievement email notification for this tier
        if (tier) {
          await this.sendAchievementEmail(doctor, tier, previousTier, achievedTiers, i);

          // Send certificate for this tier
          await CertificateService.sendCertificate(doctor, tier, new Date(), true, achievedTiers, i);
        }

        // Add a small delay between emails to avoid overwhelming the email service
        if (!isLastTier) {
          await new Promise(resolve => setTimeout(resolve, 2000)); // 2 second delay
        }
      }

      console.log(`✅ All tier achievement notifications sent to ${doctor.doctor_name} for ${achievedTiers.length} tiers`);
    } catch (error: unknown) {
      console.error('Error sending multiple tier achievement notifications:', error);
    }
  }

  /**
   * Send tier achievement notifications (email + certificate) - Legacy method for single tier
   */
  private static async sendTierAchievementNotifications(
    doctor: Doctor,
    newTier: TierConfig,
    previousTier: string
  ): Promise<void> {
    try {
      // Send achievement email notification
      await this.sendAchievementEmail(doctor, newTier, previousTier);

      // Send certificate
      await CertificateService.sendCertificate(doctor, newTier);

      console.log(`✅ Tier achievement notifications sent to ${doctor.doctor_name} for ${newTier.name}`);
    } catch (error: unknown) {
      console.error('Error sending tier achievement notifications:', error);
    }
  }

  /**
   * Send achievement email notification
   */
  private static async sendAchievementEmail(
    doctor: Doctor,
    newTier: TierConfig,
    previousTier: string,
    allAchievedTiers?: TierConfig[],
    currentTierIndex?: number
  ): Promise<void> {
    try {
      // Determine if this is part of a multiple tier achievement
      const isMultipleTierAchievement = allAchievedTiers && allAchievedTiers.length > 1;
      const isLastTier = currentTierIndex !== undefined && currentTierIndex === allAchievedTiers!.length - 1;
      
      const emailSubject = isMultipleTierAchievement 
        ? `🎉 Multiple Tier Achievement! You've Reached ${newTier.name} Tier!`
        : `🎉 Congratulations! You've Achieved ${newTier.name} Tier!`;
      
      const emailContent = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #059669; margin-bottom: 10px;">
              ${isMultipleTierAchievement ? '🚀 Multiple Tier Achievement Unlocked!' : '🏆 Tier Achievement Unlocked!'}
            </h1>
            <h2 style="color: #1e40af; margin: 0;">${newTier.name}</h2>
            ${isMultipleTierAchievement ? `<p style="color: #6b7280; margin: 5px 0;">Tier ${(currentTierIndex! + 1)} of ${allAchievedTiers!.length} achieved!</p>` : ''}
          </div>

          <div style="background: linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%); padding: 25px; border-radius: 12px; margin: 20px 0;">
            <h3 style="color: #166534; margin-top: 0;">Dear Dr. ${doctor.doctor_name},</h3>
            <p style="color: #374151; font-size: 16px; line-height: 1.6;">
              ${isMultipleTierAchievement 
                ? `We are thrilled to announce that you have successfully achieved the <strong>${newTier.name}</strong> tier! This is part of an incredible multiple tier achievement where you've progressed through multiple levels in a single contribution!`
                : `We are thrilled to announce that you have successfully achieved the <strong>${newTier.name}</strong> tier! Your dedication and valuable contributions to our medical community have earned you this prestigious recognition.`
              }
            </p>
            <p style="color: #374151; font-size: 16px; line-height: 1.6;">
              ${isMultipleTierAchievement 
                ? `You have progressed from <strong>${previousTier}</strong> through multiple tiers to reach <strong>${newTier.name}</strong>, demonstrating exceptional commitment to our medical community and outstanding contributions.`
                : `You have progressed from <strong>${previousTier}</strong> to <strong>${newTier.name}</strong>, demonstrating your commitment to our medical community and valuable contributions.`
              }
            </p>
          </div>

          ${isMultipleTierAchievement ? `
          <div style="background: #fef3c7; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #f59e0b;">
            <h4 style="color: #92400e; margin-top: 0;">🎊 Multiple Tier Achievement Progress:</h4>
            <div style="display: flex; flex-wrap: wrap; gap: 10px; margin-top: 10px;">
              ${allAchievedTiers!.map((tier, index) => `
                <span style="background: ${index <= currentTierIndex! ? '#10b981' : '#e5e7eb'}; 
                            color: ${index <= currentTierIndex! ? 'white' : '#6b7280'}; 
                            padding: 8px 12px; 
                            border-radius: 20px; 
                            font-size: 14px; 
                            font-weight: bold;">
                  ${tier.name} ${index <= currentTierIndex! ? '✅' : '⏳'}
                </span>
              `).join('')}
            </div>
            <p style="color: #92400e; font-size: 14px; margin: 10px 0 0 0;">
              ${isLastTier 
                ? '🎉 Congratulations! You have completed all tier achievements in this order!'
                : `You are currently at tier ${currentTierIndex! + 1} of ${allAchievedTiers!.length}. More achievements coming!`
              }
            </p>
          </div>
          ` : ''}

          <div style="background: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h4 style="color: #1f2937; margin-top: 0;">Achievement Details:</h4>
            <ul style="color: #4b5563; padding-left: 20px;">
              <li><strong>New Tier:</strong> ${newTier.name}</li>
              <li><strong>Previous Tier:</strong> ${previousTier}</li>
              <li><strong>Clinic:</strong> ${doctor.clinic_name}</li>
              <li><strong>Achievement Date:</strong> ${new Date().toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
              })}</li>
              <li><strong>Recognition:</strong> Community Contribution Excellence</li>
            </ul>
          </div>

          <div style="background: #eff6ff; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h4 style="color: #1e40af; margin-top: 0;">🎁 What's Next?</h4>
            <p style="color: #374151; font-size: 14px; line-height: 1.6;">
              Your achievement certificate has been generated and will be sent to you shortly. 
              Keep up the excellent work and continue contributing to our medical community!
            </p>
          </div>

          <div style="text-align: center; margin: 30px 0;">
            <a href="${getFrontendUrlWithPath('/leaderboard')}" 
               style="background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%); 
                      color: white; 
                      padding: 12px 24px; 
                      text-decoration: none; 
                      border-radius: 8px; 
                      display: inline-block;
                      font-weight: bold;">
              View Your Leaderboard Position
            </a>
          </div>

          <div style="border-top: 1px solid #e5e7eb; padding-top: 20px; text-align: center;">
            <p style="color: #6b7280; font-size: 14px; margin: 0;">
              Thank you for your continued dedication to our medical community.
            </p>
            <p style="color: #9ca3af; font-size: 12px; margin: 5px 0 0 0;">
              Best regards,<br>
              The Medical Community Team
            </p>
          </div>
        </div>
      `;

      await gmailService.sendEmail(doctor.email, emailSubject, emailContent);
      console.log(`📧 Achievement email sent to ${doctor.doctor_name}`);
    } catch (error: unknown) {
      console.error('Error sending achievement email:', error);
    }
  }

  /**
   * Send admin notification about tier achievement
   */
  static async sendAdminTierAchievementNotification(
    doctor: Doctor,
    newTier: TierConfig,
    previousTier: string
  ): Promise<void> {
    try {
      const adminEmail = process.env.MAIN_ADMIN_EMAIL;
      if (!adminEmail) {
        console.warn('TierNotificationService: MAIN_ADMIN_EMAIL not set, skipping admin notification');
        return;
      }
      const emailSubject = `🏆 New Tier Achievement - ${doctor.doctor_name}`;
      const emailContent = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #059669;">New Tier Achievement Notification</h2>
          
          <div style="background: #f0fdf4; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="color: #166534; margin-top: 0;">Doctor Achievement Details</h3>
            <p><strong>Doctor Name:</strong> Dr. ${doctor.doctor_name}</p>
            <p><strong>Clinic:</strong> ${doctor.clinic_name}</p>
            <p><strong>Email:</strong> ${doctor.email}</p>
            <p><strong>Previous Tier:</strong> ${previousTier}</p>
            <p><strong>New Tier:</strong> ${newTier.name}</p>
            <p><strong>Recognition:</strong> Community Contribution Excellence</p>
            <p><strong>Achievement Date:</strong> ${new Date().toLocaleDateString('en-US', {
              year: 'numeric',
              month: 'long',
              day: 'numeric'
            })}</p>
          </div>

          <div style="background: #eff6ff; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <p style="color: #1e40af; margin: 0; font-size: 14px;">
              <strong>Action Taken:</strong> Achievement certificate has been automatically generated and sent to the doctor.
            </p>
          </div>
        </div>
      `;

      await gmailService.sendEmail(adminEmail, emailSubject, emailContent);
      console.log(`📧 Admin notification sent for ${doctor.doctor_name}'s tier achievement`);
    } catch (error: unknown) {
      console.error('Error sending admin tier achievement notification:', error);
    }
  }

  /**
   * Batch check tier achievements for all doctors
   */
  static async checkAllDoctorsTierAchievements(): Promise<void> {
    try {
      const doctorRepository = AppDataSource.getRepository(Doctor);
      
      // Get all approved doctors
      const doctors = await doctorRepository.find({
        where: { is_approved: true, is_deactivated: false }
      });

      console.log(`🔍 Checking tier achievements for ${doctors.length} doctors...`);

      for (const doctor of doctors) {
        await this.checkTierAchievement(doctor.id);
      }

      console.log('✅ Tier achievement check completed for all doctors');
    } catch (error: unknown) {
      console.error('Error checking all doctors tier achievements:', error);
    }
  }
}
