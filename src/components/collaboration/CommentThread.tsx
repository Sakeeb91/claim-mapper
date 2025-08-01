'use client';

import { useState } from 'react';
import { 
  MessageSquare, 
  Reply, 
  Check, 
  MoreHorizontal,
  ThumbsUp,
  ThumbsDown,
  AlertCircle,
  CheckCircle
} from 'lucide-react';
import { Comment } from '@/types';
import { useAppStore } from '@/store/useAppStore';
import { formatDistanceToNow } from 'date-fns';

interface CommentThreadProps {
  comment: Comment;
  claimId: string;
  selection: { start: number; end: number };
}

export function CommentThread({ comment, claimId, selection }: CommentThreadProps) {
  const [showReplies, setShowReplies] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [showReplyInput, setShowReplyInput] = useState(false);
  
  const { user, updateComment, addComment, resolveComment } = useAppStore();

  const handleReply = () => {
    if (!replyText.trim() || !user) return;
    
    const reply: Comment = {
      id: `reply_${Date.now()}`,
      text: replyText.trim(),
      author: user,
      targetId: claimId,
      targetType: 'claim',
      createdAt: new Date(),
      resolved: false,
      replies: [],
      reactions: [],
      thread: comment.id
    };
    
    addComment(reply);
    setReplyText('');
    setShowReplyInput(false);
  };

  const handleResolve = () => {
    resolveComment(comment.id);
  };

  const handleReaction = (type: 'like' | 'dislike' | 'agree' | 'disagree') => {
    if (!user) return;
    
    const existingReaction = comment.reactions.find(r => r.userId === user.id);
    let newReactions = [...comment.reactions];
    
    if (existingReaction) {
      if (existingReaction.type === type) {
        // Remove reaction if same type
        newReactions = newReactions.filter(r => r.userId !== user.id);
      } else {
        // Update reaction type
        newReactions = newReactions.map(r => 
          r.userId === user.id ? { ...r, type } : r
        );
      }
    } else {
      // Add new reaction
      newReactions.push({
        id: `reaction_${Date.now()}`,
        userId: user.id,
        type,
        createdAt: new Date()
      });
    }
    
    updateComment(comment.id, { reactions: newReactions });
  };

  const reactionCounts = comment.reactions.reduce((acc, reaction) => {
    acc[reaction.type] = (acc[reaction.type] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const userReaction = user ? comment.reactions.find(r => r.userId === user.id) : null;

  return (
    <div className={`rounded-lg border p-3 ${
      comment.resolved 
        ? 'border-green-200 bg-green-50' 
        : 'border-border bg-background'
    }`}>
      {/* Comment header */}
      <div className="mb-2 flex items-start justify-between">
        <div className="flex items-center space-x-2">
          <div
            className="h-6 w-6 rounded-full"
            style={{ backgroundColor: comment.author.color || '#3B82F6' }}
          />
          <div>
            <span className="text-sm font-medium">{comment.author.name}</span>
            <span className="ml-2 text-xs text-muted-foreground">
              {formatDistanceToNow(comment.createdAt, { addSuffix: true })}
            </span>
          </div>
        </div>
        
        <div className="flex items-center space-x-1">
          {comment.resolved && (
            <CheckCircle className="h-4 w-4 text-green-600" />
          )}
          <button className="rounded p-1 text-muted-foreground hover:bg-accent">
            <MoreHorizontal className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Comment text */}
      <p className="text-sm text-foreground mb-3">{comment.text}</p>

      {/* Reactions */}
      <div className="flex items-center space-x-2 mb-3">
        <button
          onClick={() => handleReaction('like')}
          className={`flex items-center space-x-1 rounded px-2 py-1 text-xs ${
            userReaction?.type === 'like'
              ? 'bg-blue-100 text-blue-700'
              : 'text-muted-foreground hover:bg-accent'
          }`}
        >
          <ThumbsUp className="h-3 w-3" />
          {reactionCounts.like && <span>{reactionCounts.like}</span>}
        </button>
        
        <button
          onClick={() => handleReaction('dislike')}
          className={`flex items-center space-x-1 rounded px-2 py-1 text-xs ${
            userReaction?.type === 'dislike'
              ? 'bg-red-100 text-red-700'
              : 'text-muted-foreground hover:bg-accent'
          }`}
        >
          <ThumbsDown className="h-3 w-3" />
          {reactionCounts.dislike && <span>{reactionCounts.dislike}</span>}
        </button>
        
        <button
          onClick={() => handleReaction('agree')}
          className={`flex items-center space-x-1 rounded px-2 py-1 text-xs ${
            userReaction?.type === 'agree'
              ? 'bg-green-100 text-green-700'
              : 'text-muted-foreground hover:bg-accent'
          }`}
        >
          <CheckCircle className="h-3 w-3" />
          {reactionCounts.agree && <span>{reactionCounts.agree}</span>}
        </button>
        
        <button
          onClick={() => handleReaction('disagree')}
          className={`flex items-center space-x-1 rounded px-2 py-1 text-xs ${
            userReaction?.type === 'disagree'
              ? 'bg-orange-100 text-orange-700'
              : 'text-muted-foreground hover:bg-accent'
          }`}
        >
          <AlertCircle className="h-3 w-3" />
          {reactionCounts.disagree && <span>{reactionCounts.disagree}</span>}
        </button>
      </div>

      {/* Actions */}
      <div className="flex items-center space-x-2">
        <button
          onClick={() => setShowReplyInput(!showReplyInput)}
          className="flex items-center space-x-1 text-xs text-primary hover:underline"
        >
          <Reply className="h-3 w-3" />
          <span>Reply</span>
        </button>
        
        {!comment.resolved && (
          <button
            onClick={handleResolve}
            className="flex items-center space-x-1 text-xs text-green-600 hover:underline"
          >
            <Check className="h-3 w-3" />
            <span>Resolve</span>
          </button>
        )}
        
        {comment.replies.length > 0 && (
          <button
            onClick={() => setShowReplies(!showReplies)}
            className="text-xs text-muted-foreground hover:underline"
          >
            {showReplies ? 'Hide' : 'Show'} {comment.replies.length} replies
          </button>
        )}
      </div>

      {/* Reply input */}
      {showReplyInput && (
        <div className="mt-3 space-y-2">
          <textarea
            value={replyText}
            onChange={(e) => setReplyText(e.target.value)}
            placeholder="Write a reply..."
            className="w-full rounded border border-border p-2 text-sm resize-none"
            rows={2}
          />
          <div className="flex justify-end space-x-2">
            <button
              onClick={() => {
                setShowReplyInput(false);
                setReplyText('');
              }}
              className="rounded px-3 py-1 text-xs text-muted-foreground hover:bg-accent"
            >
              Cancel
            </button>
            <button
              onClick={handleReply}
              disabled={!replyText.trim()}
              className="rounded bg-primary px-3 py-1 text-xs text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
            >
              Reply
            </button>
          </div>
        </div>
      )}

      {/* Replies */}
      {showReplies && comment.replies.length > 0 && (
        <div className="mt-3 ml-6 space-y-2 border-l-2 border-muted pl-3">
          {comment.replies.map((reply) => (
            <CommentThread
              key={reply.id}
              comment={reply}
              claimId={claimId}
              selection={selection}
            />
          ))}
        </div>
      )}
    </div>
  );
}