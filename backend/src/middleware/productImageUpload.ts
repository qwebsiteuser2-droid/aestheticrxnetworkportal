import multer from 'multer';

// Store uploads in memory → persisted as base64 in PostgreSQL (reliable on Railway)
const storage = multer.memoryStorage();

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

const handleMulterError = (err: unknown, res: any): boolean => {
  if (!err) return false;
  console.error('❌ Product image upload error:', err);
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      res.status(400).json({
        success: false,
        message: 'File size exceeds 5MB limit',
      });
      return true;
    }
    res.status(400).json({
      success: false,
      message: `File upload error: ${err.message}`,
    });
    return true;
  }
  res.status(400).json({
    success: false,
    message: err instanceof Error ? err.message : 'File upload failed',
  });
  return true;
};

/** Main catalog image only (legacy) */
export const uploadProductImage = (req: any, res: any, next: any) => {
  productImageUpload.single('image')(req, res, (err: any) => {
    if (handleMulterError(err, res)) return;
    next();
  });
};

/** Main + front + back + side gallery images */
export const uploadProductGalleryImages = (req: any, res: any, next: any) => {
  productImageUpload.fields([
    { name: 'image', maxCount: 1 },
    { name: 'image_front', maxCount: 1 },
    { name: 'image_back', maxCount: 1 },
    { name: 'image_side', maxCount: 1 },
  ])(req, res, (err: any) => {
    if (handleMulterError(err, res)) return;
    next();
  });
};
