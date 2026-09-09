import multer from 'multer';

const storage = multer.memoryStorage();

const fileFilter = (req: any, file: any, cb: any) => {
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('Only image files are allowed'));
  }
};

export const profilePhotoUpload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 2 * 1024 * 1024, // 2MB after client compress
  },
});

export const uploadProfilePhoto = (req: any, res: any, next: any) => {
  profilePhotoUpload.single('photo')(req, res, (err: any) => {
    if (!err) return next();
    if (err instanceof multer.MulterError && err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        message: 'Photo exceeds 2MB limit. Compress the image and try again.',
      });
    }
    return res.status(400).json({
      success: false,
      message: err instanceof Error ? err.message : 'Photo upload failed',
    });
  });
};
