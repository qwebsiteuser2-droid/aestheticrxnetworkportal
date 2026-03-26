import { Request, Response } from 'express';
import { AppDataSource } from '../db/data-source';
import { Advertisement, AdvertisementStatus } from '../entities/Advertisement';
import { AdvertisementPlacement, PlacementStatus } from '../entities/AdvertisementPlacement';
import { AdvertisementApplication, ApplicationStatus } from '../entities/AdvertisementApplication';
import { Doctor } from '../models/Doctor';

export class AdvertisementController {
  // Get all advertisement placements (admin)
  static async getPlacements(req: Request, res: Response) {
    try {
      const placementRepository = AppDataSource.getRepository(AdvertisementPlacement);
      const placements = await placementRepository.find({
        order: { priority: 'DESC', created_at: 'ASC' }
      });

      res.json({
        success: true,
        data: placements
      });
    } catch (error: unknown) {
      console.error('Error fetching placements:', error);
      res.status(500).json({
        success: false,
        message: 'Error fetching advertisement placements'
      });
    }
  }

  // Create new advertisement placement (admin)
  static async createPlacement(req: Request, res: Response) {
    try {
      const placementRepository = AppDataSource.getRepository(AdvertisementPlacement);
      const placement = placementRepository.create(req.body);
      const savedPlacement = await placementRepository.save(placement);

      res.status(201).json({
        success: true,
        data: savedPlacement,
        message: 'Advertisement placement created successfully'
      });
    } catch (error: unknown) {
      console.error('Error creating placement:', error);
      res.status(500).json({
        success: false,
        message: 'Error creating advertisement placement'
      });
    }
  }

  // Update advertisement placement (admin)
  static async updatePlacement(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const placementRepository = AppDataSource.getRepository(AdvertisementPlacement);
      
      const placement = await placementRepository.findOne({ where: { id } });
      if (!placement) {
        res.status(404).json({
          success: false,
          message: 'Advertisement placement not found'
        });
        return;
      }

      Object.assign(placement, req.body);
      const updatedPlacement = await placementRepository.save(placement);

      res.json({
        success: true,
        data: updatedPlacement,
        message: 'Advertisement placement updated successfully'
      });
    } catch (error: unknown) {
      console.error('Error updating placement:', error);
      res.status(500).json({
        success: false,
        message: 'Error updating advertisement placement'
      });
    }
  }

  // Delete advertisement placement (admin)
  static async deletePlacement(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const placementRepository = AppDataSource.getRepository(AdvertisementPlacement);
      
      const placement = await placementRepository.findOne({ 
        where: { id },
        relations: ['advertisements']
      });
      
      if (!placement) {
        res.status(404).json({
          success: false,
          message: 'Advertisement placement not found'
        });
        return;
      }

      if (placement.advertisements && placement.advertisements.length > 0) {
        res.status(400).json({
          success: false,
          message: 'Cannot delete placement with active advertisements'
        });
        return;
      }

      await placementRepository.remove(placement);

      res.json({
        success: true,
        message: 'Advertisement placement deleted successfully'
      });
    } catch (error: unknown) {
      console.error('Error deleting placement:', error);
      res.status(500).json({
        success: false,
        message: 'Error deleting advertisement placement'
      });
    }
  }

  // Get all advertisement applications (admin)
  static async getApplications(req: Request, res: Response) {
    try {
      const applicationRepository = AppDataSource.getRepository(AdvertisementApplication);
      const applications = await applicationRepository.find({
        relations: ['doctor', 'approved_placement'],
        order: { created_at: 'DESC' }
      });

      res.json({
        success: true,
        data: applications
      });
    } catch (error: unknown) {
      console.error('Error fetching applications:', error);
      res.status(500).json({
        success: false,
        message: 'Error fetching advertisement applications'
      });
    }
  }

  // Get single advertisement application (admin)
  static async getApplication(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const applicationRepository = AppDataSource.getRepository(AdvertisementApplication);
      
      const application = await applicationRepository.findOne({
        where: { id },
        relations: ['doctor', 'approved_placement']
      });

      if (!application) {
        res.status(404).json({
          success: false,
          message: 'Advertisement application not found'
        });
        return;
      }

      res.json({
        success: true,
        data: application
      });
    } catch (error: unknown) {
      console.error('Error fetching application:', error);
      res.status(500).json({
        success: false,
        message: 'Error fetching advertisement application'
      });
    }
  }

  // Approve advertisement application (admin)
  static async approveApplication(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { placement_id, admin_notes } = req.body;

      const applicationRepository = AppDataSource.getRepository(AdvertisementApplication);
      const advertisementRepository = AppDataSource.getRepository(Advertisement);
      const placementRepository = AppDataSource.getRepository(AdvertisementPlacement);

      const application = await applicationRepository.findOne({
        where: { id },
        relations: ['doctor']
      });

      if (!application) {
        res.status(404).json({
          success: false,
          message: 'Advertisement application not found'
        });
        return;
      }

      if (application.status !== ApplicationStatus.PENDING) {
        res.status(400).json({
          success: false,
          message: 'Application has already been processed'
        });
        return;
      }

      // Get the approved placement
      const placement = await placementRepository.findOne({ where: { id: placement_id } });
      if (!placement) {
        res.status(404).json({
          success: false,
          message: 'Advertisement placement not found'
        });
        return;
      }

      // Check if placement has capacity
      if (placement.current_ads >= placement.max_ads) {
        res.status(400).json({
          success: false,
          message: 'Advertisement placement is at maximum capacity'
        });
        return;
      }

      // Create advertisement from application
      const advertisementData: any = {
        title: application.title,
        description: application.description,
        type: 'banner' as any, // Default type
        image_url: application.image_url,
        target_url: application.target_url,
        button_text: application.button_text,
        button_color: application.button_color,
        background_color: application.background_color,
        text_color: application.text_color,
        budget: application.budget,
        start_date: application.start_date,
        end_date: application.end_date,
        status: AdvertisementStatus.APPROVED,
        doctor_id: application.doctor_id,
        placement_id: placement_id,
        admin_override_placement: placement_id !== application.requested_placements?.[0],
        admin_placement_notes: admin_notes
      };
      
      // Only include requested_placement_id if it has a value (to avoid null/undefined type issues)
      if (application.requested_placements?.[0]) {
        advertisementData.requested_placement_id = application.requested_placements[0];
      }
      
      const advertisement = advertisementRepository.create(advertisementData);

      const savedAdvertisement = await advertisementRepository.save(advertisement);

      // Update application status
      application.status = ApplicationStatus.APPROVED;
      application.approved_placement_id = placement_id;
      // Handle both array and single object returns from save()
      let adId: string;
      if (Array.isArray(savedAdvertisement) && savedAdvertisement.length > 0 && savedAdvertisement[0]) {
        adId = savedAdvertisement[0].id;
      } else if (savedAdvertisement && !Array.isArray(savedAdvertisement)) {
        // Type assertion needed because TypeScript can't narrow the type properly
        adId = (savedAdvertisement as Advertisement).id;
      } else {
        throw new Error('Failed to save advertisement');
      }
      application.advertisement_id = adId;
      application.admin_notes = admin_notes;
      application.placement_change_notified = placement_id !== application.requested_placements?.[0];

      await applicationRepository.save(application);

      // Update placement current ads count
      placement.current_ads += 1;
      await placementRepository.save(placement);

      res.json({
        success: true,
        data: savedAdvertisement,
        message: 'Advertisement application approved successfully'
      });
    } catch (error: unknown) {
      console.error('Error approving application:', error);
      res.status(500).json({
        success: false,
        message: 'Error approving advertisement application'
      });
    }
  }

  // Reject advertisement application (admin)
  static async rejectApplication(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { rejection_reason, admin_notes } = req.body;

      const applicationRepository = AppDataSource.getRepository(AdvertisementApplication);
      
      const application = await applicationRepository.findOne({ where: { id } });

      if (!application) {
        res.status(404).json({
          success: false,
          message: 'Advertisement application not found'
        });
        return;
      }

      if (application.status !== ApplicationStatus.PENDING) {
        res.status(400).json({
          success: false,
          message: 'Application has already been processed'
        });
        return;
      }

      application.status = ApplicationStatus.REJECTED;
      application.rejection_reason = rejection_reason;
      application.admin_notes = admin_notes;

      await applicationRepository.save(application);

      res.json({
        success: true,
        message: 'Advertisement application rejected successfully'
      });
    } catch (error: unknown) {
      console.error('Error rejecting application:', error);
      res.status(500).json({
        success: false,
        message: 'Error rejecting advertisement application'
      });
    }
  }

  // Get active advertisements for display
  static async getActiveAdvertisements(req: Request, res: Response) {
    try {
      const { placement_id, guest_view, device_type } = req.query;
      
      const advertisementRepository = AppDataSource.getRepository(Advertisement);
      const queryBuilder = advertisementRepository.createQueryBuilder('ad')
        .leftJoinAndSelect('ad.placement', 'placement')
        .leftJoinAndSelect('ad.doctor', 'doctor')
        .where('ad.status = :status', { status: AdvertisementStatus.ACTIVE })
        .andWhere('ad.is_active = :isActive', { isActive: true })
        .andWhere('ad.start_date <= :today', { today: new Date().toISOString().split('T')[0] })
        .andWhere('ad.end_date >= :today', { today: new Date().toISOString().split('T')[0] });

      if (placement_id) {
        queryBuilder.andWhere('ad.placement_id = :placementId', { placementId: placement_id });
      }

      if (guest_view === 'true') {
        queryBuilder.andWhere('placement.visible_to_guests = :visibleToGuests', { visibleToGuests: true });
      }

      // Filter by device type
      if (device_type) {
        queryBuilder.andWhere('(placement.device_type = :deviceType OR placement.device_type = :allType)', { 
          deviceType: device_type, 
          allType: 'all' 
        });
      }

      queryBuilder.orderBy('ad.priority', 'DESC').addOrderBy('ad.created_at', 'ASC');

      const advertisements = await queryBuilder.getMany();

      res.json({
        success: true,
        data: advertisements
      });
    } catch (error: unknown) {
      console.error('Error fetching active advertisements:', error);
      res.status(500).json({
        success: false,
        message: 'Error fetching active advertisements'
      });
    }
  }

  // Track advertisement impression
  static async trackImpression(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      
      const advertisementRepository = AppDataSource.getRepository(Advertisement);
      const advertisement = await advertisementRepository.findOne({ where: { id } });

      if (!advertisement) {
        res.status(404).json({
          success: false,
          message: 'Advertisement not found'
        });
        return;
      }

      advertisement.impressions += 1;
      await advertisementRepository.save(advertisement);

      res.json({
        success: true,
        message: 'Impression tracked successfully'
      });
    } catch (error: unknown) {
      console.error('Error tracking impression:', error);
      res.status(500).json({
        success: false,
        message: 'Error tracking impression'
      });
    }
  }

  // Track advertisement click
  static async trackClick(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      
      const advertisementRepository = AppDataSource.getRepository(Advertisement);
      const advertisement = await advertisementRepository.findOne({ where: { id } });

      if (!advertisement) {
        res.status(404).json({
          success: false,
          message: 'Advertisement not found'
        });
        return;
      }

      advertisement.clicks += 1;
      await advertisementRepository.save(advertisement);

      res.json({
        success: true,
        message: 'Click tracked successfully'
      });
    } catch (error: unknown) {
      console.error('Error tracking click:', error);
      res.status(500).json({
        success: false,
        message: 'Error tracking click'
      });
    }
  }

  // Get user's advertisement applications
  static async getUserApplications(req: Request, res: Response): Promise<void> {
    try {
      const user = (req as any).user;
      
      // Prevent regular users and employees from accessing advertisement applications
      if (user.user_type !== 'doctor') {
        res.status(403).json({
          success: false,
          message: 'Only doctors can access advertisement applications'
        });
        return;
      }
      
      const userId = user.userId;
      const applicationRepository = AppDataSource.getRepository(AdvertisementApplication);
      const applications = await applicationRepository.find({
        where: { doctor_id: userId },
        relations: ['approved_placement'],
        order: { created_at: 'DESC' }
      });

      res.json({
        success: true,
        data: applications
      });
    } catch (error: unknown) {
      console.error('Error fetching user applications:', error);
      res.status(500).json({
        success: false,
        message: 'Error fetching your advertisement applications'
      });
    }
  }

  // Create new advertisement application (user)
  static async createApplication(req: Request, res: Response): Promise<void> {
    try {
      const user = (req as any).user;
      
      // Prevent regular users and employees from creating advertisement applications
      if (user.user_type !== 'doctor') {
        res.status(403).json({
          success: false,
          message: 'Only doctors can create advertisement applications'
        });
        return;
      }
      
      const userId = user.userId;
      const applicationRepository = AppDataSource.getRepository(AdvertisementApplication);
      const application = applicationRepository.create({
        ...req.body,
        doctor_id: userId
      });

      const savedApplication = await applicationRepository.save(application);

      res.status(201).json({
        success: true,
        data: savedApplication,
        message: 'Advertisement application submitted successfully'
      });
    } catch (error: unknown) {
      console.error('Error creating application:', error);
      res.status(500).json({
        success: false,
        message: 'Error submitting advertisement application'
      });
    }
  }

  // Get available placements for user selection
  static async getAvailablePlacements(req: Request, res: Response) {
    try {
      const placementRepository = AppDataSource.getRepository(AdvertisementPlacement);
      const placements = await placementRepository.find({
        where: {
          allow_user_selection: true,
          status: PlacementStatus.ACTIVE
        },
        order: { priority: 'DESC', name: 'ASC' }
      });

      res.json({
        success: true,
        data: placements
      });
    } catch (error: unknown) {
      console.error('Error fetching available placements:', error);
      res.status(500).json({
        success: false,
        message: 'Error fetching available advertisement placements'
      });
    }
  }
}