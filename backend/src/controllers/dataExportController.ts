import { Request, Response } from 'express';
import { AppDataSource } from '../db/data-source';
import { Doctor } from '../models/Doctor';
import { Product } from '../models/Product';
import { Order } from '../models/Order';
import { VideoAdvertisement } from '../models/VideoAdvertisement';
import { ResearchPaper } from '../models/ResearchPaper';
import { TierConfig } from '../models/TierConfig';
// import { Advertisement } from '../models/Advertisement'; // Using entities/Advertisement instead
import { ResearchReport } from '../models/ResearchReport';
import { ResearchPaperView } from '../models/ResearchPaperView';
import { ResearchPaperUpvote } from '../models/ResearchPaperUpvote';
import { ResearchBenefit } from '../models/ResearchBenefit';
import { ResearchSettings } from '../models/ResearchSettings';
import { LeaderboardSnapshot } from '../models/LeaderboardSnapshot';
import { HallOfPride } from '../models/HallOfPride';
import { Certificate } from '../models/Certificate';
import { AdvertisementAreaConfig } from '../models/AdvertisementAreaConfig';
import { AdvertisementRotationConfig } from '../models/AdvertisementRotationConfig';
import { AdvertisementPricingConfig } from '../models/AdvertisementPricingConfig';
import { AdminPermission } from '../models/AdminPermission';
import { AllowedSignupId } from '../models/AllowedSignupId';
import { UserWallet } from '../models/UserWallet';
import { DebtThreshold } from '../models/DebtThreshold';
import { Notification } from '../models/Notification';
import { PayFastITN } from '../models/PayFastITN';
import { ResearchBenefitConfig } from '../models/ResearchBenefitConfig';
import { ResearchRewardEligibility } from '../models/ResearchRewardEligibility';
import { OTPConfig } from '../models/OTPConfig';
import { Badge } from '../models/Badge';
// Import Advertisement from entities - same as used in advertisementController
import { Advertisement } from '../entities/Advertisement';
import { AdvertisementApplication } from '../entities/AdvertisementApplication';
import { AdvertisementPlacement } from '../entities/AdvertisementPlacement';
import { OTP } from '../entities/OTP';
import { Team } from '../entities/Team';
import { TeamMember } from '../entities/TeamMember';
import { TeamInvitation } from '../entities/TeamInvitation';
import { TeamTierConfig } from '../entities/TeamTierConfig';
import { AwardMessageTemplate } from '../entities/AwardMessageTemplate';
import { AIModel } from '../entities/AIModel';
import { APIToken } from '../entities/APIToken';
import * as fs from 'fs';
import * as path from 'path';
import archiver from 'archiver';
import { google } from 'googleapis';
import GoogleDriveService from '../services/googleDriveService';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

interface ExportJob {
  id: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  createdAt: Date;
  completedAt?: Date;
  fileSize?: number;
  filePath?: string;
  googleDriveUrl?: string;
  error?: string;
  config: any;
}

// In-memory storage for export jobs (in production, use Redis or database)
const exportJobs: Map<string, ExportJob> = new Map();

export class DataExportController {
  private googleDriveService: GoogleDriveService;
  
  constructor() {
    try {
      this.googleDriveService = new GoogleDriveService();
    } catch (error: unknown) {
      console.error('⚠️ Failed to initialize GoogleDriveService:', error);
      // Continue without Google Drive service - it's optional
      this.googleDriveService = null as any;
    }
  }
  
  async getExportJobs(req: Request, res: Response): Promise<void> {
    try {
      console.log('📋 Fetching export jobs...');
      const jobs = Array.from(exportJobs.values())
        .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
        .slice(0, 50); // Limit to last 50 jobs

      console.log(`📋 Found ${jobs.length} export jobs`);
      res.json({
        success: true,
        data: jobs.map(job => ({
          id: job.id,
          status: job.status,
          createdAt: job.createdAt.toISOString(),
          completedAt: job.completedAt?.toISOString(),
          fileSize: job.fileSize,
          error: job.error
        }))
      });
    } catch (error: unknown) {
      console.error('❌ Error fetching export jobs:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch export jobs',
        error: error instanceof Error ? (error instanceof Error ? error.message : String(error)) : 'Unknown error'
      });
    }
  }

  async startExport(req: Request, res: Response): Promise<void> {
    try {
      const { timeRange, dataTypes, format, includeMetadata, customStartDate, customEndDate } = req.body;

      console.log('📦 ========== EXPORT JOB START ==========');
      console.log('📦 Request body:', JSON.stringify({ timeRange, dataTypes, format, includeMetadata }, null, 2));

      // Validate input
      if (!dataTypes || dataTypes.length === 0) {
        res.status(400).json({
          success: false,
          message: 'At least one data type must be selected'
        });
        return;
      }

      // Create export job
      const jobId = `export_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const job: ExportJob = {
        id: jobId,
        status: 'pending',
        createdAt: new Date(),
        config: { timeRange, dataTypes, format, includeMetadata, customStartDate, customEndDate }
      };

      console.log('📦 Job created with config:', JSON.stringify(job.config, null, 2));
      exportJobs.set(jobId, job);

      // Start processing in background
      this.processExport(jobId).catch(error => {
        console.error('Export processing error:', error);
        const job = exportJobs.get(jobId);
        if (job) {
          job.status = 'failed';
          job.error = (error instanceof Error ? error.message : String(error));
          job.completedAt = new Date();
        }
      });

      res.json({
        success: true,
        message: 'Export job started successfully',
        data: { jobId }
      });

    } catch (error: unknown) {
      console.error('Error starting export:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to start export job',
        error: error instanceof Error ? (error instanceof Error ? error.message : String(error)) : 'Unknown error'
      });
    }
  }

  private async processExport(jobId: string) {
    const job = exportJobs.get(jobId);
    if (!job) return;

    try {
      job.status = 'processing';

      // Calculate date range
      const endDate = new Date();
      const startDate = new Date();
      
      // Handle custom date range
      if (job.config.timeRange === 'custom' && job.config.customStartDate && job.config.customEndDate) {
        startDate.setTime(new Date(job.config.customStartDate).getTime());
        endDate.setTime(new Date(job.config.customEndDate).getTime());
        // Set end date to end of day
        endDate.setHours(23, 59, 59, 999);
      } else {
        switch (job.config.timeRange) {
          case '1d':
            startDate.setDate(endDate.getDate() - 1);
            break;
          case '7d':
            startDate.setDate(endDate.getDate() - 7);
            break;
          case '30d':
            startDate.setDate(endDate.getDate() - 30);
            break;
          case '90d':
            startDate.setDate(endDate.getDate() - 90);
            break;
          case '1y':
            startDate.setFullYear(endDate.getFullYear() - 1);
            break;
          case 'all':
          default:
            startDate.setFullYear(2020);
            break;
        }
      }

      // Create export directory
      const exportDir = path.join(__dirname, '../../exports');
      if (!fs.existsSync(exportDir)) {
        fs.mkdirSync(exportDir, { recursive: true });
      }

      const jobDir = path.join(exportDir, jobId);
      fs.mkdirSync(jobDir, { recursive: true });

      // Export data based on selected types
      for (const dataType of job.config.dataTypes) {
        await this.exportDataType(dataType, jobDir, startDate, endDate, job.config);
      }

      // Create archive
      const archivePath = path.join(exportDir, `${jobId}.zip`);
      await this.createArchive(jobDir, archivePath);


      // Update job status
      job.status = 'completed';
      job.completedAt = new Date();
      job.filePath = archivePath;
      job.fileSize = fs.statSync(archivePath).size;

      // Clean up temporary directory
      fs.rmSync(jobDir, { recursive: true, force: true });

    } catch (error: unknown) {
      job.status = 'failed';
      job.error = error instanceof Error ? (error instanceof Error ? error.message : String(error)) : 'Unknown error';
      job.completedAt = new Date();
    }
  }

  private getRepositoryForDataType(dataType: string): any {
    // Helper method to get repository for a data type (used for fallback)
    const repoMap: { [key: string]: any } = {
      'advertisement_applications': AppDataSource.getRepository(AdvertisementApplication),
      'research_reward_eligibility': AppDataSource.getRepository(ResearchRewardEligibility),
      'banner_advertisements': AppDataSource.getRepository(Advertisement),
      'team_invitations': AppDataSource.getRepository(TeamInvitation),
      'team_members': AppDataSource.getRepository(TeamMember),
    };
    return repoMap[dataType] || null;
  }

  private async exportDataType(dataType: string, jobDir: string, startDate: Date, endDate: Date, config: any) {
    let data: any[] = [];
    let filename = '';

    try {
    switch (dataType) {
      case 'users':
        // SECURITY: Exclude sensitive fields (password_hash) from export
        const users = await AppDataSource.getRepository(Doctor)
          .createQueryBuilder('doctor')
          .select([
            'doctor.id',
            'doctor.doctor_id',
            'doctor.email',
            'doctor.clinic_name',
            'doctor.doctor_name',
            'doctor.display_name',
            'doctor.whatsapp',
            'doctor.bio',
            'doctor.tags',
            'doctor.google_location',
            'doctor.signup_id',
            'doctor.user_type',
            'doctor.is_approved',
            'doctor.is_admin',
            'doctor.is_deactivated',
            'doctor.profile_photo_url',
            'doctor.consent_flag',
            'doctor.consent_at',
            'doctor.approved_at',
            'doctor.tier',
            'doctor.tier_color',
            'doctor.current_sales',
            'doctor.created_at',
            'doctor.updated_at'
            // Explicitly EXCLUDE password_hash
          ])
          .where('doctor.created_at >= :startDate', { startDate })
          .andWhere('doctor.created_at <= :endDate', { endDate })
          .getMany();
        // Convert to plain objects and ensure password_hash is not included
        data = users.map(u => {
          const { password_hash, ...safeUser } = u;
          return safeUser;
        });
        filename = 'users';
        break;

      case 'orders':
        data = await AppDataSource.getRepository(Order)
          .createQueryBuilder('order')
          .leftJoinAndSelect('order.product', 'product')
          .leftJoinAndSelect('order.doctor', 'doctor')
          .where('order.created_at >= :startDate', { startDate })
          .andWhere('order.created_at <= :endDate', { endDate })
          .getMany();
        filename = 'orders';
        break;

      case 'products':
        data = await AppDataSource.getRepository(Product).find();
        filename = 'products';
        break;

      case 'advertisements':
        // This refers to the old Advertisement model (from models folder)
        // Note: The entities/Advertisement is exported as 'banner_advertisements'
        // For backward compatibility, we'll export VideoAdvertisement here
        data = await AppDataSource.getRepository(VideoAdvertisement)
          .createQueryBuilder('advertisement')
          .leftJoinAndSelect('advertisement.doctor', 'doctor')
          .where('advertisement.created_at >= :startDate', { startDate })
          .andWhere('advertisement.created_at <= :endDate', { endDate })
          .getMany();
        filename = 'advertisements';
        break;

      case 'research_papers':
        data = await AppDataSource.getRepository(ResearchPaper)
          .createQueryBuilder('research_paper')
          .where('research_paper.created_at >= :startDate', { startDate })
          .andWhere('research_paper.created_at <= :endDate', { endDate })
          .getMany();
        filename = 'research_papers';
        break;

      case 'tier_configs':
        data = await AppDataSource.getRepository(TierConfig).find();
        filename = 'tier_configs';
        break;

      case 'employees':
        // SECURITY: Exclude sensitive fields (password_hash) from export
        const employees = await AppDataSource.getRepository(Doctor)
          .createQueryBuilder('doctor')
          .select([
            'doctor.id',
            'doctor.doctor_id',
            'doctor.email',
            'doctor.clinic_name',
            'doctor.doctor_name',
            'doctor.display_name',
            'doctor.whatsapp',
            'doctor.bio',
            'doctor.tags',
            'doctor.google_location',
            'doctor.signup_id',
            'doctor.user_type',
            'doctor.is_approved',
            'doctor.is_admin',
            'doctor.is_deactivated',
            'doctor.profile_photo_url',
            'doctor.consent_flag',
            'doctor.consent_at',
            'doctor.approved_at',
            'doctor.tier',
            'doctor.tier_color',
            'doctor.current_sales',
            'doctor.created_at',
            'doctor.updated_at'
            // Explicitly EXCLUDE password_hash
          ])
          .where('doctor.user_type = :userType', { userType: 'employee' })
          .andWhere('doctor.created_at >= :startDate', { startDate })
          .andWhere('doctor.created_at <= :endDate', { endDate })
          .getMany();
        // Convert to plain objects and ensure password_hash is not included
        data = employees.map(e => {
          const { password_hash, ...safeEmployee } = e;
          return safeEmployee;
        });
        filename = 'employees';
        break;

      case 'doctors':
        // SECURITY: Exclude sensitive fields (password_hash) from export
        const doctors = await AppDataSource.getRepository(Doctor)
          .createQueryBuilder('doctor')
          .select([
            'doctor.id',
            'doctor.doctor_id',
            'doctor.email',
            'doctor.clinic_name',
            'doctor.doctor_name',
            'doctor.display_name',
            'doctor.whatsapp',
            'doctor.bio',
            'doctor.tags',
            'doctor.google_location',
            'doctor.signup_id',
            'doctor.user_type',
            'doctor.is_approved',
            'doctor.is_admin',
            'doctor.is_deactivated',
            'doctor.profile_photo_url',
            'doctor.consent_flag',
            'doctor.consent_at',
            'doctor.approved_at',
            'doctor.tier',
            'doctor.tier_color',
            'doctor.current_sales',
            'doctor.created_at',
            'doctor.updated_at'
            // Explicitly EXCLUDE password_hash
          ])
          .where('doctor.user_type = :userType', { userType: 'doctor' })
          .andWhere('doctor.created_at >= :startDate', { startDate })
          .andWhere('doctor.created_at <= :endDate', { endDate })
          .getMany();
        // Convert to plain objects and ensure password_hash is not included
        data = doctors.map(d => {
          const { password_hash, ...safeDoctor } = d;
          return safeDoctor;
        });
        filename = 'doctors';
        break;

      case 'delivery_tracking':
        data = await AppDataSource.getRepository(Order)
          .createQueryBuilder('order')
          .leftJoinAndSelect('order.product', 'product')
          .leftJoinAndSelect('order.doctor', 'doctor')
          .leftJoinAndSelect('order.assigned_employee', 'assigned_employee')
          .where('order.delivery_status IS NOT NULL')
          .andWhere('order.created_at >= :startDate', { startDate })
          .andWhere('order.created_at <= :endDate', { endDate })
          .getMany();
        filename = 'delivery_tracking';
        break;

      case 'payfast_itn':
        data = await AppDataSource.getRepository(PayFastITN)
          .createQueryBuilder('itn')
          .where('itn.created_at >= :startDate', { startDate })
          .andWhere('itn.created_at <= :endDate', { endDate })
          .getMany();
        filename = 'payfast_itn';
        break;

      case 'research_reports':
        data = await AppDataSource.getRepository(ResearchReport)
          .createQueryBuilder('report')
          .leftJoinAndSelect('report.reporter', 'reporter')
          .leftJoinAndSelect('report.reviewer', 'reviewer')
          .leftJoinAndSelect('report.research_paper', 'research_paper')
          .where('report.created_at >= :startDate', { startDate })
          .andWhere('report.created_at <= :endDate', { endDate })
          .getMany();
        filename = 'research_reports';
        break;

      case 'research_views':
        data = await AppDataSource.getRepository(ResearchPaperView)
          .createQueryBuilder('view')
          .leftJoinAndSelect('view.doctor', 'doctor')
          .leftJoinAndSelect('view.research_paper', 'research_paper')
          .where('view.created_at >= :startDate', { startDate })
          .andWhere('view.created_at <= :endDate', { endDate })
          .getMany();
        filename = 'research_views';
        break;

      case 'research_upvotes':
        data = await AppDataSource.getRepository(ResearchPaperUpvote)
          .createQueryBuilder('upvote')
          .leftJoinAndSelect('upvote.doctor', 'doctor')
          .leftJoinAndSelect('upvote.research_paper', 'research_paper')
          .where('upvote.created_at >= :startDate', { startDate })
          .andWhere('upvote.created_at <= :endDate', { endDate })
          .getMany();
        filename = 'research_upvotes';
        break;

      case 'research_benefits':
        data = await AppDataSource.getRepository(ResearchBenefit)
          .createQueryBuilder('benefit')
          .leftJoinAndSelect('benefit.doctor', 'doctor')
          .leftJoinAndSelect('benefit.research_paper', 'research_paper')
          .where('benefit.created_at >= :startDate', { startDate })
          .andWhere('benefit.created_at <= :endDate', { endDate })
          .getMany();
        filename = 'research_benefits';
        break;

      case 'research_settings':
        data = await AppDataSource.getRepository(ResearchSettings).find();
        filename = 'research_settings';
        break;

      case 'leaderboard':
        data = await AppDataSource.getRepository(LeaderboardSnapshot)
          .createQueryBuilder('snapshot')
          .where('snapshot.created_at >= :startDate', { startDate })
          .andWhere('snapshot.created_at <= :endDate', { endDate })
          .orderBy('snapshot.created_at', 'DESC')
          .getMany();
        filename = 'leaderboard';
        break;

      case 'hall_of_pride':
        data = await AppDataSource.getRepository(HallOfPride)
          .createQueryBuilder('entry')
          .leftJoinAndSelect('entry.doctor', 'doctor')
          .leftJoinAndSelect('entry.created_by_doctor', 'created_by_doctor')
          .where('entry.created_at >= :startDate', { startDate })
          .andWhere('entry.created_at <= :endDate', { endDate })
          .getMany();
        filename = 'hall_of_pride';
        break;

      case 'certificates':
        data = await AppDataSource.getRepository(Certificate)
          .createQueryBuilder('certificate')
          .leftJoinAndSelect('certificate.doctor', 'doctor')
          .where('certificate.created_at >= :startDate', { startDate })
          .andWhere('certificate.created_at <= :endDate', { endDate })
          .getMany();
        filename = 'certificates';
        break;

      case 'video_advertisements':
        data = await AppDataSource.getRepository(VideoAdvertisement)
          .createQueryBuilder('advertisement')
          .where('advertisement.created_at >= :startDate', { startDate })
          .andWhere('advertisement.created_at <= :endDate', { endDate })
          .getMany();
        filename = 'video_advertisements';
        break;

      case 'advertisement_configs':
        const areaConfigs = await AppDataSource.getRepository(AdvertisementAreaConfig).find();
        const rotationConfigs = await AppDataSource.getRepository(AdvertisementRotationConfig).find();
        // Combine both config types into a single array with type indicators
        data = [
          ...areaConfigs.map((config: any) => ({ ...config, config_type: 'area' })),
          ...rotationConfigs.map((config: any) => ({ ...config, config_type: 'rotation' }))
        ];
        filename = 'advertisement_configs';
        break;

      case 'admin_permissions':
        data = await AppDataSource.getRepository(AdminPermission)
          .createQueryBuilder('permission')
          .leftJoinAndSelect('permission.doctor', 'doctor')
          .leftJoinAndSelect('permission.granted_by_doctor', 'granted_by_doctor')
          .getMany();
        filename = 'admin_permissions';
        break;

      case 'signup_ids':
        data = await AppDataSource.getRepository(AllowedSignupId).find();
        filename = 'signup_ids';
        break;

      case 'user_wallets':
        // UserWallet model may not exist, export wallet-related data from Doctor model
        data = await AppDataSource.getRepository(Doctor)
          .createQueryBuilder('doctor')
          .select([
            'doctor.id',
            'doctor.email',
            'doctor.doctor_name',
            'doctor.user_type',
            'doctor.total_owed_amount',
            'doctor.custom_debt_limit',
            'doctor.debt_limit_exceeded',
            'doctor.created_at'
          ])
          .where('doctor.created_at >= :startDate', { startDate })
          .andWhere('doctor.created_at <= :endDate', { endDate })
          .getMany();
        filename = 'user_wallets';
        break;

      case 'debt_management':
        // Export all doctors with debt information
        data = await AppDataSource.getRepository(Doctor)
          .createQueryBuilder('doctor')
          .where('doctor.total_owed_amount > 0 OR doctor.debt_limit_exceeded = true')
          .andWhere('doctor.created_at >= :startDate', { startDate })
          .andWhere('doctor.created_at <= :endDate', { endDate })
          .getMany();
        filename = 'debt_management';
        break;

      case 'debt_thresholds':
        data = await AppDataSource.getRepository(DebtThreshold).find();
        filename = 'debt_thresholds';
        break;

      case 'notifications':
        data = await AppDataSource.getRepository(Notification)
          .createQueryBuilder('notification')
          .leftJoinAndSelect('notification.recipient', 'recipient')
          .where('notification.created_at >= :startDate', { startDate })
          .andWhere('notification.created_at <= :endDate', { endDate })
          .getMany();
        filename = 'notifications';
        break;

      case 'gmail_messages':
        // Gmail messages are typically stored in logs or a separate table
        // For now, export notification records that were sent via email
        data = await AppDataSource.getRepository(Notification)
          .createQueryBuilder('notification')
          .where('notification.email_sent = true')
          .andWhere('notification.created_at >= :startDate', { startDate })
          .andWhere('notification.created_at <= :endDate', { endDate })
          .getMany();
        filename = 'gmail_messages';
        break;

      case 'research_benefit_configs':
        data = await AppDataSource.getRepository(ResearchBenefitConfig).find();
        filename = 'research_benefit_configs';
        break;

      case 'research_reward_eligibility':
        try {
          data = await AppDataSource.getRepository(ResearchRewardEligibility)
            .createQueryBuilder('eligibility')
            .leftJoinAndSelect('eligibility.doctor', 'doctor')
            .leftJoinAndSelect('eligibility.benefit_config', 'benefit_config')
            .leftJoinAndSelect('eligibility.delivered_by_doctor', 'delivered_by_doctor')
            .where('eligibility.created_at >= :startDate', { startDate })
            .andWhere('eligibility.created_at <= :endDate', { endDate })
            .getMany();
        } catch (error: any) {
          // If relations fail, try without relations
          console.warn('⚠️ ResearchRewardEligibility relations not found, fetching without relations:', error?.message);
          data = await AppDataSource.getRepository(ResearchRewardEligibility)
            .createQueryBuilder('eligibility')
            .where('eligibility.created_at >= :startDate', { startDate })
            .andWhere('eligibility.created_at <= :endDate', { endDate })
            .getMany();
        }
        filename = 'research_reward_eligibility';
        break;

      case 'advertisement_applications':
        try {
          data = await AppDataSource.getRepository(AdvertisementApplication)
            .createQueryBuilder('application')
            .leftJoinAndSelect('application.doctor', 'doctor')
            .leftJoinAndSelect('application.approved_placement', 'approved_placement')
            .where('application.created_at >= :startDate', { startDate })
            .andWhere('application.created_at <= :endDate', { endDate })
            .getMany();
        } catch (error: any) {
          // If relations fail, try without relations
          console.warn('⚠️ AdvertisementApplication relations not found, fetching without relations:', error?.message);
          data = await AppDataSource.getRepository(AdvertisementApplication)
            .createQueryBuilder('application')
            .where('application.created_at >= :startDate', { startDate })
            .andWhere('application.created_at <= :endDate', { endDate })
            .getMany();
        }
        filename = 'advertisement_applications';
        break;

      case 'advertisement_placements':
        data = await AppDataSource.getRepository(AdvertisementPlacement).find();
        filename = 'advertisement_placements';
        break;

      case 'banner_advertisements':
        // Export Advertisement entity (banner ads from entities folder)
        // Check if entity is registered, if not skip or use raw query
        try {
          // Check if the entity metadata exists
          const entityMetadata = AppDataSource.getMetadata(Advertisement);
          if (!entityMetadata) {
            throw new Error('Entity metadata not found');
          }
          // Try with relations, but catch if relations don't exist
          try {
            data = await AppDataSource.getRepository(Advertisement)
              .createQueryBuilder('advertisement')
              .leftJoinAndSelect('advertisement.doctor', 'doctor')
              .leftJoinAndSelect('advertisement.placement', 'placement')
              .leftJoinAndSelect('advertisement.requested_placement', 'requested_placement')
              .where('advertisement.created_at >= :startDate', { startDate })
              .andWhere('advertisement.created_at <= :endDate', { endDate })
              .getMany();
          } catch (relationError: any) {
            // If relations fail, try without relations
            console.warn('⚠️ Advertisement relations not found, fetching without relations:', relationError?.message);
            data = await AppDataSource.getRepository(Advertisement)
              .createQueryBuilder('advertisement')
              .where('advertisement.created_at >= :startDate', { startDate })
              .andWhere('advertisement.created_at <= :endDate', { endDate })
              .getMany();
          }
        } catch (error: any) {
          // Fallback: use raw query if entity not found
          console.warn('⚠️ Advertisement entity not found, using raw query:', error?.message);
          try {
            const result = await AppDataSource.query(
              `SELECT * FROM advertisements WHERE created_at >= $1 AND created_at <= $2`,
              [startDate, endDate]
            );
            data = result;
          } catch (rawError: any) {
            // If table doesn't exist, return empty array
            console.warn('⚠️ Advertisements table not found or error:', rawError?.message);
            data = [];
          }
        }
        filename = 'banner_advertisements';
        break;

      case 'otp_codes':
        data = await AppDataSource.getRepository(OTP)
          .createQueryBuilder('otp')
          .leftJoinAndSelect('otp.user', 'user')
          .where('otp.created_at >= :startDate', { startDate })
          .andWhere('otp.created_at <= :endDate', { endDate })
          .getMany();
        filename = 'otp_codes';
        break;

      case 'teams':
        data = await AppDataSource.getRepository(Team)
          .createQueryBuilder('team')
          .leftJoinAndSelect('team.leader', 'leader')
          .where('team.created_at >= :startDate', { startDate })
          .andWhere('team.created_at <= :endDate', { endDate })
          .getMany();
        filename = 'teams';
        break;

      case 'team_members':
        try {
          data = await AppDataSource.getRepository(TeamMember)
            .createQueryBuilder('member')
            .leftJoinAndSelect('member.team', 'team')
            .leftJoinAndSelect('member.doctor', 'doctor')
            .getMany();
        } catch (error: any) {
          console.warn('⚠️ TeamMember relations not found, fetching without relations:', error?.message);
          data = await AppDataSource.getRepository(TeamMember)
            .createQueryBuilder('member')
            .getMany();
        }
        filename = 'team_members';
        break;

      case 'team_invitations':
        try {
          data = await AppDataSource.getRepository(TeamInvitation)
            .createQueryBuilder('invitation')
            .leftJoinAndSelect('invitation.team', 'team')
            .leftJoinAndSelect('invitation.from_doctor', 'from_doctor')
            .leftJoinAndSelect('invitation.to_doctor', 'to_doctor')
            .where('invitation.created_at >= :startDate', { startDate })
            .andWhere('invitation.created_at <= :endDate', { endDate })
            .getMany();
        } catch (error: any) {
          console.warn('⚠️ TeamInvitation relations not found, fetching without relations:', error?.message);
          data = await AppDataSource.getRepository(TeamInvitation)
            .createQueryBuilder('invitation')
            .where('invitation.created_at >= :startDate', { startDate })
            .andWhere('invitation.created_at <= :endDate', { endDate })
            .getMany();
        }
        filename = 'team_invitations';
        break;

      case 'team_tier_configs':
        data = await AppDataSource.getRepository(TeamTierConfig).find();
        filename = 'team_tier_configs';
        break;

      case 'award_message_templates':
        data = await AppDataSource.getRepository(AwardMessageTemplate).find();
        filename = 'award_message_templates';
        break;

      case 'ai_models':
        data = await AppDataSource.getRepository(AIModel).find();
        filename = 'ai_models';
        break;

      case 'api_tokens':
        data = await AppDataSource.getRepository(APIToken).find();
        filename = 'api_tokens';
        break;

      case 'badges':
        try {
          data = await AppDataSource.getRepository(Badge).find();
        } catch (error: any) {
          console.warn('⚠️ Badge table not found, using raw query:', error?.message);
          try {
            data = await AppDataSource.query('SELECT * FROM badges');
          } catch (rawError: any) {
            console.warn('⚠️ Badges table not found:', rawError?.message);
            data = [];
          }
        }
        filename = 'badges';
        break;

      case 'otp_configs':
        try {
          data = await AppDataSource.getRepository(OTPConfig).find();
        } catch (error: any) {
          console.warn('⚠️ OTPConfig table not found, using raw query:', error?.message);
          try {
            data = await AppDataSource.query('SELECT * FROM otp_configs');
          } catch (rawError: any) {
            console.warn('⚠️ OTP configs table not found:', rawError?.message);
            data = [];
          }
        }
        filename = 'otp_configs';
        break;

      case 'advertisement_pricing_configs':
        try {
          data = await AppDataSource.getRepository(AdvertisementPricingConfig).find();
        } catch (error: any) {
          console.warn('⚠️ AdvertisementPricingConfig table not found, using raw query:', error?.message);
          try {
            data = await AppDataSource.query('SELECT * FROM advertisement_pricing_configs');
          } catch (rawError: any) {
            console.warn('⚠️ Advertisement pricing configs table not found:', rawError?.message);
            data = [];
          }
        }
        filename = 'advertisement_pricing_configs';
        break;

      case 'advertisement_rotation_configs':
        try {
          data = await AppDataSource.getRepository(AdvertisementRotationConfig).find();
        } catch (error: any) {
          console.warn('⚠️ AdvertisementRotationConfig table not found, using raw query:', error?.message);
          try {
            data = await AppDataSource.query('SELECT * FROM advertisement_rotation_configs');
          } catch (rawError: any) {
            console.warn('⚠️ Advertisement rotation configs table not found:', rawError?.message);
            data = [];
          }
        }
        filename = 'advertisement_rotation_configs';
        break;

      case 'user_wallets_full':
        try {
          data = await AppDataSource.getRepository(UserWallet)
            .createQueryBuilder('wallet')
            .leftJoinAndSelect('wallet.doctor', 'doctor')
            .getMany();
        } catch (error: any) {
          console.warn('⚠️ UserWallet relations not found, fetching without relations:', error?.message);
          try {
            data = await AppDataSource.query('SELECT * FROM user_wallets');
          } catch (rawError: any) {
            // Fallback to doctor wallet data
            console.warn('⚠️ User wallets table not found, using doctor data:', rawError?.message);
            data = await AppDataSource.getRepository(Doctor)
              .createQueryBuilder('doctor')
              .select([
                'doctor.id',
                'doctor.email',
                'doctor.doctor_name',
                'doctor.user_type',
                'doctor.total_owed_amount',
                'doctor.custom_debt_limit',
                'doctor.debt_limit_exceeded'
              ])
              .getMany();
          }
        }
        filename = 'user_wallets_full';
        break;

      case 'email_deliveries':
        try {
          data = await AppDataSource.query(`
            SELECT * FROM email_deliveries 
            WHERE created_at >= $1 AND created_at <= $2
            ORDER BY created_at DESC
          `, [startDate, endDate]);
        } catch (error: any) {
          console.warn('⚠️ Email deliveries table not found:', error?.message);
          data = [];
        }
        filename = 'email_deliveries';
        break;

      case 'auto_email_configs':
        try {
          data = await AppDataSource.query('SELECT * FROM auto_email_configs');
        } catch (error: any) {
          console.warn('⚠️ Auto email configs table not found:', error?.message);
          data = [];
        }
        filename = 'auto_email_configs';
        break;

      case 'analytics':
      case 'user_activity':
      case 'order_statistics':
        // These are typically computed/aggregated data
        // For now, export related raw data
        if (dataType === 'analytics' || dataType === 'user_activity') {
          // SECURITY: Exclude sensitive fields (password_hash) from export
          const analyticsUsers = await AppDataSource.getRepository(Doctor)
            .createQueryBuilder('doctor')
            .select([
              'doctor.id',
              'doctor.doctor_id',
              'doctor.email',
              'doctor.clinic_name',
              'doctor.doctor_name',
              'doctor.display_name',
              'doctor.whatsapp',
              'doctor.bio',
              'doctor.tags',
              'doctor.google_location',
              'doctor.signup_id',
              'doctor.user_type',
              'doctor.is_approved',
              'doctor.is_admin',
              'doctor.is_deactivated',
              'doctor.profile_photo_url',
              'doctor.consent_flag',
              'doctor.consent_at',
              'doctor.approved_at',
              'doctor.tier',
              'doctor.tier_color',
              'doctor.current_sales',
              'doctor.current_sales',
              'doctor.created_at',
              'doctor.updated_at'
              // Explicitly EXCLUDE password_hash
            ])
            .where('doctor.created_at >= :startDate', { startDate })
            .andWhere('doctor.created_at <= :endDate', { endDate })
            .getMany();
          // Convert to plain objects and ensure password_hash is not included
          data = analyticsUsers.map(u => {
            const { password_hash, ...safeUser } = u;
            return safeUser;
          });
          filename = dataType === 'analytics' ? 'analytics' : 'user_activity';
        } else {
          data = await AppDataSource.getRepository(Order)
            .createQueryBuilder('order')
            .leftJoinAndSelect('order.product', 'product')
            .leftJoinAndSelect('order.doctor', 'doctor')
            .where('order.created_at >= :startDate', { startDate })
            .andWhere('order.created_at <= :endDate', { endDate })
            .getMany();
          filename = 'order_statistics';
        }
        break;

      default:
        console.warn(`⚠️ Unknown data type: ${dataType}`);
        return;
    }
    } catch (error: any) {
      // Log which data type failed
      console.error(`❌ Error exporting data type "${dataType}":`, error?.message);
      // If it's a relation error, try fetching without relations
      if (error?.message?.includes('Relation with property path') || error?.message?.includes('was not found')) {
        console.warn(`⚠️ Relation error for ${dataType}, attempting to fetch without relations...`);
        // Try to fetch without relations - this is a fallback
        try {
          // Get the repository based on dataType
          const repo = this.getRepositoryForDataType(dataType);
          if (repo) {
            data = await repo
              .createQueryBuilder('entity')
              .where('entity.created_at >= :startDate', { startDate })
              .andWhere('entity.created_at <= :endDate', { endDate })
              .getMany();
          } else {
            // If we can't determine the repository, return empty array
            data = [];
          }
        } catch (fallbackError: any) {
          console.error(`❌ Fallback also failed for ${dataType}:`, fallbackError?.message);
          data = [];
        }
      } else {
        // Re-throw if it's not a relation error
        throw error;
      }
    }

    // Ensure data is an array
    if (!Array.isArray(data)) {
      console.warn(`⚠️ Data for ${dataType} is not an array, converting...`);
      data = [data];
    }

    // Add metadata if requested
    if (config.includeMetadata && Array.isArray(data)) {
      data = data.map(item => ({
        ...item,
        _export_metadata: {
          exported_at: new Date().toISOString(),
          export_job_id: jobDir.split('/').pop(),
          data_type: dataType,
          time_range: config.timeRange
        }
      }));
    }

    // Write file based on format
    const filePath = path.join(jobDir, `${filename}.${config.format}`);
    
    switch (config.format) {
      case 'json':
        fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
        break;
      case 'csv':
        fs.writeFileSync(filePath, this.convertToCSV(data));
        break;
      case 'xlsx':
        // For Excel format, we'll use JSON for now (can be enhanced with xlsx library)
        fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
        break;
      case 'sql':
        fs.writeFileSync(filePath, this.convertToSQL(data, dataType));
        break;
    }
  }

  private convertToCSV(data: any[]): string {
    if (data.length === 0) return '';

    const headers = Object.keys(data[0]);
    const csvRows = [headers.join(',')];

    for (const row of data) {
      const values = headers.map(header => {
        const value = row[header];
        if (value === null || value === undefined) return '';
        if (typeof value === 'object') return JSON.stringify(value);
        return String(value).replace(/"/g, '""');
      });
      csvRows.push(values.map(v => `"${v}"`).join(','));
    }

    return csvRows.join('\n');
  }

  private convertToSQL(data: any[], tableName: string): string {
    if (data.length === 0) return `-- No data for ${tableName}\n`;

    // Security: Validate and sanitize table name to prevent SQL injection
    // Only allow alphanumeric characters and underscores
    const sanitizedTableName = tableName.replace(/[^a-zA-Z0-9_]/g, '');
    if (sanitizedTableName !== tableName || sanitizedTableName.length === 0) {
      throw new Error(`Invalid table name: ${tableName}. Only alphanumeric characters and underscores are allowed.`);
    }

    // Whitelist of allowed table names (map from dataType to actual table name)
    const allowedTableNames: { [key: string]: string } = {
      'doctors': 'doctors',
      'orders': 'orders',
      'products': 'products',
      'research_papers': 'research_papers',
      'research_views': 'research_paper_views',
      'research_upvotes': 'research_paper_upvotes',
      'research_reports': 'research_reports',
      'research_benefits': 'research_benefits',
      'research_benefit_configs': 'research_benefit_configs',
      'research_reward_eligibility': 'research_reward_eligibility',
      'leaderboard_snapshots': 'leaderboard_snapshots',
      'hall_of_pride': 'hall_of_pride',
      'certificates': 'certificates',
      'advertisements': 'advertisements',
      'banner_advertisements': 'advertisements',
      'advertisement_applications': 'advertisement_applications',
      'advertisement_placements': 'advertisement_placements',
      'advertisement_configs': 'advertisement_area_configs',
      'admin_permissions': 'admin_permissions',
      'allowed_signup_ids': 'allowed_signup_ids',
      'user_wallets': 'doctors', // Uses doctors table
      'debt_thresholds': 'debt_thresholds',
      'notifications': 'notifications',
      'payfast_itn': 'payfast_itn',
      'otp_codes': 'otp_codes',
      'teams': 'teams',
      'team_members': 'team_members',
      'team_invitations': 'team_invitations',
      'team_tier_configs': 'team_tier_configs',
      'award_message_templates': 'award_message_templates',
      'ai_models': 'ai_models',
      'api_tokens': 'api_tokens',
    };

    // Use whitelisted table name or throw error
    const safeTableName = allowedTableNames[sanitizedTableName] || sanitizedTableName;
    if (!allowedTableNames[sanitizedTableName] && !allowedTableNames[tableName]) {
      // If not in whitelist, use sanitized version but log warning
      console.warn(`⚠️ Table name "${tableName}" not in whitelist, using sanitized version: "${safeTableName}"`);
    }

    const headers = Object.keys(data[0]);
    const sqlRows = [];

    for (const row of data) {
      // Sanitize column names as well
      const safeHeaders = headers.map(header => {
        const sanitized = header.replace(/[^a-zA-Z0-9_]/g, '');
        if (sanitized !== header) {
          throw new Error(`Invalid column name: ${header}`);
        }
        return sanitized;
      });

      const values = safeHeaders.map(header => {
        const value = row[header];
        if (value === null || value === undefined) return 'NULL';
        if (typeof value === 'string') {
          // Escape single quotes and prevent SQL injection
          return `'${value.replace(/'/g, "''").replace(/\\/g, '\\\\')}'`;
        }
        if (typeof value === 'object') {
          const jsonStr = JSON.stringify(value);
          return `'${jsonStr.replace(/'/g, "''").replace(/\\/g, '\\\\')}'`;
        }
        // For numbers, validate they're actually numbers
        if (typeof value === 'number') {
          if (!isFinite(value)) return 'NULL';
          return String(value);
        }
        return 'NULL';
      });
      sqlRows.push(`INSERT INTO ${safeTableName} (${safeHeaders.join(', ')}) VALUES (${values.join(', ')});`);
    }

    return sqlRows.join('\n');
  }

  private async createArchive(sourceDir: string, archivePath: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const output = fs.createWriteStream(archivePath);
      const archive = archiver('zip', { zlib: { level: 9 } });

      output.on('close', () => resolve());
      archive.on('error', (err) => reject(err));

      archive.pipe(output);
      archive.directory(sourceDir, false);
      archive.finalize();
    });
  }

  private async sendToGmail(filePath: string, folderName: string, jobId: string): Promise<void> {
    // Use gmailService for sending emails (Gmail API with SMTP fallback)
    const gmailService = (await import('../services/gmailService')).default;
    const fs = await import('fs');

    const fileName = `export_${jobId}_${new Date().toISOString().split('T')[0]}.zip`;
    const currentDate = new Date().toLocaleDateString();
    const adminEmail = process.env.GMAIL_USER || 'asadkhanbloch4949@gmail.com';
    
    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #2563eb;">📊 AestheticRxNetwork Data Export</h2>
        <p>Hello Admin,</p>
        <p>Your requested data export has been completed successfully!</p>
        
        <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="color: #374151; margin-top: 0;">Export Details:</h3>
          <ul style="color: #6b7280;">
            <li><strong>Export ID:</strong> ${jobId}</li>
            <li><strong>Date:</strong> ${currentDate}</li>
            <li><strong>Folder:</strong> ${folderName}</li>
            <li><strong>File:</strong> ${fileName}</li>
          </ul>
        </div>
        
        <p style="color: #6b7280;">
          The exported data is attached to this email. You can download it and use it for:
        </p>
        <ul style="color: #6b7280;">
          <li>📈 Data analysis and visualization</li>
          <li>🤖 AI predictions and machine learning</li>
          <li>📊 Business intelligence and reporting</li>
          <li>💾 Backup and archival purposes</li>
        </ul>
        
        <p style="color: #6b7280;">
          <strong>Note:</strong> This data export contains sensitive information. Please handle it securely.
        </p>
        
        <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
        <p style="color: #9ca3af; font-size: 12px;">
          This is an automated message from AestheticRxNetwork Data Export System.
        </p>
      </div>
    `;

    // Read file content for attachment
    const fileContent = fs.readFileSync(filePath);
    
    await gmailService.sendEmailWithAttachments(
      adminEmail,
      `📊 AestheticRxNetwork Data Export - ${currentDate}`,
      htmlContent,
      [{
        filename: fileName,
        content: fileContent,
        contentType: 'application/zip'
      }],
      { isMarketing: false }
    );

    console.log(`✅ Data export sent via Gmail: ${fileName}`);
  }

  /**
   * Export the entire database as a complete backup
   * This creates a full database dump that can be restored later
   */
  async exportFullDatabase(req: Request, res: Response): Promise<void> {
    try {
      console.log('🗄️ ========== FULL DATABASE EXPORT START ==========');
      
      // Create export job
      const jobId = `full_db_export_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const job: ExportJob = {
        id: jobId,
        status: 'pending',
        createdAt: new Date(),
        config: { type: 'full_database', format: 'sql' }
      };
      
      exportJobs.set(jobId, job);
      
      // Start processing in background
      this.processFullDatabaseExport(jobId).catch(error => {
        console.error('Full database export error:', error);
        const job = exportJobs.get(jobId);
        if (job) {
          job.status = 'failed';
          job.error = (error instanceof Error ? error.message : String(error));
          job.completedAt = new Date();
        }
      });
      
      res.json({
        success: true,
        message: 'Full database export started successfully',
        data: { jobId }
      });
      
    } catch (error: unknown) {
      console.error('Error starting full database export:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to start full database export',
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }

  private async processFullDatabaseExport(jobId: string) {
    const job = exportJobs.get(jobId);
    if (!job) return;

    try {
      job.status = 'processing';
      console.log('🗄️ Processing full database export:', jobId);

      // Create export directory
      const exportDir = path.join(__dirname, '../../exports');
      if (!fs.existsSync(exportDir)) {
        fs.mkdirSync(exportDir, { recursive: true });
      }

      const jobDir = path.join(exportDir, jobId);
      fs.mkdirSync(jobDir, { recursive: true });

      // Get all table names from the database
      const tables = await AppDataSource.query(`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_type = 'BASE TABLE'
        ORDER BY table_name
      `);

      console.log(`📊 Found ${tables.length} tables to export`);

      // Export each table
      for (const tableRow of tables) {
        const tableName = tableRow.table_name;
        try {
          // Get all data from the table
          const data = await AppDataSource.query(`SELECT * FROM "${tableName}"`);
          
          // Get column info for proper SQL generation
          const columns = await AppDataSource.query(`
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = $1 AND table_schema = 'public'
            ORDER BY ordinal_position
          `, [tableName]);

          // Write JSON file
          const jsonPath = path.join(jobDir, `${tableName}.json`);
          fs.writeFileSync(jsonPath, JSON.stringify(data, null, 2));

          // Write SQL file
          const sqlPath = path.join(jobDir, `${tableName}.sql`);
          const sqlContent = this.generateTableSQL(tableName, columns, data);
          fs.writeFileSync(sqlPath, sqlContent);

          console.log(`✅ Exported table: ${tableName} (${data.length} rows)`);
        } catch (tableError: any) {
          console.error(`❌ Error exporting table ${tableName}:`, tableError?.message);
        }
      }

      // Generate a master restore script
      const masterScript = this.generateMasterRestoreScript(tables.map((t: any) => t.table_name));
      fs.writeFileSync(path.join(jobDir, '_RESTORE_ORDER.sql'), masterScript);

      // Generate database schema
      const schemaSQL = await this.exportDatabaseSchema();
      fs.writeFileSync(path.join(jobDir, '_SCHEMA.sql'), schemaSQL);

      // Create metadata file
      const metadata = {
        export_date: new Date().toISOString(),
        export_id: jobId,
        database_type: 'PostgreSQL',
        total_tables: tables.length,
        tables: tables.map((t: any) => t.table_name),
        instructions: [
          '1. First run _SCHEMA.sql to create tables',
          '2. Then run _RESTORE_ORDER.sql to restore data in correct order',
          '3. Or restore individual tables using their .sql files',
          '4. JSON files are provided for programmatic access'
        ]
      };
      fs.writeFileSync(path.join(jobDir, '_METADATA.json'), JSON.stringify(metadata, null, 2));

      // Create archive
      const archivePath = path.join(exportDir, `${jobId}.zip`);
      await this.createArchive(jobDir, archivePath);

      // Update job status
      job.status = 'completed';
      job.completedAt = new Date();
      job.filePath = archivePath;
      job.fileSize = fs.statSync(archivePath).size;

      // Clean up temporary directory
      fs.rmSync(jobDir, { recursive: true, force: true });

      console.log(`✅ Full database export completed: ${jobId}`);
      console.log(`📦 Archive size: ${job.fileSize} bytes`);

    } catch (error: unknown) {
      job.status = 'failed';
      job.error = error instanceof Error ? error.message : String(error);
      job.completedAt = new Date();
      console.error('❌ Full database export failed:', error);
    }
  }

  private generateTableSQL(tableName: string, columns: any[], data: any[]): string {
    if (data.length === 0) {
      return `-- Table: ${tableName}\n-- No data\n`;
    }

    // Sanitize table name
    const safeTableName = tableName.replace(/[^a-zA-Z0-9_]/g, '');
    
    let sql = `-- Table: ${safeTableName}\n`;
    sql += `-- Rows: ${data.length}\n`;
    sql += `-- Exported: ${new Date().toISOString()}\n\n`;

    for (const row of data) {
      const columnNames = columns.map((c: any) => `"${c.column_name}"`).join(', ');
      const values = columns.map((c: any) => {
        const value = row[c.column_name];
        if (value === null || value === undefined) return 'NULL';
        if (typeof value === 'string') {
          return `'${value.replace(/'/g, "''")}'`;
        }
        if (typeof value === 'object') {
          if (value instanceof Date) {
            return `'${value.toISOString()}'`;
          }
          return `'${JSON.stringify(value).replace(/'/g, "''")}'`;
        }
        if (typeof value === 'boolean') {
          return value ? 'TRUE' : 'FALSE';
        }
        return String(value);
      }).join(', ');

      sql += `INSERT INTO "${safeTableName}" (${columnNames}) VALUES (${values});\n`;
    }

    return sql;
  }

  private generateMasterRestoreScript(tableNames: string[]): string {
    // Order tables by dependencies (basic ordering)
    const orderedTables = [
      // Configuration tables first
      'tier_configs', 'team_tier_configs', 'debt_thresholds', 'otp_configs',
      'research_settings', 'research_benefit_configs', 'ai_models',
      'advertisement_area_configs', 'advertisement_pricing_configs', 'advertisement_rotation_configs',
      'award_message_templates', 'auto_email_configs', 'allowed_signup_ids',
      // User tables
      'doctors', 'badges',
      // Related tables
      'admin_permissions', 'user_wallets', 'teams', 'team_members', 'team_invitations',
      'products', 'orders', 'payfast_itn',
      'research_papers', 'research_paper_views', 'research_paper_upvotes', 'research_reports',
      'research_benefits', 'research_reward_eligibility',
      'notifications', 'otp_codes', 'email_deliveries',
      'leaderboard_snapshots', 'hall_of_pride', 'certificates',
      'advertisements', 'video_advertisements', 'advertisement_applications', 'advertisement_placements',
      'api_tokens'
    ];

    // Filter to only include tables that exist
    const filteredTables = orderedTables.filter(t => tableNames.includes(t));
    // Add any remaining tables not in the ordered list
    const remainingTables = tableNames.filter(t => !filteredTables.includes(t));
    const finalOrder = [...filteredTables, ...remainingTables];

    let script = `-- Master Restore Script\n`;
    script += `-- Generated: ${new Date().toISOString()}\n`;
    script += `-- IMPORTANT: Run _SCHEMA.sql first to create tables!\n\n`;
    script += `-- Disable foreign key checks during restore\n`;
    script += `SET session_replication_role = 'replica';\n\n`;

    for (const table of finalOrder) {
      script += `\\i ${table}.sql\n`;
    }

    script += `\n-- Re-enable foreign key checks\n`;
    script += `SET session_replication_role = 'origin';\n`;

    return script;
  }

  private async exportDatabaseSchema(): Promise<string> {
    try {
      // Get all CREATE TABLE statements
      const tables = await AppDataSource.query(`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_type = 'BASE TABLE'
        ORDER BY table_name
      `);

      let schema = `-- Database Schema Export\n`;
      schema += `-- Generated: ${new Date().toISOString()}\n\n`;

      for (const tableRow of tables) {
        const tableName = tableRow.table_name;
        
        // Get column definitions
        const columns = await AppDataSource.query(`
          SELECT 
            column_name, 
            data_type, 
            character_maximum_length,
            column_default,
            is_nullable
          FROM information_schema.columns 
          WHERE table_name = $1 AND table_schema = 'public'
          ORDER BY ordinal_position
        `, [tableName]);

        schema += `-- Table: ${tableName}\n`;
        schema += `CREATE TABLE IF NOT EXISTS "${tableName}" (\n`;
        
        const columnDefs = columns.map((col: any) => {
          let def = `  "${col.column_name}" ${col.data_type.toUpperCase()}`;
          if (col.character_maximum_length) {
            def += `(${col.character_maximum_length})`;
          }
          if (col.column_default) {
            def += ` DEFAULT ${col.column_default}`;
          }
          if (col.is_nullable === 'NO') {
            def += ' NOT NULL';
          }
          return def;
        });
        
        schema += columnDefs.join(',\n');
        schema += `\n);\n\n`;
      }

      return schema;
    } catch (error: any) {
      console.error('Error exporting schema:', error?.message);
      return `-- Schema export failed: ${error?.message}\n`;
    }
  }

  async downloadExport(req: Request, res: Response): Promise<void> {
    try {
      const { jobId } = req.params;
      
      if (!jobId || typeof jobId !== 'string') {
        res.status(400).json({
          success: false,
          message: 'Job ID is required'
        });
        return;
      }
      
      const job = exportJobs.get(jobId);
      if (!job) {
        res.status(404).json({
          success: false,
          message: 'Export job not found'
        });
        return;
      }

      if (job.status !== 'completed') {
        res.status(400).json({
          success: false,
          message: 'Export job is not completed yet'
        });
        return;
      }

      if (!job.filePath || !fs.existsSync(job.filePath)) {
        res.status(404).json({
          success: false,
          message: 'Export file not found'
        });
        return;
      }

      // Set headers for file download
      res.setHeader('Content-Type', 'application/zip');
      res.setHeader('Content-Disposition', `attachment; filename="export_${jobId}.zip"`);
      
      // Stream the file
      const fileStream = fs.createReadStream(job.filePath);
      fileStream.pipe(res);

      console.log('📥 Export file downloaded:', jobId);
    } catch (error: unknown) {
      console.error('Error downloading export:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to download export file',
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }

  async getGoogleDriveStatus(req: Request, res: Response): Promise<void> {
    try {
      console.log('📁 Google Drive status check requested');
      
      // Check if Google Drive service account is configured
      const hasGoogleCredentials = !!(
        process.env.GOOGLE_PRIVATE_KEY_ID &&
        process.env.GOOGLE_PRIVATE_KEY &&
        process.env.GOOGLE_CLIENT_ID
      );
      
      // Check if service is actually initialized
      let isServiceInitialized = false;
      try {
        if (this.googleDriveService && typeof this.googleDriveService.isConfigured === 'function') {
          isServiceInitialized = this.googleDriveService.isConfigured();
        }
      } catch (serviceError) {
        console.error('⚠️ Error checking service configuration:', serviceError);
        isServiceInitialized = false;
      }
      
      // If service is initialized, ensure the AestheticRxNetwork_Exports folder exists
      let folderExists = false;
      if (isServiceInitialized && this.googleDriveService) {
        try {
          await this.googleDriveService.ensureFolderExists('AestheticRxNetwork_Exports');
          folderExists = true;
          console.log('✅ AestheticRxNetwork_Exports folder ensured to exist');
        } catch (folderError) {
          console.error('⚠️ Error ensuring AestheticRxNetwork_Exports folder exists:', folderError);
          folderExists = false;
        }
      }
      
      console.log('📁 Google Drive status check:', {
        hasPrivateKeyId: !!process.env.GOOGLE_PRIVATE_KEY_ID,
        hasPrivateKey: !!process.env.GOOGLE_PRIVATE_KEY,
        hasClientId: !!process.env.GOOGLE_CLIENT_ID,
        hasCredentials: hasGoogleCredentials,
        serviceExists: !!this.googleDriveService,
        serviceInitialized: isServiceInitialized,
        folderExists: folderExists
      });
      
      res.json({
        success: true,
        data: {
          connected: hasGoogleCredentials && isServiceInitialized,
          configured: hasGoogleCredentials,
          serviceInitialized: isServiceInitialized,
          folderExists: folderExists,
          method: 'google-drive',
          serviceAccount: 'asadkhanbloch4949@alien-cedar-476317-c8.iam.gserviceaccount.com',
          message: hasGoogleCredentials 
            ? (isServiceInitialized 
                ? (folderExists ? 'Google Drive is ready and AestheticRxNetwork_Exports folder exists' : 'Google Drive is ready but folder creation failed')
                : 'Google Drive credentials found but service not initialized')
            : 'Google Drive credentials not configured. Set GOOGLE_PRIVATE_KEY_ID, GOOGLE_PRIVATE_KEY, and GOOGLE_CLIENT_ID environment variables.'
        }
      });
    } catch (error: unknown) {
      console.error('❌ Error checking Google Drive status:', error);
      console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace');
      res.status(500).json({
        success: false,
        message: 'Failed to check Google Drive status',
        error: error instanceof Error ? (error instanceof Error ? error.message : String(error)) : 'Unknown error'
      });
    }
  }

  async connectGoogleDrive(req: Request, res: Response): Promise<void> {
    try {
      if (!this.googleDriveService || typeof this.googleDriveService.isConfigured !== 'function' || !this.googleDriveService.isConfigured()) {
        res.status(400).json({
          success: false,
          message: 'Google Drive service is not configured. Please set GOOGLE_PRIVATE_KEY_ID, GOOGLE_PRIVATE_KEY, and GOOGLE_CLIENT_ID environment variables.'
        });
        return;
      }
      // Check if Google Drive service account is configured
      const hasGoogleCredentials = !!(
        process.env.GOOGLE_PRIVATE_KEY_ID &&
        process.env.GOOGLE_PRIVATE_KEY &&
        process.env.GOOGLE_CLIENT_ID
      );
      
      if (hasGoogleCredentials && this.googleDriveService) {
        // Test Google Drive connection and ensure folder exists
        try {
          // Ensure the AestheticRxNetwork_Exports folder exists
          await this.googleDriveService.ensureFolderExists('AestheticRxNetwork_Exports');
          const folderContents = await this.googleDriveService.getFolderContents('AestheticRxNetwork_Exports');
          
          res.json({
            success: true,
            message: 'Google Drive integration is configured and working perfectly!',
            data: {
              configured: true,
              method: 'google-drive',
              serviceAccount: 'q-service-account@aestheticrx.iam.gserviceaccount.com',
              connectionTest: 'passed',
              existingFiles: folderContents.length
            }
          });
        } catch (driveError) {
          console.error('Google Drive connection test failed:', driveError);
          res.json({
            success: false,
            message: 'Google Drive credentials configured but connection test failed',
            data: {
              configured: true,
              method: 'google-drive',
              serviceAccount: 'q-service-account@aestheticrx.iam.gserviceaccount.com',
              connectionTest: 'failed',
              error: driveError instanceof Error ? driveError.message : 'Unknown error'
            }
          });
        }
      } else {
        res.json({
          success: false,
          message: 'Google Drive service account not configured. Please set GOOGLE_PRIVATE_KEY_ID, GOOGLE_PRIVATE_KEY, and GOOGLE_CLIENT_ID environment variables.',
          data: {
            configured: false,
            method: 'google-drive'
          }
        });
      }
    } catch (error: unknown) {
      console.error('Error checking Google Drive connection:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to check Google Drive connection',
        error: error instanceof Error ? (error instanceof Error ? error.message : String(error)) : 'Unknown error'
      });
    }
  }

  async testGmailConnection(req: Request, res: Response) {
    try {
      console.log('🧪 Testing Gmail connection...');
      
      // Use gmailService for sending emails (Gmail API with SMTP fallback)
      const gmailService = (await import('../services/gmailService')).default;
      const adminEmail = process.env.GMAIL_USER || 'asadkhanbloch4949@gmail.com';
      
      const htmlContent = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #2563eb;">🧪 Gmail Integration Test</h2>
          <p>Hello Admin,</p>
          <p>This is a test email to verify that the Gmail integration for data exports is working correctly.</p>
          
          <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="color: #374151; margin-top: 0;">Test Details:</h3>
            <ul style="color: #6b7280;">
              <li><strong>Test Time:</strong> ${new Date().toLocaleString()}</li>
              <li><strong>Status:</strong> ✅ Gmail connection successful</li>
              <li><strong>Service:</strong> Data Export System</li>
            </ul>
          </div>
          
          <p style="color: #6b7280;">
            If you received this email, the Gmail integration is working perfectly! 
            Your data exports will be automatically sent to this email address.
          </p>
          
          <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
          <p style="color: #9ca3af; font-size: 12px;">
            This is a test message from AestheticRxNetwork Data Export System.
          </p>
        </div>
      `;

      await gmailService.sendEmail(
        adminEmail,
        '🧪 Gmail Integration Test - AestheticRxNetwork Data Export',
        htmlContent,
        { isMarketing: false }
      );
      
      res.json({
        success: true,
        message: 'Gmail test email sent successfully!',
        data: {
          testEmailSent: true,
          recipient: adminEmail,
          timestamp: new Date().toISOString()
        }
      });
      
    } catch (error: unknown) {
      console.error('Gmail test failed:', error);
      res.status(500).json({
        success: false,
        message: 'Gmail test failed',
        error: error instanceof Error ? (error instanceof Error ? error.message : String(error)) : 'Unknown error'
      });
    }
  }

  async getGmailStatusPublic(req: Request, res: Response) {
    try {
      // Check if Gmail App Password is configured for data export
      const hasGmailCredentials = !!(process.env.GMAIL_USER && process.env.GMAIL_APP_PASSWORD);
      
      console.log('📧 Public Gmail status check:', {
        user: process.env.GMAIL_USER,
        hasPassword: !!process.env.GMAIL_APP_PASSWORD,
        connected: hasGmailCredentials
      });
      
      res.json({
        success: true,
        data: {
          connected: hasGmailCredentials,
          configured: hasGmailCredentials,
          method: 'gmail',
          email: process.env.GMAIL_USER
        }
      });
    } catch (error: unknown) {
      console.error('Error checking Gmail status:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to check Gmail status',
        error: error instanceof Error ? (error instanceof Error ? error.message : String(error)) : 'Unknown error'
      });
    }
  }

}
