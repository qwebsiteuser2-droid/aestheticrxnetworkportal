import { AppDataSource } from '../db/data-source';
import { Doctor } from '../models/Doctor';
import gmailService from '../services/gmailService';

async function testGmailService() {
  try {
    console.log('📧 Testing Gmail Service...');
    
    // Initialize database connection
    await AppDataSource.initialize();
    console.log('✅ Database connected');

    const doctorRepository = AppDataSource.getRepository(Doctor);

    // Find Doctor Qasim 1
    const doctor = await doctorRepository.findOne({
      where: { email: 'muhammadqasimshabbir825@gmail.com' }
    });

    if (!doctor) {
      console.log('❌ Doctor Qasim 1 not found');
      return;
    }

    console.log(`👨‍⚕️ Found Doctor: ${doctor.doctor_name} (${doctor.email})`);
    console.log(`   Current tier: ${doctor.tier}`);

    // Test tier update notification
    const tierBenefits = [
      '15% discount on all products',
      'Premium badge on profile',
      'Homepage feature placement',
      'Free marketing ads (admin chooses)',
      'Exclusive research access',
      'Conference invitations',
      'Collaboration opportunities'
    ];

    console.log('📧 Sending tier update notification...');
    await gmailService.sendTierUpdateNotification(
      doctor, 
      'Lead Starter', 
      'Expert Contributor', 
      tierBenefits
    );
    
    console.log('✅ Gmail notification sent successfully!');
    console.log('📧 Check the email inbox for the notification');

  } catch (error: unknown) {
    console.error('❌ Error testing Gmail service:', error);
  } finally {
    await AppDataSource.destroy();
  }
}

// Run the script
testGmailService();
