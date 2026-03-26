import { Request, Response } from 'express';
import { AppDataSource } from '../db/data-source';
import { Badge } from '../models/Badge';
import { Doctor } from '../models/Doctor';
import { AuthenticatedRequest } from '../types/auth';

/**
 * Get all badges (admin only)
 */
export const getAllBadges = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const admin = req.user!;
    if (!admin.is_admin) {
      res.status(403).json({
        success: false,
        message: 'Admin access required'
      });
      return;
    }

    const badgeRepository = AppDataSource.getRepository(Badge);
    const badges = await badgeRepository.find({
      relations: ['doctor'],
      order: { created_at: 'DESC' }
    });

    res.json({
      success: true,
      data: badges
    });
  } catch (error: unknown) {
    console.error('Error fetching badges:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch badges'
    });
  }
};

/**
 * Get badges for a specific user
 */
export const getUserBadges = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { userId } = req.params;

    const badgeRepository = AppDataSource.getRepository(Badge);
    const badges = await badgeRepository.find({
      where: { 
        doctor_id: userId,
        is_active: true
      },
      order: { earned_date: 'DESC' }
    });

    res.json({
      success: true,
      data: badges
    });
  } catch (error: unknown) {
    console.error('Error fetching user badges:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch user badges'
    });
  }
};

/**
 * Create a new badge and assign it to a user (admin only)
 */
export const createBadge = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const admin = req.user!;
    if (!admin.is_admin) {
      res.status(403).json({
        success: false,
        message: 'Admin access required'
      });
      return;
    }

    const { doctor_id, name, description, icon, color, badge_type, notes } = req.body;

    if (!doctor_id || !name || !description) {
      res.status(400).json({
        success: false,
        message: 'doctor_id, name, and description are required'
      });
      return;
    }

    // Verify doctor exists
    const doctorRepository = AppDataSource.getRepository(Doctor);
    const doctor = await doctorRepository.findOne({ where: { id: doctor_id } });
    if (!doctor) {
      res.status(404).json({
        success: false,
        message: 'Doctor not found'
      });
      return;
    }

    const badgeRepository = AppDataSource.getRepository(Badge);
    const badge = badgeRepository.create({
      doctor_id,
      name,
      description,
      icon: icon || '🏅',
      color: color || 'blue',
      badge_type: badge_type || 'achievement',
      earned_date: new Date(),
      is_active: true,
      assigned_by: admin.id,
      notes: notes || null
    });

    const savedBadge = await badgeRepository.save(badge);

    res.json({
      success: true,
      message: 'Badge created and assigned successfully',
      data: savedBadge
    });
  } catch (error: unknown) {
    console.error('Error creating badge:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create badge'
    });
  }
};

/**
 * Update a badge (admin only)
 */
export const updateBadge = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const admin = req.user!;
    if (!admin.is_admin) {
      res.status(403).json({
        success: false,
        message: 'Admin access required'
      });
      return;
    }

    const { id } = req.params;
    const { name, description, icon, color, badge_type, is_active, notes } = req.body;

    const badgeRepository = AppDataSource.getRepository(Badge);
    const badge = await badgeRepository.findOne({ where: { id } });

    if (!badge) {
      res.status(404).json({
        success: false,
        message: 'Badge not found'
      });
      return;
    }

    if (name) badge.name = name;
    if (description) badge.description = description;
    if (icon) badge.icon = icon;
    if (color) badge.color = color;
    if (badge_type) badge.badge_type = badge_type;
    if (typeof is_active === 'boolean') badge.is_active = is_active;
    if (notes !== undefined) badge.notes = notes;

    const updatedBadge = await badgeRepository.save(badge);

    res.json({
      success: true,
      message: 'Badge updated successfully',
      data: updatedBadge
    });
  } catch (error: unknown) {
    console.error('Error updating badge:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update badge'
    });
  }
};

/**
 * Delete a badge (admin only)
 */
export const deleteBadge = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const admin = req.user!;
    if (!admin.is_admin) {
      res.status(403).json({
        success: false,
        message: 'Admin access required'
      });
      return;
    }

    const { id } = req.params;

    const badgeRepository = AppDataSource.getRepository(Badge);
    const badge = await badgeRepository.findOne({ where: { id } });

    if (!badge) {
      res.status(404).json({
        success: false,
        message: 'Badge not found'
      });
      return;
    }

    await badgeRepository.remove(badge);

    res.json({
      success: true,
      message: 'Badge deleted successfully'
    });
  } catch (error: unknown) {
    console.error('Error deleting badge:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete badge'
    });
  }
};

