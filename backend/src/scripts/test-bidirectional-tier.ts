import { AppDataSource } from '../db/data-source';
import { Order } from '../models/Order';
import { Doctor } from '../models/Doctor';
import { updateUserProfileAndRanking } from '../controllers/orderController';

async function testBidirectionalTierProgression() {
  try {
    console.log('🔄 Testing Bidirectional Tier Progression...');
    
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

    // Get a completed order
    const completedOrder = await orderRepository.findOne({
      where: { 
        doctor_id: doctor.id,
        payment_status: 'paid',
        status: 'completed'
      }
    });

    if (!completedOrder) {
      console.log('❌ No completed order found for testing');
      return;
    }

    console.log(`📦 Found completed order: ${completedOrder.order_number}`);
    console.log(`   Order total: $${completedOrder.order_total}`);
    console.log(`   Payment amount: $${completedOrder.payment_amount}`);

    // Change order back to pending
    console.log('🔄 Changing order back to pending...');
    completedOrder.status = 'pending';
    completedOrder.payment_status = 'pending';
    completedOrder.payment_amount = 0;
    completedOrder.payment_completed_at = null as any;
    completedOrder.completed_at = null as any;

    await orderRepository.save(completedOrder);
    console.log('✅ Order changed to pending');

    // Update tier progression (should decrease)
    console.log('🔄 Updating tier progression (should decrease)...');
    await updateUserProfileAndRanking(doctor.id, -completedOrder.order_total);
    
    // Refresh doctor data
    const updatedDoctor = await doctorRepository.findOne({ where: { id: doctor.id } });
    if (updatedDoctor) {
      console.log('🎉 After tier update:');
      console.log(`   New tier: ${updatedDoctor.tier}`);
      console.log(`   New sales: $${updatedDoctor.current_sales}`);
      console.log(`   Tier progress: ${updatedDoctor.tier_progress}%`);
      
      // Check if tier decreased
      if (updatedDoctor.tier !== doctor.tier) {
        console.log(`✅ Tier successfully decreased: ${doctor.tier} → ${updatedDoctor.tier}`);
      } else {
        console.log(`ℹ️ Tier remained the same: ${updatedDoctor.tier}`);
      }
    }

  } catch (error: unknown) {
    console.error('❌ Error testing bidirectional tier progression:', error);
  } finally {
    await AppDataSource.destroy();
  }
}

// Run the script
testBidirectionalTierProgression();
