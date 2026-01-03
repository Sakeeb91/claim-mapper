'use client';

import { useState, useCallback, useId, FormEvent } from 'react';
import { Share2, Copy, Check, Link } from 'lucide-react';
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
  const [copied, setCopied] = useState(false);

  // Unique IDs for accessibility
  const emailId = useId();
  const roleId = useId();
  const linkId = useId();

  // Generate shareable link
  const shareUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/projects/${projectId}`
    : `/projects/${projectId}`;

  const handleCopyLink = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      toast.success('Link copied to clipboard');
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      toast.error('Failed to copy link');
    }
  }, [shareUrl]);

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

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (isValid && !loading) {
      handleInvite();
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Share "${projectName}"`}>
      <div className="space-y-4">
        {/* Copy Link Section */}
        <div className="space-y-2" role="group" aria-labelledby={linkId}>
          <div className="flex items-center space-x-2 text-muted-foreground">
            <Link className="h-4 w-4" aria-hidden="true" />
            <span id={linkId} className="text-sm font-medium">Share link</span>
          </div>
          <div className="flex items-center space-x-2">
            <div
              className="flex-1 rounded-md border border-input bg-muted px-3 py-2"
              role="textbox"
              aria-readonly="true"
              aria-label="Shareable project link"
            >
              <span className="text-sm text-muted-foreground truncate block">
                {shareUrl}
              </span>
            </div>
            <Button
              onClick={handleCopyLink}
              variant="outline"
              size="icon"
              className="shrink-0"
              aria-label={copied ? 'Link copied' : 'Copy link to clipboard'}
            >
              {copied ? (
                <Check className="h-4 w-4 text-green-500" aria-hidden="true" />
              ) : (
                <Copy className="h-4 w-4" aria-hidden="true" />
              )}
            </Button>
          </div>
        </div>

        <div className="border-t border-border my-4" role="separator" />

        {/* Invite Section */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="flex items-center space-x-2 text-muted-foreground">
            <Share2 className="h-4 w-4" aria-hidden="true" />
            <span className="text-sm font-medium">Invite by email</span>
          </div>

          <div className="space-y-3">
            <div>
              <label htmlFor={emailId} className="sr-only">
                Email address
              </label>
              <Input
                id={emailId}
                type="email"
                placeholder="Enter email address"
                value={email}
                onChange={handleEmailChange}
                onBlur={handleEmailBlur}
                error={emailError}
                aria-invalid={!!emailError}
                aria-describedby={emailError ? `${emailId}-error` : undefined}
              />
            </div>

            <div>
              <label htmlFor={roleId} className="sr-only">
                Permission level
              </label>
              <select
                id={roleId}
                value={role}
                onChange={(e) => setRole(e.target.value as ShareRole)}
                aria-label="Select permission level"
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
          </div>

          <div className="flex justify-end space-x-2 pt-4">
            <Button type="button" onClick={onClose} variant="outline">
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={!isValid || loading}
              loading={loading}
              aria-busy={loading}
            >
              Send Invitation
            </Button>
          </div>
        </form>
      </div>
    </Modal>
  );
}
