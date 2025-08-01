'use client';

// Icons replaced with emojis for now
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import clsx from 'clsx';

const navigation = [
  { name: 'Dashboard', href: '/', icon: '🏠' },
  { name: 'Explore', href: '/explore', icon: '🔍' },
  { name: 'Search', href: '/search', icon: '🔎' },
  { name: 'Editor', href: '/editor', icon: '✏️' },
  { name: 'Collaborate', href: '/collaborate', icon: '👥' },
  { name: 'Settings', href: '/settings', icon: '⚙️' },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <div className="flex w-64 flex-col border-r border-border bg-muted/50">
      <div className="flex h-14 items-center px-6">
        <div className="flex items-center space-x-2">
          <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
            <span className="text-primary-foreground">🗺️</span>
          </div>
          <span className="font-semibold">ClaimMapper</span>
        </div>
      </div>

      <nav className="flex-1 space-y-1 px-3 py-4">
        {navigation.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.name}
              href={item.href}
              className={clsx(
                'flex items-center space-x-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
              )}
            >
              <span className="text-lg">{item.icon}</span>
              <span>{item.name}</span>
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-border p-4">
        <div className="text-xs text-muted-foreground">
          <div>Version 0.1.0</div>
          <div>Beta Release</div>
        </div>
      </div>
    </div>
  );
}