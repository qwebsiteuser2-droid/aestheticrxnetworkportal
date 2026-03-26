import { AppDataSource } from '../db/data-source';
import { Doctor } from '../models/Doctor';
import { hashPassword } from '../utils/password';

async function fixViewerAdmin() {
  try {
    await AppDataSource.initialize();
    console.log('✅ Database connection established');

    const doctorRepository = AppDataSource.getRepository(Doctor);

    // Check if viewer admin exists
    const existingViewerAdmin = await doctorRepository.findOne({ 
      where: { email: 'muhammadqasimshabbir3@gmail.com' } 
    });

    if (existingViewerAdmin) {
      console.log('📧 Viewer admin found, updating password...');
      
      // Update the password to ensure it's correct
      existingViewerAdmin.password_hash = await hashPassword('Qasim7878');
      existingViewerAdmin.is_admin = true;
      existingViewerAdmin.is_approved = true;
      existingViewerAdmin.consent_flag = true;
      existingViewerAdmin.consent_at = new Date();
      existingViewerAdmin.approved_at = new Date();
      
      await doctorRepository.save(existingViewerAdmin);
      console.log('✅ Viewer admin password updated successfully');
      
      // Display admin details
      console.log('\n📋 Viewer Admin Details:');
      console.log('Email:', existingViewerAdmin.email);
      console.log('Name:', existingViewerAdmin.doctor_name);
      console.log('Clinic:', existingViewerAdmin.clinic_name);
      console.log('Is Admin:', existingViewerAdmin.is_admin);
      console.log('Is Approved:', existingViewerAdmin.is_approved);
      console.log('Doctor ID:', existingViewerAdmin.doctor_id);
      
    } else {
      console.log('❌ Viewer admin not found, creating new one...');
      
      // Create new viewer admin
      const viewerAdmin = {
        email: 'muhammadqasimshabbir3@gmail.com',
        password_hash: await hashPassword('Qasim7878'),
        doctor_name: 'Muhammad Qasim Shabbir',
        clinic_name: 'Viewer Admin Clinic',
        is_admin: true,
        is_approved: true,
        doctor_id: 1002,
        whatsapp: '+92-300-7654321',
        signup_id: 'ADMIN-002',
        consent_flag: true,
        consent_at: new Date(),
        approved_at: new Date(),
        google_location: {
          lat: 24.8607,
          lng: 67.0011,
          address: 'Karachi, Pakistan'
        }
      };

      const savedViewerAdmin = doctorRepository.create(viewerAdmin);
      await doctorRepository.save(savedViewerAdmin);
      console.log('✅ Viewer admin created successfully');
    }

    // Test login by checking password
    console.log('\n🔐 Testing password verification...');
    const testAdmin = await doctorRepository.findOne({ 
      where: { email: 'muhammadqasimshabbir3@gmail.com' } 
    });
    
    if (testAdmin) {
      const bcrypt = require('bcrypt');
      const passwordMatch = await bcrypt.compare('Qasim7878', testAdmin.password_hash);
      console.log('Password verification:', passwordMatch ? '✅ SUCCESS' : '❌ FAILED');
      
      if (passwordMatch) {
        console.log('\n🎉 Viewer Admin Setup Complete!');
        console.log('📧 Email: muhammadqasimshabbir3@gmail.com');
        console.log('🔑 Password: Qasim7878');
        console.log('👤 Role: Viewer Admin (View Only)');
        console.log('✅ Status: Ready to login');
      }
    }

  } catch (error: unknown) {
    console.error('❌ Error fixing viewer admin:', error);
  } finally {
    await AppDataSource.destroy();
  }
}

fixViewerAdmin();
