import { Request, Response } from 'express';
import { AppDataSource } from '../db/data-source';
import { VideoAdvertisement, AdvertisementStatus, AdvertisementType, AdvertisementArea, DurationType } from '../models/VideoAdvertisement';
import { AdvertisementAreaConfig } from '../models/AdvertisementAreaConfig';
import { AdvertisementPricingConfig } from '../models/AdvertisementPricingConfig';
import { Doctor } from '../models/Doctor';
import { In, IsNull, Not } from 'typeorm';
import * as path from 'path';
import * as fs from 'fs';
import * as crypto from 'crypto';
import gmailService from '../services/gmailService';
import { PayFastService } from '../services/payfastService';

export class VideoAdvertisementController {
  private get videoAdRepository() {
    if (!AppDataSource.isInitialized) {
      throw new Error('Database not initialized');
    }
    return AppDataSource.getRepository(VideoAdvertisement);
  }
  
  private get areaConfigRepository() {
    if (!AppDataSource.isInitialized) {
      throw new Error('Database not initialized');
    }
    return AppDataSource.getRepository(AdvertisementAreaConfig);
  }
  
  private get doctorRepository() {
    if (!AppDataSource.isInitialized) {
      throw new Error('Database not initialized');
    }
    return AppDataSource.getRepository(Doctor);
  }

  // Get all advertisement areas with pricing
  async getAdvertisementAreas(req: Request, res: Response): Promise<void> {
    try {
      // Check if table exists first
      const tableExists = await AppDataSource.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = 'advertisement_area_configs'
        )
      `);
      
      if (!tableExists[0]?.exists) {
        // Table doesn't exist yet - return empty array
        res.json({
          success: true,
          data: []
        });
        return;
      }

      // Use raw SQL to avoid TypeORM column issues
      const areas = await AppDataSource.query(`
        SELECT 
          id, area_name, display_name, description, device_type, position,
          dimensions, responsive_breakpoints, styles, base_hourly_rate,
          pricing_tiers, max_concurrent_ads, current_active_ads,
          total_ads_served, allowed_content_types, max_file_size_mb,
          max_duration_seconds, allowed_formats, visible_to_guests,
          visible_to_authenticated, allow_user_selection, is_active,
          priority, admin_notes, preview_image_url, rotation_interval_seconds,
          auto_rotation_enabled, average_ctr, average_cpm,
          audio_enabled_price_multiplier, total_impressions, total_clicks,
          created_at, updated_at
        FROM advertisement_area_configs
        WHERE is_active = true AND allow_user_selection = true
        ORDER BY priority DESC, base_hourly_rate ASC
      `);

      // Calculate current rate for each area (simplified - just use base_hourly_rate)
      const areasWithCurrentRates = areas.map((area: any) => ({
        ...area,
        current_hourly_rate: parseFloat(area.base_hourly_rate) || 0
      }));

      res.json({
        success: true,
        data: areasWithCurrentRates
      });
    } catch (error: unknown) {
      console.error('Error fetching advertisement areas:', error);
      // Return empty array instead of error
      res.json({
        success: true,
        data: []
      });
    }
  }

  // Calculate cost for advertisement using pricing configurations
  async calculateCost(req: Request, res: Response): Promise<void> {
    try {
      const { 
        placement_area, 
        advertisement_type, 
        duration_unit, 
        duration_value, 
        is_quitable,
        area_name, // Legacy support - map to placement_area if needed
        duration_type, // Legacy support - map to duration_unit if needed
        ad_type // Legacy support - map to advertisement_type if needed
      } = req.body;

      console.log('💰 Cost calculation request:', { 
        placement_area, 
        advertisement_type, 
        duration_unit, 
        duration_value, 
        is_quitable,
        area_name,
        duration_type,
        ad_type
      });

      // Legacy support: Map old parameters to new ones
      let finalPlacementArea = placement_area;
      let finalAdType = advertisement_type || ad_type;
      let finalDurationUnit = duration_unit;
      let finalIsQuitable = is_quitable !== undefined ? is_quitable : true;

      // Map area_name to placement_area if needed (for backward compatibility)
      if (!finalPlacementArea && area_name) {
        const areaNameMapping: { [key: string]: string } = {
          'top_banner_highest_visibility': 'top_banner_highest_visibility',
          'main_blue_area_prime_real_estate': 'main_blue_area_prime_real_estate',
          'main_blue_area_b2b_platform': 'main_blue_area_b2b_platform',
          'purple_pink_content_area': 'purple_pink_content_area',
          'desktop-header-banner': 'top_banner_highest_visibility',
          'mobile-header-banner': 'top_banner_highest_visibility',
          'hero_section_main': 'main_blue_area_prime_real_estate',
          'mobile-hero-section': 'main_blue_area_prime_real_estate',
          'desktop_footer_banner': 'purple_pink_content_area',
          'mobile-contact-section': 'purple_pink_content_area',
          'research_papers_section': 'purple_pink_content_area'
        };
        finalPlacementArea = areaNameMapping[area_name] || area_name;
      }

      // Map duration_type to duration_unit if needed
      if (!finalDurationUnit && duration_type) {
        const durationMapping: { [key: string]: string } = {
          'hours': 'hour',
          'days': 'day',
          'weeks': 'week',
          'HOURS': 'hour',
          'DAYS': 'day',
          'WEEKS': 'week'
        };
        finalDurationUnit = durationMapping[duration_type] || duration_type.toLowerCase();
      }

      // Map ad_type to advertisement_type if needed
      if (!finalAdType && ad_type) {
        finalAdType = ad_type.toLowerCase();
      }

      // Validate required parameters
      if (!finalPlacementArea || !finalAdType || !finalDurationUnit || duration_value === undefined) {
        res.status(400).json({
          success: false,
          message: 'Missing required parameters: placement_area, advertisement_type, duration_unit, duration_value'
        });
        return;
      }

      // Get pricing configuration from database
      const pricingRepo = AppDataSource.getRepository(AdvertisementPricingConfig);
      
      const pricingConfig = await pricingRepo.findOne({
        where: {
          placement_area: finalPlacementArea,
          advertisement_type: finalAdType,
          duration_unit: finalDurationUnit,
          is_quitable: finalIsQuitable,
          is_active: true
        }
      });

      if (!pricingConfig) {
        console.log('❌ Pricing config not found:', { 
          placement_area: finalPlacementArea, 
          advertisement_type: finalAdType, 
          duration_unit: finalDurationUnit, 
          is_quitable: finalIsQuitable 
        });
        res.status(404).json({
          success: false,
          message: 'Pricing configuration not found for this combination. Please contact administrator.'
        });
        return;
      }

      // Calculate total cost: unit_price * duration_value
      const unitPrice = parseFloat(pricingConfig.unit_price);
      const totalCost = unitPrice * parseFloat(duration_value);

      // Get area config for additional info (if available)
      let areaInfo = null;
      try {
        const area = await this.areaConfigRepository.findOne({
          where: { area_name: finalPlacementArea, is_active: true }
        });
        if (area) {
          areaInfo = {
            display_name: area.display_name,
            max_file_size_mb: area.max_file_size_mb,
            max_duration_seconds: area.max_duration_seconds,
            allowed_formats: area.allowed_formats
          };
      }
      } catch (error) {
        // Area config not critical, continue without it
        console.log('⚠️ Could not fetch area config (not critical)');
      }
      
      // Check if audio is enabled (for video type) - apply multiplier if needed
      const audioEnabled = req.query.audio_enabled === 'true' || req.body.audio_enabled === true;
      let finalTotalCost = totalCost;
      let audioExtraCost = 0;
      
      if (audioEnabled && finalAdType === 'video') {
        // Get area config for audio multiplier
        const area = await this.areaConfigRepository.findOne({
          where: { area_name: finalPlacementArea, is_active: true }
        });
        if (area && area.audio_enabled_price_multiplier) {
          const audioMultiplier = area.audio_enabled_price_multiplier;
          finalTotalCost = totalCost * audioMultiplier;
          audioExtraCost = finalTotalCost - totalCost;
        }
      }

      console.log('✅ Cost calculated:', {
        unit_price: unitPrice,
        duration_value: duration_value,
        total_cost: finalTotalCost
      });

      res.json({
        success: true,
        data: {
          placement_area: finalPlacementArea,
          advertisement_type: finalAdType,
          duration_unit: finalDurationUnit,
          duration_value: parseFloat(duration_value),
          is_quitable: finalIsQuitable,
          unit_price: unitPrice,
          total_cost: Math.round(finalTotalCost * 100) / 100, // Round to 2 decimal places
          audio_enabled: audioEnabled,
          audio_extra_cost: audioExtraCost > 0 ? Math.round(audioExtraCost * 100) / 100 : 0,
          pricing_breakdown: {
            unit_price: unitPrice,
            duration_value: parseFloat(duration_value),
            calculation: `${unitPrice} × ${duration_value} = ${finalTotalCost} PKR`
          },
          ...(areaInfo || {})
        }
      });
    } catch (error: unknown) {
      console.error('Error calculating cost:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to calculate cost',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  // Create new video advertisement
  async createAdvertisement(req: Request, res: Response): Promise<void> {
    try {
      // Ensure user is authenticated (any authenticated user can create advertisements)
      const userId = (req as any).user?.id;
      if (!userId) {
        res.status(401).json({
          success: false,
          message: 'Authentication required to create advertisements'
        });
        return;
      }
      
      const {
        title,
        description,
        type,
        content,
        target_url,
        button_text,
        button_color,
        background_color,
        text_color,
        selected_area,
        additional_areas,
        duration_type,
        duration_value,
        start_date,
        start_time,
        end_time,
        payment_method,
        is_quitable
      } = req.body;

      // Get area configuration
      const area = await this.areaConfigRepository.findOne({
        where: { area_name: selected_area, is_active: true }
      });

      if (!area) {
        res.status(404).json({
          success: false,
          message: 'Selected advertisement area not found'
        });
        return;
      }

      // Calculate cost
      let durationHours = 0;
      switch (duration_type) {
        case DurationType.HOURS:
          durationHours = duration_value;
          break;
        case DurationType.DAYS:
          durationHours = duration_value * 24;
          break;
        case DurationType.WEEKS:
          durationHours = duration_value * 24 * 7;
          break;
      }

      const hourlyRate = area.getCurrentRate();
      let totalCost = durationHours * hourlyRate;
      
      // Apply audio pricing multiplier if audio is enabled
      const audioEnabled = req.body.audio_enabled === true || req.body.audio_enabled === 'true';
      if (audioEnabled && type === AdvertisementType.VIDEO) {
        const audioMultiplier = area.audio_enabled_price_multiplier || 1.5;
        totalCost = totalCost * audioMultiplier;
      }

      // Validate and calculate dates
      // Handle start_date - it might be a date string (YYYY-MM-DD) or ISO string
      // Also handle case where it might be duplicated (e.g., "2025-11-23,2025-11-23")
      let startDate: Date;
      let dateString = start_date;
      
      // If start_date contains a comma, it's likely duplicated - take the first part
      if (dateString && dateString.includes(',')) {
        dateString = dateString.split(',')[0].trim();
      }
      
      if (!dateString || dateString === '') {
        // Default to current date if not provided
        startDate = new Date();
      } else {
        // Parse the date - handle both YYYY-MM-DD and ISO formats
        startDate = new Date(dateString);
        if (isNaN(startDate.getTime())) {
          res.status(400).json({
            success: false,
            message: `Invalid start date format: ${start_date}. Please provide a valid date.`
          });
          return;
        }
      }

      // Ensure durationHours is valid
      if (!durationHours || durationHours <= 0) {
        res.status(400).json({
          success: false,
          message: 'Invalid duration. Duration must be greater than 0.'
        });
        return;
      }

      const endDate = new Date(startDate.getTime() + (durationHours * 60 * 60 * 1000));
      
      // Validate end date
      if (isNaN(endDate.getTime())) {
        res.status(400).json({
          success: false,
          message: 'Failed to calculate end date'
        });
        return;
      }

      // Check for time slot conflicts in the same area
      // Get area configuration to check max capacity
      const areaConfigRepository = AppDataSource.getRepository(AdvertisementAreaConfig);
      const areaConfig = await areaConfigRepository.findOne({
        where: { area_name: selected_area as AdvertisementArea }
      });

      if (!areaConfig) {
        res.status(400).json({
          success: false,
          message: `Advertisement area "${selected_area}" not found`
        });
        return;
      }

      // Check for overlapping advertisements in the same area
      // We need to check for ads that:
      // 1. Are in the same area
      // 2. Have status ACTIVE or APPROVED (waiting to be active)
      // 3. Have overlapping time ranges
      const conflictQuery = `
        SELECT id, title, start_date, end_date, status, payment_status
        FROM video_advertisements
        WHERE selected_area = $1
          AND status IN ($2, $3)
          AND start_date IS NOT NULL
          AND end_date IS NOT NULL
          AND (
            -- New ad starts during existing ad
            (start_date <= $4 AND end_date >= $4)
            OR
            -- New ad ends during existing ad
            (start_date <= $5 AND end_date >= $5)
            OR
            -- New ad completely contains existing ad
            (start_date >= $4 AND end_date <= $5)
            OR
            -- Existing ad completely contains new ad
            (start_date <= $4 AND end_date >= $5)
          )
        ORDER BY start_date ASC
      `;

      const conflictingAds = await AppDataSource.query(conflictQuery, [
        selected_area,
        AdvertisementStatus.ACTIVE,
        AdvertisementStatus.APPROVED,
        startDate.toISOString(),
        endDate.toISOString()
      ]);

      // Count how many ads will be active during this time slot
      const activeCount = conflictingAds.length;
      const maxCapacity = areaConfig.max_concurrent_ads || 1;

      // Check if user wants to wait in queue
      const waitInQueue = req.body.wait_in_queue === true || req.body.wait_in_queue === 'true';

      if (activeCount >= maxCapacity && !waitInQueue) {
        // Format conflicting time slots for user
        const conflictDetails = conflictingAds.map((ad: any) => {
          const conflictStart = new Date(ad.start_date).toLocaleString();
          const conflictEnd = new Date(ad.end_date).toLocaleString();
          return `"${ad.title}" (${conflictStart} - ${conflictEnd})`;
        }).join('\n');

        res.status(400).json({
          success: false,
          message: `Time slot conflict: The selected time slot is already occupied.`,
          details: {
            requestedSlot: {
              start: startDate.toLocaleString(),
              end: endDate.toLocaleString(),
              duration: `${durationHours} hours`
            },
            areaCapacity: maxCapacity,
            conflictingAds: activeCount,
            conflicts: conflictingAds.map((ad: any) => ({
              title: ad.title,
              start: new Date(ad.start_date).toLocaleString(),
              end: new Date(ad.end_date).toLocaleString(),
              status: ad.status
            })),
            suggestion: `Please select a different time slot. The area "${areaConfig.display_name}" can only accommodate ${maxCapacity} advertisement(s) at a time.`
          }
        });
        return;
      }

      // Create advertisement
      const advertisement = new VideoAdvertisement();
      // Store user ID (database column is still named doctor_id for backward compatibility)
      advertisement.doctor_id = userId;
      advertisement.title = title;
      advertisement.description = description;
      advertisement.type = type;
      advertisement.content = content;
      
      // Always set to PENDING - admin will review and approve
      // The wait_in_queue flag is just informational - approval process will handle conflicts automatically
      // If admin approves and there's no capacity, it will automatically go to APPROVED (waiting) status
      advertisement.status = AdvertisementStatus.PENDING;
      // Note: These optional fields (target_url, button_text, etc.) are not in the database schema
      // They are defined in the model but columns don't exist, so we skip setting them
      // TODO: Create a migration to add these columns if needed in the future
      advertisement.selected_area = selected_area;
      if (additional_areas) advertisement.additional_areas = JSON.stringify(additional_areas);
      // Note: hourly_rate column doesn't exist in database, so we skip it
      // if (hourlyRate) advertisement.hourly_rate = hourlyRate;
      // Note: duration_type and duration_value columns don't exist - we use duration_hours instead
      // duration_hours is calculated and inserted in the SQL query below
      advertisement.total_cost = totalCost;
      advertisement.start_date = startDate;
      advertisement.end_date = endDate;
      if (start_time) advertisement.start_time = start_time;
      if (end_time) advertisement.end_time = end_time;
      advertisement.payment_method = payment_method;
      advertisement.is_quitable = is_quitable === 'true' || is_quitable === true;
      // Status is already set above based on wait_in_queue flag

      // Handle file uploads with validation
      if (req.files) {
        const files = req.files as any;
        const uploadsDir = process.env.CI || process.env.NODE_ENV === 'test' 
          ? path.join(process.cwd(), 'uploads') 
          : '/app/uploads';
        
        // Ensure all required directories exist
        const requiredDirs = [
          path.join(uploadsDir, 'advertisements', 'videos'),
          path.join(uploadsDir, 'advertisements', 'images'),
          path.join(uploadsDir, 'advertisements', 'animations'),
          path.join(uploadsDir, 'advertisements', 'thumbnails')
        ];
        requiredDirs.forEach(dir => {
          if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
          }
        });
        
        if (files.video_file && files.video_file[0]) {
          const videoFile = files.video_file[0];
          const fileExt = path.extname(videoFile.originalname).toLowerCase();
          const mimeType = videoFile.mimetype.toLowerCase();
          
          // Check if it's actually a GIF - treat as animation
          if (fileExt === '.gif' || mimeType === 'image/gif') {
            // Move GIF to animations folder
            const animationsDir = path.join(uploadsDir, 'advertisements', 'animations');
            if (!fs.existsSync(animationsDir)) {
              fs.mkdirSync(animationsDir, { recursive: true });
            }
            const newPath = path.join(animationsDir, videoFile.filename);
            const oldPath = path.join(uploadsDir, 'advertisements', 'videos', videoFile.filename);
            
            // Move file from videos to animations folder
            if (fs.existsSync(oldPath)) {
              fs.renameSync(oldPath, newPath);
              console.log('✅ Moved GIF from videos to animations folder:', videoFile.filename);
            }
            
            advertisement.image_url = `/uploads/advertisements/animations/${videoFile.filename}`;
            advertisement.type = 'animation';
            console.log('✅ GIF detected in video_file field, set as animation:', videoFile.originalname);
          } else {
            // Actual video file
            advertisement.video_url = `/uploads/advertisements/videos/${videoFile.filename}`;
            advertisement.video_format = videoFile.mimetype.split('/')[1];
            advertisement.file_size_mb = Math.round(videoFile.size / (1024 * 1024));
          }
        } else if (files.video && files.video[0]) {
          // Legacy support
          const videoFile = files.video[0];
          const fileExt = path.extname(videoFile.originalname).toLowerCase();
          const mimeType = videoFile.mimetype.toLowerCase();
          
          // Check if it's actually a GIF - treat as animation
          if (fileExt === '.gif' || mimeType === 'image/gif') {
            // Move GIF to animations folder
            const animationsDir = path.join(uploadsDir, 'advertisements', 'animations');
            if (!fs.existsSync(animationsDir)) {
              fs.mkdirSync(animationsDir, { recursive: true });
            }
            const newPath = path.join(animationsDir, videoFile.filename);
            const oldPath = path.join(uploadsDir, 'advertisements', 'videos', videoFile.filename);
            
            // Move file from videos to animations folder
            if (fs.existsSync(oldPath)) {
              fs.renameSync(oldPath, newPath);
              console.log('✅ Moved GIF from videos to animations folder (legacy):', videoFile.filename);
            }
            
            advertisement.image_url = `/uploads/advertisements/animations/${videoFile.filename}`;
            advertisement.type = 'animation';
            console.log('✅ GIF detected in video field (legacy), set as animation:', videoFile.originalname);
          } else {
            // Actual video file
            advertisement.video_url = `/uploads/advertisements/videos/${videoFile.filename}`;
            advertisement.video_format = videoFile.mimetype.split('/')[1];
            advertisement.file_size_mb = Math.round(videoFile.size / (1024 * 1024));
          }
        }

        // Handle image files
        if (files.image_file && files.image_file[0]) {
          const imageFile = files.image_file[0];
          const fileExt = path.extname(imageFile.originalname).toLowerCase();
          const mimeType = imageFile.mimetype.toLowerCase();
          
          // Check if it's a GIF - treat as animation (check both extension and mimetype)
          if (fileExt === '.gif' || mimeType === 'image/gif') {
            advertisement.image_url = `/uploads/advertisements/animations/${imageFile.filename}`;
            advertisement.type = 'animation';
            console.log('✅ GIF animation detected and set as animation type:', imageFile.originalname);
          } else {
            // Regular image (JPG, PNG)
            advertisement.image_url = `/uploads/advertisements/images/${imageFile.filename}`;
            if (!advertisement.type || advertisement.type === 'video') {
              advertisement.type = 'image';
            }
          }
        } else if (files.image && files.image[0]) {
          // Legacy support
          const imageFile = files.image[0];
          const fileExt = path.extname(imageFile.originalname).toLowerCase();
          const mimeType = imageFile.mimetype.toLowerCase();
          
          if (fileExt === '.gif' || mimeType === 'image/gif') {
            advertisement.image_url = `/uploads/advertisements/animations/${imageFile.filename}`;
            advertisement.type = 'animation';
            console.log('✅ GIF animation detected (legacy) and set as animation type:', imageFile.originalname);
          } else {
            advertisement.image_url = `/uploads/advertisements/images/${imageFile.filename}`;
            if (!advertisement.type || advertisement.type === 'video') {
              advertisement.type = 'image';
            }
          }
        }

        // Handle animation files explicitly
        if (files.animation_file && files.animation_file[0]) {
          const animationFile = files.animation_file[0];
          advertisement.image_url = `/uploads/advertisements/animations/${animationFile.filename}`;
          advertisement.type = 'animation';
        }

        if (files.thumbnail && files.thumbnail[0]) {
          const thumbnailFile = files.thumbnail[0];
          // Verify the file was actually saved
          const thumbnailPath = path.join(uploadsDir, 'advertisements', 'thumbnails', thumbnailFile.filename);
          if (fs.existsSync(thumbnailPath)) {
            advertisement.thumbnail_url = `/uploads/advertisements/thumbnails/${thumbnailFile.filename}`;
          } else {
            console.warn(`Thumbnail file not found at expected path: ${thumbnailPath}`);
            // Don't fail the request, just skip thumbnail
          }
        }
      }

      // Use raw SQL to insert only columns that exist in database
      // This avoids errors with optional fields (target_url, button_text, etc.) that aren't in the schema
      const adId = crypto.randomUUID();
      
      // Build column and value lists dynamically
      // Note: The database has duration_hours column (not duration_type/duration_value)
      const columns: string[] = [
        'id', 'doctor_id', 'title', 'description', 'type', 'content',
        'selected_area', 'total_cost', 'paid_amount',
        'start_date', 'end_date', 'status', 'payment_status', 'payment_method',
        'is_quitable', 'is_closed_by_user', 'impressions', 'clicks', 'views',
        'video_url', 'image_url', 'thumbnail_url'
      ];
      
      const values: any[] = [
        adId,
        advertisement.doctor_id,
        advertisement.title,
        advertisement.description,
        advertisement.type,
        advertisement.content,
        advertisement.selected_area,
        advertisement.total_cost,
        0, // paid_amount
        startDate.toISOString(), // Convert to ISO string for PostgreSQL timestamp
        endDate.toISOString(),   // Convert to ISO string for PostgreSQL timestamp
        advertisement.status,
        'pending', // payment_status
        advertisement.payment_method,
        advertisement.is_quitable,
        false, // is_closed_by_user
        0, // impressions
        0, // clicks
        0, // views
        advertisement.video_url || null,
        advertisement.image_url || null,
        advertisement.thumbnail_url || null
      ];
      
      // Add optional columns if values exist
      // Note: hourly_rate column doesn't exist in database, so we skip it
      // if (advertisement.hourly_rate !== undefined && advertisement.hourly_rate !== null) {
      //   columns.push('hourly_rate');
      //   values.push(advertisement.hourly_rate);
      // }
      
      // Calculate duration_hours from duration_type and duration_value
      // The database has duration_hours column, not duration_type/duration_value
      // Use durationHours already calculated above (from req.body)
      if (durationHours > 0) {
        columns.push('duration_hours');
        values.push(durationHours);
      }
      // Note: start_time and end_time columns don't exist in the database
      // Commenting out to avoid database errors
      // if (advertisement.start_time) {
      //   columns.push('start_time');
      //   values.push(advertisement.start_time);
      // }
      // if (advertisement.end_time) {
      //   columns.push('end_time');
      //   values.push(advertisement.end_time);
      // }
      // Note: video_format and file_size_mb columns don't exist in the actual database
      // They are defined in migrations but may not have been applied
      // Commenting out to avoid database errors
      // if (advertisement.video_format) {
      //   columns.push('video_format');
      //   values.push(advertisement.video_format);
      // }
      // if (advertisement.file_size_mb !== undefined && advertisement.file_size_mb !== null) {
      //   columns.push('file_size_mb');
      //   values.push(advertisement.file_size_mb);
      // }
      if (advertisement.audio_enabled !== undefined) {
        columns.push('audio_enabled');
        values.push(advertisement.audio_enabled);
      }
      // Note: additional_areas column doesn't exist in the database
      // Commenting out to avoid database errors
      // if (advertisement.additional_areas) {
      //   columns.push('additional_areas');
      //   values.push(advertisement.additional_areas);
      // }
      
      columns.push('created_at', 'updated_at');
      
      // Build parameterized query - use NOW() directly in SQL, not as parameter
      const placeholders = values.map((_, i) => `$${i + 1}`);
      placeholders.push('NOW()', 'NOW()'); // Add NOW() for created_at, updated_at
      
      const insertQuery = `
        INSERT INTO video_advertisements (${columns.join(', ')})
        VALUES (${placeholders.join(', ')})
        RETURNING *
      `;
      
      // Execute raw SQL query (values array doesn't include NOW() strings)
      try {
        const result = await AppDataSource.query(insertQuery, values);
        const savedAdData = result[0];
        
        if (!savedAdData) {
          res.status(500).json({
            success: false,
            message: 'Failed to create advertisement - could not retrieve saved record'
          });
          return;
        }
      } catch (sqlError: any) {
        console.error('SQL Error creating advertisement:', sqlError);
        console.error('Query:', insertQuery);
        console.error('Values:', values);
        console.error('Columns:', columns);
        throw new Error(`Database error: ${sqlError.message || 'Unknown SQL error'}`);
      }
      
      // Get the saved entity using TypeORM for consistency
      const savedAdvertisement = await this.videoAdRepository.findOne({
        where: { id: adId }
      });
      
      if (!savedAdvertisement) {
        res.status(500).json({
          success: false,
          message: 'Failed to create advertisement - could not retrieve saved record'
        });
        return;
      }

      // Get user information for emails (using doctor repository as it contains all user types)
      const user = await this.doctorRepository.findOne({ where: { id: userId } });
      if (!user) {
        res.status(404).json({
          success: false,
          message: 'User not found'
        });
        return;
      }

      // Initialize PayFast payment if payment method is PayFast
      let paymentData: any = null;
      if (payment_method === 'payfast') {
        console.log('💳 Initializing PayFast payment for advertisement:', savedAdvertisement.id);
        try {
          const payfastService = new PayFastService();
          
          // Get frontend URL from request headers (for mobile support)
          const origin = req.headers.origin || req.headers.referer;
          let frontendUrl: string | undefined;
          if (origin) {
            try {
              const url = new URL(origin);
              frontendUrl = `${url.protocol}//${url.host}`;
              console.log('🌐 Using frontend URL from request:', frontendUrl);
            } catch (e) {
              console.warn('⚠️ Failed to parse origin/referer URL, using default');
            }
          }
          // Fall back to centralized config
          const { getFrontendUrl, getBackendUrl } = require('../../config/urlConfig');
          if (!frontendUrl) {
            frontendUrl = getFrontendUrl(origin);
          }
          const backendUrl = getBackendUrl();
          
          console.log('💳 PayFast URLs - Frontend:', frontendUrl, 'Backend:', backendUrl);

          // Create payment data for advertisement
          const paymentFormData = payfastService.createPaymentFormData({
            orderIds: [savedAdvertisement.id], // Use ad ID as order ID
            totalAmount: totalCost,
            customerName: user.doctor_name || user.clinic_name || user.email,
            customerEmail: user.email,
            customerPhone: user.whatsapp || '',
            items: [{
              name: `Advertisement: ${title}`,
              description: `Advertisement in ${area.display_name} for ${durationHours} hours`,
              quantity: 1,
              price: totalCost
            }],
            frontendUrl: frontendUrl // Pass dynamic frontend URL
          });

          // Update return URL for advertisement
          paymentFormData.return_url = `${frontendUrl}/advertisement/payment/success?adId=${savedAdvertisement.id}`;
          paymentFormData.cancel_url = `${frontendUrl}/advertisement/apply-new?payment=cancelled`;
          paymentFormData.notify_url = `${backendUrl}/api/video-advertisements/${savedAdvertisement.id}/payfast/notify`;
          paymentFormData.item_name = `Advertisement: ${title}`;
          paymentFormData.custom_str1 = savedAdvertisement.id; // Store ad ID

          console.log('💳 PayFast form data prepared:', {
            return_url: paymentFormData.return_url,
            cancel_url: paymentFormData.cancel_url,
            notify_url: paymentFormData.notify_url,
            amount: totalCost
          });

          // Generate payment form
          const paymentForm = payfastService.generatePaymentForm(paymentFormData);
          console.log('💳 PayFast form generated, length:', paymentForm?.length || 0);

          paymentData = {
            paymentForm: paymentForm,
            processUrl: payfastService.getProcessUrl(),
            isSandbox: payfastService.isSandboxMode(),
            totalAmount: totalCost
          };
          console.log('✅ PayFast payment data ready:', { 
            hasForm: !!paymentData.paymentForm, 
            processUrl: paymentData.processUrl,
            isSandbox: paymentData.isSandbox
          });
        } catch (payfastError: unknown) {
          console.error('❌ Error initializing PayFast payment:', payfastError);
          console.error('❌ PayFast error details:', payfastError instanceof Error ? payfastError.message : String(payfastError));
          // Return error to frontend so it can show proper message
          res.status(500).json({
            success: false,
            message: 'Failed to initialize payment. Please try again or contact support.',
            error: payfastError instanceof Error ? payfastError.message : 'Payment initialization failed'
          });
          return;
        }
      }

      // Send email to user (non-blocking)
      try {
                const userEmailHtml = `
                  <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <h2 style="color: #333;">Advertisement Application Submitted</h2>
                    <p>Dear ${user.doctor_name || user.clinic_name || 'Valued Customer'},</p>
            
            <p>Your advertisement application has been submitted successfully!</p>
            
            <div style="background-color: #f5f5f5; padding: 20px; border-radius: 5px; margin: 20px 0;">
              <h3 style="margin-top: 0;">Advertisement Details</h3>
              <p><strong>Title:</strong> ${title}</p>
              <p><strong>Area:</strong> ${area.display_name}</p>
              <p><strong>Duration:</strong> ${durationHours} hours</p>
              <p><strong>Total Cost:</strong> PKR ${totalCost.toFixed(2)}</p>
              <p><strong>Payment Method:</strong> ${payment_method === 'payfast' ? 'PayFast Online Payment' : 'Cash on Delivery / End of Month'}</p>
              <p><strong>Status:</strong> Pending Approval</p>
            </div>
            
            ${payment_method === 'payfast' ? `
              <p style="color: #d9534f; font-weight: bold;">⚠️ Please complete your payment to activate your advertisement.</p>
            ` : `
              <p>We will review your application and contact you for payment confirmation.</p>
            `}
            
            <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; color: #666; font-size: 12px;">
              <p>This is an automated message from AestheticRxNetwork system.</p>
            </div>
          </div>
        `;

                gmailService.sendEmail(
                  user.email,
                  'Advertisement Application Submitted - AestheticRxNetwork',
                  userEmailHtml
                ).catch((err: unknown) => {
                  console.error('Failed to send user email:', err);
                });
      } catch (emailError: unknown) {
        console.error('Error sending user email:', emailError);
      }

      // Send email to admin (non-blocking)
      try {
        const mainAdminEmail = process.env.MAIN_ADMIN_EMAIL;
        const secondaryAdminEmail = process.env.SECONDARY_ADMIN_EMAIL;
        const adminEmails = [mainAdminEmail, secondaryAdminEmail].filter((email): email is string => Boolean(email));

        if (adminEmails.length > 0) {
          const adminEmailHtml = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2 style="color: #333;">New Advertisement Application</h2>
              <p>A new advertisement application has been submitted and requires review:</p>
              
              <div style="background-color: #f5f5f5; padding: 20px; border-radius: 5px; margin: 20px 0;">
                <h3 style="margin-top: 0;">Advertisement Details</h3>
                <p><strong>Title:</strong> ${title}</p>
                <p><strong>Description:</strong> ${description || 'N/A'}</p>
                <p><strong>Type:</strong> ${type}</p>
                <p><strong>Area:</strong> ${area.display_name}</p>
                <p><strong>Duration:</strong> ${durationHours} hours</p>
                <p><strong>Total Cost:</strong> PKR ${totalCost.toFixed(2)}</p>
                <p><strong>Payment Method:</strong> ${payment_method === 'payfast' ? 'PayFast Online Payment' : 'Cash on Delivery / End of Month'}</p>
                
                        <h3 style="margin-top: 20px;">User Details</h3>
                        <p><strong>Name:</strong> ${user.doctor_name || user.clinic_name || 'N/A'}</p>
                        <p><strong>Clinic:</strong> ${user.clinic_name || 'N/A'}</p>
                        <p><strong>Email:</strong> ${user.email}</p>
                        <p><strong>WhatsApp:</strong> ${user.whatsapp || 'Not provided'}</p>
                
                <p><strong>Application ID:</strong> ${savedAdvertisement.id}</p>
                <p><strong>Status:</strong> Pending</p>
              </div>
              
              <p>Please review and approve this advertisement in the admin panel.</p>
              
              <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; color: #666; font-size: 12px;">
                <p>This is an automated message from AestheticRxNetwork system.</p>
              </div>
            </div>
          `;

          gmailService.sendEmail(
            adminEmails,
            `New Advertisement Application - ${title}`,
            adminEmailHtml
          ).catch((err: unknown) => {
            console.error('Failed to send admin email:', err);
          });
        }
      } catch (adminEmailError: unknown) {
        console.error('Error sending admin email:', adminEmailError);
      }

      // Return response with payment data if PayFast
      const responseData: any = {
        ...savedAdvertisement
      };

      if (paymentData) {
        responseData.payment = paymentData;
      }

      res.status(201).json({
        success: true,
        message: payment_method === 'payfast' 
          ? 'Advertisement created successfully. Please complete payment to activate.'
          : 'Advertisement application submitted successfully',
        data: responseData
      });
    } catch (error: unknown) {
      console.error('Error creating advertisement:', error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      const errorStack = error instanceof Error ? error.stack : undefined;
      console.error('Error details:', { errorMessage, errorStack });
      
      res.status(500).json({
        success: false,
        message: errorMessage.includes('ENOENT') 
          ? 'File upload failed: Directory not found. Please try again.'
          : 'Failed to create advertisement',
        error: process.env.NODE_ENV === 'development' ? errorMessage : undefined
      });
    }
  }

  // Get user's advertisements
  async getUserAdvertisements(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).user?.id;
      if (!userId) {
        res.status(401).json({
          success: false,
          message: 'Authentication required'
        });
        return;
      }

      const advertisements = await this.videoAdRepository.find({
        where: { doctor_id: userId },
        order: { created_at: 'DESC' }
      });

      res.json({
        success: true,
        data: advertisements
      });
    } catch (error: unknown) {
      console.error('Error fetching user advertisements:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch advertisements'
      });
    }
  }

  // Get active advertisements for display
  async getActiveAdvertisements(req: Request, res: Response): Promise<void> {
    try {
      const { area_name, device_type } = req.query;

      if (!area_name) {
        res.status(400).json({
          success: false,
          message: 'Area name is required'
        });
        return;
      }

      // Check if database is initialized
      if (!AppDataSource.isInitialized) {
        console.error('❌ Database not initialized');
        res.status(503).json({
          success: false,
          message: 'Database connection not available'
        });
        return;
      }

      // Get current date for filtering
      const now = new Date();

      try {
        // Find active advertisements for the specified area
        console.log('🔍 Fetching ads for area:', area_name);
        
        let advertisements: VideoAdvertisement[] = [];
        
        try {
          // Map frontend area names to all possible backend area names
          // This allows ads with placement names to be found when frontend queries by frontend area names
          const areaNameMapping: { [frontendArea: string]: string[] } = {
            'desktop-header-banner': ['desktop-header-banner', 'mobile-header-banner', 'top_banner_highest_visibility'],
            'mobile-header-banner': ['desktop-header-banner', 'mobile-header-banner', 'top_banner_highest_visibility'],
            'hero_section_main': ['hero_section_main', 'mobile-hero-section', 'main_blue_area_prime_real_estate', 'main_blue_area_b2b_platform'],
            'mobile-hero-section': ['hero_section_main', 'mobile-hero-section', 'main_blue_area_prime_real_estate', 'main_blue_area_b2b_platform'],
            'desktop_footer_banner': ['desktop_footer_banner', 'desktop-footer-banner', 'mobile-contact-section', 'research_papers_section', 'mobile-research-papers', 'purple_pink_content_area'],
            'mobile-contact-section': ['desktop_footer_banner', 'mobile-contact-section', 'research_papers_section', 'mobile-research-papers', 'purple_pink_content_area'],
            'research_papers_section': ['desktop_footer_banner', 'mobile-contact-section', 'research_papers_section', 'mobile-research-papers', 'purple_pink_content_area'],
            'mobile-research-papers': ['desktop_footer_banner', 'mobile-contact-section', 'research_papers_section', 'mobile-research-papers', 'purple_pink_content_area'],
            // Also include placement names directly
            'top_banner_highest_visibility': ['desktop-header-banner', 'mobile-header-banner', 'top_banner_highest_visibility'],
            'main_blue_area_prime_real_estate': ['hero_section_main', 'mobile-hero-section', 'main_blue_area_prime_real_estate'],
            'main_blue_area_b2b_platform': ['hero_section_main', 'mobile-hero-section', 'main_blue_area_b2b_platform'],
            'purple_pink_content_area': ['desktop_footer_banner', 'mobile-contact-section', 'research_papers_section', 'mobile-research-papers', 'purple_pink_content_area']
          };
          
          // Get all possible area names for this frontend area
          const possibleAreaNames = areaNameMapping[area_name as string] || [area_name as string];
          console.log(`🔍 Querying for area: ${area_name}, checking possible area names:`, possibleAreaNames);
          
          // Use raw SQL query to avoid schema mismatch issues
          // Query for ads matching any of the possible area names
          const placeholders = possibleAreaNames.map((_, index) => `$${index + 1}`).join(', ');
          console.log(`📝 SQL query: WHERE va.selected_area IN (${placeholders})`);
          const rawAds = await AppDataSource.query(`
            SELECT
              va.id, va.doctor_id, va.title, va.description, va.type, va.content,
              va.video_url, va.image_url, va.thumbnail_url,
              va.selected_area, va.duration_hours,
              va.start_date, va.end_date, va.status, va.payment_status, va.payment_method,
              va.total_cost, va.paid_amount, va.payment_date,
              va.is_quitable, va.is_closed_by_user, va.impressions, va.clicks, va.views,
              va.slides, va.slide_count, va.slide_interval_seconds, va.auto_slide_enabled,
              va.audio_enabled,
              va.created_at, va.updated_at,
              d.doctor_name, d.clinic_name
            FROM video_advertisements va
            LEFT JOIN doctors d ON va.doctor_id = d.id
            WHERE va.selected_area IN (${placeholders})
            ORDER BY va.created_at ASC
          `, possibleAreaNames);
          
          console.log(`📊 Raw query returned ${rawAds.length} ads`);
          if (rawAds.length > 0) {
            rawAds.forEach((ad: any, index: number) => {
              console.log(`   Ad ${index + 1}: ${ad.title}, selected_area: ${ad.selected_area}, status: ${ad.status}`);
            });
          }
          
          // Convert raw results to VideoAdvertisement-like objects
          advertisements = rawAds.map((row: any) => ({
            id: row.id,
            doctor_id: row.doctor_id,
            title: row.title,
            description: row.description,
            type: row.type,
            content: row.content,
            video_url: row.video_url,
            image_url: row.image_url,
            thumbnail_url: row.thumbnail_url,
            selected_area: row.selected_area,
            duration_hours: row.duration_hours,
            start_date: row.start_date ? new Date(row.start_date) : null,
            end_date: row.end_date ? new Date(row.end_date) : null,
            status: row.status,
            payment_status: row.payment_status,
            payment_method: row.payment_method,
            total_cost: parseFloat(row.total_cost) || 0,
            paid_amount: parseFloat(row.paid_amount) || 0,
            payment_date: row.payment_date ? new Date(row.payment_date) : null,
            is_quitable: row.is_quitable,
            is_closed_by_user: row.is_closed_by_user,
            impressions: row.impressions || 0,
            clicks: row.clicks || 0,
            views: row.views || 0,
            slides: row.slides || null,
            slide_count: row.slide_count || null,
            slide_interval_seconds: row.slide_interval_seconds || null,
            auto_slide_enabled: row.auto_slide_enabled !== null ? row.auto_slide_enabled : true,
            audio_enabled: row.audio_enabled || false,
            created_at: row.created_at ? new Date(row.created_at) : new Date(),
            updated_at: row.updated_at ? new Date(row.updated_at) : new Date(),
            // Include doctor information
            doctor: row.doctor_name || row.clinic_name ? {
              doctor_name: row.doctor_name,
              clinic_name: row.clinic_name
            } : null
          })) as VideoAdvertisement[];
          
          console.log(`📊 Found ${advertisements.length} total ads for area ${area_name}`);
          if (advertisements.length > 0 && advertisements[0]) {
            const firstAd = advertisements[0];
            console.log(`   Sample ad: ${firstAd.title}, status: ${firstAd.status}, start: ${firstAd.start_date}, end: ${firstAd.end_date}`);
          }
        } catch (findError: unknown) {
          console.error('❌ Error in find query:', findError);
          if (findError instanceof Error) {
            console.error('Find error name:', findError.name);
            console.error('Find error message:', findError.message);
            console.error('Find error stack:', findError.stack);
          }
          // Return empty array on query error
          res.json({
            success: true,
            data: []
          });
          return;
        }

        // Filter by status and dates client-side
        const validAds = advertisements.filter(ad => {
          // Check status - accept 'approved', 'active', or 'ACTIVE' (case-insensitive)
          const statusLower = (ad.status || '').toLowerCase();
          const statusMatch = statusLower === 'approved' || statusLower === 'active';
          if (!statusMatch) {
            console.log(`⚠️  Ad ${ad.id} (${ad.title}) filtered out - status: ${ad.status}`);
            return false;
          }
          
          // For ACTIVE status, show immediately regardless of date range (admin explicitly activated it)
          if (statusLower === 'active') {
            console.log(`✅ Ad ${ad.id} (${ad.title}) included - status is ACTIVE`);
            // Always show ACTIVE ads, even if outside date range or missing dates
            // Admin has explicitly activated it, so it should be visible
            if (ad.start_date && ad.end_date) {
              try {
                const startDate = new Date(ad.start_date);
                const endDate = new Date(ad.end_date);
                if (!isNaN(startDate.getTime()) && !isNaN(endDate.getTime())) {
                  const isInRange = startDate <= now && endDate >= now;
                  if (!isInRange) {
                    console.log(`⚠️  Ad ${ad.id} (${ad.title}) is ACTIVE but outside date range. Start: ${startDate.toISOString()}, End: ${endDate.toISOString()}, Now: ${now.toISOString()} - showing anyway because status is ACTIVE`);
                  }
                }
              } catch (dateError) {
                console.warn(`⚠️  Date parsing error for ACTIVE ad ${ad.id} (${ad.title}):`, dateError);
              }
            }
            return true; // Always show ACTIVE ads
          }
          
          // For APPROVED status, check date range (waiting to be activated)
          // Skip ads without dates
          if (!ad.start_date || !ad.end_date) {
            console.log(`⚠️  Ad ${ad.id} (${ad.title}) filtered out - missing dates (status: ${ad.status})`);
            return false;
          }
          
          try {
            const startDate = new Date(ad.start_date);
            const endDate = new Date(ad.end_date);
            
            // Check if dates are valid
            if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
              console.log(`⚠️  Ad ${ad.id} (${ad.title}) filtered out - invalid dates`);
              return false;
            }
            
            // Check if ad is currently in its date range
            const isInRange = startDate <= now && endDate >= now;
            if (!isInRange) {
              console.log(`⚠️  Ad ${ad.id} (${ad.title}) filtered out - not in date range. Start: ${startDate.toISOString()}, End: ${endDate.toISOString()}, Now: ${now.toISOString()}`);
            }
            return isInRange;
          } catch (dateError) {
            console.warn(`⚠️  Invalid date format for ad ${ad.id} (${ad.title}):`, dateError);
            return false;
          }
        });

        // Get area configuration to include closeable setting and display type
        let areaConfig: any = null;
        try {
          // Check if columns exist before selecting them
          const columnCheck = await AppDataSource.query(`
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'advertisement_area_configs' 
            AND column_name IN ('ads_closeable', 'display_type')
          `);
          
          const hasAdsCloseable = columnCheck.some((col: any) => col.column_name === 'ads_closeable');
          const hasDisplayType = columnCheck.some((col: any) => col.column_name === 'display_type');
          
          // Build SELECT query with only existing columns
          const selectColumns = ['area_name', 'display_name'];
          if (hasAdsCloseable) selectColumns.push('ads_closeable');
          if (hasDisplayType) selectColumns.push('display_type');
          
          const areaConfigResult = await AppDataSource.query(`
            SELECT ${selectColumns.join(', ')}
            FROM advertisement_area_configs
            WHERE area_name = $1 AND is_active = true
            LIMIT 1
          `, [area_name as string]);
          
          if (areaConfigResult && areaConfigResult.length > 0) {
            areaConfig = areaConfigResult[0];
            // Set defaults for missing columns
            if (!hasAdsCloseable) areaConfig.ads_closeable = true;
            if (!hasDisplayType) areaConfig.display_type = 'simple';
          }
        } catch (areaError) {
          console.warn('Could not fetch area config:', areaError);
        }

        console.log(`✅ Returning ${validAds.length} active ads for area ${area_name}`);
        res.json({
          success: true,
          data: validAds || [],
          area_config: areaConfig || { ads_closeable: true, display_type: 'simple' } // Default values if config not found
        });
      } catch (queryError: unknown) {
        console.error('Database query error:', queryError);
        if (queryError instanceof Error) {
          console.error('Query error details:', queryError.message);
          console.error('Query error stack:', queryError.stack);
        }
        
        // Return empty array instead of failing completely
        res.json({
          success: true,
          data: []
        });
      }
    } catch (error: unknown) {
      console.error('❌ Error fetching active advertisements:', error);
      if (error instanceof Error) {
        console.error('Error name:', error.name);
        console.error('Error message:', error.message);
        console.error('Error stack:', error.stack);
      } else {
        console.error('Unknown error type:', typeof error, error);
      }
      // Return empty array instead of 500 error to prevent frontend issues
      res.json({
        success: true,
        data: []
      });
    }
  }

  // Track advertisement impression
  async trackImpression(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      // Use raw SQL to avoid repository issues with missing columns
      const result = await AppDataSource.query(
        `SELECT id, impressions, clicks, selected_area FROM video_advertisements WHERE id = $1`,
        [id]
      );

      if (!result || result.length === 0) {
        res.status(404).json({
          success: false,
          message: 'Advertisement not found'
        });
        return;
      }

      const ad = result[0];
      const newImpressions = (ad.impressions || 0) + 1;
      
      // Calculate CTR if clicks exist
      let ctrValue = 0;
      if (ad.clicks > 0 && newImpressions > 0) {
        ctrValue = Number(((ad.clicks / newImpressions) * 100).toFixed(2));
      }

      // Update impressions using raw SQL
      await AppDataSource.query(
        `UPDATE video_advertisements SET impressions = $1, updated_at = NOW() WHERE id = $2`,
        [newImpressions, id]
      );

      // Update area metrics if area exists
      if (ad.selected_area) {
        try {
          await AppDataSource.query(
            `UPDATE advertisement_area_configs 
             SET total_impressions = COALESCE(total_impressions, 0) + 1,
                 updated_at = NOW()
             WHERE area_name = $1`,
            [ad.selected_area]
          );
        } catch (areaError) {
          // Silently fail area update - not critical
          console.warn('Could not update area metrics:', areaError);
        }
      }

      res.json({
        success: true,
        message: 'Impression tracked'
      });
    } catch (error: unknown) {
      console.error('Error tracking impression:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to track impression'
      });
    }
  }

  // Track advertisement click
  async trackClick(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      const advertisement = await this.videoAdRepository.findOne({
        where: { id }
      });

      if (!advertisement) {
        res.status(404).json({
          success: false,
          message: 'Advertisement not found'
        });
        return;
      }

      advertisement.clicks += 1;
      // Calculate CTR (Click-Through Rate) manually
      advertisement.ctr = advertisement.clicks > 0 && advertisement.impressions > 0 
        ? Number(((advertisement.clicks / advertisement.impressions) * 100).toFixed(2))
        : 0;

      await this.videoAdRepository.save(advertisement);

      // Update area metrics
      const area = await this.areaConfigRepository.findOne({
        where: { area_name: advertisement.selected_area as AdvertisementArea }
      });

      if (area) {
        area.total_clicks += 1;
        area.updateMetrics(0, 1);
        await this.areaConfigRepository.save(area);
      }

      res.json({
        success: true,
        message: 'Click tracked'
      });
    } catch (error: unknown) {
      console.error('Error tracking click:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to track click'
      });
    }
  }

  // Track video view
  async trackView(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      const advertisement = await this.videoAdRepository.findOne({
        where: { id }
      });

      if (!advertisement) {
        res.status(404).json({
          success: false,
          message: 'Advertisement not found'
        });
        return;
      }

      advertisement.views += 1;
      await this.videoAdRepository.save(advertisement);

      res.json({
        success: true,
        message: 'View tracked'
      });
    } catch (error: unknown) {
      console.error('Error tracking view:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to track view'
      });
    }
  }

  // Process payment for advertisement
  async processPayment(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { payment_method, payment_data } = req.body;

      const advertisement = await this.videoAdRepository.findOne({
        where: { id }
      });

      if (!advertisement) {
        res.status(404).json({
          success: false,
          message: 'Advertisement not found'
        });
        return;
      }

      if (advertisement.status !== AdvertisementStatus.PENDING) {
        res.status(400).json({
          success: false,
          message: 'Advertisement is not in pending status'
        });
        return;
      }

      // Process payment based on method (simplified for now)
      let paymentResult;
      if (payment_method === 'payfast') {
        paymentResult = {
          success: true,
          transaction_id: `PAYFAST_${Date.now()}`,
          message: 'PayFast payment processed'
        };
      } else {
        // Handle other payment methods (cash, bank transfer, etc.)
        paymentResult = {
          success: true,
          transaction_id: `CASH_${Date.now()}`,
          message: 'Payment will be processed manually'
        };
      }

      if (paymentResult.success) {
        advertisement.payment_method = payment_method;
        advertisement.payment_status = 'paid';
        advertisement.paid_amount = advertisement.total_cost;
        advertisement.payment_date = new Date();
        advertisement.transaction_id = paymentResult.transaction_id;
        // Keep status as PENDING - admin needs to review and approve manually
        // Don't auto-approve after payment
        advertisement.status = AdvertisementStatus.PENDING;

        await this.videoAdRepository.save(advertisement);

        // Update area active ads count
        const area = await this.areaConfigRepository.findOne({
          where: { area_name: advertisement.selected_area as AdvertisementArea }
        });

        if (area) {
          area.incrementActiveAds();
          await this.areaConfigRepository.save(area);
        }

        res.json({
          success: true,
          message: 'Payment processed successfully',
          data: {
            transaction_id: paymentResult.transaction_id,
            status: advertisement.status
          }
        });
      } else {
        res.status(400).json({
          success: false,
          message: paymentResult.message || 'Payment failed'
        });
      }
    } catch (error: unknown) {
      console.error('Error processing payment:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to process payment'
      });
    }
  }

  async confirmPaymentSuccess(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { paymentMethod } = req.body;
      const userId = (req as any).user?.id;

      const advertisement = await this.videoAdRepository.findOne({
        where: { id, doctor: { id: userId } },
        relations: ['doctor']
      });

      if (!advertisement) {
        res.status(404).json({
          success: false,
          message: 'Advertisement not found'
        });
        return;
      }

      // Track if payment was just confirmed (to send email only once)
      const wasJustConfirmed = advertisement.payment_status !== 'paid';

      // Update payment status if not already paid
      if (wasJustConfirmed) {
        advertisement.payment_status = 'paid';
        advertisement.payment_method = paymentMethod || 'payfast_online';
        advertisement.paid_amount = advertisement.total_cost;
        advertisement.payment_date = new Date();
        
        // Keep status as PENDING after payment - admin needs to approve
        // Don't auto-approve - let admin review and approve manually

        await this.videoAdRepository.save(advertisement);
        console.log(`✅ Payment confirmed for advertisement ${id}`);
      } else {
        console.log(`⏭️ Payment already confirmed for advertisement ${id}, skipping update and email`);
      }

      // Send Gmail notification ONLY if payment was just confirmed (not already paid)
      if (wasJustConfirmed) {
        try {
          const mainAdminEmail = process.env.MAIN_ADMIN_EMAIL;
          const secondaryAdminEmail = process.env.SECONDARY_ADMIN_EMAIL;
          const adminEmails = [mainAdminEmail, secondaryAdminEmail].filter((email): email is string => Boolean(email));
          
          console.log(`📧 Sending payment confirmation email for advertisement ${id}...`);
          await gmailService.sendAdvertisementPaymentConfirmation(
            advertisement,
            paymentMethod || 'payfast_online',
            adminEmails.length > 0 ? adminEmails : undefined
          );
          console.log(`✅ Payment confirmation email sent successfully for advertisement ${id}`);
        } catch (error: unknown) {
          console.error('❌ Failed to send payment confirmation email:', error);
          // Don't fail the request if email fails - payment is already confirmed
        }
      }

      res.json({
        success: true,
        message: 'Payment confirmed successfully',
        data: {
          advertisement: advertisement
        }
      });
    } catch (error: unknown) {
      console.error('Error confirming payment:', error);
      res.status(500).json({
        success: false,
        message: 'Error confirming payment'
      });
    }
  }

  async getAdvertisementById(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const userId = (req as any).user?.id;

      const advertisement = await this.videoAdRepository.findOne({
        where: { id, doctor: { id: userId } },
        relations: ['doctor', 'area']
      });

      if (!advertisement) {
        res.status(404).json({
          success: false,
          message: 'Advertisement not found'
        });
        return;
      }

      res.json({
        success: true,
        data: advertisement
      });
    } catch (error: unknown) {
      console.error('Error fetching advertisement:', error);
      res.status(500).json({
        success: false,
        message: 'Error fetching advertisement'
      });
    }
  }

  async updateAdvertisement(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const userId = (req as any).user?.id;
      const updateData = req.body;

      const advertisement = await this.videoAdRepository.findOne({
        where: { id, doctor: { id: userId } }
      });

      if (!advertisement) {
        res.status(404).json({
          success: false,
          message: 'Advertisement not found'
        });
        return;
      }

      // Update advertisement data
      Object.assign(advertisement, updateData);
      await this.videoAdRepository.save(advertisement);

      res.json({
        success: true,
        message: 'Advertisement updated successfully',
        data: advertisement
      });
    } catch (error: unknown) {
      console.error('Error updating advertisement:', error);
      res.status(500).json({
        success: false,
        message: 'Error updating advertisement'
      });
    }
  }

  async deleteAdvertisement(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const userId = (req as any).user?.id;

      const advertisement = await this.videoAdRepository.findOne({
        where: { id, doctor: { id: userId } }
      });

      if (!advertisement) {
        res.status(404).json({
          success: false,
          message: 'Advertisement not found'
        });
        return;
      }

      await this.videoAdRepository.remove(advertisement);

      res.json({
        success: true,
        message: 'Advertisement deleted successfully'
      });
    } catch (error: unknown) {
      console.error('Error deleting advertisement:', error);
      res.status(500).json({
        success: false,
        message: 'Error deleting advertisement'
      });
    }
  }

  async closeAdvertisement(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      const advertisement = await this.videoAdRepository.findOne({
        where: { id }
      });

      if (!advertisement) {
        res.status(404).json({
          success: false,
          message: 'Advertisement not found'
        });
        return;
      }

      // Mark as closed by user
      advertisement.is_closed_by_user = true;
      await this.videoAdRepository.save(advertisement);

      res.json({
        success: true,
        message: 'Advertisement closed successfully'
      });
    } catch (error: unknown) {
      console.error('Error closing advertisement:', error);
      res.status(500).json({
        success: false,
        message: 'Error closing advertisement'
      });
    }
  }

}
