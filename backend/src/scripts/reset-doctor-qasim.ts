import { AppDataSource } from '../db/data-source';
import { Doctor } from '../models/Doctor';
import { Order } from '../models/Order';

async function resetDoctorQasim() {
  try {
    console.log('🔄 Starting Doctor Qasim 1 reset...');
    
    // Initialize database connection
    await AppDataSource.initialize();
    console.log('✅ Database connected');

    const doctorRepository = AppDataSource.getRepository(Doctor);
    const orderRepository = AppDataSource.getRepository(Order);

    // Find Doctor Qasim 1
    const doctor = await doctorRepository.findOne({
      where: { email: 'muhammadqasimshabbir825@gmail.com' }
    });

    if (!doctor) {
      console.log('❌ Doctor Qasim 1 not found');
      return;
    }

    console.log(`👨‍⚕️ Found Doctor: ${doctor.doctor_name} (${doctor.email})`);
    console.log(`📊 Current Status: Tier=${doctor.tier}, Sales=${doctor.current_sales}`);

    // Get all orders for this doctor
    const orders = await orderRepository.find({
      where: { doctor_id: doctor.id }
    });

    console.log(`📦 Found ${orders.length} orders`);

    // Reset all completed orders to pending
    let resetCount = 0;
    for (const order of orders) {
      if (order.status === 'completed' || order.payment_status === 'paid') {
        order.status = 'pending';
        order.payment_status = 'pending';
        order.payment_amount = 0;
        order.payment_completed_at = null as any;
        order.completed_at = null as any;
        await orderRepository.save(order);
        resetCount++;
      }
    }

    console.log(`🔄 Reset ${resetCount} orders to pending status`);

    // Reset doctor's tier and sales
    doctor.tier = 'Lead Starter';
    doctor.base_tier = 'Lead Starter';
    doctor.tier_progress = 0;
    doctor.current_sales = 0;
    doctor.total_owed_amount = 0;
    doctor.debt_limit_exceeded = false;
    doctor.updated_at = new Date();

    await doctorRepository.save(doctor);

    console.log('✅ Doctor Qasim 1 reset completed:');
    console.log(`   - Tier: ${doctor.tier}`);
    console.log(`   - Sales: ${doctor.current_sales}`);
    console.log(`   - Orders reset: ${resetCount}`);

  } catch (error: unknown) {
    console.error('❌ Error resetting Doctor Qasim 1:', error);
  } finally {
    await AppDataSource.destroy();
  }
}

// Run the script
resetDoctorQasim();
