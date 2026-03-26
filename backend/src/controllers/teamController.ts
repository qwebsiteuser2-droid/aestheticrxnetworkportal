import { Request, Response } from 'express';
import { AppDataSource } from '../db/data-source';
import { Team } from '../entities/Team';
import { TeamMember } from '../entities/TeamMember';
import { TeamInvitation } from '../entities/TeamInvitation';
import { TeamTierConfig } from '../entities/TeamTierConfig';
import { Doctor } from '../models/Doctor';
import { TierConfig } from '../models/TierConfig';
import { ResearchSettings } from '../models/ResearchSettings';
import gmailService from '../services/gmailService';
import { getFrontendUrlWithPath } from '../config/urlConfig';

// Helper function to get doctor's leaderboard position
const getDoctorLeaderboardPosition = async (doctorId: string): Promise<string> => {
  try {
    const doctorRepository = AppDataSource.getRepository(Doctor);
    const doctors = await doctorRepository
      .createQueryBuilder('doctor')
      .where('doctor.is_approved = :approved AND doctor.is_admin = :admin', {
        approved: true, 
        admin: false 
      })
      .orderBy('doctor.current_sales', 'DESC')
      .addOrderBy('doctor.doctor_name', 'ASC')
      .getMany();

    const position = doctors.findIndex((d: Doctor) => d.id === doctorId) + 1;
    if (position === 0) return 'Not ranked';
    
    const suffix = position === 1 ? 'st' : position === 2 ? 'nd' : position === 3 ? 'rd' : 'th';
    return `${position}${suffix}`;
  } catch (error: unknown) {
    console.error('Error getting leaderboard position:', error);
    return 'Not ranked';
  }
};

// Helper function to calculate team benefits
const calculateTeamBenefits = (members: TeamMember[]) => {
  const totalSales = members.reduce((sum: number, member: TeamMember) => sum + (member.doctor?.current_sales || 0), 0);
  const memberCount = members.length;
  
  // Calculate 10% discount on tier pricing
  const discountPercentage = 10;
  const discountAmount = totalSales * (discountPercentage / 100);
  const discountedTotal = totalSales - discountAmount;
  
  // Determine team tier based on combined sales (with discount)
  let teamTier = 'New Contributor';
  if (discountedTotal >= 10000) teamTier = 'Elite Lead';
  else if (discountedTotal >= 7500) teamTier = 'Grand Lead';
  else if (discountedTotal >= 5000) teamTier = 'Lead Expert';
  else if (discountedTotal >= 2500) teamTier = 'Lead Contributor';
  
  return {
    totalSales,
    memberCount,
    discountPercentage,
    discountAmount,
    discountedTotal,
    teamTier,
    savings: discountAmount
  };
};

// Helper function to calculate and update team member tiers based on team tier configurations
export const updateTeamMemberTiers = async (teamId: string) => {
  try {
    console.log(`🔄 updateTeamMemberTiers called for team ID: ${teamId}`);
    
    const teamRepository = AppDataSource.getRepository(Team);
    const teamMemberRepository = AppDataSource.getRepository(TeamMember);
    const doctorRepository = AppDataSource.getRepository(Doctor);
    const teamTierConfigRepository = AppDataSource.getRepository(TeamTierConfig);

    // Get team with all members
    const team = await teamRepository.findOne({
      where: { id: teamId },
      relations: ['members', 'members.doctor']
    });

    if (!team || !team.members || team.members.length === 0) {
      console.log(`❌ Team not found or no members for team ID: ${teamId}`);
      return;
    }

    console.log(`✅ Found team: ${team.name} with ${team.members.length} members`);

    // Get all team tier configurations
    const teamTierConfigs = await teamTierConfigRepository.find({
      where: { is_active: true },
      order: { display_order: 'ASC' }
    });

    console.log(`📊 Found ${teamTierConfigs.length} team tier configurations`);

    if (teamTierConfigs.length === 0) {
      console.log('❌ No team tier configurations found');
      return;
    }

    // Calculate combined team sales
    const combinedSales = team.members.reduce((sum: number, member: TeamMember) => {
      return sum + parseFloat(member.doctor?.current_sales?.toString() || '0');
    }, 0);

    // Determine team tier based on combined sales and team size
    const teamSize = team.members.length;
    let teamTier = 'Lead Starter'; // Default tier

    // Find the appropriate team tier based on combined sales
    // Use configurable formula from team tier configurations
    for (const config of teamTierConfigs) {
      let teamThreshold: number;
      
      if (teamSize === 1) {
        // Solo: use base threshold
        teamThreshold = config.individual_threshold;
      } else if (teamSize === 2) {
        // 2 members: 2 × base threshold - configurable discount
        const discount = config.discount_2_members || 5;
        teamThreshold = (2 * config.individual_threshold) * (1 - discount / 100);
      } else if (teamSize === 3) {
        // 3 members: 3 × base threshold - configurable discount
        const discount = config.discount_3_members || 10;
        teamThreshold = (3 * config.individual_threshold) * (1 - discount / 100);
      } else {
        // 4+ members: use config calculation with additional discount per member
        const baseDiscount = config.discount_4_members || 15;
        const additionalDiscount = (teamSize - 4) * 5; // 5% per additional member
        const totalDiscount = baseDiscount + additionalDiscount;
        teamThreshold = (teamSize * config.individual_threshold) * (1 - totalDiscount / 100);
      }
      
      if (combinedSales >= teamThreshold) {
        teamTier = config.name;
      } else {
        break; // Since configs are ordered, we can break here
      }
    }

    // Calculate next tier for team
    const currentTierIndex = teamTierConfigs.findIndex((config: TeamTierConfig) => config.name === teamTier);
    const nextTier = currentTierIndex < teamTierConfigs.length - 1 ? teamTierConfigs[currentTierIndex + 1] : null;
    
    // Calculate remaining amount to next tier and tier progress
    let remainingAmount = 0;
    let tierProgress = 0;
    if (nextTier) {
      let nextTierThreshold: number;
      if (teamSize === 1) {
        nextTierThreshold = parseFloat(String(nextTier.individual_threshold));
      } else if (teamSize === 2) {
        const discount = parseFloat(String(nextTier.discount_2_members || '5'));
        nextTierThreshold = (2 * parseFloat(String(nextTier.individual_threshold))) * (1 - discount / 100);
      } else if (teamSize === 3) {
        const discount = parseFloat(String(nextTier.discount_3_members || '10'));
        nextTierThreshold = (3 * parseFloat(String(nextTier.individual_threshold))) * (1 - discount / 100);
      } else {
        const baseDiscount = parseFloat(String(nextTier.discount_4_members || '15'));
        const additionalDiscount = (teamSize - 4) * 5;
        const totalDiscount = baseDiscount + additionalDiscount;
        nextTierThreshold = (teamSize * parseFloat(String(nextTier.individual_threshold))) * (1 - totalDiscount / 100);
      }
      remainingAmount = Math.max(nextTierThreshold - combinedSales, 0);
      tierProgress = Math.min((combinedSales / nextTierThreshold) * 100, 100);
    } else {
      // Highest tier achieved
      tierProgress = 100;
    }

    // Check if team tier has changed for certificate notifications
    const oldTeamTier = team.tier;
    const teamTierChanged = oldTeamTier !== teamTier;

    // Update team tier
    team.tier = teamTier;
    team.total_sales = parseFloat(combinedSales.toFixed(2));
    team.tier_progress = parseFloat(tierProgress.toFixed(2));
    team.next_tier = (nextTier?.name || null) as any;
    team.remaining_amount = parseFloat(remainingAmount.toFixed(2));
    await teamRepository.save(team);

        // Update individual member tiers based on team tier
        for (const member of team.members) {
          if (member.doctor) {
            // Store the individual base tier if not already stored
            if (!member.doctor.base_tier) {
              const individualSales = parseFloat(member.doctor.current_sales?.toString() || '0');
              const individualTierData = await calculateIndividualTierFromSales(individualSales);
              member.doctor.base_tier = individualTierData.individualTier;
            }
            
            // For team members, their displayed tier should be the team tier
            // This shows they are part of a team and benefits from team tier
            member.doctor.tier = teamTier;
            await doctorRepository.save(member.doctor);
          }
        }

    // Send team tier achievement certificates if tier changed
    if (teamTierChanged) {
      try {
        const { TierNotificationService } = await import('../services/tierNotificationService');
        const { CertificateService } = await import('../services/certificateService');
        
        // Find the team tier config for certificate generation
        const teamTierConfig = teamTierConfigs.find((config: TeamTierConfig) => config.name === teamTier);
        if (teamTierConfig) {
          // Send certificates to all team members for team tier achievement
          for (const member of team.members) {
            if (member.doctor) {
              await CertificateService.sendCertificate(member.doctor, teamTierConfig as any);
              console.log(`🏆 Team tier certificate sent to ${member.doctor.doctor_name} for team ${team.name} achieving ${teamTier}`);
            }
          }
        }
      } catch (error: unknown) {
        console.error('Failed to send team tier achievement certificates:', error);
      }
    }

    console.log(`✅ Updated team ${team.name} tier to ${teamTier} with combined sales: ${combinedSales}`);
    console.log(`📈 Team Progress: ${tierProgress}%, Next Tier: ${nextTier?.name || 'None'}, Remaining: ${remainingAmount}`);
  } catch (error: unknown) {
    console.error('❌ Error updating team member tiers:', error);
  }
};

// Helper function to calculate individual tier when user leaves team
const calculateIndividualTier = async (doctorId: string) => {
  try {
    const doctorRepository = AppDataSource.getRepository(Doctor);
    const tierConfigRepository = AppDataSource.getRepository(TierConfig);

    // Get doctor's individual sales
    const doctor = await doctorRepository.findOne({ where: { id: doctorId } });
    if (!doctor) return;

    const individualSales = parseFloat(doctor.current_sales?.toString() || '0');

    // Get individual tier configurations (from the base tier configs)
    const tierConfigs = await tierConfigRepository.find({
      where: { is_active: true },
      order: { display_order: 'ASC' }
    });

    // Find the appropriate individual tier based on sales
    let individualTier = 'Lead Starter'; // Default tier
    for (const config of tierConfigs) {
      const threshold = parseFloat(config.threshold.toString());
      if (individualSales >= threshold) {
        individualTier = config.name;
      } else {
        break; // Since configs are ordered, we can break here
      }
    }

    // Always use the calculated tier based on current sales, not the stored base_tier
    // The base_tier was only for reference, but individual tier should be based on actual sales
    const finalTier = individualTier;
    
    // Update doctor's tier to individual tier
    doctor.tier = finalTier;
    doctor.base_tier = null as any; // Clear the base_tier since they're no longer in a team
    await doctorRepository.save(doctor);

    console.log(`Updated doctor ${doctor.doctor_name} to individual tier: ${finalTier} with sales: ${individualSales.toLocaleString()} PKR`);
  } catch (error: unknown) {
    console.error('Error calculating individual tier:', error);
  }
};

// Helper function to calculate individual tier based on sales
const calculateIndividualTierFromSales = async (sales: number) => {
  const tierConfigRepository = AppDataSource.getRepository(TierConfig);
  const tierConfigs = await tierConfigRepository.find({
    where: { is_active: true },
    order: { display_order: 'ASC' }
  });

  let individualTier = 'Lead Starter'; // Default tier
  let individualTierProgress = 0;
  let nextTier = null;
  let remainingAmount = 0;

  for (let i = 0; i < tierConfigs.length; i++) {
    const config = tierConfigs[i];
    if (config) {
      const threshold = parseFloat(config.threshold.toString());
      
      if (sales >= threshold) {
        individualTier = config.name;
      }
      
      // Calculate progress to next tier
      if (i < tierConfigs.length - 1) {
        const nextConfig = tierConfigs[i + 1];
        const nextThreshold = nextConfig ? parseFloat(nextConfig.threshold.toString()) : 0;
        nextTier = nextConfig?.name || null;
        remainingAmount = Math.max(nextThreshold - sales, 0);
        individualTierProgress = Math.min((sales / nextThreshold) * 100, 100);
      } else {
        // Highest tier achieved
        individualTierProgress = 100;
        nextTier = null;
        remainingAmount = 0;
      }
    } else {
      break;
    }
  }

  return {
    individualTier,
    individualTierProgress,
    nextTier,
    remainingAmount
  };
};

export const getTeams = async (req: Request, res: Response): Promise<void> => {
  try {
    const teamRepository = AppDataSource.getRepository(Team);
    const teams = await teamRepository.find({
      relations: ['members', 'members.doctor', 'leader'],
      order: { total_sales: 'DESC' }
    });

    const formattedTeams = await Promise.all(teams.map(async (team: Team) => {
      const membersWithIndividualTiers = await Promise.all(team.members.map(async (member: TeamMember) => {
        const individualSales = parseFloat(member.doctor.current_sales?.toString() || '0');
        const individualTierData = await calculateIndividualTierFromSales(individualSales);
        
        return {
          id: member.id,
          doctor_name: member.doctor.doctor_name,
          clinic_name: member.doctor.clinic_name,
          email: member.doctor.email,
          is_leader: member.is_leader,
          contribution: member.contribution,
          current_sales: member.doctor.current_sales,
          individual_tier: individualTierData.individualTier,
          individual_tier_progress: individualTierData.individualTierProgress,
          individual_next_tier: individualTierData.nextTier,
          individual_remaining_amount: individualTierData.remainingAmount,
          base_tier: member.doctor.base_tier
        };
      }));

      return {
        id: team.id,
        name: team.name,
        leader: {
          id: team.leader.id,
          doctor_name: team.leader.doctor_name,
          clinic_name: team.leader.clinic_name,
          email: team.leader.email
        },
        members: membersWithIndividualTiers,
        total_sales: team.total_sales,
        tier: team.tier,
        tier_progress: team.tier_progress,
        next_tier: team.next_tier,
        remaining_amount: team.remaining_amount,
        created_at: team.created_at
      };
    }));

    res.json({ success: true, teams: formattedTeams });
  } catch (error: unknown) {
    console.error('Error fetching teams:', error);
    res.status(500).json({ message: 'Failed to fetch teams' });
  }
};

export const createTeam = async (req: Request, res: Response): Promise<void> => {
  try {
    const { name } = req.body;
    const userId = (req as any).user.id;

    if (!name || !name.trim()) {
      res.status(400).json({ message: 'Team name is required' });
      return;
    }

    const teamRepository = AppDataSource.getRepository(Team);
    const teamMemberRepository = AppDataSource.getRepository(TeamMember);
    const doctorRepository = AppDataSource.getRepository(Doctor);

    // Check if user already has a team
    const existingTeam = await teamRepository.findOne({
      where: { leader_id: userId }
    });

    if (existingTeam) {
      res.status(400).json({ message: 'You already have a team' });
      return;
    }

    // Create team with initial values
    const team = teamRepository.create({
      name: name.trim(),
      leader_id: userId,
      total_sales: 0,
      tier: 'Lead Starter',
      tier_progress: 0
    });

    const savedTeam = await teamRepository.save(team);

    // Add leader as team member
    const teamMember = teamMemberRepository.create({
      team_id: savedTeam.id,
      doctor_id: userId,
      is_leader: true,
      contribution: 0
    });

    await teamMemberRepository.save(teamMember);

    // Update team member tiers based on team tier configurations
    // This will calculate the correct team tier based on combined sales
    await updateTeamMemberTiers(savedTeam.id);

    res.json({ success: true, team: savedTeam, message: 'Team created successfully' });
    return;
  } catch (error: unknown) {
    console.error('Error creating team:', error);
    res.status(500).json({ message: 'Failed to create team' });
    return;
  }
};

export const sendTeamInvitation = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, message } = req.body;
    const userId = (req as any).user.id;

    if (!email || !email.trim()) {
      res.status(400).json({ message: 'Email is required' });
      return;
    }

    const teamRepository = AppDataSource.getRepository(Team);
    const teamInvitationRepository = AppDataSource.getRepository(TeamInvitation);
    const doctorRepository = AppDataSource.getRepository(Doctor);

    // Get the current user data
    const user = await doctorRepository.findOne({ where: { id: userId } });
    if (!user) {
      res.status(400).json({ message: 'User not found' });
      return;
    }

    // Get user's team
    const team = await teamRepository.findOne({
      where: { leader_id: userId },
      relations: ['members']
    });

    if (!team) {
      res.status(400).json({ message: 'You must create a team first before sending invitations' });
      return;
    }

    // Get team member limit from settings (default to 3)
    const settingsRepository = AppDataSource.getRepository(ResearchSettings);
    const maxTeamMembersSetting = await settingsRepository.findOne({ 
      where: { setting_key: 'max_team_members' } 
    });
    const maxTeamMembers = maxTeamMembersSetting ? parseInt(maxTeamMembersSetting.setting_value) : 3;

    // Check team member limit
    if (team.members.length >= maxTeamMembers) {
      res.status(400).json({ message: `Team is full (maximum ${maxTeamMembers} members)` });
      return;
    }

    // Find the doctor to invite
    const doctorToInvite = await doctorRepository.findOne({
      where: { email: email.trim().toLowerCase() }
    });

    if (!doctorToInvite) {
      res.status(400).json({ message: 'Doctor not found with this email' });
      return;
    }

    if (doctorToInvite.id === userId) {
      res.status(400).json({ message: 'You cannot invite yourself to your own team' });
      return;
    }

    // Check if doctor is already in a team
    const existingMember = await teamRepository
      .createQueryBuilder('team')
      .leftJoin('team.members', 'member')
      .where('member.doctor_id = :doctorId', { doctorId: doctorToInvite.id })
      .getOne();

    if (existingMember) {
      res.status(400).json({ message: 'This doctor is already in a team' });
      return;
    }

    // Check for existing pending invitation
    const existingInvitation = await teamInvitationRepository.findOne({
      where: {
        team_id: team.id,
        to_doctor_id: doctorToInvite.id,
        status: 'pending'
      }
    });

    if (existingInvitation) {
      res.status(400).json({ message: 'You have already sent an invitation to this doctor. Please wait for their response.' });
      return;
    }

    // Create invitation
    const invitation = teamInvitationRepository.create({
      team_id: team.id,
      from_doctor_id: userId,
      to_doctor_id: doctorToInvite.id,
      message: message || 'Join my team!',
      status: 'pending'
    });

    const savedInvitation = await teamInvitationRepository.save(invitation);

    // Get sender's leaderboard position and tier info
    const senderRank = await getDoctorLeaderboardPosition(userId);
    const senderTier = user.tier || 'New Contributor';

    // Send email notification
    try {
      const emailSubject = `Team Invitation from ${user.doctor_name} - ${team.name}`;
      const emailContent = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #2563eb;">Team Invitation</h2>
          <p>Hello ${doctorToInvite.doctor_name},</p>
          <p><strong>${user.doctor_name}</strong> from <strong>${user.clinic_name}</strong> has invited you to join their team <strong>"${team.name}"</strong>!</p>
          
          <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="color: #374151; margin-top: 0;">Invitation Details:</h3>
            <ul style="list-style: none; padding: 0;">
              <li><strong>Team Name:</strong> ${team.name}</li>
              <li><strong>Invited by:</strong> ${user.doctor_name}</li>
              <li><strong>Clinic:</strong> ${user.clinic_name}</li>
              <li><strong>Current Tier:</strong> ${senderTier}</li>
              <li><strong>Leaderboard Position:</strong> ${senderRank}</li>
            </ul>
          </div>

          <div style="background-color: #dbeafe; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="color: #1e40af; margin-top: 0;">Team Benefits:</h3>
            <ul style="list-style: none; padding: 0;">
              <li>✅ <strong>10% Discount</strong> on tier pricing</li>
              <li>✅ <strong>Combined Sales</strong> for faster tier progression</li>
              <li>✅ <strong>Team Recognition</strong> on leaderboard</li>
              <li>✅ <strong>Maximum 3 members</strong> per team</li>
            </ul>
          </div>

          <p>To accept or decline this invitation, please log in to your account and check the "Received Invitations" section.</p>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${getFrontendUrlWithPath('/leaderboard')}" style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">View Invitation</a>
          </div>
          
          <p style="color: #6b7280; font-size: 14px;">This invitation will expire in 7 days.</p>
        </div>
      `;

      await gmailService.sendEmail(doctorToInvite.email, emailSubject, emailContent);
    } catch (emailError) {
      console.error('Error sending invitation email:', emailError);
      // Don't fail the request if email fails
    }

    res.json({ 
      success: true, 
      invitation: savedInvitation, 
      message: 'Team invitation sent successfully with email notification',
      invitationDetails: {
        team_name: team.name,
        from_doctor: user.doctor_name,
        from_clinic: user.clinic_name,
        from_tier: senderTier,
        from_rank: senderRank,
        to_doctor: doctorToInvite.doctor_name
      }
    });
  } catch (error: unknown) {
    console.error('Error sending team invitation:', error);
    res.status(500).json({ message: 'Failed to send team invitation' });
  }
};

export const getTeamInvitations = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user.id;

    const teamInvitationRepository = AppDataSource.getRepository(TeamInvitation);
    const invitations = await teamInvitationRepository.find({
      where: { to_doctor_id: userId, status: 'pending' },
      relations: ['team', 'from_doctor'],
      order: { created_at: 'DESC' }
    });

    const formattedInvitations = await Promise.all(invitations.map(async (invitation: TeamInvitation) => {
      const senderRank = await getDoctorLeaderboardPosition(invitation.from_doctor.id);
      const senderTier = invitation.from_doctor.tier || 'New Contributor';

      return {
        id: invitation.id,
        team_name: invitation.team.name,
        from_doctor_name: invitation.from_doctor.doctor_name,
        from_clinic_name: invitation.from_doctor.clinic_name,
        from_doctor_email: invitation.from_doctor.email,
        from_tier: senderTier,
        from_rank: senderRank,
        message: invitation.message,
        created_at: invitation.created_at
      };
    }));

    res.json({ success: true, invitations: formattedInvitations });
  } catch (error: unknown) {
    console.error('Error fetching team invitations:', error);
    res.status(500).json({ message: 'Failed to fetch team invitations' });
  }
};

export const getTeamBenefits = async (req: Request, res: Response): Promise<void> => {
  try {
    const { teamId } = req.params;
    const userId = (req as any).user.id;

    const teamRepository = AppDataSource.getRepository(Team);
    const team = await teamRepository.findOne({
      where: { id: teamId },
      relations: ['members', 'members.doctor']
    });

    if (!team) {
      res.status(404).json({ message: 'Team not found' });
      return;
    }

    // Check if user is part of this team
    const isMember = team.members.some((member: TeamMember) => member.doctor.id === userId);
    if (!isMember) {
      res.status(403).json({ message: 'You are not a member of this team' });
      return;
    }

    const members = team.members.map((member: TeamMember) => ({
      id: member.doctor.id,
      name: member.doctor.doctor_name,
      clinic: member.doctor.clinic_name,
      current_sales: member.doctor.current_sales || 0,
      tier: member.doctor.tier || 'New Contributor'
    }));

    // Use actual team.members for calculateTeamBenefits (expects TeamMember[] with full structure)
    const benefits = calculateTeamBenefits(team.members);

    res.json({
      success: true,
      team: {
        id: team.id,
        name: team.name,
        members: members,
        benefits: benefits
      }
    });
  } catch (error: unknown) {
    console.error('Error fetching team benefits:', error);
    res.status(500).json({ message: 'Failed to fetch team benefits' });
  }
};

export const leaveTeam = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user.id;

    const teamRepository = AppDataSource.getRepository(Team);
    const teamMemberRepository = AppDataSource.getRepository(TeamMember);
    const doctorRepository = AppDataSource.getRepository(Doctor);

    // Find user's team membership
    const teamMember = await teamMemberRepository.findOne({
      where: { doctor_id: userId },
      relations: ['team', 'doctor']
    });

    if (!teamMember) {
      res.status(404).json({ message: 'You are not a member of any team' });
      return;
    }

    const team = teamMember.team;
    const user = teamMember.doctor;

    // If user is the team leader, handle team dissolution
    if (teamMember.is_leader) {
      // Get all team members
      const allMembers = await teamMemberRepository.find({
        where: { team_id: team.id },
        relations: ['doctor']
      });

      // Remove all team members
      await teamMemberRepository.remove(allMembers);

      // Delete the team
      await teamRepository.remove(team);

      // Calculate individual tiers for all members (including leader)
      for (const member of allMembers) {
        await calculateIndividualTier(member.doctor_id);
      }

      // Send notification emails to all members
      for (const member of allMembers) {
        if (member.doctor_id !== userId) {
          try {
            const emailSubject = `Team Dissolved - ${team.name}`;
            const emailContent = `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h2 style="color: #dc2626;">Team Dissolved</h2>
                <p>Hello ${member.doctor.doctor_name},</p>
                <p>The team <strong>"${team.name}"</strong> has been dissolved by the team leader <strong>${user.doctor_name}</strong>.</p>
                <p>You are now a solo doctor and will be ranked individually based on your personal sales.</p>
                
                <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
                  <h3 style="color: #374151; margin-top: 0;">What this means:</h3>
                  <ul style="list-style: none; padding: 0;">
                    <li>• You are now ranked as a solo doctor</li>
                    <li>• Your tier is based on your individual sales</li>
                    <li>• You can join or create a new team anytime</li>
                    <li>• All team benefits are no longer applicable</li>
                  </ul>
                </div>
                
                <div style="text-align: center; margin: 30px 0;">
                  <a href="${getFrontendUrlWithPath('/leaderboard')}" style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">View Leaderboard</a>
                </div>
              </div>
            `;
            await gmailService.sendEmail(member.doctor.email, emailSubject, emailContent);
          } catch (emailError) {
            console.error('Error sending dissolution email:', emailError);
          }
        }
      }

      res.json({ 
        success: true, 
        message: 'Team dissolved successfully. All members are now solo doctors.',
        action: 'team_dissolved'
      });
    } else {
      // Regular member leaving
      await teamMemberRepository.remove(teamMember);

      // Calculate individual tier for the leaving member
      await calculateIndividualTier(userId);

      // Update team sales and tier if needed
      const remainingMembers = await teamMemberRepository.find({
        where: { team_id: team.id },
        relations: ['doctor']
      });

      // Update team tier after member leaves (if team still exists)
      if (remainingMembers.length > 0) {
        await updateTeamMemberTiers(team.id);
      }

      if (remainingMembers.length === 0) {
        // No members left, delete the team
        await teamRepository.remove(team);
      } else if (remainingMembers.length === 1) {
        // Only 1 member left, automatically dissolve the team
        console.log(`Auto-dissolving team "${team.name}" - only 1 member remaining`);
        
        // Calculate individual tier for the remaining member
        if (remainingMembers[0]?.doctor_id) {
          await calculateIndividualTier(remainingMembers[0].doctor_id);
        }
        
        // Remove the remaining member
        if (remainingMembers[0]) {
          await teamMemberRepository.remove(remainingMembers[0]);
        }
        
        // Delete the team
        await teamRepository.remove(team);
        
        // Send notification email to the remaining member
        try {
          const emailSubject = `Team Auto-Dissolved - ${team.name}`;
          const emailContent = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2 style="color: #dc2626;">Team Auto-Dissolved</h2>
              <p>Hello ${remainingMembers[0]?.doctor?.doctor_name || 'Team Member'},</p>
              <p>The team <strong>"${team.name}"</strong> has been automatically dissolved because only you remained as a member.</p>
              <p>You are now a solo doctor and will be ranked individually based on your personal sales.</p>
              
              <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <h3 style="color: #374151; margin-top: 0;">What this means:</h3>
                <ul style="list-style: none; padding: 0;">
                  <li>• You are now ranked as a solo doctor</li>
                  <li>• Your tier is based on your individual sales</li>
                  <li>• You can join or create a new team anytime</li>
                  <li>• All team benefits are no longer applicable</li>
                </ul>
              </div>
              
              <div style="text-align: center; margin: 30px 0;">
                <a href="${getFrontendUrlWithPath('/leaderboard')}" style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">View Leaderboard</a>
              </div>
            </div>
          `;
          if (remainingMembers[0]?.doctor?.email) {
            await gmailService.sendEmail(remainingMembers[0].doctor.email, emailSubject, emailContent);
          }
        } catch (emailError) {
          console.error('Error sending auto-dissolution email:', emailError);
        }
        
        res.json({ 
          success: true, 
          message: 'Team auto-dissolved because only 1 member remained. You are now a solo doctor.',
          action: 'team_auto_dissolved'
        });
        return;
      } else {
        // Multiple members remaining, recalculate team tier
        console.log(`Recalculating team tier for "${team.name}" - ${remainingMembers.length} members remaining`);
        
        // Recalculate team sales and update team tier
        await updateTeamMemberTiers(team.id);
      }

      // Send notification email to team leader
      const leader = remainingMembers.find((m: TeamMember) => m.is_leader);
      if (leader) {
        try {
          const emailSubject = `Team Member Left - ${team.name}`;
          const emailContent = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2 style="color: #dc2626;">Team Member Left</h2>
              <p>Hello ${leader.doctor.doctor_name},</p>
              <p><strong>${user.doctor_name}</strong> from <strong>${user.clinic_name}</strong> has left the team <strong>"${team.name}"</strong>.</p>
              
              <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <h3 style="color: #374151; margin-top: 0;">Team Status:</h3>
                <ul style="list-style: none; padding: 0;">
                  <li><strong>Remaining Members:</strong> ${remainingMembers.length}</li>
                  <li><strong>Team Tier:</strong> ${team.tier || 'Calculating...'}</li>
                </ul>
              </div>
              
              <div style="text-align: center; margin: 30px 0;">
                <a href="${getFrontendUrlWithPath('/leaderboard')}" style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">View Team</a>
              </div>
            </div>
          `;
          await gmailService.sendEmail(leader.doctor.email, emailSubject, emailContent);
        } catch (emailError) {
          console.error('Error sending leave notification email:', emailError);
        }
      }

      res.json({ 
        success: true, 
        message: 'Successfully left the team. You are now a solo doctor.',
        action: 'member_left'
      });
    }
  } catch (error: unknown) {
    console.error('Error leaving team:', error);
    res.status(500).json({ message: 'Failed to leave team' });
  }
};

export const requestTeamSeparation = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user.id;
    const { reason } = req.body;

    const teamRepository = AppDataSource.getRepository(Team);
    const teamMemberRepository = AppDataSource.getRepository(TeamMember);
    const doctorRepository = AppDataSource.getRepository(Doctor);

    // Find user's team
    const teamMember = await teamMemberRepository.findOne({
      where: { doctor_id: userId },
      relations: ['team', 'doctor']
    });

    if (!teamMember) {
      res.status(404).json({ message: 'You are not a member of any team' });
      return;
    }

    const team = teamMember.team;
    const user = teamMember.doctor;

    // Get all team members
    const allMembers = await teamMemberRepository.find({
      where: { team_id: team.id },
      relations: ['doctor']
    });

    // Send email to admin about separation request
    try {
      const emailSubject = `Team Separation Request - ${team.name}`;
      const emailContent = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #dc2626;">Team Separation Request</h2>
          <p>A team member has requested to leave their team and needs admin approval.</p>
          
          <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="color: #374151; margin-top: 0;">Request Details:</h3>
            <ul style="list-style: none; padding: 0;">
              <li><strong>Team Name:</strong> ${team.name}</li>
              <li><strong>Requesting Member:</strong> ${user.doctor_name}</li>
              <li><strong>Clinic:</strong> ${user.clinic_name}</li>
              <li><strong>Email:</strong> ${user.email}</li>
              <li><strong>Current Tier:</strong> ${user.tier || 'New Contributor'}</li>
              <li><strong>Reason:</strong> ${reason || 'No reason provided'}</li>
            </ul>
          </div>

          <div style="background-color: #fef3c7; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="color: #92400e; margin-top: 0;">Current Team Members:</h3>
            <ul style="list-style: none; padding: 0;">
              ${allMembers.map((member: TeamMember) => `
                <li>• ${member.doctor.doctor_name} (${member.doctor.clinic_name}) ${member.is_leader ? '- Team Leader' : ''}</li>
              `).join('')}
            </ul>
          </div>

          <div style="background-color: #dbeafe; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="color: #1e40af; margin-top: 0;">Admin Action Required:</h3>
            <p>Please review this request and take appropriate action:</p>
            <ul style="list-style: none; padding: 0;">
              <li>• Approve the separation and remove the member from the team</li>
              <li>• Reject the request and keep the team intact</li>
              <li>• Contact the member for more information</li>
            </ul>
          </div>

          <div style="text-align: center; margin: 30px 0;">
            <a href="${getFrontendUrlWithPath('/admin')}" style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">Review in Admin Panel</a>
          </div>
          
          <p style="color: #6b7280; font-size: 14px;">This is an automated notification from the BioAestheticAx Network team management system.</p>
        </div>
      `;

      // Send to main admin email
      await gmailService.sendEmail('asadkhanbloch4949@gmail.com', emailSubject, emailContent);
    } catch (emailError) {
      console.error('Failed to send separation request email:', emailError);
    }

    res.json({ 
      success: true, 
      message: 'Team separation request submitted successfully. Admin will review your request.',
      team: {
        id: team.id,
        name: team.name,
        members: allMembers.map(member => ({
          name: member.doctor.doctor_name,
          clinic: member.doctor.clinic_name,
          is_leader: member.is_leader
        }))
      }
    });
  } catch (error: unknown) {
    console.error('Error requesting team separation:', error);
    res.status(500).json({ message: 'Failed to submit team separation request' });
  }
};

export const respondToTeamInvitation = async (req: Request, res: Response): Promise<void> => {
  try {
    const { invitationId } = req.params;
    const { action } = req.body; // 'accept' or 'reject'
    const userId = (req as any).user.id;

    if (!['accept', 'reject'].includes(action)) {
      res.status(400).json({ message: 'Invalid action. Must be accept or reject' });
      return;
    }

    const teamInvitationRepository = AppDataSource.getRepository(TeamInvitation);
    const teamMemberRepository = AppDataSource.getRepository(TeamMember);
    const teamRepository = AppDataSource.getRepository(Team);

    // Get invitation
    const invitation = await teamInvitationRepository.findOne({
      where: { id: invitationId, to_doctor_id: userId, status: 'pending' },
      relations: ['team', 'team.members']
    });

    if (!invitation) {
      res.status(404).json({ message: 'Invitation not found or already responded' });
      return;
    }

    if (action === 'accept') {
      // Check if user is already in a team
      const existingMember = await teamRepository
        .createQueryBuilder('team')
        .leftJoin('team.members', 'member')
        .where('member.doctor_id = :doctorId', { doctorId: userId })
        .getOne();

      if (existingMember) {
        res.status(400).json({ message: 'You are already in a team. Please leave your current team before joining another.' });
        return;
      }

      // Get team member limit from settings (default to 3)
      const settingsRepository = AppDataSource.getRepository(ResearchSettings);
      const maxTeamMembersSetting = await settingsRepository.findOne({ 
        where: { setting_key: 'max_team_members' } 
      });
      const maxTeamMembers = maxTeamMembersSetting ? parseInt(maxTeamMembersSetting.setting_value) : 3;

      // Check if team is full
      if (invitation.team.members.length >= maxTeamMembers) {
        res.status(400).json({ message: `Team is full (maximum ${maxTeamMembers} members)` });
        return;
      }

      // Add member to team
      const teamMember = teamMemberRepository.create({
        team_id: invitation.team.id,
        doctor_id: userId,
        is_leader: false,
        contribution: 0
      });

      await teamMemberRepository.save(teamMember);

      // Update team member tiers based on team tier configurations
      await updateTeamMemberTiers(invitation.team.id);
    }

    // Update invitation status
    invitation.status = action === 'accept' ? 'accepted' : 'rejected';
    invitation.responded_at = new Date();
    await teamInvitationRepository.save(invitation);

    // Send email notification to the sender about the response
    try {
      const doctorRepository = AppDataSource.getRepository(Doctor);
      const [inviter, responder] = await Promise.all([
        doctorRepository.findOne({ where: { id: invitation.from_doctor_id } }),
        doctorRepository.findOne({ where: { id: userId } })
      ]);

      if (inviter && responder) {
        const emailSubject = action === 'accept' 
          ? `🎉 ${responder.doctor_name} Accepted Your Team Invitation!`
          : `Team Invitation Declined - ${invitation.team.name}`;
        
        const emailContent = action === 'accept' 
          ? `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2 style="color: #16a34a;">🎉 Great News!</h2>
              <p>Hello ${inviter.doctor_name},</p>
              <p><strong>${responder.doctor_name}</strong> from <strong>${responder.clinic_name}</strong> has <span style="color: #16a34a; font-weight: bold;">accepted</span> your invitation to join team <strong>"${invitation.team.name}"</strong>!</p>
              
              <div style="background-color: #f0fdf4; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #16a34a;">
                <h3 style="color: #166534; margin-top: 0;">New Team Member:</h3>
                <ul style="list-style: none; padding: 0;">
                  <li><strong>Name:</strong> ${responder.doctor_name}</li>
                  <li><strong>Clinic:</strong> ${responder.clinic_name}</li>
                </ul>
              </div>
              
              <p>Your team is growing stronger! Combined sales will now be calculated for your team's tier.</p>
              
              <div style="text-align: center; margin: 30px 0;">
                <a href="${getFrontendUrlWithPath('/leaderboard')}" style="background-color: #16a34a; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">View Team</a>
              </div>
            </div>
          `
          : `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2 style="color: #dc2626;">Invitation Declined</h2>
              <p>Hello ${inviter.doctor_name},</p>
              <p><strong>${responder.doctor_name}</strong> from <strong>${responder.clinic_name}</strong> has <span style="color: #dc2626; font-weight: bold;">declined</span> your invitation to join team <strong>"${invitation.team.name}"</strong>.</p>
              
              <div style="background-color: #fef2f2; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #dc2626;">
                <p style="color: #991b1b; margin: 0;">Don't worry! You can invite other doctors to join your team.</p>
              </div>
              
              <div style="text-align: center; margin: 30px 0;">
                <a href="${getFrontendUrlWithPath('/leaderboard')}" style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">Invite More Doctors</a>
              </div>
            </div>
          `;

        await gmailService.sendEmail(inviter.email, emailSubject, emailContent);
      }
    } catch (emailError) {
      console.error('Error sending invitation response email:', emailError);
      // Don't fail the request if email fails
    }

    res.json({ 
      success: true, 
      message: `Team invitation ${action}ed successfully` 
    });
  } catch (error: unknown) {
    console.error('Error responding to team invitation:', error);
    res.status(500).json({ message: 'Failed to respond to team invitation' });
  }
};

export const getUserTeam = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user.id;

    const teamRepository = AppDataSource.getRepository(Team);
    const team = await teamRepository.findOne({
      where: { leader_id: userId },
      relations: ['members', 'members.doctor', 'leader']
    });

    if (!team) {
      // Check if user is a member of another team
      const teamMemberRepository = AppDataSource.getRepository(TeamMember);
      const memberRecord = await teamMemberRepository.findOne({
        where: { doctor_id: userId },
        relations: ['team', 'team.members', 'team.members.doctor', 'team.leader']
      });

      if (memberRecord) {
        const formattedTeam = {
          id: memberRecord.team.id,
          name: memberRecord.team.name,
          leader: {
            id: memberRecord.team.leader.id,
            doctor_name: memberRecord.team.leader.doctor_name,
            clinic_name: memberRecord.team.leader.clinic_name
          },
          members: memberRecord.team.members.map((member: TeamMember) => ({
            id: member.id,
            doctor_name: member.doctor.doctor_name,
            clinic_name: member.doctor.clinic_name,
            is_leader: member.is_leader,
            contribution: member.contribution
          })),
          total_sales: memberRecord.team.total_sales,
          tier: memberRecord.team.tier,
          tier_progress: memberRecord.team.tier_progress,
          next_tier: memberRecord.team.next_tier,
          remaining_amount: memberRecord.team.remaining_amount
        };

        res.json({ success: true, team: formattedTeam });
        return;
      }

      res.json({ success: true, team: null });
      return;
    }

    const formattedTeam = {
      id: team.id,
      name: team.name,
      leader: {
        id: team.leader.id,
        doctor_name: team.leader.doctor_name,
        clinic_name: team.leader.clinic_name
      },
      members: team.members.map((member: TeamMember) => ({
        id: member.id,
        doctor_name: member.doctor.doctor_name,
        clinic_name: member.doctor.clinic_name,
        is_leader: member.is_leader,
        contribution: member.contribution
      })),
      total_sales: team.total_sales,
      tier: team.tier,
      tier_progress: team.tier_progress,
      next_tier: team.next_tier,
      remaining_amount: team.remaining_amount
    };

    res.json({ success: true, team: formattedTeam });
  } catch (error: unknown) {
    console.error('Error fetching user team:', error);
    res.status(500).json({ message: 'Failed to fetch user team' });
  }
};
