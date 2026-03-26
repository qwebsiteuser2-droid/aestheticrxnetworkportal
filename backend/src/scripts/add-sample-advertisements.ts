import { AppDataSource } from '../db/data-source';
import { Advertisement, AdvertisementStatus, AdvertisementType } from '../entities/Advertisement';
import { AdvertisementPlacement } from '../entities/AdvertisementPlacement';
import { Doctor } from '../models/Doctor';

async function addSampleAdvertisements() {
  try {
    await AppDataSource.initialize();
    console.log('✅ Database connected');

    // Get some placements
    const placementRepo = AppDataSource.getRepository(AdvertisementPlacement);
    const doctorRepo = AppDataSource.getRepository(Doctor);
    const adRepo = AppDataSource.getRepository(Advertisement);

    // Get placements
    const headerBanner = await placementRepo.findOne({ where: { name: 'Header Banner' } });
    const sidebarTop = await placementRepo.findOne({ where: { name: 'Sidebar Top' } });
    const contentInline = await placementRepo.findOne({ where: { name: 'Content Inline' } });
    const footerBanner = await placementRepo.findOne({ where: { name: 'Footer Banner' } });
    const mobileHeader = await placementRepo.findOne({ where: { name: 'Mobile Header' } });
    const mobileSidebar = await placementRepo.findOne({ where: { name: 'Mobile Sidebar' } });

    // Get a doctor (we'll use the first one or create a mock one)
    let doctor = await doctorRepo.findOne({ where: {} });
    if (!doctor) {
      // Create a mock doctor for demo purposes
      doctor = doctorRepo.create({
        doctor_id: 999999,
        doctor_name: 'Dr. Demo User',
        clinic_name: 'Demo Medical Center',
        email: 'demo@example.com',
        password_hash: 'demo_hash',
        whatsapp: '+92-300-1234567',
        google_location: {
          lat: 24.8607,
          lng: 67.0011,
          address: 'Demo Address, Karachi'
        },
        signup_id: 'demo-signup-123',
        is_approved: true,
        is_admin: false,
        is_deactivated: false,
        consent_flag: true,
        consent_at: new Date(),
        approved_at: new Date(),
        tier: 'Lead Starter',
        base_tier: 'Lead Starter',
        tier_progress: 0,
        current_sales: 0
      });
      await doctorRepo.save(doctor);
      console.log('✅ Created demo doctor');
    }

    // Sample advertisements
    const sampleAds = [
      {
        title: '🏥 Premium Medical Equipment',
        description: 'Get the latest medical equipment for your clinic. High quality, competitive prices, fast delivery.',
        type: AdvertisementType.BANNER,
        image_url: 'https://images.unsplash.com/photo-1559757148-5c350d0d3c56?w=400&h=200&fit=crop',
        target_url: 'https://example.com/medical-equipment',
        button_text: 'Shop Now',
        button_color: '#2563eb',
        background_color: '#f8fafc',
        text_color: '#1e293b',
        placement: headerBanner,
        status: AdvertisementStatus.ACTIVE
      },
      {
        title: '💊 Pharmaceutical Supplies',
        description: 'Quality medicines and pharmaceutical supplies for your practice. Trusted by 1000+ clinics.',
        type: AdvertisementType.BANNER,
        image_url: 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=300&h=250&fit=crop',
        target_url: 'https://example.com/pharma-supplies',
        button_text: 'Order Now',
        button_color: '#059669',
        background_color: '#f0fdf4',
        text_color: '#14532d',
        placement: sidebarTop,
        status: AdvertisementStatus.ACTIVE
      },
      {
        title: '🔬 Laboratory Services',
        description: 'Professional lab testing services. Accurate results, quick turnaround, competitive pricing.',
        type: AdvertisementType.BANNER,
        image_url: 'https://images.unsplash.com/photo-1576091160399-112ba8d25d1f?w=600&h=200&fit=crop',
        target_url: 'https://example.com/lab-services',
        button_text: 'Book Test',
        button_color: '#7c3aed',
        background_color: '#faf5ff',
        text_color: '#581c87',
        placement: contentInline,
        status: AdvertisementStatus.ACTIVE
      },
      {
        title: '📱 Medical Software Solutions',
        description: 'Digital solutions for modern clinics. Patient management, billing, and more.',
        type: AdvertisementType.BANNER,
        image_url: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=728&h=90&fit=crop',
        target_url: 'https://example.com/medical-software',
        button_text: 'Learn More',
        button_color: '#dc2626',
        background_color: '#fef2f2',
        text_color: '#991b1b',
        placement: footerBanner,
        status: AdvertisementStatus.ACTIVE
      },
      {
        title: '🏥 Mobile Health App',
        description: 'Manage your clinic on the go. Mobile app for doctors and patients.',
        type: AdvertisementType.BANNER,
        image_url: 'https://images.unsplash.com/photo-1512941937669-90a1b58e7e9c?w=320&h=50&fit=crop',
        target_url: 'https://example.com/mobile-app',
        button_text: 'Download',
        button_color: '#ea580c',
        background_color: '#fff7ed',
        text_color: '#9a3412',
        placement: mobileHeader,
        status: AdvertisementStatus.ACTIVE
      },
      {
        title: '💉 Vaccination Services',
        description: 'Complete vaccination programs for all age groups. Safe and effective.',
        type: AdvertisementType.BANNER,
        image_url: 'https://images.unsplash.com/photo-1584515933487-779824d29309?w=300&h=250&fit=crop',
        target_url: 'https://example.com/vaccination',
        button_text: 'Schedule',
        button_color: '#0891b2',
        background_color: '#f0f9ff',
        text_color: '#0c4a6e',
        placement: mobileSidebar,
        status: AdvertisementStatus.ACTIVE
      }
    ];

    // Add advertisements to database
    for (const adData of sampleAds) {
      if (adData.placement) {
        const advertisement = adRepo.create({
          title: adData.title,
          description: adData.description,
          type: adData.type,
          image_url: adData.image_url,
          target_url: adData.target_url,
          button_text: adData.button_text,
          button_color: adData.button_color,
          background_color: adData.background_color,
          text_color: adData.text_color,
          placement: adData.placement,
          doctor: doctor,
          status: adData.status,
          start_date: new Date(),
          end_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
          budget: 5000,
          is_active: true
        });

        await adRepo.save(advertisement);
        console.log(`✅ Added advertisement: ${adData.title}`);
      }
    }

    console.log('🎉 Sample advertisements added successfully!');
    console.log('📊 You can now see them in the admin panel and on the website');

  } catch (error: unknown) {
    console.error('❌ Error adding sample advertisements:', error);
  } finally {
    await AppDataSource.destroy();
  }
}

// Run the script
addSampleAdvertisements();
