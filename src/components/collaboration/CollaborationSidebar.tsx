'use client';

import { useState } from 'react';
import { 
  Users, 
  MessageSquare, 
  Bell, 
  Settings,
  ChevronDown,
  ChevronRight,
  Circle,
  Clock,
  Star,
  AlertTriangle
} from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';
import { formatDistanceToNow } from 'date-fns';

export function CollaborationSidebar() {
  const [expandedSections, setExpandedSections] = useState({
    users: true,
    notifications: true,
    activity: false
  });

  const {
    activeUsers,
    notifications,
    changeHistory,
    user,
    markNotificationRead,
    clearNotifications
  } = useAppStore();

  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'create':
        return <Circle className="h-3 w-3 text-green-500" />;
      case 'update':
        return <Circle className="h-3 w-3 text-blue-500" />;
      case 'comment':
        return <MessageSquare className="h-3 w-3 text-purple-500" />;
      case 'validate':
        return <Star className="h-3 w-3 text-yellow-500" />;
      default:
        return <Circle className="h-3 w-3 text-gray-500" />;
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'comment':
        return <MessageSquare className="h-4 w-4 text-blue-500" />;
      case 'validation':
        return <Star className="h-4 w-4 text-yellow-500" />;
      case 'conflict':
        return <AlertTriangle className="h-4 w-4 text-red-500" />;
      case 'mention':
        return <Users className="h-4 w-4 text-green-500" />;
      default:
        return <Bell className="h-4 w-4 text-gray-500" />;
    }
  };

  const unreadNotifications = notifications.filter(n => !n.read);
  const recentActivity = changeHistory.slice(0, 10);

  return (
    <div className="flex h-full w-80 flex-col border-l border-border bg-muted/30">
      {/* Header */}
      <div className="border-b border-border p-4">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold">Collaboration</h2>
          <div className="flex items-center space-x-1">
            <div className="h-2 w-2 rounded-full bg-green-500" />
            <span className="text-xs text-muted-foreground">Live</span>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {/* Active Users Section */}
        <div className="border-b border-border">
          <button
            onClick={() => toggleSection('users')}
            className="flex w-full items-center justify-between p-4 text-left hover:bg-accent"
          >
            <div className="flex items-center space-x-2">
              <Users className="h-4 w-4" />
              <span className="font-medium">Active Users</span>
              <span className="rounded-full bg-muted px-2 py-1 text-xs">
                {activeUsers.length}
              </span>
            </div>
            {expandedSections.users ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronRight className="h-4 w-4" />
            )}
          </button>

          {expandedSections.users && (
            <div className="space-y-2 p-4 pt-0">
              {activeUsers.map((userPresence) => (
                <div
                  key={userPresence.userId}
                  className="flex items-center space-x-3 rounded-lg p-2 hover:bg-accent"
                >
                  <div className="relative">
                    <div
                      className="h-8 w-8 rounded-full"
                      style={{ backgroundColor: userPresence.user.color || '#3B82F6' }}
                    />
                    <div
                      className={`absolute -bottom-1 -right-1 h-3 w-3 rounded-full border-2 border-background ${
                        userPresence.user.status === 'online'
                          ? 'bg-green-500'
                          : userPresence.user.status === 'away'
                          ? 'bg-yellow-500'
                          : 'bg-gray-500'
                      }`}
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">
                      {userPresence.user.name}
                      {userPresence.userId === user?.id && ' (You)'}
                    </p>
                    <p className="text-xs text-muted-foreground capitalize">
                      {userPresence.activity}
                    </p>
                  </div>
                </div>
              ))}

              {activeUsers.length === 0 && (
                <p className="text-center text-sm text-muted-foreground py-4">
                  No active users
                </p>
              )}
            </div>
          )}
        </div>

        {/* Notifications Section */}
        <div className="border-b border-border">
          <button
            onClick={() => toggleSection('notifications')}
            className="flex w-full items-center justify-between p-4 text-left hover:bg-accent"
          >
            <div className="flex items-center space-x-2">
              <Bell className="h-4 w-4" />
              <span className="font-medium">Notifications</span>
              {unreadNotifications.length > 0 && (
                <span className="rounded-full bg-red-500 px-2 py-1 text-xs text-white">
                  {unreadNotifications.length}
                </span>
              )}
            </div>
            {expandedSections.notifications ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronRight className="h-4 w-4" />
            )}
          </button>

          {expandedSections.notifications && (
            <div className="max-h-64 overflow-y-auto">
              {notifications.length > 0 ? (
                <div className="space-y-1 p-4 pt-0">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs text-muted-foreground">
                      {unreadNotifications.length} unread
                    </span>
                    {notifications.length > 0 && (
                      <button
                        onClick={clearNotifications}
                        className="text-xs text-primary hover:underline"
                      >
                        Clear all
                      </button>
                    )}
                  </div>

                  {notifications.slice(0, 5).map((notification) => (
                    <div
                      key={notification.id}
                      className={`rounded-lg p-3 cursor-pointer transition-colors ${
                        !notification.read
                          ? 'bg-primary/10 border border-primary/20'
                          : 'hover:bg-accent'
                      }`}
                      onClick={() => !notification.read && markNotificationRead(notification.id)}
                    >
                      <div className="flex items-start space-x-2">
                        {getNotificationIcon(notification.type)}
                        <div className="flex-1 min-w-0">
                          <h4 className="text-sm font-medium">
                            {notification.title}
                          </h4>
                          <p className="text-xs text-muted-foreground line-clamp-2">
                            {notification.message}
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {formatDistanceToNow(notification.createdAt, { addSuffix: true })}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-center text-sm text-muted-foreground py-4">
                  No notifications
                </p>
              )}
            </div>
          )}
        </div>

        {/* Recent Activity Section */}
        <div>
          <button
            onClick={() => toggleSection('activity')}
            className="flex w-full items-center justify-between p-4 text-left hover:bg-accent"
          >
            <div className="flex items-center space-x-2">
              <Clock className="h-4 w-4" />
              <span className="font-medium">Recent Activity</span>
            </div>
            {expandedSections.activity ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronRight className="h-4 w-4" />
            )}
          </button>

          {expandedSections.activity && (
            <div className="max-h-64 overflow-y-auto">
              {recentActivity.length > 0 ? (
                <div className="space-y-2 p-4 pt-0">
                  {recentActivity.map((activity) => (
                    <div
                      key={activity.id}
                      className="flex items-start space-x-3 rounded-lg p-2 hover:bg-accent"
                    >
                      {getActivityIcon(activity.type)}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm">
                          <span className="font-medium">{activity.user.name}</span>
                          <span className="text-muted-foreground">
                            {' '}{activity.type}d a {activity.entityType}
                          </span>
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {formatDistanceToNow(activity.timestamp, { addSuffix: true })}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-center text-sm text-muted-foreground py-4">
                  No recent activity
                </p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="border-t border-border p-4">
        <button className="flex w-full items-center justify-center space-x-2 rounded-lg border border-border px-3 py-2 text-sm hover:bg-accent">
          <Settings className="h-4 w-4" />
          <span>Collaboration Settings</span>
        </button>
      </div>
    </div>
  );
}