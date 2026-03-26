import { AppDataSource } from '../db/data-source';
import { Doctor } from '../models/Doctor';
import { hashPassword } from '../utils/password';

async function createAdditionalAdmins() {
  try {
    await AppDataSource.initialize();
    console.log('✅ Database connection established');

    const doctorRepository = AppDataSource.getRepository(Doctor);

    // Admin 1: Full admin access (can edit in admin panel)
    const fullAdmin = {
      email: 'asadkhanbloch4949@gmail.com',
      password_hash: await hashPassword('admin123'), // Using same password as existing admin
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

    // Admin 2: Viewer only (can only view, cannot edit)
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

    // Check if admins already exist
    const existingFullAdmin = await doctorRepository.findOne({ where: { email: fullAdmin.email } });
    const existingViewerAdmin = await doctorRepository.findOne({ where: { email: viewerAdmin.email } });

    if (existingFullAdmin) {
      console.log('⚠️ Full admin already exists:', fullAdmin.email);
    } else {
      const savedFullAdmin = doctorRepository.create(fullAdmin);
      await doctorRepository.save(savedFullAdmin);
      console.log('✅ Full admin created:', fullAdmin.email);
    }

    if (existingViewerAdmin) {
      console.log('⚠️ Viewer admin already exists:', viewerAdmin.email);
    } else {
      const savedViewerAdmin = doctorRepository.create(viewerAdmin);
      await doctorRepository.save(savedViewerAdmin);
      console.log('✅ Viewer admin created:', viewerAdmin.email);
    }

    console.log('\n🎉 Admin Users Created Successfully!');
    console.log('📧 Full Admin (Can Edit): asadkhanbloch4949@gmail.com');
    console.log('📧 Viewer Admin (View Only): muhammadqasimshabbir3@gmail.com');
    console.log('🔑 Password for Full Admin: admin123');
    console.log('🔑 Password for Viewer Admin: Qasim7878');

  } catch (error: unknown) {
    console.error('❌ Error creating admin users:', error);
  } finally {
    await AppDataSource.destroy();
  }
}

createAdditionalAdmins();
