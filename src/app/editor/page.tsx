'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { CollaborativeEditor } from '@/components/collaboration/CollaborativeEditor';
import { EditorSidebar } from '@/components/collaboration/EditorSidebar';

function EditorPageContent() {
  const searchParams = useSearchParams();
  const claimId = searchParams.get('claimId') || 'default-claim-id';

  return (
    <div className="flex h-full">
      <div className="flex-1">
        <CollaborativeEditor claimId={claimId} />
      </div>
      <EditorSidebar />
    </div>
  );
}

export default function EditorPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    }>
      <EditorPageContent />
    </Suspense>
  );
}