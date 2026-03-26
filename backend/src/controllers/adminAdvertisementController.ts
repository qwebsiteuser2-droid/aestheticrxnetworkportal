import { Request, Response } from 'express';
import { AppDataSource } from '../db/data-source';
import { VideoAdvertisement, AdvertisementStatus } from '../models/VideoAdvertisement';
import { AdvertisementAreaConfig } from '../models/AdvertisementAreaConfig';
import { Doctor } from '../models/Doctor';
import gmailService from '../services/gmailService';

export class AdminAdvertisementController {
  private videoAdRepository = AppDataSource.getRepository(VideoAdvertisement);
  private areaConfigRepository = AppDataSource.getRepository(AdvertisementAreaConfig);
  private doctorRepository = AppDataSource.getRepository(Doctor);

  // Get all advertisements for admin
  async getAllAdvertisements(req: Request, res: Response): Promise<void> {
    try {
      const { status, area, page = 1, limit = 1000 } = req.query; // Increased limit to get all ads

      // Use raw SQL to avoid TypeORM column issues
      let whereClause = '1=1';
      const params: any[] = [];
      let paramIndex = 1;

      if (status) {
        whereClause += ` AND ad.status = $${paramIndex}`;
        params.push(status);
        paramIndex++;
      }

      if (area) {
        whereClause += ` AND ad.selected_area = $${paramIndex}`;
        params.push(area);
        paramIndex++;
      }

      const skip = (Number(page) - 1) * Number(limit);
      const limitValue = Number(limit);

      // Get total count
      const countQuery = `
        SELECT COUNT(*) as total
        FROM video_advertisements ad
        WHERE ${whereClause}
      `;
      const countResult = await AppDataSource.query(countQuery, params);
      const total = parseInt(countResult[0]?.total || '0', 10);

      // Get advertisements with doctor info
      const query = `
        SELECT 
          ad.id, ad.doctor_id, ad.title, ad.description, ad.type, ad.content,
          ad.video_url, ad.image_url, ad.thumbnail_url,
          ad.selected_area, ad.duration_hours, ad.total_cost, ad.paid_amount,
          ad.start_date, ad.end_date, ad.status, ad.payment_status, ad.payment_method,
          ad.is_quitable, ad.is_closed_by_user, ad.impressions, ad.clicks, ad.views,
          ad.audio_enabled, ad.rejection_reason, ad.admin_notes,
          ad.created_at, ad.updated_at,
          d.id as doctor_id_full, 
          d.doctor_name, 
          d.clinic_name, 
          d.email
        FROM video_advertisements ad
        LEFT JOIN doctors d ON ad.doctor_id = d.id
        WHERE ${whereClause}
        ORDER BY ad.created_at DESC
        LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
      `;
      params.push(limitValue, skip);

      const advertisements = await AppDataSource.query(query, params);

      // Transform to match expected format
      const transformedAds = advertisements.map((row: any) => ({
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
        total_cost: parseFloat(row.total_cost || 0),
        paid_amount: parseFloat(row.paid_amount || 0),
        start_date: row.start_date,
        end_date: row.end_date,
        status: row.status,
        payment_status: row.payment_status,
        payment_method: row.payment_method,
        is_quitable: row.is_quitable,
        is_closed_by_user: row.is_closed_by_user,
        impressions: row.impressions || 0,
        clicks: row.clicks || 0,
        views: row.views || 0,
        audio_enabled: row.audio_enabled || false,
        rejection_reason: row.rejection_reason,
        admin_notes: row.admin_notes,
        created_at: row.created_at,
        updated_at: row.updated_at,
        doctor: (row.doctor_name || row.clinic_name) ? {
          id: row.doctor_id_full || row.doctor_id,
          doctor_name: row.doctor_name || '',
          clinic_name: row.clinic_name || '',
          email: row.email || ''
        } : {
          id: row.doctor_id,
          doctor_name: 'Unknown',
          clinic_name: 'N/A',
          email: ''
        }
      }));

      console.log(`📊 getAllAdvertisements: Found ${transformedAds.length} advertisements (total in DB: ${total})`);
      if (transformedAds.length > 0) {
        console.log(`📊 Sample ad:`, JSON.stringify(transformedAds[0], null, 2));
      }

      res.json({
        success: true,
        data: {
          advertisements: transformedAds,
          pagination: {
            page: Number(page),
            limit: limitValue,
            total,
            pages: Math.ceil(total / limitValue)
          }
        }
      });
    } catch (error: unknown) {
      console.error('Error fetching advertisements:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch advertisements'
      });
    }
  }

  // Get advertisement statistics
  async getAdvertisementStats(req: Request, res: Response): Promise<void> {
    try {
      const totalAds = await this.videoAdRepository.count();
      const pendingAds = await this.videoAdRepository.count({ where: { status: AdvertisementStatus.PENDING } });
      const activeAds = await this.videoAdRepository.count({ where: { status: AdvertisementStatus.ACTIVE } });
      const approvedAds = await this.videoAdRepository.count({ where: { status: AdvertisementStatus.APPROVED } });
      const rejectedAds = await this.videoAdRepository.count({ where: { status: AdvertisementStatus.REJECTED } });

      // Calculate total revenue
      const revenueResult = await this.videoAdRepository
        .createQueryBuilder('ad')
        .select('SUM(ad.paid_amount)', 'total_revenue')
        .where('ad.payment_status = :status', { status: 'paid' })
        .getRawOne();

      const totalRevenue = Number(revenueResult.total_revenue) || 0;

      // Get area statistics
      const areaStats = await this.areaConfigRepository
        .createQueryBuilder('area')
        .leftJoin('video_advertisements', 'ad', 'ad.selected_area = area.area_name')
        .select([
          'area.area_name',
          'area.display_name',
          'area.current_active_ads',
          'area.total_ads_served',
          'area.total_impressions',
          'area.total_clicks',
          'area.average_ctr',
          'area.average_cpm'
        ])
        .groupBy('area.id')
        .getRawMany();

      res.json({
        success: true,
        data: {
          overview: {
            total_ads: totalAds,
            pending_ads: pendingAds,
            active_ads: activeAds,
            approved_ads: approvedAds,
            rejected_ads: rejectedAds,
            total_revenue: totalRevenue
          },
          area_statistics: areaStats
        }
      });
    } catch (error: unknown) {
      console.error('Error fetching advertisement statistics:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch advertisement statistics'
      });
    }
  }

  // Approve advertisement
  async approveAdvertisement(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { admin_notes } = req.body;

      const advertisement = await this.videoAdRepository.findOne({
        where: { id },
        relations: ['doctor']
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

      // Check if area can accommodate the ad
      const area = await this.areaConfigRepository.findOne({
        where: { area_name: advertisement.selected_area as any }
      });

      if (!area || !area.isAvailable()) {
        res.status(400).json({
          success: false,
          message: 'Advertisement area is not available'
        });
        return;
      }

      // Check for timing conflicts with other active ads in the same area
      const conflicts: any[] = [];
      if (advertisement.start_date && advertisement.end_date) {
        const conflictQuery = `
          SELECT id, title, start_date, end_date, doctor_id
          FROM video_advertisements
          WHERE selected_area = $1
            AND status = $2
            AND id != $3
            AND (
              (start_date <= $4 AND end_date >= $4) OR
              (start_date <= $5 AND end_date >= $5) OR
              (start_date >= $4 AND end_date <= $5)
            )
        `;
        const conflictResults = await AppDataSource.query(conflictQuery, [
          advertisement.selected_area,
          AdvertisementStatus.ACTIVE,
          advertisement.id,
          advertisement.start_date,
          advertisement.end_date
        ]);
        
        if (conflictResults.length > 0) {
          // Get doctor names for conflicts
          for (const conflict of conflictResults) {
            const conflictDoctor = await this.doctorRepository.findOne({
              where: { id: conflict.doctor_id }
            });
            conflicts.push({
              id: conflict.id,
              title: conflict.title,
              start_date: conflict.start_date,
              end_date: conflict.end_date,
              doctor_name: conflictDoctor?.doctor_name || conflictDoctor?.clinic_name || 'Unknown'
            });
          }
        }
      }

      // Approve the advertisement (even if there are conflicts - we'll warn in response)
      // Set status to ACTIVE - the rotation service will handle when it actually starts showing
      advertisement.status = AdvertisementStatus.ACTIVE;
      advertisement.admin_notes = admin_notes;

      await this.videoAdRepository.save(advertisement);

      // Only increment area count if ad is currently in its date range
      const now = new Date();
      const startDate = advertisement.start_date ? new Date(advertisement.start_date) : null;
      const endDate = advertisement.end_date ? new Date(advertisement.end_date) : null;
      
      if (startDate && startDate <= now && (!endDate || endDate >= now)) {
        // Ad is in its date range, increment count
        area.incrementActiveAds();
        await this.areaConfigRepository.save(area);
      } else {
        // Ad is approved but waiting for its start date - rotation service will activate it
        console.log(`✅ Ad approved but waiting for start date. Will activate automatically when start_date arrives.`);
      }

      // Send approval notification email to user
      try {
        if (advertisement.doctor) {
          const userEmail = advertisement.doctor.email;
          const userName = advertisement.doctor.doctor_name || advertisement.doctor.clinic_name || 'User';
          
          const approvalHtml = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2 style="color: #28a745;">Advertisement Approved! 🎉</h2>
              <p>Dear ${userName},</p>
              
              <p>Great news! Your advertisement application has been approved and is now active on our platform.</p>
              
              <div style="background-color: #d4edda; padding: 20px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #28a745;">
                <h3 style="margin-top: 0; color: #155724;">Advertisement Details</h3>
                <p><strong>Title:</strong> ${advertisement.title}</p>
                <p><strong>Description:</strong> ${advertisement.description || 'N/A'}</p>
                <p><strong>Area:</strong> ${advertisement.selected_area}</p>
                <p><strong>Status:</strong> <span style="color: #28a745; font-weight: bold;">ACTIVE</span></p>
                <p><strong>Start Date:</strong> ${advertisement.start_date ? new Date(advertisement.start_date).toLocaleDateString() : 'N/A'}</p>
                <p><strong>End Date:</strong> ${advertisement.end_date ? new Date(advertisement.end_date).toLocaleDateString() : 'N/A'}</p>
                ${advertisement.admin_notes ? `<p><strong>Admin Notes:</strong> ${advertisement.admin_notes}</p>` : ''}
              </div>
              
              <p>Your advertisement is now live and will be displayed to users on our platform. Thank you for choosing our advertising service!</p>
              
              <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; color: #666; font-size: 12px;">
                <p>This is an automated message from AestheticRxNetwork system.</p>
              </div>
            </div>
          `;

          await gmailService.sendEmail(
            userEmail,
            `Advertisement Approved - ${advertisement.title}`,
            approvalHtml
          );
          
          console.log(`✅ Approval email sent to ${userEmail} for advertisement: ${advertisement.title}`);
        }
      } catch (error: unknown) {
        console.error('Error sending approval email:', error);
        // Don't fail the request if email fails
      }

      res.json({
        success: true,
        message: 'Advertisement approved successfully',
        data: advertisement
      });
    } catch (error: unknown) {
      console.error('Error approving advertisement:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to approve advertisement'
      });
    }
  }

  // Reject advertisement
  async rejectAdvertisement(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { rejection_reason, admin_notes } = req.body;

      const advertisement = await this.videoAdRepository.findOne({
        where: { id },
        relations: ['doctor']
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

      advertisement.status = AdvertisementStatus.REJECTED;
      advertisement.rejection_reason = rejection_reason;
      advertisement.admin_notes = admin_notes;

      await this.videoAdRepository.save(advertisement);

      // Send rejection notification email to user
      try {
        if (advertisement.doctor) {
          const userEmail = advertisement.doctor.email;
          const userName = advertisement.doctor.doctor_name || advertisement.doctor.clinic_name || 'User';
          
          // Get contact information from database or use defaults
          let contactEmail = process.env.MAIN_ADMIN_EMAIL || 'support@aestheticrx.com';
          let contactWhatsApp = '';
          
          try {
            const contactQuery = `
              SELECT gmail, whatsapp FROM contact_info 
              WHERE is_active = true 
              ORDER BY created_at DESC 
              LIMIT 1
            `;
            const contactInfo = await AppDataSource.query(contactQuery);
            if (contactInfo.length > 0) {
              contactEmail = contactInfo[0].gmail || contactEmail;
              contactWhatsApp = contactInfo[0].whatsapp || '';
            }
          } catch (contactError) {
            console.log('Could not fetch contact info, using defaults');
          }
          
          // Use standard rejection reason if not provided, or use custom one
          const finalRejectionReason = rejection_reason || 'Team did not find it suitable for this';
          
          const rejectionHtml = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2 style="color: #dc3545;">Advertisement Application Rejected</h2>
              <p>Dear ${userName},</p>
              
              <p>We regret to inform you that your advertisement application has been rejected.</p>
              
              <div style="background-color: #f8d7da; padding: 20px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #dc3545;">
                <h3 style="margin-top: 0; color: #721c24;">Application Details</h3>
                <p><strong>Title:</strong> ${advertisement.title}</p>
                <p><strong>Description:</strong> ${advertisement.description || 'N/A'}</p>
                <p><strong>Status:</strong> <span style="color: #dc3545; font-weight: bold;">REJECTED</span></p>
              </div>
              
              <div style="background-color: #fff3cd; padding: 20px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #ffc107;">
                <h3 style="margin-top: 0; color: #856404;">Rejection Reason</h3>
                <p style="color: #856404;">${finalRejectionReason}</p>
                ${advertisement.admin_notes ? `<p style="margin-top: 10px; color: #856404;"><strong>Admin Notes:</strong> ${advertisement.admin_notes}</p>` : ''}
              </div>
              
              <div style="background-color: #e7f3ff; padding: 20px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #2196F3;">
                <h3 style="margin-top: 0; color: #0d47a1;">Need Help?</h3>
                <p style="color: #0d47a1;">If you have any questions or concerns about this decision, please feel free to contact us:</p>
                <p style="color: #0d47a1; margin-top: 10px;">
                  <strong>Email:</strong> <a href="mailto:${contactEmail}" style="color: #1976D2; text-decoration: none;">${contactEmail}</a>
                </p>
                ${contactWhatsApp ? `<p style="color: #0d47a1;"><strong>WhatsApp:</strong> <a href="https://wa.me/${contactWhatsApp.replace(/[^0-9]/g, '')}" style="color: #1976D2; text-decoration: none;">${contactWhatsApp}</a></p>` : ''}
                <p style="color: #0d47a1; margin-top: 10px; font-size: 14px;">Our team will be happy to assist you and address any questions you may have.</p>
              </div>
              
              <p style="margin-top: 20px;">You are welcome to submit a new application in the future.</p>
              
              <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; color: #666; font-size: 12px;">
                <p>This is an automated message from AestheticRxNetwork system.</p>
              </div>
            </div>
          `;

          await gmailService.sendEmail(
            userEmail,
            `Advertisement Application Rejected - ${advertisement.title}`,
            rejectionHtml
          );
          
          console.log(`✅ Rejection email sent to ${userEmail} for advertisement: ${advertisement.title}`);
        }
      } catch (error: unknown) {
        console.error('Error sending rejection email:', error);
        // Don't fail the request if email fails
      }

      res.json({
        success: true,
        message: 'Advertisement rejected successfully',
        data: advertisement
      });
    } catch (error: unknown) {
      console.error('Error rejecting advertisement:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to reject advertisement'
      });
    }
  }

  // Pause/Resume advertisement
  async toggleAdvertisementStatus(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { action, stopType, duration, durationUnit } = req.body; // 'pause' or 'resume', 'permanent' or 'temporary', duration number, 'hours'/'days'/'weeks'

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

      const area = await this.areaConfigRepository.findOne({
        where: { area_name: advertisement.selected_area as any }
      });

      if (action === 'pause') {
        if (advertisement.status === AdvertisementStatus.ACTIVE || advertisement.status === AdvertisementStatus.APPROVED) {
          advertisement.status = AdvertisementStatus.PAUSED;
          
          // Handle temporary pause
          if (stopType === 'temporary' && duration && durationUnit) {
            const now = new Date();
            let resumeDate = new Date(now);
            
            // Calculate resume date based on duration and unit
            if (durationUnit === 'hours') {
              resumeDate.setHours(resumeDate.getHours() + duration);
            } else if (durationUnit === 'days') {
              resumeDate.setDate(resumeDate.getDate() + duration);
            } else if (durationUnit === 'weeks') {
              resumeDate.setDate(resumeDate.getDate() + (duration * 7));
            }
            
            // Store the resume date in pause_until field
            advertisement.pause_until = resumeDate;
            console.log(`⏱️ Temporary pause set: Will auto-resume at ${resumeDate.toISOString()}`);
          } else {
            // Permanent pause - clear pause_until
            advertisement.pause_until = null;
            console.log(`⏸️ Permanent pause: Manual resume required`);
          }
          
          if (area) {
            area.decrementActiveAds();
            await this.areaConfigRepository.save(area);
          }
        }
      } else if (action === 'resume') {
        if (advertisement.status === AdvertisementStatus.PAUSED) {
          if (area && area.isAvailable()) {
            advertisement.status = AdvertisementStatus.ACTIVE;
            advertisement.pause_until = null; // Clear any scheduled resume
            area.incrementActiveAds();
            await this.areaConfigRepository.save(area);
            console.log(`▶️ Advertisement resumed manually`);
          } else {
            res.status(400).json({
              success: false,
              message: 'Advertisement area is not available'
            });
            return;
          }
        }
      }

      await this.videoAdRepository.save(advertisement);

      let message = `Advertisement ${action}d successfully`;
      if (action === 'pause' && stopType === 'change-area') {
        message = `Advertisement moved to available area "${advertisement.selected_area}" and activated successfully.`;
      } else if (action === 'pause' && stopType === 'temporary' && duration && durationUnit) {
        const resumeDate = advertisement.pause_until;
        message = `Advertisement paused temporarily. It will automatically resume on ${resumeDate ? new Date(resumeDate).toLocaleString() : 'N/A'}`;
      } else if (action === 'pause' && stopType === 'permanent') {
        message = 'Advertisement paused permanently. It will remain paused until manually resumed.';
      }

      res.json({
        success: true,
        message,
        data: advertisement
      });
    } catch (error: unknown) {
      console.error('Error toggling advertisement status:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to toggle advertisement status'
      });
    }
  }

  // Bulk pause/resume all active advertisements
  async toggleAllAdvertisements(req: Request, res: Response): Promise<void> {
    try {
      const { action } = req.body; // 'pause' or 'resume'

      if (!action || (action !== 'pause' && action !== 'resume')) {
        res.status(400).json({
          success: false,
          message: 'Invalid action. Must be "pause" or "resume"'
        });
        return;
      }

      let updatedCount = 0;
      let skippedCount = 0;
      const errors: string[] = [];

      if (action === 'pause') {
        // Find all active or approved advertisements
        const activeAds = await this.videoAdRepository.find({
          where: [
            { status: AdvertisementStatus.ACTIVE },
            { status: AdvertisementStatus.APPROVED }
          ]
        });

        for (const ad of activeAds) {
          try {
            const area = await this.areaConfigRepository.findOne({
              where: { area_name: ad.selected_area as any }
            });

            ad.status = AdvertisementStatus.PAUSED;
            ad.pause_until = null; // Permanent pause
            await this.videoAdRepository.save(ad);

            if (area) {
              area.decrementActiveAds();
              await this.areaConfigRepository.save(area);
            }

            updatedCount++;
            console.log(`⏸️ Paused advertisement: "${ad.title}" (${ad.id})`);
          } catch (error) {
            const errorMsg = `Failed to pause ad ${ad.id}: ${error instanceof Error ? error.message : 'Unknown error'}`;
            errors.push(errorMsg);
            console.error(errorMsg);
            skippedCount++;
          }
        }
      } else if (action === 'resume') {
        // Find all paused advertisements
        const pausedAds = await this.videoAdRepository.find({
          where: { status: AdvertisementStatus.PAUSED }
        });

        for (const ad of pausedAds) {
          try {
            const area = await this.areaConfigRepository.findOne({
              where: { area_name: ad.selected_area as any }
            });

            if (area && area.isAvailable()) {
              ad.status = AdvertisementStatus.ACTIVE;
              ad.pause_until = null; // Clear any scheduled resume
              await this.videoAdRepository.save(ad);

              area.incrementActiveAds();
              await this.areaConfigRepository.save(area);

              updatedCount++;
              console.log(`▶️ Resumed advertisement: "${ad.title}" (${ad.id})`);
            } else {
              skippedCount++;
              console.log(`⚠️  Skipped resuming "${ad.title}" - area "${ad.selected_area}" is full or unavailable`);
            }
          } catch (error) {
            const errorMsg = `Failed to resume ad ${ad.id}: ${error instanceof Error ? error.message : 'Unknown error'}`;
            errors.push(errorMsg);
            console.error(errorMsg);
            skippedCount++;
          }
        }
      }

      res.json({
        success: true,
        message: action === 'pause' 
          ? `Successfully paused ${updatedCount} advertisement(s). ${skippedCount > 0 ? `${skippedCount} skipped.` : ''}`
          : `Successfully resumed ${updatedCount} advertisement(s). ${skippedCount > 0 ? `${skippedCount} skipped (areas full).` : ''}`,
        data: {
          updated: updatedCount,
          skipped: skippedCount,
          errors: errors.length > 0 ? errors : undefined
        }
      });
    } catch (error: unknown) {
      console.error('Error toggling all advertisements:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to toggle all advertisements'
      });
    }
  }

  // Update advertisement area configuration
  async updateAreaConfig(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const updateData = req.body;

      const area = await this.areaConfigRepository.findOne({
        where: { id }
      });

      if (!area) {
        res.status(404).json({
          success: false,
          message: 'Advertisement area not found'
        });
        return;
      }

      // Update area configuration
      Object.assign(area, updateData);
      const updatedArea = await this.areaConfigRepository.save(area);

      res.json({
        success: true,
        message: 'Area configuration updated successfully',
        data: updatedArea
      });
    } catch (error: unknown) {
      console.error('Error updating area configuration:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update area configuration'
      });
    }
  }

  // Get all area configurations
  async getAreaConfigs(req: Request, res: Response): Promise<void> {
    try {
      // Check which columns exist to avoid errors if migrations haven't run yet
      const columnCheck = await AppDataSource.query(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'advertisement_area_configs' 
        AND column_name IN ('ads_closeable', 'display_type', 'preview_image_url', 'rotation_interval_seconds', 'auto_rotation_enabled')
      `);
      
      const existingColumns = columnCheck.map((col: any) => col.column_name);
      const hasAdsCloseable = existingColumns.includes('ads_closeable');
      const hasDisplayType = existingColumns.includes('display_type');
      const hasPreviewImageUrl = existingColumns.includes('preview_image_url');
      const hasRotationInterval = existingColumns.includes('rotation_interval_seconds');
      const hasAutoRotation = existingColumns.includes('auto_rotation_enabled');
      
      // Use raw SQL to select only existing columns
      const areas = await AppDataSource.query(`
        SELECT 
          id, area_name, display_name, description, device_type, position, dimensions,
          responsive_breakpoints, styles, base_hourly_rate, pricing_tiers,
          max_concurrent_ads, current_active_ads, total_ads_served,
          allowed_content_types, max_file_size_mb, max_duration_seconds, allowed_formats,
          visible_to_guests, visible_to_authenticated, allow_user_selection,
          is_active, priority, admin_notes,
          average_ctr, average_cpm, audio_enabled_price_multiplier,
          total_impressions, total_clicks, created_at, updated_at
          ${hasAdsCloseable ? ', ads_closeable' : ''}
          ${hasDisplayType ? ', display_type' : ''}
          ${hasPreviewImageUrl ? ', preview_image_url' : ''}
          ${hasRotationInterval ? ', rotation_interval_seconds' : ''}
          ${hasAutoRotation ? ', auto_rotation_enabled' : ''}
        FROM advertisement_area_configs
        ORDER BY device_type ASC, priority DESC
      `);
      
      // Add default values for missing columns
      const areasWithDefaults = areas.map((area: any) => ({
        ...area,
        ads_closeable: hasAdsCloseable ? area.ads_closeable : true,
        display_type: hasDisplayType ? area.display_type : 'simple',
        preview_image_url: hasPreviewImageUrl ? area.preview_image_url : null,
        rotation_interval_seconds: hasRotationInterval ? area.rotation_interval_seconds : 5,
        auto_rotation_enabled: hasAutoRotation ? area.auto_rotation_enabled : true,
      }));

      res.json({
        success: true,
        data: areasWithDefaults
      });
    } catch (error: unknown) {
      console.error('Error fetching area configurations:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch area configurations'
      });
    }
  }

  // Create new area configuration
  async createAreaConfig(req: Request, res: Response): Promise<void> {
    try {
      const areaData = req.body;

      const area = new AdvertisementAreaConfig();
      Object.assign(area, areaData);

      const savedArea = await this.areaConfigRepository.save(area);

      res.status(201).json({
        success: true,
        message: 'Area configuration created successfully',
        data: savedArea
      });
    } catch (error: unknown) {
      console.error('Error creating area configuration:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to create area configuration'
      });
    }
  }

  // Delete area configuration
  async deleteAreaConfig(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      const area = await this.areaConfigRepository.findOne({
        where: { id }
      });

      if (!area) {
        res.status(404).json({
          success: false,
          message: 'Advertisement area not found'
        });
        return;
      }

      // Check if there are active advertisements in this area
      const activeAds = await this.videoAdRepository.count({
        where: { 
          selected_area: area.area_name,
          status: AdvertisementStatus.ACTIVE
        }
      });

      if (activeAds > 0) {
        res.status(400).json({
          success: false,
          message: 'Cannot delete area with active advertisements'
        });
        return;
      }

      await this.areaConfigRepository.remove(area);

      res.json({
        success: true,
        message: 'Area configuration deleted successfully'
      });
    } catch (error: unknown) {
      console.error('Error deleting area configuration:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to delete area configuration'
      });
    }
  }

  // Get advertisement details
  async getAdvertisementDetails(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      const advertisement = await this.videoAdRepository.findOne({
        where: { id },
        relations: ['doctor']
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
      console.error('Error fetching advertisement details:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch advertisement details'
      });
    }
  }

  async getAdvertisementAreas(req: Request, res: Response): Promise<void> {
    try {
      const areas = await this.areaConfigRepository.find({
        order: { area_name: 'ASC' }
      });

      res.json({
        success: true,
        data: areas
      });
    } catch (error: unknown) {
      console.error('Error fetching advertisement areas:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch advertisement areas'
      });
    }
  }

  // Update advertisement slide configuration (admin)
  async updateAdvertisementSlides(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { slide_count, slide_interval_seconds, auto_slide_enabled, slides } = req.body;

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

      // Update slide configuration
      if (slide_count !== undefined) {
        (advertisement as any).slide_count = slide_count;
      }
      if (slide_interval_seconds !== undefined) {
        (advertisement as any).slide_interval_seconds = slide_interval_seconds;
      }
      if (auto_slide_enabled !== undefined) {
        (advertisement as any).auto_slide_enabled = auto_slide_enabled;
      }
      if (slides !== undefined) {
        (advertisement as any).slides = slides;
      }

      await this.videoAdRepository.save(advertisement);

      res.json({
        success: true,
        message: 'Advertisement slide configuration updated successfully',
        data: {
          id: advertisement.id,
          slide_count: (advertisement as any).slide_count,
          slide_interval_seconds: (advertisement as any).slide_interval_seconds,
          auto_slide_enabled: (advertisement as any).auto_slide_enabled,
          slides: (advertisement as any).slides
        }
      });
    } catch (error: unknown) {
      console.error('Error updating advertisement slides:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update advertisement slide configuration'
      });
    }
  }

  async updateAdvertisementArea(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const updateData = req.body;

      const area = await this.areaConfigRepository.findOne({
        where: { id }
      });

      if (!area) {
        res.status(404).json({
          success: false,
          message: 'Advertisement area not found'
        });
        return;
      }

      // Update pricing, rotation settings, etc.
      if (updateData.base_hourly_rate !== undefined) {
        area.base_hourly_rate = updateData.base_hourly_rate;
      }
      if (updateData.pricing_tiers !== undefined) {
        area.pricing_tiers = updateData.pricing_tiers;
      }
      if (updateData.rotation_interval_seconds !== undefined) {
        area.rotation_interval_seconds = updateData.rotation_interval_seconds;
      }
      if (updateData.auto_rotation_enabled !== undefined) {
        area.auto_rotation_enabled = updateData.auto_rotation_enabled;
      }
      if (updateData.max_concurrent_ads !== undefined) {
        area.max_concurrent_ads = updateData.max_concurrent_ads;
      }
      if (updateData.is_active !== undefined) {
        area.is_active = updateData.is_active;
      }
      if (updateData.allow_user_selection !== undefined) {
        area.allow_user_selection = updateData.allow_user_selection;
      }
      if (updateData.ads_closeable !== undefined) {
        area.ads_closeable = updateData.ads_closeable;
      }
      if (updateData.display_type !== undefined) {
        area.display_type = updateData.display_type;
      }
      // Handle allowed_content_types - ensure it's properly formatted as JSON array
      if (updateData.allowed_content_types !== undefined) {
        if (Array.isArray(updateData.allowed_content_types)) {
          area.allowed_content_types = updateData.allowed_content_types;
        } else if (typeof updateData.allowed_content_types === 'string') {
          try {
            area.allowed_content_types = JSON.parse(updateData.allowed_content_types);
          } catch (e) {
            // If parsing fails, default to allowing all types
            area.allowed_content_types = ['video', 'image', 'animation'];
          }
        } else if (updateData.allowed_content_types === null) {
          // Null means allow all types
          area.allowed_content_types = null;
        }
      }
      if (updateData.audio_enabled_price_multiplier !== undefined) {
        area.audio_enabled_price_multiplier = updateData.audio_enabled_price_multiplier;
      }

      await this.areaConfigRepository.save(area);

      res.json({
        success: true,
        message: 'Advertisement area updated successfully',
        data: area
      });
    } catch (error: unknown) {
      console.error('Error updating advertisement area:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update advertisement area'
      });
    }
  }

  // Upload preview image for area
  async uploadAreaPreviewImage(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const file = (req as any).file;

      if (!file) {
        res.status(400).json({
          success: false,
          message: 'No file uploaded'
        });
        return;
      }

      const area = await this.areaConfigRepository.findOne({
        where: { id }
      });

      if (!area) {
        res.status(404).json({
          success: false,
          message: 'Advertisement area not found'
        });
        return;
      }

      // Save preview image URL
      area.preview_image_url = `/uploads/advertisements/previews/${file.filename}`;
      await this.areaConfigRepository.save(area);

      res.json({
        success: true,
        message: 'Preview image uploaded successfully',
        data: {
          preview_image_url: area.preview_image_url
        }
      });
    } catch (error: unknown) {
      console.error('Error uploading preview image:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to upload preview image'
      });
    }
  }
}
