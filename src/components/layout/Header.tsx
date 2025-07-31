'use client';

import { Search, Settings, User, Bell } from 'lucide-react';
import { useState } from 'react';

export function Header() {
  const [showUserMenu, setShowUserMenu] = useState(false);

  return (
    <header className="flex h-14 items-center justify-between border-b border-border bg-background px-6">
      <div className="flex items-center space-x-4">
        <h1 className="text-xl font-semibold">Claim Mapper</h1>
      </div>

      <div className="flex items-center space-x-4">
        {/* Global Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search claims, evidence..."
            className="h-9 w-64 rounded-md border border-input bg-background pl-9 pr-3 text-sm ring-offset-background placeholder:text-muted-foreground focus:ring-2 focus:ring-ring focus:ring-offset-2"
          />
        </div>

        {/* Notifications */}
        <button className="relative rounded-md p-2 hover:bg-accent">
          <Bell className="h-4 w-4" />
          <span className="absolute -top-1 -right-1 h-3 w-3 rounded-full bg-red-500 text-xs"></span>
        </button>

        {/* Settings */}
        <button className="rounded-md p-2 hover:bg-accent">
          <Settings className="h-4 w-4" />
        </button>

        {/* User Menu */}
        <div className="relative">
          <button
            onClick={() => setShowUserMenu(!showUserMenu)}
            className="rounded-md p-2 hover:bg-accent"
          >
            <User className="h-4 w-4" />
          </button>

          {showUserMenu && (
            <div className="absolute right-0 top-full mt-2 w-48 rounded-md border border-border bg-background p-2 shadow-lg">
              <div className="space-y-1">
                <button className="w-full rounded-sm p-2 text-left text-sm hover:bg-accent">
                  Profile
                </button>
                <button className="w-full rounded-sm p-2 text-left text-sm hover:bg-accent">
                  Settings
                </button>
                <hr className="my-1 border-border" />
                <button className="w-full rounded-sm p-2 text-left text-sm hover:bg-accent">
                  Sign Out
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}