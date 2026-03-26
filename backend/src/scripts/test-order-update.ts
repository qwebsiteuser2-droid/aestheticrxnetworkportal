import { AppDataSource } from '../db/data-source';
import { Order } from '../models/Order';
import { Doctor } from '../models/Doctor';

async function testOrderUpdate() {
  try {
    console.log('🧪 Testing order status update...');
    
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

    // Get first few orders for this doctor
    const orders = await orderRepository.find({
      where: { doctor_id: doctor.id },
      take: 5
    });

    console.log(`📦 Found ${orders.length} orders`);

    if (orders.length > 0) {
      const order = orders[0];
      if (!order) {
        console.log('❌ No order found');
        return;
      }
      
      console.log(`📋 Testing with order: ${order.order_number}`);
      console.log(`   Current status: ${order.status}`);
      console.log(`   Current payment_status: ${order.payment_status}`);
      console.log(`   Current payment_amount: ${order.payment_amount}`);

      // Update order to completed
      order.status = 'completed';
      order.payment_status = 'paid';
      order.payment_amount = order.order_total;
      order.payment_completed_at = new Date();
      order.completed_at = new Date();

      await orderRepository.save(order);
      console.log('✅ Order updated to completed');

      // Check doctor's current tier
      console.log(`👨‍⚕️ Doctor current tier: ${doctor.tier}`);
      console.log(`👨‍⚕️ Doctor current sales: ${doctor.current_sales}`);

      // Import and call the tier update function
      const { updateUserProfileAndRanking } = await import('../controllers/orderController');
      await updateUserProfileAndRanking(doctor.id, order.order_total);
      
      // Refresh doctor data
      const updatedDoctor = await doctorRepository.findOne({ where: { id: doctor.id } });
      if (updatedDoctor) {
        console.log(`🎉 After tier update:`);
        console.log(`   New tier: ${updatedDoctor.tier}`);
        console.log(`   New sales: ${updatedDoctor.current_sales}`);
        console.log(`   Tier progress: ${updatedDoctor.tier_progress}%`);
      }
    }

  } catch (error: unknown) {
    console.error('❌ Error testing order update:', error);
  } finally {
    await AppDataSource.destroy();
  }
}

// Run the script
testOrderUpdate();
