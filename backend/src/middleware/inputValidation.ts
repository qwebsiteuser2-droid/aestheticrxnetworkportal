import { Request, Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../types/auth';

/**
 * Sanitize string input to prevent XSS and injection attacks
 */
export const sanitizeString = (input: string): string => {
  if (typeof input !== 'string') return '';
  
  return input
    .trim()
    .replace(/[<>]/g, '') // Remove potential HTML tags
    .replace(/javascript:/gi, '') // Remove javascript: protocol
    .replace(/on\w+=/gi, '') // Remove event handlers
    .slice(0, 10000); // Limit length
};

/**
 * Validate email format
 */
export const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email) && email.length <= 255;
};

/**
 * Validate UUID format
 */
export const isValidUUID = (uuid: string): boolean => {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
};

/**
 * Validate integer ID
 */
export const isValidId = (id: any): boolean => {
  const num = typeof id === 'string' ? parseInt(id, 10) : id;
  return Number.isInteger(num) && num > 0 && num < Number.MAX_SAFE_INTEGER;
};

/**
 * Sanitize object recursively
 */
export const sanitizeObject = (obj: any, maxDepth: number = 10): any => {
  if (maxDepth <= 0) return {};
  
  if (typeof obj === 'string') {
    return sanitizeString(obj);
  }
  
  if (Array.isArray(obj)) {
    return obj.map(item => sanitizeObject(item, maxDepth - 1));
  }
  
  if (obj && typeof obj === 'object') {
    const sanitized: any = {};
    for (const key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        const sanitizedKey = sanitizeString(key);
        sanitized[sanitizedKey] = sanitizeObject(obj[key], maxDepth - 1);
      }
    }
    return sanitized;
  }
  
  return obj;
};

/**
 * Middleware to validate and sanitize request body
 */
export const validateAndSanitizeBody = (req: Request, res: Response, next: NextFunction): void => {
  if (req.body && typeof req.body === 'object') {
    req.body = sanitizeObject(req.body);
  }
  next();
};

/**
 * Middleware to validate and sanitize query parameters
 */
export const validateAndSanitizeQuery = (req: Request, res: Response, next: NextFunction): void => {
  if (req.query && typeof req.query === 'object') {
    req.query = sanitizeObject(req.query);
  }
  next();
};

/**
 * Middleware to validate and sanitize URL parameters
 */
export const validateAndSanitizeParams = (req: Request, res: Response, next: NextFunction): void => {
  if (req.params && typeof req.params === 'object') {
    for (const key in req.params) {
      if (Object.prototype.hasOwnProperty.call(req.params, key)) {
        req.params[key] = sanitizeString(String(req.params[key]));
      }
    }
  }
  next();
};

/**
 * Combined middleware for all input validation
 */
export const validateInput = [
  validateAndSanitizeBody,
  validateAndSanitizeQuery,
  validateAndSanitizeParams
];

/**
 * Validate required fields in request body
 */
export const validateRequiredFields = (fields: string[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const missing: string[] = [];
    
    for (const field of fields) {
      if (!req.body || req.body[field] === undefined || req.body[field] === null || req.body[field] === '') {
        missing.push(field);
      }
    }
    
    if (missing.length > 0) {
      res.status(400).json({
        success: false,
        message: `Missing required fields: ${missing.join(', ')}`
      });
      return;
    }
    
    next();
  };
};

/**
 * Validate request body size
 */
export const validateBodySize = (maxSize: number = 10 * 1024 * 1024) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const contentLength = parseInt(req.headers['content-length'] || '0', 10);
    
    if (contentLength > maxSize) {
      res.status(413).json({
        success: false,
        message: `Request body too large. Maximum size: ${maxSize / 1024 / 1024}MB`
      });
      return;
    }
    
    next();
  };
};

