import mongoose, { Document, Schema } from 'mongoose';

/**
 * Email log status types
 */
export type EmailLogStatus =
  | 'queued'
  | 'sent'
  | 'delivered'
  | 'opened'
  | 'clicked'
  | 'bounced'
  | 'failed';

/**
 * Email type categories
 */
export type EmailLogType =
  | 'password_reset'
  | 'invitation'
  | 'welcome'
  | 'verification'
  | 'notification'
  | 'digest'
  | 'collaboration';

/**
 * Email Log Document Interface
 */
export interface IEmailLog extends Document {
  _id: mongoose.Types.ObjectId;
  to: string;
  from: string;
  subject: string;
  type: EmailLogType;
  status: EmailLogStatus;
  messageId?: string;
  jobId?: string | number;
  userId?: mongoose.Types.ObjectId;
  projectId?: mongoose.Types.ObjectId;
  metadata?: {
    ipAddress?: string;
    userAgent?: string;
    resetToken?: string;
    inviteToken?: string;
    [key: string]: unknown;
  };
  attempts: number;
  lastAttempt?: Date;
  sentAt?: Date;
  deliveredAt?: Date;
  openedAt?: Date;
  clickedAt?: Date;
  bouncedAt?: Date;
  failedAt?: Date;
  error?: string;
  createdAt: Date;
  updatedAt: Date;
}

const emailLogSchema = new Schema<IEmailLog>(
  {
    to: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    from: {
      type: String,
      required: true,
      trim: true,
    },
    subject: {
      type: String,
      required: true,
      trim: true,
      maxlength: 500,
    },
    type: {
      type: String,
      enum: [
        'password_reset',
        'invitation',
        'welcome',
        'verification',
        'notification',
        'digest',
        'collaboration',
      ],
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: ['queued', 'sent', 'delivered', 'opened', 'clicked', 'bounced', 'failed'],
      default: 'queued',
      index: true,
    },
    messageId: {
      type: String,
      sparse: true,
      index: true,
    },
    jobId: {
      type: Schema.Types.Mixed, // Can be string or number from Bull
      sparse: true,
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      sparse: true,
      index: true,
    },
    projectId: {
      type: Schema.Types.ObjectId,
      ref: 'Project',
      sparse: true,
      index: true,
    },
    metadata: {
      type: Schema.Types.Mixed,
      default: {},
    },
    attempts: {
      type: Number,
      default: 0,
    },
    lastAttempt: Date,
    sentAt: Date,
    deliveredAt: Date,
    openedAt: Date,
    clickedAt: Date,
    bouncedAt: Date,
    failedAt: Date,
    error: {
      type: String,
      maxlength: 2000,
    },
  },
  {
    timestamps: true,
  }
);

// Compound indexes for common queries
emailLogSchema.index({ userId: 1, type: 1 });
emailLogSchema.index({ status: 1, createdAt: -1 });
emailLogSchema.index({ type: 1, createdAt: -1 });

// TTL index to auto-delete old logs after 90 days
emailLogSchema.index({ createdAt: 1 }, { expireAfterSeconds: 90 * 24 * 60 * 60 });

/**
 * Static method to log a new email
 */
emailLogSchema.statics.logEmail = async function (
  data: Partial<IEmailLog>
): Promise<IEmailLog> {
  const log = new this(data);
  return log.save();
};

/**
 * Static method to update email status
 */
emailLogSchema.statics.updateStatus = async function (
  messageId: string,
  status: EmailLogStatus,
  additionalData?: Partial<IEmailLog>
): Promise<IEmailLog | null> {
  const update: Partial<IEmailLog> = {
    status,
    ...additionalData,
  };

  // Set appropriate timestamp based on status
  const now = new Date();
  switch (status) {
    case 'sent':
      update.sentAt = now;
      break;
    case 'delivered':
      update.deliveredAt = now;
      break;
    case 'opened':
      update.openedAt = now;
      break;
    case 'clicked':
      update.clickedAt = now;
      break;
    case 'bounced':
      update.bouncedAt = now;
      break;
    case 'failed':
      update.failedAt = now;
      break;
  }

  return this.findOneAndUpdate(
    { messageId },
    { $set: update },
    { new: true }
  );
};

/**
 * Static method to get email stats for a user
 */
emailLogSchema.statics.getUserStats = async function (
  userId: string
): Promise<{
  total: number;
  sent: number;
  failed: number;
  opened: number;
  byType: Record<string, number>;
}> {
  const stats = await this.aggregate([
    { $match: { userId: new mongoose.Types.ObjectId(userId) } },
    {
      $group: {
        _id: null,
        total: { $sum: 1 },
        sent: { $sum: { $cond: [{ $eq: ['$status', 'sent'] }, 1, 0] } },
        failed: { $sum: { $cond: [{ $eq: ['$status', 'failed'] }, 1, 0] } },
        opened: { $sum: { $cond: [{ $eq: ['$status', 'opened'] }, 1, 0] } },
      },
    },
  ]);

  const byType = await this.aggregate([
    { $match: { userId: new mongoose.Types.ObjectId(userId) } },
    { $group: { _id: '$type', count: { $sum: 1 } } },
  ]);

  return {
    total: stats[0]?.total || 0,
    sent: stats[0]?.sent || 0,
    failed: stats[0]?.failed || 0,
    opened: stats[0]?.opened || 0,
    byType: byType.reduce((acc, curr) => {
      acc[curr._id] = curr.count;
      return acc;
    }, {} as Record<string, number>),
  };
};

export default mongoose.model<IEmailLog>('EmailLog', emailLogSchema);
