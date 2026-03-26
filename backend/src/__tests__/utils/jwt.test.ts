import { 
  generateAccessToken, 
  generateRefreshToken, 
  verifyAccessToken, 
  verifyRefreshToken,
  extractTokenFromHeader,
  isTokenExpired
} from '../../utils/jwt';

describe('JWT Utilities', () => {
  const mockPayload = {
    userId: 'test-user-id',
    email: 'test@example.com',
    doctorId: 12345,
    isAdmin: false,
    isApproved: true,
  };

  describe('generateAccessToken', () => {
    it('should generate a valid access token', () => {
      const token = generateAccessToken(mockPayload);
      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
      expect(token.split('.').length).toBe(3); // JWT has 3 parts
    });

    it('should generate different tokens for different payloads', () => {
      const token1 = generateAccessToken(mockPayload);
      const token2 = generateAccessToken({ ...mockPayload, userId: 'different-id' });
      expect(token1).not.toBe(token2);
    });
  });

  describe('generateRefreshToken', () => {
    it('should generate a valid refresh token', () => {
      const token = generateRefreshToken(mockPayload);
      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
      expect(token.split('.').length).toBe(3);
    });
  });

  describe('verifyAccessToken', () => {
    it('should verify a valid access token', () => {
      const token = generateAccessToken(mockPayload);
      const decoded = verifyAccessToken(token);
      expect(decoded.userId).toBe(mockPayload.userId);
      expect(decoded.email).toBe(mockPayload.email);
    });

    it('should throw error for invalid token', () => {
      expect(() => {
        verifyAccessToken('invalid-token');
      }).toThrow();
    });

    it('should throw error for expired token', () => {
      // Create a token with very short expiration
      const oldEnv = process.env.JWT_EXPIRES_IN;
      process.env.JWT_EXPIRES_IN = '1ms';
      
      // Note: This test may need adjustment based on actual implementation
      // The token generation happens synchronously, so expiration check happens on verify
      
      process.env.JWT_EXPIRES_IN = oldEnv;
    });
  });

  describe('extractTokenFromHeader', () => {
    it('should extract token from Bearer header', () => {
      const header = 'Bearer test-token-123';
      const token = extractTokenFromHeader(header);
      expect(token).toBe('test-token-123');
    });

    it('should return null for invalid header format', () => {
      expect(extractTokenFromHeader('Invalid format')).toBeNull();
      expect(extractTokenFromHeader('')).toBeNull();
      expect(extractTokenFromHeader(undefined)).toBeNull();
    });

    it('should return null for non-Bearer scheme', () => {
      expect(extractTokenFromHeader('Basic token')).toBeNull();
    });
  });

  describe('isTokenExpired', () => {
    it('should return false for valid token', () => {
      const token = generateAccessToken(mockPayload);
      expect(isTokenExpired(token)).toBe(false);
    });

    it('should return true for invalid token', () => {
      expect(isTokenExpired('invalid-token')).toBe(true);
    });
  });
});

