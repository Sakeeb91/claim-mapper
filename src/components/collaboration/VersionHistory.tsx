'use client';

import { useState } from 'react';
import { X, Clock, GitBranch, User, ChevronRight, Eye, RotateCcw } from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';
import { ChangeEvent } from '@/types';
import { Modal } from '@/components/ui/Modal';
import { formatDistanceToNow } from 'date-fns';

interface VersionHistoryProps {
  claimId: string;
  onClose: () => void;
}

export function VersionHistory({ claimId, onClose }: VersionHistoryProps) {
  const [selectedVersion, setSelectedVersion] = useState<ChangeEvent | null>(null);
  const [showDiff, setShowDiff] = useState(false);
  
  const { changeHistory } = useAppStore();
  
  // Filter changes for this claim
  const claimChanges = changeHistory
    .filter(change => change.entityId === claimId && change.entityType === 'claim')
    .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

  const handleViewVersion = (change: ChangeEvent) => {
    setSelectedVersion(change);
    setShowDiff(false);
  };

  const handleViewDiff = (change: ChangeEvent) => {
    setSelectedVersion(change);
    setShowDiff(true);
  };

  const handleRevertToVersion = (change: ChangeEvent) => {
    // TODO: Implement version revert
    console.log('Reverting to version:', change.id);
  };

  const getChangeIcon = (type: ChangeEvent['type']) => {
    switch (type) {
      case 'create':
        return <div className="h-3 w-3 rounded-full bg-green-500" />;
      case 'update':
        return <div className="h-3 w-3 rounded-full bg-blue-500" />;
      case 'delete':
        return <div className="h-3 w-3 rounded-full bg-red-500" />;
      default:
        return <div className="h-3 w-3 rounded-full bg-gray-500" />;
    }
  };

  const getChangeDescription = (change: ChangeEvent) => {
    switch (change.type) {
      case 'create':
        return 'Created claim';
      case 'update':
        return 'Updated claim';
      case 'delete':
        return 'Deleted claim';
      default:
        return 'Modified claim';
    }
  };

  const renderDiff = (oldText: string, newText: string) => {
    // Simple diff rendering - in production, use a proper diff library
    const oldLines = oldText.split('\n');
    const newLines = newText.split('\n');
    const maxLines = Math.max(oldLines.length, newLines.length);
    
    return (
      <div className="grid grid-cols-2 gap-4 font-mono text-sm">
        <div>
          <h4 className="mb-2 font-semibold">Previous Version</h4>
          <div className="rounded border bg-red-50 p-3">
            {oldLines.map((line, i) => (
              <div key={i} className="whitespace-pre-wrap">
                <span className="mr-2 text-red-400">-</span>
                {line}
              </div>
            ))}
          </div>
        </div>
        <div>
          <h4 className="mb-2 font-semibold">Current Version</h4>
          <div className="rounded border bg-green-50 p-3">
            {newLines.map((line, i) => (
              <div key={i} className="whitespace-pre-wrap">
                <span className="mr-2 text-green-400">+</span>
                {line}
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  return (
    <Modal onClose={onClose} className="max-w-6xl">
      <div className="flex h-[700px]">
        {/* Sidebar - Version List */}
        <div className="w-1/3 border-r">
          {/* Header */}
          <div className="flex items-center justify-between border-b p-4">
            <div className="flex items-center space-x-2">
              <Clock className="h-5 w-5" />
              <h2 className="font-semibold">Version History</h2>
            </div>
            <button
              onClick={onClose}
              className="rounded-lg p-1 hover:bg-accent"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Version list */}
          <div className="flex-1 overflow-y-auto">
            {claimChanges.length > 0 ? (
              <div className="p-4 space-y-3">
                {claimChanges.map((change, index) => (
                  <div
                    key={change.id}
                    className={`rounded-lg border p-3 cursor-pointer transition-colors ${
                      selectedVersion?.id === change.id
                        ? 'border-primary bg-primary/10'
                        : 'hover:bg-accent'
                    }`}
                    onClick={() => handleViewVersion(change)}
                  >
                    <div className="flex items-start space-x-3">
                      {getChangeIcon(change.type)}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-medium truncate">
                            {getChangeDescription(change)}
                          </p>
                          {index === 0 && (
                            <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full">
                              Current
                            </span>
                          )}
                        </div>
                        <div className="flex items-center space-x-2 mt-1">
                          <div
                            className="h-4 w-4 rounded-full"
                            style={{ backgroundColor: change.user.color || '#3B82F6' }}
                          />
                          <span className="text-xs text-muted-foreground">
                            {change.user.name}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          {formatDistanceToNow(change.timestamp, { addSuffix: true })}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                <GitBranch className="h-12 w-12 mb-4" />
                <p>No version history available</p>
              </div>
            )}
          </div>
        </div>

        {/* Main content */}
        <div className="flex-1 flex flex-col">
          {selectedVersion ? (
            <>
              {/* Version header */}
              <div className="border-b p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold">
                      {getChangeDescription(selectedVersion)}
                    </h3>
                    <div className="flex items-center space-x-2 mt-1">
                      <div
                        className="h-5 w-5 rounded-full"
                        style={{ backgroundColor: selectedVersion.user.color || '#3B82F6' }}
                      />
                      <span className="text-sm">{selectedVersion.user.name}</span>
                      <span className="text-sm text-muted-foreground">
                        {formatDistanceToNow(selectedVersion.timestamp, { addSuffix: true })}
                      </span>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => setShowDiff(!showDiff)}
                      className="flex items-center space-x-2 rounded-lg border px-3 py-2 text-sm hover:bg-accent"
                    >
                      <Eye className="h-4 w-4" />
                      <span>{showDiff ? 'View Content' : 'View Diff'}</span>
                    </button>
                    
                    <button
                      onClick={() => handleRevertToVersion(selectedVersion)}
                      className="flex items-center space-x-2 rounded-lg bg-primary px-3 py-2 text-sm text-primary-foreground hover:bg-primary/90"
                    >
                      <RotateCcw className="h-4 w-4" />
                      <span>Revert to This</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Version content */}
              <div className="flex-1 overflow-y-auto p-4">
                {showDiff ? (
                  <div>
                    <h4 className="mb-4 text-lg font-medium">Changes Made</h4>
                    {selectedVersion.changes.text && (
                      renderDiff(
                        selectedVersion.changes.previousText || '',
                        selectedVersion.changes.text || ''
                      )
                    )}
                    
                    {/* Other changes */}
                    <div className="mt-6">
                      <h4 className="mb-2 font-medium">Additional Changes</h4>
                      <div className="space-y-2">
                        {Object.entries(selectedVersion.changes)
                          .filter(([key]) => key !== 'text' && key !== 'previousText')
                          .map(([key, value]) => (
                            <div key={key} className="flex items-center space-x-2 text-sm">
                              <span className="font-medium capitalize">{key}:</span>
                              <span>{String(value)}</span>
                            </div>
                          ))}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div>
                    <h4 className="mb-4 text-lg font-medium">Content at This Version</h4>
                    <div className="rounded-lg border bg-muted/50 p-4">
                      <pre className="whitespace-pre-wrap text-sm">
                        {selectedVersion.changes.text || 'No content available'}
                      </pre>
                    </div>
                    
                    {/* Metadata */}
                    <div className="mt-6">
                      <h4 className="mb-2 font-medium">Metadata</h4>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="font-medium">Change ID:</span>
                          <span className="ml-2 font-mono">{selectedVersion.id}</span>
                        </div>
                        <div>
                          <span className="font-medium">Session:</span>
                          <span className="ml-2">{selectedVersion.sessionId || 'N/A'}</span>
                        </div>
                        <div>
                          <span className="font-medium">Type:</span>
                          <span className="ml-2 capitalize">{selectedVersion.type}</span>
                        </div>
                        <div>
                          <span className="font-medium">Timestamp:</span>
                          <span className="ml-2">{selectedVersion.timestamp.toISOString()}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
              <ChevronRight className="h-12 w-12 mb-4" />
              <p>Select a version to view details</p>
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
}