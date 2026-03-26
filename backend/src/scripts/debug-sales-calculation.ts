import { AppDataSource } from '../db/data-source';
import { Order } from '../models/Order';
import { Doctor } from '../models/Doctor';

async function debugSalesCalculation() {
  try {
    console.log('🔍 Debugging sales calculation...');
    
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
    console.log(`   Current sales: ${doctor.current_sales}`);

    // Get all orders for this doctor
    const allOrders = await orderRepository.find({
      where: { doctor_id: doctor.id }
    });

    console.log(`📦 Total orders: ${allOrders.length}`);

    // Check paid orders
    const paidOrders = allOrders.filter(order => 
      order.payment_status === 'paid' && order.payment_amount > 0
    );

    console.log(`💰 Paid orders: ${paidOrders.length}`);
    
    if (paidOrders.length > 0) {
      console.log('📋 Paid orders details:');
      paidOrders.forEach((order, index) => {
        console.log(`   ${index + 1}. ${order.order_number}: $${order.payment_amount} (Total: $${order.order_total})`);
      });

      // Calculate total sales
      const totalSales = paidOrders.reduce((sum, order) => {
        const amount = Number(order.payment_amount || 0);
        console.log(`   Adding: $${amount} from ${order.order_number}`);
        return sum + amount;
      }, 0);

      console.log(`💵 Calculated total sales: $${totalSales}`);

      // Update doctor's sales
      doctor.current_sales = totalSales;
      await doctorRepository.save(doctor);
      console.log(`✅ Updated doctor's current_sales to: $${doctor.current_sales}`);
    }

  } catch (error: unknown) {
    console.error('❌ Error debugging sales calculation:', error);
  } finally {
    await AppDataSource.destroy();
  }
}

// Run the script
debugSalesCalculation();
