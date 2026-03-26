/**
 * Script to clean up duplicate Gmail notifications for PayFast orders
 * 
 * This script:
 * 1. Finds orders with payment_status='paid' but payment_completed_at is null
 * 2. Sets payment_completed_at to prevent duplicate notifications
 * 3. Logs which orders were cleaned up
 */

import { AppDataSource } from '../db/data-source';
import { Order } from '../models/Order';
import { IsNull } from 'typeorm';

const cleanupDuplicateNotifications = async () => {
  try {
    await AppDataSource.initialize();
    console.log('🔧 Starting cleanup of duplicate notifications...\n');

    const orderRepository = AppDataSource.getRepository(Order);

    // Find orders that are paid but don't have payment_completed_at set
    // These might trigger duplicate notifications
    // Use QueryBuilder to properly handle nullable Date fields
    const stuckOrders = await orderRepository
      .createQueryBuilder('order')
      .leftJoinAndSelect('order.doctor', 'doctor')
      .leftJoinAndSelect('order.product', 'product')
      .where('order.payment_status = :status', { status: 'paid' })
      .andWhere('order.payment_completed_at IS NULL')
      .orWhere('order.payment_method = :method', { method: 'payfast_online' })
      .andWhere('order.payment_completed_at IS NULL')
      .getMany();

    console.log(`📋 Found ${stuckOrders.length} order(s) that might have duplicate notifications\n`);

    if (stuckOrders.length === 0) {
      console.log('✅ No stuck orders found. All clean!');
      await AppDataSource.destroy();
      return;
    }

    // Set payment_completed_at to prevent duplicate sends
    let cleanedCount = 0;
    for (const order of stuckOrders) {
      // Only clean if order was created more than 5 minutes ago (to avoid cleaning fresh orders)
      const orderAge = Date.now() - new Date(order.created_at).getTime();
      const fiveMinutes = 5 * 60 * 1000;

      if (orderAge > fiveMinutes) {
        order.payment_completed_at = new Date();
        await orderRepository.save(order);
        cleanedCount++;
        console.log(`✅ Cleaned order ${order.order_number} (${order.id})`);
        console.log(`   Payment Status: ${order.payment_status}`);
        console.log(`   Payment Method: ${order.payment_method || 'N/A'}`);
        console.log(`   Created: ${order.created_at}`);
        console.log(`   Set payment_completed_at: ${order.payment_completed_at}\n`);
      } else {
        console.log(`⏭️ Skipping fresh order ${order.order_number} (created ${Math.round(orderAge / 1000)}s ago)\n`);
      }
    }

    console.log(`\n✅ Cleanup complete!`);
    console.log(`   Total stuck orders found: ${stuckOrders.length}`);
    console.log(`   Orders cleaned: ${cleanedCount}`);
    console.log(`   Orders skipped (too fresh): ${stuckOrders.length - cleanedCount}`);

  } catch (error) {
    console.error('❌ Error during cleanup:', error);
  } finally {
    await AppDataSource.destroy();
  }
};

// Run cleanup
cleanupDuplicateNotifications().catch(console.error);

