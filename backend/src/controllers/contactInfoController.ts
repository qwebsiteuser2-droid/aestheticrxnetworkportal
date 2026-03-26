import { Request, Response } from 'express';
import { AppDataSource } from '../db/data-source';
import { AuthenticatedRequest } from '../types/auth';

// Get contact information (Public)
export const getContactInfo = async (req: Request, res: Response): Promise<void> => {
  try {
    // Fetch contact information using raw SQL
    const query = `
      SELECT * FROM contact_info 
      WHERE is_active = true 
      ORDER BY created_at DESC 
      LIMIT 1
    `;
    
    const contactInfo = await AppDataSource.query(query);
    
    if (contactInfo.length === 0) {
      // Return default contact info if none exists
      res.status(200).json({ 
        success: true, 
        data: {
          whatsapp: '+1234567890',
          gmail: 'asadkhanbloch4949@gmail.com',
          facebook: '',
          instagram: '',
          linkedin: '',
          twitter: '',
          tiktok: ''
        }
      });
      return;
    }

    res.status(200).json({ 
      success: true, 
      data: contactInfo[0]
    });
  } catch (error: unknown) {
    console.error('Error fetching contact info:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch contact information.', 
      error: (error instanceof Error ? error.message : String(error)) 
    });
  }
};

// Update contact information (Admin only)
export const updateContactInfo = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    if (!req.user || !req.user.is_admin) {
      res.status(403).json({ 
        success: false, 
        message: 'Unauthorized: Only admins can update contact information.' 
      });
      return;
    }

    const { 
      whatsapp, 
      gmail, 
      facebook, 
      instagram, 
      linkedin, 
      twitter, 
      tiktok 
    } = req.body;

    // First, deactivate all existing contact info
    await AppDataSource.query('UPDATE contact_info SET is_active = false');

    // Create new contact info entry
    const contactInfoId = require('crypto').randomUUID();
    
    const insertQuery = `
      INSERT INTO contact_info (
        id, whatsapp, gmail, facebook, instagram, linkedin, twitter, tiktok, is_active, created_at, updated_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11
      )
    `;
    
    const values = [
      contactInfoId,
      whatsapp || '',
      gmail || '',
      facebook || '',
      instagram || '',
      linkedin || '',
      twitter || '',
      tiktok || '',
      true,
      new Date(),
      new Date()
    ];

    await AppDataSource.query(insertQuery, values);
    
    console.log('✅ Contact information updated successfully');

    res.status(200).json({ 
      success: true, 
      message: 'Contact information updated successfully.',
      data: {
        id: contactInfoId,
        whatsapp,
        gmail,
        facebook,
        instagram,
        linkedin,
        twitter,
        tiktok
      }
    });
  } catch (error: unknown) {
    console.error('Error updating contact info:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to update contact information.', 
      error: (error instanceof Error ? error.message : String(error)) 
    });
  }
};

// Get contact information for admin (Admin only)
export const getContactInfoForAdmin = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    if (!req.user || !req.user.is_admin) {
      res.status(403).json({ 
        success: false, 
        message: 'Unauthorized: Only admins can view contact information management.' 
      });
      return;
    }

    // Fetch latest contact information
    const query = `
      SELECT * FROM contact_info 
      ORDER BY created_at DESC 
      LIMIT 1
    `;
    
    const contactInfo = await AppDataSource.query(query);
    
    if (contactInfo.length === 0) {
      // Return default contact info if none exists
      res.status(200).json({ 
        success: true, 
        data: {
          whatsapp: '+1234567890',
          gmail: 'asadkhanbloch4949@gmail.com',
          facebook: '',
          instagram: '',
          linkedin: '',
          twitter: '',
          tiktok: ''
        }
      });
      return;
    }

    res.status(200).json({ 
      success: true, 
      data: contactInfo[0]
    });
  } catch (error: unknown) {
    console.error('Error fetching contact info for admin:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch contact information.', 
      error: (error instanceof Error ? error.message : String(error)) 
    });
  }
};
