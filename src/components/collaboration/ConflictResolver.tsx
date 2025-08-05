'use client';

import { useState } from 'react';
import { 
  AlertTriangle, 
  X, 
  Users, 
  Merge, 
  RotateCcw,
  CheckCircle,
  Clock,
  User
} from 'lucide-react';
import { ConflictResolution } from '@/types';
import { useAppStore } from '@/store/useAppStore';
import { Modal } from '@/components/ui/Modal';

interface ConflictResolverProps {
  conflicts: ConflictResolution[];
  claimId: string;
  onClose?: () => void;
}

export function ConflictResolver({ conflicts, claimId, onClose }: ConflictResolverProps) {
  const [selectedConflict, setSelectedConflict] = useState<ConflictResolution>(conflicts[0]);
  const [resolutionStrategy, setResolutionStrategy] = useState<'merge' | 'overwrite' | 'manual_review'>('merge');
  const [resolutionNotes, setResolutionNotes] = useState('');
  const [resolving, setResolving] = useState(false);

  const { resolveConflict, user } = useAppStore();

  const handleResolveConflict = async () => {
    if (!selectedConflict) return;
    
    setResolving(true);
    try {
      await resolveConflict(selectedConflict.id, {
        strategy: resolutionStrategy,
        notes: resolutionNotes,
        resolvedBy: user?.id
      });
    } catch (error) {
      console.error('Failed to resolve conflict:', error);
    } finally {
      setResolving(false);
    }
  };

  const getConflictTypeDescription = (type: ConflictResolution['conflictType']) => {
    switch (type) {
      case 'concurrent_edit':
        return 'Multiple users were editing this claim simultaneously';
      case 'version_mismatch':
        return 'The claim was modified while being edited';
      case 'permission_conflict':
        return 'Permission conflicts occurred during editing';
      default:
        return 'Unknown conflict type';
    }
  };

  const getConflictSeverity = (conflict: ConflictResolution) => {
    const age = Date.now() - conflict.createdAt.getTime();
    const ageHours = age / (1000 * 60 * 60);
    
    if (conflict.conflictType === 'permission_conflict') return 'high';
    if (ageHours > 24) return 'high';
    if (ageHours > 1) return 'medium';
    return 'low';
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'high':
        return 'border-red-200 bg-red-50 text-red-800';
      case 'medium':
        return 'border-yellow-200 bg-yellow-50 text-yellow-800';
      default:
        return 'border-blue-200 bg-blue-50 text-blue-800';
    }
  };

  return (
    <Modal isOpen={true} onClose={onClose || (() => {})} size="xl" title="Conflict Resolution">
      <div className="flex h-[550px]">
        {/* Conflicts list */}
        <div className="w-1/3 border-r">
          <div className="border-b p-4">
            <div className="flex items-center space-x-2">
              <AlertTriangle className="h-5 w-5 text-red-500" />
              <h2 className="font-semibold">Active Conflicts</h2>
              <span className="rounded-full bg-red-100 px-2 py-1 text-xs text-red-800">
                {conflicts.length}
              </span>
            </div>
          </div>

          <div className="overflow-y-auto">
            {conflicts.map((conflict) => {
              const severity = getConflictSeverity(conflict);
              return (
                <div
                  key={conflict.id}
                  className={`cursor-pointer border-b p-4 transition-colors ${
                    selectedConflict.id === conflict.id
                      ? 'bg-primary/10 border-primary'
                      : 'hover:bg-accent'
                  }`}
                  onClick={() => setSelectedConflict(conflict)}
                >
                  <div className="flex items-start space-x-3">
                    <AlertTriangle className="h-4 w-4 text-red-500 mt-0.5" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2">
                        <p className="text-sm font-medium">
                          {conflict.conflictType.replace('_', ' ')}
                        </p>
                        <span className={`px-2 py-1 rounded-full text-xs ${getSeverityColor(severity)}`}>
                          {severity}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        {getConflictTypeDescription(conflict.conflictType)}
                      </p>
                      <div className="flex items-center space-x-2 mt-2">
                        <Users className="h-3 w-3" />
                        <span className="text-xs">
                          {conflict.conflictingUsers.length} users involved
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Resolution panel */}
        <div className="flex-1 flex flex-col">
          {selectedConflict && (
            <>
              {/* Header */}
              <div className="border-b p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold capitalize">
                      {selectedConflict.conflictType.replace('_', ' ')} Conflict
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      Created {selectedConflict.createdAt.toLocaleString()}
                    </p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className={`px-3 py-1 rounded-full text-sm ${
                      selectedConflict.status === 'pending'
                        ? 'bg-yellow-100 text-yellow-800'
                        : selectedConflict.status === 'resolved'
                        ? 'bg-green-100 text-green-800'
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {selectedConflict.status}
                    </span>
                  </div>
                </div>
              </div>

              {/* Conflict details */}
              <div className="flex-1 overflow-y-auto p-4">
                <div className="space-y-6">
                  {/* Conflicting users */}
                  <div>
                    <h4 className="font-medium mb-3">Conflicting Users</h4>
                    <div className="space-y-2">
                      {selectedConflict.conflictingUsers.map((user) => (
                        <div key={user.id} className="flex items-center space-x-3 p-3 border rounded-lg">
                          <div
                            className="h-8 w-8 rounded-full"
                            style={{ backgroundColor: user.color || '#3B82F6' }}
                          />
                          <div>
                            <div className="font-medium">{user.name}</div>
                            <div className="text-sm text-muted-foreground">{user.email}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Resolution strategy */}
                  <div>
                    <h4 className="font-medium mb-3">Resolution Strategy</h4>
                    <div className="space-y-3">
                      <label className="flex items-start space-x-3 cursor-pointer">
                        <input
                          type="radio"
                          name="resolution"
                          value="merge"
                          checked={resolutionStrategy === 'merge'}
                          onChange={(e) => setResolutionStrategy(e.target.value as any)}
                          className="mt-1"
                        />
                        <div>
                          <div className="flex items-center space-x-2">
                            <Merge className="h-4 w-4" />
                            <span className="font-medium">Merge Changes</span>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            Automatically merge non-conflicting changes
                          </p>
                        </div>
                      </label>

                      <label className="flex items-start space-x-3 cursor-pointer">
                        <input
                          type="radio"
                          name="resolution"
                          value="overwrite"
                          checked={resolutionStrategy === 'overwrite'}
                          onChange={(e) => setResolutionStrategy(e.target.value as any)}
                          className="mt-1"
                        />
                        <div>
                          <div className="flex items-center space-x-2">
                            <RotateCcw className="h-4 w-4" />
                            <span className="font-medium">Use Latest Version</span>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            Keep the most recent changes and discard others
                          </p>
                        </div>
                      </label>

                      <label className="flex items-start space-x-3 cursor-pointer">
                        <input
                          type="radio"
                          name="resolution"
                          value="manual_review"
                          checked={resolutionStrategy === 'manual_review'}
                          onChange={(e) => setResolutionStrategy(e.target.value as any)}
                          className="mt-1"
                        />
                        <div>
                          <div className="flex items-center space-x-2">
                            <User className="h-4 w-4" />
                            <span className="font-medium">Manual Review</span>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            Escalate to manual review by project admin
                          </p>
                        </div>
                      </label>
                    </div>
                  </div>

                  {/* Resolution notes */}
                  <div>
                    <h4 className="font-medium mb-3">Resolution Notes</h4>
                    <textarea
                      value={resolutionNotes}
                      onChange={(e) => setResolutionNotes(e.target.value)}
                      placeholder="Add notes about the resolution decision..."
                      className="w-full rounded-lg border border-border p-3 text-sm resize-none"
                      rows={4}
                    />
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="border-t p-4">
                <div className="flex justify-end space-x-3">
                  <button
                    onClick={() => {
                      // Close conflict resolver
                      console.log('Cancel resolution');
                    }}
                    className="rounded-lg border px-4 py-2 text-sm hover:bg-accent"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleResolveConflict}
                    disabled={resolving}
                    className="flex items-center space-x-2 rounded-lg bg-primary px-4 py-2 text-sm text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
                  >
                    <CheckCircle className="h-4 w-4" />
                    <span>{resolving ? 'Resolving...' : 'Resolve Conflict'}</span>
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </Modal>
  );
}