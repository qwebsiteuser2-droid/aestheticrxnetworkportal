import { AppDataSource } from '../db/data-source';
import { VideoAdvertisement, AdvertisementStatus } from '../models/VideoAdvertisement';
import { AdvertisementAreaConfig } from '../models/AdvertisementAreaConfig';
import { getFrontendUrlWithPath } from '../config/urlConfig';

/**
 * Service to automatically rotate advertisements:
 * - Expire ads that have passed their end_date
 * - Activate waiting ads when space becomes available
 */
class AdvertisementRotationService {
  /**
   * Recalculate current_active_ads for all areas based on actual active ads in database
   * This ensures counts are always accurate
   */
  async recalculateAllAreaCounts(): Promise<void> {
    try {
      const now = new Date();
      console.log('🔄 Recalculating all area counts based on actual active ads...');

      // Get all areas using raw SQL to avoid issues with missing columns
      // Only select columns that definitely exist
      const areas = await AppDataSource.query(`
        SELECT 
          area_name, 
          display_name, 
          max_concurrent_ads, 
          current_active_ads,
          is_active
        FROM advertisement_area_configs
      `);

      // Map placement area names to all frontend area names that belong to them
      // This mapping aggregates ads from various frontend area names into the 4 main placements
      // Counts are calculated dynamically from actual active ads in the database
      const areaNameMapping: { [placementAreaName: string]: string[] } = {
        'top_banner_highest_visibility': [
          'desktop-header-banner',
          'mobile-header-banner',
          'top_banner_highest_visibility'
        ],
        'main_blue_area_prime_real_estate': [
          'hero_section_main',
          'mobile-hero-section',
          'main_blue_area_prime_real_estate'
        ],
        'main_blue_area_b2b_platform': [
          'hero_section_main',
          'mobile-hero-section',
          'main_blue_area_b2b_platform'
        ],
        'purple_pink_content_area': [
          'desktop_footer_banner',
          'mobile-contact-section',
          'research_papers_section',
          'mobile-research-papers',
          'purple_pink_content_area'
        ]
      };

      for (const area of areas) {
        const mappedNames = areaNameMapping[area.area_name as string] || [area.area_name];
        
        // Count ads from all mapped area names
        let totalCount = 0;
        for (const mappedName of mappedNames) {
          const activeInRangeQuery = `
            SELECT COUNT(*) as count
            FROM video_advertisements
            WHERE selected_area = $1
              AND status = $2
              AND start_date IS NOT NULL
              AND end_date IS NOT NULL
              AND start_date <= $3
              AND end_date >= $3
          `;
          const activeCountResult = await AppDataSource.query(activeInRangeQuery, [
            mappedName,
            AdvertisementStatus.ACTIVE,
            now
          ]);
          
          totalCount += parseInt(activeCountResult[0]?.count || '0', 10);
        }
        
        const currentStoredCount = area.current_active_ads || 0;

        // Cap at max capacity (can't exceed max)
        const cappedCount = Math.min(totalCount, area.max_concurrent_ads);
        
        // Only update if different to avoid unnecessary database writes
        if (cappedCount !== currentStoredCount) {
          await AppDataSource.query(
            `UPDATE advertisement_area_configs 
             SET current_active_ads = $1, updated_at = NOW() 
             WHERE area_name = $2`,
            [cappedCount, area.area_name]
          );
          console.log(`   ✅ ${area.display_name}: ${currentStoredCount} → ${cappedCount}`);
        }
      }

      console.log('✅ Area counts recalculated');
    } catch (error: unknown) {
      console.error('❌ Error recalculating area counts:', error);
    }
  }

  /**
   * Check and rotate advertisements
   * This should be called periodically (e.g., every minute)
   */
  async rotateAdvertisements(): Promise<void> {
    try {
      const now = new Date();
      console.log(`🔄 [${now.toISOString()}] Starting advertisement rotation check...`);

      // First, recalculate all area counts to ensure accuracy
      await this.recalculateAllAreaCounts();

      // Step 1: Find and mark as completed ads that have passed their end_date
      // Check both ACTIVE and APPROVED ads that have expired
      const expiredAdsQuery = `
        SELECT id, selected_area, status
        FROM video_advertisements
        WHERE status IN ($1, $2)
          AND end_date IS NOT NULL
          AND end_date < $3
      `;
      const expiredAds = await AppDataSource.query(expiredAdsQuery, [
        AdvertisementStatus.ACTIVE,
        AdvertisementStatus.APPROVED,
        now
      ]);

      if (expiredAds.length > 0) {
        console.log(`📅 Found ${expiredAds.length} expired advertisement(s) to mark as completed`);
        
        // Group expired ads by area
        const expiredByArea: { [area: string]: string[] } = {};
        for (const ad of expiredAds) {
          if (!ad || !ad.selected_area || !ad.id) continue;
          const areaName = ad.selected_area;
          if (!expiredByArea[areaName]) {
            expiredByArea[areaName] = [];
          }
          expiredByArea[areaName].push(ad.id);
        }

        // Mark ads as completed and update area counts
        for (const [areaName, adIds] of Object.entries(expiredByArea)) {
          // Update ads to completed status (instead of expired)
          const completeQuery = `
            UPDATE video_advertisements
            SET status = $1, updated_at = NOW()
            WHERE id = ANY($2::uuid[])
          `;
          await AppDataSource.query(completeQuery, [
            AdvertisementStatus.COMPLETED,
            adIds
          ]);

          // Decrement area active ads count (only for ads that were ACTIVE)
          // Use raw SQL to avoid issues with missing columns
          const areaResult = await AppDataSource.query(`
            SELECT area_name, max_concurrent_ads, current_active_ads, is_active
            FROM advertisement_area_configs
            WHERE area_name = $1
          `, [areaName]);
          const area = areaResult[0];

          // Count how many were ACTIVE before updating (to decrement area count correctly)
          const activeExpiredAds = expiredAds.filter((ad: any) => 
            adIds.includes(ad.id) && ad.status === AdvertisementStatus.ACTIVE
          );
          
          if (area) {
            
            if (activeExpiredAds.length > 0) {
              const newCount = Math.max(0, (area.current_active_ads || 0) - activeExpiredAds.length);
              await AppDataSource.query(
                `UPDATE advertisement_area_configs 
                 SET current_active_ads = $1, updated_at = NOW() 
                 WHERE area_name = $2`,
                [newCount, areaName]
              );
              console.log(`✅ Completed ${adIds.length} ad(s) in area "${areaName}" (${activeExpiredAds.length} were active). New active count: ${newCount}`);
            } else {
              console.log(`✅ Completed ${adIds.length} ad(s) in area "${areaName}" (all were approved, not active)`);
            }
          }
        }
      }

      // Step 2: Find waiting ads (approved/active but not yet in their date range or area is full)
      // These are ads that are ACTIVE or APPROVED but either:
      // - start_date > now (future start)
      // - OR start_date <= now but area is full (waiting for space)
      const waitingAdsQuery = `
        SELECT va.id, va.selected_area, va.start_date, va.end_date, va.title, va.status
        FROM video_advertisements va
        WHERE va.status = ANY(ARRAY[$1, $2])
          AND va.start_date IS NOT NULL
          AND (
            (va.start_date <= $3 AND (va.end_date IS NULL OR va.end_date >= $3))
            OR va.start_date > $3
          )
        ORDER BY va.created_at ASC
      `;
      const allWaitingAds = await AppDataSource.query(waitingAdsQuery, [
        AdvertisementStatus.ACTIVE,
        AdvertisementStatus.APPROVED,
        now
      ]);

      // Filter to only ads that should be showing but aren't (start_date <= now)
      const waitingAds = allWaitingAds.filter((ad: any) => {
        const startDate = new Date(ad.start_date);
        return startDate <= now;
      });

      if (waitingAds.length > 0) {
        console.log(`⏳ Found ${waitingAds.length} waiting advertisement(s)`);

        // Group waiting ads by area
        const waitingByArea: { [area: string]: any[] } = {};
        for (const ad of waitingAds) {
          if (!ad || !ad.selected_area) continue;
          const areaName = ad.selected_area;
          if (!waitingByArea[areaName]) {
            waitingByArea[areaName] = [];
          }
          waitingByArea[areaName].push(ad);
        }

        // Try to activate waiting ads
        for (const [areaName, ads] of Object.entries(waitingByArea)) {
          // Use raw SQL to avoid issues with missing columns
          const areaResult = await AppDataSource.query(`
            SELECT area_name, max_concurrent_ads, current_active_ads, is_active
            FROM advertisement_area_configs
            WHERE area_name = $1
          `, [areaName]);
          const area = areaResult[0];

          if (!area) {
            console.log(`⚠️  Area "${areaName}" not found, skipping`);
            continue;
          }

          // Skip if area is not active
          if (!area.is_active) {
            console.log(`⚠️  Area "${areaName}" is inactive, skipping activation of waiting ads`);
            continue;
          }

          // Count currently active ads in this area (that are in their date range)
          const activeInRangeQuery = `
            SELECT COUNT(*) as count
            FROM video_advertisements
            WHERE selected_area = $1
              AND status = $2
              AND start_date IS NOT NULL
              AND end_date IS NOT NULL
              AND start_date <= $3
              AND end_date >= $3
          `;
          const activeCountResult = await AppDataSource.query(activeInRangeQuery, [
            areaName,
            AdvertisementStatus.ACTIVE,
            now
          ]);
          const currentActive = parseInt(activeCountResult[0]?.count || '0', 10);
          const maxActive = area.max_concurrent_ads || 1;
          const availableSlots = maxActive - currentActive;

          if (availableSlots > 0) {
            // Activate up to availableSlots ads
            const adsToActivate = ads.slice(0, availableSlots);
            
            for (const ad of ads) {
              if (adsToActivate.length >= availableSlots) break;
              
              // Check if ad is actually in date range (double-check)
              const startDate = new Date(ad.start_date);
              const endDate = ad.end_date ? new Date(ad.end_date) : null;
              
              if (startDate <= now && (!endDate || endDate >= now)) {
                // Ensure ad is ACTIVE (might be APPROVED)
                const wasApproved = ad.status === AdvertisementStatus.APPROVED;
                if (ad.status !== AdvertisementStatus.ACTIVE) {
                  await AppDataSource.query(
                    `UPDATE video_advertisements 
                     SET status = $1, updated_at = NOW() 
                     WHERE id = $2`,
                    [AdvertisementStatus.ACTIVE, ad.id]
                  );
                  ad.status = AdvertisementStatus.ACTIVE;
                }
                adsToActivate.push(ad);
                console.log(`✅ Activated waiting ad: "${ad.title}" (${ad.id}) in area "${areaName}"`);
                
                // Send activation email if ad was just activated from APPROVED status
                if (wasApproved) {
                  try {
                    const { default: gmailService } = await import('./gmailService');
                    const adWithDoctor = await AppDataSource.query(
                      `SELECT va.*, d.email, d.doctor_name, d.clinic_name 
                       FROM video_advertisements va
                       LEFT JOIN doctors d ON va.doctor_id = d.id
                       WHERE va.id = $1`,
                      [ad.id]
                    );
                    
                    if (adWithDoctor[0] && adWithDoctor[0].email) {
                      const activationHtml = `
                        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                          <h2 style="color: #28a745;">🎉 Your Advertisement is Now Live!</h2>
                          <p>Dear ${adWithDoctor[0].doctor_name || adWithDoctor[0].clinic_name || 'User'},</p>
                          
                          <p>Great news! Your advertisement has been activated and is now <strong>LIVE</strong> on our platform.</p>
                          
                          <div style="background-color: #d4edda; padding: 20px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #28a745;">
                            <h3 style="margin-top: 0; color: #155724;">Advertisement Details</h3>
                            <p><strong>Title:</strong> ${ad.title}</p>
                            <p><strong>Placement Area:</strong> ${ad.selected_area}</p>
                            <p><strong>Status:</strong> <span style="color: #28a745; font-weight: bold;">✅ ACTIVE</span></p>
                            <p><strong>Start Date:</strong> ${new Date(ad.start_date).toLocaleDateString()}</p>
                            ${ad.end_date ? `<p><strong>End Date:</strong> ${new Date(ad.end_date).toLocaleDateString()}</p>` : ''}
                          </div>
                          
                          <p>Your advertisement is now live and will be displayed to users on our platform. You can track its performance in your dashboard.</p>
                          
                          <div style="text-align: center; margin: 30px 0;">
                            <a href="${getFrontendUrlWithPath('/advertisement/my-advertisements')}" style="background-color: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block;">View My Advertisements</a>
                          </div>
                          
                          <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; color: #666; font-size: 12px;">
                            <p>This is an automated message from BioAestheticAx Network system.</p>
                          </div>
                        </div>
                      `;
                      
                      await gmailService.sendEmail(
                        adWithDoctor[0].email,
                        `🎉 Your Advertisement is Now Live - ${ad.title}`,
                        activationHtml
                      );
                      console.log(`✅ Activation email sent to ${adWithDoctor[0].email} for advertisement: ${ad.title}`);
                    }
                  } catch (emailError: unknown) {
                    console.error('Error sending activation email:', emailError);
                    // Don't fail activation if email fails
                  }
                }
              }
            }

            // Update area active count based on actual active ads
            if (adsToActivate.length > 0) {
              const newCount = Math.min(maxActive, currentActive + adsToActivate.length);
              await AppDataSource.query(
                `UPDATE advertisement_area_configs 
                 SET current_active_ads = $1, updated_at = NOW() 
                 WHERE area_name = $2`,
                [newCount, areaName]
              );
              console.log(`✅ Updated area "${areaName}" active count to ${newCount}`);
            }
          } else {
            console.log(`⚠️  Area "${areaName}" is full (${currentActive}/${maxActive}), cannot activate waiting ads`);
          }
        }
      }

      // Check for temporary pauses that need to be auto-resumed
      await this.checkAndResumeTemporaryPauses();

      // Final recalculation to ensure counts are accurate after all changes
      await this.recalculateAllAreaCounts();

      console.log(`✅ Advertisement rotation check completed`);
    } catch (error: unknown) {
      console.error('❌ Error in advertisement rotation:', error);
      // Don't throw - we don't want to crash the scheduler
    }
  }

  /**
   * Check and auto-resume advertisements that were temporarily paused
   */
  async checkAndResumeTemporaryPauses(): Promise<void> {
    try {
      const now = new Date();
      
      // Find all paused advertisements with pause_until date that has passed
      const adsToResume = await AppDataSource.query(`
        SELECT va.id, va.selected_area, va.title
        FROM video_advertisements va
        WHERE va.status = $1
        AND va.pause_until IS NOT NULL
        AND va.pause_until <= $2
      `, [AdvertisementStatus.PAUSED, now.toISOString()]);

      if (adsToResume.length > 0) {
        console.log(`🔄 Found ${adsToResume.length} advertisement(s) to auto-resume`);

        for (const ad of adsToResume) {
          try {
            // Get the area configuration
            const areaResult = await AppDataSource.query(`
              SELECT * FROM advertisement_area_configs
              WHERE area_name = $1
            `, [ad.selected_area]);

            if (areaResult && areaResult.length > 0) {
              const areaConfig = areaResult[0];
              const currentActive = areaConfig.current_active_ads || 0;
              const maxActive = areaConfig.max_concurrent_ads || 1;

              // Check if area has space
              if (currentActive < maxActive) {
                // Resume the advertisement
                await AppDataSource.query(`
                  UPDATE video_advertisements
                  SET status = $1, pause_until = NULL, updated_at = NOW()
                  WHERE id = $2
                `, [AdvertisementStatus.ACTIVE, ad.id]);

                // Increment area active count
                await AppDataSource.query(`
                  UPDATE advertisement_area_configs
                  SET current_active_ads = current_active_ads + 1, updated_at = NOW()
                  WHERE area_name = $1
                `, [ad.selected_area]);

                console.log(`✅ Auto-resumed advertisement: "${ad.title}" (${ad.id})`);
              } else {
                console.log(`⚠️  Cannot auto-resume "${ad.title}" - area "${ad.selected_area}" is full (${currentActive}/${maxActive})`);
                // Clear pause_until so it doesn't keep trying, but keep it paused
                await AppDataSource.query(`
                  UPDATE video_advertisements
                  SET pause_until = NULL, updated_at = NOW()
                  WHERE id = $1
                `, [ad.id]);
              }
            } else {
              // Area not found, just clear pause_until
              await AppDataSource.query(`
                UPDATE video_advertisements
                SET pause_until = NULL, updated_at = NOW()
                WHERE id = $1
              `, [ad.id]);
            }
          } catch (adError) {
            console.error(`Error auto-resuming ad ${ad.id}:`, adError);
          }
        }
      }
    } catch (error: unknown) {
      console.error('Error checking temporary pauses:', error);
    }
  }
}

export const advertisementRotationService = new AdvertisementRotationService();

