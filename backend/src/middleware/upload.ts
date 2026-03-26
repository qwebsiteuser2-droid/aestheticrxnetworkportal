import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { getUploadsDir, UPLOADS_DIR } from '../config/uploadConfig';

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    // Use the cached uploads directory
    const uploadDir = UPLOADS_DIR;
    // Ensure directory exists and is writable before saving
    try {
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true, mode: 0o755 });
        console.log('✅ Created uploads directory:', uploadDir);
      }
      // Verify write permissions
      fs.accessSync(uploadDir, fs.constants.W_OK);
      cb(null, uploadDir);
    } catch (error: unknown) {
      console.error('❌ Error with uploads directory:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to access uploads directory';
      console.error('❌ Upload directory path:', uploadDir);
      cb(new Error(`File upload failed: ${errorMessage}`), '');
    }
  },
  filename: (req, file, cb) => {
    // Generate unique filename
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    // Use 'image' as fieldname if not provided, and preserve original extension
    const fieldname = file.fieldname || 'image';
    const ext = path.extname(file.originalname) || '.png';
    cb(null, `${fieldname}-${uniqueSuffix}${ext}`);
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

// Configure multer
export const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  }
});

// Middleware for single file upload with error handling
export const uploadSingle = (req: any, res: any, next: any) => {
  upload.single('image')(req, res, (err: any) => {
    if (err) {
      console.error('❌ Multer upload error:', err);
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

// Middleware for multiple file uploads
export const uploadMultiple = upload.array('images', 10);
