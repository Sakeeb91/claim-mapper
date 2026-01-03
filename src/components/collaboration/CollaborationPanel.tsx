'use client';

import { Users, Eye, Edit3, Clock, AlertCircle } from 'lucide-react';
import { cn, formatRelativeTime } from '@/utils';
import { Tooltip } from '@/components/ui';

export interface ActiveUser {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string;
  color: string;
  activity: 'viewing' | 'editing' | 'idle';
  lastActiveAt: Date;
}

export interface CollaborationPanelProps {
  projectId: string;
  activeUsers: ActiveUser[];
  currentUserId: string;
  className?: string;
}

const activityConfig = {
  viewing: {
    label: 'Viewing',
    icon: Eye,
    color: 'text-blue-500',
    bgColor: 'bg-blue-500',
  },
  editing: {
    label: 'Editing',
    icon: Edit3,
    color: 'text-green-500',
    bgColor: 'bg-green-500',
  },
  idle: {
    label: 'Idle',
    icon: Clock,
    color: 'text-gray-400',
    bgColor: 'bg-gray-400',
  },
};

/**
 * Compact stacked avatars for use in headers/toolbars
 */
interface StackedAvatarsProps {
  users: ActiveUser[];
  maxVisible?: number;
  size?: 'sm' | 'md';
}

export function StackedAvatars({ users, maxVisible = 4, size = 'md' }: StackedAvatarsProps) {
  const visibleUsers = users.slice(0, maxVisible);
  const hiddenCount = Math.max(0, users.length - maxVisible);

  const sizeClasses = {
    sm: 'h-6 w-6 text-xs',
    md: 'h-8 w-8 text-sm',
  };

  return (
    <div className="flex items-center">
      <div className="flex -space-x-2">
        {visibleUsers.map((user, index) => (
          <Tooltip key={user.id} content={user.name} side="bottom">
            <div
              className={cn(
                'rounded-full flex items-center justify-center text-white font-medium border-2 border-background',
                sizeClasses[size]
              )}
              style={{ backgroundColor: user.color, zIndex: maxVisible - index }}
            >
              {user.avatarUrl ? (
                <img
                  src={user.avatarUrl}
                  alt={user.name}
                  className={cn('rounded-full', sizeClasses[size])}
                />
              ) : (
                user.name.charAt(0).toUpperCase()
              )}
            </div>
          </Tooltip>
        ))}
        {hiddenCount > 0 && (
          <div
            className={cn(
              'rounded-full flex items-center justify-center bg-muted text-muted-foreground font-medium border-2 border-background',
              sizeClasses[size]
            )}
            style={{ zIndex: 0 }}
          >
            +{hiddenCount}
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Alert banner when others are editing the same content
 */
interface EditingAlertProps {
  editingUsers: ActiveUser[];
  className?: string;
}

export function EditingAlert({ editingUsers, className }: EditingAlertProps) {
  if (editingUsers.length === 0) return null;

  const names = editingUsers.map((u) => u.name);
  const displayText =
    names.length === 1
      ? `${names[0]} is currently editing`
      : names.length === 2
        ? `${names[0]} and ${names[1]} are currently editing`
        : `${names[0]} and ${names.length - 1} others are currently editing`;

  return (
    <div
      className={cn(
        'flex items-center space-x-2 px-3 py-2 rounded-md bg-amber-50 border border-amber-200 text-amber-800',
        className
      )}
      role="alert"
    >
      <AlertCircle className="h-4 w-4 shrink-0" />
      <span className="text-sm">{displayText}</span>
      <StackedAvatars users={editingUsers} size="sm" maxVisible={3} />
    </div>
  );
}

export function CollaborationPanel({
  projectId: _projectId,
  activeUsers,
  currentUserId,
  className,
}: CollaborationPanelProps) {
  const otherUsers = activeUsers.filter((user) => user.id !== currentUserId);
  const totalActive = activeUsers.length;

  return (
    <div className={cn('rounded-lg border border-border bg-card p-4', className)}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2">
          <Users className="h-5 w-5 text-muted-foreground" />
          <h3 className="font-semibold">Active Collaborators</h3>
        </div>
        <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded-full">
          {totalActive} online
        </span>
      </div>

      {/* Users List */}
      <div className="space-y-2">
        {otherUsers.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            No other collaborators are currently online.
          </p>
        ) : (
          otherUsers.map((user) => {
            const activity = activityConfig[user.activity];
            const ActivityIcon = activity.icon;

            return (
              <div
                key={user.id}
                className="flex items-center space-x-3 p-2 rounded-md hover:bg-muted/50 transition-colors"
              >
                {/* Avatar with status indicator */}
                <div className="relative">
                  <div
                    className="h-8 w-8 rounded-full flex items-center justify-center text-white text-sm font-medium"
                    style={{ backgroundColor: user.color }}
                  >
                    {user.avatarUrl ? (
                      <img
                        src={user.avatarUrl}
                        alt={user.name}
                        className="h-8 w-8 rounded-full"
                      />
                    ) : (
                      user.name.charAt(0).toUpperCase()
                    )}
                  </div>
                  {/* Activity Status Dot */}
                  <div
                    className={cn(
                      'absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-card',
                      activity.bgColor
                    )}
                    aria-hidden="true"
                  />
                </div>

                {/* Name & Activity */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{user.name}</p>
                  <div className="flex items-center space-x-1">
                    <ActivityIcon className={cn('h-3 w-3', activity.color)} />
                    <span className={cn('text-xs', activity.color)}>
                      {activity.label}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      · {formatRelativeTime(user.lastActiveAt)}
                    </span>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
