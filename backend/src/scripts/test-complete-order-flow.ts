import { AppDataSource } from '../db/data-source';
import { Order } from '../models/Order';
import { Doctor } from '../models/Doctor';
import { updateUserProfileAndRanking } from '../controllers/orderController';
import { CertificateService } from '../services/certificateService';
import gmailService from '../services/gmailService';

async function testCompleteOrderFlow() {
  try {
    console.log('🔄 Testing Complete Order Flow...');
    
    // Initialize database connection
    await AppDataSource.initialize();
    console.log('✅ Database connected');

    const orderRepository = AppDataSource.getRepository(Order);
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
    console.log(`   Current sales: $${doctor.current_sales}`);

    // Find a pending order
    const pendingOrder = await orderRepository.findOne({
      where: { 
        doctor_id: doctor.id,
        payment_status: 'pending',
        status: 'pending'
      }
    });

    if (!pendingOrder) {
      console.log('❌ No pending order found for testing');
      return;
    }

    console.log(`📦 Found pending order: ${pendingOrder.order_number}`);
    console.log(`   Order total: $${pendingOrder.order_total}`);

    // Simulate order completion
    console.log('🔄 Completing order...');
    pendingOrder.status = 'completed';
    pendingOrder.payment_status = 'paid';
    pendingOrder.payment_amount = pendingOrder.order_total;
    pendingOrder.payment_completed_at = new Date();
    pendingOrder.completed_at = new Date();

    await orderRepository.save(pendingOrder);
    console.log('✅ Order marked as completed');

    // Update tier progression
    console.log('🔄 Updating tier progression...');
    await updateUserProfileAndRanking(doctor.id, pendingOrder.order_total);
    
    // Refresh doctor data
    const updatedDoctor = await doctorRepository.findOne({ where: { id: doctor.id } });
    if (updatedDoctor) {
      console.log('🎉 After tier update:');
      console.log(`   New tier: ${updatedDoctor.tier}`);
      console.log(`   New sales: $${updatedDoctor.current_sales}`);
      console.log(`   Tier progress: ${updatedDoctor.tier_progress}%`);
      
      // Check if tier increased
      if (updatedDoctor.tier !== doctor.tier) {
        console.log(`✅ Tier successfully increased: ${doctor.tier} → ${updatedDoctor.tier}`);
        
        // Test Gmail notification
        console.log('📧 Testing Gmail notification...');
        const tierBenefits = [
          '15% discount on all products',
          'Premium badge on profile',
          'Homepage feature placement',
          'Free marketing ads (admin chooses)',
          'Exclusive research access',
          'Conference invitations',
          'Collaboration opportunities'
        ];
        
        await gmailService.sendTierUpdateNotification(
          updatedDoctor, 
          doctor.tier, 
          updatedDoctor.tier, 
          tierBenefits
        );
        console.log('✅ Gmail notification sent');
        
        // Test certificate generation and sending
        console.log('🏆 Testing certificate generation...');
        const { TierConfig } = await import('../models/TierConfig');
        const tierConfigRepository = AppDataSource.getRepository(TierConfig);
        const newTierConfig = await tierConfigRepository.findOne({
          where: { name: updatedDoctor.tier }
        });
        
        if (newTierConfig) {
          await CertificateService.sendCertificate(
            updatedDoctor, 
            newTierConfig, 
            new Date(), 
            false
          );
          console.log('✅ Certificate sent with PDF attachment');
        } else {
          console.log('❌ Tier configuration not found');
        }
        
      } else {
        console.log(`ℹ️ No tier change - still at ${updatedDoctor.tier}`);
      }
    }

  } catch (error: unknown) {
    console.error('❌ Error testing complete order flow:', error);
  } finally {
    await AppDataSource.destroy();
  }
}

// Run the script
testCompleteOrderFlow();
