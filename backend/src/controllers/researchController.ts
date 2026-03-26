import { Request, Response } from 'express';
import { AppDataSource } from '../db/data-source';
import { ResearchPaper } from '../models/ResearchPaper';
import { ResearchPaperView } from '../models/ResearchPaperView';
import { ResearchPaperUpvote } from '../models/ResearchPaperUpvote';
import { ResearchBenefit } from '../models/ResearchBenefit';
import { ResearchReport } from '../models/ResearchReport';
import { ResearchSettings } from '../models/ResearchSettings';
import { TierConfig } from '../models/TierConfig';
import { Doctor } from '../models/Doctor';
import { ResearchRewardEligibility } from '../models/ResearchRewardEligibility';
import { ResearchBenefitConfig } from '../models/ResearchBenefitConfig';
import { AuthenticatedRequest } from '../types/auth';
import gmailService from '../services/gmailService';
import { getFrontendUrlWithPath } from '../config/urlConfig';
import multer from 'multer';
import path from 'path';
import fs from 'fs';

/**
 * Get top research papers with weighted scoring (public)
 */
export const getTopResearchPapers = async (req: Request, res: Response): Promise<void> => {
  try {
    const { limit = 5 } = req.query;
    const researchRepository = AppDataSource.getRepository(ResearchPaper);
    
    // Get approved research papers with doctor information
    const papers = await researchRepository
      .createQueryBuilder('paper')
      .leftJoinAndSelect('paper.doctor', 'doctor')
      .where('paper.is_approved = :approved', { approved: true })
      .select([
        'paper.id',
        'paper.title',
        'paper.abstract',
        'paper.view_count',
        'paper.upvote_count',
        'paper.tags',
        'paper.created_at',
        'doctor.doctor_name',
        'doctor.clinic_name'
      ])
      .orderBy('paper.created_at', 'DESC')
      .getMany();

    // Calculate weighted scores (upvotes * 0.6 + views * 0.4)
    const scoredPapers = papers.map(paper => {
      const weightedScore = (paper.upvote_count * 0.6) + (paper.view_count * 0.4);
      return {
        ...paper.toPublicJSON(),
        doctor_name: paper.doctor?.doctor_name || 'Anonymous',
        clinic_name: paper.doctor?.clinic_name || 'Unknown Clinic',
        weighted_score: Math.round(weightedScore * 100) / 100, // Round to 2 decimal places
        rating: Math.min(5.0, Math.max(1.0, 3.0 + (weightedScore / 100))) // Convert to 1-5 rating scale
      };
    });

    // Sort by weighted score and limit results
    const topPapers = scoredPapers
      .sort((a, b) => b.weighted_score - a.weighted_score)
      .slice(0, parseInt(limit as string))
      .map((paper, index) => ({
        ...paper,
        rank: index + 1
      }));

    res.json({
      success: true,
      data: {
        papers: topPapers,
        total: topPapers.length
      }
    });
  } catch (error: unknown) {
    console.error('Get top research papers error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch top research papers'
    });
  }
};

/**
 * Get research papers by user (authenticated)
 */
export const getUserResearchPapers = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const user = req.user;
    if (!user) {
      res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
      return;
    }
    const researchRepository = AppDataSource.getRepository(ResearchPaper);
    
    // Get ALL research papers for the user (both approved and pending)
    const papers = await researchRepository.find({
      where: { doctor_id: user.id },
      order: { created_at: 'DESC' },
      relations: ['doctor']
    });

    const userPapers = papers.map(paper => ({
      ...paper.toJSON(),
      status: paper.is_approved ? 'approved' : 'pending'
    }));

    res.json({
      success: true,
      data: {
        papers: userPapers,
        total: userPapers.length
      }
    });
  } catch (error: unknown) {
    console.error('Get user research papers error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch user research papers'
    });
  }
};

/**
 * Get all approved research papers (public)
 */
export const getResearchPapers = async (req: Request, res: Response): Promise<void> => {
  try {
    const { page = 1, limit = 20, search, tag } = req.query;

    const researchRepository = AppDataSource.getRepository(ResearchPaper);
    const queryBuilder = researchRepository.createQueryBuilder('research')
      .leftJoinAndSelect('research.doctor', 'doctor')
      .where('research.is_approved = :approved', { approved: true });

    // Apply search filter
    if (search) {
      queryBuilder.andWhere(
        '(LOWER(research.title) LIKE LOWER(:search) OR LOWER(research.abstract) LIKE LOWER(:search))',
        { search: `%${search}%` }
      );
    }

    // Apply tag filter
    if (tag) {
      queryBuilder.andWhere(':tag = ANY(research.tags)', { tag });
    }

    // Order by upvote count and creation date
    queryBuilder.orderBy('research.upvote_count', 'DESC')
      .addOrderBy('research.created_at', 'DESC');

    // Pagination
    const skip = (Number(page) - 1) * Number(limit);
    queryBuilder.skip(skip).take(Number(limit));

    const [papers, total] = await queryBuilder.getManyAndCount();

    res.json({
      success: true,
      data: {
        papers: papers.map(paper => paper.toPublicJSON()),
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total,
          pages: Math.ceil(total / Number(limit))
        }
      }
    });
  } catch (error: unknown) {
    console.error('Get research papers error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch research papers'
    });
  }
};

/**
 * Create research paper (authenticated users)
 */
export const createResearchPaper = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const user = req.user!;
    
    // Prevent regular users and employees from creating research papers
    if (user.user_type !== 'doctor') {
      res.status(403).json({
        success: false,
        message: 'Only doctors can create research papers'
      });
      return;
    }
    
    const { id: originalId, title, abstract, content, tags, citations, makePublic } = req.body;
    let id = originalId; // Make id mutable for updates

    // Debug logging
    console.log('Research paper submission:', { id, title, makePublic, makePublicType: typeof makePublic });

    // Validate required fields
    if (!title || !abstract || !content) {
      res.status(400).json({
        success: false,
        message: 'Title, abstract, and content are required'
      });
      return;
    }

    const researchRepository = AppDataSource.getRepository(ResearchPaper);
    const settingsRepository = AppDataSource.getRepository(ResearchSettings);

    // Check if this is an update to an existing paper or a new paper
    // First check if ID is a valid UUID format
    const hasValidUUID = id && id !== null && id !== undefined && 
                         typeof id === 'string' && 
                         /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
    
    // IMPORTANT: Only treat as update if there's a valid UUID AND the paper exists
    // Don't auto-detect updates by title - this causes limit bypass issues
    let isUpdate = false;
    let existingPaperForUpdate = null;
    
    if (hasValidUUID) {
      // Check if the paper with this ID exists and belongs to this user
      existingPaperForUpdate = await researchRepository.findOne({
        where: {
          id: id,
          doctor_id: user.id
        }
      });
      
      if (existingPaperForUpdate) {
        // This is a legitimate update to an existing paper
        isUpdate = true;
        console.log('Update detected for existing paper:', { paperId: id, title });
      } else {
        // UUID provided but paper doesn't exist or doesn't belong to user - treat as new
        console.log('UUID provided but paper not found or not owned by user - treating as new submission');
        isUpdate = false;
      }
    }
    
    // Check monthly submission limit for NEW papers only (not updates)
    // This limit applies to ALL submissions (both published and draft)
    console.log('Paper operation type:', { isUpdate, hasValidUUID, title, makePublic, isNewSubmission: !isUpdate });
    const isPublishing = makePublic === 'on' || makePublic === true || makePublic === 'true';
    
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    // ALWAYS check limit for NEW papers (not updates to existing papers)
    // This ensures the limit is enforced even if title matching logic was used
    if (!isUpdate) {
      // Get the monthly submission limit from settings
      const monthlyLimitSetting = await settingsRepository.findOne({
        where: { setting_key: 'monthly_paper_limit' }
      });
      
      // Also check for backward compatibility
      const monthlySubmissionLimitSetting = monthlyLimitSetting || await settingsRepository.findOne({
        where: { setting_key: 'monthly_submission_limit' }
      });
      
      const monthlyLimit = monthlyLimitSetting 
        ? parseInt(monthlyLimitSetting.setting_value) 
        : (monthlySubmissionLimitSetting ? parseInt(monthlySubmissionLimitSetting.setting_value) : 3);
      
      // Count ALL papers (both published and draft) created this month by this doctor
      const papersThisMonth = await researchRepository
        .createQueryBuilder('research')
        .where('research.doctor_id = :doctorId', { doctorId: user.id })
        .andWhere('research.created_at >= :startOfMonth', { startOfMonth })
        .getCount();
      
      console.log('Monthly submission limit check:', { 
        papersThisMonth, 
        monthlyLimit, 
        isPublishing, 
        isUpdate,
        doctorId: user.id 
      });
      
      if (papersThisMonth >= monthlyLimit) {
        res.status(400).json({
          success: false,
          message: `You have reached the monthly submission limit of ${monthlyLimit} research papers. You can continue editing and improving your existing research papers. Please wait until next month to submit new papers.`
        });
        return;
      }
    }

    let paper: ResearchPaper;
    
    if (isUpdate && existingPaperForUpdate) {
      // Update existing paper (we already found it above)
      paper = existingPaperForUpdate;
      paper.title = title;
      paper.abstract = abstract;
      paper.content = content;
      paper.tags = tags ? tags.split(',').map((tag: string) => tag.trim()) : [];
      paper.citations = citations ? JSON.parse(citations) : [];
      paper.updated_at = new Date();
    } else {
      // Create new research paper
      paper = new ResearchPaper();
      paper.doctor_id = user.id;
      paper.title = title;
      paper.abstract = abstract;
      paper.content = content;
      paper.tags = tags ? tags.split(',').map((tag: string) => tag.trim()) : [];
      paper.citations = citations ? JSON.parse(citations) : [];
    }
    
    // Handle makePublic checkbox - if checked, it will be 'on', if unchecked, it will be undefined
    paper.is_approved = makePublic === 'on' || makePublic === 'true' || makePublic === true;
    
    // Set approved_at if making public
    if (paper.is_approved) {
      paper.approved_at = new Date();
    }

    // Handle PDF file if uploaded
    if (req.file) {
      const pdfDir = path.join(__dirname, '..', '..', 'uploads', 'research');
      if (!fs.existsSync(pdfDir)) {
        fs.mkdirSync(pdfDir, { recursive: true });
      }

      const fileName = `research-${Date.now()}-${req.file.originalname}`;
      const filePath = path.join(pdfDir, fileName);
      
      fs.writeFileSync(filePath, req.file.buffer);
      
      paper.pdf_file_url = `/uploads/research/${fileName}`;
      paper.pdf_file_name = req.file.originalname;
    }

    await researchRepository.save(paper);

    res.json({
      success: true,
      message: isUpdate 
        ? (makePublic ? 'Research paper updated and published successfully' : 'Research paper updated successfully')
        : (makePublic ? 'Research paper created and published successfully' : 'Research paper created successfully'),
      data: {
        paper: paper.toJSON()
      }
    });
  } catch (error: unknown) {
    console.error('Create research paper error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create research paper'
    });
  }
};

/**
 * Get research paper by ID (public - only approved papers)
 */
export const getResearchPaperById = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const researchRepository = AppDataSource.getRepository(ResearchPaper);
    const paper = await researchRepository.findOne({
      where: { id, is_approved: true },
      relations: ['doctor']
    });

    if (!paper) {
      res.status(404).json({
        success: false,
        message: 'Research paper not found'
      });
      return;
    }

    res.json({
      success: true,
      data: {
        paper: paper.toPublicJSON()
      }
    });
  } catch (error: unknown) {
    console.error('Get research paper error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch research paper'
    });
  }
};

/**
 * Get research paper by ID (authenticated - allows users to view their own papers even if not approved)
 */
export const getUserResearchPaperById = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const user = req.user!;
    const { id } = req.params;

    const researchRepository = AppDataSource.getRepository(ResearchPaper);
    
    // First try to get the paper
    const paper = await researchRepository.findOne({
      where: { id },
      relations: ['doctor']
    });

    if (!paper) {
      res.status(404).json({
        success: false,
        message: 'Research paper not found'
      });
      return;
    }

    // Allow access if:
    // 1. Paper is approved (public access)
    // 2. User is the owner of the paper (can view their own papers even if pending)
    // 3. User is an admin
    const isOwner = paper.doctor_id === user.id;
    const isAdmin = user.is_admin;
    const isApproved = paper.is_approved;

    if (!isApproved && !isOwner && !isAdmin) {
      res.status(403).json({
        success: false,
        message: 'Access denied. This research paper is pending approval and you are not the owner.'
      });
      return;
    }

    res.json({
      success: true,
      data: {
        paper: paper.toPublicJSON()
      }
    });
  } catch (error: unknown) {
    console.error('Get user research paper error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch research paper'
    });
  }
};

/**
 * Track research paper view
 */
export const trackResearchPaperView = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const researchRepository = AppDataSource.getRepository(ResearchPaper);
    const viewRepository = AppDataSource.getRepository(ResearchPaperView);

    // Check if paper exists and is approved
    const paper = await researchRepository.findOne({
      where: { id, is_approved: true }
    });

    if (!paper) {
      res.status(404).json({
        success: false,
        message: 'Research paper not found'
      });
      return;
    }

    // Create new view record (allow multiple views, track by IP if no user)
    const view = new ResearchPaperView();
    view.research_paper_id = id as string;
    view.doctor_id = null as any; // No user authentication required
    view.ip_address = req.ip || 'unknown';
    view.user_agent = req.get('User-Agent') || '';

    await viewRepository.save(view);

    // Increment view count
    paper.incrementViewCount();
    await researchRepository.save(paper);

    res.json({
      success: true,
      message: 'View tracked successfully',
      data: {
        view_count: paper.view_count
      }
    });
  } catch (error: unknown) {
    console.error('Track research paper view error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to track view'
    });
  }
};

/**
 * Upvote research paper
 */
export const upvoteResearchPaper = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const user = req.user!;
    
    // Prevent regular users and employees from upvoting research papers
    if (user.user_type !== 'doctor') {
      res.status(403).json({
        success: false,
        message: 'Only doctors can upvote research papers'
      });
      return;
    }

    const researchRepository = AppDataSource.getRepository(ResearchPaper);
    const upvoteRepository = AppDataSource.getRepository(ResearchPaperUpvote);
    const settingsRepository = AppDataSource.getRepository(ResearchSettings);
    const tierRepository = AppDataSource.getRepository(TierConfig);

    // Check minimum tier requirement from settings
    const minimumTierSetting = await settingsRepository.findOne({ 
      where: { setting_key: 'minimum_tier_for_approval' } 
    });
    
    const requiredTierName = minimumTierSetting ? minimumTierSetting.setting_value : 'Lead Contributor';
    
    // Fetch tier configurations from database (ordered by display_order)
    const tierConfigs = await tierRepository.find({
      where: { is_active: true },
      order: { display_order: 'ASC' }
    });
    
    if (tierConfigs.length === 0) {
      console.error('❌ No tier configurations found in database');
      res.status(500).json({
        success: false,
        message: 'Tier configurations not found. Please contact administrator.'
      });
      return;
    }
    
    // Find user's tier and required tier in the database
    const userTierName = user.tier || 'Lead Starter';
    const userTierConfig = tierConfigs.find(tier => tier.name === userTierName);
    const requiredTierConfig = tierConfigs.find(tier => tier.name === requiredTierName);
    
    if (!userTierConfig) {
      console.error(`❌ User tier "${userTierName}" not found in tier configurations`);
      res.status(500).json({
        success: false,
        message: `Your tier "${userTierName}" is not recognized. Please contact administrator.`
      });
      return;
    }
    
    if (!requiredTierConfig) {
      console.error(`❌ Required tier "${requiredTierName}" not found in tier configurations`);
      res.status(500).json({
        success: false,
        message: `Required tier "${requiredTierName}" is not recognized. Please contact administrator.`
      });
      return;
    }
    
    // Compare display_order to determine if user has sufficient tier
    // Higher display_order = higher tier
    if (userTierConfig.display_order < requiredTierConfig.display_order) {
      res.status(403).json({
        success: false,
        message: `You need to reach ${requiredTierName} rank or higher to approve research papers. Your current rank: ${userTierName}`
      });
      return;
    }

    // Check if paper exists and is approved
    const paper = await researchRepository.findOne({
      where: { id, is_approved: true }
    });

    if (!paper) {
      res.status(404).json({
        success: false,
        message: 'Research paper not found'
      });
      return;
    }

    // Check if user has already upvoted this paper
    const existingUpvote = await upvoteRepository.findOne({
      where: {
        research_paper_id: id,
        doctor_id: user.id
      }
    });

    if (existingUpvote) {
      res.status(400).json({
        success: false,
        message: 'You have already upvoted this research paper'
      });
      return;
    }

    // Create new upvote record
    const upvote = new ResearchPaperUpvote();
    upvote.research_paper_id = id;
    upvote.doctor_id = user.id;
    upvote.ip_address = (req.ip || null) as any;
    upvote.user_agent = req.get('User-Agent') || '';

    await upvoteRepository.save(upvote);

    // Increment upvote count
    paper.incrementUpvoteCount();
    await researchRepository.save(paper);

    // Check for research benefits based on approval count
    await checkAndAwardResearchBenefits(paper);

    // Check eligibility for awards and send notifications
    await checkAndCreateEligibilityWithNotification(paper);

    res.json({
      success: true,
      message: 'Research paper upvoted successfully',
      data: {
        upvote_count: paper.upvote_count
      }
    });
  } catch (error: unknown) {
    console.error('Upvote research paper error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to upvote research paper'
    });
  }
};

/**
 * Remove upvote from research paper
 */
export const removeUpvote = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const user = req.user!;
    
    // Prevent regular users and employees from removing upvotes
    if (user.user_type !== 'doctor') {
      res.status(403).json({
        success: false,
        message: 'Only doctors can remove upvotes'
      });
      return;
    }

    const researchRepository = AppDataSource.getRepository(ResearchPaper);
    const upvoteRepository = AppDataSource.getRepository(ResearchPaperUpvote);

    // Check if paper exists and is approved
    const paper = await researchRepository.findOne({
      where: { id, is_approved: true }
    });

    if (!paper) {
      res.status(404).json({
        success: false,
        message: 'Research paper not found'
      });
      return;
    }

    // Find existing upvote
    const existingUpvote = await upvoteRepository.findOne({
      where: {
        research_paper_id: id,
        doctor_id: user.id
      }
    });

    if (!existingUpvote) {
      res.status(400).json({
        success: false,
        message: 'You have not upvoted this research paper'
      });
      return;
    }

    // Remove upvote record
    await upvoteRepository.remove(existingUpvote);

    // Decrement upvote count
    paper.upvote_count = Math.max(0, paper.upvote_count - 1);
    await researchRepository.save(paper);

    res.json({
      success: true,
      message: 'Upvote removed successfully',
      data: {
        upvote_count: paper.upvote_count
      }
    });
  } catch (error: unknown) {
    console.error('Remove upvote error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to remove upvote'
    });
  }
};

/**
 * Get research paper views and upvotes (admin only)
 */
export const getResearchPaperAnalytics = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const user = req.user!;
    if (!user.is_admin) {
      res.status(403).json({
        success: false,
        message: 'Admin access required'
      });
      return;
    }

    const { id } = req.params;

    const researchRepository = AppDataSource.getRepository(ResearchPaper);
    const viewRepository = AppDataSource.getRepository(ResearchPaperView);
    const upvoteRepository = AppDataSource.getRepository(ResearchPaperUpvote);

    // Get paper
    const paper = await researchRepository.findOne({
      where: { id },
      relations: ['doctor']
    });

    if (!paper) {
      res.status(404).json({
        success: false,
        message: 'Research paper not found'
      });
      return;
    }

    // Get views with doctor information
    const views = await viewRepository.find({
      where: { research_paper_id: id },
      relations: ['doctor'],
      order: { created_at: 'DESC' }
    });

    // Get upvotes with doctor information
    const upvotes = await upvoteRepository.find({
      where: { research_paper_id: id },
      relations: ['doctor'],
      order: { created_at: 'DESC' }
    });

    res.json({
      success: true,
      data: {
        paper: paper.toAdminJSON(),
        views: views.map(view => ({
          ...view.toPublicJSON(),
          doctor: view.doctor?.toPublicJSON()
        })),
        upvotes: upvotes.map(upvote => ({
          ...upvote.toPublicJSON(),
          doctor: upvote.doctor?.toPublicJSON()
        })),
        analytics: {
          total_views: views.length,
          total_upvotes: upvotes.length,
          unique_viewers: new Set(views.map(v => v.doctor_id)).size,
          unique_upvoters: new Set(upvotes.map(u => u.doctor_id)).size
        }
      }
    });
  } catch (error: unknown) {
    console.error('Get research paper analytics error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch research paper analytics'
    });
  }
};

/**
 * Check eligibility and create reward eligibility records, then send Gmail notifications
 */
const checkAndCreateEligibilityWithNotification = async (paper: ResearchPaper): Promise<void> => {
  try {
    const eligibilityRepository = AppDataSource.getRepository(ResearchRewardEligibility);
    const benefitConfigRepository = AppDataSource.getRepository(ResearchBenefitConfig);
    const doctorRepository = AppDataSource.getRepository(Doctor);

    // Only check eligibility for approved papers
    if (!paper.is_approved) {
      return;
    }

    // Get the doctor who wrote this research paper
    const doctor = await doctorRepository.findOne({ where: { id: paper.doctor_id } });
    if (!doctor) {
      console.error('Doctor not found for research paper:', paper.id);
      return;
    }

    // Get all active benefit configurations, sorted by threshold (highest first)
    const benefitConfigs = await benefitConfigRepository.find({
      where: { is_active: true },
      order: { approval_threshold: 'DESC' } // Highest threshold first
    });

    if (benefitConfigs.length === 0) {
      console.log(`⚠️ No active benefit configs to check for paper ${paper.id}`);
      return;
    }

    // Check eligibility based on THIS PAPER's upvote_count and view_count (not total)
    const paperUpvoteCount = paper.upvote_count || 0;
    const paperViewCount = paper.view_count || 0;
    
    console.log(`🔍 Checking eligibility for paper: "${paper.title}" (ID: ${paper.id})`);
    console.log(`   Paper upvotes: ${paperUpvoteCount}, views: ${paperViewCount}`);
    console.log(`   Doctor: ${doctor.doctor_name} (ID: ${doctor.id})`);

    // Find all configs this paper qualifies for
    const qualifyingConfigs = [];
    for (const config of benefitConfigs) {
      const meetsApprovalThreshold = paperUpvoteCount >= config.approval_threshold && 
        (config.approval_threshold_max ? paperUpvoteCount <= config.approval_threshold_max : true);
      
      const meetsViewThreshold = config.view_threshold 
        ? paperViewCount >= config.view_threshold 
        : true;
      
      if (meetsApprovalThreshold && meetsViewThreshold) {
        // Check anti-gaming: cooldown and max awards for this specific config
        const deliveredEligibilities = await eligibilityRepository.find({
          where: {
            doctor_id: doctor.id,
            benefit_config_id: config.id,
            status: 'delivered'
          },
          order: { delivered_at: 'DESC' }
        });

        // Check max_awards_per_doctor limit
        if (deliveredEligibilities.length >= config.max_awards_per_doctor) {
          console.log(`   ⚠️ Skipping ${config.title}: Doctor has already received this award ${deliveredEligibilities.length} time(s) (max: ${config.max_awards_per_doctor})`);
          continue;
        }

        // Check cooldown_days - enforce cooldown to prevent gaming
        if (config.cooldown_days > 0 && deliveredEligibilities.length > 0) {
          const lastDelivery = deliveredEligibilities[0]?.delivered_at;
          if (lastDelivery) {
            const daysSinceLastDelivery = Math.floor(
              (Date.now() - new Date(lastDelivery).getTime()) / (1000 * 60 * 60 * 24)
            );
            
            if (daysSinceLastDelivery < config.cooldown_days) {
              const remainingDays = config.cooldown_days - daysSinceLastDelivery;
              console.log(`   ⚠️ Skipping ${config.title}: Doctor is in cooldown period (${remainingDays} day(s) remaining)`);
              continue;
            }
          }
        }

        qualifyingConfigs.push(config);
      }
    }

    if (qualifyingConfigs.length === 0) {
      console.log(`   No qualifying configs for this paper`);
      return;
    }

    // Keep only the HIGHEST threshold reward (first one since sorted DESC)
    const highestConfig = qualifyingConfigs[0];
    console.log(`   ✅ Paper qualifies for ${qualifyingConfigs.length} reward(s), keeping highest: ${highestConfig.title} (threshold: ${highestConfig.approval_threshold})`);

    // Remove all lower-tier eligibilities for this paper (if any exist)
    const existingEligibilitiesForPaper = await eligibilityRepository.find({
      where: {
        research_paper_id: paper.id,
        status: 'eligible' // Only remove pending ones, not delivered
      }
    });

    // Remove lower-tier eligibilities (those with lower thresholds than the highest)
    for (const existingEligibility of existingEligibilitiesForPaper) {
      if (existingEligibility.benefit_config_id !== highestConfig.id) {
        // Get the config to compare thresholds
        const existingConfig = benefitConfigs.find(c => c.id === existingEligibility.benefit_config_id);
        if (existingConfig && existingConfig.approval_threshold < highestConfig.approval_threshold) {
          console.log(`   🗑️ Removing lower-tier eligibility: ${existingConfig.title} (threshold: ${existingConfig.approval_threshold})`);
          await eligibilityRepository.remove(existingEligibility);
        }
      }
    }

    // Check if highest eligibility already exists for this paper
    const existingHighestEligibility = await eligibilityRepository.findOne({
      where: {
        research_paper_id: paper.id,
        benefit_config_id: highestConfig.id
      }
    });

    if (!existingHighestEligibility) {
      // Create new eligibility record for the highest reward
      const newEligibility = eligibilityRepository.create({
        doctor_id: doctor.id,
        benefit_config_id: highestConfig.id,
        research_paper_id: paper.id,
        approval_count: paperUpvoteCount,
        is_eligible: true,
        status: 'eligible'
      });
      await eligibilityRepository.save(newEligibility);
      
      console.log(`✅ Created eligibility for paper "${paper.title}" - Award: ${highestConfig.title}, Upvotes: ${paperUpvoteCount}`);

      // Send congratulatory Gmail notification
      try {
        const emailSubject = `🎉 Congratulations! Your Research Paper Earned an Award - ${highestConfig.title}`;
        const emailContent = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <h2 style="color: #2563eb;">🎉 Congratulations, Dr. ${doctor.doctor_name}!</h2>
            
            <p>We're thrilled to inform you that your research paper has reached a significant milestone!</p>
            
            <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid ${highestConfig.display_color || '#4F46E5'};">
              <h3 style="color: #374151; margin-top: 0;">🏆 Award Eligibility</h3>
              <p style="margin: 10px 0;"><strong>Research Paper:</strong> ${paper.title}</p>
              <p style="margin: 10px 0;"><strong>Award:</strong> ${highestConfig.title}</p>
              <p style="margin: 10px 0;"><strong>Description:</strong> ${highestConfig.description || 'Research milestone achievement'}</p>
              <p style="margin: 10px 0;"><strong>Paper Upvotes:</strong> ${paperUpvoteCount}</p>
              <p style="margin: 10px 0;"><strong>Required Threshold:</strong> ${highestConfig.approval_threshold}${highestConfig.approval_threshold_max ? ` - ${highestConfig.approval_threshold_max}` : '+'} upvotes</p>
            </div>

            <p>Your research paper "<strong>${paper.title}</strong>" has earned this award! Your dedication to advancing medical research is truly commendable!</p>

            <div style="background-color: #eff6ff; padding: 15px; border-radius: 8px; margin: 20px 0;">
              <p style="margin: 0; color: #1e40af;"><strong>Next Steps:</strong></p>
              <p style="margin: 10px 0 0 0; color: #1e40af;">Your award eligibility has been recorded in the system. You can view your awards and benefits in the Research Management section.</p>
            </div>

            <div style="text-align: center; margin: 30px 0;">
              <a href="${getFrontendUrlWithPath('/research')}" 
                 style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block;">
                View Research Papers
              </a>
            </div>

            <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; color: #666; font-size: 12px;">
              <p>This is an automated message from AestheticRxNetwork Research Management System.</p>
              <p>Keep up the excellent work in advancing medical research!</p>
            </div>
          </div>
        `;

        await gmailService.sendEmail(doctor.email, emailSubject, emailContent, {
          isMarketing: true,
          userId: doctor.id
        });

        console.log(`✅ Eligibility notification sent to ${doctor.email} for award: ${highestConfig.title}`);
      } catch (emailError) {
        console.error(`❌ Failed to send eligibility notification to ${doctor.email}:`, emailError);
      }
    } else {
      // Update existing eligibility with new upvote count
      if (existingHighestEligibility.approval_count !== paperUpvoteCount) {
        existingHighestEligibility.approval_count = paperUpvoteCount;
        await eligibilityRepository.save(existingHighestEligibility);
        console.log(`📝 Updated eligibility for paper "${paper.title}" - Award: ${highestConfig.title}, Upvotes: ${paperUpvoteCount}`);
      }
    }
  } catch (error: unknown) {
    console.error('Error checking and creating eligibility:', error);
    // Don't throw - this shouldn't break the upvote process
  }
};

/**
 * Check and award research benefits based on approval count
 */
const checkAndAwardResearchBenefits = async (paper: ResearchPaper): Promise<void> => {
  try {
    const benefitRepository = AppDataSource.getRepository(ResearchBenefit);
    const doctorRepository = AppDataSource.getRepository(Doctor);
    
    const approvalCount = paper.upvote_count;
    
    // Check if benefits already awarded for this milestone
    const existingBenefits = await benefitRepository.find({
      where: { research_paper_id: paper.id }
    });
    
    const existingMilestones = existingBenefits.map(b => b.benefit_type);
    
    // Award benefits based on approval milestones
    if (approvalCount >= 20 && !existingMilestones.includes('gift')) {
      const giftBenefit = new ResearchBenefit();
      giftBenefit.doctor_id = paper.doctor_id;
      giftBenefit.research_paper_id = paper.id;
      giftBenefit.benefit_type = 'gift';
      giftBenefit.benefit_value = 1;
      giftBenefit.gift_description = 'Monthly company gift for reaching 20 approvals';
      await benefitRepository.save(giftBenefit);
    }
    
    if (approvalCount >= 50 && !existingMilestones.includes('tier_progress')) {
      const tierBenefit = new ResearchBenefit();
      tierBenefit.doctor_id = paper.doctor_id;
      tierBenefit.research_paper_id = paper.id;
      tierBenefit.benefit_type = 'tier_progress';
      tierBenefit.benefit_value = 5; // 5% progress
      await benefitRepository.save(tierBenefit);
      
      // Apply tier progress to doctor
      const doctor = await doctorRepository.findOne({ where: { id: paper.doctor_id } });
      if (doctor) {
        doctor.tier_progress = Math.min(100, parseFloat(String(doctor.tier_progress || 0)) + 5);
        await doctorRepository.save(doctor);
      }
    }
    
    if (approvalCount >= 80 && approvalCount < 100 && !existingMilestones.includes('tier_progress_10' as any)) {
      const tierBenefit = new ResearchBenefit();
      tierBenefit.doctor_id = paper.doctor_id;
      tierBenefit.research_paper_id = paper.id;
      tierBenefit.benefit_type = 'tier_progress';
      tierBenefit.benefit_value = 10; // 10% progress
      await benefitRepository.save(tierBenefit);
      
      // Apply tier progress to doctor
      const doctor = await doctorRepository.findOne({ where: { id: paper.doctor_id } });
      if (doctor) {
        doctor.tier_progress = Math.min(100, parseFloat(String(doctor.tier_progress || 0)) + 10);
        await doctorRepository.save(doctor);
      }
    }
    
    // Bonus approvals feature has been removed
  } catch (error: unknown) {
    console.error('Error awarding research benefits:', error);
  }
};

/**
 * Report research paper
 */
export const reportResearchPaper = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { report_type, description } = req.body;
    const user = req.user!;

    const researchRepository = AppDataSource.getRepository(ResearchPaper);
    const reportRepository = AppDataSource.getRepository(ResearchReport);

    // Check if paper exists
    const paper = await researchRepository.findOne({
      where: { id, is_approved: true }
    });

    if (!paper) {
      res.status(404).json({
        success: false,
        message: 'Research paper not found'
      });
      return;
    }

    // Check if user already reported this paper
    const existingReport = await reportRepository.findOne({
      where: {
        research_paper_id: id,
        reporter_id: user.id
      }
    });

    if (existingReport) {
      res.status(400).json({
        success: false,
        message: 'You have already reported this research paper'
      });
      return;
    }

    // Create new report
    const report = new ResearchReport();
    report.research_paper_id = id;
    report.reporter_id = user.id;
    report.report_type = report_type;
    report.description = description;
    report.ip_address = req.ip || 'unknown';
    report.user_agent = req.get('User-Agent') || '';

    await reportRepository.save(report);

    // TODO: Send email notification to admins
    // await sendReportNotificationToAdmins(report, paper);

    res.json({
      success: true,
      message: 'Research paper reported successfully. Our team will review it.',
      data: {
        report_id: report.id
      }
    });
  } catch (error: unknown) {
    console.error('Report research paper error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to report research paper'
    });
  }
};

/**
 * Download research paper PDF
 */
export const downloadResearchPaperPDF = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    
    // Get the research paper
    const researchRepository = AppDataSource.getRepository(ResearchPaper);
    const paper = await researchRepository.findOne({
      where: { id },
      relations: ['doctor']
    });

    if (!paper) {
      res.status(404).json({
        success: false,
        message: 'Research paper not found'
      });
      return;
    }

    if (!paper.pdf_file_url) {
      res.status(404).json({
        success: false,
        message: 'PDF file not available for this research paper'
      });
      return;
    }

    // Construct the full file path
    const filePath = path.join(__dirname, '..', '..', paper.pdf_file_url);
    
    // Check if file exists
    if (!fs.existsSync(filePath)) {
      res.status(404).json({
        success: false,
        message: 'PDF file not found on server'
      });
      return;
    }

    // Get file stats
    const stats = fs.statSync(filePath);
    const fileName = paper.pdf_file_name || `${paper.title.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`;

    // Set headers for file download
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    res.setHeader('Content-Length', stats.size);
    res.setHeader('Cache-Control', 'no-cache');

    // Stream the file
    const fileStream = fs.createReadStream(filePath);
    fileStream.pipe(res);

    fileStream.on('error', (err) => {
      console.error('Error streaming PDF file:', err);
      if (!res.headersSent) {
        res.status(500).json({
          success: false,
          message: 'Error downloading PDF file'
        });
      }
    });

    // Track download (optional - you might want to add download tracking)
    console.log(`PDF downloaded: ${fileName} by IP: ${req.ip}`);

  } catch (error: unknown) {
    console.error('Download PDF error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to download PDF file'
    });
  }
};
