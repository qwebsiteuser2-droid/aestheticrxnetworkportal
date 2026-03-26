import { Request, Response } from 'express';
import { AppDataSource } from '../db/data-source';
import { Doctor } from '../models/Doctor';
import { Team } from '../entities/Team';
import { TeamMember } from '../entities/TeamMember';

export const search = async (req: Request, res: Response): Promise<void> => {
  try {
    const { q, currentUserId } = req.query;

    if (!q || typeof q !== 'string' || q.trim().length < 2) {
      res.status(400).json({ 
        message: 'Search query must be at least 2 characters long' 
      });
      return;
    }

    const searchTerm = q.trim().toLowerCase();
    const results: any[] = [];

    // Get current user data for better suggestions
    let currentUser: Doctor | null = null;
    let currentUserTier: string | null = null;
    let currentUserSales: number = 0;
    
    if (currentUserId) {
      const doctorRepository = AppDataSource.getRepository(Doctor);
      currentUser = await doctorRepository.findOne({ 
        where: { id: currentUserId as string },
        select: ['id', 'tier', 'current_sales']
      });
      if (currentUser) {
        currentUserTier = currentUser.tier;
        currentUserSales = currentUser.current_sales || 0;
      }
    }

    // Get all doctors who are already in teams (to exclude them)
    const teamMemberRepository = AppDataSource.getRepository(TeamMember);
    const doctorsInTeams = await teamMemberRepository
      .createQueryBuilder('tm')
      .select('tm.doctor_id')
      .getRawMany();
    
    const doctorIdsInTeams = new Set(doctorsInTeams.map(tm => tm.tm_doctor_id));

    // Search doctors - improved search with better filtering
    const doctorRepository = AppDataSource.getRepository(Doctor);
    let doctorsQuery = doctorRepository
      .createQueryBuilder('doctor')
      .where('(LOWER(doctor.doctor_name) LIKE :search OR LOWER(doctor.clinic_name) LIKE :search OR LOWER(doctor.email) LIKE :search)', { search: `%${searchTerm}%` })
      .andWhere('doctor.is_approved = :approved', { approved: true })
      .andWhere('doctor.is_deactivated = :deactivated', { deactivated: false })
      .andWhere('doctor.user_type = :userType', { userType: 'doctor' });

    // Exclude current user if provided
    if (currentUserId) {
      doctorsQuery = doctorsQuery.andWhere('doctor.id != :currentUserId', { currentUserId });
    }

    // Exclude doctors already in teams
    if (doctorIdsInTeams.size > 0) {
      doctorsQuery = doctorsQuery.andWhere('doctor.id NOT IN (:...teamMemberIds)', { teamMemberIds: Array.from(doctorIdsInTeams) });
    }

    const doctors = await doctorsQuery
      .select([
        'doctor.id',
        'doctor.doctor_name',
        'doctor.clinic_name',
        'doctor.email',
        'doctor.tier',
        'doctor.current_sales'
      ])
      .orderBy('doctor.current_sales', 'DESC')
      .limit(20)
      .getMany();

    // Add doctors to results with relevance scoring
    doctors.forEach(doctor => {
      let relevanceScore = 0;
      
      // Exact name match gets highest score
      if (doctor.doctor_name.toLowerCase() === searchTerm) {
        relevanceScore += 100;
      } else if (doctor.doctor_name.toLowerCase().startsWith(searchTerm)) {
        relevanceScore += 50;
      } else if (doctor.doctor_name.toLowerCase().includes(searchTerm)) {
        relevanceScore += 30;
      }
      
      // Clinic name match
      if (doctor.clinic_name && doctor.clinic_name.toLowerCase().includes(searchTerm)) {
        relevanceScore += 20;
      }
      
      // Email match
      if (doctor.email && doctor.email.toLowerCase().includes(searchTerm)) {
        relevanceScore += 10;
      }
      
      // Tier similarity bonus (if current user tier is known)
      if (currentUserTier && doctor.tier === currentUserTier) {
        relevanceScore += 15;
      }
      
      // Sales similarity bonus (suggest users with similar sales)
      if (currentUserSales > 0 && doctor.current_sales) {
        const salesDiff = Math.abs(doctor.current_sales - currentUserSales);
        const salesPercentDiff = (salesDiff / currentUserSales) * 100;
        if (salesPercentDiff < 20) { // Within 20% of current user's sales
          relevanceScore += 10;
        }
      }
      
      results.push({
        id: doctor.id,
        name: doctor.doctor_name,
        type: 'Doctor',
        details: `${doctor.clinic_name || 'No clinic'} • ${doctor.email} • ${doctor.tier || 'No tier'}`,
        tier: doctor.tier,
        email: doctor.email,
        sales: doctor.current_sales,
        relevanceScore
      });
    });

    // Search teams
    const teamRepository = AppDataSource.getRepository(Team);
    const teams = await teamRepository
      .createQueryBuilder('team')
      .leftJoinAndSelect('team.members', 'member')
      .leftJoinAndSelect('member.doctor', 'doctor')
      .where('LOWER(team.name) LIKE :search', { search: `%${searchTerm}%` })
      .select([
        'team.id',
        'team.name',
        'team.tier',
        'team.total_sales',
        'member.id',
        'doctor.doctor_name',
        'doctor.clinic_name'
      ])
      .limit(5)
      .getMany();

    // Add teams to results
    teams.forEach(team => {
      const memberCount = team.members ? team.members.length : 0;
      const memberNames = team.members 
        ? team.members.map(m => m.doctor.doctor_name).join(', ')
        : 'No members';
      
      results.push({
        id: team.id,
        name: team.name,
        type: 'Team',
        details: `${memberCount} members • ${memberNames}`,
        tier: team.tier,
        sales: team.total_sales,
        memberCount
      });
    });

    // Search by tier
    let tierDoctorsQuery = doctorRepository
      .createQueryBuilder('doctor')
      .where('LOWER(doctor.tier) LIKE :search', { search: `%${searchTerm}%` })
      .andWhere('doctor.is_approved = :approved', { approved: true })
      .andWhere('doctor.is_deactivated = :deactivated', { deactivated: false })
      .andWhere('doctor.user_type = :userType', { userType: 'doctor' });

    if (currentUserId) {
      tierDoctorsQuery = tierDoctorsQuery.andWhere('doctor.id != :currentUserId', { currentUserId });
    }

    if (doctorIdsInTeams.size > 0) {
      tierDoctorsQuery = tierDoctorsQuery.andWhere('doctor.id NOT IN (:...teamMemberIds)', { teamMemberIds: Array.from(doctorIdsInTeams) });
    }

    const tierDoctors = await tierDoctorsQuery
      .select([
        'doctor.id',
        'doctor.doctor_name',
        'doctor.clinic_name',
        'doctor.email',
        'doctor.tier',
        'doctor.current_sales'
      ])
      .limit(5)
      .getMany();

    // Add tier results (avoid duplicates)
    tierDoctors.forEach(doctor => {
      const exists = results.some(r => r.id === doctor.id && r.type === 'Doctor');
      if (!exists) {
        let relevanceScore = 10; // Base score for tier match
        
        // Tier similarity bonus
        if (currentUserTier && doctor.tier === currentUserTier) {
          relevanceScore += 15;
        }
        
        // Sales similarity bonus
        if (currentUserSales > 0 && doctor.current_sales) {
          const salesDiff = Math.abs(doctor.current_sales - currentUserSales);
          const salesPercentDiff = (salesDiff / currentUserSales) * 100;
          if (salesPercentDiff < 20) {
            relevanceScore += 10;
          }
        }
        
        results.push({
          id: doctor.id,
          name: doctor.doctor_name,
          type: 'Doctor',
          details: `${doctor.clinic_name || 'No clinic'} • ${doctor.email} • ${doctor.tier || 'No tier'}`,
          tier: doctor.tier,
          email: doctor.email,
          sales: doctor.current_sales,
          relevanceScore
        });
      }
    });

    // Sort results by relevance score (highest first), then by sales
    results.sort((a, b) => {
      if (a.relevanceScore !== undefined && b.relevanceScore !== undefined) {
        if (a.relevanceScore !== b.relevanceScore) {
          return b.relevanceScore - a.relevanceScore;
        }
      }
      // Fallback to sales if relevance scores are equal or not available
      return (b.sales || 0) - (a.sales || 0);
    });

    // Limit final results to top 15
    const finalResults = results.slice(0, 15);

    // Remove relevanceScore from final output (internal use only)
    const cleanedResults = finalResults.map(({ relevanceScore, ...rest }) => rest);

    res.json({ 
      success: true, 
      results: cleanedResults,
      query: searchTerm,
      total: cleanedResults.length
    });
  } catch (error: unknown) {
    console.error('Error performing search:', error);
    res.status(500).json({ message: 'Search failed' });
  }
};
