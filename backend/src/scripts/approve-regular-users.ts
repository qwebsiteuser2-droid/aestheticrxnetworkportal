import { AppDataSource } from '../db/data-source';
import { Doctor, UserType } from '../models/Doctor';

async function approveRegularUsers() {
  try {
    await AppDataSource.initialize();
    console.log('✅ Database connection established');

    const doctorRepository = AppDataSource.getRepository(Doctor);
    
    // Find all regular users that are not approved
    // Use raw query to handle enum type casting
    const regularUsers = await doctorRepository
      .createQueryBuilder('doctor')
      .where('doctor.user_type::text = :userType', { userType: 'regular_user' })
      .andWhere('doctor.is_approved = :approved', { approved: false })
      .getMany();

    console.log(`📧 Found ${regularUsers.length} regular users that need to be approved`);

    if (regularUsers.length === 0) {
      console.log('✅ All regular users are already approved');
      return;
    }

    // Approve all regular users
    for (const user of regularUsers) {
      console.log(`📧 Approving user: ${user.email} (${user.doctor_name})`);
      user.is_approved = true;
      user.approved_at = new Date();
      await doctorRepository.save(user);
      console.log(`✅ User ${user.email} approved`);
    }

    console.log(`✅ Successfully approved ${regularUsers.length} regular users`);

  } catch (error) {
    console.error('❌ Error approving regular users:', error);
  } finally {
    await AppDataSource.destroy();
    console.log('✅ Database connection closed');
  }
}

approveRegularUsers();

