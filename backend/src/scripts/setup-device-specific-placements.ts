import { AppDataSource } from '../db/data-source';
import { AdvertisementPlacement, PlacementType, PlacementStatus, DeviceType } from '../entities/AdvertisementPlacement';

async function setupDeviceSpecificPlacements() {
  try {
    console.log('🚀 Setting up device-specific advertisement placements...');

    await AppDataSource.initialize();
    const placementRepository = AppDataSource.getRepository(AdvertisementPlacement);

    // Check if device-specific placements already exist
    const existingDevicePlacements = await placementRepository.count({
      where: { device_type: DeviceType.MOBILE }
    });
    
    if (existingDevicePlacements > 0) {
      console.log('✅ Device-specific placements already exist, skipping setup');
      return;
    }

    const deviceSpecificPlacements = [
      // MOBILE PLACEMENTS
      {
        name: 'Mobile Header Banner',
        description: 'Top banner advertisement optimized for mobile devices',
        type: PlacementType.BANNER,
        position: 'mobile-top',
        max_ads: 1,
        dimensions: { width: 320, height: 50, min_width: 280, max_width: 400 },
        styles: {
          background_color: '#ffffff',
          border_radius: 6,
          padding: 8,
          margin: 5,
          z_index: 100
        },
        allow_user_selection: true,
        visible_to_guests: true,
        device_type: DeviceType.MOBILE,
        responsive_breakpoints: {
          mobile: { width: 320, height: 50 },
          tablet: { width: 728, height: 90 }
        },
        status: PlacementStatus.ACTIVE,
        priority: 100,
        admin_notes: 'Mobile-optimized header banner for maximum mobile visibility'
      },
      {
        name: 'Mobile Sidebar',
        description: 'Sidebar advertisement for mobile devices',
        type: PlacementType.SIDEBAR,
        position: 'mobile-sidebar',
        max_ads: 1,
        dimensions: { width: 300, height: 250, min_width: 250, max_width: 350 },
        styles: {
          background_color: '#f8f9fa',
          border_radius: 12,
          padding: 15,
          margin: 10,
          z_index: 50
        },
        allow_user_selection: true,
        visible_to_guests: false,
        device_type: DeviceType.MOBILE,
        responsive_breakpoints: {
          mobile: { width: 300, height: 250 }
        },
        status: PlacementStatus.ACTIVE,
        priority: 90,
        admin_notes: 'Mobile sidebar for authenticated users'
      },
      {
        name: 'Mobile Content Inline',
        description: 'Content-integrated advertisement for mobile',
        type: PlacementType.CONTENT,
        position: 'mobile-content',
        max_ads: 1,
        dimensions: { width: 300, height: 200, min_width: 250, max_width: 400 },
        styles: {
          background_color: '#ffffff',
          border_radius: 8,
          padding: 15,
          margin: 15,
          z_index: 30
        },
        allow_user_selection: true,
        visible_to_guests: true,
        device_type: DeviceType.MOBILE,
        responsive_breakpoints: {
          mobile: { width: 300, height: 200 }
        },
        status: PlacementStatus.ACTIVE,
        priority: 80,
        admin_notes: 'Mobile content integration for better engagement'
      },
      {
        name: 'Mobile Footer Banner',
        description: 'Bottom banner advertisement for mobile devices',
        type: PlacementType.FOOTER,
        position: 'mobile-bottom',
        max_ads: 1,
        dimensions: { width: 320, height: 50, min_width: 280, max_width: 400 },
        styles: {
          background_color: '#ffffff',
          border_radius: 6,
          padding: 8,
          margin: 5,
          z_index: 100
        },
        allow_user_selection: true,
        visible_to_guests: true,
        device_type: DeviceType.MOBILE,
        responsive_breakpoints: {
          mobile: { width: 320, height: 50 }
        },
        status: PlacementStatus.ACTIVE,
        priority: 70,
        admin_notes: 'Mobile footer banner for additional visibility'
      },

      // DESKTOP PLACEMENTS
      {
        name: 'Desktop Header Banner',
        description: 'Large header banner for desktop and laptop devices',
        type: PlacementType.BANNER,
        position: 'desktop-top',
        max_ads: 1,
        dimensions: { width: 728, height: 90, min_width: 600, max_width: 1200 },
        styles: {
          background_color: '#ffffff',
          border_radius: 8,
          padding: 10,
          margin: 5,
          z_index: 100
        },
        allow_user_selection: true,
        visible_to_guests: true,
        device_type: DeviceType.DESKTOP,
        responsive_breakpoints: {
          desktop: { width: 728, height: 90 },
          tablet: { width: 600, height: 80 }
        },
        status: PlacementStatus.ACTIVE,
        priority: 100,
        admin_notes: 'Desktop header banner for maximum desktop visibility'
      },
      {
        name: 'Desktop Sidebar Top',
        description: 'Premium sidebar position for desktop users',
        type: PlacementType.SIDEBAR,
        position: 'desktop-sidebar-top',
        max_ads: 2,
        dimensions: { width: 300, height: 250, min_width: 250, max_width: 350 },
        styles: {
          background_color: '#f8f9fa',
          border_radius: 12,
          padding: 15,
          margin: 10,
          z_index: 50
        },
        allow_user_selection: true,
        visible_to_guests: false,
        device_type: DeviceType.DESKTOP,
        responsive_breakpoints: {
          desktop: { width: 300, height: 250 },
          tablet: { width: 250, height: 200 }
        },
        status: PlacementStatus.ACTIVE,
        priority: 95,
        admin_notes: 'Premium desktop sidebar position'
      },
      {
        name: 'Desktop Content Inline',
        description: 'Large content-integrated advertisement for desktop',
        type: PlacementType.CONTENT,
        position: 'desktop-content',
        max_ads: 1,
        dimensions: { width: 600, height: 200, min_width: 500, max_width: 800 },
        styles: {
          background_color: '#ffffff',
          border_radius: 8,
          padding: 20,
          margin: 20,
          z_index: 30
        },
        allow_user_selection: true,
        visible_to_guests: true,
        device_type: DeviceType.DESKTOP,
        responsive_breakpoints: {
          desktop: { width: 600, height: 200 },
          tablet: { width: 500, height: 150 }
        },
        status: PlacementStatus.ACTIVE,
        priority: 85,
        admin_notes: 'Desktop content integration for better engagement'
      },
      {
        name: 'Desktop Sidebar Bottom',
        description: 'Secondary sidebar position for desktop',
        type: PlacementType.SIDEBAR,
        position: 'desktop-sidebar-bottom',
        max_ads: 1,
        dimensions: { width: 300, height: 250, min_width: 250, max_width: 350 },
        styles: {
          background_color: '#f8f9fa',
          border_radius: 12,
          padding: 15,
          margin: 10,
          z_index: 50
        },
        allow_user_selection: true,
        visible_to_guests: false,
        device_type: DeviceType.DESKTOP,
        responsive_breakpoints: {
          desktop: { width: 300, height: 250 }
        },
        status: PlacementStatus.ACTIVE,
        priority: 80,
        admin_notes: 'Secondary desktop sidebar position'
      },
      {
        name: 'Desktop Footer Banner',
        description: 'Large footer banner for desktop devices',
        type: PlacementType.FOOTER,
        position: 'desktop-bottom',
        max_ads: 1,
        dimensions: { width: 728, height: 90, min_width: 600, max_width: 1200 },
        styles: {
          background_color: '#ffffff',
          border_radius: 8,
          padding: 10,
          margin: 5,
          z_index: 100
        },
        allow_user_selection: true,
        visible_to_guests: true,
        device_type: DeviceType.DESKTOP,
        responsive_breakpoints: {
          desktop: { width: 728, height: 90 },
          tablet: { width: 600, height: 80 }
        },
        status: PlacementStatus.ACTIVE,
        priority: 75,
        admin_notes: 'Desktop footer banner for additional visibility'
      },

      // TABLET PLACEMENTS
      {
        name: 'Tablet Header Banner',
        description: 'Medium header banner for tablet devices',
        type: PlacementType.BANNER,
        position: 'tablet-top',
        max_ads: 1,
        dimensions: { width: 600, height: 80, min_width: 500, max_width: 800 },
        styles: {
          background_color: '#ffffff',
          border_radius: 8,
          padding: 10,
          margin: 5,
          z_index: 100
        },
        allow_user_selection: true,
        visible_to_guests: true,
        device_type: DeviceType.TABLET,
        responsive_breakpoints: {
          tablet: { width: 600, height: 80 }
        },
        status: PlacementStatus.ACTIVE,
        priority: 100,
        admin_notes: 'Tablet-optimized header banner'
      },
      {
        name: 'Tablet Sidebar',
        description: 'Sidebar advertisement for tablet devices',
        type: PlacementType.SIDEBAR,
        position: 'tablet-sidebar',
        max_ads: 1,
        dimensions: { width: 250, height: 200, min_width: 200, max_width: 300 },
        styles: {
          background_color: '#f8f9fa',
          border_radius: 12,
          padding: 15,
          margin: 10,
          z_index: 50
        },
        allow_user_selection: true,
        visible_to_guests: false,
        device_type: DeviceType.TABLET,
        responsive_breakpoints: {
          tablet: { width: 250, height: 200 }
        },
        status: PlacementStatus.ACTIVE,
        priority: 90,
        admin_notes: 'Tablet sidebar for authenticated users'
      }
    ];

    // Create device-specific placements
    for (const placementData of deviceSpecificPlacements) {
      const placement = placementRepository.create(placementData);
      await placementRepository.save(placement);
      console.log(`✅ Created ${placementData.device_type} placement: ${placement.name}`);
    }

    console.log('🎉 Device-specific advertisement placements created successfully!');
    console.log('📊 Created placements by device:');
    
    const mobileCount = deviceSpecificPlacements.filter(p => p.device_type === DeviceType.MOBILE).length;
    const desktopCount = deviceSpecificPlacements.filter(p => p.device_type === DeviceType.DESKTOP).length;
    const tabletCount = deviceSpecificPlacements.filter(p => p.device_type === DeviceType.TABLET).length;
    
    console.log(`   - Mobile: ${mobileCount} placements`);
    console.log(`   - Desktop: ${desktopCount} placements`);
    console.log(`   - Tablet: ${tabletCount} placements`);

  } catch (error: unknown) {
    console.error('❌ Error setting up device-specific placements:', error);
    throw error;
  } finally {
    if (AppDataSource.isInitialized) {
      await AppDataSource.destroy();
    }
  }
}

// Run the setup if this file is executed directly
if (require.main === module) {
  setupDeviceSpecificPlacements()
    .then(() => {
      console.log('✅ Device-specific placements setup completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Device-specific placements setup failed:', error);
      process.exit(1);
    });
}

export { setupDeviceSpecificPlacements };
