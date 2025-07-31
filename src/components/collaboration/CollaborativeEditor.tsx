'use client';

import { useState, useEffect } from 'react';
import { Save, Users, MessageSquare, History } from 'lucide-react';

export function CollaborativeEditor() {
  const [content, setContent] = useState('');
  const [collaborators, setCollaborators] = useState([
    { id: '1', name: 'Alice Johnson', color: '#3B82F6', cursor: { line: 5, column: 12 } },
    { id: '2', name: 'Bob Smith', color: '#10B981', cursor: { line: 8, column: 25 } },
  ]);
  const [comments, setComments] = useState([
    {
      id: '1',
      text: 'This claim needs more evidence',
      author: 'Alice Johnson',
      line: 5,
      resolved: false,
    },
  ]);

  const handleSave = () => {
    // TODO: Implement save functionality
    console.log('Saving document...');
  };

  return (
    <div className="flex h-full flex-col">
      {/* Editor Header */}
      <div className="flex items-center justify-between border-b border-border bg-muted/50 p-4">
        <div className="flex items-center space-x-4">
          <h2 className="font-semibold">Collaborative Editor</h2>
          <div className="flex items-center space-x-2">
            <Users className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">
              {collaborators.length} active
            </span>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <button className="flex items-center space-x-2 rounded-md px-3 py-1 text-sm hover:bg-accent">
            <History className="h-4 w-4" />
            <span>Version History</span>
          </button>
          <button 
            onClick={handleSave}
            className="flex items-center space-x-2 rounded-md bg-primary px-3 py-1 text-sm text-primary-foreground hover:bg-primary/90"
          >
            <Save className="h-4 w-4" />
            <span>Save</span>
          </button>
        </div>
      </div>

      {/* Collaborators Bar */}
      <div className="flex items-center space-x-2 border-b border-border p-2">
        <span className="text-sm text-muted-foreground">Active collaborators:</span>
        {collaborators.map((collaborator) => (
          <div key={collaborator.id} className="flex items-center space-x-1">
            <div
              className="h-3 w-3 rounded-full"
              style={{ backgroundColor: collaborator.color }}
            />
            <span className="text-sm">{collaborator.name}</span>
          </div>
        ))}
      </div>

      {/* Editor Content */}
      <div className="flex flex-1">
        <div className="flex-1 p-4">
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Start writing your claims and reasoning here..."
            className="h-full w-full resize-none border-none bg-transparent text-sm focus:outline-none"
            style={{ fontFamily: 'Monaco, Consolas, monospace' }}
          />
        </div>

        {/* Comments Panel */}
        <div className="w-80 border-l border-border bg-muted/50">
          <div className="border-b border-border p-4">
            <h3 className="flex items-center space-x-2 font-semibold">
              <MessageSquare className="h-4 w-4" />
              <span>Comments</span>
            </h3>
          </div>

          <div className="space-y-4 p-4">
            {comments.map((comment) => (
              <div key={comment.id} className="rounded-lg border border-border bg-background p-3">
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-sm font-medium">{comment.author}</span>
                  <span className="text-xs text-muted-foreground">Line {comment.line}</span>
                </div>
                <p className="text-sm">{comment.text}</p>
                <div className="mt-2 flex items-center space-x-2">
                  <button className="text-xs text-primary hover:underline">
                    Reply
                  </button>
                  <button className="text-xs text-muted-foreground hover:underline">
                    Resolve
                  </button>
                </div>
              </div>
            ))}

            <button className="w-full rounded-md border border-dashed border-border p-3 text-sm text-muted-foreground hover:bg-accent">
              Add Comment
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}