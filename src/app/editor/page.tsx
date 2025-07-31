'use client';

import { CollaborativeEditor } from '@/components/collaboration/CollaborativeEditor';
import { EditorSidebar } from '@/components/collaboration/EditorSidebar';

export default function EditorPage() {
  return (
    <div className="flex h-full">
      <div className="flex-1">
        <CollaborativeEditor />
      </div>
      <EditorSidebar />
    </div>
  );
}