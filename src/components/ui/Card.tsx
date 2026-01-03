'use client';

import { HTMLAttributes, forwardRef, KeyboardEvent } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/utils';

const cardVariants = cva(
  'rounded-lg border bg-card text-card-foreground',
  {
    variants: {
      variant: {
        default: 'border-border shadow-sm',
        elevated: 'border-transparent shadow-md hover:shadow-lg transition-shadow',
        outlined: 'border-border shadow-none',
        ghost: 'border-transparent bg-transparent shadow-none',
        interactive: 'border-border shadow-sm cursor-pointer hover:shadow-md hover:border-primary/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 transition-all',
      },
      padding: {
        none: '',
        sm: 'p-3',
        md: 'p-4',
        lg: 'p-6',
      },
    },
    defaultVariants: {
      variant: 'default',
      padding: 'none',
    },
  }
);

export interface CardProps
  extends HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof cardVariants> {
  children: React.ReactNode;
}

const Card = forwardRef<HTMLDivElement, CardProps>(
  ({ className, variant, padding, children, onClick, onKeyDown, ...props }, ref) => {
    const isInteractive = variant === 'interactive' || onClick !== undefined;

    const handleKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
      if (isInteractive && (e.key === 'Enter' || e.key === ' ')) {
        e.preventDefault();
        onClick?.(e as unknown as React.MouseEvent<HTMLDivElement>);
      }
      onKeyDown?.(e);
    };

    return (
      <div
        ref={ref}
        className={cn(cardVariants({ variant, padding, className }))}
        onClick={onClick}
        onKeyDown={handleKeyDown}
        tabIndex={isInteractive ? 0 : undefined}
        role={isInteractive ? 'button' : undefined}
        {...props}
      >
        {children}
      </div>
    );
  }
);

Card.displayName = 'Card';

// Card Header
const CardHeader = forwardRef<
  HTMLDivElement,
  HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn('flex flex-col space-y-1.5 p-6', className)}
    {...props}
  />
));
CardHeader.displayName = 'CardHeader';

// Card Title
const CardTitle = forwardRef<
  HTMLHeadingElement,
  HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
  <h3
    ref={ref}
    className={cn('text-lg font-semibold leading-none tracking-tight', className)}
    {...props}
  />
));
CardTitle.displayName = 'CardTitle';

// Card Description
const CardDescription = forwardRef<
  HTMLParagraphElement,
  HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <p
    ref={ref}
    className={cn('text-sm text-muted-foreground', className)}
    {...props}
  />
));
CardDescription.displayName = 'CardDescription';

// Card Content
const CardContent = forwardRef<
  HTMLDivElement,
  HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn('p-6 pt-0', className)}
    {...props}
  />
));
CardContent.displayName = 'CardContent';

// Card Footer
const CardFooter = forwardRef<
  HTMLDivElement,
  HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn('flex items-center p-6 pt-0', className)}
    {...props}
  />
));
CardFooter.displayName = 'CardFooter';

export {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
  cardVariants,
};
