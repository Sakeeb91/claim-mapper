'use client';

import { useState } from 'react';
import { Shield, Users } from 'lucide-react';
import { cn } from '@/utils';

export type Permission = 'viewer' | 'editor' | 'admin';

export interface Collaborator {
  id: string;
  email: string;
  name: string;
  avatarUrl?: string;
  role: Permission;
  joinedAt: Date;
}

export interface PermissionsManagerProps {
  projectId: string;
  collaborators: Collaborator[];
  currentUserId: string;
  currentUserRole: Permission;
  onUpdateRole?: (collaboratorId: string, newRole: Permission) => Promise<void>;
  onRemoveCollaborator?: (collaboratorId: string) => Promise<void>;
  className?: string;
}

const roleLabels: Record<Permission, string> = {
  viewer: 'Viewer',
  editor: 'Editor',
  admin: 'Admin',
};

const roleDescriptions: Record<Permission, string> = {
  viewer: 'Can view content only',
  editor: 'Can edit content',
  admin: 'Full access to project',
};

export function PermissionsManager({
  projectId,
  collaborators,
  currentUserId,
  currentUserRole,
  onUpdateRole,
  onRemoveCollaborator,
  className,
}: PermissionsManagerProps) {
  const [loadingId, setLoadingId] = useState<string | null>(null);

  const canManageUsers = currentUserRole === 'admin';

  return (
    <div className={cn('space-y-4', className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Shield className="h-5 w-5 text-muted-foreground" />
          <h3 className="font-semibold">Permissions</h3>
        </div>
        <div className="flex items-center space-x-1 text-sm text-muted-foreground">
          <Users className="h-4 w-4" />
          <span>{collaborators.length} collaborator{collaborators.length !== 1 ? 's' : ''}</span>
        </div>
      </div>

      {/* Collaborators List */}
      <div className="space-y-2">
        {collaborators.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4 text-center">
            No collaborators yet. Share this project to add team members.
          </p>
        ) : (
          collaborators.map((collaborator) => (
            <div
              key={collaborator.id}
              className="flex items-center justify-between rounded-lg border border-border p-3"
            >
              <div className="flex items-center space-x-3">
                {/* Avatar */}
                <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center">
                  {collaborator.avatarUrl ? (
                    <img
                      src={collaborator.avatarUrl}
                      alt={collaborator.name}
                      className="h-8 w-8 rounded-full"
                    />
                  ) : (
                    <span className="text-sm font-medium">
                      {collaborator.name.charAt(0).toUpperCase()}
                    </span>
                  )}
                </div>

                {/* Name & Email */}
                <div>
                  <p className="text-sm font-medium">
                    {collaborator.name}
                    {collaborator.id === currentUserId && (
                      <span className="ml-2 text-xs text-muted-foreground">(You)</span>
                    )}
                  </p>
                  <p className="text-xs text-muted-foreground">{collaborator.email}</p>
                </div>
              </div>

              {/* Role Badge */}
              <div className="flex items-center">
                <span
                  className={cn(
                    'px-2 py-1 text-xs font-medium rounded-full',
                    collaborator.role === 'admin' && 'bg-purple-100 text-purple-700',
                    collaborator.role === 'editor' && 'bg-blue-100 text-blue-700',
                    collaborator.role === 'viewer' && 'bg-gray-100 text-gray-700'
                  )}
                >
                  {roleLabels[collaborator.role]}
                </span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
