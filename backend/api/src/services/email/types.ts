/**
 * Email Service Types
 */

/**
 * Email configuration options interface
 */
export interface EmailConfig {
  host: string;
  port: number;
  secure: boolean;
  user: string;
  pass: string;
  fromEmail: string;
  fromName: string;
  replyTo: string;
  maxRetries: number;
  retryDelay: number;
}

/**
 * Default email configuration values
 */
export const EMAIL_CONFIG: EmailConfig = {
  host: '',
  port: 587,
  secure: false,
  user: '',
  pass: '',
  fromEmail: '',
  fromName: '',
  replyTo: '',
  maxRetries: 3,
  retryDelay: 60000,
};

/**
 * Email attachment interface
 */
export interface EmailAttachment {
  filename: string;
  content?: string | Buffer;
  path?: string;
  contentType?: string;
  encoding?: string;
}

/**
 * Email job data for queue
 */
export interface EmailJobData {
  to: string;
  subject: string;
  html: string;
  text?: string;
  from?: string;
  replyTo?: string;
  attachments?: EmailAttachment[];
  metadata?: {
    userId?: string;
    type?: EmailType;
    priority?: 'high' | 'normal' | 'low';
    projectId?: string;
    [key: string]: unknown;
  };
}

/**
 * Email types for categorization
 */
export type EmailType =
  | 'password_reset'
  | 'invitation'
  | 'welcome'
  | 'verification'
  | 'notification'
  | 'digest'
  | 'collaboration';

/**
 * Email status for tracking
 */
export type EmailStatus =
  | 'queued'
  | 'sent'
  | 'delivered'
  | 'opened'
  | 'clicked'
  | 'bounced'
  | 'failed';

/**
 * Email result from sending
 */
export interface EmailResult {
  success: boolean;
  messageId?: string;
  status: EmailStatus;
  error?: string;
}

/**
 * Password reset email data
 */
export interface PasswordResetEmailData {
  userName: string;
  resetUrl: string;
  expiresIn: string;
  ipAddress?: string;
  userAgent?: string;
}

/**
 * Project invitation email data
 */
export interface InvitationEmailData {
  projectName: string;
  inviterName: string;
  inviteUrl: string;
  role: string;
  message?: string;
  expiresIn?: string;
}

/**
 * Welcome email data
 */
export interface WelcomeEmailData {
  userName: string;
  verifyUrl?: string;
  loginUrl: string;
}

/**
 * Collaboration notification email data
 */
export interface CollaborationEmailData {
  projectName: string;
  actorName: string;
  action: string;
  itemType: string;
  itemName: string;
  projectUrl: string;
}
