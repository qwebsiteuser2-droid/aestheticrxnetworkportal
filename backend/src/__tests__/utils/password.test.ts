import { 
  hashPassword, 
  comparePassword, 
  validatePasswordStrength,
  isCommonPassword,
  generateRandomPassword
} from '../../utils/password';

describe('Password Utilities', () => {
  describe('hashPassword', () => {
    it('should hash a password', async () => {
      const password = 'TestPassword123!';
      const hash = await hashPassword(password);
      expect(hash).toBeDefined();
      expect(hash).not.toBe(password);
      expect(hash.length).toBeGreaterThan(50); // bcrypt hashes are long
    });

    it('should produce different hashes for same password', async () => {
      const password = 'TestPassword123!';
      const hash1 = await hashPassword(password);
      const hash2 = await hashPassword(password);
      expect(hash1).not.toBe(hash2); // bcrypt uses random salt
    });
  });

  describe('comparePassword', () => {
    it('should verify correct password', async () => {
      const password = 'TestPassword123!';
      const hash = await hashPassword(password);
      const isValid = await comparePassword(password, hash);
      expect(isValid).toBe(true);
    });

    it('should reject incorrect password', async () => {
      const password = 'TestPassword123!';
      const wrongPassword = 'WrongPassword123!';
      const hash = await hashPassword(password);
      const isValid = await comparePassword(wrongPassword, hash);
      expect(isValid).toBe(false);
    });
  });

  describe('validatePasswordStrength', () => {
    it('should accept strong password', () => {
      const result = validatePasswordStrength('StrongPass123!');
      expect(result.isValid).toBe(true);
      expect(result.errors.length).toBe(0);
    });

    it('should reject short password', () => {
      const result = validatePasswordStrength('Short1!');
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Password must be at least 8 characters long');
    });

    it('should reject password without uppercase', () => {
      const result = validatePasswordStrength('lowercase123!');
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Password must contain at least one uppercase letter');
    });

    it('should reject password without lowercase', () => {
      const result = validatePasswordStrength('UPPERCASE123!');
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Password must contain at least one lowercase letter');
    });

    it('should reject password without number', () => {
      const result = validatePasswordStrength('NoNumber!');
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Password must contain at least one number');
    });

    it('should reject password without special character', () => {
      const result = validatePasswordStrength('NoSpecial123');
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Password must contain at least one special character');
    });
  });

  describe('isCommonPassword', () => {
    it('should detect common passwords', () => {
      expect(isCommonPassword('password')).toBe(true);
      expect(isCommonPassword('123456')).toBe(true);
      expect(isCommonPassword('admin')).toBe(true);
    });

    it('should not flag strong passwords', () => {
      expect(isCommonPassword('StrongPass123!')).toBe(false);
      expect(isCommonPassword('MySecureP@ssw0rd')).toBe(false);
    });
  });

  describe('generateRandomPassword', () => {
    it('should generate password of specified length', () => {
      const password = generateRandomPassword(16);
      expect(password.length).toBe(16);
    });

    it('should generate password with required character types', () => {
      const password = generateRandomPassword(12);
      expect(/[A-Z]/.test(password)).toBe(true); // Has uppercase
      expect(/[a-z]/.test(password)).toBe(true); // Has lowercase
      expect(/\d/.test(password)).toBe(true); // Has number
      expect(/[!@#$%^&*]/.test(password)).toBe(true); // Has special char
    });
  });
});

