import { AppDataSource } from '../db/data-source';
import { AdvertisementPlacement, PlacementType, PlacementStatus } from '../entities/AdvertisementPlacement';

async function setupAdvertisementPlacements() {
  try {
    console.log('🚀 Setting up default advertisement placements...');

    await AppDataSource.initialize();
    const placementRepository = AppDataSource.getRepository(AdvertisementPlacement);

    // Check if placements already exist
    const existingPlacements = await placementRepository.count();
    if (existingPlacements > 0) {
      console.log('✅ Advertisement placements already exist, skipping setup');
      return;
    }

    const defaultPlacements = [
      {
        name: 'Header Banner',
        description: 'Top banner advertisement visible to all users',
        type: PlacementType.BANNER,
        position: 'top-center',
        max_ads: 1,
        dimensions: { width: 728, height: 90, min_width: 300, max_width: 1200 },
        styles: {
          background_color: '#ffffff',
          border_radius: 8,
          padding: 10,
          margin: 5,
          z_index: 100
        },
        allow_user_selection: true,
        visible_to_guests: true,
        status: PlacementStatus.ACTIVE,
        priority: 100,
        admin_notes: 'Primary header banner for maximum visibility'
      },
      {
        name: 'Sidebar Top',
        description: 'Top position in sidebar for logged-in users',
        type: PlacementType.SIDEBAR,
        position: 'sidebar-top',
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
        status: PlacementStatus.ACTIVE,
        priority: 90,
        admin_notes: 'Premium sidebar position for authenticated users'
      },
      {
        name: 'Content Inline',
        description: 'Advertisement integrated within content flow',
        type: PlacementType.CONTENT,
        position: 'content-middle',
        max_ads: 1,
        dimensions: { width: 600, height: 200, min_width: 300, max_width: 800 },
        styles: {
          background_color: '#ffffff',
          border_radius: 8,
          padding: 20,
          margin: 20,
          z_index: 30
        },
        allow_user_selection: true,
        visible_to_guests: true,
        status: PlacementStatus.ACTIVE,
        priority: 80,
        admin_notes: 'Native content integration for better engagement'
      },
      {
        name: 'Footer Banner',
        description: 'Bottom banner advertisement',
        type: PlacementType.FOOTER,
        position: 'bottom-center',
        max_ads: 1,
        dimensions: { width: 728, height: 90, min_width: 300, max_width: 1200 },
        styles: {
          background_color: '#ffffff',
          border_radius: 8,
          padding: 10,
          margin: 5,
          z_index: 100
        },
        allow_user_selection: true,
        visible_to_guests: true,
        status: PlacementStatus.ACTIVE,
        priority: 70,
        admin_notes: 'Footer banner for additional visibility'
      },
      {
        name: 'Mobile Header',
        description: 'Mobile-optimized header advertisement',
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
        status: PlacementStatus.ACTIVE,
        priority: 95,
        admin_notes: 'Mobile-optimized header for responsive design'
      },
      {
        name: 'Popup Overlay',
        description: 'Overlay advertisement (use sparingly)',
        type: PlacementType.POPUP,
        position: 'center-overlay',
        max_ads: 1,
        dimensions: { width: 400, height: 300, min_width: 300, max_width: 500 },
        styles: {
          background_color: '#ffffff',
          border_radius: 12,
          padding: 20,
          margin: 0,
          z_index: 1000
        },
        allow_user_selection: false,
        visible_to_guests: true,
        status: PlacementStatus.INACTIVE,
        priority: 60,
        admin_notes: 'Popup overlay - admin approval required for activation'
      },
      {
        name: 'Sidebar Bottom',
        description: 'Bottom position in sidebar',
        type: PlacementType.SIDEBAR,
        position: 'sidebar-bottom',
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
        status: PlacementStatus.ACTIVE,
        priority: 75,
        admin_notes: 'Secondary sidebar position'
      }
    ];

    // Create placements
    for (const placementData of defaultPlacements) {
      const placement = placementRepository.create(placementData);
      await placementRepository.save(placement);
      console.log(`✅ Created placement: ${placement.name}`);
    }

    console.log('🎉 Default advertisement placements created successfully!');
    console.log('📊 Created placements:');
    defaultPlacements.forEach(placement => {
      console.log(`   - ${placement.name} (${placement.type}, Priority: ${placement.priority})`);
    });

  } catch (error: unknown) {
    console.error('❌ Error setting up advertisement placements:', error);
    throw error;
  } finally {
    if (AppDataSource.isInitialized) {
      await AppDataSource.destroy();
    }
  }
}

// Run the setup if this file is executed directly
if (require.main === module) {
  setupAdvertisementPlacements()
    .then(() => {
      console.log('✅ Advertisement placements setup completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Advertisement placements setup failed:', error);
      process.exit(1);
    });
}

export { setupAdvertisementPlacements };
