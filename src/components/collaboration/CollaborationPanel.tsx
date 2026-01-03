'use client';

import { Users } from 'lucide-react';
import { cn } from '@/utils';

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

export function CollaborationPanel({
  projectId,
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
          otherUsers.map((user) => (
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
              </div>

              {/* Name */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{user.name}</p>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
