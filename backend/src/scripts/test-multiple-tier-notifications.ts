import { AppDataSource } from '../db/data-source';
import { Doctor } from '../models/Doctor';
import { Order } from '../models/Order';
import { TierConfig } from '../models/TierConfig';
import { updateUserProfileAndRanking } from '../controllers/orderController';
import { CertificateService } from '../services/certificateService';
import gmailService from '../services/gmailService';

async function testMultipleTierNotifications() {
  try {
    console.log('🎯 Testing Multiple Tier Notifications with PDF Certificates...');
    
    // Initialize database connection
    await AppDataSource.initialize();
    console.log('✅ Database connected');

    const doctorRepository = AppDataSource.getRepository(Doctor);
    const orderRepository = AppDataSource.getRepository(Order);
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
    console.log(`   Current tier: ${doctor.tier}`);
    console.log(`   Current sales: $${doctor.current_sales}`);

    // Get all tier configurations
    const tiers = await tierConfigRepository.find({
      where: { is_active: true },
      order: { display_order: 'ASC' }
    });

    console.log(`🏆 Available tiers:`);
    tiers.forEach((tier, index) => {
      console.log(`   ${index + 1}. ${tier.name}: $${tier.threshold}`);
    });

    // Simulate a large order that would cross multiple tiers
    // Let's say we complete a $500,000 order (would jump from Lead Starter to Grand Lead)
    const largeOrderAmount = 500000;
    
    console.log(`\n🔄 Simulating large order completion: $${largeOrderAmount}`);
    console.log(`   This should trigger multiple tier advancements...`);

    // Create a test order
    const testOrder = orderRepository.create({
      doctor_id: doctor.id,
      order_number: `TEST-${Date.now()}`,
      order_total: largeOrderAmount,
      payment_amount: largeOrderAmount,
      payment_status: 'paid',
      status: 'completed',
      payment_completed_at: new Date(),
      completed_at: new Date(),
      payment_method: 'test_payment'
    });

    await orderRepository.save(testOrder);
    console.log(`✅ Test order created: ${testOrder.order_number}`);

    // Update doctor's sales to simulate the large payment
    doctor.current_sales = largeOrderAmount;
    await doctorRepository.save(doctor);
    console.log(`✅ Doctor sales updated to: $${doctor.current_sales}`);

    // Trigger tier progression (this should send multiple notifications)
    console.log(`\n🎯 Triggering tier progression...`);
    await updateUserProfileAndRanking(doctor.id, largeOrderAmount);
    
    // Refresh doctor data
    const updatedDoctor = await doctorRepository.findOne({ where: { id: doctor.id } });
    if (updatedDoctor) {
      console.log(`\n🎉 Tier progression completed:`);
      console.log(`   New tier: ${updatedDoctor.tier}`);
      console.log(`   New sales: $${updatedDoctor.current_sales}`);
      console.log(`   Tier progress: ${updatedDoctor.tier_progress}%`);
    }

    // Clean up test order
    await orderRepository.remove(testOrder);
    console.log(`\n🧹 Test order cleaned up`);

    console.log(`\n📧 Expected Gmail notifications:`);
    console.log(`   1. Lead Starter → Lead Contributor (at $100,001)`);
    console.log(`   2. Lead Contributor → Lead Expert (at $250,000)`);
    console.log(`   3. Lead Expert → Grand Lead (at $500,000)`);
    console.log(`\n🏆 Each notification should include:`);
    console.log(`   - Gmail notification with tier benefits`);
    console.log(`   - PDF certificate attachment`);
    console.log(`   - Separate email for each tier achieved`);

  } catch (error: unknown) {
    console.error('❌ Error testing multiple tier notifications:', error);
  } finally {
    await AppDataSource.destroy();
  }
}

// Run the script
testMultipleTierNotifications();
