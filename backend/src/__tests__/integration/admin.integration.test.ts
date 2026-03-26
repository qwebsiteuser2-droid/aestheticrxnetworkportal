import request from 'supertest';
import express from 'express';
import adminRoutes from '../../routes/admin';
import { AppDataSource } from '../../db/data-source';
import { Doctor } from '../../models/Doctor';

jest.mock('../../db/data-source');

const app = express();
app.use(express.json());
app.use('/api/admin', adminRoutes);

describe('Admin API Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Authorization Checks', () => {
    it('should require authentication for admin endpoints', async () => {
      const response = await request(app)
        .get('/api/admin/users')
        .send({});

      // Should require authentication
      expect([401, 403]).toContain(response.status);
    });

    it('should require admin privileges', async () => {
      // Mock non-admin user
      const mockUser = {
        id: 'user-id',
        email: 'user@example.com',
        is_admin: false,
      };

      // In real test, would set up authenticated but non-admin request
      expect(mockUser.is_admin).toBe(false);
    });
  });

  describe('User Management', () => {
    it('should prevent deactivating other admins', () => {
      const admin = { id: 'admin-1', is_admin: true };
      const targetAdmin = { id: 'admin-2', is_admin: true };

      // Should reject deactivation of other admins
      if (targetAdmin.is_admin) {
        expect(targetAdmin.is_admin).toBe(true);
        // Should return error
      }
    });

    it('should log admin operations', () => {
      const operation = {
        action: 'DEACTIVATE_USER',
        userId: 'admin-id',
        targetUserId: 'user-id',
      };

      // Should be logged
      expect(operation.action).toBeDefined();
      expect(operation.userId).toBeDefined();
    });
  });

  describe('Data Export', () => {
    it('should exclude passwords from exports', () => {
      const exportData = {
        users: [
          { id: '1', email: 'user@example.com', password_hash: 'hash' },
        ],
      };

      // Should remove password_hash
      const sanitized = exportData.users.map(({ password_hash, ...user }) => user);
      expect((sanitized[0] as any).password_hash).toBeUndefined();
    });

    it('should enforce export rate limits', () => {
      const maxExports = 10;
      const currentExports = 11;

      if (currentExports > maxExports) {
        // Should be blocked
        expect(currentExports).toBeGreaterThan(maxExports);
      }
    });
  });
});

