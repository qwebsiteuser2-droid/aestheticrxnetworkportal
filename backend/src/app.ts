import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import * as path from 'path';
import * as fs from 'fs';
import rateLimit from 'express-rate-limit';
import { config } from 'dotenv';

// Load environment variables
config();

// Import centralized URL config
import { getAllFrontendUrls, getFrontendUrl, getBackendUrl } from './config/urlConfig';

// Import routes
import authRoutes from './routes/auth';
import productRoutes from './routes/products';
import orderRoutes from './routes/orders';
import adminRoutes from './routes/admin';
import publicRoutes from './routes/public';
import researchRoutes from './routes/research';
import advertisementRoutes from './routes/advertisements';
import videoAdvertisementRoutes from './routes/videoAdvertisementRoutes';
import contactRoutes from './routes/contact';
import contactInfoRoutes from './routes/contactInfo';
import contactPlatformRoutes from './routes/contactPlatforms';
import iconUploadRoutes from './routes/iconUpload';
import backgroundRoutes from './routes/backgrounds';
import aiRoutes from './routes/ai';
import otpRoutes from './routes/otp';
import otpConfigRoutes from './routes/otpConfig';
import messageRoutes from './routes/messages';
import autoEmailRoutes from './routes/autoEmail';
import teamRoutes from './routes/teams';
import teamTierRoutes from './routes/teamTier';
import searchRoutes from './routes/search';
import leaderboardRoutes from './routes/leaderboard';
import certificateRoutes from './routes/certificates';
import awardMessageRoutes from './routes/awardMessages';
import certificatePreviewRoutes from './routes/certificatePreview';
import emailPreviewRoutes from './routes/emailPreview';
import aiResearchRoutes from './routes/aiResearch';
import aiModelRoutes from './routes/aiModels';
import apiTokenRoutes from './routes/apiTokens';
import paymentRoutes from './routes/payments';
import paymentTestRoutes from './routes/paymentsTest';
import userStatsRoutes from './routes/userStats';
import orderManagementRoutes from './routes/orderManagement';
import debtRoutes from './routes/debt';
import dataExportRoutes from './routes/dataExportRoutes';
import employeeRoutes from './routes/employeeRoutes';
import unsubscribeRoutes from './routes/unsubscribe';
import badgeRoutes from './routes/badges';
import conversationRoutes from './routes/conversations';
import notificationRoutes from './routes/notifications';
import { testGmailConnection, testOrderNotification, testPaymentConfirmation } from './controllers/testGmailController';
import { sendManualOrderNotification, sendManualPaymentConfirmation } from './controllers/manualNotificationController';
import { Doctor } from './models/Doctor';
import { Product } from './models/Product';
import { AppDataSource } from './db/data-source';

// Import middleware
import { errorHandler } from './middleware/errorHandler';
import { notFoundHandler } from './middleware/notFoundHandler';

const app = express();

// Security middleware with proper CSP
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      scriptSrc: [
        "'self'",
        // Keep unsafe-inline for Next.js hydration and some libraries
        // In production, consider using nonces for better security
        "'unsafe-inline'",
        // Keep unsafe-eval for Next.js development mode
        // Remove in production if possible
        process.env.NODE_ENV === 'development' ? "'unsafe-eval'" : "'self'",
        "chrome-extension:",
        "chrome-extension://*"
      ],
      imgSrc: ["'self'", "data:", "https:", "http:", "blob:"],
      mediaSrc: ["'self'", "data:", "https:", "http:", "blob:"],
      connectSrc: [
        "'self'",
        getFrontendUrl(),
        getBackendUrl()
      ],
      frameSrc: ["'none'"],
      objectSrc: ["'none'"],
      upgradeInsecureRequests: process.env.NODE_ENV === 'production' ? [] : null,
    },
  },
  crossOriginEmbedderPolicy: false, // Required for some external resources
  crossOriginResourcePolicy: { policy: "cross-origin" },
}));

// CORS configuration - secure with environment-based origins
const getAllowedOrigins = (): string[] => {
  const origins = getAllFrontendUrls();
  
  // Add Cloudflare tunnel origins in development
  if (process.env.NODE_ENV === 'development' && process.env.ALLOW_CLOUDFLARE_TUNNELS === 'true') {
    // Allow Cloudflare tunnel origins (pattern matching)
    return origins;
  }
  
  return origins;
};

// Helper function to check if origin should be allowed
const isOriginAllowed = (origin: string | undefined, allowedOrigins: string[]): boolean => {
  if (!origin) {
    return true; // Allow requests with no origin (same-origin, direct access)
  }

  // Always allow Vercel domains (production and preview) - CRITICAL FIX
  if (origin.includes('.vercel.app')) {
    console.log('✅ CORS: Allowing Vercel domain:', origin);
    return true;
  }

  // In development, allow localhost and local network
  if (process.env.NODE_ENV === 'development') {
    if (origin.includes('localhost') || origin.includes('127.0.0.1')) {
      return true;
    }
    if (origin.match(/^https?:\/\/(192\.168\.|10\.0\.0\.|172\.(1[6-9]|2[0-9]|3[01])\.)/)) {
      return true;
    }
    if (origin.match(/^https?:\/\/.*\.trycloudflare\.com$/)) {
      return true;
    }
  }

  // Check allowed origins list
  return allowedOrigins.some(allowedOrigin => {
    if (allowedOrigin.includes('*')) {
      const pattern = new RegExp(`^${allowedOrigin.replace(/\./g, '\\.').replace(/\*/g, '.*')}$`);
      return pattern.test(origin);
    }
    return allowedOrigin === origin;
  });
};

// Handle OPTIONS preflight requests explicitly - MUST be before cors() middleware
app.options('*', (req, res) => {
  const origin = req.headers.origin;
  console.log('🔍 OPTIONS Preflight Request:', {
    origin,
    method: req.method,
    path: req.path,
    headers: req.headers
  });
  
  const allowedOrigins = getAllowedOrigins();
  const isAllowed = isOriginAllowed(origin, allowedOrigins);
  
  if (isAllowed) {
    console.log('✅ OPTIONS: Allowing preflight for origin:', origin);
    res.header('Access-Control-Allow-Origin', origin || '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, HEAD, PATCH');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, Origin, X-Requested-With, Accept');
    res.header('Access-Control-Allow-Credentials', 'true');
    res.header('Access-Control-Max-Age', '86400'); // 24 hours
    res.sendStatus(200);
  } else {
    console.error('❌ OPTIONS: Blocking preflight for origin:', origin);
    console.error('   Allowed origins:', allowedOrigins.slice(0, 10));
    res.sendStatus(403);
  }
});

app.use(cors({
  origin: (origin, callback) => {
    const allowedOrigins = getAllowedOrigins();
    if (isOriginAllowed(origin, allowedOrigins)) {
      callback(null, true);
    } else {
      console.error('❌ CORS: Blocked origin:', origin);
      console.error('   Allowed origins:', allowedOrigins.slice(0, 10));
      console.error('   Total allowed origins:', allowedOrigins.length);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'HEAD', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Origin', 'X-Requested-With', 'Accept'],
  exposedHeaders: ['Content-Length', 'Content-Type'],
  optionsSuccessStatus: 200,
  preflightContinue: false
}));

// Additional CORS headers for all responses
app.use((req, res, next) => {
  res.header('Cross-Origin-Resource-Policy', 'cross-origin');
  res.header('Cross-Origin-Embedder-Policy', 'unsafe-none');
  next();
});

// Root endpoint - define early to avoid middleware issues
app.get('/', (req, res) => {
  try {
    res.json({
      success: true,
      message: 'AestheticRxNetwork API',
      version: '1.0.0',
      endpoints: {
        health: '/health',
        api: '/api',
        documentation: '/api'
      }
    });
  } catch (error) {
    console.error('Error in root endpoint:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Compression middleware
app.use(compression());

// Logging middleware
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
} else {
  app.use(morgan('combined'));
}

// Rate limiting - General API rate limit
// In development mode, use much higher limits for testing
const isDevelopment = process.env.NODE_ENV === 'development';
const defaultMaxRequests = isDevelopment ? 10000 : 500; // 10,000 requests in dev, 500 in production
const defaultWindowMs = isDevelopment ? 60000 : 900000; // 1 minute in dev, 15 minutes in production

const generalLimiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || defaultWindowMs.toString()),
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || defaultMaxRequests.toString()),
  message: {
    success: false,
    message: 'Too many requests from this IP, please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Stricter rate limiting for authentication endpoints
// In development mode, use much higher limits for testing
const authMaxAttempts = isDevelopment ? 1000 : 5; // 1000 attempts in dev, 5 in production
const authWindowMs = isDevelopment ? 60000 : 15 * 60 * 1000; // 1 minute in dev, 15 minutes in production

const authLimiter = rateLimit({
  windowMs: authWindowMs,
  max: authMaxAttempts, // limit each IP to authMaxAttempts login attempts per windowMs
  message: {
    success: false,
    message: 'Too many authentication attempts. Please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true, // Don't count successful requests
});

// Apply rate limiting (exclude static file routes)
// In development, allow disabling rate limiting via environment variable
const disableRateLimit = isDevelopment && process.env.DISABLE_RATE_LIMIT === 'true';

if (disableRateLimit) {
  console.log('⚠️ Rate limiting DISABLED in development mode (DISABLE_RATE_LIMIT=true)');
} else {
  console.log('🔒 Rate limiting ENABLED');
}

app.use('/api/', (req, res, next) => {
  // Skip rate limiting for static file requests
  if (req.path.startsWith('/uploads/') || req.path.startsWith('/products_pics/')) {
    return next();
  }
  // Skip rate limiting entirely in development if DISABLE_RATE_LIMIT=true
  if (disableRateLimit) {
    return next();
  }
  generalLimiter(req, res, next);
});
// Apply auth rate limiting only if not disabled in development
if (!disableRateLimit) {
  app.use('/api/auth/login', authLimiter);
  app.use('/api/auth/register', authLimiter);
}

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Serve static files (uploaded images) with CORS headers
// Try /app/uploads first, then fallback to /tmp/uploads
app.use('/uploads', (req, res, next) => {
  const origin = req.headers.origin;
  const allowedOrigins = getAllowedOrigins();
  
  if (origin && allowedOrigins.includes(origin)) {
    res.header('Access-Control-Allow-Origin', origin);
  }
  res.header('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
  res.header('Access-Control-Allow-Credentials', 'true');
  res.header('Cross-Origin-Resource-Policy', 'cross-origin');
  
  // Set proper content type for videos, images, and PDFs
  const ext = path.extname(req.path).toLowerCase();
  if (ext === '.mp4') {
    res.header('Content-Type', 'video/mp4');
  } else if (ext === '.webm') {
    res.header('Content-Type', 'video/webm');
  } else if (ext === '.png') {
    res.header('Content-Type', 'image/png');
  } else if (ext === '.jpg' || ext === '.jpeg') {
    res.header('Content-Type', 'image/jpeg');
  } else if (ext === '.gif') {
    res.header('Content-Type', 'image/gif');
  } else if (ext === '.svg') {
    res.header('Content-Type', 'image/svg+xml');
  } else if (ext === '.pdf') {
    res.header('Content-Type', 'application/pdf');
    res.header('Content-Disposition', 'inline; filename="certificate.pdf"');
  }
  
  next();
}, (req, res, next) => {
  // Try /tmp/uploads first (where files are actually saved), then /app/uploads fallback
  const isRailway = process.env.RAILWAY_ENVIRONMENT || process.env.RAILWAY_PROJECT_ID;
  const isProduction = process.env.NODE_ENV === 'production' && !process.env.CI;
  
  if (isRailway || isProduction) {
    // Try /tmp/uploads first (fallback location, always writable)
    const tmpUploadsPath = '/tmp/uploads' + req.path;
    if (fs.existsSync(tmpUploadsPath)) {
      return express.static('/tmp/uploads')(req, res, next);
    }
    // Fallback to /app/uploads (volume mount, if exists)
    const appUploadsPath = '/app/uploads' + req.path;
    if (fs.existsSync(appUploadsPath)) {
      return express.static('/app/uploads')(req, res, next);
    }
    // File not found
    res.status(404).json({ error: 'File not found' });
    return;
  }
  // Local development
  const localUploadsPath = path.join(process.cwd(), 'uploads') + req.path;
  if (fs.existsSync(localUploadsPath)) {
    return express.static(path.join(process.cwd(), 'uploads'))(req, res, next);
  }
  // File not found
  res.status(404).json({ error: 'File not found' });
});

// Serve static files from products_pics directory with CORS headers
app.use('/products_pics', (req, res, next) => {
  const origin = req.headers.origin;
  const allowedOrigins = getAllFrontendUrls();
  
  if (origin && allowedOrigins.includes(origin)) {
    res.header('Access-Control-Allow-Origin', origin);
  }
  res.header('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
  res.header('Access-Control-Allow-Credentials', 'true');
  res.header('Cross-Origin-Resource-Policy', 'cross-origin');
  next();
}, express.static('products_pics'));

// Serve static files from uploads/icons directory with CORS headers
app.use('/uploads/icons', (req, res, next) => {
  const origin = req.headers.origin;
  const allowedOrigins = getAllFrontendUrls();
  
  if (origin && allowedOrigins.includes(origin)) {
    res.header('Access-Control-Allow-Origin', origin);
  }
  res.header('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
  res.header('Access-Control-Allow-Credentials', 'true');
  res.header('Cross-Origin-Resource-Policy', 'cross-origin');

  // Set proper cache headers for images
  res.header('Cache-Control', 'public, max-age=31536000');

  // Set proper content type for images
  const ext = path.extname(req.path).toLowerCase();
  if (ext === '.png') {
    res.header('Content-Type', 'image/png');
  } else if (ext === '.jpg' || ext === '.jpeg') {
    res.header('Content-Type', 'image/jpeg');
  } else if (ext === '.gif') {
    res.header('Content-Type', 'image/gif');
  } else if (ext === '.svg') {
    res.header('Content-Type', 'image/svg+xml');
  } else if (ext === '.webp') {
    res.header('Content-Type', 'image/webp');
  }

  next();
}, express.static('uploads/icons'));

app.use('/uploads/backgrounds', (req, res, next) => {
  const allowedOrigins = getAllFrontendUrls();
  const origin = req.headers.origin;
  if (origin && allowedOrigins.includes(origin)) {
    res.header('Access-Control-Allow-Origin', origin);
  } else {
    // Don't use wildcard - validate origin
    const allowedOrigins = getAllowedOrigins();
    if (origin && allowedOrigins.includes(origin)) {
      res.header('Access-Control-Allow-Origin', origin);
    }
  }
  res.header('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
  res.header('Access-Control-Allow-Credentials', 'true');
  res.header('Cross-Origin-Resource-Policy', 'cross-origin');

  // Set proper cache headers for images
  res.header('Cache-Control', 'public, max-age=31536000');

  // Set proper content type for images
  const ext = path.extname(req.path).toLowerCase();
  if (ext === '.png') {
    res.header('Content-Type', 'image/png');
  } else if (ext === '.jpg' || ext === '.jpeg') {
    res.header('Content-Type', 'image/jpeg');
  } else if (ext === '.gif') {
    res.header('Content-Type', 'image/gif');
  } else if (ext === '.svg') {
    res.header('Content-Type', 'image/svg+xml');
  } else if (ext === '.webp') {
    res.header('Content-Type', 'image/webp');
  }

  next();
}, express.static('uploads/backgrounds'));

// Image proxy endpoint to avoid CORS issues
// Made async to support database fallback for base64 images
app.get('/api/images/:path(*)', async (req, res): Promise<void> => {
  try {
    const imagePath = req.params.path;
    
    if (!imagePath) {
      res.status(400).json({ error: 'Path is required' });
      return;
    }
  
  // SECURITY: Prevent path traversal attacks
  // Normalize and resolve the path to prevent directory traversal
  const normalizedPath = path.normalize(imagePath).replace(/^(\.\.(\/|\\|$))+/, '');
  
  // Security check - only allow specific directories
  if (!normalizedPath.startsWith('products_pics/') && !normalizedPath.startsWith('uploads/')) {
    console.error('❌ Access denied - invalid path:', normalizedPath);
    res.status(403).json({ error: 'Access denied' });
    return;
  }
  
  // Handle Railway production paths (/app/uploads, /app/products_pics)
  // Railway uses /app as the base directory for all files
  const isRailway = process.env.RAILWAY_ENVIRONMENT || 
                    process.env.RAILWAY_PROJECT_ID || 
                    process.env.RAILWAY_PUBLIC_DOMAIN ||
                    (process.env.NODE_ENV === 'production' && process.env.PORT);
  
  let fullPath: string;
  let baseDir: string;
  
  if (isRailway) {
    // Railway production: files are in /app/uploads, /tmp/uploads (fallback), or /app/products_pics
    if (normalizedPath.startsWith('uploads/')) {
      // Try /tmp/uploads first (where files are actually saved), then /app/uploads
      const tmpPath = path.join('/tmp', normalizedPath);
      const appPath = path.join('/app', normalizedPath);
      
      if (fs.existsSync(tmpPath)) {
        fullPath = tmpPath;
        baseDir = '/tmp';
      } else if (fs.existsSync(appPath)) {
        fullPath = appPath;
        baseDir = '/app';
      } else {
        // File doesn't exist in uploads - try products_pics as fallback
        // This handles old products that were uploaded to /uploads/ but should be in /products_pics/
        const fileName = normalizedPath.replace('uploads/', '');
        const productsPicsPath = path.join('/app/products_pics', fileName);
        
        if (fs.existsSync(productsPicsPath)) {
          console.log(`🔄 Fallback: Found ${normalizedPath} in /products_pics/ instead of /uploads/`);
          fullPath = productsPicsPath;
          baseDir = '/app';
        } else {
          // File doesn't exist in either location
          fullPath = tmpPath; // Use /tmp for error message
          baseDir = '/tmp';
        }
      }
    } else {
      // products_pics is always in /app
      baseDir = '/app';
      fullPath = path.join('/app', normalizedPath);
    }
    
    // SECURITY: Ensure path is within allowed directories
    if (!fullPath.startsWith('/app/') && !fullPath.startsWith('/tmp/')) {
      console.error('❌ Path traversal attempt detected on Railway:', { imagePath, normalizedPath, fullPath });
      res.status(403).json({ error: 'Access denied - path traversal detected' });
      return;
    }
  } else {
    // Local development or CI: use relative paths from project root
    baseDir = path.resolve(__dirname, '..');
    fullPath = path.resolve(baseDir, normalizedPath);
    
    // SECURITY: Ensure resolved path is within base directory
    if (!fullPath.startsWith(baseDir)) {
      console.error('❌ Path traversal attempt detected locally:', { imagePath, normalizedPath, fullPath, baseDir });
      res.status(403).json({ error: 'Access denied - path traversal detected' });
      return;
    }
  }
  
  // Check if file exists (with error handling)
  try {
    if (!fs.existsSync(fullPath)) {
      console.log('📂 File not found on disk, checking database for image_data:', normalizedPath);
      
      // Try to find the product image in database (base64 fallback)
      if (normalizedPath.startsWith('products_pics/')) {
        const filename = normalizedPath.replace('products_pics/', '');
        
        try {
          const productRepository = AppDataSource.getRepository(Product);
          // Search for product with matching image_url
          const product = await productRepository
            .createQueryBuilder('product')
            .where('product.image_url LIKE :url', { url: `%${filename}%` })
            .andWhere('product.image_data IS NOT NULL')
            .select(['product.id', 'product.image_data'])
            .getOne();
          
          if (product && product.image_data) {
            console.log('✅ Found image in database for:', filename);
            
            // Parse base64 data URL
            const matches = product.image_data.match(/^data:([^;]+);base64,(.+)$/);
            if (matches) {
              const mimeType = matches[1];
              const base64Data = matches[2];
              const buffer = Buffer.from(base64Data, 'base64');
              
              // Set headers
              res.setHeader('Content-Type', mimeType);
              res.setHeader('Cache-Control', 'public, max-age=31536000');
              res.setHeader('Content-Length', buffer.length);
              
              // CORS headers
              const origin = req.headers.origin;
              const frontendUrls = getAllFrontendUrls();
              if (origin) {
                const isAllowed = frontendUrls.some(url => {
                  if (url.includes('*')) {
                    const pattern = url.replace(/\*/g, '.*');
                    return new RegExp(`^${pattern}$`).test(origin);
                  }
                  return url === origin;
                });
                if (isAllowed) {
                  res.setHeader('Access-Control-Allow-Origin', origin);
                }
              }
              res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
              res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
              
              res.send(buffer);
              return;
            }
          }
        } catch (dbError) {
          console.error('❌ Database error fetching image:', dbError);
        }
      }
      
      console.error('❌ Image not found:', {
        requestedPath: imagePath,
        normalizedPath: normalizedPath,
        fullPath: fullPath,
        baseDir: baseDir,
        isRailway: !!isRailway,
        __dirname: __dirname,
        cwd: process.cwd()
      });
      res.status(404).json({ error: 'Image not found', path: normalizedPath });
      return;
    }
    
    // SECURITY: Verify it's actually a file (not a directory)
    const stats = fs.statSync(fullPath);
    if (!stats.isFile()) {
      console.error('❌ Path is not a file:', fullPath);
      res.status(403).json({ error: 'Access denied - not a file' });
      return;
    }
  } catch (fsError: unknown) {
    console.error('❌ Error checking file:', fsError);
    res.status(500).json({ 
      error: 'Error accessing file',
      message: fsError instanceof Error ? fsError.message : 'Unknown error'
    });
    return;
  }
  
  // Set appropriate headers
  const ext = path.extname(fullPath).toLowerCase();
  const mimeTypes: { [key: string]: string } = {
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.gif': 'image/gif',
    '.webp': 'image/webp',
    '.svg': 'image/svg+xml'
  };
  
  const mimeType = (ext && mimeTypes[ext]) || 'application/octet-stream';
  res.setHeader('Content-Type', mimeType);
  res.setHeader('Cache-Control', 'public, max-age=31536000'); // Cache for 1 year
  
  // CORS headers - use getAllFrontendUrls for proper CORS support
  const origin = req.headers.origin;
  const frontendUrls = getAllFrontendUrls();
  
  // Check if origin matches any allowed frontend URL (including wildcards)
  if (origin) {
    const isAllowed = frontendUrls.some(url => {
      if (url.includes('*')) {
        // Handle wildcard patterns (e.g., https://aestheticrxdepolying-*.vercel.app)
        const pattern = url.replace(/\*/g, '.*');
        const regex = new RegExp(`^${pattern}$`);
        return regex.test(origin);
      }
      return url === origin;
    });
    
    if (isAllowed) {
      res.setHeader('Access-Control-Allow-Origin', origin);
    }
  } else {
    // Default to first frontend URL if no origin header
    res.setHeader('Access-Control-Allow-Origin', frontendUrls[0] || '*');
  }
  
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
  
  // Stream the file (with error handling)
  try {
    const fileStream = fs.createReadStream(fullPath);
    fileStream.pipe(res);
    
    fileStream.on('error', (err) => {
      console.error('❌ Error streaming image:', {
        error: err.message,
        fullPath: fullPath,
        imagePath: imagePath
      });
      if (!res.headersSent) {
        res.status(500).json({ error: 'Error serving image' });
      }
    });
    
    res.on('close', () => {
      if (fileStream && !fileStream.destroyed) {
        fileStream.destroy();
      }
    });
  } catch (streamError: unknown) {
    console.error('❌ Error creating file stream:', {
      error: streamError instanceof Error ? streamError.message : String(streamError),
      fullPath: fullPath,
      imagePath: imagePath
    });
    if (!res.headersSent) {
      res.status(500).json({ error: 'Error serving image' });
    }
  }
  } catch (topLevelError: unknown) {
    console.error('❌ Top-level error in image proxy:', topLevelError);
    if (!res.headersSent) {
      res.status(500).json({ 
        error: 'Internal server error',
        message: topLevelError instanceof Error ? topLevelError.message : 'Unknown error'
      });
    }
  }
});

// Dedicated endpoint to serve product images from database by product ID
// This is the most reliable way to serve images on Railway since it uses the database
app.get('/api/product-images/:productId', async (req, res): Promise<void> => {
  try {
    const { productId } = req.params;
    
    if (!productId) {
      res.status(400).json({ error: 'Product ID is required' });
      return;
    }
    
    const productRepository = AppDataSource.getRepository(Product);
    const product = await productRepository.findOne({
      where: { id: productId },
      select: ['id', 'image_data', 'image_url']
    });
    
    if (!product) {
      res.status(404).json({ error: 'Product not found' });
      return;
    }
    
    if (!product.image_data) {
      // If no image_data in database, redirect to the file-based URL if exists
      if (product.image_url) {
        res.redirect(product.image_url);
        return;
      }
      res.status(404).json({ error: 'Product image not found' });
      return;
    }
    
    // Parse base64 data URL
    const matches = product.image_data.match(/^data:([^;]+);base64,(.+)$/);
    if (!matches) {
      console.error('Invalid image_data format for product:', productId);
      res.status(500).json({ error: 'Invalid image data format' });
      return;
    }
    
    const mimeType = matches[1];
    const base64Data = matches[2];
    const buffer = Buffer.from(base64Data, 'base64');
    
    // Set headers
    res.setHeader('Content-Type', mimeType);
    res.setHeader('Cache-Control', 'public, max-age=31536000'); // Cache for 1 year
    res.setHeader('Content-Length', buffer.length);
    res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
    
    // CORS headers
    const origin = req.headers.origin;
    const frontendUrls = getAllFrontendUrls();
    if (origin) {
      const isAllowed = frontendUrls.some(url => {
        if (url.includes('*')) {
          const pattern = url.replace(/\*/g, '.*');
          return new RegExp(`^${pattern}$`).test(origin);
        }
        return url === origin;
      });
      if (isAllowed) {
        res.setHeader('Access-Control-Allow-Origin', origin);
      }
    }
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    
    console.log(`✅ Serving product image from database: ${productId} (${buffer.length} bytes)`);
    res.send(buffer);
  } catch (error) {
    console.error('❌ Error serving product image:', error);
    res.status(500).json({ error: 'Error serving image' });
  }
});

// CORS preflight for product image endpoint
app.options('/api/product-images/:productId', (req, res): void => {
  const origin = req.headers.origin;
  const frontendUrls = getAllFrontendUrls();
  
  if (origin) {
    const isAllowed = frontendUrls.some(url => {
      if (url.includes('*')) {
        const pattern = url.replace(/\*/g, '.*');
        return new RegExp(`^${pattern}$`).test(origin);
      }
      return url === origin;
    });
    if (isAllowed) {
      res.setHeader('Access-Control-Allow-Origin', origin);
    }
  }
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
  res.status(204).send();
});

// CORS preflight for image endpoint
app.options('/api/images/:path(*)', (req, res): void => {
  const origin = req.headers.origin;
  const frontendUrls = getAllFrontendUrls();
  
  if (origin) {
    const isAllowed = frontendUrls.some(url => {
      if (url.includes('*')) {
        const pattern = url.replace(/\*/g, '.*');
        const regex = new RegExp(`^${pattern}$`);
        return regex.test(origin);
      }
      return url === origin;
    });
    
    if (isAllowed) {
      res.setHeader('Access-Control-Allow-Origin', origin);
    }
  } else {
    res.setHeader('Access-Control-Allow-Origin', frontendUrls[0] || '*');
  }
  
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
  res.status(204).send();
});

// Root endpoint - must be before other routes
app.get('/', (req, res) => {
  try {
    res.json({
      success: true,
      message: 'AestheticRxNetwork API',
      version: '1.0.0',
      endpoints: {
        health: '/health',
        api: '/api',
        documentation: '/api'
      }
    });
  } catch (error) {
    console.error('Error in root endpoint:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'AestheticRxNetwork API is running',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    version: process.env.npm_package_version || '1.0.0'
  });
});

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/public', publicRoutes);
app.use('/api/research', researchRoutes);
app.use('/api/advertisements', advertisementRoutes);
app.use('/api/video-advertisements', videoAdvertisementRoutes);
app.use('/api/contact-admin', contactRoutes);
app.use('/api/contact-info', contactInfoRoutes);
app.use('/api/contact-platforms', contactPlatformRoutes);
app.use('/api/icons', iconUploadRoutes);
app.use('/api/backgrounds', backgroundRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/otp', otpRoutes);
app.use('/api/otp', otpConfigRoutes);
app.use('/api/admin', messageRoutes);
app.use('/api/admin', autoEmailRoutes);
app.use('/api/teams', teamRoutes);
app.use('/api/admin/teams', teamRoutes);
app.use('/api/team-tiers', teamTierRoutes);
app.use('/api/admin/team-tiers', teamTierRoutes);
app.use('/api/search', searchRoutes);
app.use('/api/leaderboard', leaderboardRoutes);
app.use('/api/certificates', certificateRoutes);
app.use('/api/admin/award-messages', awardMessageRoutes);
app.use('/api/unsubscribe', unsubscribeRoutes);
app.use('/api/badges', badgeRoutes);
app.use('/api/conversations', conversationRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/admin', certificatePreviewRoutes);
app.use('/api/admin', emailPreviewRoutes);
app.use('/api', advertisementRoutes);
app.use('/api/ai-research', aiResearchRoutes);
app.use('/api/ai-models', aiModelRoutes);
app.use('/api/api-tokens', apiTokenRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/payments/test', paymentTestRoutes);
app.use('/api/user-stats', userStatsRoutes);
app.use('/api/order-management', orderManagementRoutes);
app.use('/api/debt', debtRoutes);
app.use('/api/admin', dataExportRoutes);
app.use('/api/employee', employeeRoutes);

// Gmail status check - SECURITY: Don't expose email in production
app.get('/api/gmail-status', (req, res) => {
  try {
    const hasGmailCredentials = !!(process.env.GMAIL_USER && process.env.GMAIL_APP_PASSWORD);
    
    // SECURITY: Don't log or expose email address
    // SECURITY: Only return minimal information
    res.json({
      success: true,
      data: {
        connected: hasGmailCredentials,
        configured: hasGmailCredentials,
        method: 'gmail'
        // SECURITY: Don't expose email address
      }
    });
  } catch (error: unknown) {
    console.error('Error checking Gmail status:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to check Gmail status',
      error: error instanceof Error ? (error instanceof Error ? error.message : String(error)) : 'Unknown error'
    });
  }
});

// SECURITY: Test endpoints should be disabled in production or protected
// Gmail test routes - PROTECTED: Admin only in production
if (process.env.NODE_ENV === 'development' || process.env.ALLOW_TEST_ENDPOINTS === 'true') {
  const { authenticate } = require('./middleware/auth');
  const { adminOnly } = require('./middleware/admin');
  
  app.post('/api/test/gmail', authenticate, adminOnly, testGmailConnection);
  app.post('/api/test/gmail/order', authenticate, adminOnly, testOrderNotification);
  app.post('/api/test/gmail/payment-confirmation', authenticate, adminOnly, testPaymentConfirmation);

  // Manual notification routes (for PayFast testing) - Admin only
  app.post('/api/manual/order-notification', authenticate, adminOnly, sendManualOrderNotification);
  app.post('/api/manual/payment-confirmation', authenticate, adminOnly, sendManualPaymentConfirmation);

  // Test endpoint for doctors - Admin only
  app.get('/api/test/doctors', authenticate, adminOnly, async (req, res) => {
  try {
    console.log('Testing doctors endpoint...');
    const doctorRepository = AppDataSource.getRepository(Doctor);
    console.log('Repository created');
    
    const doctors = await doctorRepository.find({
      where: { is_approved: true },
      order: { current_sales: 'DESC' }
    });
    console.log('Found doctors:', doctors.length);

    res.json({
      success: true,
      data: doctors.map(d => ({
        id: d.id,
        doctor_id: d.doctor_id,
        doctor_name: d.doctor_name,
        display_name: d.display_name,
        email: d.email,
        clinic_name: d.clinic_name,
        tier: d.tier,
        current_sales: d.current_sales,
        is_approved: d.is_approved,
        created_at: d.created_at
      }))
    });
  } catch (error: unknown) {
    console.error('Error fetching doctors:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch doctors',
      error: error instanceof Error ? (error instanceof Error ? error.message : String(error)) : 'Unknown error'
    });
  }
  });
  
  // Test endpoint for updating display name - Admin only
  app.put('/api/test/doctors/:doctorId/display-name', authenticate, adminOnly, async (req, res) => {
  try {
    const { doctorId } = req.params;
    const { display_name } = req.body;

    if (!display_name || display_name.trim().length === 0) {
      res.status(400).json({
        success: false,
        message: 'Display name is required'
      });
      return;
    }

    // Check for inappropriate content (basic validation)
    const inappropriateWords = ['fuck', 'shit', 'damn', 'bitch', 'ass', 'hell', 'crap'];
    const lowerDisplayName = display_name.toLowerCase();
    const hasInappropriateContent = inappropriateWords.some(word => 
      lowerDisplayName.includes(word)
    );

    if (hasInappropriateContent) {
      res.status(400).json({
        success: false,
        message: 'Display name contains inappropriate content. Please use a professional name.'
      });
      return;
    }

    const doctorRepository = AppDataSource.getRepository(Doctor);
    const doctor = await doctorRepository.findOne({ where: { id: doctorId } });

    if (!doctor) {
      res.status(404).json({
        success: false,
        message: 'Doctor not found'
      });
      return;
    }

    doctor.display_name = display_name.trim();
    await doctorRepository.save(doctor);

    res.json({
      success: true,
      message: 'Display name updated successfully',
      data: {
        doctor_id: doctor.doctor_id,
        doctor_name: doctor.doctor_name,
        display_name: doctor.display_name
      }
    });

  } catch (error: unknown) {
    console.error('Error updating display name:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update display name'
    });
  }
  });
  
  // Test endpoint for updating user profile - Admin only
  app.put('/api/test/doctors/:doctorId/profile', authenticate, adminOnly, async (req, res) => {
  try {
    const { doctorId } = req.params;
    const { doctor_name, display_name, clinic_name, whatsapp, bio, tags } = req.body;

    // Check for inappropriate content in names
    const inappropriateWords = ['fuck', 'shit', 'damn', 'bitch', 'ass', 'hell', 'crap'];
    const checkInappropriate = (text: string) => {
      const lowerText = text.toLowerCase();
      return inappropriateWords.some(word => lowerText.includes(word));
    };

    if (doctor_name && checkInappropriate(doctor_name)) {
      res.status(400).json({
        success: false,
        message: 'Doctor name contains inappropriate content. Please use a professional name.'
      });
      return;
    }

    if (display_name && checkInappropriate(display_name)) {
      res.status(400).json({
        success: false,
        message: 'Display name contains inappropriate content. Please use a professional name.'
      });
      return;
    }

    if (clinic_name && checkInappropriate(clinic_name)) {
      res.status(400).json({
        success: false,
        message: 'Clinic name contains inappropriate content. Please use a professional name.'
      });
      return;
    }

    const doctorRepository = AppDataSource.getRepository(Doctor);
    const doctor = await doctorRepository.findOne({ where: { id: doctorId } });

    if (!doctor) {
      res.status(404).json({
        success: false,
        message: 'Doctor not found'
      });
      return;
    }

    // Update fields
    if (doctor_name !== undefined) doctor.doctor_name = doctor_name.trim();
    if (display_name !== undefined) doctor.display_name = display_name.trim() || null;
    if (clinic_name !== undefined) doctor.clinic_name = clinic_name.trim();
    if (whatsapp !== undefined) doctor.whatsapp = whatsapp.trim() || null;
    if (bio !== undefined) doctor.bio = bio.trim() || null;
    if (tags !== undefined) doctor.tags = Array.isArray(tags) ? tags : [];

    await doctorRepository.save(doctor);

    res.json({
      success: true,
      message: 'Profile updated successfully',
      data: {
        doctor_id: doctor.doctor_id,
        doctor_name: doctor.doctor_name,
        display_name: doctor.display_name,
        clinic_name: doctor.clinic_name,
        whatsapp: doctor.whatsapp,
        bio: doctor.bio,
        tags: doctor.tags
      }
    });

  } catch (error: unknown) {
    console.error('Error updating profile:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update profile'
    });
  }
  });
} else {
  // SECURITY: In production, return 404 for test endpoints
  app.post('/api/test/*', (req, res) => {
    res.status(404).json({ success: false, message: 'Not found' });
  });
  app.get('/api/test/*', (req, res) => {
    res.status(404).json({ success: false, message: 'Not found' });
  });
  app.put('/api/test/*', (req, res) => {
    res.status(404).json({ success: false, message: 'Not found' });
  });
  app.post('/api/manual/*', (req, res) => {
    res.status(404).json({ success: false, message: 'Not found' });
  });
}

// API documentation endpoint
app.get('/api', (req, res) => {
  res.json({
    success: true,
    message: 'AestheticRxNetwork API',
    version: '1.0.0',
    endpoints: {
      auth: {
        'POST /api/auth/register': 'Register a new doctor',
        'POST /api/auth/login': 'Login doctor',
        'POST /api/auth/password-reset/request': 'Request password reset (sends OTP)',
        'POST /api/auth/password-reset/confirm': 'Confirm password reset with OTP',
        'GET /api/auth/profile': 'Get current user profile',
        'PUT /api/auth/profile': 'Update user profile',
        'PUT /api/auth/change-password': 'Change password',
        'POST /api/auth/logout': 'Logout'
      },
      products: {
        'GET /api/products': 'Get all products',
        'GET /api/products/search': 'Search products',
        'GET /api/products/categories': 'Get product categories',
        'GET /api/products/slot/:slot': 'Get product by slot',
        'GET /api/products/:id': 'Get product by ID'
      },
      orders: {
        'POST /api/orders': 'Create new order',
        'GET /api/orders/my': 'Get my orders',
        'GET /api/orders/:id': 'Get order by ID',
        'GET /api/orders': 'Get all orders (admin)',
        'PUT /api/orders/:id/status': 'Update order status (admin)'
      },
      admin: {
        'GET /api/admin/dashboard': 'Get admin dashboard stats',
        'GET /api/admin/users': 'Get all users (admin)',
        'POST /api/admin/users/:id/approve': 'Approve user (admin)',
        'POST /api/admin/users/:id/reject': 'Reject user (admin)',
        'POST /api/admin/products': 'Create product (admin)',
        'PUT /api/admin/products/:id': 'Update product (admin)',
        'DELETE /api/admin/products/:id': 'Delete product (admin)',
        'GET /api/admin/research': 'Get all research papers (admin)',
        'POST /api/admin/research/:id/approve': 'Approve research (admin)',
        'POST /api/admin/research/:id/reject': 'Reject research (admin)'
      }
    },
    documentation: '/docs'
  });
});

// 404 handler
app.use(notFoundHandler);

// Error handling middleware
app.use(errorHandler);

export default app;
