import { AppDataSource } from '../db/data-source';
import { Doctor } from '../models/Doctor';

/**
 * Delete a user by email
 */
async function deleteUser(email: string) {
  try {
    await AppDataSource.initialize();
    console.log('✅ Database connection established');

    const doctorRepository = AppDataSource.getRepository(Doctor);
    
    // Find user by email (case-insensitive)
    const user = await doctorRepository
      .createQueryBuilder('doctor')
      .where('LOWER(TRIM(doctor.email)) = LOWER(TRIM(:email))', { email: email.trim() })
      .getOne();

    if (!user) {
      console.log(`❌ User with email "${email}" not found`);
      return;
    }

    console.log(`📧 Found user: ${user.email}`);
    console.log(`👤 Name: ${user.doctor_name}`);
    console.log(`🆔 ID: ${user.id}`);
    console.log(`📋 Type: ${user.user_type}`);

    // Delete the user
    await doctorRepository.remove(user);
    console.log(`✅ User "${email}" deleted successfully`);

  } catch (error) {
    console.error('❌ Error deleting user:', error);
  } finally {
    await AppDataSource.destroy();
    console.log('✅ Database connection closed');
  }
}

// Get email from command line argument
const email = process.argv[2];

if (!email) {
  console.error('❌ Please provide an email address');
  console.log('Usage: ts-node src/scripts/delete-user.ts <email>');
  process.exit(1);
}

deleteUser(email);

