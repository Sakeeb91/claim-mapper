/**
 * Email Service Unit Tests
 */

import {
  renderPasswordResetEmail,
  renderInvitationEmail,
  renderWelcomeEmail,
  renderCollaborationEmail,
  renderUnsubscribeEmail,
} from '../templates';
import type {
  PasswordResetEmailData,
  InvitationEmailData,
  WelcomeEmailData,
  CollaborationEmailData,
} from '../types';

// Mock environment variables
const originalEnv = process.env;

beforeEach(() => {
  jest.resetModules();
  process.env = {
    ...originalEnv,
    ENABLE_EMAIL_NOTIFICATIONS: 'false',
    SMTP_HOST: 'smtp.test.com',
    SMTP_PORT: '587',
    SMTP_USER: 'test@test.com',
    SMTP_PASS: 'testpass',
    FROM_EMAIL: 'noreply@test.com',
    REDIS_URL: 'redis://localhost:6379',
  };
});

afterEach(() => {
  process.env = originalEnv;
});

describe('Email Templates', () => {
  describe('renderPasswordResetEmail', () => {
    const mockData: PasswordResetEmailData = {
      userName: 'John',
      resetUrl: 'https://example.com/reset?token=abc123',
      expiresIn: '15 minutes',
      ipAddress: '192.168.1.1',
      userAgent: 'Mozilla/5.0',
    };

    it('should render a valid HTML email', () => {
      const html = renderPasswordResetEmail(mockData);

      expect(html).toContain('<!DOCTYPE html>');
      expect(html).toContain('</html>');
    });

    it('should include the user name', () => {
      const html = renderPasswordResetEmail(mockData);

      expect(html).toContain('Hi John');
    });

    it('should include the reset URL', () => {
      const html = renderPasswordResetEmail(mockData);

      expect(html).toContain(mockData.resetUrl);
      expect(html).toContain('Reset Password');
    });

    it('should include expiration time', () => {
      const html = renderPasswordResetEmail(mockData);

      expect(html).toContain('15 minutes');
    });

    it('should include IP address when provided', () => {
      const html = renderPasswordResetEmail(mockData);

      expect(html).toContain('192.168.1.1');
    });

    it('should work without optional fields', () => {
      const minimalData: PasswordResetEmailData = {
        userName: 'Jane',
        resetUrl: 'https://example.com/reset?token=xyz',
        expiresIn: '1 hour',
      };

      const html = renderPasswordResetEmail(minimalData);

      expect(html).toContain('Hi Jane');
      expect(html).toContain(minimalData.resetUrl);
      expect(html).not.toContain('Request details:');
    });

    it('should include Claim Mapper branding', () => {
      const html = renderPasswordResetEmail(mockData);

      expect(html).toContain('Claim Mapper');
    });

    it('should have accessible preheader text', () => {
      const html = renderPasswordResetEmail(mockData);

      expect(html).toContain('Reset your Claim Mapper password');
    });
  });

  describe('renderInvitationEmail', () => {
    const mockData: InvitationEmailData = {
      projectName: 'Test Project',
      inviterName: 'Jane Doe',
      inviteUrl: 'https://example.com/projects/123',
      role: 'editor',
      message: 'Would love your help on this!',
      expiresIn: '7 days',
    };

    it('should render a valid HTML email', () => {
      const html = renderInvitationEmail(mockData);

      expect(html).toContain('<!DOCTYPE html>');
      expect(html).toContain('</html>');
    });

    it('should include project name', () => {
      const html = renderInvitationEmail(mockData);

      expect(html).toContain('Test Project');
    });

    it('should include inviter name', () => {
      const html = renderInvitationEmail(mockData);

      expect(html).toContain('Jane Doe');
    });

    it('should include the invite URL', () => {
      const html = renderInvitationEmail(mockData);

      expect(html).toContain(mockData.inviteUrl);
      expect(html).toContain('Accept Invitation');
    });

    it('should capitalize role', () => {
      const html = renderInvitationEmail(mockData);

      expect(html).toContain('Editor');
    });

    it('should include custom message when provided', () => {
      const html = renderInvitationEmail(mockData);

      expect(html).toContain('Would love your help on this!');
    });

    it('should work without optional message', () => {
      const minimalData: InvitationEmailData = {
        projectName: 'Minimal Project',
        inviterName: 'Bob',
        inviteUrl: 'https://example.com/invite',
        role: 'viewer',
      };

      const html = renderInvitationEmail(minimalData);

      expect(html).toContain('Minimal Project');
      expect(html).toContain('Bob');
      expect(html).toContain('Viewer');
    });

    it('should show correct permissions for viewer role', () => {
      const viewerData: InvitationEmailData = {
        ...mockData,
        role: 'viewer',
      };

      const html = renderInvitationEmail(viewerData);

      expect(html).toContain('View claims, evidence, and reasoning chains');
      expect(html).toContain('Export project data');
    });

    it('should show correct permissions for editor role', () => {
      const html = renderInvitationEmail(mockData);

      expect(html).toContain('Create and edit claims and evidence');
      expect(html).toContain('Build reasoning chains');
    });

    it('should show correct permissions for admin role', () => {
      const adminData: InvitationEmailData = {
        ...mockData,
        role: 'admin',
      };

      const html = renderInvitationEmail(adminData);

      expect(html).toContain('Full editing permissions');
      expect(html).toContain('Invite and manage collaborators');
      expect(html).toContain('Configure project settings');
    });

    it('should have preheader text with project info', () => {
      const html = renderInvitationEmail(mockData);

      expect(html).toContain('Jane Doe invited you to collaborate on');
    });
  });

  describe('renderWelcomeEmail', () => {
    const mockData: WelcomeEmailData = {
      userName: 'New User',
      verifyUrl: 'https://example.com/verify?token=abc',
      loginUrl: 'https://example.com/login',
    };

    it('should render a valid HTML email', () => {
      const html = renderWelcomeEmail(mockData);

      expect(html).toContain('<!DOCTYPE html>');
      expect(html).toContain('Welcome to Claim Mapper');
    });

    it('should include user name', () => {
      const html = renderWelcomeEmail(mockData);

      expect(html).toContain('Hi New User');
    });

    it('should include verify URL when provided', () => {
      const html = renderWelcomeEmail(mockData);

      expect(html).toContain('Verify Email');
      expect(html).toContain(mockData.verifyUrl);
    });

    it('should show Get Started button when no verify URL', () => {
      const noVerifyData: WelcomeEmailData = {
        userName: 'Verified User',
        loginUrl: 'https://example.com/login',
      };

      const html = renderWelcomeEmail(noVerifyData);

      expect(html).toContain('Get Started');
      expect(html).toContain(noVerifyData.loginUrl);
    });

    it('should list features', () => {
      const html = renderWelcomeEmail(mockData);

      expect(html).toContain('Create and organize claims');
      expect(html).toContain('visual reasoning chains');
      expect(html).toContain('Collaborate with your team');
      expect(html).toContain('AI-powered insights');
    });
  });

  describe('renderCollaborationEmail', () => {
    const mockData: CollaborationEmailData = {
      projectName: 'Research Project',
      actorName: 'Alice',
      action: 'added',
      itemType: 'claim',
      itemName: 'New hypothesis about climate',
      projectUrl: 'https://example.com/projects/research',
    };

    it('should render a valid HTML email', () => {
      const html = renderCollaborationEmail(mockData);

      expect(html).toContain('<!DOCTYPE html>');
      expect(html).toContain('Project Update');
    });

    it('should describe the action', () => {
      const html = renderCollaborationEmail(mockData);

      expect(html).toContain('Alice');
      expect(html).toContain('added');
      expect(html).toContain('claim');
      expect(html).toContain('New hypothesis about climate');
    });

    it('should include project link', () => {
      const html = renderCollaborationEmail(mockData);

      expect(html).toContain('View Project');
      expect(html).toContain(mockData.projectUrl);
    });

    it('should mention collaborator status', () => {
      const html = renderCollaborationEmail(mockData);

      expect(html).toContain("you're a collaborator");
    });
  });

  describe('renderUnsubscribeEmail', () => {
    it('should render a valid HTML email', () => {
      const html = renderUnsubscribeEmail('John Doe');

      expect(html).toContain('<!DOCTYPE html>');
      expect(html).toContain('Unsubscribed Successfully');
    });

    it('should include user name', () => {
      const html = renderUnsubscribeEmail('John Doe');

      expect(html).toContain('Hi John Doe');
    });

    it('should explain what they unsubscribed from', () => {
      const html = renderUnsubscribeEmail('John Doe');

      expect(html).toContain('collaboration updates');
      expect(html).toContain('digests');
    });

    it('should mention essential emails still arrive', () => {
      const html = renderUnsubscribeEmail('John Doe');

      expect(html).toContain('essential account emails');
      expect(html).toContain('password resets');
    });

    it('should mention re-enabling option', () => {
      const html = renderUnsubscribeEmail('John Doe');

      expect(html).toContain('re-enable notifications');
      expect(html).toContain('account settings');
    });
  });
});

describe('Email Service Configuration', () => {
  it('should have correct default config values', () => {
    // Test via the EMAIL_CONFIG constant from types
    // The actual emailConfig in index.ts uses environment variables
    const { EMAIL_CONFIG } = require('../types');

    expect(EMAIL_CONFIG.port).toBe(587);
    expect(EMAIL_CONFIG.maxRetries).toBe(3);
  });
});

describe('Email Types', () => {
  it('should export all expected types', async () => {
    const types = await import('../types');

    expect(types.EMAIL_CONFIG).toBeDefined();
    expect(types.EMAIL_CONFIG.maxRetries).toBe(3);
    expect(types.EMAIL_CONFIG.retryDelay).toBe(60000);
  });
});
