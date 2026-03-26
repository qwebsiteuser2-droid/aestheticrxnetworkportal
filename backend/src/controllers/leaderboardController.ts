import { Request, Response } from 'express';
import { AppDataSource } from '../db/data-source';
import { Doctor } from '../models/Doctor';
import { TierConfig } from '../models/TierConfig';
import { LeaderboardSnapshot } from '../models/LeaderboardSnapshot';
import { Team } from '../entities/Team';
import { TeamMember } from '../entities/TeamMember';
import { AuthenticatedRequest } from '../types/auth';

/**
 * Get leaderboard data
 */
export const getLeaderboard = async (req: Request, res: Response): Promise<void> => {
  try {
    const doctorRepository = AppDataSource.getRepository(Doctor);
    const tierRepository = AppDataSource.getRepository(TierConfig);
    const snapshotRepository = AppDataSource.getRepository(LeaderboardSnapshot);

    // Get active tier configurations
    const tiers = await tierRepository.find({
      where: { is_active: true },
      order: { display_order: 'ASC' }
    });


            // Get team-based leaderboard data
            const teamRepository = AppDataSource.getRepository(Team);
            const teamMemberRepository = AppDataSource.getRepository(TeamMember);
            
            // Get all teams with their members
            const teams = await teamRepository.find({
              relations: ['members', 'members.doctor'],
              order: { total_sales: 'DESC' }
            });
            
            // Get ALL doctors (including team members) - individual profiles remain even if part of team
            // Exclude regular users and employees
            const allDoctors = await doctorRepository
              .createQueryBuilder('doctor')
              .where('doctor.is_approved = :approved AND doctor.is_admin = :admin', {
                approved: true, 
                admin: false 
              })
              .andWhere('doctor.user_type = :userType', { userType: 'doctor' })
              .orderBy('doctor.current_sales', 'DESC')
              .getMany();
            
            // Create leaderboard entries
            const leaderboardEntries = [];
            
            // Add team entries (teams as single entries) - exclude teams led by admin users
            for (const team of teams) {
              if (team.members && team.members.length > 0) {
                // Check if team leader is an admin user
                const teamLeader = team.members.find(member => member.is_leader);
                if (teamLeader && teamLeader.doctor && teamLeader.doctor.is_admin) {
                  continue; // Skip teams led by admin users
                }
                // Add team as a single entry
                const teamEntry = {
                  id: team.id, // Use team ID
                  doctor_id: team.leader_id, // Use team leader's ID as primary
                  doctor_name: team.name, // Show team name
                  clinic_name: `Team (${team.members.length} members)`, // Show team info
                  profile_photo_url: team.members.find(m => m.is_leader)?.doctor.profile_photo_url || null,
                  created_at: team.created_at,
                  tier: team.tier, // Show team tier
                  current_sales: team.total_sales, // Show team total sales
                  tier_progress: team.tier_progress || 0,
                  next_tier: team.next_tier,
                  remaining_amount: team.remaining_amount,
                  is_team: true,
                  team_name: team.name,
                  is_leader: true, // Team entry represents the team
                  team_members: team.members.map(m => ({
                    doctor_name: m.doctor.doctor_name,
                    clinic_name: m.doctor.clinic_name,
                    current_sales: m.doctor.current_sales,
                    is_leader: m.is_leader
                  }))
                };
                leaderboardEntries.push(teamEntry);
              }
            }
            
            // Get all team member UUIDs to exclude from individual leaderboard
            // TeamMember.doctor_id is a UUID that references doctors.id (UUID), not doctor_id (number)
            const teamMemberUuids = new Set<string>();
            for (const team of teams) {
              if (team.members && team.members.length > 0) {
                team.members.forEach(member => {
                  // Use member.doctor_id (UUID) directly, or member.doctor.id if relation is loaded
                  if (member.doctor_id) {
                    teamMemberUuids.add(member.doctor_id);
                  } else if (member.doctor && member.doctor.id) {
                    teamMemberUuids.add(member.doctor.id);
                  }
                });
              }
            }
            
            // Add only solo doctor entries (exclude doctors who are team members)
            for (const doctor of allDoctors) {
              // Skip if doctor is a member of any team (compare UUIDs)
              if (teamMemberUuids.has(doctor.id)) {
                continue; // Don't show individual rank if they're in a team
              }
              
              const doctorEntry = {
                id: doctor.id,
                doctor_id: doctor.doctor_id,
                doctor_name: doctor.doctor_name,
                clinic_name: doctor.clinic_name,
                profile_photo_url: doctor.profile_photo_url,
                created_at: doctor.created_at,
                tier: doctor.tier,
                current_sales: doctor.current_sales,
                tier_progress: doctor.tier_progress || 0,
                is_team: false,
                team_members: []
              };
              leaderboardEntries.push(doctorEntry);
            }
            
            // Sort by total sales (teams and solo doctors together)
            leaderboardEntries.sort((a, b) => (b.current_sales || 0) - (a.current_sales || 0));

            // Process leaderboard entries
            const leaderboard = leaderboardEntries.map((entry, index) => {
              const totalSales = typeof entry.current_sales === 'number' ? entry.current_sales : parseFloat(String(entry.current_sales || 0));
              const tierProgress = typeof entry.tier_progress === 'number' ? entry.tier_progress : parseFloat(String(entry.tier_progress || 0));
              
              // For team entries, use the team tier directly
              // For solo entries, find the tier from individual tier configs
              let currentTier, currentTierIndex;
              if (entry.is_team) {
                // For teams, use the team tier directly
                currentTier = { name: entry.tier, threshold: 0 };
                currentTierIndex = 0;
              } else {
                // For solo doctors, find from individual tier configs
                currentTier = tiers.find(tier => tier.name === entry.tier) || tiers[0];
                currentTierIndex = tiers.findIndex(tier => tier.name === entry.tier);
              }

              // For team entries, use the team's own next_tier and remaining_amount
              // For solo entries, calculate from individual tier configs
              let nextTierName, remainingAmount;
              
              if (entry.is_team) {
                // Use team's own next_tier and remaining_amount
                nextTierName = (entry as any).next_tier;
                remainingAmount = (entry as any).remaining_amount || 0;
              } else {
                // Calculate for solo doctors
                const nextTier = currentTierIndex < tiers.length - 1 ? tiers[currentTierIndex + 1] : null;
                nextTierName = nextTier?.name || null;
                
                if (nextTier) {
                  const nextTierThreshold = parseFloat(nextTier.threshold.toString());
                  remainingAmount = Math.max(nextTierThreshold - totalSales, 0);
                } else {
                  remainingAmount = 0;
                }
              }

              return {
                id: entry.id,
                doctor_id: entry.doctor_id,
                clinic_name: entry.clinic_name,
                doctor_name: entry.doctor_name,
                profile_photo_url: entry.profile_photo_url,
                tier: currentTier?.name || 'New Contributor',
                tier_progress: tierProgress,
                next_tier: nextTierName,
                remaining_amount: remainingAmount,
                current_sales: totalSales,
                rank: index + 1,
                total_doctors: leaderboardEntries.length,
                is_team: entry.is_team || false,
                team_name: (entry as any).team_name || null,
                is_leader: (entry as any).is_leader || false,
                team_members: (entry as any).team_members || []
              };
            });

    res.json({
      success: true,
      data: {
        leaderboard,
        tiers: tiers.map(tier => tier.toJSON())
      }
    });
  } catch (error: unknown) {
    console.error('Error fetching leaderboard:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch leaderboard',
      error: error instanceof Error ? (error instanceof Error ? error.message : String(error)) : 'Unknown error'
    });
  }
};

/**
 * Get user's leaderboard position (authenticated)
 */
export const getUserLeaderboardPosition = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const user = req.user!;
    const doctorRepository = AppDataSource.getRepository(Doctor);
    const tierRepository = AppDataSource.getRepository(TierConfig);

    // Get active tier configurations
    const tiers = await tierRepository.find({
      where: { is_active: true },
      order: { display_order: 'ASC' }
    });

    // Get all doctors with their total sales (exclude admin users)
    const doctorsWithSales = await doctorRepository
      .createQueryBuilder('doctor')
      .leftJoin('doctor.orders', 'order')
      .select([
        'doctor.id',
        'doctor.doctor_id',
        'doctor.doctor_name',
        'doctor.clinic_name',
        'doctor.created_at'
      ])
      .addSelect('COALESCE(SUM(order.order_total), 0)', 'total_sales')
      .where('doctor.is_approved = :approved AND doctor.is_admin = :admin', { 
        approved: true, 
        admin: false 
      })
      .andWhere('doctor.user_type = :userType', { userType: 'doctor' })
      .groupBy('doctor.id')
      .orderBy('total_sales', 'DESC')
      .getRawMany();

    // Find user's position
    const userIndex = doctorsWithSales.findIndex(doctor => doctor.doctor_id === user.doctor_id);
    
    if (userIndex === -1) {
      res.status(404).json({
        success: false,
        message: 'User not found in leaderboard'
      });
      return;
    }

    // Get user's total sales
    const userSales = parseFloat(doctorsWithSales[userIndex].total_sales) || 0;
    
    // Find current tier based on sales
    let currentTier = tiers[0]; // Default to first tier
    let currentTierIndex = 0;
    for (let i = tiers.length - 1; i >= 0; i--) {
      const tier = tiers[i];
      if (tier && tier.threshold !== null && tier.threshold !== undefined) {
        const thresholdValue = parseFloat(tier.threshold.toString());
        if (!isNaN(thresholdValue) && userSales >= thresholdValue) {
          currentTier = tier;
          currentTierIndex = i;
          break;
        }
      }
    }

    // Find next tier for progress calculation
    const nextTier = currentTierIndex < tiers.length - 1 ? tiers[currentTierIndex + 1] : null;
    
    let tierProgress = 0;
    let nextTierThreshold = 0;
    let remainingAmount = 0;
    
    if (nextTier && currentTier) {
      const currentTierThreshold = parseFloat(currentTier.threshold.toString());
      nextTierThreshold = parseFloat(nextTier.threshold.toString());
      const progress = ((userSales - currentTierThreshold) / (nextTierThreshold - currentTierThreshold)) * 100;
      tierProgress = Math.min(Math.max(progress, 0), 100);
      remainingAmount = Math.max(nextTierThreshold - userSales, 0);
    } else {
      // If at highest tier, show 100% progress
      tierProgress = 100;
      remainingAmount = 0;
    }

    const userPosition = {
      id: user.id,
      doctor_id: user.doctor_id,
      clinic_name: user.clinic_name,
      doctor_name: user.doctor_name,
      profile_photo_url: user.profile_photo_url,
      tier: currentTier?.name || tiers[0]?.name || 'Unknown',
      tier_progress: tierProgress,
      next_tier: nextTier?.name || null,
      remaining_amount: remainingAmount,
      current_sales: userSales,
      rank: userIndex + 1,
      total_doctors: doctorsWithSales.length
    };

    res.json({
      success: true,
      data: {
        position: userPosition,
        tiers: tiers.map(tier => tier.toJSON())
      }
    });
  } catch (error: unknown) {
    console.error('Error fetching user leaderboard position:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch user leaderboard position',
      error: error instanceof Error ? (error instanceof Error ? error.message : String(error)) : 'Unknown error'
    });
  }
};

// Admin: Get leaderboard with sales data (admin only) - Updated to use team-based logic
export const getAdminLeaderboard = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const user = req.user!;
    if (!user.is_admin) {
      res.status(403).json({
        success: false,
        message: 'Admin access required'
      });
      return;
    }

    const doctorRepository = AppDataSource.getRepository(Doctor);
    const tierRepository = AppDataSource.getRepository(TierConfig);

    // Get active tier configurations
    const tiers = await tierRepository.find({
      where: { is_active: true },
      order: { display_order: 'ASC' }
    });

    // Get team-based leaderboard data (same logic as regular leaderboard)
    const teamRepository = AppDataSource.getRepository(Team);
    const teamMemberRepository = AppDataSource.getRepository(TeamMember);
    
    // Get all teams with their members
    const teams = await teamRepository.find({
      relations: ['members', 'members.doctor'],
      order: { total_sales: 'DESC' }
    });
    
    // Get ALL doctors (including team members) - individual profiles remain even if part of team
    // Including admin users for admin view
    const allDoctors = await doctorRepository
      .createQueryBuilder('doctor')
      .where('doctor.is_approved = :approved', { approved: true })
      .orderBy('doctor.current_sales', 'DESC')
      .getMany();
    
    // Create leaderboard entries
    const leaderboardEntries = [];
    
    // Add team entries (teams as single entries)
    for (const team of teams) {
      if (team.members && team.members.length > 0) {
        // Add team as a single entry
        const teamEntry = {
          id: team.id, // Use team ID
          doctor_id: team.leader_id, // Use team leader's ID as primary
          doctor_name: team.name, // Show team name
          clinic_name: `Team (${team.members.length} members)`, // Show team info
          profile_photo_url: team.members.find(m => m.is_leader)?.doctor.profile_photo_url || null,
          created_at: team.created_at,
          tier: team.tier, // Show team tier
          current_sales: team.total_sales, // Show team total sales
          tier_progress: team.tier_progress || 0,
          next_tier: team.next_tier,
          remaining_amount: team.remaining_amount,
          is_team: true,
          team_name: team.name,
          is_leader: true, // Team entry represents the team
          team_members: team.members.map(m => ({
            doctor_name: m.doctor.doctor_name,
            clinic_name: m.doctor.clinic_name,
            current_sales: m.doctor.current_sales,
            is_leader: m.is_leader
          }))
        };
        leaderboardEntries.push(teamEntry);
      }
    }
    
    // Get all team member UUIDs to exclude from individual leaderboard
    // TeamMember.doctor_id is a UUID that references doctors.id (UUID), not doctor_id (number)
    const teamMemberUuids = new Set<string>();
    for (const team of teams) {
      if (team.members && team.members.length > 0) {
        team.members.forEach(member => {
          // Use member.doctor_id (UUID) directly, or member.doctor.id if relation is loaded
          if (member.doctor_id) {
            teamMemberUuids.add(member.doctor_id);
          } else if (member.doctor && member.doctor.id) {
            teamMemberUuids.add(member.doctor.id);
          }
        });
      }
    }
    
    // Add only solo doctor entries (exclude doctors who are team members)
    for (const doctor of allDoctors) {
      // Skip if doctor is a member of any team (compare UUIDs)
      if (teamMemberUuids.has(doctor.id)) {
        continue; // Don't show individual rank if they're in a team
      }
      
      const doctorEntry = {
        id: doctor.id,
        doctor_id: doctor.doctor_id,
        doctor_name: doctor.doctor_name,
        clinic_name: doctor.clinic_name,
        profile_photo_url: doctor.profile_photo_url,
        created_at: doctor.created_at,
        tier: doctor.tier,
        current_sales: doctor.current_sales,
        tier_progress: doctor.tier_progress || 0,
        next_tier: (doctor as any).next_tier || null,
        remaining_amount: (doctor as any).remaining_amount || 0,
        is_team: false,
        is_leader: false,
        is_admin: doctor.is_admin
      };
      leaderboardEntries.push(doctorEntry);
    }
    
    // Sort by total sales (descending)
    leaderboardEntries.sort((a, b) => (b.current_sales || 0) - (a.current_sales || 0));

    const leaderboard = leaderboardEntries.map((entry, index) => {
      const totalSales = parseFloat(entry.current_sales?.toString() || '0') || 0;
      
      // Find current tier based on sales
      let currentTier = tiers[0]; // Default to first tier
      for (let i = tiers.length - 1; i >= 0; i--) {
        const tier = tiers[i];
        if (tier && tier.threshold !== null && tier.threshold !== undefined) {
          const thresholdValue = parseFloat(tier.threshold.toString());
          if (!isNaN(thresholdValue) && totalSales >= thresholdValue) {
            currentTier = tier;
            break;
          }
        }
      }

      // Find next tier for progress calculation
      const currentTierIndex = currentTier ? tiers.findIndex(t => t.name === currentTier.name) : -1;
      const nextTier = currentTierIndex < tiers.length - 1 ? tiers[currentTierIndex + 1] : null;
      
      let tierProgress = 0;
      let remainingAmount = 0;
      
      if (nextTier) {
        const currentTierThreshold = currentTier ? parseFloat(currentTier.threshold.toString()) : 0;
        const nextTierThreshold = parseFloat(nextTier.threshold.toString());
        const progress = ((totalSales - currentTierThreshold) / (nextTierThreshold - currentTierThreshold)) * 100;
        tierProgress = Math.min(Math.max(progress, 0), 100);
        remainingAmount = Math.max(nextTierThreshold - totalSales, 0);
      } else {
        // If at highest tier, show 100% progress
        tierProgress = 100;
        remainingAmount = 0;
      }

      return {
        id: entry.id,
        doctor_id: entry.doctor_id,
        clinic_name: entry.clinic_name,
        doctor_name: entry.doctor_name,
        profile_photo_url: entry.profile_photo_url,
        tier: currentTier?.name || tiers[0]?.name || 'Unknown',
        tier_progress: tierProgress,
        next_tier: nextTier?.name || null,
        remaining_amount: remainingAmount,
        current_sales: totalSales,
        rank: index + 1,
        total_doctors: leaderboardEntries.length,
        is_team: entry.is_team || false,
        team_name: (entry as any).team_name || null,
        is_leader: (entry as any).is_leader || false,
        team_members: (entry as any).team_members || [],
        is_admin: (entry as any).is_admin || false
      };
    });

    res.json({
      success: true,
      data: {
        leaderboard,
        tiers: tiers.map(tier => tier.toJSON())
      }
    });
  } catch (error: unknown) {
    console.error('Error fetching admin leaderboard:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch admin leaderboard' });
  }
};

/**
 * Get leaderboard settings (admin only)
 */
export const getLeaderboardSettings = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const user = req.user!;
    if (!user.is_admin) {
      res.status(403).json({
        success: false,
        message: 'Admin access required'
      });
      return;
    }

    // Get settings from database or return defaults
    const { AppDataSource } = await import('../db/data-source');
    const { ResearchSettings } = await import('../models/ResearchSettings');
    const settingsRepository = AppDataSource.getRepository(ResearchSettings);

    const maxTeamsPerUserSetting = await settingsRepository.findOne({ 
      where: { setting_key: 'max_teams_per_user' } 
    });
    const maxTeamMembersSetting = await settingsRepository.findOne({ 
      where: { setting_key: 'max_team_members' } 
    });
    const teamDiscountPercentageSetting = await settingsRepository.findOne({ 
      where: { setting_key: 'team_discount_percentage' } 
    });

    const settings = {
      maxTeamsPerUser: maxTeamsPerUserSetting ? parseInt(maxTeamsPerUserSetting.setting_value) : 1,
      maxTeamMembers: maxTeamMembersSetting ? parseInt(maxTeamMembersSetting.setting_value) : 3,
      teamDiscountPercentage: teamDiscountPercentageSetting ? parseFloat(teamDiscountPercentageSetting.setting_value) : 10,
      teamFormingEnabled: true,
      leaderboardUpdateFrequency: 'daily'
    };

    res.json({
      success: true,
      data: {
        settings
      }
    });
  } catch (error: unknown) {
    console.error('Error fetching leaderboard settings:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch leaderboard settings' });
  }
};

/**
 * Update leaderboard settings (admin only)
 */
export const updateLeaderboardSettings = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const user = req.user!;
    if (!user.is_admin) {
      res.status(403).json({
        success: false,
        message: 'Admin access required'
      });
      return;
    }

    const { maxTeamsPerUser, maxTeamMembers, teamDiscountPercentage } = req.body;

    // Validate input
    if (maxTeamsPerUser !== undefined && (isNaN(maxTeamsPerUser) || maxTeamsPerUser < 1 || maxTeamsPerUser > 10)) {
      res.status(400).json({
        success: false,
        message: 'Maximum teams per user must be between 1 and 10'
      });
      return;
    }

    if (maxTeamMembers !== undefined && (isNaN(maxTeamMembers) || maxTeamMembers < 2 || maxTeamMembers > 10)) {
      res.status(400).json({
        success: false,
        message: 'Maximum team members must be between 2 and 10'
      });
      return;
    }

    if (teamDiscountPercentage !== undefined && (isNaN(teamDiscountPercentage) || teamDiscountPercentage < 0 || teamDiscountPercentage > 100)) {
      res.status(400).json({
        success: false,
        message: 'Team discount percentage must be between 0 and 100'
      });
      return;
    }

    const { AppDataSource } = await import('../db/data-source');
    const { ResearchSettings } = await import('../models/ResearchSettings');
    const settingsRepository = AppDataSource.getRepository(ResearchSettings);

    // Update or create maxTeamsPerUser setting
    if (maxTeamsPerUser !== undefined) {
      let setting = await settingsRepository.findOne({ 
        where: { setting_key: 'max_teams_per_user' } 
      });
      
      if (setting) {
        setting.setting_value = String(maxTeamsPerUser);
        setting.description = 'Maximum number of teams a user can create or join';
        await settingsRepository.save(setting);
      } else {
        setting = settingsRepository.create({
          setting_key: 'max_teams_per_user',
          setting_value: String(maxTeamsPerUser),
          description: 'Maximum number of teams a user can create or join'
        });
        await settingsRepository.save(setting);
      }
    }

    // Update or create maxTeamMembers setting
    if (maxTeamMembers !== undefined) {
      let setting = await settingsRepository.findOne({ 
        where: { setting_key: 'max_team_members' } 
      });
      
      if (setting) {
        setting.setting_value = String(maxTeamMembers);
        setting.description = 'Maximum number of members allowed in a team';
        await settingsRepository.save(setting);
      } else {
        setting = settingsRepository.create({
          setting_key: 'max_team_members',
          setting_value: String(maxTeamMembers),
          description: 'Maximum number of members allowed in a team'
        });
        await settingsRepository.save(setting);
      }
    }

    // Update or create teamDiscountPercentage setting
    if (teamDiscountPercentage !== undefined) {
      let setting = await settingsRepository.findOne({ 
        where: { setting_key: 'team_discount_percentage' } 
      });
      
      if (setting) {
        setting.setting_value = String(teamDiscountPercentage);
        setting.description = 'Discount percentage for team pricing';
        await settingsRepository.save(setting);
      } else {
        setting = settingsRepository.create({
          setting_key: 'team_discount_percentage',
          setting_value: String(teamDiscountPercentage),
          description: 'Discount percentage for team pricing'
        });
        await settingsRepository.save(setting);
      }
    }

    res.json({
      success: true,
      message: 'Leaderboard settings updated successfully'
    });
  } catch (error: unknown) {
    console.error('Error updating leaderboard settings:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to update leaderboard settings',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};
