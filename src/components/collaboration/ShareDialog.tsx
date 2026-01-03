'use client';

import { useState, useCallback } from 'react';
import { Share2 } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { Modal, Button, Input } from '@/components/ui';
import { cn, isValidEmail } from '@/utils';

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
  const [emailError, setEmailError] = useState<string | undefined>();

  const validateEmail = useCallback((value: string): boolean => {
    if (!value.trim()) {
      setEmailError('Email is required');
      return false;
    }
    if (!isValidEmail(value)) {
      setEmailError('Please enter a valid email address');
      return false;
    }
    setEmailError(undefined);
    return true;
  }, []);

  const handleEmailChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setEmail(value);
    // Clear error on change, validate on blur
    if (emailError && value.trim() && isValidEmail(value)) {
      setEmailError(undefined);
    }
  }, [emailError]);

  const handleEmailBlur = useCallback(() => {
    if (email.trim()) {
      validateEmail(email);
    }
  }, [email, validateEmail]);

  const handleInvite = async () => {
    if (!validateEmail(email)) return;

    setLoading(true);
    try {
      if (onInvite) {
        await onInvite(email, role);
      } else {
        const response = await fetch(`/api/projects/${projectId}/invite`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, role }),
        });

        if (!response.ok) {
          const data = await response.json().catch(() => ({}));
          throw new Error(data.message || 'Failed to send invitation');
        }
      }
      toast.success(`Invitation sent to ${email}`);
      setEmail('');
      setRole('editor');
      setEmailError(undefined);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to send invitation';
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  const isValid = email.trim() && !emailError;

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
            onChange={handleEmailChange}
            onBlur={handleEmailBlur}
            error={emailError}
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
          <Button onClick={handleInvite} disabled={!isValid || loading} loading={loading}>
            Send Invitation
          </Button>
        </div>
      </div>
    </Modal>
  );
}
