import * as fs from 'fs';
import * as path from 'path';

/**
 * Get the uploads directory path
 * Tries /app/uploads first (if volume exists), falls back to /tmp/uploads (always writable)
 */
export const getUploadsDir = (): string => {
  const isRailway = process.env.RAILWAY_ENVIRONMENT || process.env.RAILWAY_PROJECT_ID;
  const isProduction = process.env.NODE_ENV === 'production' && !process.env.CI;
  
  // Try /app/uploads first (Railway volume mount point, if volume exists)
  if (isRailway || isProduction) {
    const railwayUploadsDir = '/app/uploads';
    try {
      // Check if directory exists and is writable
      if (fs.existsSync(railwayUploadsDir)) {
        // Test write permissions
        fs.accessSync(railwayUploadsDir, fs.constants.W_OK);
        console.log('✅ Using /app/uploads (volume mount)');
        return railwayUploadsDir;
      } else {
        // Try to create it
        try {
          fs.mkdirSync(railwayUploadsDir, { recursive: true, mode: 0o755 });
          // Set permissions explicitly
          fs.chmodSync(railwayUploadsDir, 0o755);
          console.log('✅ Created /app/uploads directory');
          return railwayUploadsDir;
        } catch (createError: unknown) {
          console.warn('⚠️ Could not create /app/uploads, using /tmp/uploads fallback:', createError);
        }
      }
    } catch (accessError: unknown) {
      console.warn('⚠️ /app/uploads not writable, using /tmp/uploads fallback:', accessError);
    }
    
    // Fallback: Use /tmp/uploads (writable in Railway containers)
    const tmpUploadsDir = '/tmp/uploads';
    try {
      if (!fs.existsSync(tmpUploadsDir)) {
        fs.mkdirSync(tmpUploadsDir, { recursive: true, mode: 0o755 });
      }
      fs.accessSync(tmpUploadsDir, fs.constants.W_OK);
      console.log('📁 Using fallback uploads directory: /tmp/uploads');
      return tmpUploadsDir;
    } catch (tmpError: unknown) {
      console.error('❌ Could not use /tmp/uploads fallback:', tmpError);
    }
  }
  
  // Local development or CI: use project directory
  const localUploadsDir = path.join(process.cwd(), 'uploads');
  try {
    if (!fs.existsSync(localUploadsDir)) {
      fs.mkdirSync(localUploadsDir, { recursive: true });
    }
    return localUploadsDir;
  } catch (localError: unknown) {
    console.error('❌ Could not use local uploads directory:', localError);
    // Last resort: OS temp directory
    const os = require('os');
    return path.join(os.tmpdir(), 'uploads');
  }
};

// Get products_pics directory (for product images that should persist)
export const getProductsPicsDir = (): string => {
  const isRailway = process.env.RAILWAY_ENVIRONMENT || process.env.RAILWAY_PROJECT_ID;
  const isProduction = process.env.NODE_ENV === 'production' && !process.env.CI;
  
  if (isRailway || isProduction) {
    // Railway: use /app/products_pics (included in Docker build)
    return '/app/products_pics';
  }
  
  // Local development: use project directory
  return path.join(process.cwd(), 'products_pics');
};

// Initialize and cache the uploads directory
export const UPLOADS_DIR = getUploadsDir();
export const PRODUCTS_PICS_DIR = getProductsPicsDir();
