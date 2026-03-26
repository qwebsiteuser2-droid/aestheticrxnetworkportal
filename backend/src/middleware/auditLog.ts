import { Request, Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../types/auth';
import * as fs from 'fs';
import * as path from 'path';

interface AuditLogEntry {
  timestamp: string;
  userId: string;
  userEmail: string;
  userType: string;
  action: string;
  resource: string;
  resourceId?: string;
  ipAddress: string;
  userAgent: string;
  details?: any;
  success: boolean;
  error?: string;
}

class AuditLogger {
  private logDir: string;
  private logFile: string;

  constructor() {
    // Use temp directory in test environment to avoid permission issues
    const defaultLogDir = process.env.NODE_ENV === 'test' 
      ? path.join(process.cwd(), 'tmp', 'logs', 'audit')
      : '/app/logs/audit';
    this.logDir = process.env.AUDIT_LOG_DIR || defaultLogDir;
    this.logFile = path.join(this.logDir, `audit-${new Date().toISOString().split('T')[0]}.log`);
    
    // Ensure log directory exists
    if (!fs.existsSync(this.logDir)) {
      try {
        fs.mkdirSync(this.logDir, { recursive: true });
      } catch (error: unknown) {
        // Handle permission denied errors gracefully
        const err = error as NodeJS.ErrnoException;
        if (err.code === 'EACCES' || err.code === 'EPERM') {
          console.warn(`⚠️ Permission denied creating audit log directory: ${this.logDir}`);
          console.warn('   Attempting to use temporary directory as fallback...');
          
          // Try to use a temporary directory as fallback
          try {
            const os = require('os');
            this.logDir = path.join(os.tmpdir(), 'q-website-audit-logs');
            this.logFile = path.join(this.logDir, `audit-${new Date().toISOString().split('T')[0]}.log`);
            
            if (!fs.existsSync(this.logDir)) {
              fs.mkdirSync(this.logDir, { recursive: true });
            }
            console.log(`✅ Using fallback audit log directory: ${this.logDir}`);
          } catch (fallbackError) {
            console.error('❌ Failed to create fallback audit log directory. Audit logging disabled.');
            console.error('   Error:', fallbackError);
            // Disable logging by setting logDir to null
            this.logDir = '';
            this.logFile = '';
          }
        } else {
          // For other errors, try test environment fallback
          if (process.env.NODE_ENV === 'test') {
            this.logDir = path.join(require('os').tmpdir(), 'q-website-audit-logs');
            this.logFile = path.join(this.logDir, `audit-${new Date().toISOString().split('T')[0]}.log`);
            if (!fs.existsSync(this.logDir)) {
              fs.mkdirSync(this.logDir, { recursive: true });
            }
          } else {
            console.error('❌ Failed to create audit log directory:', error);
            // Disable logging instead of throwing
            this.logDir = '';
            this.logFile = '';
          }
        }
      }
    }
  }

  private sanitizeForLog(data: any): any {
    if (!data || typeof data !== 'object') return data;
    
    const sensitiveFields = ['password', 'secret', 'token', 'api_key', 'private_key', 'auth_token', 'refresh_token', 'access_token'];
    const sanitized = { ...data };
    
    for (const key in sanitized) {
      const lowerKey = key.toLowerCase();
      if (sensitiveFields.some(field => lowerKey.includes(field))) {
        sanitized[key] = '***REDACTED***';
      } else if (typeof sanitized[key] === 'object' && sanitized[key] !== null) {
        sanitized[key] = this.sanitizeForLog(sanitized[key]);
      }
    }
    
    return sanitized;
  }

  log(entry: Omit<AuditLogEntry, 'timestamp'>): void {
    // Skip logging if log directory/file is not available (permission error fallback)
    if (!this.logDir || !this.logFile) {
      return;
    }
    
    const fullEntry: AuditLogEntry = {
      ...entry,
      timestamp: new Date().toISOString()
    };

    const sanitizedEntry = {
      ...fullEntry,
      details: this.sanitizeForLog(fullEntry.details)
    };

    const logLine = JSON.stringify(sanitizedEntry) + '\n';
    
    try {
      fs.appendFileSync(this.logFile, logLine, { flag: 'a' });
    } catch (error: unknown) {
      console.error('Failed to write audit log:', error);
    }
  }

  getClientIp(req: Request): string {
    return (
      (req.headers['x-forwarded-for'] as string)?.split(',')[0] ||
      (req.headers['x-real-ip'] as string) ||
      req.socket.remoteAddress ||
      'unknown'
    );
  }
}

const auditLogger = new AuditLogger();

/**
 * Audit log middleware for sensitive operations
 */
export const auditLog = (action: string, resource: string) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    const originalJson = res.json.bind(res);
    
    res.json = function(body: any) {
      const success = res.statusCode >= 200 && res.statusCode < 300;
      
      auditLogger.log({
        userId: req.user?.id || 'anonymous',
        userEmail: req.user?.email || 'anonymous',
        userType: req.user?.user_type || 'unknown',
        action,
        resource,
        resourceId: req.params.id || req.params.userId || req.body?.id,
        ipAddress: auditLogger.getClientIp(req),
        userAgent: req.headers['user-agent'] || 'unknown',
        details: {
          method: req.method,
          path: req.path,
          params: req.params,
          query: req.query,
          body: req.body,
          responseStatus: res.statusCode
        },
        success,
        error: success ? undefined : body?.message || body?.error
      });
      
      return originalJson(body);
    };
    
    next();
  };
};

/**
 * Audit log for data export operations
 */
export const auditDataExport = (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
  const originalJson = res.json.bind(res);
  
  res.json = function(body: any) {
    const success = res.statusCode >= 200 && res.statusCode < 300;
    
    auditLogger.log({
      userId: req.user?.id || 'anonymous',
      userEmail: req.user?.email || 'anonymous',
      userType: req.user?.user_type || 'unknown',
      action: 'DATA_EXPORT',
      resource: 'data_export',
      resourceId: body?.data?.jobId,
      ipAddress: auditLogger.getClientIp(req),
      userAgent: req.headers['user-agent'] || 'unknown',
      details: {
        method: req.method,
        path: req.path,
        dataTypes: req.body?.dataTypes,
        timeRange: req.body?.timeRange,
        format: req.body?.format,
        responseStatus: res.statusCode
      },
      success,
      error: success ? undefined : body?.message || body?.error
    });
    
    return originalJson(body);
  };
  
  next();
};

export default auditLogger;

