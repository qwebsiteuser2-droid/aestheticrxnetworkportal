import { Request, Response } from 'express';
import { AppDataSource } from '../db/data-source';
import { AuthenticatedRequest } from '../types/auth';
import multer from 'multer';
import * as path from 'path';
import * as fs from 'fs';

// Configure multer for background image uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = 'uploads/backgrounds';
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'background-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const fileFilter = (req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  const allowedTypes = /jpeg|jpg|png|gif|svg|webp/;
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = allowedTypes.test(file.mimetype);

  if (mimetype && extname) {
    return cb(null, true);
  } else {
    cb(new Error('Only images (jpeg, jpg, png, gif, svg, webp) are allowed!'));
  }
};

const upload = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit for backgrounds
  fileFilter: fileFilter
}).single('background');

export const uploadBackgroundImage = (req: AuthenticatedRequest, res: Response): void => {
  if (!req.user?.is_admin) {
    res.status(403).json({ success: false, message: 'Unauthorized: Only admins can upload background images.' });
    return;
  }

  upload(req, res, (err): void => {
    if (err instanceof multer.MulterError) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        res.status(400).json({ success: false, message: 'File size too large. Max 5MB allowed.' });
        return;
      }
      res.status(400).json({ success: false, message: err.message });
      return;
    } else if (err) {
      res.status(400).json({ success: false, message: err.message });
      return;
    }

    if (!req.file) {
      res.status(400).json({ success: false, message: 'No file uploaded.' });
      return;
    }

    res.status(200).json({
      success: true,
      message: 'Background image uploaded successfully.',
      imageUrl: `/uploads/backgrounds/${req.file.filename}`
    });
  });
};

export const getAllBackgrounds = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    if (!req.user?.is_admin) {
      res.status(403).json({ success: false, message: 'Unauthorized: Only admins can access background management.' });
      return;
    }

    const query = `
      SELECT * FROM background_customizations 
      ORDER BY created_at DESC
    `;
    const backgrounds = await AppDataSource.query(query);

    res.status(200).json({ 
      success: true, 
      backgrounds 
    });
  } catch (error: any) {
    console.error('Error fetching backgrounds:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch backgrounds.', 
      error: (error instanceof Error ? error.message : String(error)) 
    });
  }
};

export const getActiveBackground = async (req: Request, res: Response): Promise<void> => {
  try {
    // Check if table exists first
    const tableExists = await AppDataSource.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'background_customizations'
      )
    `);
    
    if (!tableExists[0]?.exists) {
      // Table doesn't exist yet - return null
      res.status(200).json({ 
        success: true, 
        background: null
      });
      return;
    }
    
    const query = `
      SELECT * FROM background_customizations 
      WHERE is_active = true 
      AND (start_date IS NULL OR start_date <= CURRENT_DATE)
      AND (end_date IS NULL OR end_date >= CURRENT_DATE)
      ORDER BY created_at DESC
      LIMIT 1
    `;
    const backgrounds = await AppDataSource.query(query);

    res.status(200).json({ 
      success: true, 
      background: backgrounds[0] || null
    });
  } catch (error: any) {
    console.error('Error fetching active background:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch active background.', 
      error: (error instanceof Error ? error.message : String(error)) 
    });
  }
};

export const createBackground = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    if (!req.user?.is_admin) {
      res.status(403).json({ success: false, message: 'Unauthorized: Only admins can create backgrounds.' });
      return;
    }

    const { 
      name, 
      description, 
      background_type, 
      background_value, 
      start_date, 
      end_date, 
      occasion_type 
    } = req.body;

    if (!name || !background_type || !background_value) {
      res.status(400).json({ 
        success: false, 
        message: 'Name, background type, and background value are required.' 
      });
      return;
    }

    // If this background is being set as active, deactivate all others
    if (req.body.is_active) {
      await AppDataSource.query('UPDATE background_customizations SET is_active = false');
    }

    const newId = require('crypto').randomUUID();
    const insertQuery = `
      INSERT INTO background_customizations (
        id, name, description, background_type, background_value, is_active, 
        start_date, end_date, occasion_type, created_at, updated_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11
      ) RETURNING *
    `;
    
    const newBackground = await AppDataSource.query(insertQuery, [
      newId, name, description || null, background_type, background_value, 
      req.body.is_active || false, start_date || null, end_date || null, 
      occasion_type || null, new Date(), new Date()
    ]);

    res.status(201).json({ 
      success: true, 
      message: 'Background created successfully.', 
      background: newBackground[0] 
    });
  } catch (error: any) {
    console.error('Error creating background:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to create background.', 
      error: (error instanceof Error ? error.message : String(error)) 
    });
  }
};

export const updateBackground = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    if (!req.user?.is_admin) {
      res.status(403).json({ success: false, message: 'Unauthorized: Only admins can update backgrounds.' });
      return;
    }

    const { id } = req.params;
    const { 
      name, 
      description, 
      background_type, 
      background_value, 
      is_active, 
      start_date, 
      end_date, 
      occasion_type 
    } = req.body;

    if (!id) {
      res.status(400).json({ success: false, message: 'Background ID is required.' });
      return;
    }

    // If this background is being set as active, deactivate all others
    if (is_active) {
      await AppDataSource.query('UPDATE background_customizations SET is_active = false');
    }

    const updateQuery = `
      UPDATE background_customizations SET
        name = COALESCE($1, name),
        description = COALESCE($2, description),
        background_type = COALESCE($3, background_type),
        background_value = COALESCE($4, background_value),
        is_active = COALESCE($5, is_active),
        start_date = COALESCE($6, start_date),
        end_date = COALESCE($7, end_date),
        occasion_type = COALESCE($8, occasion_type),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $9
      RETURNING *
    `;

    const updatedBackground = await AppDataSource.query(updateQuery, [
      name, description, background_type, background_value, is_active,
      start_date, end_date, occasion_type, id
    ]);

    if (updatedBackground.length === 0) {
      res.status(404).json({ success: false, message: 'Background not found.' });
      return;
    }

    res.status(200).json({ 
      success: true, 
      message: 'Background updated successfully.', 
      background: updatedBackground[0] 
    });
  } catch (error: any) {
    console.error('Error updating background:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to update background.', 
      error: (error instanceof Error ? error.message : String(error)) 
    });
  }
};

export const deleteBackground = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    if (!req.user?.is_admin) {
      res.status(403).json({ success: false, message: 'Unauthorized: Only admins can delete backgrounds.' });
      return;
    }

    const { id } = req.params;

    if (!id) {
      res.status(400).json({ success: false, message: 'Background ID is required.' });
      return;
    }

    const deleteQuery = 'DELETE FROM background_customizations WHERE id = $1 RETURNING *';
    const deletedBackground = await AppDataSource.query(deleteQuery, [id]);

    if (deletedBackground.length === 0) {
      res.status(404).json({ success: false, message: 'Background not found.' });
      return;
    }

    res.status(200).json({ 
      success: true, 
      message: 'Background deleted successfully.' 
    });
  } catch (error: any) {
    console.error('Error deleting background:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to delete background.', 
      error: (error instanceof Error ? error.message : String(error)) 
    });
  }
};

export const activateBackground = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    if (!req.user?.is_admin) {
      res.status(403).json({ success: false, message: 'Unauthorized: Only admins can activate backgrounds.' });
      return;
    }

    const { id } = req.params;

    if (!id) {
      res.status(400).json({ success: false, message: 'Background ID is required.' });
      return;
    }

    // Deactivate all backgrounds first
    await AppDataSource.query('UPDATE background_customizations SET is_active = false');

    // Activate the selected background
    const updateQuery = `
      UPDATE background_customizations 
      SET is_active = true, updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING *
    `;
    const activatedBackground = await AppDataSource.query(updateQuery, [id]);

    if (activatedBackground.length === 0) {
      res.status(404).json({ success: false, message: 'Background not found.' });
      return;
    }

    res.status(200).json({ 
      success: true, 
      message: 'Background activated successfully.', 
      background: activatedBackground[0] 
    });
  } catch (error: any) {
    console.error('Error activating background:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to activate background.', 
      error: (error instanceof Error ? error.message : String(error)) 
    });
  }
};

export const deactivateBackground = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    if (!req.user?.is_admin) {
      res.status(403).json({ success: false, message: 'Unauthorized: Only admins can deactivate backgrounds.' });
      return;
    }

    const { id } = req.params;

    if (!id) {
      res.status(400).json({ success: false, message: 'Background ID is required.' });
      return;
    }

    // Deactivate the selected background
    const updateQuery = `
      UPDATE background_customizations 
      SET is_active = false, updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING *
    `;
    const deactivatedBackground = await AppDataSource.query(updateQuery, [id]);

    if (deactivatedBackground.length === 0) {
      res.status(404).json({ success: false, message: 'Background not found.' });
      return;
    }

    res.status(200).json({ 
      success: true, 
      message: 'Background deactivated successfully.', 
      background: deactivatedBackground[0] 
    });
  } catch (error: any) {
    console.error('Error deactivating background:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to deactivate background.', 
      error: (error instanceof Error ? error.message : String(error)) 
    });
  }
};
