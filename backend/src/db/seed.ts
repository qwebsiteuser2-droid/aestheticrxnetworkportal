import { AppDataSource } from './data-source';
import { Doctor } from '../models/Doctor';
import { Product } from '../models/Product';
import { AllowedSignupId } from '../models/AllowedSignupId';
import { hashPassword } from '../utils/password';
import { generateTokenPair } from '../utils/jwt';

/**
 * Seed the database with initial data
 */
const seedDatabase = async (): Promise<void> => {
  try {
    console.log('🌱 Starting database seeding...');

    // Initialize database connection
    if (!AppDataSource.isInitialized) {
      await AppDataSource.initialize();
    }

    // Seed admin users
    await seedAdminUsers();

    // Seed allowed signup IDs
    await seedAllowedSignupIds();

    // Seed sample products
    await seedSampleProducts();

    console.log('✅ Database seeding completed successfully!');
    console.log('\n📋 Default Admin Credentials:');
    console.log('Main Admin:');
    console.log(`  Email: ${process.env.MAIN_ADMIN_EMAIL || 'ADMIN_MAIN_EMAIL'}`);
    console.log('  Password: Qasim7878,,');
    console.log('\nSecondary Admin:');
    console.log(`  Email: ${process.env.SECONDARY_ADMIN_EMAIL || 'ADMIN_SECONDARY_EMAIL'}`);
    console.log('  Password: Qasim7878,,');
    console.log('\n⚠️  IMPORTANT: Change these passwords immediately after first login!');
    console.log('\n🔑 Allowed Signup IDs: 42001-42030');
    console.log('📦 Sample products created for slots 1-6');

  } catch (error: unknown) {
    console.error('❌ Database seeding failed:', error);
    throw error;
  }
};

/**
 * Seed admin users
 */
const seedAdminUsers = async (): Promise<void> => {
  const doctorRepository = AppDataSource.getRepository(Doctor);

  // Check if admins already exist
  const existingAdmins = await doctorRepository.find({ where: { is_admin: true } });
  if (existingAdmins.length > 0) {
    console.log('👤 Admin users already exist, skipping...');
    return;
  }

  const mainAdminEmail = process.env.MAIN_ADMIN_EMAIL || 'ADMIN_MAIN_EMAIL';
  const secondaryAdminEmail = process.env.SECONDARY_ADMIN_EMAIL || 'ADMIN_SECONDARY_EMAIL';
  const defaultPassword = 'Qasim7878,,';

  // Hash password
  const passwordHash = await hashPassword(defaultPassword);

  // Create main admin
  const mainAdmin = doctorRepository.create({
    email: mainAdminEmail,
    password_hash: passwordHash,
    clinic_name: 'Main Admin Clinic',
    doctor_name: 'Main Administrator',
    whatsapp: '+1234567890',
    signup_id: 'ADMIN_MAIN',
    is_approved: true,
    is_admin: true,
    consent_flag: true,
    consent_at: new Date(),
    approved_at: new Date(),
    doctor_id: 42000 // Special admin ID
  });

  // Create secondary admin (use a different email if both are the same)
  const secondaryAdminEmailFinal = secondaryAdminEmail === mainAdminEmail 
    ? mainAdminEmail.replace('@', '+admin2@') 
    : secondaryAdminEmail;
    
  const secondaryAdmin = doctorRepository.create({
    email: secondaryAdminEmailFinal,
    password_hash: passwordHash,
    clinic_name: 'Secondary Admin Clinic',
    doctor_name: 'Secondary Administrator',
    whatsapp: '+1234567891',
    signup_id: 'ADMIN_SECONDARY',
    is_approved: true,
    is_admin: true,
    consent_flag: true,
    consent_at: new Date(),
    approved_at: new Date(),
    doctor_id: 41999 // Special admin ID
  });

  await doctorRepository.save([mainAdmin, secondaryAdmin]);
  console.log('👤 Admin users created successfully');
};

/**
 * Seed allowed signup IDs
 */
const seedAllowedSignupIds = async (): Promise<void> => {
  const signupIdRepository = AppDataSource.getRepository(AllowedSignupId);

  // Check if signup IDs already exist
  const existingIds = await signupIdRepository.count();
  if (existingIds > 0) {
    console.log('🔑 Allowed signup IDs already exist, skipping...');
    return;
  }

  // Create signup IDs from 42001 to 42030
  const signupIds = [];
  for (let i = 42001; i <= 42030; i++) {
    signupIds.push(
      signupIdRepository.create({
        signup_id: i.toString(),
        is_used: false,
        notes: `Auto-generated signup ID ${i}`
      })
    );
  }

  await signupIdRepository.save(signupIds);
  console.log('🔑 Allowed signup IDs created (42001-42030)');
};

/**
 * Seed sample products
 */
const seedSampleProducts = async (): Promise<void> => {
  const productRepository = AppDataSource.getRepository(Product);

  // Check if products already exist
  const existingProducts = await productRepository.count();
  if (existingProducts > 0) {
    console.log('📦 Products already exist, skipping...');
    return;
  }

  const sampleProducts = [
    {
      slot_index: 1,
      name: 'Medical Gloves - Latex Free',
      description: 'High-quality latex-free medical gloves for safe patient care. Powder-free, ambidextrous design.',
      price: 25.99,
      category: 'Protective Equipment',
      unit: 'box (100 pieces)',
      stock_quantity: 50,
      is_featured: true,
      is_visible: true
    },
    {
      slot_index: 2,
      name: 'Surgical Masks - N95',
      description: 'NIOSH-approved N95 surgical masks with 95% filtration efficiency. Comfortable fit for extended wear.',
      price: 45.50,
      category: 'Protective Equipment',
      unit: 'box (20 pieces)',
      stock_quantity: 30,
      is_featured: true,
      is_visible: true
    },
    {
      slot_index: 3,
      name: 'Digital Thermometer',
      description: 'Fast and accurate digital thermometer with large display. Waterproof design for easy cleaning.',
      price: 15.75,
      category: 'Diagnostic Equipment',
      unit: 'piece',
      stock_quantity: 25,
      is_featured: false,
      is_visible: true
    },
    {
      slot_index: 4,
      name: 'Blood Pressure Monitor',
      description: 'Automatic blood pressure monitor with large cuff. Memory function for multiple users.',
      price: 89.99,
      category: 'Diagnostic Equipment',
      unit: 'piece',
      stock_quantity: 15,
      is_featured: true,
      is_visible: true
    },
    {
      slot_index: 5,
      name: 'Stethoscope - Professional',
      description: 'High-quality stethoscope with excellent acoustic performance. Lightweight and durable.',
      price: 125.00,
      category: 'Diagnostic Equipment',
      unit: 'piece',
      stock_quantity: 20,
      is_featured: false,
      is_visible: true
    },
    {
      slot_index: 6,
      name: 'First Aid Kit - Complete',
      description: 'Comprehensive first aid kit with all essential medical supplies. Portable and organized.',
      price: 75.25,
      category: 'Emergency Supplies',
      unit: 'kit',
      stock_quantity: 10,
      is_featured: false,
      is_visible: true
    }
  ];

  const products = sampleProducts.map(productData => 
    productRepository.create(productData)
  );

  await productRepository.save(products);
  console.log('📦 Sample products created (slots 1-6)');
};

/**
 * Clear all seed data
 */
const clearSeedData = async (): Promise<void> => {
  try {
    console.log('🧹 Clearing seed data...');

    if (!AppDataSource.isInitialized) {
      await AppDataSource.initialize();
    }

    // Clear in reverse order of dependencies
    await AppDataSource.query('DELETE FROM hall_of_pride');
    await AppDataSource.query('DELETE FROM leaderboard_snapshots');
    await AppDataSource.query('DELETE FROM notifications');
    await AppDataSource.query('DELETE FROM research_papers');
    await AppDataSource.query('DELETE FROM orders');
    await AppDataSource.query('DELETE FROM products');
    await AppDataSource.query('DELETE FROM allowed_signup_ids');
    await AppDataSource.query('DELETE FROM doctors');

    console.log('✅ Seed data cleared successfully');
  } catch (error: unknown) {
    console.error('❌ Failed to clear seed data:', error);
    throw error;
  }
};

// Run seeding if this file is executed directly
if (require.main === module) {
  seedDatabase()
    .then(() => {
      console.log('🎉 Seeding completed!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Seeding failed:', error);
      process.exit(1);
    });
}

export { seedDatabase, clearSeedData };
