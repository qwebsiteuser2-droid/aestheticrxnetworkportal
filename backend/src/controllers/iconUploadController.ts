import { Request, Response } from 'express';
import multer from 'multer';
import * as path from 'path';
import * as fs from 'fs';
import { AuthenticatedRequest } from '../types/auth';

// Configure multer for icon uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = 'uploads/icons';
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    // Generate unique filename with timestamp
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, `icon-${uniqueSuffix}${ext}`);
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 2 * 1024 * 1024, // 2MB limit
  },
  fileFilter: (req, file, cb) => {
    // Allow only image files
    const allowedTypes = /jpeg|jpg|png|gif|svg|webp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Only image files (JPEG, PNG, GIF, SVG, WebP) are allowed!'));
    }
  }
});

export const uploadIcon = upload.single('icon');

export const handleIconUpload = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    if (!req.user?.is_admin) {
      res.status(403).json({ success: false, message: 'Unauthorized: Only admins can upload icons.' });
      return;
    }

    if (!req.file) {
      res.status(400).json({ success: false, message: 'No icon file provided.' });
      return;
    }

    const iconUrl = `/uploads/icons/${req.file.filename}`;
    
    res.status(200).json({
      success: true,
      message: 'Icon uploaded successfully.',
      iconUrl: iconUrl,
      filename: req.file.filename
    });
  } catch (error: unknown) {
    console.error('Error uploading icon:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to upload icon.', 
      error: (error instanceof Error ? error.message : String(error)) 
    });
  }
};

export const deleteIcon = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    if (!req.user?.is_admin) {
      res.status(403).json({ success: false, message: 'Unauthorized: Only admins can delete icons.' });
      return;
    }

    const { filename } = req.params;
    const iconPath = path.join('uploads/icons', filename);

    // Check if file exists
    if (fs.existsSync(iconPath)) {
      fs.unlinkSync(iconPath);
      res.status(200).json({ success: true, message: 'Icon deleted successfully.' });
    } else {
      res.status(404).json({ success: false, message: 'Icon file not found.' });
    }
  } catch (error: unknown) {
    console.error('Error deleting icon:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to delete icon.', 
      error: (error instanceof Error ? error.message : String(error)) 
    });
  }
};
