'use client';

import { useState, useCallback } from 'react';
import { Shield, Users, ChevronDown, Trash2, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui';
import { toast } from 'react-hot-toast';
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
  const [confirmRemoveId, setConfirmRemoveId] = useState<string | null>(null);

  const canManageUsers = currentUserRole === 'admin';

  const handleRoleChange = useCallback(
    async (collaboratorId: string, newRole: Permission) => {
      if (!onUpdateRole) return;

      setLoadingId(collaboratorId);
      try {
        await onUpdateRole(collaboratorId, newRole);
        toast.success('Role updated successfully');
      } catch (error) {
        toast.error('Failed to update role');
      } finally {
        setLoadingId(null);
      }
    },
    [onUpdateRole]
  );

  const handleRemoveClick = useCallback((collaboratorId: string) => {
    setConfirmRemoveId(collaboratorId);
  }, []);

  const handleConfirmRemove = useCallback(
    async (collaboratorId: string) => {
      if (!onRemoveCollaborator) return;

      setLoadingId(collaboratorId);
      try {
        await onRemoveCollaborator(collaboratorId);
        toast.success('Collaborator removed');
        setConfirmRemoveId(null);
      } catch (error) {
        toast.error('Failed to remove collaborator');
      } finally {
        setLoadingId(null);
      }
    },
    [onRemoveCollaborator]
  );

  const handleCancelRemove = useCallback(() => {
    setConfirmRemoveId(null);
  }, []);

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

              {/* Role Selector or Badge + Remove */}
              <div className="flex items-center space-x-2">
                {canManageUsers && collaborator.id !== currentUserId ? (
                  <>
                    {/* Role Dropdown */}
                    <div className="relative">
                      <select
                        value={collaborator.role}
                        onChange={(e) => handleRoleChange(collaborator.id, e.target.value as Permission)}
                        disabled={loadingId === collaborator.id || confirmRemoveId === collaborator.id}
                        aria-label={`Change role for ${collaborator.name}`}
                        className={cn(
                          'appearance-none rounded-md border border-input bg-background px-3 py-1 pr-8 text-xs font-medium',
                          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                          'disabled:opacity-50 disabled:cursor-not-allowed',
                          loadingId === collaborator.id && 'animate-pulse'
                        )}
                      >
                        <option value="viewer">{roleLabels.viewer}</option>
                        <option value="editor">{roleLabels.editor}</option>
                        <option value="admin">{roleLabels.admin}</option>
                      </select>
                      <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 h-3 w-3 pointer-events-none text-muted-foreground" />
                    </div>

                    {/* Remove Button / Confirmation */}
                    {confirmRemoveId === collaborator.id ? (
                      <div className="flex items-center space-x-1">
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => handleConfirmRemove(collaborator.id)}
                          disabled={loadingId === collaborator.id}
                          loading={loadingId === collaborator.id}
                          aria-label="Confirm removal"
                        >
                          Remove
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={handleCancelRemove}
                          disabled={loadingId === collaborator.id}
                          aria-label="Cancel removal"
                        >
                          Cancel
                        </Button>
                      </div>
                    ) : (
                      <button
                        onClick={() => handleRemoveClick(collaborator.id)}
                        disabled={loadingId === collaborator.id}
                        aria-label={`Remove ${collaborator.name} from project`}
                        className={cn(
                          'p-1 rounded-md text-muted-foreground hover:text-red-500 hover:bg-red-50 transition-colors',
                          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                          'disabled:opacity-50 disabled:cursor-not-allowed'
                        )}
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </>
                ) : (
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
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
