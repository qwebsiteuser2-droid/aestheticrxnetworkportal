import { Request, Response, NextFunction } from 'express';
import { authenticate } from '../../middleware/auth';
import { adminOnly } from '../../middleware/admin';
import { generateAccessToken } from '../../utils/jwt';
import { AppDataSource } from '../../db/data-source';
import { Doctor } from '../../models/Doctor';
import { AuthenticatedRequest } from '../../types/auth';
import { getUserAdminPermissions } from '../../controllers/adminController';

// Mock dependencies
jest.mock('../../db/data-source');
jest.mock('../../utils/jwt');
jest.mock('../../middleware/auditLog', () => ({
  default: {
    log: jest.fn().mockResolvedValue(undefined),
    getClientIp: jest.fn(() => '127.0.0.1'),
  },
}));
jest.mock('../../controllers/adminController', () => ({
  getUserAdminPermissions: jest.fn(),
}));

describe('Authentication Middleware', () => {
  let mockRequest: Partial<AuthenticatedRequest>;
  let mockResponse: Partial<Response>;
  let mockNext: NextFunction;

  beforeEach(() => {
    mockRequest = {
      headers: {},
      user: undefined,
    };
    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
    mockNext = jest.fn();
  });

  describe('authenticate', () => {
    it('should reject request without token', async () => {
      mockRequest.headers = {};
      
      await authenticate(
        mockRequest as any,
        mockResponse as Response,
        mockNext
      );

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        message: 'Access token required',
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should reject request with invalid token', async () => {
      mockRequest.headers = {
        authorization: 'Bearer invalid-token',
      };

      (generateAccessToken as jest.Mock).mockImplementation(() => {
        throw new Error('Invalid token');
      });

      await authenticate(
        mockRequest as any,
        mockResponse as Response,
        mockNext
      );

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should accept request with valid token', async () => {
      const mockUser = {
        id: 'user-id',
        email: 'test@example.com',
        is_admin: false,
        is_deactivated: false,
      };

      mockRequest.headers = {
        authorization: 'Bearer valid-token',
      };

      const mockPayload = {
        userId: 'user-id',
        email: 'test@example.com',
      };

      (generateAccessToken as jest.Mock).mockReturnValue('valid-token');
      
      const mockRepository = {
        findOne: jest.fn().mockResolvedValue(mockUser),
      };
      
      (AppDataSource.getRepository as jest.Mock).mockReturnValue(mockRepository);

      // Note: This test needs actual JWT verification setup
      // For now, it demonstrates the test structure
    });
  });
});

describe('Admin Only Middleware', () => {
  let mockRequest: any;
  let mockResponse: Partial<Response>;
  let mockNext: NextFunction;

  beforeEach(() => {
    mockRequest = {
      user: undefined,
      path: '/admin/test',
      method: 'GET',
      headers: {},
    };
    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
    mockNext = jest.fn();
  });

  it('should reject request without user', async () => {
    await adminOnly(mockRequest, mockResponse as Response, mockNext);

    expect(mockResponse.status).toHaveBeenCalledWith(401);
    expect(mockResponse.json).toHaveBeenCalledWith({
      success: false,
      message: 'Authentication required',
    });
    expect(mockNext).not.toHaveBeenCalled();
  });

  it('should reject non-admin user', async () => {
    mockRequest.user = {
      id: 'user-id',
      email: 'test@example.com',
      is_admin: false,
    };

    // Mock getUserAdminPermissions to return null (no admin permission)
    (getUserAdminPermissions as jest.Mock).mockResolvedValue(null);

    await adminOnly(mockRequest, mockResponse as Response, mockNext);

    expect(mockResponse.status).toHaveBeenCalledWith(403);
    expect(mockResponse.json).toHaveBeenCalledWith({
      success: false,
      message: 'Admin access required',
    });
    expect(mockNext).not.toHaveBeenCalled();
  });

  it('should accept admin user', async () => {
    // Reset mocks completely
    jest.clearAllMocks();
    (mockNext as jest.Mock).mockClear();
    (mockResponse.status as jest.Mock).mockClear();
    (mockResponse.json as jest.Mock).mockClear();
    
    // Create a fresh mock request for this test
    // Use a path that definitely won't trigger audit logging (no /admin/, /export, /users, /permissions, /delete)
    const testRequest: any = {
      user: {
        id: 'admin-id',
        email: 'admin@example.com',
        is_admin: true,
        is_deactivated: false,
        user_type: 'admin',
      },
      path: '/api/test', // Simple path that won't trigger audit logging
      method: 'GET',
      headers: {
        'user-agent': 'test-agent'
      },
    };

    // Call the middleware (adminOnly is now async)
    await adminOnly(testRequest as AuthenticatedRequest, mockResponse as Response, mockNext);

    // Verify next was called
    expect(mockNext).toHaveBeenCalledTimes(1);
    expect(mockResponse.status).not.toHaveBeenCalled();
  });

  it('should reject deactivated admin', async () => {
    mockRequest.user = {
      id: 'admin-id',
      email: 'admin@example.com',
      is_admin: true,
      is_deactivated: true,
    };

    await adminOnly(mockRequest, mockResponse as Response, mockNext);

    expect(mockResponse.status).toHaveBeenCalledWith(403);
    expect(mockNext).not.toHaveBeenCalled();
  });
});

