import { Request, Response } from 'express';
import { AppDataSource } from '../db/data-source';
import { AuthenticatedRequest } from '../types/auth';

export const getAllContactPlatforms = async (req: Request, res: Response): Promise<void> => {
  try {
    // Check if table exists first
    const tableExists = await AppDataSource.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'contact_platforms'
      )
    `);
    
    if (!tableExists[0]?.exists) {
      // Table doesn't exist yet - return empty array
      res.status(200).json({ success: true, platforms: [] });
      return;
    }
    
    const query = `
      SELECT * FROM contact_platforms 
      WHERE is_active = true 
      ORDER BY sort_order ASC, platform_name ASC
    `;
    const platforms = await AppDataSource.query(query);
    res.status(200).json({ success: true, platforms });
  } catch (error: unknown) {
    console.error('Error fetching contact platforms:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch contact platforms.' });
  }
};

export const getAdminContactPlatforms = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    if (!req.user?.is_admin) {
      res.status(403).json({ success: false, message: 'Unauthorized: Only admins can view this.' });
      return;
    }

    const query = `
      SELECT * FROM contact_platforms 
      ORDER BY sort_order ASC, platform_name ASC
    `;
    const platforms = await AppDataSource.query(query);
    res.status(200).json({ success: true, platforms });
  } catch (error: unknown) {
    console.error('Error fetching admin contact platforms:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch contact platforms.' });
  }
};

export const createContactPlatform = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    if (!req.user?.is_admin) {
      res.status(403).json({ success: false, message: 'Unauthorized: Only admins can create contact platforms.' });
      return;
    }

    const { 
      platform_name, 
      platform_type, 
      display_name, 
      contact_value, 
      icon_name, 
      custom_icon_url,
      color, 
      sort_order 
    } = req.body;

    if (!platform_name || !platform_type || !display_name || !contact_value) {
      res.status(400).json({ 
        success: false, 
        message: 'Platform name, type, display name, and contact value are required.' 
      });
      return;
    }

    // Check if platform name already exists
    const existingQuery = `SELECT id FROM contact_platforms WHERE platform_name = $1`;
    const existing = await AppDataSource.query(existingQuery, [platform_name]);
    
    if (existing.length > 0) {
      res.status(400).json({ 
        success: false, 
        message: 'A platform with this name already exists.' 
      });
      return;
    }

    const newId = require('crypto').randomUUID();
    const insertQuery = `
      INSERT INTO contact_platforms (
        id, platform_name, platform_type, display_name, contact_value, 
        icon_name, custom_icon_url, color, sort_order, is_active, created_at, updated_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12
      ) RETURNING *
    `;
    
    const newPlatform = await AppDataSource.query(insertQuery, [
      newId, platform_name, platform_type, display_name, contact_value,
      icon_name || 'GlobeAltIcon', custom_icon_url || null, color || '#6B7280', sort_order || 0, true, new Date(), new Date()
    ]);

    res.status(201).json({ 
      success: true, 
      message: 'Contact platform created successfully.', 
      platform: newPlatform[0] 
    });
  } catch (error: unknown) {
    console.error('Error creating contact platform:', error);
    res.status(500).json({ success: false, message: 'Failed to create contact platform.', error: (error instanceof Error ? error.message : String(error)) });
  }
};

export const updateContactPlatform = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    if (!req.user?.is_admin) {
      res.status(403).json({ success: false, message: 'Unauthorized: Only admins can update contact platforms.' });
      return;
    }

    const { id } = req.params;
    const { 
      platform_name, 
      platform_type, 
      display_name, 
      contact_value, 
      icon_name, 
      custom_icon_url,
      color, 
      sort_order,
      is_active 
    } = req.body;

    if (!id) {
      res.status(400).json({ success: false, message: 'Platform ID is required.' });
      return;
    }

    // Check if platform exists
    const existingQuery = `SELECT id FROM contact_platforms WHERE id = $1`;
    const existing = await AppDataSource.query(existingQuery, [id]);
    
    if (existing.length === 0) {
      res.status(404).json({ success: false, message: 'Contact platform not found.' });
      return;
    }

    // Check if platform name already exists (excluding current platform)
    if (platform_name) {
      const nameCheckQuery = `SELECT id FROM contact_platforms WHERE platform_name = $1 AND id != $2`;
      const nameExists = await AppDataSource.query(nameCheckQuery, [platform_name, id]);
      
      if (nameExists.length > 0) {
        res.status(400).json({ 
          success: false, 
          message: 'A platform with this name already exists.' 
        });
        return;
      }
    }

    const updateQuery = `
      UPDATE contact_platforms SET
        platform_name = COALESCE($1, platform_name),
        platform_type = COALESCE($2, platform_type),
        display_name = COALESCE($3, display_name),
        contact_value = COALESCE($4, contact_value),
        icon_name = COALESCE($5, icon_name),
        custom_icon_url = COALESCE($6, custom_icon_url),
        color = COALESCE($7, color),
        sort_order = COALESCE($8, sort_order),
        is_active = COALESCE($9, is_active),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $10
      RETURNING *
    `;

    const updatedPlatform = await AppDataSource.query(updateQuery, [
      platform_name, platform_type, display_name, contact_value,
      icon_name, custom_icon_url, color, sort_order, is_active, id
    ]);

    res.status(200).json({ 
      success: true, 
      message: 'Contact platform updated successfully.', 
      platform: updatedPlatform[0] 
    });
  } catch (error: unknown) {
    console.error('Error updating contact platform:', error);
    res.status(500).json({ success: false, message: 'Failed to update contact platform.', error: (error instanceof Error ? error.message : String(error)) });
  }
};

export const deleteContactPlatform = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    if (!req.user?.is_admin) {
      res.status(403).json({ success: false, message: 'Unauthorized: Only admins can delete contact platforms.' });
      return;
    }

    const { id } = req.params;

    if (!id) {
      res.status(400).json({ success: false, message: 'Platform ID is required.' });
      return;
    }

    // Check if platform exists
    const existingQuery = `SELECT id FROM contact_platforms WHERE id = $1`;
    const existing = await AppDataSource.query(existingQuery, [id]);
    
    if (existing.length === 0) {
      res.status(404).json({ success: false, message: 'Contact platform not found.' });
      return;
    }

    const deleteQuery = `DELETE FROM contact_platforms WHERE id = $1`;
    await AppDataSource.query(deleteQuery, [id]);

    res.status(200).json({ 
      success: true, 
      message: 'Contact platform deleted successfully.' 
    });
  } catch (error: unknown) {
    console.error('Error deleting contact platform:', error);
    res.status(500).json({ success: false, message: 'Failed to delete contact platform.', error: (error instanceof Error ? error.message : String(error)) });
  }
};
