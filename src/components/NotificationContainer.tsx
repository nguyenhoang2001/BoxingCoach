/**
 * Notification Container Component - Displays toast notifications
 * Shows system notifications, success messages, and alerts
 */

import React, { useEffect, useState } from 'react';
import { ApplicationCoordinator } from '../services/ApplicationCoordinator';
import { Notification } from '../types';
import './NotificationContainer.css';

interface NotificationContainerProps {
  coordinator: ApplicationCoordinator;
  className?: string;
}

export const NotificationContainer: React.FC<NotificationContainerProps> = ({
  coordinator,
  className
}) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);

  useEffect(() => {
    const handleNotification = (notification: Notification) => {
      setNotifications(prev => [...prev, notification]);
    };

    const handleNotificationRemoved = (notification: Notification) => {
      setNotifications(prev => prev.filter(n => n.id !== notification.id));
    };

    coordinator.on('notification', handleNotification);
    coordinator.on('notificationRemoved', handleNotificationRemoved);

    return () => {
      coordinator.off('notification', handleNotification);
      coordinator.off('notificationRemoved', handleNotificationRemoved);
    };
  }, [coordinator]);

  const dismissNotification = (id: string) => {
    const notificationService = coordinator.getService('notification');
    if (notificationService) {
      notificationService.removeNotification(id);
    }
  };

  const getNotificationIcon = (type: string): string => {
    switch (type) {
      case 'success': return '✓';
      case 'error': return '❌';
      case 'warning': return '⚠️';
      case 'info': return 'ℹ️';
      default: return '💬';
    }
  };

  const getNotificationClass = (type: string): string => {
    return `notification-${type}`;
  };

  const formatTimestamp = (timestamp: number): string => {
    return new Date(timestamp).toLocaleTimeString();
  };

  if (notifications.length === 0) return null;

  return (
    <div className={`notification-container ${className || ''}`}>
      {notifications.map(notification => (
        <div 
          key={notification.id}
          className={`notification ${getNotificationClass(notification.type)}`}
        >
          <div className="notification-content">
            <div className="notification-header">
              <span className="notification-icon">
                {getNotificationIcon(notification.type)}
              </span>
              <span className="notification-title">{notification.title}</span>
              <span className="notification-time">
                {formatTimestamp(notification.timestamp)}
              </span>
            </div>
            
            <div className="notification-message">
              {notification.message}
            </div>
          </div>

          {notification.dismissible && (
            <button 
              className="notification-dismiss"
              onClick={() => dismissNotification(notification.id)}
              title="Dismiss notification"
            >
              ✕
            </button>
          )}
        </div>
      ))}
    </div>
  );
};