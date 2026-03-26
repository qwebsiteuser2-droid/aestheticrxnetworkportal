import { AppDataSource } from '../db/data-source';
import { Doctor } from '../models/Doctor';
import { TierConfig } from '../models/TierConfig';
import { CertificateService } from '../services/certificateService';

async function testCertificateService() {
  try {
    console.log('🏆 Testing Certificate Service with PDF Generation...');
    
    // Initialize database connection
    await AppDataSource.initialize();
    console.log('✅ Database connected');

    const doctorRepository = AppDataSource.getRepository(Doctor);
    const tierConfigRepository = AppDataSource.getRepository(TierConfig);

    // Find Doctor Qasim 1
    const doctor = await doctorRepository.findOne({
      where: { email: 'muhammadqasimshabbir825@gmail.com' }
    });

    if (!doctor) {
      console.log('❌ Doctor Qasim 1 not found');
      return;
    }

    console.log(`👨‍⚕️ Found Doctor: ${doctor.doctor_name} (${doctor.email})`);

    // Get a tier configuration
    const tier = await tierConfigRepository.findOne({
      where: { name: 'Lead Contributor' }
    });

    if (!tier) {
      console.log('❌ Lead Contributor tier not found');
      return;
    }

    console.log(`🏆 Found Tier: ${tier.name} (Threshold: $${tier.threshold})`);

    // Test certificate generation and sending
    console.log('📧 Generating and sending certificate...');
    await CertificateService.sendCertificate(
      doctor, 
      tier, 
      new Date(), 
      false // Single tier achievement
    );
    
    console.log('✅ Certificate sent successfully!');
    console.log('📧 Check the email inbox for the PDF certificate attachment');

  } catch (error: unknown) {
    console.error('❌ Error testing certificate service:', error);
  } finally {
    await AppDataSource.destroy();
  }
}

// Run the script
testCertificateService();
