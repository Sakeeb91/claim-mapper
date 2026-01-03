'use client';

import { useState, useCallback, ReactElement, cloneElement } from 'react';
import { cn } from '@/utils';

export interface TooltipProps {
  content: React.ReactNode;
  children: ReactElement;
  className?: string;
}

export function Tooltip({ content, children, className }: TooltipProps) {
  const [isVisible, setIsVisible] = useState(false);

  const showTooltip = useCallback(() => setIsVisible(true), []);
  const hideTooltip = useCallback(() => setIsVisible(false), []);

  return (
    <div className="relative inline-block">
      {cloneElement(children, {
        onMouseEnter: showTooltip,
        onMouseLeave: hideTooltip,
        onFocus: showTooltip,
        onBlur: hideTooltip,
      })}
      {isVisible && (
        <div
          className={cn(
            'absolute z-50 px-3 py-2 text-sm bg-popover text-popover-foreground rounded-md shadow-md border border-border whitespace-nowrap',
            className
          )}
        >
          {content}
        </div>
      )}
    </div>
  );
}
