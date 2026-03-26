import { AppDataSource } from '../db/data-source';
import { Doctor } from '../models/Doctor';
import { hashPassword } from '../utils/password';

async function fixFullAdmin() {
  try {
    await AppDataSource.initialize();
    console.log('✅ Database connection established');

    const doctorRepository = AppDataSource.getRepository(Doctor);

    // Check if full admin exists
    const existingFullAdmin = await doctorRepository.findOne({ 
      where: { email: 'asadkhanbloch4949@gmail.com' } 
    });

    if (existingFullAdmin) {
      console.log('📧 Full admin found, updating password...');
      
      // Update the password to ensure it's correct
      existingFullAdmin.password_hash = await hashPassword('admin123');
      existingFullAdmin.is_admin = true;
      existingFullAdmin.is_approved = true;
      existingFullAdmin.consent_flag = true;
      existingFullAdmin.consent_at = new Date();
      existingFullAdmin.approved_at = new Date();
      
      await doctorRepository.save(existingFullAdmin);
      console.log('✅ Full admin password updated successfully');
      
      // Display admin details
      console.log('\n📋 Full Admin Details:');
      console.log('Email:', existingFullAdmin.email);
      console.log('Name:', existingFullAdmin.doctor_name);
      console.log('Clinic:', existingFullAdmin.clinic_name);
      console.log('Is Admin:', existingFullAdmin.is_admin);
      console.log('Is Approved:', existingFullAdmin.is_approved);
      console.log('Doctor ID:', existingFullAdmin.doctor_id);
      
    } else {
      console.log('❌ Full admin not found, creating new one...');
      
      // Create new full admin
      const fullAdmin = {
        email: 'asadkhanbloch4949@gmail.com',
        password_hash: await hashPassword('admin123'),
        doctor_name: 'Asad Khan Bloch',
        clinic_name: 'Admin Clinic',
        is_admin: true,
        is_approved: true,
        doctor_id: 1001,
        whatsapp: '+92-300-1234567',
        signup_id: 'ADMIN-001',
        consent_flag: true,
        consent_at: new Date(),
        approved_at: new Date(),
        google_location: {
          lat: 24.8607,
          lng: 67.0011,
          address: 'Karachi, Pakistan'
        }
      };

      const savedFullAdmin = doctorRepository.create(fullAdmin);
      await doctorRepository.save(savedFullAdmin);
      console.log('✅ Full admin created successfully');
    }

    console.log('\n🎉 Full Admin Setup Complete!');
    console.log('📧 Email: asadkhanbloch4949@gmail.com');
    console.log('🔑 Password: admin123');
    console.log('👤 Role: Full Admin (Can Edit)');
    console.log('✅ Status: Ready to login');

  } catch (error: unknown) {
    console.error('❌ Error fixing full admin:', error);
  } finally {
    await AppDataSource.destroy();
  }
}

fixFullAdmin();
