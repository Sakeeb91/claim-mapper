'use client';

import { useEffect, useState } from 'react';
import { User } from '@/types';

interface UserCursorProps {
  user: User;
  cursor: {
    x: number;
    y: number;
    elementId?: string;
    selection?: { start: number; end: number };
  };
  elementId: string;
}

export function UserCursor({ user, cursor, elementId }: UserCursorProps) {
  const [visible, setVisible] = useState(true);

  // Auto-hide cursor after inactivity
  useEffect(() => {
    setVisible(true);
    const timer = setTimeout(() => setVisible(false), 3000);
    return () => clearTimeout(timer);
  }, [cursor.x, cursor.y]);

  if (!visible || cursor.elementId !== elementId) {
    return null;
  }

  return (
    <div
      className="pointer-events-none absolute z-50 transition-opacity duration-200"
      style={{
        left: cursor.x,
        top: cursor.y,
        opacity: visible ? 1 : 0,
      }}
    >
      {/* Cursor line */}
      <div
        className="h-5 w-0.5"
        style={{ backgroundColor: user.color || '#3B82F6' }}
      />
      
      {/* User label */}
      <div
        className="absolute -top-8 left-0 whitespace-nowrap rounded px-2 py-1 text-xs text-white shadow-lg"
        style={{ backgroundColor: user.color || '#3B82F6' }}
      >
        {user.name}
      </div>
      
      {/* Selection highlight */}
      {cursor.selection && cursor.selection.start !== cursor.selection.end && (
        <div
          className="absolute top-0 opacity-30"
          style={{
            backgroundColor: user.color || '#3B82F6',
            width: (cursor.selection.end - cursor.selection.start) * 8, // Approximate character width
            height: '20px',
          }}
        />
      )}
    </div>
  );
}