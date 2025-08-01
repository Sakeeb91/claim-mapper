'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { 
  Save, 
  Users, 
  MessageSquare, 
  History, 
  Share2, 
  Settings, 
  AlertTriangle,
  CheckCircle,
  Clock,
  Eye
} from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';
import { Comment, UserPresence, ConflictResolution } from '@/types';
import { UserCursor } from './UserCursor';
import { CommentThread } from './CommentThread';
import { ValidationPanel } from './ValidationPanel';
import { VersionHistory } from './VersionHistory';
import { ConflictResolver } from './ConflictResolver';
import { toast } from 'react-hot-toast';

interface CollaborativeEditorProps {
  claimId: string;
  initialContent?: string;
  readOnly?: boolean;
  onSave?: (content: string) => void;
  onSelectionChange?: (selection: { start: number; end: number }) => void;
}

export function CollaborativeEditor({ 
  claimId, 
  initialContent = '', 
  readOnly = false,
  onSave,
  onSelectionChange 
}: CollaborativeEditorProps) {
  const [content, setContent] = useState(initialContent);
  const [selection, setSelection] = useState({ start: 0, end: 0 });
  const [showVersionHistory, setShowVersionHistory] = useState(false);
  const [showValidation, setShowValidation] = useState(false);
  const editorRef = useRef<HTMLTextAreaElement>(null);
  const lastChangeRef = useRef<Date>(new Date());
  
  const {
    activeUsers,
    comments,
    conflicts,
    editingClaim,
    socket,
    isConnected,
    user,
    startEditingClaim,
    stopEditingClaim,
    addComment,
    updateUserPresence,
    validationResults
  } = useAppStore();

  const handleSave = useCallback(async () => {
    if (!content.trim()) return;
    
    try {
      await stopEditingClaim(claimId, true);
      onSave?.(content);
      toast.success('Changes saved successfully');
    } catch (error) {
      toast.error('Failed to save changes');
      console.error('Save error:', error);
    }
  }, [content, claimId, onSave, stopEditingClaim]);
  
  const handleContentChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newContent = e.target.value;
    setContent(newContent);
    lastChangeRef.current = new Date();
    
    // Emit real-time updates
    if (socket && editingClaim === claimId) {
      socket.emit('claim_edit_update', {
        claimId,
        projectId: 'current-project',
        changes: { text: newContent },
        cursorPosition: e.target.selectionStart
      });
    }
  }, [socket, editingClaim, claimId]);
  
  const handleSelectionChange = useCallback(() => {
    if (!editorRef.current) return;
    
    const { selectionStart, selectionEnd } = editorRef.current;
    const newSelection = { start: selectionStart, end: selectionEnd };
    setSelection(newSelection);
    onSelectionChange?.(newSelection);
    
    // Update cursor position for other users
    if (socket && user) {
      const rect = editorRef.current.getBoundingClientRect();
      socket.emit('cursor_update', {
        projectId: 'current-project',
        elementId: claimId,
        position: {
          x: rect.left + (selectionStart * 8), // Approximate character width
          y: rect.top + (Math.floor(selectionStart / 80) * 20) // Approximate line height
        },
        selection: newSelection
      });
    }
  }, [socket, user, claimId, onSelectionChange]);
  
  const handleStartEditing = useCallback(async () => {
    if (readOnly || editingClaim) return;
    
    try {
      await startEditingClaim(claimId);
      toast.success('Started editing');
    } catch (error) {
      toast.error('Unable to start editing');
    }
  }, [claimId, editingClaim, readOnly, startEditingClaim]);
  
  const handleStopEditing = useCallback(async (save = true) => {
    if (editingClaim !== claimId) return;
    
    try {
      if (save) {
        await handleSave();
      } else {
        await stopEditingClaim(claimId, false);
        setContent(initialContent); // Revert changes
      }
    } catch (error) {
      toast.error('Error stopping edit session');
    }
  }, [claimId, editingClaim, handleSave, stopEditingClaim, initialContent]);
  
  // Auto-save functionality
  useEffect(() => {
    if (editingClaim !== claimId) return;
    
    const autoSaveInterval = setInterval(() => {
      const timeSinceLastChange = Date.now() - lastChangeRef.current.getTime();
      if (timeSinceLastChange > 2000 && content !== initialContent) {
        handleSave();
      }
    }, 5000);
    
    return () => clearInterval(autoSaveInterval);
  }, [editingClaim, claimId, content, initialContent, handleSave]);
  
  // Initialize content
  useEffect(() => {
    setContent(initialContent);
  }, [initialContent]);
  
  const isEditing = editingClaim === claimId;
  const isCurrentUserEditing = isEditing && user;
  const otherEditors = activeUsers.filter(
    u => u.activity === 'editing' && u.userId !== user?.id
  );
  const claimComments = comments.filter(c => c.targetId === claimId);
  const claimConflicts = conflicts.filter(c => c.entityId === claimId && c.status === 'pending');
  const validationResult = validationResults[claimId];

  return (
    <div className="flex h-full flex-col">
      {/* Editor Header */}
      <div className="flex items-center justify-between border-b border-border bg-muted/50 p-4">
        <div className="flex items-center space-x-4">
          <h2 className="font-semibold">Collaborative Editor</h2>
          <div className="flex items-center space-x-2">
            <div className="flex items-center space-x-1">
              {isConnected ? (
                <div className="h-2 w-2 rounded-full bg-green-500" />
              ) : (
                <div className="h-2 w-2 rounded-full bg-red-500" />
              )}
              <span className="text-xs text-muted-foreground">
                {isConnected ? 'Connected' : 'Disconnected'}
              </span>
            </div>
            <Users className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">
              {activeUsers.length} active
            </span>
          </div>
          
          {/* Status indicators */}
          <div className="flex items-center space-x-2">
            {isCurrentUserEditing && (
              <div className="flex items-center space-x-1 text-xs text-blue-600">
                <Settings className="h-3 w-3" />
                <span>Editing</span>
              </div>
            )}
            {otherEditors.length > 0 && (
              <div className="flex items-center space-x-1 text-xs text-orange-600">
                <AlertTriangle className="h-3 w-3" />
                <span>{otherEditors.length} others editing</span>
              </div>
            )}
            {claimConflicts.length > 0 && (
              <div className="flex items-center space-x-1 text-xs text-red-600">
                <AlertTriangle className="h-3 w-3" />
                <span>{claimConflicts.length} conflicts</span>
              </div>
            )}
            {validationResult && (
              <div className="flex items-center space-x-1 text-xs text-green-600">
                <CheckCircle className="h-3 w-3" />
                <span>Score: {Math.round(validationResult.overallScore)}</span>
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <button 
            onClick={() => setShowVersionHistory(true)}
            className="flex items-center space-x-2 rounded-md px-3 py-1 text-sm hover:bg-accent"
          >
            <History className="h-4 w-4" />
            <span>History</span>
          </button>
          
          <button 
            onClick={() => setShowValidation(true)}
            className="flex items-center space-x-2 rounded-md px-3 py-1 text-sm hover:bg-accent"
          >
            <CheckCircle className="h-4 w-4" />
            <span>Validate</span>
          </button>
          
          {!isCurrentUserEditing && !readOnly ? (
            <button 
              onClick={handleStartEditing}
              className="flex items-center space-x-2 rounded-md bg-blue-600 px-3 py-1 text-sm text-white hover:bg-blue-700"
              disabled={otherEditors.length > 0}
            >
              <Settings className="h-4 w-4" />
              <span>Start Editing</span>
            </button>
          ) : isCurrentUserEditing ? (
            <div className="flex items-center space-x-2">
              <button 
                onClick={() => handleStopEditing(false)}
                className="flex items-center space-x-2 rounded-md px-3 py-1 text-sm hover:bg-accent"
              >
                <span>Cancel</span>
              </button>
              <button 
                onClick={handleSave}
                className="flex items-center space-x-2 rounded-md bg-primary px-3 py-1 text-sm text-primary-foreground hover:bg-primary/90"
              >
                <Save className="h-4 w-4" />
                <span>Save</span>
              </button>
            </div>
          ) : (
            <div className="flex items-center space-x-2 text-sm text-muted-foreground">
              <Eye className="h-4 w-4" />
              <span>Read Only</span>
            </div>
          )}
        </div>
      </div>

      {/* Active Users Bar */}
      <div className="flex items-center justify-between border-b border-border p-2">
        <div className="flex items-center space-x-2">
          <span className="text-sm text-muted-foreground">Active users:</span>
          {activeUsers.slice(0, 5).map((userPresence) => (
            <div key={userPresence.userId} className="flex items-center space-x-1">
              <div
                className="h-3 w-3 rounded-full"
                style={{ backgroundColor: userPresence.user.color || '#3B82F6' }}
              />
              <span className="text-sm">{userPresence.user.name}</span>
              <span className="text-xs text-muted-foreground">
                ({userPresence.activity})
              </span>
            </div>
          ))}
          {activeUsers.length > 5 && (
            <span className="text-sm text-muted-foreground">
              +{activeUsers.length - 5} more
            </span>
          )}
        </div>
        
        {claimConflicts.length > 0 && (
          <div className="flex items-center space-x-2">
            <AlertTriangle className="h-4 w-4 text-red-500" />
            <span className="text-sm text-red-600">
              {claimConflicts.length} unresolved conflicts
            </span>
          </div>
        )}
      </div>

      {/* Editor Content */}
      <div className="flex flex-1">
        <div className="relative flex-1">
          {/* Live cursors overlay */}
          {activeUsers
            .filter(u => u.cursor && u.userId !== user?.id)
            .map((userPresence) => (
              <UserCursor
                key={userPresence.userId}
                user={userPresence.user}
                cursor={userPresence.cursor!}
                elementId={claimId}
              />
            ))}
          
          <div className="p-4">
            <textarea
              ref={editorRef}
              value={content}
              onChange={handleContentChange}
              onSelect={handleSelectionChange}
              onFocus={handleSelectionChange}
              placeholder="Start writing your claims and reasoning here..."
              className={`h-full w-full resize-none border-none bg-transparent text-sm focus:outline-none ${
                !isCurrentUserEditing && !readOnly ? 'cursor-pointer' : ''
              } ${
                readOnly || (otherEditors.length > 0 && !isCurrentUserEditing) 
                  ? 'cursor-not-allowed opacity-60' : ''
              }`}
              style={{ 
                fontFamily: 'Monaco, Consolas, monospace',
                minHeight: '400px'
              }}
              readOnly={readOnly || (otherEditors.length > 0 && !isCurrentUserEditing)}
              onClick={!isCurrentUserEditing && !readOnly ? handleStartEditing : undefined}
            />
          </div>
        </div>

        {/* Comments Panel */}
        <div className="w-80 border-l border-border bg-muted/50">
          <div className="border-b border-border p-4">
            <h3 className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <MessageSquare className="h-4 w-4" />
                <span className="font-semibold">Comments</span>
                <span className="rounded-full bg-muted px-2 py-1 text-xs">
                  {claimComments.length}
                </span>
              </div>
            </h3>
          </div>

          <div className="flex-1 overflow-y-auto p-4">
            <div className="space-y-4">
              {claimComments.map((comment) => (
                <CommentThread
                  key={comment.id}
                  comment={comment}
                  claimId={claimId}
                  selection={selection}
                />
              ))}

              <button 
                className="w-full rounded-md border border-dashed border-border p-3 text-sm text-muted-foreground hover:bg-accent"
                onClick={() => {
                  // TODO: Open comment creation dialog
                  console.log('Add comment clicked');
                }}
              >
                Add Comment
              </button>
            </div>
          </div>
        </div>
      </div>
      
      {/* Modals */}
      {showVersionHistory && (
        <VersionHistory
          claimId={claimId}
          onClose={() => setShowVersionHistory(false)}
        />
      )}
      
      {showValidation && (
        <ValidationPanel
          claimId={claimId}
          onClose={() => setShowValidation(false)}
        />
      )}
      
      {claimConflicts.length > 0 && (
        <ConflictResolver
          conflicts={claimConflicts}
          claimId={claimId}
        />
      )}
    </div>
  );
}