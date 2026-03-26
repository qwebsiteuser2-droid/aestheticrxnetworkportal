import { Request, Response } from 'express';
import { AppDataSource } from '../db/data-source';
import { IsNull } from 'typeorm';
import { ResearchReport } from '../models/ResearchReport';
import { ResearchPaper } from '../models/ResearchPaper';
import { ResearchBenefit } from '../models/ResearchBenefit';
import { ResearchBenefitConfig } from '../models/ResearchBenefitConfig';
import { ResearchRewardEligibility } from '../models/ResearchRewardEligibility';
import { AdminPermission } from '../models/AdminPermission';
import { Doctor, UserType } from '../models/Doctor';
import { Product } from '../models/Product';
import { AllowedSignupId } from '../models/AllowedSignupId';
import { TeamMember } from '../entities/TeamMember';
import { TeamInvitation } from '../entities/TeamInvitation';
import { Order } from '../models/Order';
import { ResearchSettings } from '../models/ResearchSettings';
import { Notification } from '../models/Notification';
import { TierConfig } from '../models/TierConfig';
import { AuthenticatedRequest } from '../types/auth';
import gmailService from '../services/gmailService';
import fs from 'fs';
import path from 'path';
import { PRODUCTS_PICS_DIR } from '../config/uploadConfig';

/**
 * Get all research reports (admin only)
 */
export const getResearchReports = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const reportRepository = AppDataSource.getRepository(ResearchReport);
    const researchRepository = AppDataSource.getRepository(ResearchPaper);
    const doctorRepository = AppDataSource.getRepository(Doctor);

    // Get all reports with related data
    const reports = await reportRepository.find({
      relations: ['research_paper', 'reporter', 'reviewer'],
      order: { created_at: 'DESC' }
    });

    // Get research paper details for each report
    const reportsWithDetails = await Promise.all(
      reports.map(async (report) => {
        const researchPaper = await researchRepository.findOne({
          where: { id: report.research_paper_id },
          relations: ['doctor']
        });

        return {
          ...report.toJSON(),
          research_paper: researchPaper ? researchPaper.toPublicJSON() : null,
          reporter: report.reporter ? report.reporter.toPublicJSON() : null,
          reviewer: report.reviewer ? report.reviewer.toPublicJSON() : null
        };
      })
    );

    res.json({
      success: true,
      data: reportsWithDetails
    });
  } catch (error: unknown) {
    console.error('Get research reports error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch research reports'
    });
  }
};

/**
 * Dismiss a research report (admin only)
 */
export const dismissResearchReport = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { reportId } = req.params;
    const admin = req.user!;

    const reportRepository = AppDataSource.getRepository(ResearchReport);

    const report = await reportRepository.findOne({
      where: { id: reportId }
    });

    if (!report) {
      res.status(404).json({
        success: false,
        message: 'Report not found'
      });
      return;
    }

    // SECURITY: Log report dismissal
    const auditLogger = require('../middleware/auditLog').default;
    auditLogger.log({
      userId: admin.id,
      userEmail: admin.email,
      userType: admin.user_type || 'unknown',
      action: 'DISMISS_RESEARCH_REPORT',
      resource: 'research_report',
      resourceId: reportId,
      ipAddress: auditLogger.getClientIp(req),
      userAgent: req.headers['user-agent'] || 'unknown',
      details: {
        reportId,
        paperId: report.research_paper_id,
        reporterId: report.reporter?.id
      },
      success: true
    });

    // Update report status
    report.status = 'dismissed';
    report.reviewed_by = admin.id;
    report.reviewed_at = new Date();

    await reportRepository.save(report);

    res.json({
      success: true,
      message: 'Report dismissed successfully'
    });
  } catch (error: unknown) {
    console.error('Dismiss research report error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to dismiss report'
    });
  }
};

/**
 * Delete a research report (admin only)
 */
export const deleteResearchReport = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { reportId } = req.params;
    const admin = req.user!;

    const reportRepository = AppDataSource.getRepository(ResearchReport);

    const report = await reportRepository.findOne({
      where: { id: reportId }
    });

    if (!report) {
      res.status(404).json({
        success: false,
        message: 'Report not found'
      });
      return;
    }

    // SECURITY: Log report deletion
    const auditLogger = require('../middleware/auditLog').default;
    auditLogger.log({
      userId: admin.id,
      userEmail: admin.email,
      userType: admin.user_type || 'unknown',
      action: 'DELETE_RESEARCH_REPORT',
      resource: 'research_report',
      resourceId: reportId,
      ipAddress: auditLogger.getClientIp(req),
      userAgent: req.headers['user-agent'] || 'unknown',
      details: {
        reportId,
        paperId: report.research_paper_id,
        reporterId: report.reporter?.id
      },
      success: true
    });

    // Delete the report
    await reportRepository.remove(report);

    res.json({
      success: true,
      message: 'Report deleted successfully'
    });
  } catch (error: unknown) {
    console.error('Delete research report error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete report'
    });
  }
};

/**
 * Remove a research paper due to violations (admin only)
 * Also recalculates approval counts for all remaining papers
 */
export const removeResearchPaper = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const queryRunner = AppDataSource.createQueryRunner();
  await queryRunner.connect();
  await queryRunner.startTransaction();

  try {
    const { paperId } = req.params;
    const { reason } = req.body;
    const admin = req.user!;

    const researchRepository = queryRunner.manager.getRepository(ResearchPaper);
    const reportRepository = queryRunner.manager.getRepository(ResearchReport);

    // Find the paper first
    const paper = await researchRepository.findOne({
      where: { id: paperId },
      relations: ['doctor']
    });

    if (!paper) {
      await queryRunner.rollbackTransaction();
      res.status(404).json({
        success: false,
        message: 'Research paper not found'
      });
      return;
    }

    console.log(`Starting deletion process for paper ${paperId}: "${paper.title}"`);
    console.log(`Paper has ${paper.upvote_count} approvals and ${paper.view_count} views`);

    // CRITICAL: Delete all related data FIRST before deleting the paper
    // ResearchReport and ResearchBenefit don't have CASCADE, so we MUST delete them explicitly
    // Order matters: Delete in reverse dependency order
    
    const { ResearchBenefit } = await import('../models/ResearchBenefit');
    const { ResearchPaperView } = await import('../models/ResearchPaperView');
    const { ResearchPaperUpvote } = await import('../models/ResearchPaperUpvote');
    
    const benefitRepository = queryRunner.manager.getRepository(ResearchBenefit);
    const viewRepository = queryRunner.manager.getRepository(ResearchPaperView);
    const upvoteRepository = queryRunner.manager.getRepository(ResearchPaperUpvote);
    
    // Step 1: Delete all related reports (NO CASCADE - must delete explicitly)
    try {
      const deleteReportsResult = await reportRepository.delete({ research_paper_id: paperId });
      console.log(`✓ Deleted ${deleteReportsResult.affected || 0} reports for paper ${paperId}`);
    } catch (reportError) {
      console.error('✗ CRITICAL: Error deleting reports:', reportError);
      console.error('Report error details:', reportError instanceof Error ? reportError.message : String(reportError));
      await queryRunner.rollbackTransaction();
      throw new Error(`Failed to delete reports for paper ${paperId}: ${reportError instanceof Error ? reportError.message : String(reportError)}`);
    }
    
    // Step 2: Delete all related benefits (NO CASCADE - must delete explicitly)
    try {
      // First, check if there are any benefits
      const benefitCount = await benefitRepository.count({ where: { research_paper_id: paperId } });
      console.log(`Found ${benefitCount} benefits for paper ${paperId}`);
      
      const benefitResult = await benefitRepository.delete({ research_paper_id: paperId });
      console.log(`✓ Deleted ${benefitResult.affected || 0} benefits for paper ${paperId}`);
      
      if (benefitCount > 0 && benefitResult.affected === 0) {
        throw new Error(`Expected to delete ${benefitCount} benefits but deleted 0. This may indicate a foreign key constraint issue.`);
      }
    } catch (benefitError) {
      console.error('✗ CRITICAL: Error deleting benefits:', benefitError);
      console.error('Benefit error details:', benefitError instanceof Error ? benefitError.message : String(benefitError));
      await queryRunner.rollbackTransaction();
      throw new Error(`Failed to delete benefits for paper ${paperId}: ${benefitError instanceof Error ? benefitError.message : String(benefitError)}`);
    }
    
    // Step 3: Delete related views (has CASCADE, but being explicit for safety)
    try {
      const viewResult = await viewRepository.delete({ research_paper_id: paperId });
      console.log(`✓ Deleted ${viewResult.affected || 0} views for paper ${paperId}`);
    } catch (viewError) {
      console.warn('⚠ Error deleting views (may have CASCADE):', viewError);
      // Views have CASCADE, so this is less critical, but log it
    }
    
    // Step 4: Delete related upvotes (has CASCADE, but being explicit for safety)
    try {
      const upvoteResult = await upvoteRepository.delete({ research_paper_id: paperId });
      console.log(`✓ Deleted ${upvoteResult.affected || 0} upvotes for paper ${paperId}`);
    } catch (upvoteError) {
      console.warn('⚠ Error deleting upvotes (may have CASCADE):', upvoteError);
      // Upvotes have CASCADE, so this is less critical, but log it
    }

    // SECURITY: Log research paper removal (wrap in try-catch to not fail deletion)
    try {
      const auditLogger = require('../middleware/auditLog').default;
      if (auditLogger && typeof auditLogger.log === 'function') {
        auditLogger.log({
          userId: admin.id,
          userEmail: admin.email,
          userType: admin.user_type || 'unknown',
          action: 'REMOVE_RESEARCH_PAPER',
          resource: 'research_paper',
          resourceId: paperId,
          ipAddress: auditLogger.getClientIp ? auditLogger.getClientIp(req) : req.ip || 'unknown',
          userAgent: req.headers['user-agent'] || 'unknown',
          details: {
            paperId,
            paperTitle: paper.title,
            authorId: paper.doctor?.id,
            authorEmail: paper.doctor?.email,
            reason: reason || 'No reason provided'
          },
          success: true
        });
      }
    } catch (auditError) {
      console.warn('Failed to log audit trail (non-critical):', auditError);
      // Continue with deletion even if audit logging fails
    }

    // Step 5: Remove the research paper itself
    console.log(`Attempting to delete research paper ${paperId}...`);
    const deleteResult = await researchRepository.delete(paperId);
    
    if (deleteResult.affected === 0) {
      await queryRunner.rollbackTransaction();
      throw new Error('Failed to delete research paper - no rows affected. This may indicate a foreign key constraint issue or the paper was already deleted.');
    }
    
    console.log(`✓ Successfully deleted research paper ${paperId}: "${paper.title}" (${deleteResult.affected} row(s) deleted)`);
    
    // Commit the transaction
    await queryRunner.commitTransaction();
    console.log(`✓ Transaction committed successfully for paper ${paperId}`);

    // Recalculate approval counts (upvotes) and view counts for all remaining papers
    // This ensures ratings are accurate after deletion
    try {
      await recalculateResearchPaperRatings();
    } catch (recalcError) {
      console.error('Error recalculating research paper ratings:', recalcError);
      // Don't fail the deletion if recalculation fails, but log it
    }

    // TODO: Send email notification to the paper author
    // await sendResearchPaperRemovalNotification(paper.doctor, paper.title, reason);

    res.json({
      success: true,
      message: 'Research paper removed successfully. Ratings have been recalculated for all remaining papers.'
    });
  } catch (error: unknown) {
    await queryRunner.rollbackTransaction();
    console.error('✗ Remove research paper error:', error);
    console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace');
    if (error instanceof Error) {
      console.error('Error name:', error.name);
      console.error('Error message:', error.message);
    }
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorStack = error instanceof Error ? error.stack : undefined;
    res.status(500).json({
      success: false,
      message: 'Failed to remove research paper',
      error: errorMessage,
      ...(process.env.NODE_ENV === 'development' && { stack: errorStack })
    });
  } finally {
    await queryRunner.release();
  }
};

/**
 * Recalculate approval counts (upvotes) and view counts for all research papers
 * This ensures ratings are accurate and dynamically adjusted
 */
const recalculateResearchPaperRatings = async (): Promise<void> => {
  try {
    const researchRepository = AppDataSource.getRepository(ResearchPaper);
    const { ResearchPaperView } = await import('../models/ResearchPaperView');
    const { ResearchPaperUpvote } = await import('../models/ResearchPaperUpvote');
    
    const viewRepository = AppDataSource.getRepository(ResearchPaperView);
    const upvoteRepository = AppDataSource.getRepository(ResearchPaperUpvote);

    // Get all approved research papers
    const allPapers = await researchRepository.find({
      where: { is_approved: true }
    });

    console.log(`Recalculating ratings for ${allPapers.length} research papers...`);

    // Recalculate counts for each paper
    for (const paper of allPapers) {
      // Count actual upvotes
      const actualUpvoteCount = await upvoteRepository.count({
        where: { research_paper_id: paper.id }
      });

      // Count actual views
      const actualViewCount = await viewRepository.count({
        where: { research_paper_id: paper.id }
      });

      // Update paper counts if they differ
      if (paper.upvote_count !== actualUpvoteCount || paper.view_count !== actualViewCount) {
        paper.upvote_count = actualUpvoteCount;
        paper.view_count = actualViewCount;
        await researchRepository.save(paper);
        console.log(`Updated paper ${paper.id} (${paper.title}): ${actualUpvoteCount} approvals, ${actualViewCount} views`);
      }
    }

    console.log('Research paper ratings recalculation completed successfully');
  } catch (error: unknown) {
    console.error('Error recalculating research paper ratings:', error);
    throw error;
  }
};

/**
 * Get research reports statistics (admin only)
 */
export const getResearchReportsStats = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const reportRepository = AppDataSource.getRepository(ResearchReport);

    const totalReports = await reportRepository.count();
    const pendingReports = await reportRepository.count({ where: { status: 'pending' } });
    const resolvedReports = await reportRepository.count({ where: { status: 'resolved' } });
    const dismissedReports = await reportRepository.count({ where: { status: 'dismissed' } });

    // Get reports by type
    const reportsByType = await reportRepository
      .createQueryBuilder('report')
      .select('report.report_type', 'type')
      .addSelect('COUNT(*)', 'count')
      .groupBy('report.report_type')
      .getRawMany();

    res.json({
      success: true,
      data: {
        total: totalReports,
        pending: pendingReports,
        resolved: resolvedReports,
        dismissed: dismissedReports,
        byType: reportsByType
      }
    });
  } catch (error: unknown) {
    console.error('Get research reports stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch research reports statistics'
    });
  }
};

/**
 * Get all research benefits (admin only)
 */
export const getResearchBenefits = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { ResearchBenefit } = await import('../models/ResearchBenefit');
    const benefitRepository = AppDataSource.getRepository(ResearchBenefit);

    const benefits = await benefitRepository.find({
      relations: ['doctor', 'research_paper'],
      order: { created_at: 'DESC' }
    });

    res.json({
      success: true,
      data: benefits.map(benefit => benefit.toJSON())
    });
  } catch (error: unknown) {
    console.error('Get research benefits error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch research benefits'
    });
  }
};

/**
 * Delete a research benefit (admin only)
 */
export const deleteResearchBenefit = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { ResearchBenefit } = await import('../models/ResearchBenefit');
    const benefitRepository = AppDataSource.getRepository(ResearchBenefit);

    const benefit = await benefitRepository.findOne({
      where: { id },
      relations: ['doctor', 'research_paper']
    });

    if (!benefit) {
      res.status(404).json({
        success: false,
        message: 'Research benefit not found'
      });
      return;
    }

    // Delete the benefit
    await benefitRepository.delete(id);

    res.json({
      success: true,
      message: 'Research benefit deleted successfully'
    });
  } catch (error: unknown) {
    console.error('Delete research benefit error:', error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete research benefit',
      error: errorMessage
    });
  }
};

/**
 * Approve research paper (admin only)
 */
export const approveResearchPaper = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { paperId } = req.params;
    const admin = req.user!;

    const researchRepository = AppDataSource.getRepository(ResearchPaper);

    const paper = await researchRepository.findOne({
      where: { id: paperId }
    });

    if (!paper) {
      res.status(404).json({
        success: false,
        message: 'Research paper not found'
      });
      return;
    }

    // SECURITY: Log research paper approval
    const auditLogger = require('../middleware/auditLog').default;
    auditLogger.log({
      userId: admin.id,
      userEmail: admin.email,
      userType: admin.user_type || 'unknown',
      action: 'APPROVE_RESEARCH_PAPER',
      resource: 'research_paper',
      resourceId: paperId,
      ipAddress: auditLogger.getClientIp(req),
      userAgent: req.headers['user-agent'] || 'unknown',
      details: {
        paperId,
        paperTitle: paper.title,
        authorId: paper.doctor?.id
      },
      success: true
    });

    paper.is_approved = true;
    paper.approved_at = new Date();
    paper.approved_by = admin.id;

    await researchRepository.save(paper);

    res.json({
      success: true,
      message: 'Research paper approved successfully'
    });
  } catch (error: unknown) {
    console.error('Approve research paper error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to approve research paper'
    });
  }
};

/**
 * Reject research paper (admin only)
 */
export const rejectResearchPaper = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { paperId } = req.params;
    const { reason } = req.body;
    const admin = req.user!;

    const researchRepository = AppDataSource.getRepository(ResearchPaper);

    const paper = await researchRepository.findOne({
      where: { id: paperId }
    });

    if (!paper) {
      res.status(404).json({
        success: false,
        message: 'Research paper not found'
      });
      return;
    }

    // SECURITY: Log research paper rejection
    const auditLogger = require('../middleware/auditLog').default;
    auditLogger.log({
      userId: admin.id,
      userEmail: admin.email,
      userType: admin.user_type || 'unknown',
      action: 'REJECT_RESEARCH_PAPER',
      resource: 'research_paper',
      resourceId: paperId,
      ipAddress: auditLogger.getClientIp(req),
      userAgent: req.headers['user-agent'] || 'unknown',
      details: {
        paperId,
        paperTitle: paper.title,
        authorId: paper.doctor?.id,
        reason: reason || 'No reason provided'
      },
      success: true
    });

    paper.is_approved = false;
    paper.rejection_reason = reason;
    paper.approved_by = admin.id;

    await researchRepository.save(paper);

    // TODO: Send email notification to the paper author
    // await sendResearchPaperRejectionNotification(paper.doctor, paper.title, reason);

    res.json({
      success: true,
      message: 'Research paper rejected successfully'
    });
  } catch (error: unknown) {
    console.error('Reject research paper error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to reject research paper'
    });
  }
};

/**
 * Get all users (admin only)
 */
export const getUsers = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const doctorRepository = AppDataSource.getRepository(Doctor);
    
    // Get ALL users (doctors, regular users, and employees) for admin management
    const users = await doctorRepository.find({
      order: { created_at: 'DESC' }
    });

    // Map user_type to match frontend expectations
    // Backend uses: 'doctor', 'regular_user', 'employee'
    // Frontend expects: 'doctor', 'regular_user', 'employee'
    // No conversion needed - both use 'regular_user'
    const mappedUsers = users.map(user => {
      const publicJSON = user.toPublicJSON();
      // No conversion needed - enum already uses 'regular_user'
      return publicJSON;
    });

    res.json({
      success: true,
      data: mappedUsers
    });
  } catch (error: unknown) {
    console.error('Get users error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch users'
    });
  }
};

/**
 * Get all employees (admin only)
 */
export const getEmployees = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const doctorRepository = AppDataSource.getRepository(Doctor);
    
    // Get all employees (including both approved and pending, active and deactivated)
    const employees = await doctorRepository.find({
      where: { user_type: UserType.EMPLOYEE },
      order: { created_at: 'DESC' }
    });

    res.json({
      success: true,
      data: employees.map(employee => employee.toPublicJSON())
    });
  } catch (error: unknown) {
    console.error('Get employees error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch employees'
    });
  }
};

/**
 * Get solo doctors (doctors not in any team) (admin only)
 */
export const getSoloDoctors = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const doctorRepository = AppDataSource.getRepository(Doctor);
    const teamMemberRepository = AppDataSource.getRepository(TeamMember);
    
    // Get all approved doctors
    const allDoctors = await doctorRepository.find({
      where: { 
        user_type: UserType.DOCTOR,
        is_approved: true,
        is_admin: false
      },
      order: { current_sales: 'DESC' }
    });

    // Get all team members to identify which doctors are in teams
    const teamMembers = await teamMemberRepository.find({
      select: ['doctor_id']
    });
    
    const doctorIdsInTeams = new Set(teamMembers.map(member => member.doctor_id));
    
    // Filter out doctors who are in teams
    const soloDoctors = allDoctors.filter(doctor => !doctorIdsInTeams.has(doctor.id));

    res.json({
      success: true,
      data: soloDoctors.map(doctor => ({
        id: doctor.id,
        doctor_id: doctor.doctor_id,
        doctor_name: doctor.doctor_name,
        display_name: doctor.display_name,
        email: doctor.email,
        clinic_name: doctor.clinic_name,
        tier: doctor.tier,
        current_sales: doctor.current_sales,
        is_approved: doctor.is_approved,
        created_at: doctor.created_at
      }))
    });
  } catch (error: unknown) {
    console.error('Get solo doctors error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch solo doctors',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

/**
 * Update user profile (admin only)
 * SECURITY: Viewer admin cannot edit
 */
export const updateUserProfile = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { doctor_name, display_name, clinic_name, whatsapp, bio, tags } = req.body;
    const user = req.user!;

    if (!id) {
      res.status(400).json({
        success: false,
        message: 'User ID is required'
      });
      return;
    }

    // Check admin access and permissions
    const currentUserPermission = await getUserAdminPermissions(user.id);
    const isMainAdmin = user.is_admin && !currentUserPermission;
    const isViewerAdmin = currentUserPermission?.permission_type === 'viewer';
    
    // Viewer admin can only view, not edit
    if (isViewerAdmin) {
      res.status(403).json({
        success: false,
        message: 'Viewer Admin can only view records. Edit operations are not allowed.'
      });
      return;
    }

    const doctorRepository = AppDataSource.getRepository(Doctor);
    const doctor = await doctorRepository.findOne({ where: { id } });

    if (!doctor) {
      res.status(404).json({
        success: false,
        message: 'User not found'
      });
      return;
    }

    // Check for inappropriate content
    const inappropriateWords = ['fuck', 'shit', 'damn', 'bitch', 'ass', 'hell', 'crap'];
    const checkInappropriate = (text: string) => {
      if (!text) return false;
      const lowerText = text.toLowerCase();
      return inappropriateWords.some(word => lowerText.includes(word));
    };

    if (doctor_name && checkInappropriate(doctor_name)) {
      res.status(400).json({
        success: false,
        message: 'Doctor name contains inappropriate content. Please use a professional name.'
      });
      return;
    }

    if (display_name && checkInappropriate(display_name)) {
      res.status(400).json({
        success: false,
        message: 'Display name contains inappropriate content. Please use a professional name.'
      });
      return;
    }

    if (clinic_name && checkInappropriate(clinic_name)) {
      res.status(400).json({
        success: false,
        message: 'Clinic name contains inappropriate content. Please use a professional name.'
      });
      return;
    }

    // Update fields
    if (doctor_name !== undefined) doctor.doctor_name = doctor_name.trim();
    if (display_name !== undefined) doctor.display_name = display_name.trim() || null;
    if (clinic_name !== undefined) doctor.clinic_name = clinic_name.trim();
    if (whatsapp !== undefined) doctor.whatsapp = whatsapp.trim() || null;
    if (bio !== undefined) doctor.bio = bio.trim() || null;
    if (tags !== undefined) doctor.tags = Array.isArray(tags) ? tags : [];

    await doctorRepository.save(doctor);

    res.json({
      success: true,
      message: 'Profile updated successfully',
      data: doctor.toPublicJSON()
    });
  } catch (error: unknown) {
    console.error('Update user profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update profile'
    });
  }
};

/**
 * Get all products (admin only)
 */
export const getProducts = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const productRepository = AppDataSource.getRepository(Product);
    
    const products = await productRepository.find({
      order: { created_at: 'DESC' }
    });

    res.json({
      success: true,
      data: products.map(product => product.toJSON())
    });
  } catch (error: unknown) {
    console.error('Get products error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch products'
    });
  }
};

/**
 * Create a new product (admin only)
 */
export const createProduct = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const user = req.user!;
    if (!user.is_admin) {
      res.status(403).json({
        success: false,
        message: 'Admin access required'
      });
      return;
    }

    const { 
      slot_index, 
      name, 
      description, 
      price, 
      category, 
      unit, 
      stock_quantity, 
      is_featured, 
      is_visible 
    } = req.body;

    // Handle uploaded image - store in /products_pics/ AND database for persistence
    let image_url: string | null = null;
    let image_data: string | null = null;
    
    if (req.file) {
      console.log('📤 File uploaded:', req.file.filename, 'Size:', req.file.size, 'bytes');
      image_url = `/products_pics/${req.file.filename}`;
      
      // Store image data in database as base64 for persistence on Railway
      try {
        // Multer saves to req.file.path (full path) or we can construct it
        const filePath = req.file.path || path.join(PRODUCTS_PICS_DIR, req.file.filename);
        console.log('📂 Reading file from:', filePath);
        
        if (!fs.existsSync(filePath)) {
          console.warn('⚠️ File not found at path, trying alternative:', filePath);
          // Try alternative path
          const altPath = path.join(PRODUCTS_PICS_DIR, req.file.filename);
          if (fs.existsSync(altPath)) {
            const fileBuffer = fs.readFileSync(altPath);
            image_data = `data:${req.file.mimetype};base64,${fileBuffer.toString('base64')}`;
            console.log('✅ Image data stored in database (base64), size:', image_data.length, 'chars');
          } else {
            throw new Error(`File not found at ${filePath} or ${altPath}`);
          }
        } else {
          const fileBuffer = fs.readFileSync(filePath);
          image_data = `data:${req.file.mimetype};base64,${fileBuffer.toString('base64')}`;
          console.log('✅ Image data stored in database (base64), size:', image_data.length, 'chars');
        }
      } catch (error) {
        console.error('❌ Error reading file for database storage:', error);
        console.error('File path attempted:', req.file.path, 'Filename:', req.file.filename);
        // Don't fail the request, just log the error - image_url will still work
      }
    }

    // Validate required fields
    if (!slot_index || !name) {
      res.status(400).json({
        success: false,
        message: 'Slot index and name are required'
      });
      return;
    }

    // Validate slot index range
    if (slot_index < 1 || slot_index > 100) {
      res.status(400).json({
        success: false,
        message: 'Slot index must be between 1 and 100'
      });
      return;
    }

    const productRepository = AppDataSource.getRepository(Product);

    // Check if slot is already occupied
    const existingProduct = await productRepository.findOne({ 
      where: { slot_index: parseInt(slot_index) } 
    });
    
    if (existingProduct) {
      res.status(400).json({
        success: false,
        message: `Slot ${slot_index} is already occupied by another product`
      });
      return;
    }

    const productData: any = {
      name,
      description: description || '',
      price: price ? parseFloat(price) : null,
      category: category || '',
      unit: unit || '',
      stock_quantity: stock_quantity ? parseInt(stock_quantity) : 0,
      is_featured: is_featured === true || is_featured === 'true',
      is_visible: is_visible !== false && is_visible !== 'false',
      image_url: image_url || null,
      image_data: image_data || null
    };
    
    // Add slot_index if it exists (for legacy support)
    if (slot_index) {
      (productData as any).slot_index = parseInt(slot_index);
    }

    const product = productRepository.create(productData);
    const savedProduct = await productRepository.save(product);

    const productResponse = Array.isArray(savedProduct) ? savedProduct[0] : savedProduct;
    res.status(201).json({
      success: true,
      message: 'Product created successfully',
      data: productResponse ? (productResponse.toJSON ? productResponse.toJSON() : productResponse) : null
    });
  } catch (error: unknown) {
    console.error('Create product error:', error);
    const errorMessage = error instanceof Error ? (error instanceof Error ? error.message : String(error)) : 'Unknown error';
    res.status(500).json({
      success: false,
      message: 'Failed to create product',
      error: process.env.NODE_ENV === 'development' ? errorMessage : undefined
    });
  }
};

/**
 * Update a product (admin only)
 * SECURITY: Viewer admin cannot edit
 */
export const updateProduct = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const user = req.user!;
    
    // Check admin access and permissions
    const currentUserPermission = await getUserAdminPermissions(user.id);
    const isMainAdmin = user.is_admin && !currentUserPermission;
    const isViewerAdmin = currentUserPermission?.permission_type === 'viewer';
    
    // Viewer admin can only view, not edit
    if (isViewerAdmin) {
      res.status(403).json({
        success: false,
        message: 'Viewer Admin can only view records. Edit operations are not allowed.'
      });
      return;
    }

    const { id } = req.params;
    const { 
      name, 
      description, 
      price, 
      category, 
      unit, 
      stock_quantity, 
      is_featured, 
      is_visible 
    } = req.body;

    // Handle uploaded image
    // Product images are now stored in /products_pics/ instead of /uploads/
    // This ensures they persist like other product images
    let image_url: string | undefined = undefined;
    let image_data: string | null = null;
    
    if (req.file) {
      console.log('📤 File uploaded:', req.file.filename, 'Size:', req.file.size, 'bytes');
      
      // Store image data in database as base64 for persistence
      try {
        // Multer saves to req.file.path (full path) or we can construct it
        const filePath = req.file.path || path.join(PRODUCTS_PICS_DIR, req.file.filename);
        console.log('📂 Reading file from:', filePath);
        
        if (!fs.existsSync(filePath)) {
          console.warn('⚠️ File not found at path, trying alternative:', filePath);
          // Try alternative path
          const altPath = path.join(PRODUCTS_PICS_DIR, req.file.filename);
          if (fs.existsSync(altPath)) {
            const fileBuffer = fs.readFileSync(altPath);
            image_data = `data:${req.file.mimetype};base64,${fileBuffer.toString('base64')}`;
            console.log('✅ Image data stored in database (base64), size:', image_data.length, 'chars');
          } else {
            throw new Error(`File not found at ${filePath} or ${altPath}`);
          }
        } else {
          const fileBuffer = fs.readFileSync(filePath);
          image_data = `data:${req.file.mimetype};base64,${fileBuffer.toString('base64')}`;
          console.log('✅ Image data stored in database (base64), size:', image_data.length, 'chars');
        }
      } catch (error) {
        console.error('❌ Error reading file for database storage:', error);
        console.error('File path attempted:', req.file.path, 'Filename:', req.file.filename);
        // Don't fail the request, just log the error - image_url will still work
      }
      
      // Also store file path for backward compatibility
      image_url = `/products_pics/${req.file.filename}`;
      console.log('✅ Image URL set to:', image_url);
    } else if (req.body.image_url !== undefined) {
      console.log('📤 Image URL from body:', req.body.image_url);
      // If image_url is provided in body, use it (could be full URL or relative path)
      // Prefer /products_pics/ over /uploads/ for product images
      const providedUrl = req.body.image_url;
      if (providedUrl && typeof providedUrl === 'string') {
        // If it's already a relative path, use it as-is
        if (providedUrl.startsWith('/products_pics/') || providedUrl.startsWith('/uploads/')) {
          image_url = providedUrl;
        } else if (providedUrl.startsWith('http://') || providedUrl.startsWith('https://')) {
          // Extract relative path from full URL
          // Prefer products_pics over uploads
          const productsPicsMatch = providedUrl.match(/\/(products_pics)\/[^\/]+$/);
          const uploadsMatch = providedUrl.match(/\/(uploads)\/[^\/]+$/);
          if (productsPicsMatch) {
            image_url = productsPicsMatch[0];
          } else if (uploadsMatch) {
            // Convert /uploads/ to /products_pics/ for consistency
            image_url = providedUrl.replace('/uploads/', '/products_pics/').match(/\/(products_pics)\/[^\/]+$/)?.[0] || uploadsMatch[0];
          } else {
            // Keep the full URL if we can't extract a relative path
            image_url = providedUrl;
          }
        } else {
          // Assume it's a relative path - ensure it starts with /
          image_url = providedUrl.startsWith('/') ? providedUrl : `/${providedUrl}`;
        }
      } else if (providedUrl === null || providedUrl === '') {
        // Explicitly set to null to clear the image
        image_url = null;
      }
    }

    const productRepository = AppDataSource.getRepository(Product);
    const product = await productRepository.findOne({ where: { id } });

    if (!product) {
      res.status(404).json({
        success: false,
        message: 'Product not found'
      });
      return;
    }

    // Update fields if provided
    if (name !== undefined) product.name = name;
    if (description !== undefined) product.description = description;
    if (price !== undefined) {
      // Handle price conversion safely
      if (price === null || price === '' || price === undefined) {
        product.price = null;
      } else {
        const priceNum = typeof price === 'string' ? parseFloat(price) : Number(price);
        product.price = isNaN(priceNum) ? null : priceNum;
      }
    }
    if (category !== undefined) product.category = category || '';
    if (unit !== undefined) product.unit = unit || '';
    if (stock_quantity !== undefined) {
      // Handle stock_quantity conversion safely
      const stockNum = typeof stock_quantity === 'string' ? parseInt(stock_quantity, 10) : Number(stock_quantity);
      product.stock_quantity = isNaN(stockNum) ? 0 : stockNum;
    }
    if (is_featured !== undefined) product.is_featured = is_featured === true || is_featured === 'true';
    if (is_visible !== undefined) product.is_visible = is_visible !== false && is_visible !== 'false';
    if (image_url !== undefined) {
      // Only update image_url if a new file was uploaded
      // If image_url is explicitly set to null/empty, allow that too
      product.image_url = image_url || null;
    }
    
    // Update image_data if new image was uploaded
    if (image_data !== null) {
      product.image_data = image_data;
      console.log('💾 Image data updated in database, size:', image_data.length, 'chars');
    }

    console.log('💾 Saving product with image_url:', product.image_url);
    const savedProduct = await productRepository.save(product);
    console.log('✅ Product saved successfully:', savedProduct.id);

    res.json({
      success: true,
      message: 'Product updated successfully',
      data: savedProduct.toJSON()
    });
  } catch (error: unknown) {
    console.error('❌ Update product error:', error);
    if (error instanceof Error) {
      console.error('❌ Error name:', error.name);
      console.error('❌ Error message:', error.message);
      console.error('❌ Error stack:', error.stack);
      
      // Check for specific database errors
      if (error.message.includes('violates') || error.message.includes('constraint')) {
        console.error('❌ Database constraint violation');
      }
      if (error.message.includes('ENOENT') || error.message.includes('no such file')) {
        console.error('❌ File system error - directory may not exist');
      }
    }
    
    // Log request details for debugging
    console.error('❌ Request details:', {
      productId: req.params.id,
      hasFile: !!req.file,
      fileInfo: req.file ? {
        filename: req.file.filename,
        size: req.file.size,
        mimetype: req.file.mimetype
      } : null,
      bodyFields: Object.keys(req.body),
      imageUrl: req.body.image_url
    });
    
    res.status(500).json({
      success: false,
      message: 'Failed to update product',
      error: process.env.NODE_ENV === 'development' 
        ? (error instanceof Error ? error.message : String(error))
        : undefined
    });
  }
};

/**
 * Delete a product (admin only)
 */
export const deleteProduct = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const user = req.user!;
    
    // Check admin access and permissions
    const currentUserPermission = await getUserAdminPermissions(user.id);
    const isMainAdmin = user.is_admin && !currentUserPermission;
    const isViewerAdmin = currentUserPermission?.permission_type === 'viewer';
    
    // Viewer admin can only view, not delete
    if (isViewerAdmin) {
      res.status(403).json({
        success: false,
        message: 'Viewer Admin can only view records. Delete operations are not allowed.'
      });
      return;
    }

    const { id } = req.params;
    const productRepository = AppDataSource.getRepository(Product);
    const product = await productRepository.findOne({ where: { id } });

    if (!product) {
      res.status(404).json({
        success: false,
        message: 'Product not found'
      });
      return;
    }

    // SECURITY: Log product deletion
    const auditLogger = require('../middleware/auditLog').default;
    auditLogger.log({
      userId: user.id,
      userEmail: user.email,
      userType: user.user_type || 'unknown',
      action: 'DELETE_PRODUCT',
      resource: 'product',
      resourceId: id,
      ipAddress: auditLogger.getClientIp(req),
      userAgent: req.headers['user-agent'] || 'unknown',
      details: {
        productId: id,
        productName: product.name,
        productPrice: product.price
      },
      success: true
    });

    await productRepository.remove(product);

    res.json({
      success: true,
      message: 'Product deleted successfully'
    });
  } catch (error: unknown) {
    console.error('Delete product error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete product'
    });
  }
};

/**
 * Get all signup IDs (admin only)
 */
export const getSignupIds = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const user = req.user!;
    
    // Check admin access and permissions
    const currentUserPermission = await getUserAdminPermissions(user.id);
    const isViewerAdmin = currentUserPermission?.permission_type === 'viewer';
    
    // Check if viewer admin has permission to view signup IDs
    if (isViewerAdmin && currentUserPermission?.config?.can_view_signup_ids !== true) {
      res.status(403).json({
        success: false,
        message: 'You do not have permission to view signup IDs'
      });
      return;
    }

    const signupRepository = AppDataSource.getRepository(AllowedSignupId);
    
    const signupIds = await signupRepository.find({
      order: { created_at: 'DESC' }
    });

    // Ensure all fields are properly serialized
    const serializedSignupIds = signupIds.map(sid => ({
      id: sid.id,
      signup_id: sid.signup_id,
      is_used: sid.is_used || false,
      used_by_email: sid.used_by_email || null,
      used_at: sid.used_at || null,
      notes: sid.notes || null,
      created_at: sid.created_at
    }));

    console.log('📋 Signup IDs - Total:', serializedSignupIds.length, 'Used:', serializedSignupIds.filter(s => s.is_used).length);

    res.json({
      success: true,
      data: serializedSignupIds
    });
  } catch (error: unknown) {
    console.error('Get signup IDs error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch signup IDs'
    });
  }
};

/**
 * Create a new signup ID (admin only)
 */
export const createSignupId = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const user = req.user!;
    const { signup_id, notes } = req.body;
    
    // Check admin access and permissions
    const currentUserPermission = await getUserAdminPermissions(user.id);
    const isMainAdmin = user.is_admin && !currentUserPermission;
    const isViewerAdmin = currentUserPermission?.permission_type === 'viewer';
    
    // Viewer admin cannot create signup IDs
    if (isViewerAdmin) {
      res.status(403).json({
        success: false,
        message: 'Viewer Admin can only view records. Creation operations are not allowed.'
      });
      return;
    }

    // Check if custom admin has permission to create signup IDs
    if (currentUserPermission && currentUserPermission.config?.can_create_signup_ids !== true) {
      res.status(403).json({
        success: false,
        message: 'You do not have permission to create signup IDs'
      });
      return;
    }

    // Validation
    if (!signup_id || typeof signup_id !== 'string' || signup_id.trim() === '') {
      res.status(400).json({
        success: false,
        message: 'Signup ID is required'
      });
      return;
    }

    // Validate format: must be exactly 5 digits
    if (!/^\d{5}$/.test(signup_id.trim())) {
      res.status(400).json({
        success: false,
        message: 'Signup ID must be exactly 5 digits'
      });
      return;
    }

    const signupRepository = AppDataSource.getRepository(AllowedSignupId);
    
    // Check if signup ID already exists
    const existing = await signupRepository.findOne({
      where: { signup_id: signup_id.trim() }
    });

    if (existing) {
      res.status(409).json({
        success: false,
        message: 'Signup ID already exists'
      });
      return;
    }

    // Create new signup ID
    const newSignupId = signupRepository.create({
      signup_id: signup_id.trim(),
      is_used: false,
      notes: notes || null
    });

    const saved = await signupRepository.save(newSignupId);

    // SECURITY: Log signup ID creation
    const auditLogger = require('../middleware/auditLog').default;
    auditLogger.log({
      userId: user.id,
      userEmail: user.email,
      userType: user.user_type || 'unknown',
      action: 'CREATE_SIGNUP_ID',
      resource: 'signup_id',
      resourceId: saved.id,
      ipAddress: auditLogger.getClientIp(req),
      userAgent: req.headers['user-agent'] || 'unknown',
      details: {
        signupId: saved.signup_id,
        notes: saved.notes
      },
      success: true
    });

    res.json({
      success: true,
      message: 'Signup ID created successfully',
      data: saved
    });
  } catch (error: unknown) {
    console.error('Create signup ID error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create signup ID'
    });
  }
};

/**
 * Delete a signup ID (admin only)
 */
export const deleteSignupId = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const user = req.user!;
    const { id } = req.params;
    
    // Check admin access and permissions
    const currentUserPermission = await getUserAdminPermissions(user.id);
    const isMainAdmin = user.is_admin && !currentUserPermission;
    const isViewerAdmin = currentUserPermission?.permission_type === 'viewer';
    
    // Viewer admin cannot delete signup IDs
    if (isViewerAdmin) {
      res.status(403).json({
        success: false,
        message: 'Viewer Admin can only view records. Deletion operations are not allowed.'
      });
      return;
    }

    // Check if custom admin has permission to delete signup IDs
    if (currentUserPermission && currentUserPermission.config?.can_delete_signup_ids !== true) {
      res.status(403).json({
        success: false,
        message: 'You do not have permission to delete signup IDs'
      });
      return;
    }

    const signupRepository = AppDataSource.getRepository(AllowedSignupId);
    const signupId = await signupRepository.findOne({ where: { id } });

    if (!signupId) {
      res.status(404).json({
        success: false,
        message: 'Signup ID not found'
      });
      return;
    }

    // Prevent deletion of used signup IDs (optional - you can remove this if you want to allow deletion)
    if (signupId.is_used) {
      res.status(400).json({
        success: false,
        message: 'Cannot delete a signup ID that has been used. Used signup IDs should remain in the system for audit purposes.'
      });
      return;
    }

    // SECURITY: Log signup ID deletion
    const auditLogger = require('../middleware/auditLog').default;
    auditLogger.log({
      userId: user.id,
      userEmail: user.email,
      userType: user.user_type || 'unknown',
      action: 'DELETE_SIGNUP_ID',
      resource: 'signup_id',
      resourceId: id,
      ipAddress: auditLogger.getClientIp(req),
      userAgent: req.headers['user-agent'] || 'unknown',
      details: {
        signupId: signupId.signup_id,
        wasUsed: signupId.is_used
      },
      success: true
    });

    await signupRepository.remove(signupId);

    res.json({
      success: true,
      message: 'Signup ID deleted successfully'
    });
  } catch (error: unknown) {
    console.error('Delete signup ID error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete signup ID'
    });
  }
};

/**
 * Get all research benefit configurations (admin only)
 */
export const getResearchBenefitConfigs = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const configRepository = AppDataSource.getRepository(ResearchBenefitConfig);
    
    const configs = await configRepository.find({
      order: { sort_order: 'ASC', approval_threshold: 'ASC' }
    });

    res.json({
      success: true,
      data: configs.map(config => config.toJSON())
    });
  } catch (error: unknown) {
    console.error('Get research benefit configs error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch research benefit configurations'
    });
  }
};

/**
 * Get research benefit configurations (public)
 */
export const getPublicResearchBenefitConfigs = async (req: Request, res: Response): Promise<void> => {
  try {
    const configRepository = AppDataSource.getRepository(ResearchBenefitConfig);
    
    const configs = await configRepository.find({
      where: { is_active: true },
      order: { sort_order: 'ASC', approval_threshold: 'ASC' }
    });

    res.json({
      success: true,
      data: configs.map(config => config.toJSON())
    });
  } catch (error: unknown) {
    console.error('Get public research benefit configs error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch research benefit configurations'
    });
  }
};

/**
 * Create research benefit configuration (admin only)
 */
export const createResearchBenefitConfig = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const configRepository = AppDataSource.getRepository(ResearchBenefitConfig);
    
    const {
      title,
      description,
      approval_threshold,
      approval_threshold_max,
      view_threshold,
      benefit_type,
      benefit_value,
      gift_description,
      is_active,
      sort_order,
      display_color,
      max_awards_per_doctor,
      cooldown_days,
      requires_manual_approval
    } = req.body;

    // Validation
    if (!title || !approval_threshold || !benefit_type) {
      res.status(400).json({
        success: false,
        message: 'Title, approval threshold, and benefit type are required'
      });
      return;
    }

    const config = configRepository.create({
      title,
      description,
      approval_threshold,
      approval_threshold_max,
      view_threshold: view_threshold || null,
      benefit_type,
      benefit_value: benefit_value || 0,
      gift_description,
      is_active: is_active !== undefined ? is_active : true,
      sort_order: sort_order || 0,
      display_color: display_color || '#4F46E5',
      max_awards_per_doctor: max_awards_per_doctor || 1,
      cooldown_days: cooldown_days || 0,
      requires_manual_approval: requires_manual_approval || false
    });

    await configRepository.save(config);

    // If config is active, check all doctors for eligibility
    if (config.is_active) {
      try {
        await checkEligibilityForConfig(config);
        console.log(`✅ Checked eligibility for all doctors after creating config: ${config.title}`);
      } catch (eligibilityError) {
        console.error('Error checking eligibility after config creation:', eligibilityError);
        // Don't fail the request if eligibility check fails
      }
    }

    res.status(201).json({
      success: true,
      data: config.toJSON(),
      message: 'Research benefit configuration created successfully'
    });
  } catch (error: unknown) {
    console.error('Create research benefit config error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create research benefit configuration'
    });
  }
};

/**
 * Update research benefit configuration (admin only)
 */
export const updateResearchBenefitConfig = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const configRepository = AppDataSource.getRepository(ResearchBenefitConfig);
    const { id } = req.params;
    
    const config = await configRepository.findOne({ where: { id } });
    if (!config) {
      res.status(404).json({
        success: false,
        message: 'Research benefit configuration not found'
      });
      return;
    }

    const {
      title,
      description,
      approval_threshold,
      approval_threshold_max,
      view_threshold,
      benefit_type,
      benefit_value,
      gift_description,
      is_active,
      sort_order,
      display_color,
      max_awards_per_doctor,
      cooldown_days,
      requires_manual_approval
    } = req.body;

    // Update fields
    if (title !== undefined) config.title = title;
    if (description !== undefined) config.description = description;
    if (approval_threshold !== undefined) config.approval_threshold = approval_threshold;
    if (approval_threshold_max !== undefined) config.approval_threshold_max = approval_threshold_max;
    if (view_threshold !== undefined) config.view_threshold = view_threshold;
    if (benefit_type !== undefined) config.benefit_type = benefit_type;
    if (benefit_value !== undefined) config.benefit_value = benefit_value;
    if (gift_description !== undefined) config.gift_description = gift_description;
    if (is_active !== undefined) config.is_active = is_active;
    if (sort_order !== undefined) config.sort_order = sort_order;
    if (display_color !== undefined) config.display_color = display_color;
    if (max_awards_per_doctor !== undefined) config.max_awards_per_doctor = max_awards_per_doctor;
    if (cooldown_days !== undefined) config.cooldown_days = cooldown_days;
    if (requires_manual_approval !== undefined) config.requires_manual_approval = requires_manual_approval;

    await configRepository.save(config);

    // If config is active, check all doctors for eligibility (especially if threshold changed)
    if (config.is_active) {
      try {
        await checkEligibilityForConfig(config);
        console.log(`✅ Checked eligibility for all doctors after updating config: ${config.title}`);
      } catch (eligibilityError) {
        console.error('Error checking eligibility after config update:', eligibilityError);
        // Don't fail the request if eligibility check fails
      }
    }

    res.json({
      success: true,
      data: config.toJSON(),
      message: 'Research benefit configuration updated successfully'
    });
  } catch (error: unknown) {
    console.error('Update research benefit config error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update research benefit configuration'
    });
  }
};

/**
 * Delete research benefit configuration (admin only)
 */
export const deleteResearchBenefitConfig = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const configRepository = AppDataSource.getRepository(ResearchBenefitConfig);
    const { id } = req.params;
    
    const config = await configRepository.findOne({ where: { id } });
    if (!config) {
      res.status(404).json({
        success: false,
        message: 'Research benefit configuration not found'
      });
      return;
    }

    // Delete all related reward eligibilities first to avoid foreign key constraints
    const eligibilityRepository = AppDataSource.getRepository(ResearchRewardEligibility);
    const relatedEligibilities = await eligibilityRepository.find({
      where: { benefit_config_id: id }
    });

    if (relatedEligibilities.length > 0) {
      console.log(`🗑️ Deleting ${relatedEligibilities.length} related reward eligibilities for config: ${config.title}`);
      await eligibilityRepository.remove(relatedEligibilities);
      console.log(`✅ Deleted ${relatedEligibilities.length} related eligibilities`);
    }

    // Now delete the configuration
    await configRepository.delete(id);

    res.json({
      success: true,
      message: 'Research benefit configuration deleted successfully'
    });
  } catch (error: unknown) {
    console.error('Delete research benefit config error:', error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    
    // Check if it's a foreign key constraint error
    if (errorMessage.includes('foreign key') || errorMessage.includes('constraint')) {
      res.status(400).json({
        success: false,
        message: 'Cannot delete this configuration because it is being used by existing reward eligibilities. Please remove or update related records first.'
      });
      return;
    }
    
    res.status(500).json({
      success: false,
      message: 'Failed to delete research benefit configuration',
      error: errorMessage
    });
  }
};

/**
 * Get all reward eligibility records (admin only)
 * Categorizes into: Not Eligible, Eligible but Delivered, Eligible but Not Delivered (Pending), Rejected
 */
export const getRewardEligibility = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const eligibilityRepository = AppDataSource.getRepository(ResearchRewardEligibility);
    const benefitConfigRepository = AppDataSource.getRepository(ResearchBenefitConfig);
    const doctorRepository = AppDataSource.getRepository(Doctor);
    const researchRepository = AppDataSource.getRepository(ResearchPaper);
    
    const { filter, search } = req.query;
    
    // Get all eligibilities with research paper info
    let eligibilities = await eligibilityRepository.find({
      relations: ['doctor', 'benefit_config', 'delivered_by_doctor', 'research_paper'],
      order: { created_at: 'DESC' }
    });

    // Auto-link old eligibility records that don't have research_paper_id
    // Try to find the matching paper based on doctor_id, benefit_config_id, and approval_count
    for (const eligibility of eligibilities) {
      if (!eligibility.research_paper_id && eligibility.doctor_id && eligibility.benefit_config_id) {
        // Find approved papers for this doctor that match the approval_count
        const doctorPapers = await researchRepository.find({
          where: {
            doctor_id: eligibility.doctor_id,
            is_approved: true
          },
          order: { upvote_count: 'DESC', created_at: 'DESC' }
        });

        // Try to find a paper that matches the approval_count and qualifies for this benefit config
        for (const paper of doctorPapers) {
          const paperUpvoteCount = paper.upvote_count || 0;
          const paperViewCount = paper.view_count || 0;
          const config = eligibility.benefit_config;

          if (config) {
            const meetsApprovalThreshold = paperUpvoteCount >= config.approval_threshold && 
              (config.approval_threshold_max ? paperUpvoteCount <= config.approval_threshold_max : true);
            const meetsViewThreshold = config.view_threshold 
              ? paperViewCount >= config.view_threshold 
              : true;

            // If this paper qualifies and the approval_count matches (or is close), link it
            if (meetsApprovalThreshold && meetsViewThreshold) {
              // Check if there's already an eligibility for this paper and config
              const existingForPaper = await eligibilityRepository.findOne({
                where: {
                  research_paper_id: paper.id,
                  benefit_config_id: eligibility.benefit_config_id
                }
              });

              // Only link if no other eligibility exists for this paper+config
              // OR if the approval_count matches exactly
              if (!existingForPaper || (existingForPaper.id === eligibility.id && paperUpvoteCount === eligibility.approval_count)) {
                eligibility.research_paper_id = paper.id;
                eligibility.approval_count = paperUpvoteCount; // Update to match paper
                await eligibilityRepository.save(eligibility);
                console.log(`🔗 Auto-linked eligibility ${eligibility.id} to paper "${paper.title}" (${paperUpvoteCount} upvotes)`);
                break; // Found a match, move to next eligibility
              }
            }
          }
        }
      }
    }

    // Re-fetch eligibilities to get updated research_paper relations
    eligibilities = await eligibilityRepository.find({
      relations: ['doctor', 'benefit_config', 'delivered_by_doctor', 'research_paper'],
      order: { created_at: 'DESC' }
    });

    // Auto-reject: Check for "one award per month" rule
    // If the same award was already delivered in the current month, automatically reject new eligibilities
    const now = new Date();
    const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    
    for (const eligibility of eligibilities) {
      if (eligibility.status === 'eligible' && eligibility.benefit_config_id && eligibility.doctor_id) {
        // Check if this doctor already received this award in the current month
        const deliveredThisMonth = await eligibilityRepository.find({
          where: {
            doctor_id: eligibility.doctor_id,
            benefit_config_id: eligibility.benefit_config_id,
            status: 'delivered'
          },
          order: { delivered_at: 'DESC' }
        });

        // Filter to only current month deliveries
        const currentMonthDeliveries = deliveredThisMonth.filter(d => {
          if (!d.delivered_at) return false;
          const deliveryDate = new Date(d.delivered_at);
          return deliveryDate >= currentMonthStart;
        });

        // If already delivered this month, auto-reject this eligibility
        if (currentMonthDeliveries.length > 0) {
          eligibility.status = 'cancelled';
          const deliveryDate = currentMonthDeliveries[0]?.delivered_at;
          eligibility.notes = deliveryDate 
            ? `Auto-rejected: Same award already delivered this month (${new Date(deliveryDate).toLocaleDateString()})`
            : `Auto-rejected: Same award already delivered this month`;
          await eligibilityRepository.save(eligibility);
          console.log(`🚫 Auto-rejected eligibility ${eligibility.id}: Same award already delivered this month for Dr. ${eligibility.doctor?.doctor_name}`);
        }
      }
    }

    // Re-fetch after auto-rejection
    eligibilities = await eligibilityRepository.find({
      relations: ['doctor', 'benefit_config', 'delivered_by_doctor', 'research_paper'],
      order: { created_at: 'DESC' }
    });

    // Check for cooldown expiration and update status automatically
    // When cooldown expires, eligibility automatically becomes available (moves to pending)
    for (const eligibility of eligibilities) {
      if (eligibility.status === 'eligible' && eligibility.benefit_config) {
        const config = eligibility.benefit_config;
        
        // Check if there are delivered eligibilities that are past cooldown
        if (config.cooldown_days > 0) {
          const deliveredEligibilities = await eligibilityRepository.find({
            where: {
              doctor_id: eligibility.doctor_id,
              benefit_config_id: config.id,
              status: 'delivered'
            },
            order: { delivered_at: 'DESC' }
          });

          if (deliveredEligibilities.length > 0 && deliveredEligibilities.length < config.max_awards_per_doctor) {
            const lastDelivery = deliveredEligibilities[0]?.delivered_at;
            if (lastDelivery) {
              const daysSinceLastDelivery = Math.floor(
                (now.getTime() - new Date(lastDelivery).getTime()) / (1000 * 60 * 60 * 24)
              );
              
              // If cooldown has expired, eligibility is now available (status stays 'eligible' = pending)
              // The category will be determined in the filter logic below
              if (daysSinceLastDelivery >= config.cooldown_days) {
                // Cooldown expired - eligibility is now pending (status is already 'eligible')
                console.log(`✅ Cooldown expired for Dr. ${eligibility.doctor?.doctor_name} - ${config.title}, eligibility now pending`);
              }
            }
          }
        }
      }
    }

    // Apply filters based on category
    if (filter === 'delivered') {
      // Eligible but Delivered
      eligibilities = eligibilities.filter(e => e.status === 'delivered');
    } else if (filter === 'not_delivered') {
      // Eligible but Not Delivered (pending, not in cooldown)
      const filtered: typeof eligibilities = [];
      for (const eligibility of eligibilities.filter(e => e.status === 'eligible')) {
        if (eligibility.benefit_config) {
          const config = eligibility.benefit_config;
          const deliveredEligibilities = await eligibilityRepository.find({
            where: {
              doctor_id: eligibility.doctor_id,
              benefit_config_id: config.id,
              status: 'delivered'
            },
            order: { delivered_at: 'DESC' }
          });

          // If no delivered records OR cooldown has expired, it's pending
          if (deliveredEligibilities.length === 0) {
            filtered.push(eligibility);
          } else if (config.cooldown_days > 0) {
            const lastDelivery = deliveredEligibilities[0]?.delivered_at;
            if (lastDelivery) {
              const daysSinceLastDelivery = Math.floor(
                (now.getTime() - new Date(lastDelivery).getTime()) / (1000 * 60 * 60 * 24)
              );
              
              if (daysSinceLastDelivery >= config.cooldown_days) {
                // Cooldown expired, now pending
                filtered.push(eligibility);
              }
            }
          }
        }
      }
      eligibilities = filtered;
    } else if (filter === 'rejected') {
      // Rejected - includes:
      // 1. Auto-rejected: Same award already delivered this month
      // 2. Manually cancelled awards
      eligibilities = eligibilities.filter(e => e.status === 'cancelled');
    } else if (filter === 'not_eligible') {
      // Not Eligible - doctors who don't meet criteria
      const allDoctors = await doctorRepository.find({ where: { is_approved: true } });
      const benefitConfigs = await benefitConfigRepository.find({ where: { is_active: true } });
      
      const eligibleDoctorIds = new Set(eligibilities.map(e => e.doctor_id));
      const notEligibleDoctors = allDoctors.filter(d => !eligibleDoctorIds.has(d.id));
      
      // For each not eligible doctor, check why they're not eligible
      let notEligibleData = [];
      for (const doctor of notEligibleDoctors) {
        const approvedPapers = await researchRepository.find({
          where: {
            doctor_id: doctor.id,
            is_approved: true
          }
        });
        
        const approvalCount = approvedPapers.reduce((sum, paper) => sum + (paper.upvote_count || 0), 0);
        const viewCount = approvedPapers.reduce((sum, paper) => sum + (paper.view_count || 0), 0);
        
        for (const config of benefitConfigs) {
          const meetsApprovalThreshold = approvalCount >= config.approval_threshold && 
            (config.approval_threshold_max ? approvalCount <= config.approval_threshold_max : true);
          
          const meetsViewThreshold = config.view_threshold 
            ? viewCount >= config.view_threshold 
            : true;
          
          if (!meetsApprovalThreshold || !meetsViewThreshold) {
            notEligibleData.push({
              doctor: doctor.toPublicJSON(),
              config: config.toJSON(),
              approvalCount,
              viewCount,
              reason: !meetsApprovalThreshold 
                ? `Needs ${config.approval_threshold}${config.approval_threshold_max ? `-${config.approval_threshold_max}` : '+'} approvals (has ${approvalCount})`
                : `Needs ${config.view_threshold}+ views (has ${viewCount})`
            });
          }
        }
      }
      
      // Apply search filter to not eligible data
      if (search && typeof search === 'string') {
        const searchLower = search.toLowerCase();
        notEligibleData = notEligibleData.filter(item => 
          item.doctor?.doctor_name?.toLowerCase().includes(searchLower) ||
          item.doctor?.clinic_name?.toLowerCase().includes(searchLower) ||
          item.config?.title?.toLowerCase().includes(searchLower)
        );
      }
      
      // Return special format for not eligible
      res.json({
        success: true,
        data: notEligibleData,
        filter: 'not_eligible'
      });
      return;
    }

    // Apply search filter
    if (search && typeof search === 'string') {
      const searchLower = search.toLowerCase();
      eligibilities = eligibilities.filter(e => 
        e.doctor?.doctor_name?.toLowerCase().includes(searchLower) ||
        e.doctor?.clinic_name?.toLowerCase().includes(searchLower) ||
        e.benefit_config?.title?.toLowerCase().includes(searchLower) ||
        e.research_paper?.title?.toLowerCase().includes(searchLower)
      );
    }

    // Ensure only the highest award per research paper is shown (for all filters)
    // Group by research_paper_id and keep only the one with highest approval_threshold
    const paperEligibilityMap = new Map<string, typeof eligibilities[0]>();
    const doctorConfigMap = new Map<string, typeof eligibilities[0]>();
    
    for (const eligibility of eligibilities) {
      if (eligibility.research_paper_id && eligibility.benefit_config) {
        // Has research_paper_id - group by paper
        const paperId = eligibility.research_paper_id;
        const existing = paperEligibilityMap.get(paperId);
        
        if (!existing) {
          paperEligibilityMap.set(paperId, eligibility);
        } else {
          // Compare approval_threshold - keep the one with higher threshold
          const existingThreshold = existing.benefit_config?.approval_threshold || 0;
          const currentThreshold = eligibility.benefit_config.approval_threshold || 0;
          
          if (currentThreshold > existingThreshold) {
            paperEligibilityMap.set(paperId, eligibility);
          } else if (currentThreshold === existingThreshold) {
            // Same threshold - keep the one with higher benefit_value or newer
            const existingValue = existing.benefit_config?.benefit_value || 0;
            const currentValue = eligibility.benefit_config.benefit_value || 0;
            
            if (currentValue > existingValue || 
                (currentValue === existingValue && eligibility.created_at > existing.created_at)) {
              paperEligibilityMap.set(paperId, eligibility);
            }
          }
        }
      } else {
        // No research_paper_id - group by doctor+config to avoid duplicates
        const key = `${eligibility.doctor_id}_${eligibility.benefit_config_id}`;
        const existing = doctorConfigMap.get(key);
        
        if (!existing) {
          doctorConfigMap.set(key, eligibility);
        } else {
          // Keep the newer one or one with higher threshold
          const existingThreshold = existing.benefit_config?.approval_threshold || 0;
          const currentThreshold = eligibility.benefit_config?.approval_threshold || 0;
          
          if (currentThreshold > existingThreshold || 
              (currentThreshold === existingThreshold && eligibility.created_at > existing.created_at)) {
            doctorConfigMap.set(key, eligibility);
          }
        }
      }
    }
    
    // Combine both maps into final array
    eligibilities = [
      ...Array.from(paperEligibilityMap.values()),
      ...Array.from(doctorConfigMap.values())
    ];

    // Add category metadata to each eligibility
    const eligibilitiesWithCategory = await Promise.all(
      eligibilities.map(async (eligibility) => {
        let category = 'pending';
        let cooldownRemainingDays = null;
        
        if (eligibility.status === 'delivered') {
          // Check if this delivered eligibility is still in cooldown and doctor is still eligible
          if (eligibility.benefit_config && eligibility.delivered_at) {
            const config = eligibility.benefit_config;
            if (config.cooldown_days > 0) {
              const daysSinceLastDelivery = Math.floor(
                (now.getTime() - new Date(eligibility.delivered_at).getTime()) / (1000 * 60 * 60 * 24)
              );
              
              if (daysSinceLastDelivery < config.cooldown_days) {
                // Check if doctor still meets eligibility criteria
                const doctor = eligibility.doctor;
                if (doctor) {
                  const approvedPapers = await researchRepository.find({
                    where: {
                      doctor_id: doctor.id,
                      is_approved: true
                    }
                  });
                  
                  const approvalCount = approvedPapers.reduce((sum, paper) => sum + (paper.upvote_count || 0), 0);
                  const viewCount = approvedPapers.reduce((sum, paper) => sum + (paper.view_count || 0), 0);
                  
                  const meetsApprovalThreshold = approvalCount >= config.approval_threshold && 
                    (config.approval_threshold_max ? approvalCount <= config.approval_threshold_max : true);
                  
                  const meetsViewThreshold = config.view_threshold 
                    ? viewCount >= config.view_threshold 
                    : true;
                  
                  const allDeliveredForThisConfig = await eligibilityRepository.find({
                    where: {
                      doctor_id: doctor.id,
                      benefit_config_id: config.id,
                      status: 'delivered'
                    }
                  });
                  
                  if (meetsApprovalThreshold && meetsViewThreshold && 
                      allDeliveredForThisConfig.length < config.max_awards_per_doctor) {
                    // Still eligible but in cooldown
                    category = 'cooldown';
                    cooldownRemainingDays = Math.max(0, config.cooldown_days - daysSinceLastDelivery);
                  } else {
                    category = 'delivered'; // Delivered but no longer eligible or max reached
                  }
                } else {
                  category = 'delivered';
                }
              } else {
                category = 'delivered'; // Cooldown expired
              }
            } else {
              category = 'delivered';
            }
          } else {
            category = 'delivered';
          }
        } else if (eligibility.status === 'eligible' && eligibility.benefit_config) {
          const config = eligibility.benefit_config;
          
          // Check if doctor still meets eligibility criteria for this specific paper
          // If eligibility has research_paper_id, check that paper's upvotes
          // Otherwise, check total (for backward compatibility with old records)
          let stillEligible = false;
          if (eligibility.research_paper_id) {
            // Check per-paper eligibility
            const paper = await researchRepository.findOne({
              where: { id: eligibility.research_paper_id }
            });
            if (paper) {
              const paperUpvoteCount = paper.upvote_count || 0;
              const paperViewCount = paper.view_count || 0;
              const meetsApprovalThreshold = paperUpvoteCount >= config.approval_threshold && 
                (config.approval_threshold_max ? paperUpvoteCount <= config.approval_threshold_max : true);
              const meetsViewThreshold = config.view_threshold 
                ? paperViewCount >= config.view_threshold 
                : true;
              stillEligible = meetsApprovalThreshold && meetsViewThreshold;
            }
          } else {
            // Backward compatibility: check total approvals
            const doctor = eligibility.doctor;
            if (doctor) {
              const approvedPapers = await researchRepository.find({
                where: {
                  doctor_id: doctor.id,
                  is_approved: true
                }
              });
              const approvalCount = approvedPapers.reduce((sum, paper) => sum + (paper.upvote_count || 0), 0);
              const viewCount = approvedPapers.reduce((sum, paper) => sum + (paper.view_count || 0), 0);
              const meetsApprovalThreshold = approvalCount >= config.approval_threshold && 
                (config.approval_threshold_max ? approvalCount <= config.approval_threshold_max : true);
              const meetsViewThreshold = config.view_threshold 
                ? viewCount >= config.view_threshold 
                : true;
              stillEligible = meetsApprovalThreshold && meetsViewThreshold;
            }
          }

          if (!stillEligible) {
            category = 'not_eligible'; // Paper/doctor no longer meets criteria
          } else {
            category = 'pending'; // Eligible and pending delivery
          }
        } else if (eligibility.status === 'cancelled') {
          category = 'rejected'; // Rejected (auto-rejected or manually cancelled)
        }

        const json = eligibility.toJSON();
        return {
          ...json,
          category,
          cooldown_remaining_days: cooldownRemainingDays
        };
      })
    );

    res.json({
      success: true,
      data: eligibilitiesWithCategory,
      filter: filter || 'all'
    });
  } catch (error: unknown) {
    console.error('Get reward eligibility error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch reward eligibility records'
    });
  }
};

/**
 * Update reward delivery status (admin only)
 */
export const updateRewardDeliveryStatus = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const eligibilityRepository = AppDataSource.getRepository(ResearchRewardEligibility);
    const doctorRepository = AppDataSource.getRepository(Doctor);
    const researchRepository = AppDataSource.getRepository(ResearchPaper);
    const { ResearchPaperUpvote } = await import('../models/ResearchPaperUpvote');
    const upvoteRepository = AppDataSource.getRepository(ResearchPaperUpvote);
    
    const { id } = req.params;
    const { status, notes } = req.body;
    const admin = req.user!;

    const eligibility = await eligibilityRepository.findOne({
      where: { id },
      relations: ['doctor', 'benefit_config', 'research_paper']
    });

    if (!eligibility) {
      res.status(404).json({
        success: false,
        message: 'Reward eligibility record not found'
      });
      return;
    }

    const wasDelivered = eligibility.status === 'delivered';
    const isNowDelivered = status === 'delivered';

    // Update status
    eligibility.status = status;
    eligibility.notes = notes;
    
    if (status === 'delivered') {
      eligibility.delivered_at = new Date();
      eligibility.delivered_by = admin.id;

      // Auto-apply benefits when status changes to "Delivered"
      if (!wasDelivered && eligibility.benefit_config) {
        const config = eligibility.benefit_config;
        const doctor = eligibility.doctor;

        if (!doctor) {
          console.error(`❌ Doctor not found for eligibility ${id}`);
          res.status(400).json({
            success: false,
            message: 'Doctor not found for this eligibility record'
          });
          return;
        }

        console.log(`📧 Preparing to send delivery notification for award: ${config.title} (${config.benefit_type}) to Dr. ${doctor.doctor_name} (${doctor.email})`);

        try {
          if (config.benefit_type === 'tier_progress') {
            // Apply tier progress
            const currentProgress = parseFloat(String(doctor.tier_progress || 0));
            const bonusProgress = parseFloat(String(config.benefit_value || 0));
            const newProgress = Math.min(100, currentProgress + bonusProgress);
            
            // Get tier configurations to check if tier should advance
            const tierRepository = AppDataSource.getRepository(TierConfig);
            const tiers = await tierRepository.find({
              where: { is_active: true },
              order: { display_order: 'ASC' }
            });
            
            // Find current tier
            let currentTier = tiers.find(t => t.name === doctor.tier) || tiers[0];
            let currentTierIndex = tiers.findIndex(t => t.name === doctor.tier);
            if (currentTierIndex === -1) currentTierIndex = 0;
            
            // If progress reaches 100%, check if should advance to next tier
            if (newProgress >= 100 && currentTier) {
              const nextTier = currentTierIndex < tiers.length - 1 ? tiers[currentTierIndex + 1] : null;
              if (nextTier) {
                // Advance to next tier
                const oldTier = doctor.tier;
                doctor.tier = nextTier.name;
                doctor.tier_color = nextTier.color || 'gray';
                // Recalculate progress for new tier (start from 0% or calculate based on sales)
                const totalSales = parseFloat(String(doctor.current_sales || 0));
                const nextNextTier = currentTierIndex + 1 < tiers.length - 1 ? tiers[currentTierIndex + 2] : null;
                if (nextNextTier) {
                  const nextTierThreshold = parseFloat(nextTier.threshold.toString());
                  const nextNextTierThreshold = parseFloat(nextNextTier.threshold.toString());
                  const progress = ((totalSales - nextTierThreshold) / (nextNextTierThreshold - nextTierThreshold)) * 100;
                  doctor.tier_progress = Math.min(Math.max(progress, 0), 100);
                } else {
                  doctor.tier_progress = 100; // At highest tier
                }
                console.log(`🎉 Tier advanced from research boost: ${oldTier} → ${nextTier.name}`);
              } else {
                // At highest tier
                doctor.tier_progress = 100;
              }
            } else {
              doctor.tier_progress = newProgress;
            }
            
            await doctorRepository.save(doctor);
            
            console.log(`✅ Applied tier progress: +${bonusProgress}% to Dr. ${doctor.doctor_name} (${currentProgress}% → ${doctor.tier_progress}%)`);
            
            // Send email notification
            try {
              console.log(`📧 Sending tier progress notification email to ${doctor.email}...`);
              await gmailService.sendResearchRewardTierProgressNotification(
                doctor,
                config.title || 'Research Award',
                bonusProgress,
                currentProgress,
                newProgress
              );
              console.log(`✅ Tier progress notification email sent successfully to ${doctor.email}`);
            } catch (emailError) {
              console.error('❌ Failed to send tier progress notification email:', emailError);
              console.error('Error details:', emailError instanceof Error ? emailError.message : String(emailError));
              // Don't fail the status update if email fails
            }
          } else if (config.benefit_type === 'gift') {
            // For gift type awards, just send a delivery notification
            console.log(`📦 Gift award delivered: ${config.title} to Dr. ${doctor.doctor_name}`);
            
            // Send email notification for gift awards
            try {
              console.log(`📧 Sending gift award delivery notification email to ${doctor.email}...`);
              await gmailService.sendResearchRewardGiftNotification(
                doctor,
                config.title || 'Research Award',
                config.gift_description || 'Gift reward'
              );
              console.log(`✅ Gift award notification email sent successfully to ${doctor.email}`);
            } catch (emailError) {
              console.error('❌ Failed to send gift award notification email:', emailError);
              console.error('Error details:', emailError instanceof Error ? emailError.message : String(emailError));
              // Don't fail the status update if email fails
            }
          }
        } catch (benefitError) {
          console.error('❌ Error applying benefit:', benefitError);
          console.error('Error details:', benefitError instanceof Error ? benefitError.message : String(benefitError));
          // Don't fail the status update if benefit application fails
        }
      } else {
        console.log(`⚠️ No benefit config found for eligibility ${id} or already delivered`);
      }
    } else {
      eligibility.delivered_at = null;
      eligibility.delivered_by = null;
    }

    await eligibilityRepository.save(eligibility);

    res.json({
      success: true,
      data: eligibility.toJSON(),
      message: `Reward status updated to ${status}${isNowDelivered && !wasDelivered && eligibility.benefit_config?.benefit_type !== 'gift' ? '. Benefits have been automatically applied.' : ''}`
    });
  } catch (error: unknown) {
    console.error('Update reward delivery status error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update reward delivery status'
    });
  }
};

/**
 * Check eligibility for a specific benefit config (helper function)
 * This is called automatically when a config is created/updated
 */
const checkEligibilityForConfig = async (config: ResearchBenefitConfig): Promise<void> => {
  const eligibilityRepository = AppDataSource.getRepository(ResearchRewardEligibility);
  const benefitConfigRepository = AppDataSource.getRepository(ResearchBenefitConfig);
  const doctorRepository = AppDataSource.getRepository(Doctor);
  const researchRepository = AppDataSource.getRepository(ResearchPaper);

  // Get all approved doctors
  const doctors = await doctorRepository.find({
    where: { is_approved: true }
  });

  // Get all active configs sorted by threshold (highest first) for per-paper highest reward logic
  const allConfigs = await benefitConfigRepository.find({
    where: { is_active: true },
    order: { approval_threshold: 'DESC' }
  });

  for (const doctor of doctors) {
    // Get all approved papers for this doctor
    const approvedPapers = await researchRepository.find({
      where: {
        doctor_id: doctor.id,
        is_approved: true
      }
    });

    // Check each paper individually - one reward per paper (highest only)
    for (const paper of approvedPapers) {
      const paperUpvoteCount = paper.upvote_count || 0;
      const paperViewCount = paper.view_count || 0;

      // Find all configs this paper qualifies for
      const qualifyingConfigs = [];
      for (const checkConfig of allConfigs) {
        const meetsApprovalThreshold = paperUpvoteCount >= checkConfig.approval_threshold && 
          (checkConfig.approval_threshold_max ? paperUpvoteCount <= checkConfig.approval_threshold_max : true);
        
        const meetsViewThreshold = checkConfig.view_threshold 
          ? paperViewCount >= checkConfig.view_threshold 
          : true;
        
        if (meetsApprovalThreshold && meetsViewThreshold) {
          // Check anti-gaming: cooldown and max awards
          const deliveredEligibilities = await eligibilityRepository.find({
            where: {
              doctor_id: doctor.id,
              benefit_config_id: checkConfig.id,
              status: 'delivered'
            },
            order: { delivered_at: 'DESC' }
          });

          // Check max_awards_per_doctor limit
          if (deliveredEligibilities.length >= checkConfig.max_awards_per_doctor) {
            continue;
          }

          // Check cooldown_days - enforce cooldown to prevent gaming
          if (checkConfig.cooldown_days > 0 && deliveredEligibilities.length > 0) {
            const lastDelivery = deliveredEligibilities[0]?.delivered_at;
            if (lastDelivery) {
              const daysSinceLastDelivery = Math.floor(
                (Date.now() - new Date(lastDelivery).getTime()) / (1000 * 60 * 60 * 24)
              );
              
              if (daysSinceLastDelivery < checkConfig.cooldown_days) {
                continue; // In cooldown, skip
              }
            }
          }

          qualifyingConfigs.push(checkConfig);
        }
      }

      if (qualifyingConfigs.length === 0) {
        continue; // Paper doesn't qualify for any rewards
      }

      // Keep only the HIGHEST threshold reward (first one since sorted DESC)
      const highestConfig = qualifyingConfigs[0];
      if (!highestConfig) {
        continue; // Safety check
      }

      // Remove all lower-tier eligibilities for this paper
      const existingEligibilitiesForPaper = await eligibilityRepository.find({
        where: {
          research_paper_id: paper.id,
          status: 'eligible'
        }
      });

      for (const existingEligibility of existingEligibilitiesForPaper) {
        if (existingEligibility.benefit_config_id !== highestConfig.id) {
          const existingConfig = allConfigs.find(c => c.id === existingEligibility.benefit_config_id);
          if (existingConfig && existingConfig.approval_threshold < highestConfig.approval_threshold) {
            console.log(`   🗑️ Removing lower-tier eligibility for paper "${paper.title}": ${existingConfig.title}`);
            await eligibilityRepository.remove(existingEligibility);
          }
        }
      }

      // Check if highest eligibility already exists for this paper
      let existingHighestEligibility = await eligibilityRepository.findOne({
        where: {
          research_paper_id: paper.id,
          benefit_config_id: highestConfig.id
        }
      });

      // Also check for old records without research_paper_id (migration case)
      if (!existingHighestEligibility) {
        existingHighestEligibility = await eligibilityRepository.findOne({
          where: {
            doctor_id: doctor.id,
            benefit_config_id: highestConfig.id,
            research_paper_id: IsNull() // Old records might not have research_paper_id
          }
        });

        // If found, update it to link to this paper
        if (existingHighestEligibility) {
          existingHighestEligibility.research_paper_id = paper.id;
          existingHighestEligibility.approval_count = paperUpvoteCount;
          await eligibilityRepository.save(existingHighestEligibility);
          console.log(`   📝 Updated old eligibility record to link to paper "${paper.title}" - Award: ${highestConfig.title}, Upvotes: ${paperUpvoteCount}`);
          continue; // Skip to next paper
        }
      }

      if (!existingHighestEligibility) {
        // Create new eligibility record
        try {
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
        } catch (saveError: any) {
          // Handle unique constraint violation - might be a race condition or old record
          if (saveError.code === '23505' && saveError.constraint?.includes('doctor_id') && saveError.constraint?.includes('benefit_config_id')) {
            console.log(`   ⚠️ Duplicate constraint detected for doctor ${doctor.id} and config ${highestConfig.id}, attempting to find and update existing record...`);
            // Try to find and update the existing record
            const existingRecord = await eligibilityRepository.findOne({
              where: {
                doctor_id: doctor.id,
                benefit_config_id: highestConfig.id
              }
            });
            if (existingRecord) {
              existingRecord.research_paper_id = paper.id;
              existingRecord.approval_count = paperUpvoteCount;
              await eligibilityRepository.save(existingRecord);
              console.log(`   📝 Updated existing eligibility record for paper "${paper.title}" - Award: ${highestConfig.title}, Upvotes: ${paperUpvoteCount}`);
            }
          } else {
            throw saveError; // Re-throw if it's a different error
          }
        }
      } else {
        // Update existing record with new upvote count
        if (existingHighestEligibility.approval_count !== paperUpvoteCount || existingHighestEligibility.research_paper_id !== paper.id) {
          existingHighestEligibility.approval_count = paperUpvoteCount;
          existingHighestEligibility.research_paper_id = paper.id; // Ensure it's linked to this paper
          await eligibilityRepository.save(existingHighestEligibility);
          console.log(`📝 Updated eligibility for paper "${paper.title}" - Award: ${highestConfig.title}, Upvotes: ${paperUpvoteCount}`);
        }
      }
    }
  }
};

/**
 * Check and create reward eligibility for all users (admin only)
 */
export const checkRewardEligibility = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const eligibilityRepository = AppDataSource.getRepository(ResearchRewardEligibility);
    const benefitConfigRepository = AppDataSource.getRepository(ResearchBenefitConfig);
    const doctorRepository = AppDataSource.getRepository(Doctor);
    const researchRepository = AppDataSource.getRepository(ResearchPaper);

    // Get all active benefit configurations, sorted by threshold (highest first)
    const benefitConfigs = await benefitConfigRepository.find({
      where: { is_active: true },
      order: { approval_threshold: 'DESC' }
    });

    console.log(`🔍 Starting eligibility check for ${benefitConfigs.length} active benefit configs (per-paper, highest reward only)`);

    // Get all approved doctors
    const doctors = await doctorRepository.find({
      where: { is_approved: true }
    });

    console.log(`🔍 Checking ${doctors.length} approved doctors`);

    let createdCount = 0;
    let updatedCount = 0;
    let removedCount = 0;

    for (const doctor of doctors) {
      // Get all approved papers for this doctor
      const approvedPapers = await researchRepository.find({
        where: {
          doctor_id: doctor.id,
          is_approved: true
        }
      });

      console.log(`   Dr. ${doctor.doctor_name}: ${approvedPapers.length} approved papers`);

      // Check each paper individually - one reward per paper (highest only)
      for (const paper of approvedPapers) {
        const paperUpvoteCount = paper.upvote_count || 0;
        const paperViewCount = paper.view_count || 0;

        // Find all configs this paper qualifies for
        const qualifyingConfigs = [];
        for (const config of benefitConfigs) {
          const meetsApprovalThreshold = paperUpvoteCount >= config.approval_threshold && 
            (config.approval_threshold_max ? paperUpvoteCount <= config.approval_threshold_max : true);
          
          const meetsViewThreshold = config.view_threshold 
            ? paperViewCount >= config.view_threshold 
            : true;
          
          if (meetsApprovalThreshold && meetsViewThreshold) {
            // Check anti-gaming: cooldown and max awards
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
                  continue; // In cooldown, skip
                }
              }
            }

            qualifyingConfigs.push(config);
          }
        }

        if (qualifyingConfigs.length === 0) {
          continue; // Paper doesn't qualify for any rewards
        }

        // Keep only the HIGHEST threshold reward (first one since sorted DESC)
        const highestConfig = qualifyingConfigs[0];
        if (!highestConfig) {
          continue; // Safety check
        }

        // Remove all lower-tier eligibilities for this paper
        const existingEligibilitiesForPaper = await eligibilityRepository.find({
          where: {
            research_paper_id: paper.id,
            status: 'eligible'
          }
        });

        for (const existingEligibility of existingEligibilitiesForPaper) {
          if (existingEligibility.benefit_config_id !== highestConfig.id) {
            const existingConfig = benefitConfigs.find(c => c.id === existingEligibility.benefit_config_id);
            if (existingConfig && existingConfig.approval_threshold < highestConfig.approval_threshold) {
              console.log(`   🗑️ Removing lower-tier eligibility for paper "${paper.title}": ${existingConfig.title}`);
              await eligibilityRepository.remove(existingEligibility);
              removedCount++;
            }
          }
        }

        // Check if highest eligibility already exists for this paper
        let existingHighestEligibility = await eligibilityRepository.findOne({
          where: {
            research_paper_id: paper.id,
            benefit_config_id: highestConfig.id
          }
        });

        // Also check for old records without research_paper_id (migration case)
        if (!existingHighestEligibility) {
          existingHighestEligibility = await eligibilityRepository.findOne({
            where: {
              doctor_id: doctor.id,
              benefit_config_id: highestConfig.id,
              research_paper_id: IsNull() // Old records might not have research_paper_id
            }
          });

          // If found, update it to link to this paper
          if (existingHighestEligibility) {
            existingHighestEligibility.research_paper_id = paper.id;
            existingHighestEligibility.approval_count = paperUpvoteCount;
            await eligibilityRepository.save(existingHighestEligibility);
            updatedCount++;
            console.log(`   📝 Updated old eligibility record to link to paper "${paper.title}" - Award: ${highestConfig.title}, Upvotes: ${paperUpvoteCount}`);
            continue; // Skip to next paper
          }
        }

        if (!existingHighestEligibility) {
          // Create new eligibility record
          try {
            const newEligibility = eligibilityRepository.create({
              doctor_id: doctor.id,
              benefit_config_id: highestConfig.id,
              research_paper_id: paper.id,
              approval_count: paperUpvoteCount,
              is_eligible: true,
              status: 'eligible'
            });
            await eligibilityRepository.save(newEligibility);
            createdCount++;
            console.log(`   ✅ Created eligibility for paper "${paper.title}" - Award: ${highestConfig.title}, Upvotes: ${paperUpvoteCount}`);
          } catch (saveError: any) {
            // Handle unique constraint violation - might be a race condition or old record
            if (saveError.code === '23505' && saveError.constraint?.includes('doctor_id') && saveError.constraint?.includes('benefit_config_id')) {
              console.log(`   ⚠️ Duplicate constraint detected for doctor ${doctor.id} and config ${highestConfig.id}, attempting to find and update existing record...`);
              // Try to find and update the existing record
              const existingRecord = await eligibilityRepository.findOne({
                where: {
                  doctor_id: doctor.id,
                  benefit_config_id: highestConfig.id
                }
              });
              if (existingRecord) {
                existingRecord.research_paper_id = paper.id;
                existingRecord.approval_count = paperUpvoteCount;
                await eligibilityRepository.save(existingRecord);
                updatedCount++;
                console.log(`   📝 Updated existing eligibility record for paper "${paper.title}" - Award: ${highestConfig.title}, Upvotes: ${paperUpvoteCount}`);
              }
            } else {
              throw saveError; // Re-throw if it's a different error
            }
          }
        } else {
          // Update existing record with new upvote count
          if (existingHighestEligibility.approval_count !== paperUpvoteCount || existingHighestEligibility.research_paper_id !== paper.id) {
            existingHighestEligibility.approval_count = paperUpvoteCount;
            existingHighestEligibility.research_paper_id = paper.id; // Ensure it's linked to this paper
            await eligibilityRepository.save(existingHighestEligibility);
            updatedCount++;
            console.log(`   📝 Updated eligibility for paper "${paper.title}" - Award: ${highestConfig.title}, Upvotes: ${paperUpvoteCount}`);
          }
        }
      }
    }

    res.json({
      success: true,
      message: `Reward eligibility check completed. Created: ${createdCount}, Updated: ${updatedCount}, Removed (lower-tier): ${removedCount}`,
      data: {
        created: createdCount,
        updated: updatedCount
      }
    });
  } catch (error: unknown) {
    console.error('Check reward eligibility error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to check reward eligibility'
    });
  }
};

/**
 * Get all admin permissions (admin only)
 */
export const getAdminPermissions = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const permissionRepository = AppDataSource.getRepository(AdminPermission);
    
    const permissions = await permissionRepository.find({
      relations: ['doctor', 'granted_by_doctor'],
      order: { created_at: 'DESC' }
    });

    res.json({
      success: true,
      data: permissions.map(permission => permission.toJSON())
    });
  } catch (error: unknown) {
    console.error('Get admin permissions error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch admin permissions'
    });
  }
};

/**
 * Create or update admin permission (admin only)
 */
export const createOrUpdateAdminPermission = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const permissionRepository = AppDataSource.getRepository(AdminPermission);
    const doctorRepository = AppDataSource.getRepository(Doctor);
    const { doctor_id, permission_type, permissions, expires_at, notes } = req.body;
    const admin = req.user!;

    // Check if doctor exists
    const doctor = await doctorRepository.findOne({ where: { id: doctor_id } });
    if (!doctor) {
      res.status(404).json({
        success: false,
        message: 'Doctor not found'
      });
      return;
    }

    // Check if permission already exists
    const existingPermission = await permissionRepository.findOne({
      where: { doctor_id }
    });

    const permissionData: any = {
      doctor_id,
      permission_type,
      granted_by: admin.id,
      expires_at: expires_at ? new Date(expires_at) : null,
      notes
    };

    // Set permissions based on type
    if (permission_type === 'viewer') {
      permissionData.permissions = AdminPermission.getViewerPermissions();
    } else if (permission_type === 'full') {
      permissionData.permissions = AdminPermission.getFullPermissions();
    } else if (permission_type === 'custom') {
      permissionData.permissions = permissions || {};
    }

    let savedPermission;
    if (existingPermission) {
      // Update existing permission
      Object.assign(existingPermission, permissionData);
      savedPermission = await permissionRepository.save(existingPermission);
    } else {
      // Create new permission
      const newPermission = permissionRepository.create(permissionData);
      savedPermission = await permissionRepository.save(newPermission);
    }

    // CRITICAL: Automatically set is_admin flag when admin permission is granted
    // This ensures the user gets admin setup/applied immediately
    doctor.is_admin = true;
    await doctorRepository.save(doctor);

    const permissionResponse = Array.isArray(savedPermission) 
      ? (savedPermission[0] ? savedPermission[0].toJSON() : null)
      : (savedPermission ? savedPermission.toJSON() : null);
    res.json({
      success: true,
      data: permissionResponse,
      message: existingPermission ? 'Admin permission updated successfully' : 'Admin permission created successfully. User has been granted admin access.'
    });
    } catch (error: unknown) {
    console.error('Create/update admin permission error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create/update admin permission'
    });
  }
};

/**
 * Delete admin permission (admin only)
 * SECURITY: Full admin users cannot delete parent admin's permissions
 */
export const deleteAdminPermission = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const permissionRepository = AppDataSource.getRepository(AdminPermission);
    const doctorRepository = AppDataSource.getRepository(Doctor);
    const { id } = req.params;
    const currentUser = req.user!;

    const permission = await permissionRepository.findOne({ 
      where: { id },
      relations: ['granted_by_doctor', 'doctor']
    });
    if (!permission) {
      res.status(404).json({
        success: false,
        message: 'Admin permission not found'
      });
      return;
    }

    // ABSOLUTE RULE: Child admins (even Full Admin) CANNOT delete parent admin's permissions
    const { isChildAdmin, canDeleteRecord, isTargetParentAdmin, isParentAdmin } = await import('../utils/adminPermissionHelper');
    const currentUserIsParentAdmin = await isParentAdmin(currentUser.id);
    const currentUserIsChildAdmin = await isChildAdmin(currentUser.id);
    
    // Get the parent admin who granted this permission
    const parentAdminId = permission.granted_by;
    const grantorIsParentAdmin = await isTargetParentAdmin(parentAdminId);
    
    // Check if permission belongs to a parent admin
    const permissionOwnerIsParentAdmin = await isTargetParentAdmin(permission.doctor_id);
    
    // ABSOLUTE RULE: Child admin CANNOT delete parent admin's permissions or records
    if (currentUserIsChildAdmin) {
      if (grantorIsParentAdmin || permissionOwnerIsParentAdmin) {
        res.status(403).json({
          success: false,
          message: 'Child Admin users cannot delete parent admin permissions or records. This action is absolutely restricted. Only parent admins can perform this action.'
        });
        return;
      }
    }

    // Additional check using helper function
    const deleteCheck = await canDeleteRecord(currentUser.id, currentUserIsParentAdmin, permission.doctor_id, permissionOwnerIsParentAdmin);
    
    if (!deleteCheck.allowed) {
      res.status(403).json({
        success: false,
        message: deleteCheck.reason || 'You do not have permission to delete this admin permission'
      });
      return;
    }

    // Remove admin permission
    await permissionRepository.remove(permission);

    // CRITICAL: Remove is_admin flag when admin permission is deleted
    // Only remove if this was the only admin permission
    const remainingPermissions = await permissionRepository.count({
      where: { doctor_id: permission.doctor_id, is_active: true }
    });

    if (remainingPermissions === 0) {
      const doctor = await doctorRepository.findOne({ where: { id: permission.doctor_id } });
      if (doctor) {
        doctor.is_admin = false;
        await doctorRepository.save(doctor);
      }
    }

    res.json({
      success: true,
      message: 'Admin permission deleted successfully'
    });
  } catch (error: unknown) {
    console.error('Delete admin permission error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete admin permission'
    });
  }
};

/**
 * Get available doctors for admin permission assignment (admin only)
 */
export const getAvailableDoctorsForAdmin = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const doctorRepository = AppDataSource.getRepository(Doctor);
    const permissionRepository = AppDataSource.getRepository(AdminPermission);

    // Get all approved doctors
    const doctors = await doctorRepository.find({
      where: { is_approved: true },
      select: ['id', 'doctor_name', 'clinic_name', 'email', 'is_admin']
    });

    // Get existing admin permissions
    const existingPermissions = await permissionRepository.find({
      select: ['doctor_id', 'permission_type', 'is_active']
    });

    // Filter out doctors who already have admin permissions
    const availableDoctors = doctors.filter(doctor => {
      const hasPermission = existingPermissions.some(perm => 
        perm.doctor_id === doctor.id && perm.is_active
      );
      return !hasPermission;
    });

    res.json({
      success: true,
      data: availableDoctors.map(doctor => ({
        id: doctor.id,
        doctor_name: doctor.doctor_name,
        clinic_name: doctor.clinic_name,
        email: doctor.email,
        is_admin: doctor.is_admin
      }))
    });
  } catch (error: unknown) {
    console.error('Get available doctors error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch available doctors'
    });
  }
};

/**
 * Get user's admin permissions (for middleware)
 */
export const getUserAdminPermissions = async (userId: string): Promise<AdminPermission | null> => {
  try {
    const permissionRepository = AppDataSource.getRepository(AdminPermission);
    
    const permission = await permissionRepository.findOne({
      where: { 
        doctor_id: userId,
        is_active: true
      },
      relations: ['doctor']
    });

    return permission;
  } catch (error: unknown) {
    console.error('Get user admin permissions error:', error);
    return null;
  }
};

/**
 * Get current user's admin permission (for frontend)
 */
export const getCurrentUserAdminPermission = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;
    
    // First check if user has admin permission record (even if is_admin is false)
    const permission = await getUserAdminPermissions(userId);
    
    if (permission) {
      // Check if permission is expired
      if (permission.expires_at && new Date() > permission.expires_at) {
        res.status(403).json({
          success: false,
          message: 'Admin permission has expired'
        });
        return;
      }
      
      // Check if permission is active
      if (!permission.is_active) {
        res.status(403).json({
          success: false,
          message: 'Admin permission is not active'
        });
        return;
      }
      
      // User is a CHILD ADMIN (has permission record)
      res.json({
        success: true,
        data: {
          hasPermission: true,
          permission: permission.toJSON(),
          permissionType: permission.permission_type,
          isMainAdmin: false,
          isParentAdmin: false,
          isChildAdmin: true
        }
      });
      return;
    }
    
    // If no permission record, check if user is parent admin (is_admin flag)
    if (req.user!.is_admin) {
      // PARENT ADMIN (main admin without permission record - they grant permissions)
      res.json({
        success: true,
        data: {
          hasPermission: true,
          permission: null,
          permissionType: 'full' as const,
          isMainAdmin: true,
          isParentAdmin: true,
          isChildAdmin: false
        }
      });
      return;
    }
    
    // No admin permission found
    res.json({
      success: false,
      message: 'No admin permission found',
      data: {
        hasPermission: false,
        permission: null,
        permissionType: 'viewer' as const,
        isMainAdmin: false,
        isParentAdmin: false,
        isChildAdmin: false
      }
    });
  } catch (error: unknown) {
    console.error('Get current user admin permission error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch admin permission'
    });
  }
};

/**
 * Approve user (admin only)
 * SECURITY: Viewer admin cannot approve
 */
export const approveUser = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const admin = req.user!;
    
    // Check admin access and permissions
    const currentUserPermission = await getUserAdminPermissions(admin.id);
    const isMainAdmin = admin.is_admin && !currentUserPermission;
    const isViewerAdmin = currentUserPermission?.permission_type === 'viewer';
    
    // Viewer admin can only view, not approve
    if (isViewerAdmin) {
      res.status(403).json({
        success: false,
        message: 'Viewer Admin can only view records. Approval operations are not allowed.'
      });
      return;
    }

    const doctorRepository = AppDataSource.getRepository(Doctor);
    const doctor = await doctorRepository.findOne({ where: { id } });

    if (!doctor) {
      res.status(404).json({
        success: false,
        message: 'User not found'
      });
      return;
    }

    if (doctor.is_approved) {
      res.status(400).json({
        success: false,
        message: 'User is already approved'
      });
      return;
    }

    doctor.is_approved = true;
    doctor.approved_at = new Date();

    await doctorRepository.save(doctor);

    // SECURITY: Log user approval
    const auditLogger = require('../middleware/auditLog').default;
    auditLogger.log({
      userId: admin.id,
      userEmail: admin.email,
      userType: admin.user_type || 'unknown',
      action: 'APPROVE_USER',
      resource: 'user',
      resourceId: id,
      ipAddress: auditLogger.getClientIp(req),
      userAgent: req.headers['user-agent'] || 'unknown',
      details: {
        targetUserId: id,
        targetUserEmail: doctor.email,
        targetUserName: doctor.doctor_name
      },
      success: true
    });

    res.json({
      success: true,
      message: 'User approved successfully'
    });
  } catch (error: unknown) {
    console.error('Approve user error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to approve user'
    });
  }
};

/**
 * Reject user (admin only)
 * SECURITY: Viewer admin cannot reject, Full admin cannot delete parent admin
 */
export const rejectUser = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const admin = req.user!;
    
    // Check admin access and permissions
    const currentUserPermission = await getUserAdminPermissions(admin.id);
    const isMainAdmin = admin.is_admin && !currentUserPermission;
    const isViewerAdmin = currentUserPermission?.permission_type === 'viewer';
    
    // Viewer admin can only view, not reject
    if (isViewerAdmin) {
      res.status(403).json({
        success: false,
        message: 'Viewer Admin can only view records. Rejection operations are not allowed.'
      });
      return;
    }

    const doctorRepository = AppDataSource.getRepository(Doctor);
    const doctor = await doctorRepository.findOne({ where: { id } });

    if (!doctor) {
      res.status(404).json({
        success: false,
        message: 'User not found'
      });
      return;
    }

    if (doctor.is_approved) {
      res.status(400).json({
        success: false,
        message: 'User is already approved'
      });
      return;
    }

    // ABSOLUTE RULE: Child admins (even Full Admin) CANNOT delete parent admin records
    const { isChildAdmin, isTargetParentAdmin, isParentAdmin } = await import('../utils/adminPermissionHelper');
    const currentUserIsChildAdmin = await isChildAdmin(admin.id);
    const currentUserIsParentAdmin = await isParentAdmin(admin.id);
    const targetIsParentAdmin = await isTargetParentAdmin(id);
    
    // ABSOLUTE RULE: Child admin CANNOT delete parent admin
    if (currentUserIsChildAdmin && targetIsParentAdmin) {
      res.status(403).json({
        success: false,
        message: 'Child Admin users cannot delete parent admin records. This action is absolutely restricted. Only parent admins can perform this action.'
      });
      return;
    }

    // SECURITY: Log user rejection before deletion
    const auditLogger = require('../middleware/auditLog').default;
    auditLogger.log({
      userId: admin.id,
      userEmail: admin.email,
      userType: admin.user_type || 'unknown',
      action: 'REJECT_USER',
      resource: 'user',
      resourceId: id,
      ipAddress: auditLogger.getClientIp(req),
      userAgent: req.headers['user-agent'] || 'unknown',
      details: {
        targetUserId: id,
        targetUserEmail: doctor.email,
        targetUserName: doctor.doctor_name,
        action: 'User rejected and deleted'
      },
      success: true
    });

    // For now, we'll just delete the user if rejected
    await doctorRepository.remove(doctor);

    res.json({
      success: true,
      message: 'User rejected and removed successfully'
    });
  } catch (error: unknown) {
    console.error('Reject user error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to reject user'
    });
  }
};

/**
 * Deactivate user (admin only) - preserves data but removes access
 */
export const deactivateUser = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const admin = req.user!;

    const doctorRepository = AppDataSource.getRepository(Doctor);
    const doctor = await doctorRepository.findOne({ where: { id } });

    if (!doctor) {
      res.status(404).json({
        success: false,
        message: 'User not found'
      });
      return;
    }

    // Don't allow deactivating admin users
    if (doctor.is_admin) {
      res.status(400).json({
        success: false,
        message: 'Cannot deactivate admin users'
      });
      return;
    }

    // Check if user is already deactivated
    if (doctor.is_deactivated) {
      res.status(400).json({
        success: false,
        message: 'User is already deactivated'
      });
      return;
    }

    // SECURITY: Log user deactivation
    const auditLogger = require('../middleware/auditLog').default;
    auditLogger.log({
      userId: admin.id,
      userEmail: admin.email,
      userType: admin.user_type || 'unknown',
      action: 'DEACTIVATE_USER',
      resource: 'user',
      resourceId: id,
      ipAddress: auditLogger.getClientIp(req),
      userAgent: req.headers['user-agent'] || 'unknown',
      details: {
        targetUserId: id,
        targetUserEmail: doctor.email,
        targetUserName: doctor.doctor_name,
        reason: 'Admin deactivation'
      },
      success: true
    });

    // Deactivate the user (preserves all data)
    doctor.is_deactivated = true;
    await doctorRepository.save(doctor);

    res.json({
      success: true,
      message: 'User deactivated successfully. They will no longer have access to the system, but their data is preserved.'
    });
  } catch (error: unknown) {
    console.error('Deactivate user error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to deactivate user'
    });
  }
};

/**
 * Reactivate user (admin only) - restores access
 */
export const reactivateUser = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const admin = req.user!;

    const doctorRepository = AppDataSource.getRepository(Doctor);
    const doctor = await doctorRepository.findOne({ where: { id } });

    if (!doctor) {
      res.status(404).json({
        success: false,
        message: 'User not found'
      });
      return;
    }

    // Check if user is not deactivated
    if (!doctor.is_deactivated) {
      res.status(400).json({
        success: false,
        message: 'User is not deactivated'
      });
      return;
    }

    // SECURITY: Log user reactivation
    const auditLogger = require('../middleware/auditLog').default;
    auditLogger.log({
      userId: admin.id,
      userEmail: admin.email,
      userType: admin.user_type || 'unknown',
      action: 'REACTIVATE_USER',
      resource: 'user',
      resourceId: id,
      ipAddress: auditLogger.getClientIp(req),
      userAgent: req.headers['user-agent'] || 'unknown',
      details: {
        targetUserId: id,
        targetUserEmail: doctor.email,
        targetUserName: doctor.doctor_name,
        reason: 'Admin reactivation'
      },
      success: true
    });

    // Reactivate the user
    doctor.is_deactivated = false;
    await doctorRepository.save(doctor);

    res.json({
      success: true,
      message: 'User reactivated successfully. They now have access to the system again.'
    });
  } catch (error: unknown) {
    console.error('Reactivate user error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to reactivate user'
    });
  }
};

/**
 * Delete user (admin only) - permanently removes user and all associated data
 * SECURITY: Viewer admin cannot delete, Full admin cannot delete parent admin
 */
export const deleteUser = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const admin = req.user!;
    
    // Check admin access and permissions
    const currentUserPermission = await getUserAdminPermissions(admin.id);
    const isMainAdmin = admin.is_admin && !currentUserPermission;
    const isViewerAdmin = currentUserPermission?.permission_type === 'viewer';
    
    // Viewer admin can only view, not delete
    if (isViewerAdmin) {
      res.status(403).json({
        success: false,
        message: 'Viewer Admin can only view records. Deletion operations are not allowed.'
      });
      return;
    }

    const doctorRepository = AppDataSource.getRepository(Doctor);
    const doctor = await doctorRepository.findOne({ where: { id } });

    if (!doctor) {
      res.status(404).json({
        success: false,
        message: 'User not found'
      });
      return;
    }

    // Don't allow deleting admin users
    if (doctor.is_admin) {
      res.status(400).json({
        success: false,
        message: 'Cannot delete admin users. Please deactivate them instead.'
      });
      return;
    }

    // ABSOLUTE RULE: Child admins (even Full Admin) CANNOT delete parent admin records
    const { isChildAdmin, isTargetParentAdmin } = await import('../utils/adminPermissionHelper');
    const currentUserIsChildAdmin = await isChildAdmin(admin.id);
    const targetIsParentAdmin = await isTargetParentAdmin(id);
    
    // ABSOLUTE RULE: Child admin CANNOT delete parent admin
    if (currentUserIsChildAdmin && targetIsParentAdmin) {
      res.status(403).json({
        success: false,
        message: 'Child admins cannot delete parent admin records'
      });
      return;
    }

    // SECURITY: Log user deletion (which is actually deactivation)
    const auditLogger = require('../middleware/auditLog').default;
    auditLogger.log({
      userId: admin.id,
      userEmail: admin.email,
      userType: admin.user_type || 'unknown',
      action: 'DELETE_USER',
      resource: 'user',
      resourceId: id,
      ipAddress: auditLogger.getClientIp(req),
      userAgent: req.headers['user-agent'] || 'unknown',
      details: {
        targetUserId: id,
        targetUserEmail: doctor.email,
        targetUserName: doctor.doctor_name,
        action: 'User deleted (access revoked, data preserved)'
      },
      success: true
    });

    // Delete means user loses access but data remains in the system
    // This is like deactivation but stricter - user cannot regain access
    console.log('🗑️ Deleting user (revoking access, preserving data):', doctor.email, doctor.id);
    
    // Set user as deactivated (this revokes access)
    doctor.is_deactivated = true;
    await doctorRepository.save(doctor);
    
    console.log('✅ User access revoked successfully. All user data has been preserved in the system.');

    res.json({
      success: true,
      message: 'User deleted successfully. The user has lost access to their account, but all data remains in the system.'
    });
  } catch (error: unknown) {
    console.error('❌ Delete user error:', error);
    if (error instanceof Error) {
      console.error('❌ Error message:', error.message);
      console.error('❌ Error stack:', error.stack);
    }
    res.status(500).json({
      success: false,
      message: `Failed to delete user: ${error instanceof Error ? error.message : 'Unknown error'}`
    });
  }
};

/**
 * Update research settings (admin only)
 */
export const updateResearchSettings = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { monthly_submission_limit, minimum_tier_for_approval } = req.body;
    const settingsRepository = AppDataSource.getRepository(ResearchSettings);

    // Update or create monthly_paper_limit setting (used by research controller)
    // Also save as monthly_submission_limit for backward compatibility
    let monthlyLimitSetting = await settingsRepository.findOne({ 
      where: { setting_key: 'monthly_paper_limit' } 
    });
    
    if (monthlyLimitSetting) {
      monthlyLimitSetting.setting_value = String(monthly_submission_limit);
      monthlyLimitSetting.description = 'Maximum number of research papers a user can submit per month';
      await settingsRepository.save(monthlyLimitSetting);
    } else {
      monthlyLimitSetting = settingsRepository.create({
        setting_key: 'monthly_paper_limit',
        setting_value: String(monthly_submission_limit),
        description: 'Maximum number of research papers a user can submit per month'
      });
      await settingsRepository.save(monthlyLimitSetting);
    }
    
    // Also save as monthly_submission_limit for backward compatibility
    let monthlySubmissionLimitSetting = await settingsRepository.findOne({ 
      where: { setting_key: 'monthly_submission_limit' } 
    });
    
    if (monthlySubmissionLimitSetting) {
      monthlySubmissionLimitSetting.setting_value = String(monthly_submission_limit);
      monthlySubmissionLimitSetting.description = 'Maximum number of research papers a user can submit per month';
      await settingsRepository.save(monthlySubmissionLimitSetting);
    } else {
      monthlySubmissionLimitSetting = settingsRepository.create({
        setting_key: 'monthly_submission_limit',
        setting_value: String(monthly_submission_limit),
        description: 'Maximum number of research papers a user can submit per month'
      });
      await settingsRepository.save(monthlySubmissionLimitSetting);
    }

    // Update or create minimum_tier_for_approval setting
    let minimumTierSetting = await settingsRepository.findOne({ 
      where: { setting_key: 'minimum_tier_for_approval' } 
    });
    
    if (minimumTierSetting) {
      minimumTierSetting.setting_value = minimum_tier_for_approval;
      minimumTierSetting.description = 'Minimum tier required to approve research papers';
      await settingsRepository.save(minimumTierSetting);
    } else {
      minimumTierSetting = settingsRepository.create({
        setting_key: 'minimum_tier_for_approval',
        setting_value: minimum_tier_for_approval,
        description: 'Minimum tier required to approve research papers'
      });
      await settingsRepository.save(minimumTierSetting);
    }

    res.json({
      success: true,
      message: 'Research settings updated successfully',
      data: {
        monthly_submission_limit: monthlyLimitSetting.setting_value,
        minimum_tier_for_approval: minimumTierSetting.setting_value
      }
    });
  } catch (error: unknown) {
    console.error('Update research settings error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update research settings',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

/**
 * Get research settings (admin only)
 */
export const getResearchSettings = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const settingsRepository = AppDataSource.getRepository(ResearchSettings);

    // Check both keys for backward compatibility (monthly_paper_limit is used by research controller)
    const monthlyLimitSetting = await settingsRepository.findOne({ 
      where: { setting_key: 'monthly_paper_limit' } 
    }) || await settingsRepository.findOne({ 
      where: { setting_key: 'monthly_submission_limit' } 
    });
    
    const minimumTierSetting = await settingsRepository.findOne({ 
      where: { setting_key: 'minimum_tier_for_approval' } 
    });

    res.json({
      success: true,
      data: {
        monthly_submission_limit: monthlyLimitSetting ? parseInt(monthlyLimitSetting.setting_value) : 3,
        minimum_tier_for_approval: minimumTierSetting ? minimumTierSetting.setting_value : 'Lead Contributor'
      }
    });
  } catch (error: unknown) {
    console.error('Get research settings error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch research settings',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

/**
 * Assign order to employee (admin only)
 */
export const assignOrderToEmployee = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { orderId, employeeId } = req.body;

    if (!orderId || !employeeId) {
      res.status(400).json({
        success: false,
        message: 'Order ID and Employee ID are required'
      });
      return;
    }

    const orderRepository = AppDataSource.getRepository(Order);
    const doctorRepository = AppDataSource.getRepository(Doctor);

    // Verify employee exists and is an employee
    const employee = await doctorRepository.findOne({
      where: { id: employeeId, user_type: UserType.EMPLOYEE }
    });

    if (!employee) {
      res.status(404).json({
        success: false,
        message: 'Employee not found'
      });
      return;
    }

    if (!employee.is_approved) {
      res.status(400).json({
        success: false,
        message: 'Employee is not approved. Please approve the employee first.'
      });
      return;
    }

    // Check if employee is deactivated
    if (employee.is_deactivated) {
      res.status(400).json({
        success: false,
        message: 'Employee is deactivated. Please reactivate the employee first.'
      });
      return;
    }

    // Get order with relations
    const order = await orderRepository.findOne({
      where: { id: orderId },
      relations: ['doctor', 'product', 'assigned_employee']
    });

    if (!order) {
      res.status(404).json({
        success: false,
        message: 'Order not found'
      });
      return;
    }

    if (order.status !== 'accepted' && order.status !== 'pending') {
      res.status(400).json({
        success: false,
        message: 'Order must be accepted or pending before assignment'
      });
      return;
    }

    // Assign order to employee
    order.assigned_employee_id = employeeId;
    order.delivery_status = 'assigned';
    order.delivery_assigned_at = new Date();
    
    // If order is pending, mark it as accepted
    if (order.status === 'pending') {
      order.status = 'accepted';
      order.accept();
    }

    await orderRepository.save(order);

    // Send notifications in background (non-blocking)
    // Send Gmail notification to customer with delivery information
    if (order.doctor) {
      gmailService.sendDeliveryAssignedNotification(order)
        .then(() => {
          console.log('✅ Order assignment - Customer notification sent successfully (background)');
        })
        .catch((error: unknown) => {
          console.error('⚠️ Order assignment - Customer notification failed (non-blocking):', error);
        });
    }

    // Send Gmail notification to employee about the assigned order
    if (employee.email) {
      gmailService.sendEmployeeAssignmentNotification(order, employee)
        .then(() => {
          console.log('✅ Order assignment - Employee notification sent successfully (background)');
        })
        .catch((error: unknown) => {
          console.error('⚠️ Order assignment - Employee notification failed (non-blocking):', error);
        });
    }

    // Return response immediately after saving to database
    res.json({
      success: true,
      message: 'Order assigned to employee successfully',
      data: order.toJSON()
    });
  } catch (error: unknown) {
    console.error('Assign order to employee error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to assign order to employee'
    });
  }
};