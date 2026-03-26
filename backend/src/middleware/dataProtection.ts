import { Request, Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../types/auth';

/**
 * List of sensitive fields that should NEVER be exported or returned in API responses
 */
const SENSITIVE_FIELDS = [
  'password',
  'password_hash',
  'secret',
  'token',
  'api_key',
  'private_key',
  'auth_token',
  'refresh_token',
  'access_token',
  'jwt_secret',
  'encryption_key',
  'gmail_app_password',
  'twilio_auth_token',
  'payfast_passphrase',
  'google_private_key'
];

/**
 * Recursively remove sensitive fields from an object
 */
export const sanitizeSensitiveData = (obj: any, depth: number = 0): any => {
  if (depth > 10) return {}; // Prevent infinite recursion
  
  if (obj === null || obj === undefined) {
    return obj;
  }
  
  if (Array.isArray(obj)) {
    return obj.map(item => sanitizeSensitiveData(item, depth + 1));
  }
  
  if (typeof obj === 'object') {
    const sanitized: any = {};
    for (const key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        const lowerKey = key.toLowerCase();
        const isSensitive = SENSITIVE_FIELDS.some(field => 
          lowerKey.includes(field.toLowerCase())
        );
        
        if (isSensitive) {
          sanitized[key] = '***REDACTED***';
        } else {
          sanitized[key] = sanitizeSensitiveData(obj[key], depth + 1);
        }
      }
    }
    return sanitized;
  }
  
  return obj;
};

/**
 * Middleware to sanitize response data before sending
 */
export const protectSensitiveData = (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
  const originalJson = res.json.bind(res);
  
  res.json = function(body: any) {
    if (body && typeof body === 'object') {
      body = sanitizeSensitiveData(body);
    }
    return originalJson(body);
  };
  
  next();
};

/**
 * Check if user has permission to export specific data types
 */
export const validateDataExportPermissions = (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
  const { dataTypes } = req.body;
  
  if (!dataTypes || !Array.isArray(dataTypes)) {
    return next();
  }
  
  // List of restricted data types that require special permission
  const RESTRICTED_DATA_TYPES = [
    'api_tokens',
    'admin_permissions',
    'otp_codes',
    'payfast_itn'
  ];
  
  const hasRestrictedTypes = dataTypes.some((type: string) => 
    RESTRICTED_DATA_TYPES.includes(type)
  );
  
  if (hasRestrictedTypes) {
    // Check if user is super admin (you can add a super_admin flag to Doctor model)
    // For now, we'll log a warning and allow but audit it
    console.warn(`⚠️ User ${req.user?.email} attempting to export restricted data types:`, 
      dataTypes.filter((t: string) => RESTRICTED_DATA_TYPES.includes(t))
    );
  }
  
  next();
};

/**
 * Rate limit data exports to prevent abuse
 */
export const rateLimitDataExport = (maxExportsPerDay: number = 10) => {
  const exportCounts = new Map<string, { count: number; resetTime: number }>();
  
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
      return;
    }
    
    const userId = req.user.id;
    const now = Date.now();
    const dayMs = 24 * 60 * 60 * 1000;
    const userExports = exportCounts.get(userId);
    
    if (!userExports || now > userExports.resetTime) {
      exportCounts.set(userId, { count: 1, resetTime: now + dayMs });
      next();
      return;
    }
    
    if (userExports.count >= maxExportsPerDay) {
      res.status(429).json({
        success: false,
        message: `You have reached the daily export limit of ${maxExportsPerDay}. Please try again tomorrow.`
      });
      return;
    }
    
    userExports.count++;
    next();
  };
};

