import multer from 'multer';
import path from 'path';
import fs from 'fs';
// ffmpeg will be imported dynamically if available
let ffmpeg: any = null;
try {
  ffmpeg = require('fluent-ffmpeg');
} catch {
  // ffmpeg not available, validation will be skipped
}

// Ensure uploads directory exists
const getUploadsDir = (): string => {
  const uploadsDir = process.env.CI || process.env.NODE_ENV === 'test' 
    ? path.join(process.cwd(), 'uploads') 
    : '/app/uploads';
  
  if (!fs.existsSync(uploadsDir)) {
    try {
      fs.mkdirSync(uploadsDir, { recursive: true });
    } catch (error) {
      const fallbackDir = path.join(process.cwd(), 'tmp', 'uploads');
      if (!fs.existsSync(fallbackDir)) {
        fs.mkdirSync(fallbackDir, { recursive: true });
      }
      return fallbackDir;
    }
  }
  return uploadsDir;
};

// File size limits (in bytes)
const MAX_VIDEO_SIZE = 50 * 1024 * 1024; // 50MB for videos
const MAX_IMAGE_SIZE = 2 * 1024 * 1024; // 2MB for images
const MAX_ANIMATION_SIZE = 5 * 1024 * 1024; // 5MB for GIF animations
const MAX_THUMBNAIL_SIZE = 1 * 1024 * 1024; // 1MB for thumbnails

// Configure storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    let uploadPath = path.join(getUploadsDir(), 'advertisements');
    
    if (file.fieldname === 'video_file' || file.fieldname === 'video') {
      uploadPath = path.join(uploadPath, 'videos');
    } else if (file.fieldname === 'image_file' || file.fieldname === 'image') {
      uploadPath = path.join(uploadPath, 'images');
    } else if (file.fieldname === 'animation_file' || file.fieldname === 'animation') {
      uploadPath = path.join(uploadPath, 'animations');
    } else if (file.fieldname === 'thumbnail' || file.fieldname === 'thumb') {
      uploadPath = path.join(uploadPath, 'thumbnails');
    } else if (file.fieldname === 'preview_image' || file.fieldname === 'screenshot') {
      uploadPath = path.join(uploadPath, 'previews');
    }
    
    // Create directory if it doesn't exist
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, file.fieldname + '-' + uniqueSuffix + ext);
  }
});

// File filter with strict validation
const fileFilter = (req: any, file: any, cb: any) => {
  const fileType = file.mimetype;
  const fileExt = path.extname(file.originalname).toLowerCase();
  
  // Define allowed types
  const allowedTypes: { [key: string]: string[] } = {
    'video/mp4': ['.mp4'],
    'video/webm': ['.webm'],
    'video/quicktime': ['.mov'],
    'image/jpeg': ['.jpg', '.jpeg'],
    'image/png': ['.png'],
    'image/gif': ['.gif']
  };

  // Check if file type is allowed
  const allowedExtensions = allowedTypes[fileType];
  if (!allowedExtensions || !allowedExtensions.includes(fileExt)) {
    // Special case: Allow GIF files even if mimetype doesn't match exactly
    if (fileExt === '.gif' && (fileType === 'image/gif' || fileType.startsWith('image/'))) {
      // Allow GIF files
    } else {
      cb(new Error(`Invalid file type. Allowed: ${Object.keys(allowedTypes).join(', ')}`));
      return;
    }
  }

  // Check file size based on type
  const fieldName = file.fieldname.toLowerCase();
  let maxSize = MAX_IMAGE_SIZE; // Default
  
  if (fieldName.includes('video')) {
    maxSize = MAX_VIDEO_SIZE;
  } else if (fieldName.includes('animation') || fileExt === '.gif') {
    maxSize = MAX_ANIMATION_SIZE;
  } else if (fieldName.includes('thumbnail') || fieldName.includes('thumb')) {
    maxSize = MAX_THUMBNAIL_SIZE;
  } else if (fieldName.includes('image') || fieldName.includes('preview') || fieldName.includes('screenshot')) {
    maxSize = MAX_IMAGE_SIZE;
  }
  
  // Check file size before upload
  if (file.size > maxSize) {
    const maxSizeMB = (maxSize / (1024 * 1024)).toFixed(1);
    const fileSizeMB = (file.size / (1024 * 1024)).toFixed(1);
    cb(new Error(`File size (${fileSizeMB}MB) exceeds maximum allowed size (${maxSizeMB}MB). Please compress your file or choose a smaller one.`));
    return;
  }

  // Store max size in request for later validation
  (req as any).fileMaxSize = maxSize;
  (req as any).fileType = fieldName.includes('video') ? 'video' : 
                          fieldName.includes('animation') ? 'animation' : 'image';

  cb(null, true);
};

// Configure multer
export const advertisementUpload = multer({
  storage: storage,
  limits: {
    fileSize: MAX_VIDEO_SIZE, // Use max video size as global limit (50MB)
  },
  fileFilter: fileFilter
});

// Validate video duration - DISABLED: No duration restrictions
// Users can upload videos of any length. Auto-rotation handles display timing.
export const validateVideoDuration = async (filePath: string): Promise<{ valid: boolean; duration?: number; error?: string }> => {
  // Always return valid - no duration restrictions
  // Auto-rotation (default 5 seconds) will handle how long each ad displays
  return { valid: true };
};

// Compress/optimize video (optional, for future use)
export const optimizeVideo = async (inputPath: string, outputPath: string): Promise<void> => {
  if (!ffmpeg) {
    throw new Error('ffmpeg not available');
  }

  return new Promise((resolve, reject) => {
    ffmpeg(inputPath)
      .outputOptions([
        '-c:v libx264',
        '-preset medium',
        '-crf 23',
        '-maxrate 2M',
        '-bufsize 4M',
        '-c:a aac',
        '-b:a 128k',
        '-movflags +faststart'
      ])
      .on('end', () => resolve())
      .on('error', (err: any) => reject(err))
      .save(outputPath);
  });
};

// Compress image (optional, for future use)
export const optimizeImage = async (inputPath: string, outputPath: string): Promise<void> => {
  // This would use sharp or similar library
  // For now, just copy the file
  fs.copyFileSync(inputPath, outputPath);
};

// Middleware exports
export const uploadVideo = advertisementUpload.single('video_file');
export const uploadImage = advertisementUpload.single('image_file');
export const uploadAnimation = advertisementUpload.single('animation_file');
export const uploadPreview = advertisementUpload.single('preview_image');

// Multiple file uploads
export const uploadAdvertisementFiles = advertisementUpload.fields([
  { name: 'video_file', maxCount: 1 },
  { name: 'image_file', maxCount: 1 },
  { name: 'animation_file', maxCount: 1 },
  { name: 'preview_image', maxCount: 1 }
]);

