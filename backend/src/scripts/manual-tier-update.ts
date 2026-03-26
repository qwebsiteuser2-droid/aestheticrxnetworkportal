import { AppDataSource } from '../db/data-source';
import { Doctor } from '../models/Doctor';
import { Order } from '../models/Order';
import { TierConfig } from '../models/TierConfig';
import { updateUserProfileAndRanking } from '../controllers/orderController';

async function manualTierUpdate() {
  try {
    console.log('🚀 Starting manual tier update for Doctor Qasim 1...');
    
    // Initialize database connection
    await AppDataSource.initialize();
    console.log('✅ Database connected');
    
    const doctorId = '07ee87ab-f435-43f1-8a3c-4dedbad6f2a8';
    
    // Get doctor info
    const doctorRepository = AppDataSource.getRepository(Doctor);
    const doctor = await doctorRepository.findOne({
      where: { id: doctorId },
      relations: ['orders']
    });
    
    if (!doctor) {
      console.log('❌ Doctor not found');
      return;
    }
    
    console.log(`👨‍⚕️ Doctor: ${doctor.doctor_name}`);
    console.log(`📊 Current Sales: ${doctor.current_sales}`);
    console.log(`🏆 Current Tier: ${doctor.tier}`);
    console.log(`📈 Current Progress: ${doctor.tier_progress}%`);
    console.log(`📦 Total Orders: ${doctor.orders.length}`);
    
    // Get paid orders
    const paidOrders = doctor.orders.filter((order: any) => 
      order.payment_status === 'paid' && order.payment_amount > 0
    );
    
    console.log(`💰 Paid Orders: ${paidOrders.length}`);
    const totalPaid = paidOrders.reduce((sum: number, order: any) => sum + Number(order.payment_amount || 0), 0);
    console.log(`💵 Total Paid: ${totalPaid}`);
    
    // Get tier configurations
    const tierRepository = AppDataSource.getRepository(TierConfig);
    const tiers = await tierRepository.find({
      where: { is_active: true },
      order: { display_order: 'ASC' }
    });
    
    console.log('\n📋 Available Tiers:');
    tiers.forEach((tier: any, index: number) => {
      console.log(`  ${index + 1}. ${tier.name} - ${tier.threshold} (${tier.color})`);
    });
    
    // Find current tier based on sales
    let currentTier: TierConfig | undefined = tiers[0];
    let currentTierIndex = 0;
    for (let i = tiers.length - 1; i >= 0; i--) {
      const threshold = parseFloat(String(tiers[i]?.threshold));
      if (totalPaid >= threshold) {
        currentTier = tiers[i];
        currentTierIndex = i;
        break;
      }
    }
    
    console.log(`\n🎯 Should be tier: ${currentTier?.name} (threshold: ${currentTier?.threshold})`);
    
    // Calculate progress to next tier
    const nextTier = tiers[currentTierIndex + 1];
    let progress = 0;
    if (nextTier) {
      const currentThreshold = parseFloat(String(currentTier?.threshold || 0));
      const nextThreshold = parseFloat(String(nextTier.threshold));
      progress = ((totalPaid - currentThreshold) / (nextThreshold - currentThreshold)) * 100;
    }
    
    console.log(`📈 Progress to next tier: ${progress.toFixed(2)}%`);
    
    // Update doctor's sales
    doctor.current_sales = totalPaid;
    await doctorRepository.save(doctor);
    console.log('✅ Updated doctor sales');
    
    // Trigger tier progression
    console.log('\n🔄 Triggering tier progression...');
    await updateUserProfileAndRanking(doctorId, totalPaid);
    console.log('✅ Tier progression completed');
    
    // Check final status
    const updatedDoctor = await doctorRepository.findOne({ where: { id: doctorId } });
    if (updatedDoctor) {
      console.log('\n📊 Final Status:');
      console.log(`  Sales: ${updatedDoctor.current_sales}`);
      console.log(`  Tier: ${updatedDoctor.tier}`);
      console.log(`  Progress: ${updatedDoctor.tier_progress}%`);
    }
    
  } catch (error: unknown) {
    console.error('❌ Error:', error);
  } finally {
    await AppDataSource.destroy();
    console.log('🔌 Database disconnected');
  }
}

manualTierUpdate();
