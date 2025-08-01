'use client';

import { useState } from 'react';
import { 
  Bell, 
  X, 
  MessageSquare, 
  Star, 
  AlertTriangle, 
  Users,
  Check,
  Settings
} from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';
import { formatDistanceToNow } from 'date-fns';
import { Notification } from '@/types';
import { motion, AnimatePresence } from 'framer-motion';

export function NotificationCenter() {
  const [isOpen, setIsOpen] = useState(false);
  const { notifications, markNotificationRead, clearNotifications } = useAppStore();
  
  const unreadCount = notifications.filter(n => !n.read).length;

  const getNotificationIcon = (type: Notification['type']) => {
    switch (type) {
      case 'comment':
        return <MessageSquare className="h-4 w-4 text-blue-500" />;
      case 'validation':
        return <Star className="h-4 w-4 text-yellow-500" />;
      case 'conflict':
        return <AlertTriangle className="h-4 w-4 text-red-500" />;
      case 'mention':
        return <Users className="h-4 w-4 text-green-500" />;
      case 'system':
        return <Settings className="h-4 w-4 text-gray-500" />;
      default:
        return <Bell className="h-4 w-4 text-gray-500" />;
    }
  };

  const getPriorityColor = (priority: Notification['priority']) => {
    switch (priority) {
      case 'high':
        return 'border-l-red-500';
      case 'medium':
        return 'border-l-yellow-500';
      case 'low':
        return 'border-l-blue-500';
      default:
        return 'border-l-gray-300';
    }
  };

  const handleNotificationClick = (notification: Notification) => {
    if (!notification.read) {
      markNotificationRead(notification.id);
    }
    
    // Navigate to the notification's action URL if available
    if (notification.actionUrl) {
      window.location.href = notification.actionUrl;
    }
  };

  return (
    <>
      {/* Notification Bell */}
      <div className="relative">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="relative rounded-lg p-2 hover:bg-accent"
        >
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-xs font-medium text-white"
            >
              {unreadCount > 9 ? '9+' : unreadCount}
            </motion.div>
          )}
        </button>

        {/* Notification Panel */}
        <AnimatePresence>
          {isOpen && (
            <>
              {/* Backdrop */}
              <div
                className="fixed inset-0 z-40"
                onClick={() => setIsOpen(false)}
              />
              
              {/* Panel */}
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: -10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: -10 }}
                className="absolute right-0 top-full z-50 mt-2 w-96 rounded-lg border border-border bg-background shadow-lg"
              >
                {/* Header */}
                <div className="flex items-center justify-between border-b border-border p-4">
                  <div className="flex items-center space-x-2">
                    <Bell className="h-5 w-5" />
                    <h3 className="font-semibold">Notifications</h3>
                    {unreadCount > 0 && (
                      <span className="rounded-full bg-red-100 px-2 py-1 text-xs text-red-800">
                        {unreadCount} new
                      </span>
                    )}
                  </div>
                  <div className="flex items-center space-x-2">
                    {notifications.length > 0 && (
                      <button
                        onClick={clearNotifications}
                        className="text-xs text-muted-foreground hover:text-foreground"
                      >
                        Clear all
                      </button>
                    )}
                    <button
                      onClick={() => setIsOpen(false)}
                      className="rounded p-1 hover:bg-accent"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                {/* Notifications List */}
                <div className="max-h-96 overflow-y-auto">
                  {notifications.length > 0 ? (
                    <div className="divide-y divide-border">
                      {notifications.slice(0, 10).map((notification) => (
                        <motion.div
                          key={notification.id}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          className={`cursor-pointer border-l-4 p-4 transition-colors hover:bg-accent ${
                            !notification.read ? 'bg-muted/50' : ''
                          } ${getPriorityColor(notification.priority)}`}
                          onClick={() => handleNotificationClick(notification)}
                        >
                          <div className="flex items-start space-x-3">
                            {getNotificationIcon(notification.type)}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-start justify-between">
                                <p className="text-sm font-medium line-clamp-1">
                                  {notification.title}
                                </p>
                                {!notification.read && (
                                  <div className="ml-2 h-2 w-2 rounded-full bg-blue-500" />
                                )}
                              </div>
                              <p className="text-sm text-muted-foreground line-clamp-2">
                                {notification.message}
                              </p>
                              <div className="flex items-center justify-between mt-2">
                                <p className="text-xs text-muted-foreground">
                                  {formatDistanceToNow(notification.createdAt, { addSuffix: true })}
                                </p>
                                {notification.read && (
                                  <Check className="h-3 w-3 text-green-500" />
                                )}
                              </div>
                            </div>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-8 text-center">
                      <Bell className="h-8 w-8 text-muted-foreground mb-2" />
                      <p className="text-sm text-muted-foreground">No notifications</p>
                    </div>
                  )}
                </div>

                {/* Footer */}
                {notifications.length > 10 && (
                  <div className="border-t border-border p-4 text-center">
                    <button className="text-sm text-primary hover:underline">
                      View all notifications
                    </button>
                  </div>
                )}
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </div>
    </>
  );
}