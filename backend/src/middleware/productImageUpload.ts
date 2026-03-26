import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { PRODUCTS_PICS_DIR } from '../config/uploadConfig';

// Configure multer for product image uploads (stored in products_pics)
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    // Use products_pics directory for product images
    const uploadDir = PRODUCTS_PICS_DIR;
    // Ensure directory exists and is writable before saving
    try {
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true, mode: 0o755 });
        console.log('✅ Created products_pics directory:', uploadDir);
      }
      // Verify write permissions
      fs.accessSync(uploadDir, fs.constants.W_OK);
      cb(null, uploadDir);
    } catch (error: unknown) {
      console.error('❌ Error with products_pics directory:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to access products_pics directory';
      console.error('❌ Products pics directory path:', uploadDir);
      cb(new Error(`File upload failed: ${errorMessage}`), '');
    }
  },
  filename: (req, file, cb) => {
    // Generate unique filename
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    // Use original filename or generate one
    const originalName = path.parse(file.originalname).name;
    const ext = path.extname(file.originalname) || '.png';
    // Sanitize filename (remove special characters)
    const sanitizedName = originalName.replace(/[^a-zA-Z0-9_-]/g, '_');
    cb(null, `${sanitizedName}-${uniqueSuffix}${ext}`);
  }
});

// File filter for images only
const fileFilter = (req: any, file: any, cb: any) => {
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('Only image files are allowed!'));
  }
};

// Configure multer for product images
export const productImageUpload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  }
});

// Middleware for single product image upload with error handling
export const uploadProductImage = (req: any, res: any, next: any) => {
  productImageUpload.single('image')(req, res, (err: any) => {
    if (err) {
      console.error('❌ Product image upload error:', err);
      if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          return res.status(400).json({
            success: false,
            message: 'File size exceeds 5MB limit'
          });
        }
        return res.status(400).json({
          success: false,
          message: `File upload error: ${err.message}`
        });
      }
      // Handle other errors (e.g., file filter errors)
      return res.status(400).json({
        success: false,
        message: err.message || 'File upload failed'
      });
    }
    next();
  });
};
