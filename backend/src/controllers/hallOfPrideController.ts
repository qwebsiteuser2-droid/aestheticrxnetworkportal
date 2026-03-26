import { Request, Response } from 'express';
import { AppDataSource } from '../db/data-source';
import { HallOfPride } from '../models/HallOfPride';
import { Doctor } from '../models/Doctor';
import { AuthenticatedRequest } from '../types/auth';
import gmailService from '../services/gmailService';
import { getFrontendUrlWithPath } from '../config/urlConfig';

/**
 * Get all Hall of Pride entries (public)
 */
export const getHallOfPrideEntries = async (req: Request, res: Response): Promise<void> => {
  try {
    const hallOfPrideRepository = AppDataSource.getRepository(HallOfPride);
    
    const entries = await hallOfPrideRepository.find({
      where: { is_active: true },
      relations: ['doctor', 'created_by_doctor'],
      order: { display_order: 'ASC', created_at: 'DESC' }
    });

    res.json({
      success: true,
      data: entries
    });
  } catch (error: unknown) {
    console.error('Get Hall of Pride entries error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch Hall of Pride entries'
    });
  }
};

/**
 * Get all Hall of Pride entries (admin)
 */
export const getAdminHallOfPrideEntries = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const hallOfPrideRepository = AppDataSource.getRepository(HallOfPride);
    
    const entries = await hallOfPrideRepository.find({
      relations: ['doctor', 'created_by_doctor'],
      order: { display_order: 'ASC', created_at: 'DESC' }
    });

    res.json({
      success: true,
      data: entries
    });
  } catch (error: unknown) {
    console.error('Get admin Hall of Pride entries error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch Hall of Pride entries'
    });
  }
};

/**
 * Create a new Hall of Pride entry (admin)
 */
export const createHallOfPrideEntry = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { doctor_id, title, description, achievement_type, reason, display_order, image_url } = req.body;
    const adminId = req.user?.id;

    if (!adminId) {
      res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
      return;
    }

    // Validate required fields
    if (!doctor_id || !title || !description || !achievement_type) {
      res.status(400).json({
        success: false,
        message: 'Missing required fields: doctor_id, title, description, achievement_type'
      });
      return;
    }

    // Check if doctor exists
    const doctorRepository = AppDataSource.getRepository(Doctor);
    const doctor = await doctorRepository.findOne({ where: { id: doctor_id } });
    
    if (!doctor) {
      res.status(404).json({
        success: false,
        message: 'Doctor not found'
      });
      return;
    }

    const hallOfPrideRepository = AppDataSource.getRepository(HallOfPride);
    
    const entry = hallOfPrideRepository.create({
      doctor_id,
      title,
      description,
      achievement_type,
      reason: reason || null,
      display_order: display_order || 0,
      created_by_admin: adminId,
      image_url: image_url || null,
      is_active: true
    });

    const savedEntry = await hallOfPrideRepository.save(entry);

    // Fetch the complete entry with relations
    const completeEntry = await hallOfPrideRepository.findOne({
      where: { id: savedEntry.id },
      relations: ['doctor', 'created_by_doctor']
    });

    // Send email notification to the doctor (non-blocking)
    if (doctor.email) {
      const emailSubject = `🏆 Congratulations! You've been added to the Hall of Pride - AestheticRxNetwork`;
      const emailContent = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #ffd700 0%, #ff8c00 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
            <h1 style="color: white; margin: 0; font-size: 28px;">🏆 Hall of Pride</h1>
            <p style="color: white; margin-top: 10px; font-size: 16px;">Congratulations on your achievement!</p>
          </div>
          
          <div style="padding: 30px; background-color: #f8f9fa;">
            <p style="font-size: 16px; color: #333;">Dear Dr. ${doctor.doctor_name},</p>
            
            <p style="font-size: 16px; color: #333;">
              We are thrilled to inform you that you have been recognized and added to the 
              <strong>Hall of Pride</strong> at AestheticRxNetwork!
            </p>
            
            <div style="background-color: #fff; border-left: 4px solid #ffd700; padding: 20px; margin: 20px 0; border-radius: 4px;">
              <h3 style="margin-top: 0; color: #333;">${title}</h3>
              <p style="color: #666; margin-bottom: 10px;">${description}</p>
              <p style="color: #888; font-size: 14px;">
                <strong>Achievement Type:</strong> ${achievement_type}
                ${reason ? `<br><strong>Reason:</strong> ${reason}` : ''}
              </p>
            </div>
            
            <p style="font-size: 16px; color: #333;">
              This is a significant recognition of your dedication and contributions to our community.
              Your achievement will be displayed on our Hall of Pride page for all to see!
            </p>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${getFrontendUrlWithPath('/hall-of-pride')}" 
                 style="background: linear-gradient(135deg, #ffd700 0%, #ff8c00 100%); color: white; padding: 14px 30px; text-decoration: none; border-radius: 25px; display: inline-block; font-weight: bold;">
                View Hall of Pride
              </a>
            </div>
            
            <p style="font-size: 16px; color: #333;">
              Keep up the excellent work!
            </p>
          </div>
          
          <div style="padding: 20px; background-color: #333; text-align: center; border-radius: 0 0 10px 10px;">
            <p style="color: #999; font-size: 12px; margin: 0;">
              This is an automated message from AestheticRxNetwork system.
            </p>
          </div>
        </div>
      `;

      // Send in background to not block the response
      gmailService.sendEmail(doctor.email, emailSubject, emailContent, {
        isMarketing: false,
        userId: doctor.id
      }).then(() => {
        console.log(`✅ Hall of Pride email notification sent to ${doctor.email}`);
      }).catch((emailError) => {
        console.error('Failed to send Hall of Pride email notification:', emailError);
      });
    }

    res.status(201).json({
      success: true,
      data: completeEntry,
      message: 'Hall of Pride entry created successfully'
    });
  } catch (error: unknown) {
    console.error('Create Hall of Pride entry error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create Hall of Pride entry'
    });
  }
};

/**
 * Update a Hall of Pride entry (admin)
 */
export const updateHallOfPrideEntry = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { title, description, achievement_type, reason, display_order, is_active, image_url } = req.body;

    const hallOfPrideRepository = AppDataSource.getRepository(HallOfPride);
    
    const entry = await hallOfPrideRepository.findOne({
      where: { id },
      relations: ['doctor', 'created_by_doctor']
    });

    if (!entry) {
      res.status(404).json({
        success: false,
        message: 'Hall of Pride entry not found'
      });
      return;
    }

    // Update fields
    if (title !== undefined) entry.title = title;
    if (description !== undefined) entry.description = description;
    if (achievement_type !== undefined) entry.achievement_type = achievement_type;
    if (reason !== undefined) entry.reason = reason;
    if (display_order !== undefined) entry.display_order = display_order;
    if (is_active !== undefined) entry.is_active = is_active;
    if (image_url !== undefined) entry.image_url = image_url;

    const updatedEntry = await hallOfPrideRepository.save(entry);

    res.json({
      success: true,
      data: updatedEntry,
      message: 'Hall of Pride entry updated successfully'
    });
  } catch (error: unknown) {
    console.error('Update Hall of Pride entry error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update Hall of Pride entry'
    });
  }
};

/**
 * Delete a Hall of Pride entry (admin)
 */
export const deleteHallOfPrideEntry = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const hallOfPrideRepository = AppDataSource.getRepository(HallOfPride);
    
    const entry = await hallOfPrideRepository.findOne({ where: { id } });

    if (!entry) {
      res.status(404).json({
        success: false,
        message: 'Hall of Pride entry not found'
      });
      return;
    }

    await hallOfPrideRepository.remove(entry);

    res.json({
      success: true,
      message: 'Hall of Pride entry deleted successfully'
    });
  } catch (error: unknown) {
    console.error('Delete Hall of Pride entry error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete Hall of Pride entry'
    });
  }
};

/**
 * Get available doctors for Hall of Pride (admin)
 */
export const getAvailableDoctorsForHallOfPride = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const doctorRepository = AppDataSource.getRepository(Doctor);
    
    const doctors = await doctorRepository.find({
      where: { is_approved: true },
      select: ['id', 'doctor_name', 'clinic_name', 'email', 'profile_photo_url'],
      order: { doctor_name: 'ASC' }
    });

    res.json({
      success: true,
      data: doctors
    });
  } catch (error: unknown) {
    console.error('Get available doctors error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch available doctors'
    });
  }
};
