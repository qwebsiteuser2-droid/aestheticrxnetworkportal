import { Request, Response } from 'express';
import { AppDataSource } from '../db/data-source';
import { TeamTierConfig } from '../entities/TeamTierConfig';

interface AuthenticatedRequest extends Request {
  user?: any;
}

/**
 * Get all team tier configurations (admin only)
 */
export const getTeamTierConfigs = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const user = req.user!;
    if (!user.is_admin) {
      res.status(403).json({
        success: false,
        message: 'Admin access required'
      });
      return;
    }

    const teamTierRepository = AppDataSource.getRepository(TeamTierConfig);
    const teamTiers = await teamTierRepository.find({
      order: { display_order: 'ASC', created_at: 'ASC' }
    });

    res.json({
      success: true,
      data: {
        teamTiers: teamTiers.map(tier => tier.toJSON())
      }
    });
  } catch (error: unknown) {
    console.error('Error fetching team tier configs:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch team tier configurations',
      error: error instanceof Error ? (error instanceof Error ? error.message : String(error)) : 'Unknown error'
    });
  }
};

/**
 * Create a new team tier configuration (admin only)
 */
export const createTeamTierConfig = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
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
      name, 
      description, 
      benefits, 
      icon, 
      color, 
      individual_threshold, 
      max_members, 
      discount_2_members,
      discount_3_members,
      discount_4_members,
      display_order, 
      is_active 
    } = req.body;

    // Validate required fields
    if (!name || !description || !benefits || !icon || !color || individual_threshold === undefined) {
      res.status(400).json({
        success: false,
        message: 'Missing required fields: name, description, benefits, icon, color, individual_threshold'
      });
      return;
    }

    const teamTierRepository = AppDataSource.getRepository(TeamTierConfig);

    // Check if tier with same name already exists
    const existingTier = await teamTierRepository.findOne({ where: { name } });
    if (existingTier) {
      res.status(400).json({
        success: false,
        message: 'Team tier with this name already exists'
      });
      return;
    }

    const teamTierConfig = teamTierRepository.create({
      name,
      description,
      benefits,
      icon,
      color,
      individual_threshold: parseFloat(individual_threshold),
      max_members: max_members || 3,
      discount_2_members: discount_2_members !== undefined ? parseFloat(discount_2_members) : 5.00,
      discount_3_members: discount_3_members !== undefined ? parseFloat(discount_3_members) : 10.00,
      discount_4_members: discount_4_members !== undefined ? parseFloat(discount_4_members) : 15.00,
      display_order: display_order || 0,
      is_active: is_active !== undefined ? is_active : true
    });

    const savedTier = await teamTierRepository.save(teamTierConfig);

    res.status(201).json({
      success: true,
      message: 'Team tier configuration created successfully',
      data: {
        teamTier: savedTier.toJSON()
      }
    });
  } catch (error: unknown) {
    console.error('Error creating team tier config:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create team tier configuration',
      error: error instanceof Error ? (error instanceof Error ? error.message : String(error)) : 'Unknown error'
    });
  }
};

/**
 * Update a team tier configuration (admin only)
 */
export const updateTeamTierConfig = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
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
    const updateData = req.body;

    const teamTierRepository = AppDataSource.getRepository(TeamTierConfig);
    const teamTier = await teamTierRepository.findOne({ where: { id } });

    if (!teamTier) {
      res.status(404).json({
        success: false,
        message: 'Team tier configuration not found'
      });
      return;
    }

    // Check if name is being changed and if it conflicts with existing tier
    if (updateData.name && updateData.name !== teamTier.name) {
      const existingTier = await teamTierRepository.findOne({ where: { name: updateData.name } });
      if (existingTier) {
        res.status(400).json({
          success: false,
          message: 'Team tier with this name already exists'
        });
        return;
      }
    }

    // Update fields with proper type conversion
    if (updateData.name !== undefined) teamTier.name = updateData.name;
    if (updateData.description !== undefined) teamTier.description = updateData.description;
    if (updateData.benefits !== undefined) teamTier.benefits = updateData.benefits;
    if (updateData.icon !== undefined) teamTier.icon = updateData.icon;
    if (updateData.color !== undefined) teamTier.color = updateData.color;
    if (updateData.individual_threshold !== undefined) {
      teamTier.individual_threshold = parseFloat(String(updateData.individual_threshold));
    }
    if (updateData.max_members !== undefined) {
      teamTier.max_members = parseInt(String(updateData.max_members));
    }
    if (updateData.discount_2_members !== undefined) {
      teamTier.discount_2_members = parseFloat(String(updateData.discount_2_members));
    }
    if (updateData.discount_3_members !== undefined) {
      teamTier.discount_3_members = parseFloat(String(updateData.discount_3_members));
    }
    if (updateData.discount_4_members !== undefined) {
      teamTier.discount_4_members = parseFloat(String(updateData.discount_4_members));
    }
    if (updateData.display_order !== undefined) {
      teamTier.display_order = parseInt(String(updateData.display_order));
    }
    if (updateData.is_active !== undefined) {
      teamTier.is_active = Boolean(updateData.is_active);
    }

    const updatedTier = await teamTierRepository.save(teamTier);

    res.json({
      success: true,
      message: 'Team tier configuration updated successfully',
      data: {
        teamTier: updatedTier.toJSON()
      }
    });
  } catch (error: unknown) {
    console.error('Error updating team tier config:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update team tier configuration',
      error: error instanceof Error ? (error instanceof Error ? error.message : String(error)) : 'Unknown error'
    });
  }
};

/**
 * Delete a team tier configuration (admin only)
 */
export const deleteTeamTierConfig = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
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

    const teamTierRepository = AppDataSource.getRepository(TeamTierConfig);
    const teamTier = await teamTierRepository.findOne({ where: { id } });

    if (!teamTier) {
      res.status(404).json({
        success: false,
        message: 'Team tier configuration not found'
      });
      return;
    }

    await teamTierRepository.remove(teamTier);

    res.json({
      success: true,
      message: 'Team tier configuration deleted successfully'
    });
  } catch (error: unknown) {
    console.error('Error deleting team tier config:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete team tier configuration',
      error: error instanceof Error ? (error instanceof Error ? error.message : String(error)) : 'Unknown error'
    });
  }
};

/**
 * Get team tier pricing information for a specific team size
 */
export const getTeamTierPricing = async (req: Request, res: Response): Promise<void> => {
  try {
    const { teamSize } = req.params;
    const teamSizeNum = teamSize ? parseInt(teamSize) : 0;

    if (isNaN(teamSizeNum) || teamSizeNum < 1) {
      res.status(400).json({
        success: false,
        message: 'Invalid team size'
      });
      return;
    }

    const teamTierRepository = AppDataSource.getRepository(TeamTierConfig);
    const teamTiers = await teamTierRepository.find({
      where: { is_active: true },
      order: { display_order: 'ASC' }
    });

    const pricingInfo = teamTiers.map(tier => ({
      id: tier.id,
      name: tier.name,
      description: tier.description,
      benefits: tier.benefits,
      icon: tier.icon,
      color: tier.color,
      individual_threshold: tier.individual_threshold,
      team_threshold: tier.calculateTeamThreshold(teamSizeNum),
      discount_percentage: tier.calculateDiscountPercentage(teamSizeNum),
      final_price: tier.calculateTeamPrice(teamSizeNum),
      savings: tier.calculateSavings(teamSizeNum),
      max_members: tier.max_members
    }));

    res.json({
      success: true,
      data: {
        teamSize: teamSizeNum,
        pricing: pricingInfo
      }
    });
  } catch (error: unknown) {
    console.error('Error getting team tier pricing:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get team tier pricing',
      error: error instanceof Error ? (error instanceof Error ? error.message : String(error)) : 'Unknown error'
    });
  }
};

/**
 * Get team formula configuration (admin only)
 */
export const getTeamFormula = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const user = req.user!;
    if (!user.is_admin) {
      res.status(403).json({
        success: false,
        message: 'Admin access required'
      });
      return;
    }

    // For now, return default formula configuration
    // In the future, this could be stored in database
    const formula = {
      solo_multiplier: 1,
      two_member_discount: 5,
      three_member_discount: 10,
      four_plus_member_discount: 15,
      four_plus_additional_discount: 5
    };

    res.json({
      success: true,
      data: {
        formula
      }
    });
  } catch (error: unknown) {
    console.error('Error getting team formula:', error);
    res.status(500).json({ success: false, message: 'Failed to get team formula' });
  }
};

/**
 * Update team formula configuration (admin only)
 */
export const updateTeamFormula = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const user = req.user!;
    if (!user.is_admin) {
      res.status(403).json({
        success: false,
        message: 'Admin access required'
      });
      return;
    }

    const { formula } = req.body;

    if (!formula) {
      res.status(400).json({
        success: false,
        message: 'Formula configuration is required'
      });
      return;
    }

    // Validate formula values
    if (typeof formula.solo_multiplier !== 'number' || 
        typeof formula.two_member_discount !== 'number' ||
        typeof formula.three_member_discount !== 'number' ||
        typeof formula.four_plus_member_discount !== 'number' ||
        typeof formula.four_plus_additional_discount !== 'number') {
      res.status(400).json({
        success: false,
        message: 'All formula values must be numbers'
      });
      return;
    }

    // For now, just return success
    // In the future, this could be stored in database
    console.log('Team formula updated:', formula);

    res.json({
      success: true,
      message: 'Team formula updated successfully',
      data: {
        formula
      }
    });
  } catch (error: unknown) {
    console.error('Error updating team formula:', error);
    res.status(500).json({ success: false, message: 'Failed to update team formula' });
  }
};
