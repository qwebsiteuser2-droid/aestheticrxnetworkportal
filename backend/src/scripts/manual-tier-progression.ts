import { AppDataSource } from '../db/data-source';
import { Doctor } from '../models/Doctor';
import { TierConfig } from '../models/TierConfig';

async function manualTierProgression() {
  try {
    console.log('🎯 Manual tier progression test...');
    
    // Initialize database connection
    await AppDataSource.initialize();
    console.log('✅ Database connected');

    const doctorRepository = AppDataSource.getRepository(Doctor);
    const tierRepository = AppDataSource.getRepository(TierConfig);

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
    console.log(`   Current sales: $${doctor.current_sales}`);

    // Get all tier configurations
    const tiers = await tierRepository.find({
      where: { is_active: true },
      order: { display_order: 'ASC' }
    });

    console.log(`🏆 Found ${tiers.length} tier configurations:`);
    tiers.forEach((tier, index) => {
      console.log(`   ${index + 1}. ${tier.name}: $${tier.threshold}`);
    });

    // Find current tier based on sales
    const currentSales = Number(doctor.current_sales);
    let newTier = tiers[0]; // Default to first tier
    let newTierIndex = 0;
    
    for (let i = tiers.length - 1; i >= 0; i--) {
      const tier = tiers[i];
      if (!tier) continue;
      
      const threshold = Number(tier.threshold);
      console.log(`   Checking tier ${tier.name}: $${threshold} <= $${currentSales}?`);
      if (currentSales >= threshold) {
        newTier = tier;
        newTierIndex = i;
        break;
      }
    }

    if (!newTier) {
      console.error('❌ No tier configuration found');
      return;
    }

    console.log(`🎯 Calculated new tier: ${newTier.name} (index: ${newTierIndex})`);
    
    // Check if tier changed
    const oldTier = doctor.tier;
    const tierChanged = oldTier !== newTier.name;
    
    console.log(`🔄 Tier changed: ${tierChanged} (${oldTier} → ${newTier.name})`);

    if (tierChanged) {
      // Update doctor's tier
      doctor.tier = newTier.name;
      doctor.tier_progress = 100; // At highest tier
      await doctorRepository.save(doctor);
      
      console.log(`✅ Updated doctor tier to: ${doctor.tier}`);
      console.log(`✅ Updated tier progress to: ${doctor.tier_progress}%`);
      
      // Send Gmail notification
      try {
        const gmailService = (await import('../services/gmailService')).default;
        const tierBenefits = {
          discount: '15%',
          benefits: ['Premium badge', 'Homepage feature', 'Free marketing ads']
        };
        
        await gmailService.sendTierUpdateNotification(doctor, oldTier, newTier.name, tierBenefits);
        console.log(`📧 Gmail notification sent to ${doctor.email}`);
      } catch (emailError) {
        console.error(`❌ Failed to send Gmail notification:`, emailError);
      }
      
      // Send certificate
      try {
        const { CertificateService } = await import('../services/certificateService');
        await CertificateService.sendCertificate(doctor, newTier, new Date(), false);
        console.log(`🏆 Certificate sent to ${doctor.email}`);
      } catch (certError) {
        console.error(`❌ Failed to send certificate:`, certError);
      }
    } else {
      console.log(`ℹ️ No tier change needed - already at ${newTier.name}`);
    }

  } catch (error: unknown) {
    console.error('❌ Error in manual tier progression:', error);
  } finally {
    await AppDataSource.destroy();
  }
}

// Run the script
manualTierProgression();
