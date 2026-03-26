import { AppDataSource } from '../db/data-source';
import { AwardMessageTemplate } from '../entities/AwardMessageTemplate';

const setupAwardMessageTemplates = async () => {
  await AppDataSource.initialize();
  
  const templateRepository = AppDataSource.getRepository(AwardMessageTemplate);

  console.log('🏆 Setting up Award and Message Templates...\n');

  const defaultTemplates = [
    {
      template_key: 'tier_achievement_email',
      template_name: 'Tier Achievement Email',
      template_type: 'email',
      subject_template: '🎉 Congratulations! You\'ve Achieved {{tier_name}} Tier!',
      content_template: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #059669; margin-bottom: 10px;">🏆 Tier Achievement Unlocked!</h1>
            <h2 style="color: #1e40af; margin: 0;">{{tier_name}}</h2>
          </div>

          <div style="background: linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%); padding: 25px; border-radius: 12px; margin: 20px 0;">
            <h3 style="color: #166534; margin-top: 0;">Dear Dr. {{doctor_name}},</h3>
            <p style="color: #374151; font-size: 16px; line-height: 1.6;">
              We are thrilled to announce that you have successfully achieved the <strong>{{tier_name}}</strong> tier! Your dedication and valuable contributions to our medical community have earned you this prestigious recognition.
            </p>
            <p style="color: #374151; font-size: 16px; line-height: 1.6;">
              You have progressed from <strong>{{previous_tier}}</strong> to <strong>{{tier_name}}</strong>, demonstrating your commitment to our medical community and valuable contributions.
            </p>
          </div>

          <div style="background: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h4 style="color: #1f2937; margin-top: 0;">Achievement Details:</h4>
            <ul style="color: #4b5563; padding-left: 20px;">
              <li><strong>New Tier:</strong> {{tier_name}}</li>
              <li><strong>Previous Tier:</strong> {{previous_tier}}</li>
              <li><strong>Clinic:</strong> {{clinic_name}}</li>
              <li><strong>Achievement Date:</strong> {{achievement_date}}</li>
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
            <a href="{{leaderboard_url}}" 
               style="background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%); 
                      color: white; 
                      padding: 12px 24px; 
                      text-decoration: none; 
                      border-radius: 8px; 
                      font-weight: bold; 
                      display: inline-block;">
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
      `,
      description: 'Email template sent when a doctor achieves a new tier'
    },
    {
      template_key: 'multiple_tier_achievement_email',
      template_name: 'Multiple Tier Achievement Email',
      template_type: 'email',
      subject_template: '🎉 Multiple Tier Achievement! You\'ve Reached {{tier_name}} Tier!',
      content_template: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #059669; margin-bottom: 10px;">🚀 Multiple Tier Achievement Unlocked!</h1>
            <h2 style="color: #1e40af; margin: 0;">{{tier_name}}</h2>
            <p style="color: #6b7280; margin: 5px 0;">Tier {{current_tier_index}} of {{total_tiers}} achieved!</p>
          </div>

          <div style="background: linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%); padding: 25px; border-radius: 12px; margin: 20px 0;">
            <h3 style="color: #166534; margin-top: 0;">Dear Dr. {{doctor_name}},</h3>
            <p style="color: #374151; font-size: 16px; line-height: 1.6;">
              We are thrilled to announce that you have successfully achieved the <strong>{{tier_name}}</strong> tier! This is part of an incredible multiple tier achievement where you've progressed through multiple levels in a single contribution!
            </p>
            <p style="color: #374151; font-size: 16px; line-height: 1.6;">
              You have progressed from <strong>{{previous_tier}}</strong> through multiple tiers to reach <strong>{{tier_name}}</strong>, demonstrating exceptional commitment to our medical community and outstanding contributions.
            </p>
          </div>

          <div style="background: #fef3c7; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #f59e0b;">
            <h4 style="color: #92400e; margin-top: 0;">🎊 Multiple Tier Achievement Progress:</h4>
            <div style="display: flex; flex-wrap: wrap; gap: 10px; margin-top: 10px;">
              {{tier_progress_badges}}
            </div>
            <p style="color: #92400e; font-size: 14px; margin: 10px 0 0 0;">
              {{progress_message}}
            </p>
          </div>

          <div style="background: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h4 style="color: #1f2937; margin-top: 0;">Achievement Details:</h4>
            <ul style="color: #4b5563; padding-left: 20px;">
              <li><strong>New Tier:</strong> {{tier_name}}</li>
              <li><strong>Previous Tier:</strong> {{previous_tier}}</li>
              <li><strong>Clinic:</strong> {{clinic_name}}</li>
              <li><strong>Achievement Date:</strong> {{achievement_date}}</li>
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
            <a href="{{leaderboard_url}}" 
               style="background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%); 
                      color: white; 
                      padding: 12px 24px; 
                      text-decoration: none; 
                      border-radius: 8px; 
                      font-weight: bold; 
                      display: inline-block;">
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
      `,
      description: 'Email template sent for multiple tier achievements'
    },
    {
      template_key: 'certificate_email',
      template_name: 'Certificate Email',
      template_type: 'email',
      subject_template: '🏆 Achievement Certificate - {{tier_name}} Tier',
      content_template: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #1e40af; margin-bottom: 10px;">🎉 Congratulations!</h1>
            <h2 style="color: #059669; margin: 0;">You've Achieved {{tier_name}} Tier!</h2>
          </div>

          <div style="background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%); padding: 25px; border-radius: 12px; margin: 20px 0;">
            <h3 style="color: #0c4a6e; margin-top: 0;">Dear Dr. {{doctor_name}},</h3>
            <p style="color: #374151; font-size: 16px; line-height: 1.6;">
              We are thrilled to congratulate you on achieving the <strong>{{tier_name}}</strong> tier! Your dedication and valuable contributions to our medical community have earned you this prestigious recognition.
            </p>
            <p style="color: #374151; font-size: 16px; line-height: 1.6;">
              Your achievement certificate is attached to this email. This certificate is digitally 
              signed by our CEO and President, recognizing your outstanding contribution to our medical community.
            </p>
          </div>

          <div style="background: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h4 style="color: #1f2937; margin-top: 0;">Achievement Details:</h4>
            <ul style="color: #4b5563; padding-left: 20px;">
              <li><strong>Tier:</strong> {{tier_name}}</li>
              <li><strong>Clinic:</strong> {{clinic_name}}</li>
              <li><strong>Achievement Date:</strong> {{achievement_date}}</li>
              <li><strong>Certificate ID:</strong> {{certificate_id}}</li>
            </ul>
          </div>

          <div style="text-align: center; margin: 30px 0;">
            <p style="color: #6b7280; font-size: 14px;">
              Keep up the excellent work! We look forward to seeing you achieve even greater milestones.
            </p>
          </div>

          <div style="border-top: 1px solid #e5e7eb; padding-top: 20px; text-align: center;">
            <p style="color: #9ca3af; font-size: 12px; margin: 0;">
              This certificate is digitally generated and verified by our system.
            </p>
            <p style="color: #9ca3af; font-size: 12px; margin: 5px 0 0 0;">
              Hand-signed by: Muhammad Qasim Shabbir (CEO) & Muhammad Asim Shabbir (President)
            </p>
          </div>
        </div>
      `,
      description: 'Email template sent with certificate attachment'
    },
    {
      template_key: 'certificate_content',
      template_name: 'Certificate Content',
      template_type: 'certificate',
      subject_template: '',
      content_template: '',
      certificate_title: 'CERTIFICATE OF ACHIEVEMENT',
      certificate_subtitle: 'Community Contribution Recognition',
      certificate_achievement_text: 'for outstanding contribution to our medical community',
      certificate_description: 'A recognition of your dedication and valuable contributions to our community.',
      certificate_footer: 'This certificate is digitally generated and verified by our system.',
      description: 'Certificate content and styling templates'
    },
    {
      template_key: 'admin_tier_notification',
      template_name: 'Admin Tier Achievement Notification',
      template_type: 'email',
      subject_template: '🏆 New Tier Achievement - {{doctor_name}}',
      content_template: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #059669;">New Tier Achievement Notification</h2>
          
          <div style="background: #f0fdf4; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="color: #166534; margin-top: 0;">Doctor Achievement Details</h3>
            <p><strong>Doctor Name:</strong> Dr. {{doctor_name}}</p>
            <p><strong>Clinic:</strong> {{clinic_name}}</p>
            <p><strong>Email:</strong> {{doctor_email}}</p>
            <p><strong>Previous Tier:</strong> {{previous_tier}}</p>
            <p><strong>New Tier:</strong> {{tier_name}}</p>
            <p><strong>Recognition:</strong> Community Contribution Excellence</p>
            <p><strong>Achievement Date:</strong> {{achievement_date}}</p>
          </div>

          <div style="background: #eff6ff; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <p style="color: #1e40af; margin: 0; font-size: 14px;">
              <strong>Action Taken:</strong> Achievement certificate has been automatically generated and sent to the doctor.
            </p>
          </div>
        </div>
      `,
      description: 'Email template sent to admins when a doctor achieves a new tier'
    }
  ];

  try {
    for (const templateData of defaultTemplates) {
      const existingTemplate = await templateRepository.findOne({
        where: { template_key: templateData.template_key }
      });

      if (existingTemplate) {
        console.log(`✅ Template already exists: ${templateData.template_name}`);
        continue;
      }

      const template = templateRepository.create(templateData);
      await templateRepository.save(template);
      console.log(`✅ Created template: ${templateData.template_name}`);
    }

    console.log('\n🎉 All award and message templates have been set up successfully!');
  } catch (error: unknown) {
    console.error('❌ Error setting up templates:', error);
  } finally {
    await AppDataSource.destroy();
  }
};

setupAwardMessageTemplates().catch(console.error);
