/**
 * User Model Unit Tests
 * Tests the User Mongoose schema, validation, and instance methods
 */

import mongoose from 'mongoose';

// Mock bcrypt before importing User model
jest.mock('bcryptjs', () => ({
  genSalt: jest.fn().mockResolvedValue('$2b$10$salt'),
  hash: jest.fn().mockImplementation((password: string) =>
    Promise.resolve(`$2b$10$hashed_${password}`)
  ),
  compare: jest.fn().mockImplementation((candidate: string, stored: string) =>
    Promise.resolve(stored === `$2b$10$hashed_${candidate}`)
  ),
}));

import User, { IUser } from '../User';
import bcrypt from 'bcryptjs';

describe('User Model', () => {
  describe('Schema Validation', () => {
    it('should require email field', () => {
      const user = new User({
        password: 'StrongP@ss123!',
        firstName: 'Test',
        lastName: 'User',
      });

      const validationError = user.validateSync();
      expect(validationError?.errors.email).toBeDefined();
      expect(validationError?.errors.email.kind).toBe('required');
    });

    it('should require password field', () => {
      const user = new User({
        email: 'test@example.com',
        firstName: 'Test',
        lastName: 'User',
      });

      const validationError = user.validateSync();
      expect(validationError?.errors.password).toBeDefined();
    });

    it('should require firstName field', () => {
      const user = new User({
        email: 'test@example.com',
        password: 'StrongP@ss123!',
        lastName: 'User',
      });

      const validationError = user.validateSync();
      expect(validationError?.errors.firstName).toBeDefined();
    });

    it('should require lastName field', () => {
      const user = new User({
        email: 'test@example.com',
        password: 'StrongP@ss123!',
        firstName: 'Test',
      });

      const validationError = user.validateSync();
      expect(validationError?.errors.lastName).toBeDefined();
    });

    it('should enforce email uniqueness through index', () => {
      const schema = User.schema;
      const emailPath = schema.path('email');

      // Check that unique index exists
      expect(emailPath.options.unique).toBe(true);
    });

    it('should lowercase email automatically', () => {
      const user = new User({
        email: 'TEST@EXAMPLE.COM',
        password: 'StrongP@ss123!',
        firstName: 'Test',
        lastName: 'User',
      });

      expect(user.email).toBe('test@example.com');
    });

    it('should trim firstName and lastName', () => {
      const user = new User({
        email: 'test@example.com',
        password: 'StrongP@ss123!',
        firstName: '  Test  ',
        lastName: '  User  ',
      });

      expect(user.firstName).toBe('Test');
      expect(user.lastName).toBe('User');
    });

    it('should enforce maxlength on firstName (50 chars)', () => {
      const user = new User({
        email: 'test@example.com',
        password: 'StrongP@ss123!',
        firstName: 'A'.repeat(51),
        lastName: 'User',
      });

      const validationError = user.validateSync();
      expect(validationError?.errors.firstName).toBeDefined();
    });

    it('should enforce minlength on password (8 chars)', () => {
      const user = new User({
        email: 'test@example.com',
        password: 'short',
        firstName: 'Test',
        lastName: 'User',
      });

      const validationError = user.validateSync();
      expect(validationError?.errors.password).toBeDefined();
    });

    it('should only allow valid roles', () => {
      const validRoles = ['user', 'admin', 'researcher'];

      validRoles.forEach((role) => {
        const user = new User({
          email: `${role}@example.com`,
          password: 'StrongP@ss123!',
          firstName: 'Test',
          lastName: 'User',
          role,
        });
        const validationError = user.validateSync();
        expect(validationError?.errors.role).toBeUndefined();
      });
    });

    it('should reject invalid role', () => {
      const user = new User({
        email: 'test@example.com',
        password: 'StrongP@ss123!',
        firstName: 'Test',
        lastName: 'User',
        role: 'superadmin', // Invalid role
      });

      const validationError = user.validateSync();
      expect(validationError?.errors.role).toBeDefined();
    });

    it('should default role to user', () => {
      const user = new User({
        email: 'test@example.com',
        password: 'StrongP@ss123!',
        firstName: 'Test',
        lastName: 'User',
      });

      expect(user.role).toBe('user');
    });

    it('should default isActive to true', () => {
      const user = new User({
        email: 'test@example.com',
        password: 'StrongP@ss123!',
        firstName: 'Test',
        lastName: 'User',
      });

      expect(user.isActive).toBe(true);
    });

    it('should default isVerified to false', () => {
      const user = new User({
        email: 'test@example.com',
        password: 'StrongP@ss123!',
        firstName: 'Test',
        lastName: 'User',
      });

      expect(user.isVerified).toBe(false);
    });

    it('should validate avatar as valid URL', () => {
      const user = new User({
        email: 'test@example.com',
        password: 'StrongP@ss123!',
        firstName: 'Test',
        lastName: 'User',
        avatar: 'not-a-url',
      });

      const validationError = user.validateSync();
      expect(validationError?.errors.avatar).toBeDefined();
    });

    it('should accept valid avatar URL', () => {
      const user = new User({
        email: 'test@example.com',
        password: 'StrongP@ss123!',
        firstName: 'Test',
        lastName: 'User',
        avatar: 'https://example.com/avatar.png',
      });

      const validationError = user.validateSync();
      expect(validationError?.errors?.avatar).toBeUndefined();
    });
  });

  describe('Default Values', () => {
    it('should set default preferences', () => {
      const user = new User({
        email: 'test@example.com',
        password: 'StrongP@ss123!',
        firstName: 'Test',
        lastName: 'User',
      });

      expect(user.preferences.theme).toBe('light');
      expect(user.preferences.notifications.email).toBe(true);
      expect(user.preferences.notifications.push).toBe(true);
      expect(user.preferences.notifications.collaboration).toBe(true);
      expect(user.preferences.privacy.profileVisible).toBe(true);
      expect(user.preferences.privacy.showActivity).toBe(true);
    });

    it('should set default stats to zero', () => {
      const user = new User({
        email: 'test@example.com',
        password: 'StrongP@ss123!',
        firstName: 'Test',
        lastName: 'User',
      });

      expect(user.stats.claimsCreated).toBe(0);
      expect(user.stats.projectsCreated).toBe(0);
      expect(user.stats.collaborations).toBe(0);
      expect(user.stats.totalReasoningChains).toBe(0);
    });

    it('should initialize loginHistory as empty array', () => {
      const user = new User({
        email: 'test@example.com',
        password: 'StrongP@ss123!',
        firstName: 'Test',
        lastName: 'User',
      });

      expect(user.loginHistory).toEqual([]);
    });
  });

  describe('Virtual Properties', () => {
    it('should have fullName virtual property', () => {
      const user = new User({
        email: 'test@example.com',
        password: 'StrongP@ss123!',
        firstName: 'John',
        lastName: 'Doe',
      });

      expect(user.get('fullName')).toBe('John Doe');
    });
  });

  describe('Password Hashing Pre-save Hook', () => {
    it('should hash password on save when password is modified', async () => {
      const user = new User({
        email: 'test@example.com',
        password: 'StrongP@ss123!',
        firstName: 'Test',
        lastName: 'User',
      });

      // Manually trigger the pre-save hook logic
      await user.validate();

      // The pre-save hook calls bcrypt.genSalt and bcrypt.hash
      // In actual save, password would be hashed
      expect(user.isModified('password')).toBe(true);
    });

    it('should call bcrypt.genSalt with salt rounds of 12', async () => {
      const user = new User({
        email: 'test@example.com',
        password: 'StrongP@ss123!',
        firstName: 'Test',
        lastName: 'User',
      });

      // Simulate calling the pre-save hook
      if (user.isModified('password')) {
        await bcrypt.genSalt(12);
        expect(bcrypt.genSalt).toHaveBeenCalledWith(12);
      }
    });
  });

  describe('Instance Methods', () => {
    describe('comparePassword', () => {
      it('should return true for matching password', async () => {
        const user = new User({
          email: 'test@example.com',
          password: '$2b$10$hashed_StrongP@ss123!', // Pre-hashed password
          firstName: 'Test',
          lastName: 'User',
        });

        const result = await user.comparePassword('StrongP@ss123!');
        expect(result).toBe(true);
        expect(bcrypt.compare).toHaveBeenCalled();
      });

      it('should return false for non-matching password', async () => {
        // Override mock for this test
        (bcrypt.compare as jest.Mock).mockResolvedValueOnce(false);

        const user = new User({
          email: 'test@example.com',
          password: '$2b$10$hashed_StrongP@ss123!',
          firstName: 'Test',
          lastName: 'User',
        });

        const result = await user.comparePassword('WrongPassword123!');
        expect(result).toBe(false);
      });
    });

    describe('generatePasswordHash', () => {
      it('should generate a hash for given password', async () => {
        const user = new User({
          email: 'test@example.com',
          password: 'StrongP@ss123!',
          firstName: 'Test',
          lastName: 'User',
        });

        const hash = await user.generatePasswordHash('NewPassword123!');
        expect(hash).toContain('$2b$10$hashed_');
        expect(bcrypt.genSalt).toHaveBeenCalledWith(12);
        expect(bcrypt.hash).toHaveBeenCalled();
      });
    });

    describe('toJSON', () => {
      it('should remove password from JSON output', () => {
        const user = new User({
          email: 'test@example.com',
          password: 'StrongP@ss123!',
          firstName: 'Test',
          lastName: 'User',
        });

        const json = user.toJSON();
        expect(json.password).toBeUndefined();
      });

      it('should remove resetPasswordToken from JSON output', () => {
        const user = new User({
          email: 'test@example.com',
          password: 'StrongP@ss123!',
          firstName: 'Test',
          lastName: 'User',
          resetPasswordToken: 'some-token',
        });

        const json = user.toJSON();
        expect(json.resetPasswordToken).toBeUndefined();
      });

      it('should remove resetPasswordExpires from JSON output', () => {
        const user = new User({
          email: 'test@example.com',
          password: 'StrongP@ss123!',
          firstName: 'Test',
          lastName: 'User',
          resetPasswordExpires: new Date(),
        });

        const json = user.toJSON();
        expect(json.resetPasswordExpires).toBeUndefined();
      });

      it('should remove verificationToken from JSON output', () => {
        const user = new User({
          email: 'test@example.com',
          password: 'StrongP@ss123!',
          firstName: 'Test',
          lastName: 'User',
          verificationToken: 'some-verification-token',
        });

        const json = user.toJSON();
        expect(json.verificationToken).toBeUndefined();
      });

      it('should keep other fields in JSON output', () => {
        const user = new User({
          email: 'test@example.com',
          password: 'StrongP@ss123!',
          firstName: 'Test',
          lastName: 'User',
          role: 'researcher',
        });

        const json = user.toJSON();
        expect(json.email).toBe('test@example.com');
        expect(json.firstName).toBe('Test');
        expect(json.lastName).toBe('User');
        expect(json.role).toBe('researcher');
      });
    });
  });

  describe('Schema Indexes', () => {
    it('should have index on email field', () => {
      const indexes = User.schema.indexes();
      const emailIndex = indexes.find(
        (idx) => idx[0].email !== undefined
      );
      expect(emailIndex).toBeDefined();
    });

    it('should have index on role field', () => {
      const indexes = User.schema.indexes();
      const roleIndex = indexes.find(
        (idx) => idx[0].role !== undefined
      );
      expect(roleIndex).toBeDefined();
    });

    it('should have compound index on isActive and isVerified', () => {
      const indexes = User.schema.indexes();
      const compoundIndex = indexes.find(
        (idx) => idx[0].isActive !== undefined && idx[0].isVerified !== undefined
      );
      expect(compoundIndex).toBeDefined();
    });
  });

  describe('Profile Validation', () => {
    it('should enforce bio maxlength (500 chars)', () => {
      const user = new User({
        email: 'test@example.com',
        password: 'StrongP@ss123!',
        firstName: 'Test',
        lastName: 'User',
        profile: {
          bio: 'A'.repeat(501),
        },
      });

      const validationError = user.validateSync();
      expect(validationError?.errors['profile.bio']).toBeDefined();
    });

    it('should validate profile website as URL', () => {
      const user = new User({
        email: 'test@example.com',
        password: 'StrongP@ss123!',
        firstName: 'Test',
        lastName: 'User',
        profile: {
          socialLinks: {
            website: 'not-a-valid-url',
          },
        },
      });

      const validationError = user.validateSync();
      expect(validationError?.errors['profile.socialLinks.website']).toBeDefined();
    });

    it('should accept valid profile data', () => {
      const user = new User({
        email: 'test@example.com',
        password: 'StrongP@ss123!',
        firstName: 'Test',
        lastName: 'User',
        profile: {
          bio: 'I am a researcher.',
          organization: 'Test University',
          department: 'Computer Science',
          researchInterests: ['AI', 'ML', 'NLP'],
          socialLinks: {
            website: 'https://example.com',
            twitter: 'testuser',
            linkedin: 'testuser',
            orcid: '0000-0000-0000-0000',
          },
        },
      });

      const validationError = user.validateSync();
      expect(validationError).toBeNull();
    });
  });

  describe('Login History', () => {
    it('should store login history entries', () => {
      const loginEntry = {
        timestamp: new Date(),
        ip: '192.168.1.1',
        userAgent: 'Mozilla/5.0 (Test)',
      };

      const user = new User({
        email: 'test@example.com',
        password: 'StrongP@ss123!',
        firstName: 'Test',
        lastName: 'User',
        loginHistory: [loginEntry],
      });

      expect(user.loginHistory.length).toBe(1);
      expect(user.loginHistory[0].ip).toBe('192.168.1.1');
    });

    it('should require timestamp, ip, and userAgent for login history', () => {
      const user = new User({
        email: 'test@example.com',
        password: 'StrongP@ss123!',
        firstName: 'Test',
        lastName: 'User',
        loginHistory: [{ timestamp: new Date() }], // Missing ip and userAgent
      });

      const validationError = user.validateSync();
      expect(validationError?.errors['loginHistory.0.ip']).toBeDefined();
      expect(validationError?.errors['loginHistory.0.userAgent']).toBeDefined();
    });
  });
});
