'use client';

import { useState, useCallback, useId, ReactElement, cloneElement } from 'react';
import { cn } from '@/utils';

export type TooltipSide = 'top' | 'bottom' | 'left' | 'right';
export type TooltipAlign = 'start' | 'center' | 'end';

export interface TooltipProps {
  content: React.ReactNode;
  children: ReactElement;
  side?: TooltipSide;
  align?: TooltipAlign;
  sideOffset?: number;
  className?: string;
  /** Optional delay before showing tooltip (ms) */
  delayDuration?: number;
}

const sideStyles: Record<TooltipSide, string> = {
  top: 'bottom-full mb-2',
  bottom: 'top-full mt-2',
  left: 'right-full mr-2',
  right: 'left-full ml-2',
};

// Animation styles based on side (slide in from opposite direction)
const animationStyles: Record<TooltipSide, string> = {
  top: 'animate-in fade-in-0 slide-in-from-bottom-2',
  bottom: 'animate-in fade-in-0 slide-in-from-top-2',
  left: 'animate-in fade-in-0 slide-in-from-right-2',
  right: 'animate-in fade-in-0 slide-in-from-left-2',
};

const alignStyles: Record<TooltipSide, Record<TooltipAlign, string>> = {
  top: {
    start: 'left-0',
    center: 'left-1/2 -translate-x-1/2',
    end: 'right-0',
  },
  bottom: {
    start: 'left-0',
    center: 'left-1/2 -translate-x-1/2',
    end: 'right-0',
  },
  left: {
    start: 'top-0',
    center: 'top-1/2 -translate-y-1/2',
    end: 'bottom-0',
  },
  right: {
    start: 'top-0',
    center: 'top-1/2 -translate-y-1/2',
    end: 'bottom-0',
  },
};

export function Tooltip({
  content,
  children,
  side = 'top',
  align = 'center',
  sideOffset,
  className,
  delayDuration = 0,
}: TooltipProps) {
  const [isVisible, setIsVisible] = useState(false);
  const tooltipId = useId();

  const showTooltip = useCallback(() => {
    if (delayDuration > 0) {
      const timer = setTimeout(() => setIsVisible(true), delayDuration);
      return () => clearTimeout(timer);
    }
    setIsVisible(true);
  }, [delayDuration]);

  const hideTooltip = useCallback(() => setIsVisible(false), []);

  const offsetStyle = sideOffset
    ? {
        ...(side === 'top' && { marginBottom: sideOffset }),
        ...(side === 'bottom' && { marginTop: sideOffset }),
        ...(side === 'left' && { marginRight: sideOffset }),
        ...(side === 'right' && { marginLeft: sideOffset }),
      }
    : undefined;

  return (
    <div className="relative inline-block">
      {cloneElement(children, {
        onMouseEnter: showTooltip,
        onMouseLeave: hideTooltip,
        onFocus: showTooltip,
        onBlur: hideTooltip,
        'aria-describedby': isVisible ? tooltipId : undefined,
      })}
      {isVisible && (
        <div
          id={tooltipId}
          role="tooltip"
          aria-hidden={!isVisible}
          className={cn(
            'absolute z-50 px-3 py-2 text-sm bg-popover text-popover-foreground rounded-md shadow-md border border-border whitespace-nowrap duration-200',
            sideStyles[side],
            alignStyles[side][align],
            animationStyles[side],
            className
          )}
          style={offsetStyle}
        >
          {content}
        </div>
      )}
    </div>
  );
}
