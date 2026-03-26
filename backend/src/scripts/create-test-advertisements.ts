/**
 * Script to create test advertisements for testing purposes
 * 
 * This script creates test advertisements in various areas with proper dates
 * Run with: npx ts-node src/scripts/create-test-advertisements.ts
 */

import { AppDataSource } from '../db/data-source';
import { VideoAdvertisement } from '../models/VideoAdvertisement';
import { Doctor } from '../models/Doctor';
import { AdvertisementAreaConfig } from '../models/AdvertisementAreaConfig';

const createTestAdvertisements = async () => {
  try {
    console.log('🔄 Initializing database connection...');
    
    if (!AppDataSource.isInitialized) {
      await AppDataSource.initialize();
    }
    
    console.log('✅ Database connected');
    
    // Get admin user (first admin found)
    const doctorRepository = AppDataSource.getRepository(Doctor);
    const admin = await doctorRepository.findOne({
      where: { is_admin: true, is_approved: true }
    });
    
    if (!admin) {
      console.error('❌ No admin user found. Please create an admin user first.');
      process.exit(1);
    }
    
    console.log(`✅ Using admin: ${admin.email} (${admin.id})`);
    
    // Get available advertisement areas using raw query to avoid schema issues
    const areaRepository = AppDataSource.getRepository(AdvertisementAreaConfig);
    let areas: AdvertisementAreaConfig[] = [];
    try {
      areas = await areaRepository
        .createQueryBuilder('area')
        .select([
          'area.id',
          'area.area_name',
          'area.display_name',
          'area.base_hourly_rate',
          'area.pricing_tiers',
          'area.max_concurrent_ads',
          'area.is_active'
        ])
        .where('area.is_active = :active', { active: true })
        .getMany();
    } catch (error: unknown) {
      console.error('Error fetching areas with query builder, trying simple find:', error);
      // Fallback: try to get areas using raw SQL
      const rawAreas = await AppDataSource.query(`
        SELECT area_name, base_hourly_rate, pricing_tiers, max_concurrent_ads 
        FROM advertisement_area_configs 
        WHERE is_active = true
      `);
      console.log(`Found ${rawAreas.length} areas using raw query`);
      // Create minimal area objects
      areas = rawAreas.map((row: any) => ({
        area_name: row.area_name,
        getCurrentRate: () => parseFloat(row.base_hourly_rate) || 10
      })) as any;
    }
    
    if (areas.length === 0) {
      console.error('❌ No active advertisement areas found. Please create areas first.');
      process.exit(1);
    }
    
    console.log(`✅ Found ${areas.length} active advertisement areas`);
    
    // Get repository
    const adRepository = AppDataSource.getRepository(VideoAdvertisement);
    
    // Calculate dates (active for next 30 days)
    const now = new Date();
    const startDate = new Date(now);
    startDate.setHours(0, 0, 0, 0); // Start of today
    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + 30); // 30 days from now
    
    console.log(`📅 Creating ads active from ${startDate.toISOString()} to ${endDate.toISOString()}`);
    
    // Test advertisements data
    const testAds = [
      {
        title: 'Test Hero Section Ad - Desktop',
        description: 'This is a test advertisement for the hero section on desktop',
        type: 'image',
        selected_area: 'hero_section_main',
        duration_type: 'days',
        duration_value: 30,
        status: 'approved',
        payment_status: 'paid',
        payment_method: 'cash',
        content: 'Visit our clinic for the best medical services!',
        target_url: 'https://example.com',
        button_text: 'Learn More',
        button_color: '#007bff',
        background_color: '#ffffff',
        text_color: '#000000'
      },
      {
        title: 'Test Mobile Hero Ad',
        description: 'Test advertisement for mobile hero section',
        type: 'image',
        selected_area: 'mobile-hero-section',
        duration_type: 'days',
        duration_value: 30,
        status: 'approved',
        payment_status: 'paid',
        payment_method: 'cash',
        content: 'Mobile-friendly medical services',
        target_url: 'https://example.com',
        button_text: 'Contact Us',
        button_color: '#28a745',
        background_color: '#f8f9fa',
        text_color: '#212529'
      },
      {
        title: 'Test Research Papers Section',
        description: 'Advertisement in research papers section',
        type: 'text',
        selected_area: 'research_papers_section',
        duration_type: 'days',
        duration_value: 30,
        status: 'approved',
        payment_status: 'paid',
        payment_method: 'cash',
        content: 'Check out our latest research publications!',
        target_url: 'https://example.com/research',
        button_text: 'View Research',
        button_color: '#ffc107',
        background_color: '#fff3cd',
        text_color: '#856404'
      },
      {
        title: 'Test Mobile Research Papers',
        description: 'Mobile research papers advertisement',
        type: 'text',
        selected_area: 'mobile-research-papers',
        duration_type: 'days',
        duration_value: 30,
        status: 'approved',
        payment_status: 'paid',
        payment_method: 'cash',
        content: 'Mobile research access',
        target_url: 'https://example.com',
        button_text: 'Read More',
        button_color: '#17a2b8',
        background_color: '#d1ecf1',
        text_color: '#0c5460'
      },
      {
        title: 'Test Desktop Header Banner',
        description: 'Desktop header banner advertisement with slides',
        type: 'animation',
        selected_area: 'desktop-header-banner',
        duration_type: 'days',
        duration_value: 30,
        status: 'approved',
        payment_status: 'paid',
        payment_method: 'cash',
        content: 'Premium medical supplies available',
        target_url: 'https://example.com/products',
        button_text: 'Shop Now',
        button_color: '#dc3545',
        background_color: '#ffffff',
        text_color: '#000000',
          // Add 10 slides - using local image paths (will be uploaded by admin)
          slides: Array.from({ length: 10 }, (_, i) => ({
            url: `/uploads/test-media/images/slide-${i + 1}.png`,
            type: 'image' as const,
            title: `Slide ${i + 1}`,
            description: `This is slide ${i + 1} of the desktop header banner advertisement`,
            duration: 5
          })),
        slide_count: 10,
        slide_interval_seconds: 5,
        auto_slide_enabled: true
      },
      {
        title: 'Test Mobile Header Banner',
        description: 'Mobile header banner advertisement',
        type: 'image',
        selected_area: 'mobile-header-banner',
        duration_type: 'days',
        duration_value: 30,
        status: 'approved',
        payment_status: 'paid',
        payment_method: 'cash',
        content: 'Mobile banner ad',
        target_url: 'https://example.com',
        button_text: 'Click Here',
        button_color: '#6f42c1',
        background_color: '#e9ecef',
        text_color: '#495057'
      },
      {
        title: 'Test Mobile Contact Section',
        description: 'Mobile contact section advertisement',
        type: 'text',
        selected_area: 'mobile-contact-section',
        duration_type: 'days',
        duration_value: 30,
        status: 'approved',
        payment_status: 'paid',
        payment_method: 'cash',
        content: 'Contact us for more information',
        target_url: 'https://example.com/contact',
        button_text: 'Contact',
        button_color: '#20c997',
        background_color: '#d4edda',
        text_color: '#155724'
      }
    ];
    
    let createdCount = 0;
    let skippedCount = 0;
    
    for (const adData of testAds) {
      try {
        // Check if area exists
        const area = areas.find(a => a.area_name === adData.selected_area);
        if (!area) {
          console.log(`⚠️  Skipping ${adData.title} - area ${adData.selected_area} not found`);
          skippedCount++;
          continue;
        }
        
        // Check if ad already exists for this area using raw SQL
        const existingCheck = await AppDataSource.query(`
          SELECT id FROM video_advertisements 
          WHERE selected_area = $1 AND title = $2 AND doctor_id = $3
          LIMIT 1
        `, [adData.selected_area, adData.title, admin.id]);
        
        if (existingCheck && existingCheck.length > 0) {
          console.log(`⚠️  Skipping ${adData.title} - already exists`);
          skippedCount++;
          continue;
        }
        
        // Calculate duration hours
        let durationHours = 0;
        switch (adData.duration_type) {
          case 'hours':
            durationHours = adData.duration_value;
            break;
          case 'days':
            durationHours = adData.duration_value * 24;
            break;
          case 'weeks':
            durationHours = adData.duration_value * 24 * 7;
            break;
        }
        
        // Calculate cost
        const hourlyRate = area.getCurrentRate();
        const totalCost = durationHours * hourlyRate;
        
        // Create advertisement using raw SQL with only columns that exist
        // First, try to get column names from database
        let columnInfo: any[] = [];
        try {
          columnInfo = await AppDataSource.query(`
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'video_advertisements'
            ORDER BY ordinal_position
          `);
        } catch (e) {
          // If we can't get column info, use minimal required columns
        }
        
        const hasDurationType = columnInfo.some((c: any) => c.column_name === 'duration_type');
        const hasTargetUrl = columnInfo.some((c: any) => c.column_name === 'target_url');
        const hasHourlyRate = columnInfo.some((c: any) => c.column_name === 'hourly_rate');
        const hasSlides = columnInfo.some((c: any) => c.column_name === 'slides');
        const hasSlideCount = columnInfo.some((c: any) => c.column_name === 'slide_count');
        const hasSlideInterval = columnInfo.some((c: any) => c.column_name === 'slide_interval_seconds');
        const hasAutoSlide = columnInfo.some((c: any) => c.column_name === 'auto_slide_enabled');
        
        // Build insert query based on available columns
        let insertQuery = `
          INSERT INTO video_advertisements (
            id, doctor_id, title, description, type, content,
            selected_area, duration_hours,
            total_cost, paid_amount,
            start_date, end_date, status, payment_status, payment_method, payment_date,
            is_quitable, is_closed_by_user, impressions, clicks, views,
            created_at, updated_at
        `;
        
        const values = `gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, NOW(), NOW()`;
        let params: any[] = [
          admin.id,
          adData.title,
          adData.description || null,
          adData.type,
          adData.content || null,
          adData.selected_area,
          durationHours,
          totalCost,
          totalCost, // paid_amount
          startDate,
          endDate,
          adData.status,
          adData.payment_status,
          adData.payment_method || null,
          new Date(), // payment_date
          true, // is_quitable
          false, // is_closed_by_user
          0, // impressions
          0, // clicks
          0 // views
        ];
        
        let paramIndex = 21;
        
        if (hasHourlyRate) {
          insertQuery += `, hourly_rate`;
          insertQuery = insertQuery.replace(values, values.replace('NOW()', `$${paramIndex}, NOW()`));
          params.splice(7, 0, hourlyRate);
          paramIndex++;
        }
        
        if (hasDurationType) {
          insertQuery += `, duration_type, duration_value`;
          const insertPos = insertQuery.indexOf('duration_hours');
          insertQuery = insertQuery.replace('duration_hours', `duration_hours, duration_type, duration_value`);
          params.splice(7, 0, adData.duration_type, adData.duration_value);
          paramIndex += 2;
        }
        
        // Add slides support if columns exist
        if (hasSlides && (adData as any).slides) {
          insertQuery += `, slides`;
          const slidesJson = JSON.stringify((adData as any).slides);
          insertQuery = insertQuery.replace(values, values.replace('NOW()', `$${paramIndex}, NOW()`));
          params.splice(params.length - 2, 0, slidesJson);
          paramIndex++;
        }
        
        if (hasSlideCount && (adData as any).slide_count !== undefined) {
          insertQuery += `, slide_count`;
          insertQuery = insertQuery.replace(values, values.replace('NOW()', `$${paramIndex}, NOW()`));
          params.splice(params.length - 2, 0, (adData as any).slide_count);
          paramIndex++;
        }
        
        if (hasSlideInterval && (adData as any).slide_interval_seconds !== undefined) {
          insertQuery += `, slide_interval_seconds`;
          insertQuery = insertQuery.replace(values, values.replace('NOW()', `$${paramIndex}, NOW()`));
          params.splice(params.length - 2, 0, (adData as any).slide_interval_seconds);
          paramIndex++;
        }
        
        if (hasAutoSlide && (adData as any).auto_slide_enabled !== undefined) {
          insertQuery += `, auto_slide_enabled`;
          insertQuery = insertQuery.replace(values, values.replace('NOW()', `$${paramIndex}, NOW()`));
          params.splice(params.length - 2, 0, (adData as any).auto_slide_enabled);
          paramIndex++;
        }
        
        insertQuery += `) VALUES (${values}) RETURNING id`;
        
        const result = await AppDataSource.query(insertQuery, params);
        
        console.log(`✅ Created: ${adData.title} (${adData.selected_area}) - ID: ${result[0]?.id}`);
        createdCount++;
      } catch (error: unknown) {
        console.error(`❌ Error creating ${adData.title}:`, error instanceof Error ? error.message : error);
      }
    }
    
    console.log('\n📊 Summary:');
    console.log(`  ✅ Created: ${createdCount} advertisements`);
    console.log(`  ⚠️  Skipped: ${skippedCount} advertisements`);
    console.log(`\n🎉 Test advertisements created successfully!`);
    console.log(`\n📝 Note: All ads are set to 'approved' status and active for 30 days.`);
    console.log(`   They should appear on the website immediately.`);
    
    await AppDataSource.destroy();
    process.exit(0);
  } catch (error: unknown) {
    console.error('❌ Error:', error);
    if (error instanceof Error) {
      console.error('Error message:', error.message);
      console.error('Error stack:', error.stack);
    }
    process.exit(1);
  }
};

// Run the script
createTestAdvertisements();

