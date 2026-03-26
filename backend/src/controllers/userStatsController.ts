import { Request, Response } from 'express';
import { AppDataSource } from '../db/data-source';
import { Doctor } from '../models/Doctor';
import { ResearchPaper } from '../models/ResearchPaper';
import { ResearchPaperView } from '../models/ResearchPaperView';
import { ResearchPaperUpvote } from '../models/ResearchPaperUpvote';
import { LeaderboardSnapshot } from '../models/LeaderboardSnapshot';
import { Certificate } from '../models/Certificate';
import { TierConfig } from '../models/TierConfig';
import { Badge } from '../models/Badge';

interface UserStats {
  // Basic Info
  id: string;
  doctor_id: number;
  name: string;
  display_name?: string;
  email: string;
  clinic_name: string;
  whatsapp: string;
  bio: string;
  tags: string[];
  profile_photo_url: string;
  is_approved: boolean;
  is_admin: boolean;
  join_date: string;
  
  // Statistics
  total_research_papers: number;
  total_views: number;
  total_upvotes: number;
  average_rating: number;
  
  // Ranking & Progress
  tier: string;
  current_sales: number;
  tier_progress: number;
  leaderboard_position: number;
  total_doctors: number;
  
  // Progress to next rank
  next_rank: string;
  next_rank_score: number;
  progress_percentage: number;
  points_to_next_rank: number;
  
  // Medals & Badges
  gold_medals: number;
  silver_medals: number;
  bronze_medals: number;
  total_medals: number;
  achievement_badges: number;
  milestone_badges: number;
  special_badges: number;
  total_badges: number;
  
  // Monthly Performance
  is_top_3_monthly: boolean;
  monthly_rank: number;
  is_top_previous_month: boolean;
  previous_month_rank: number;
  
  // Research Papers Data
  research_papers: Array<{
    id: string;
    title: string;
    category: string;
    views: number;
    upvotes: number;
    downloads: number;
    rating: number;
    published: string;
    description: string;
    tags: string[];
  }>;
  
  // Medals Data
  medals: Array<{
    id: number;
    name: string;
    type: 'gold' | 'silver' | 'bronze' | 'platinum';
    month: string;
    year: number;
    description: string;
    icon: string;
  }>;
  
  // Badges Data
  badges: Array<{
    id: number;
    name: string;
    type: 'achievement' | 'milestone' | 'special';
    earned_date: string;
    description: string;
    icon: string;
    color: string;
  }>;

  // Certificates Data
  certificates: Array<{
    id: string;
    certificate_type: string;
    title: string;
    subtitle?: string;
    description: string;
    achievement?: string;
    tier_name?: string;
    rank?: number;
    month?: string;
    year?: number;
    status: string;
    issued_at?: string;
    verified_at?: string;
    certificate_url?: string;
    verification_code?: string;
  }>;
}

// Tier progression mapping
const TIER_PROGRESSION = {
  'Lead Starter': { next: 'Elite Lead', required: 100000 },
  'Elite Lead': { next: 'Grand Lead', required: 3000000 },
  'Grand Lead': { next: 'Diamond Lead', required: 10000000 },
  'Diamond Lead': { next: 'Platinum Lead', required: 50000000 },
  'Platinum Lead': { next: 'Master Lead', required: 100000000 },
  'Master Lead': { next: 'Legendary Lead', required: 500000000 },
  'Legendary Lead': { next: 'Ultimate Lead', required: 1000000000 }
};

export const updateUserProfile = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { clinic_name, whatsapp, tags, bio } = req.body;

    if (!id) {
      res.status(400).json({ success: false, error: 'User ID is required' });
      return;
    }

    // Check authorization - user must be admin or profile owner
    const user = (req as any).user;
    if (!user) {
      res.status(401).json({ success: false, error: 'Authentication required' });
      return;
    }

    const doctorRepository = AppDataSource.getRepository(Doctor);

    // Find the doctor
    const doctor = await doctorRepository.findOne({
      where: { id }
    });

    if (!doctor) {
      res.status(404).json({ success: false, error: 'Doctor not found' });
      return;
    }

    // Authorization check: only admins or profile owners can edit
    const isAdmin = user.is_admin === true;
    const isOwner = user.id === id || user.doctor_id === doctor.doctor_id;
    
    if (!isAdmin && !isOwner) {
      res.status(403).json({ 
        success: false, 
        error: 'You do not have permission to edit this profile. Only admins or profile owners can edit.' 
      });
      return;
    }

    // Update fields if provided
    if (clinic_name !== undefined) {
      doctor.clinic_name = clinic_name.trim();
    }
    if (whatsapp !== undefined) {
      doctor.whatsapp = whatsapp.trim() || null;
    }
    if (bio !== undefined) {
      doctor.bio = bio.trim() || null;
    }
    if (tags !== undefined) {
      doctor.tags = Array.isArray(tags) ? tags : [];
    }

    // Save the updated doctor
    await doctorRepository.save(doctor);

    res.json({
      success: true,
      message: 'Profile updated successfully',
      data: {
        clinic_name: doctor.clinic_name,
        whatsapp: doctor.whatsapp,
        bio: doctor.bio,
        tags: doctor.tags
      }
    });

  } catch (error: unknown) {
    console.error('Error updating user profile:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to update profile',
      details: error instanceof Error ? (error instanceof Error ? error.message : String(error)) : 'Unknown error'
    });
  }
};

export const getUserStats = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    
    if (!id) {
      res.status(400).json({ error: 'User ID is required' });
      return;
    }

    const doctorRepository = AppDataSource.getRepository(Doctor);
    const researchPaperRepository = AppDataSource.getRepository(ResearchPaper);
    const leaderboardRepository = AppDataSource.getRepository(LeaderboardSnapshot);

    // Get user basic info first (required for validation)
    const doctor = await doctorRepository.findOne({
      where: { id }
      // Removed heavy relations to speed up initial query
    });

    if (!doctor) {
      res.status(404).json({ 
        success: false,
        error: 'User not found' 
      });
      return;
    }

    // Regular users (non-doctors) do not have profiles - only doctors have profiles
    // Admins can view any profile, but regular users cannot access profiles
    if (doctor.user_type !== 'doctor') {
      res.status(403).json({ 
        success: false,
        error: 'Regular users do not have profiles. Only doctors have profiles.' 
      });
      return;
    }

    // Run multiple queries in parallel for better performance
    const [
      researchPapers,
      totalDoctors,
      doctorsWithSales
    ] = await Promise.all([
      // Get research papers statistics
      researchPaperRepository.find({
        where: { doctor_id: id, is_approved: true },
        order: { created_at: 'DESC' }
      }),
      
      // Get total doctors count (exclude admin users)
      doctorRepository.count({
        where: { is_approved: true, is_admin: false }
      }),
      
      // Calculate current rank dynamically based on current sales (exclude admin users)
      doctorRepository
        .createQueryBuilder('doctor')
        .select(['doctor.id', 'doctor.current_sales', 'doctor.created_at'])
        .where('doctor.is_approved = :approved AND doctor.is_admin = :admin', { 
          approved: true, 
          admin: false 
        })
        .andWhere('doctor.user_type = :userType', { userType: 'doctor' })
        .orderBy('doctor.current_sales', 'DESC')
        .addOrderBy('doctor.created_at', 'ASC')
        .getMany()
    ]);

    // Calculate total views and upvotes
    const totalViews = researchPapers.reduce((sum, paper) => sum + paper.view_count, 0);
    const totalUpvotes = researchPapers.reduce((sum, paper) => sum + paper.upvote_count, 0);
    
    // Calculate average rating (simplified - using upvotes/views ratio)
    const averageRating = totalViews > 0 ? Math.min(5.0, (totalUpvotes / totalViews) * 5) : 0;

    // Skip tier/rank calculations for regular users and employees - they are not part of the tier system
    const isRegularUser = doctor.user_type !== 'doctor';
    
    // Find current user's rank (only for doctors)
    const currentUserRank = isRegularUser ? 0 : doctorsWithSales.findIndex(d => d.id === id) + 1;
    const currentUserSales = doctor.current_sales || 0;

    // Get leaderboard position (for monthly performance tracking) - only for doctors
    const currentMonth = new Date();
    currentMonth.setDate(1); // First day of current month
    
    // Get previous month date
    const previousMonth = new Date();
    previousMonth.setMonth(previousMonth.getMonth() - 1);
    previousMonth.setDate(1);

    // Run leaderboard queries in parallel
    const [leaderboardSnapshot, previousMonthSnapshot, medalHistory] = await Promise.all([
      // Current month snapshot
      isRegularUser ? Promise.resolve(null) : leaderboardRepository.findOne({
        where: { 
          doctor_id: id,
          snapshot_date: currentMonth
        },
        order: { created_at: 'DESC' }
      }),
      
      // Previous month snapshot
      leaderboardRepository.findOne({
        where: { 
          doctor_id: id,
          snapshot_date: previousMonth
        },
        order: { created_at: 'DESC' }
      }),
      
      // Medal history (based on unique monthly rankings) - only for doctors
      isRegularUser ? Promise.resolve([]) : leaderboardRepository.find({
        where: { doctor_id: id },
        order: { snapshot_date: 'DESC' }
      })
    ]);

    // Calculate rank progress (percentage-based) - only for doctors
    const currentTier = isRegularUser ? null : doctor.tier;
    const tierInfo = isRegularUser ? null : TIER_PROGRESSION[currentTier as keyof typeof TIER_PROGRESSION];
    const nextRank = isRegularUser ? null : (tierInfo ? tierInfo.next : 'Max Level');
    
    // Use tier_progress field for percentage-based progress - only for doctors
    const progressPercentage = isRegularUser ? 0 : parseFloat(doctor.tier_progress.toString()) || 0;
    const nextRankScore = isRegularUser ? 0 : (tierInfo ? tierInfo.required : doctor.current_sales);
    
    // Calculate points to next rank based on percentage - only for doctors
    const pointsToNextRank = isRegularUser ? 0 : (tierInfo ? 
      Math.round((100 - progressPercentage) / 100 * tierInfo.required) : 0);

    // Count unique months for each medal type
    const uniqueMonths = new Set();
    let goldMedals = 0;
    let silverMedals = 0;
    let bronzeMedals = 0;

    medalHistory.forEach(snapshot => {
      const snapshotDate = new Date(snapshot.snapshot_date);
      const monthKey = `${snapshotDate.getFullYear()}-${snapshotDate.getMonth()}`;
      
      if (!uniqueMonths.has(monthKey)) {
        uniqueMonths.add(monthKey);
        
        if (snapshot.rank === 1) goldMedals++;
        else if (snapshot.rank === 2) silverMedals++;
        else if (snapshot.rank === 3) bronzeMedals++;
      }
    });

    // Generate research papers data
    const researchPapersData = researchPapers.map((paper, index) => {
      // Ensure publishedDate is always a string
      const publishedDate = (paper.is_approved && paper.created_at 
        ? paper.created_at.toISOString().split('T')[0] 
        : new Date().toISOString().split('T')[0]) as string;
      
      return {
        id: paper.id,
        title: paper.title,
        category: paper.tags[0] || 'General',
        views: paper.view_count,
        upvotes: paper.upvote_count,
        downloads: Math.floor(paper.view_count * 0.3), // Estimated downloads
        rating: paper.view_count > 0 ? Math.min(5.0, (paper.upvote_count / paper.view_count) * 5) : 0,
        published: publishedDate,
        description: (paper.abstract || '').substring(0, 150) + '...',
        tags: paper.tags
      };
    });

    // Generate medals data (based on unique monthly rankings)
    const medalsData: any[] = [];
    const processedMonths = new Set();
    let medalId = 1;

    medalHistory.forEach((snapshot) => {
      const snapshotDate = new Date(snapshot.snapshot_date);
      const monthKey = `${snapshotDate.getFullYear()}-${snapshotDate.getMonth()}`;
      
      if (!processedMonths.has(monthKey) && snapshot.rank <= 3) {
        processedMonths.add(monthKey);
        
        const medalType = snapshot.rank === 1 ? 'gold' : snapshot.rank === 2 ? 'silver' : 'bronze';
        const medalIcon = snapshot.rank === 1 ? '🥇' : snapshot.rank === 2 ? '🥈' : '🥉';
        const medalName = snapshot.rank === 1 ? 'Gold Medal Winner' : 
                         snapshot.rank === 2 ? 'Silver Medal Winner' : 'Bronze Medal Winner';
        
        medalsData.push({
          id: medalId++,
          name: medalName,
          type: medalType,
          month: snapshotDate.toLocaleDateString('en-US', { month: 'long' }),
          year: snapshotDate.getFullYear(),
          description: `${medalName} for ${snapshotDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}`,
          icon: medalIcon
        });
      }
    });

    // Get certificates and badges in parallel
    const certificateRepository = AppDataSource.getRepository(Certificate);
    const badgeRepository = AppDataSource.getRepository(Badge);
    
    const [certificates, dbBadges] = await Promise.all([
      certificateRepository.find({
        where: { doctor_id: id },
        order: { issued_at: 'DESC' }
      }),
      badgeRepository.find({
        where: { 
          doctor_id: id,
          is_active: true
        },
        order: { earned_date: 'DESC' }
      })
    ]);

    // Generate certificates for all tiers the user has achieved (up to current tier)
    // NOTE: Certificate generation is done in background (non-blocking) to prevent timeouts
    if (doctor.tier) {
      // Start certificate generation in background (don't await)
      (async () => {
        try {
          const tierRepository = AppDataSource.getRepository(TierConfig);
          const allTiers = await tierRepository.find({
            where: { is_active: true },
            order: { display_order: 'ASC' }
          });

          // Find current tier index
          const currentTierIndex = allTiers.findIndex(t => t.name === doctor.tier);
          
          // Generate certificates for all tiers up to and including current tier
          if (currentTierIndex >= 0) {
            const { CertificateService } = await import('../services/certificateService');

            for (let i = 0; i <= currentTierIndex; i++) {
              const tier = allTiers[i];
              if (!tier) continue;

              // Check if certificate already exists for this tier
              const existingCert = certificates.find(
                cert => cert.certificate_type === 'tier_achievement' && cert.tier_name === tier.name
              );

              if (!existingCert) {
                try {
                  // Generate certificate for this tier (background)
                  await CertificateService.sendCertificate(
                    doctor,
                    tier,
                    doctor.approved_at || doctor.created_at || new Date()
                  );
                  console.log(`✅ Background: Generated certificate for ${tier.name}`);
                } catch (certError) {
                  console.error(`❌ Background: Error generating certificate for ${tier.name}:`, certError);
                }
              }
            }
          }
        } catch (error) {
          console.error('❌ Background certificate generation error:', error);
        }
      })().catch(err => console.error('Background certificate generation failed:', err));
    }

    // Convert database badges to the expected format (badges already fetched above in parallel)
    const badgesData: Array<{
      id: number;
      name: string;
      type: 'achievement' | 'milestone' | 'special';
      earned_date: string;
      description: string;
      icon: string;
      color: string;
    }> = dbBadges.map((badge, index) => {
      const earnedDate: string = (badge.earned_date 
        ? badge.earned_date.toISOString().split('T')[0] 
        : new Date().toISOString().split('T')[0]) as string;
      
      return {
        id: index + 1, // Frontend expects numeric IDs
        name: badge.name,
        type: badge.badge_type as 'achievement' | 'milestone' | 'special',
        earned_date: earnedDate,
        description: badge.description,
        icon: badge.icon,
        color: badge.color
      };
    });

    const userStats: UserStats = {
      // Basic Info
      id: doctor.id,
      doctor_id: doctor.doctor_id || 0,
      name: doctor.doctor_name,
      display_name: doctor.display_name,
      email: doctor.email,
      clinic_name: doctor.clinic_name || '',
      whatsapp: doctor.whatsapp || '',
      bio: doctor.bio || '',
      tags: doctor.tags || [],
      profile_photo_url: doctor.profile_photo_url || '',
      is_approved: doctor.is_approved,
      is_admin: doctor.is_admin,
      join_date: (doctor.created_at ? doctor.created_at.toISOString().split('T')[0] : new Date().toISOString().split('T')[0]) as string,
      
      // Statistics
      total_research_papers: researchPapers.length,
      total_views: totalViews,
      total_upvotes: totalUpvotes,
      average_rating: Math.round(averageRating * 10) / 10,
      
      // Ranking & Progress (only for doctors)
      tier: isRegularUser ? '' : (doctor.tier || ''),
      current_sales: doctor.current_sales || 0,
      tier_progress: isRegularUser ? 0 : doctor.tier_progress,
      leaderboard_position: isRegularUser ? 0 : currentUserRank,
      total_doctors: totalDoctors,
      
      // Progress to next rank (percentage-based) - only for doctors
      next_rank: isRegularUser ? '' : (nextRank || ''),
      next_rank_score: isRegularUser ? 0 : nextRankScore,
      progress_percentage: isRegularUser ? 0 : Math.round(progressPercentage * 10) / 10,
      points_to_next_rank: isRegularUser ? 0 : Math.round(pointsToNextRank),
      
      // Medals & Badges (only for doctors)
      gold_medals: isRegularUser ? 0 : goldMedals,
      silver_medals: isRegularUser ? 0 : silverMedals,
      bronze_medals: isRegularUser ? 0 : bronzeMedals,
      total_medals: isRegularUser ? 0 : (goldMedals + silverMedals + bronzeMedals),
      achievement_badges: badgesData.filter(b => b.type === 'achievement').length,
      milestone_badges: badgesData.filter(b => b.type === 'milestone').length,
      special_badges: badgesData.filter(b => b.type === 'special').length,
      total_badges: badgesData.length,
      
      // Monthly Performance (only for doctors)
      is_top_3_monthly: isRegularUser ? false : (currentUserRank <= 3),
      monthly_rank: isRegularUser ? 0 : currentUserRank,
      is_top_previous_month: isRegularUser ? false : (previousMonthSnapshot ? previousMonthSnapshot.rank <= 3 : false),
      previous_month_rank: isRegularUser ? 0 : (previousMonthSnapshot?.rank || totalDoctors),
      
      // Data Arrays
      research_papers: researchPapersData,
      medals: medalsData,
      badges: badgesData,
      certificates: certificates.map(cert => ({
        id: cert.id,
        certificate_type: cert.certificate_type,
        title: cert.title,
        subtitle: cert.subtitle,
        description: cert.description,
        achievement: cert.achievement,
        tier_name: cert.tier_name,
        rank: cert.rank,
        month: cert.month,
        year: cert.year,
        status: cert.status,
        issued_at: cert.issued_at?.toISOString(),
        verified_at: cert.verified_at?.toISOString(),
        certificate_url: cert.certificate_url,
        verification_code: cert.verification_code
      }))
    };

    // Disable caching for this endpoint to ensure fresh data
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');

    res.json({
      success: true,
      data: userStats
    });

  } catch (error: unknown) {
    console.error('Error fetching user stats:', error);
    res.status(500).json({ 
      error: 'Failed to fetch user statistics',
      details: error instanceof Error ? (error instanceof Error ? error.message : String(error)) : 'Unknown error'
    });
  }
};
