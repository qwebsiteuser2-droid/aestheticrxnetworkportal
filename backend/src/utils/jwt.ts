import jwt from 'jsonwebtoken';
import { JWTPayload, TokenPair } from '../types/auth';

// Require JWT secrets - no fallbacks for security
const JWT_SECRET = process.env.JWT_SECRET;
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET;
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '1h';
const JWT_REFRESH_EXPIRES_IN = process.env.JWT_REFRESH_EXPIRES_IN || '7d';

if (!JWT_SECRET || JWT_SECRET.length < 32) {
  throw new Error('JWT_SECRET must be set and at least 32 characters long for security');
}

if (!JWT_REFRESH_SECRET || JWT_REFRESH_SECRET.length < 32) {
  throw new Error('JWT_REFRESH_SECRET must be set and at least 32 characters long for security');
}

/**
 * Generate access token
 */
export const generateAccessToken = (payload: Omit<JWTPayload, 'iat' | 'exp'>): string => {
  if (!JWT_SECRET) {
    throw new Error('JWT_SECRET must be set');
  }
  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: JWT_EXPIRES_IN,
    issuer: 'q-website1',
    audience: 'q-website1-users',
  } as jwt.SignOptions);
};

/**
 * Generate refresh token
 */
export const generateRefreshToken = (payload: Omit<JWTPayload, 'iat' | 'exp'>): string => {
  if (!JWT_REFRESH_SECRET) {
    throw new Error('JWT_REFRESH_SECRET must be set');
  }
  return jwt.sign(payload, JWT_REFRESH_SECRET, {
    expiresIn: JWT_REFRESH_EXPIRES_IN,
    issuer: 'q-website1',
    audience: 'q-website1-users',
  } as jwt.SignOptions);
};

/**
 * Generate token pair (access + refresh)
 */
export const generateTokenPair = (payload: Omit<JWTPayload, 'iat' | 'exp'>): TokenPair => {
  return {
    accessToken: generateAccessToken(payload),
    refreshToken: generateRefreshToken(payload),
  };
};

/**
 * Verify access token
 */
export const verifyAccessToken = (token: string): JWTPayload => {
  try {
    return jwt.verify(token, JWT_SECRET, {
      issuer: 'q-website1',
      audience: 'q-website1-users',
    }) as JWTPayload;
  } catch (error: unknown) {
    throw new Error('Invalid or expired access token');
  }
};

/**
 * Verify refresh token
 */
export const verifyRefreshToken = (token: string): JWTPayload => {
  try {
    return jwt.verify(token, JWT_REFRESH_SECRET, {
      issuer: 'q-website1',
      audience: 'q-website1-users',
    }) as JWTPayload;
  } catch (error: unknown) {
    throw new Error('Invalid or expired refresh token');
  }
};

/**
 * Decode token without verification (for debugging)
 */
export const decodeToken = (token: string): JWTPayload | null => {
  try {
    return jwt.decode(token) as JWTPayload;
  } catch (error: unknown) {
    return null;
  }
};

/**
 * Check if token is expired
 */
export const isTokenExpired = (token: string): boolean => {
  try {
    const decoded = decodeToken(token);
    if (!decoded || !decoded.exp) return true;
    
    const currentTime = Math.floor(Date.now() / 1000);
    return decoded.exp < currentTime;
  } catch (error: unknown) {
    return true;
  }
};

/**
 * Get token expiration time
 */
export const getTokenExpiration = (token: string): Date | null => {
  try {
    const decoded = decodeToken(token);
    if (!decoded || !decoded.exp) return null;
    
    return new Date(decoded.exp * 1000);
  } catch (error: unknown) {
    return null;
  }
};

/**
 * Extract token from Authorization header
 */
export const extractTokenFromHeader = (authHeader: string | undefined): string | null => {
  if (!authHeader) return null;
  
  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') return null;
  
  return parts[1] ?? null;
};

/**
 * Generate password reset token
 */
export const generatePasswordResetToken = (userId: string, email: string): string => {
  return jwt.sign(
    { userId, email, type: 'password-reset' },
    JWT_SECRET,
    { expiresIn: '1h' }
  );
};

/**
 * Verify password reset token
 */
export const verifyPasswordResetToken = (token: string): { userId: string; email: string } => {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    if (decoded.type !== 'password-reset') {
      throw new Error('Invalid token type');
    }
    return { userId: decoded.userId, email: decoded.email };
  } catch (error: unknown) {
    throw new Error('Invalid or expired password reset token');
  }
};
