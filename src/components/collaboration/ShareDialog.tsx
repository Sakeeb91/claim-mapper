'use client';

import { useState } from 'react';
import { Share2, X } from 'lucide-react';
import { Modal, Button, Input } from '@/components/ui';
import { cn } from '@/utils';

export type ShareRole = 'viewer' | 'editor' | 'admin';

export interface ShareDialogProps {
  isOpen: boolean;
  onClose: () => void;
  projectId: string;
  projectName: string;
  onInvite?: (email: string, role: ShareRole) => Promise<void>;
}

export function ShareDialog({
  isOpen,
  onClose,
  projectId,
  projectName,
  onInvite,
}: ShareDialogProps) {
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<ShareRole>('editor');
  const [loading, setLoading] = useState(false);

  const handleInvite = async () => {
    if (!email.trim()) return;

    setLoading(true);
    try {
      if (onInvite) {
        await onInvite(email, role);
      } else {
        await fetch(`/api/projects/${projectId}/invite`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, role }),
        });
      }
      setEmail('');
      setRole('editor');
    } catch (error) {
      console.error('Failed to send invitation', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Share "${projectName}"`}>
      <div className="space-y-4">
        <div className="flex items-center space-x-2 text-muted-foreground">
          <Share2 className="h-4 w-4" />
          <span className="text-sm">Invite collaborators to this project</span>
        </div>

        <div className="space-y-3">
          <Input
            type="email"
            placeholder="Enter email address"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />

          <select
            value={role}
            onChange={(e) => setRole(e.target.value as ShareRole)}
            className={cn(
              'w-full rounded-md border border-input bg-background px-3 py-2 text-sm',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'
            )}
          >
            <option value="viewer">Viewer - Can view only</option>
            <option value="editor">Editor - Can edit content</option>
            <option value="admin">Admin - Full access</option>
          </select>
        </div>

        <div className="flex justify-end space-x-2 pt-4">
          <Button onClick={onClose} variant="outline">
            Cancel
          </Button>
          <Button onClick={handleInvite} disabled={!email.trim() || loading} loading={loading}>
            Send Invitation
          </Button>
        </div>
      </div>
    </Modal>
  );
}
