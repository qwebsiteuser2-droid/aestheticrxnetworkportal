import { Response, NextFunction } from 'express';
import { AppDataSource } from '../db/data-source';
import { Doctor } from '../models/Doctor';
import { AuthenticatedRequest, AuthMiddlewareOptions } from '../types/auth';
import { verifyAccessToken, extractTokenFromHeader } from '../utils/jwt';

/**
 * Authentication middleware
 */
export const authenticate = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // SECURITY: Don't log sensitive token information
    const token = extractTokenFromHeader(req.headers.authorization);
    
    if (!token) {
      res.status(401).json({
        success: false,
        message: 'Access token required'
      });
      return;
    }

    let payload;
    try {
      payload = verifyAccessToken(token);
      // SECURITY: Don't log token payload - contains sensitive user information
    } catch (jwtError) {
      // SECURITY: Only log error type, not token details
      res.status(401).json({
        success: false,
        message: jwtError instanceof Error ? jwtError.message : 'Invalid or expired token'
      });
      return;
    }
    
    // Get user from database
    const doctorRepository = AppDataSource.getRepository(Doctor);
    const user = await doctorRepository.findOne({
      where: { id: payload.userId }
    });

    if (!user) {
      res.status(401).json({
        success: false,
        message: 'User not found'
      });
      return;
    }

    // Check if user is deactivated
    if (user.is_deactivated) {
      res.status(401).json({
        success: false,
        message: 'Account has been deactivated. Please contact support.'
      });
      return;
    }

    // Attach user to request
    req.user = user;
    req.jwtPayload = payload;
    
    next();
  } catch (error: unknown) {
    res.status(401).json({
      success: false,
      message: 'Invalid or expired token'
    });
  }
};

/**
 * Authorization middleware with options
 */
export const authorize = (options: AuthMiddlewareOptions = {}) => {
  return async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          message: 'Authentication required'
        });
        return;
      }

      const { requireApproval = true, requireAdmin = false, allowUnapproved = false } = options;

      // Check admin requirement
      if (requireAdmin && !req.user.is_admin) {
        res.status(403).json({
          success: false,
          message: 'Admin access required'
        });
        return;
      }

      // Check approval requirement
      if (requireApproval && !req.user.is_approved && !allowUnapproved) {
        res.status(403).json({
          success: false,
          message: 'Account approval required. Please wait for admin approval.'
        });
        return;
      }

      next();
    } catch (error: unknown) {
      res.status(500).json({
        success: false,
        message: 'Authorization error'
      });
    }
  };
};

/**
 * Admin only middleware
 */
export const adminOnly = authorize({ requireAdmin: true, requireApproval: true });

/**
 * Approved users only middleware
 */
export const approvedOnly = authorize({ requireApproval: true });

/**
 * Optional authentication middleware (doesn't fail if no token)
 * SECURITY WARNING: Use with caution - only for public endpoints that need user context
 * DO NOT use for sensitive operations
 */
export const optionalAuth = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const token = extractTokenFromHeader(req.headers.authorization);
    
    if (token) {
      try {
        const payload = verifyAccessToken(token);
        
        const doctorRepository = AppDataSource.getRepository(Doctor);
        const user = await doctorRepository.findOne({
          where: { id: payload.userId }
        });

        if (user && !user.is_deactivated) {
          req.user = user;
          req.jwtPayload = payload;
        }
        // SECURITY: Silently fail if token is invalid or user is deactivated
      } catch (error: unknown) {
        // SECURITY: Don't log token errors for optional auth - just continue
      }
    }
    
    next();
  } catch (error: unknown) {
    // Continue without authentication
    next();
  }
};

/**
 * Rate limiting middleware for auth endpoints
 * In development mode, can be disabled via DISABLE_RATE_LIMIT=true
 */
export const authRateLimit = (maxAttempts: number = 5, windowMs: number = 15 * 60 * 1000) => {
  const attempts = new Map<string, { count: number; resetTime: number }>();
  const isDevelopment = process.env.NODE_ENV === 'development';
  const disableRateLimit = isDevelopment && process.env.DISABLE_RATE_LIMIT === 'true';

  if (disableRateLimit) {
    console.log('⚠️ Auth rate limiting DISABLED in development mode (DISABLE_RATE_LIMIT=true)');
  }

  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    // Skip rate limiting entirely in development if DISABLE_RATE_LIMIT=true
    if (disableRateLimit) {
      return next();
    }

    const key = req.ip || 'unknown';
    const now = Date.now();
    const userAttempts = attempts.get(key);

    if (!userAttempts || now > userAttempts.resetTime) {
      attempts.set(key, { count: 1, resetTime: now + windowMs });
      next();
      return;
    }

    if (userAttempts.count >= maxAttempts) {
      res.status(429).json({
        success: false,
        message: 'Too many authentication attempts. Please try again later.'
      });
      return;
    }

    userAttempts.count++;
    next();
  };
};

/**
 * Check if user owns resource or is admin
 * SECURITY: Admin bypass is logged for audit purposes
 */
export const checkOwnershipOrAdmin = (resourceUserIdField: string = 'doctor_id') => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          message: 'Authentication required'
        });
        return;
      }

      // Admin can access everything - but log it for security audit
      if (req.user.is_admin) {
        // SECURITY: Log admin bypass of ownership check for sensitive operations
        if (req.method !== 'GET' || req.path.includes('/delete') || req.path.includes('/update')) {
          const auditLogger = require('./auditLog').default;
          auditLogger.log({
            userId: req.user.id,
            userEmail: req.user.email,
            userType: req.user.user_type || 'unknown',
            action: 'ADMIN_OWNERSHIP_BYPASS',
            resource: req.path,
            resourceId: req.params[resourceUserIdField] || req.body[resourceUserIdField],
            ipAddress: auditLogger.getClientIp(req),
            userAgent: req.headers['user-agent'] || 'unknown',
            details: {
              method: req.method,
              path: req.path,
              resourceField: resourceUserIdField,
              reason: 'Admin bypass of ownership check'
            },
            success: true
          });
        }
        next();
        return;
      }

      // Check if user owns the resource
      const resourceUserId = req.params[resourceUserIdField] || req.body[resourceUserIdField];
      
      if (resourceUserId && resourceUserId !== req.user.id) {
        res.status(403).json({
          success: false,
          message: 'Access denied. You can only access your own resources.'
        });
        return;
      }

      next();
    } catch (error: unknown) {
      res.status(500).json({
        success: false,
        message: 'Authorization error'
      });
    }
  };
};
