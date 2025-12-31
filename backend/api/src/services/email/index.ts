/**
 * Email Service
 *
 * Handles email sending with Bull queue for reliability.
 * Features:
 * - Background queue processing
 * - Automatic retry on failure
 * - Delivery status tracking
 * - Rate limiting
 */

import nodemailer, { Transporter } from 'nodemailer';
import Bull, { Queue, Job } from 'bull';
import { logger } from '../../utils/logger';
import { EmailConfig, EmailJobData, EmailResult, EmailStatus } from './types';

// Email configuration from environment
export const emailConfig: EmailConfig = {
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.SMTP_PORT || '587', 10),
  secure: process.env.SMTP_SECURE === 'true',
  user: process.env.SMTP_USER || '',
  pass: process.env.SMTP_PASS || '',
  fromEmail: process.env.FROM_EMAIL || 'noreply@claimmapper.com',
  fromName: process.env.FROM_NAME || 'Claim Mapper',
  replyTo: process.env.REPLY_TO_EMAIL || '',
  maxRetries: parseInt(process.env.EMAIL_MAX_RETRIES || '3', 10),
  retryDelay: parseInt(process.env.EMAIL_RETRY_DELAY || '60000', 10), // 1 minute
};

// Create transporter
let transporter: Transporter | null = null;

/**
 * Get or create the nodemailer transporter
 */
export const getTransporter = (): Transporter | null => {
  if (!isEmailEnabled()) {
    return null;
  }

  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: emailConfig.host,
      port: emailConfig.port,
      secure: emailConfig.secure,
      auth: {
        user: emailConfig.user,
        pass: emailConfig.pass,
      },
    });
  }

  return transporter;
};

// Email queue with Redis
let emailQueue: Queue<EmailJobData> | null = null;

/**
 * Get or create the email queue
 */
export const getEmailQueue = (): Queue<EmailJobData> | null => {
  if (!isEmailEnabled()) {
    return null;
  }

  if (!emailQueue) {
    const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';

    emailQueue = new Bull<EmailJobData>('emails', redisUrl, {
      defaultJobOptions: {
        attempts: emailConfig.maxRetries,
        backoff: {
          type: 'exponential',
          delay: emailConfig.retryDelay,
        },
        removeOnComplete: 100, // Keep last 100 completed jobs
        removeOnFail: 500, // Keep last 500 failed jobs
      },
    });

    // Process queue
    emailQueue.process(async (job: Job<EmailJobData>) => {
      return processEmailJob(job);
    });

    // Event handlers
    emailQueue.on('completed', (job) => {
      logger.info(`Email sent successfully`, { jobId: job.id, to: job.data.to });
    });

    emailQueue.on('failed', (job, error) => {
      logger.error(`Email failed to send`, {
        jobId: job?.id,
        to: job?.data?.to,
        error: error.message,
        attempts: job?.attemptsMade,
      });
    });

    emailQueue.on('error', (error) => {
      logger.error('Email queue error:', error);
    });
  }

  return emailQueue;
};

/**
 * Check if email service is enabled
 */
export const isEmailEnabled = (): boolean => {
  const enabled = process.env.ENABLE_EMAIL_NOTIFICATIONS !== 'false';
  const hasCredentials = !!(emailConfig.user && emailConfig.pass);
  return enabled && hasCredentials;
};

/**
 * Process an email job
 */
const processEmailJob = async (job: Job<EmailJobData>): Promise<EmailResult> => {
  const { to, subject, html, text, from, replyTo, attachments } = job.data;

  const transport = getTransporter();
  if (!transport) {
    throw new Error('Email transport not configured');
  }

  const mailOptions = {
    from: from || `"${emailConfig.fromName}" <${emailConfig.fromEmail}>`,
    to,
    subject,
    html,
    text: text || stripHtml(html),
    replyTo: replyTo || emailConfig.replyTo || undefined,
    attachments,
  };

  try {
    const info = await transport.sendMail(mailOptions);

    return {
      success: true,
      messageId: info.messageId,
      status: 'sent' as EmailStatus,
    };
  } catch (error) {
    logger.error('Error sending email:', error);
    throw error;
  }
};

/**
 * Strip HTML tags from content (for plain text fallback)
 */
const stripHtml = (html: string): string => {
  return html
    .replace(/<style[^>]*>.*?<\/style>/gs, '')
    .replace(/<script[^>]*>.*?<\/script>/gs, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
};

/**
 * Queue an email for sending
 */
export const sendEmail = async (
  to: string,
  subject: string,
  html: string,
  options: Partial<EmailJobData> = {}
): Promise<{ queued: boolean; jobId?: string | number }> => {
  if (!isEmailEnabled()) {
    logger.warn('Email service disabled - email not sent', { to, subject });
    return { queued: false };
  }

  const queue = getEmailQueue();
  if (!queue) {
    logger.error('Email queue not available');
    return { queued: false };
  }

  const jobData: EmailJobData = {
    to,
    subject,
    html,
    text: options.text,
    from: options.from,
    replyTo: options.replyTo,
    attachments: options.attachments,
    metadata: options.metadata,
  };

  try {
    const job = await queue.add(jobData, {
      priority: options.metadata?.priority === 'high' ? 1 : 10,
    });

    logger.info(`Email queued`, { jobId: job.id, to, subject });

    return { queued: true, jobId: job.id };
  } catch (error) {
    logger.error('Failed to queue email:', error);
    return { queued: false };
  }
};

/**
 * Send email immediately (skip queue) - use for critical emails
 */
export const sendEmailImmediate = async (
  to: string,
  subject: string,
  html: string,
  options: Partial<EmailJobData> = {}
): Promise<EmailResult> => {
  if (!isEmailEnabled()) {
    logger.warn('Email service disabled - email not sent', { to, subject });
    return {
      success: false,
      status: 'failed',
      error: 'Email service disabled',
    };
  }

  const transport = getTransporter();
  if (!transport) {
    return {
      success: false,
      status: 'failed',
      error: 'Email transport not configured',
    };
  }

  const mailOptions = {
    from: options.from || `"${emailConfig.fromName}" <${emailConfig.fromEmail}>`,
    to,
    subject,
    html,
    text: options.text || stripHtml(html),
    replyTo: options.replyTo || emailConfig.replyTo || undefined,
    attachments: options.attachments,
  };

  try {
    const info = await transport.sendMail(mailOptions);

    logger.info(`Email sent immediately`, { to, subject, messageId: info.messageId });

    return {
      success: true,
      messageId: info.messageId,
      status: 'sent',
    };
  } catch (error) {
    logger.error('Failed to send email immediately:', error);
    return {
      success: false,
      status: 'failed',
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
};

/**
 * Verify email connection/configuration
 */
export const verifyEmailConnection = async (): Promise<boolean> => {
  if (!isEmailEnabled()) {
    return false;
  }

  const transport = getTransporter();
  if (!transport) {
    return false;
  }

  try {
    await transport.verify();
    logger.info('Email connection verified');
    return true;
  } catch (error) {
    logger.error('Email connection verification failed:', error);
    return false;
  }
};

/**
 * Get email queue statistics
 */
export const getEmailQueueStats = async (): Promise<{
  waiting: number;
  active: number;
  completed: number;
  failed: number;
  delayed: number;
} | null> => {
  const queue = getEmailQueue();
  if (!queue) {
    return null;
  }

  try {
    const [waiting, active, completed, failed, delayed] = await Promise.all([
      queue.getWaitingCount(),
      queue.getActiveCount(),
      queue.getCompletedCount(),
      queue.getFailedCount(),
      queue.getDelayedCount(),
    ]);

    return { waiting, active, completed, failed, delayed };
  } catch (error) {
    logger.error('Failed to get email queue stats:', error);
    return null;
  }
};

/**
 * Close email queue gracefully
 */
export const closeEmailQueue = async (): Promise<void> => {
  if (emailQueue) {
    await emailQueue.close();
    emailQueue = null;
    logger.info('Email queue closed');
  }
};

// Graceful shutdown
process.on('SIGINT', async () => {
  await closeEmailQueue();
});

process.on('SIGTERM', async () => {
  await closeEmailQueue();
});

// Re-export types and templates
export * from './types';
export * from './templates';
