'use client';

import { useSearchParams } from 'next/navigation';
import { CollaborativeEditor } from '@/components/collaboration/CollaborativeEditor';
import { EditorSidebar } from '@/components/collaboration/EditorSidebar';

export default function EditorPage() {
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