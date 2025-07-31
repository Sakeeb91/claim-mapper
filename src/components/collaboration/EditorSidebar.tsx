'use client';

import { FileText, Clock, Users, Settings } from 'lucide-react';
import { useState } from 'react';

export function EditorSidebar() {
  const [activeTab, setActiveTab] = useState<'documents' | 'history' | 'users'>('documents');

  const documents = [
    { id: '1', name: 'Climate Change Claims', lastModified: '2 hours ago', collaborators: 3 },
    { id: '2', name: 'Economic Policy Analysis', lastModified: '1 day ago', collaborators: 2 },
    { id: '3', name: 'Healthcare Research', lastModified: '3 days ago', collaborators: 5 },
  ];

  const history = [
    { id: '1', action: 'Added new claim', user: 'Alice Johnson', time: '5 minutes ago' },
    { id: '2', action: 'Updated evidence', user: 'Bob Smith', time: '15 minutes ago' },
    { id: '3', action: 'Added reasoning chain', user: 'Charlie Brown', time: '1 hour ago' },
  ];

  const users = [
    { id: '1', name: 'Alice Johnson', role: 'Editor', status: 'online', avatar: '👩‍💼' },
    { id: '2', name: 'Bob Smith', role: 'Reviewer', status: 'away', avatar: '👨‍💻' },
    { id: '3', name: 'Charlie Brown', role: 'Viewer', status: 'offline', avatar: '👨‍🎓' },
  ];

  const tabs = [
    { id: 'documents', label: 'Documents', icon: FileText },
    { id: 'history', label: 'History', icon: Clock },
    { id: 'users', label: 'Users', icon: Users },
  ] as const;

  return (
    <div className="flex w-80 flex-col border-l border-border bg-muted/50">
      {/* Tabs */}
      <div className="border-b border-border">
        <div className="flex">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex flex-1 items-center justify-center space-x-2 border-b-2 p-3 text-sm font-medium transition-colors ${
                activeTab === tab.id
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              <tab.icon className="h-4 w-4" />
              <span>{tab.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {activeTab === 'documents' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold">Recent Documents</h3>
              <button className="text-sm text-primary hover:underline">
                View All
              </button>
            </div>
            {documents.map((doc) => (
              <div
                key={doc.id}
                className="cursor-pointer rounded-lg border border-border bg-background p-3 hover:bg-accent"
              >
                <h4 className="font-medium">{doc.name}</h4>
                <div className="mt-1 flex items-center justify-between text-xs text-muted-foreground">
                  <span>{doc.lastModified}</span>
                  <span>{doc.collaborators} collaborators</span>
                </div>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'history' && (
          <div className="space-y-3">
            <h3 className="font-semibold">Recent Activity</h3>
            {history.map((item) => (
              <div key={item.id} className="border-l-2 border-primary pl-3">
                <p className="text-sm">{item.action}</p>
                <div className="mt-1 text-xs text-muted-foreground">
                  <span>{item.user}</span> • <span>{item.time}</span>
                </div>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'users' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold">Team Members</h3>
              <button className="rounded-md p-1 hover:bg-accent">
                <Settings className="h-4 w-4" />
              </button>
            </div>
            {users.map((user) => (
              <div key={user.id} className="flex items-center space-x-3">
                <div className="text-2xl">{user.avatar}</div>
                <div className="flex-1">
                  <div className="flex items-center space-x-2">
                    <span className="font-medium">{user.name}</span>
                    <div
                      className={`h-2 w-2 rounded-full ${
                        user.status === 'online'
                          ? 'bg-green-500'
                          : user.status === 'away'
                          ? 'bg-yellow-500'
                          : 'bg-gray-300'
                      }`}
                    />
                  </div>
                  <span className="text-xs text-muted-foreground">{user.role}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}