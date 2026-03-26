import { AppDataSource } from '../db/data-source';
import { Doctor } from '../models/Doctor';
import bcrypt from 'bcryptjs';

async function createAdmin() {
  try {
    await AppDataSource.initialize();
    console.log('✅ Database connected');

    // Create admin user
    const adminEmail = 'admin@example.com';
    const adminPassword = 'admin123';
    
    // Check if admin already exists
    const existingAdmin = await AppDataSource.getRepository(Doctor).findOne({
      where: { email: adminEmail }
    });

    if (existingAdmin) {
      console.log('Admin already exists, updating password...');
      existingAdmin.password_hash = await bcrypt.hash(adminPassword, 10);
      existingAdmin.is_admin = true;
      existingAdmin.is_approved = true;
      await AppDataSource.getRepository(Doctor).save(existingAdmin);
      console.log('✅ Admin password updated');
    } else {
      // Create new admin
      const admin = new Doctor();
      admin.email = adminEmail;
      admin.password_hash = await bcrypt.hash(adminPassword, 10);
      admin.doctor_name = 'Admin User';
      admin.clinic_name = 'Admin Clinic';
      admin.is_admin = true;
      admin.is_approved = true;
      admin.doctor_id = 99999;
      admin.whatsapp = '+1234567890';
      admin.google_location = { lat: 24.8607, lng: 67.0011, address: 'Admin Location' };
      admin.signup_id = 'ADMIN001';
      admin.consent_flag = true;
      admin.consent_at = new Date();
      admin.approved_at = new Date();

      await AppDataSource.getRepository(Doctor).save(admin);
      console.log('✅ Admin user created');
    }

    console.log(`Admin credentials:`);
    console.log(`Email: ${adminEmail}`);
    console.log(`Password: ${adminPassword}`);

  } catch (error: unknown) {
    console.error('❌ Error creating admin:', error);
  } finally {
    await AppDataSource.destroy();
  }
}

createAdmin();
