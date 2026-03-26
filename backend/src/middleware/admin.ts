import { Request, Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../types/auth';
import auditLogger from './auditLog';
import { getUserAdminPermissions } from '../controllers/adminController';

/**
 * Admin-only middleware with security logging
 */
export const adminOnly = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  if (!req.user) {
    res.status(401).json({
      success: false,
      message: 'Authentication required'
    });
    return;
  }

  // SECURITY: Check if admin is deactivated
  if (req.user.is_deactivated) {
    try {
      auditLogger.log({
        userId: req.user.id,
        userEmail: req.user.email,
        userType: req.user.user_type || 'unknown',
        action: 'ADMIN_ACCESS_DENIED_DEACTIVATED',
        resource: req.path,
        ipAddress: auditLogger.getClientIp(req),
        userAgent: req.headers['user-agent'] || 'unknown',
        details: {
          method: req.method,
          path: req.path,
          reason: 'Admin account is deactivated'
        },
        success: false,
        error: 'Deactivated admin attempted access'
      });
    } catch (logError: unknown) {
      // Silently ignore audit logging errors
    }
    
    res.status(403).json({
      success: false,
      message: 'Admin access denied. Account is deactivated.'
    });
    return;
  }

  // Check if user has admin access (either is_admin flag or admin permission)
  let hasAdminAccess = req.user.is_admin;
  
  if (!hasAdminAccess) {
    // Check if user has active admin permission
    try {
      const permission = await getUserAdminPermissions(req.user.id);
      if (permission && permission.is_active) {
        // Check if permission is expired
        if (!permission.expires_at || new Date() < permission.expires_at) {
          hasAdminAccess = true;
        }
      }
    } catch (error: unknown) {
      // If check fails, continue with is_admin flag only
      console.error('Error checking admin permission:', error);
    }
  }

  if (!hasAdminAccess) {
    // SECURITY: Log unauthorized admin access attempts
    try {
      auditLogger.log({
        userId: req.user.id,
        userEmail: req.user.email,
        userType: req.user.user_type || 'unknown',
        action: 'UNAUTHORIZED_ADMIN_ACCESS_ATTEMPT',
        resource: req.path,
        ipAddress: auditLogger.getClientIp(req),
        userAgent: req.headers['user-agent'] || 'unknown',
        details: {
          method: req.method,
          path: req.path,
          reason: 'User is not an admin and has no admin permission'
        },
        success: false,
        error: 'Non-admin user attempted admin endpoint'
      });
    } catch (logError: unknown) {
      // Silently ignore audit logging errors
    }
    
    res.status(403).json({
      success: false,
      message: 'Admin access required'
    });
    return;
  }

  // SECURITY: Log successful admin access for sensitive endpoints
  // Only log for sensitive operations, not for all admin endpoints
  if ((req.method !== 'GET' || req.path.includes('/admin/')) && (
    req.path.includes('/export') ||
    req.path.includes('/users') ||
    req.path.includes('/permissions') ||
    req.path.includes('/delete')
  )) {
    try {
      auditLogger.log({
        userId: req.user.id,
        userEmail: req.user.email,
        userType: req.user.user_type || 'unknown',
        action: 'ADMIN_ACCESS',
        resource: req.path,
        ipAddress: auditLogger.getClientIp(req),
        userAgent: req.headers['user-agent'] || 'unknown',
        details: {
          method: req.method,
          path: req.path
        },
        success: true
      });
    } catch (logError: unknown) {
      // Silently ignore audit logging errors - don't block the request
    }
  }

  // Always call next() to continue the request
  next();
};

