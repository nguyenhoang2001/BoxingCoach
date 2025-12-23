import React, { createContext, useContext, useCallback, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { 
  CheckCircle, 
  AlertCircle, 
  Info, 
  X, 
  AlertTriangle 
} from 'lucide-react';
import { NotificationMessage } from '@/types';

interface NotificationContextType {
  notifications: NotificationMessage[];
  addNotification: (notification: Omit<NotificationMessage, 'id' | 'timestamp'>) => string;
  removeNotification: (id: string) => void;
  clearNotifications: () => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
};

const NotificationIcon: React.FC<{ type: NotificationMessage['type'] }> = ({ type }) => {
  const iconProps = { className: 'w-5 h-5' };
  
  switch (type) {
    case 'success':
      return <CheckCircle {...iconProps} className="w-5 h-5 text-green-500" />;
    case 'error':
      return <AlertCircle {...iconProps} className="w-5 h-5 text-red-500" />;
    case 'warning':
      return <AlertTriangle {...iconProps} className="w-5 h-5 text-yellow-500" />;
    case 'info':
    default:
      return <Info {...iconProps} className="w-5 h-5 text-blue-500" />;
  }
};

const NotificationItem: React.FC<{
  notification: NotificationMessage;
  onRemove: (id: string) => void;
}> = ({ notification, onRemove }) => {
  const [isRemoving, setIsRemoving] = useState(false);

  const handleRemove = useCallback(() => {
    setIsRemoving(true);
    setTimeout(() => onRemove(notification.id), 150);
  }, [notification.id, onRemove]);

  // Auto-remove after duration
  React.useEffect(() => {
    if (notification.duration && notification.duration > 0) {
      const timer = setTimeout(handleRemove, notification.duration);
      return () => clearTimeout(timer);
    }
  }, [notification.duration, handleRemove]);

  const bgColorClasses = {
    success: 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800',
    error: 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800',
    warning: 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800',
    info: 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800'
  };

  const textColorClasses = {
    success: 'text-green-800 dark:text-green-200',
    error: 'text-red-800 dark:text-red-200',
    warning: 'text-yellow-800 dark:text-yellow-200',
    info: 'text-blue-800 dark:text-blue-200'
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: -50, scale: 0.95 }}
      animate={{ 
        opacity: isRemoving ? 0 : 1, 
        y: isRemoving ? -20 : 0,
        scale: isRemoving ? 0.95 : 1
      }}
      exit={{ opacity: 0, y: -20, scale: 0.95 }}
      transition={{ duration: 0.15 }}
      className={`
        relative p-4 rounded-lg border shadow-sm max-w-md w-full
        ${bgColorClasses[notification.type]}
      `}
    >
      <div className="flex items-start space-x-3">
        <NotificationIcon type={notification.type} />
        
        <div className="flex-1 min-w-0">
          <h4 className={`text-sm font-medium ${textColorClasses[notification.type]}`}>
            {notification.title}
          </h4>
          <p className={`text-sm mt-1 ${textColorClasses[notification.type]} opacity-90`}>
            {notification.message}
          </p>
          
          {notification.actions && notification.actions.length > 0 && (
            <div className="mt-3 flex space-x-2">
              {notification.actions.map((action, index) => (
                <button
                  key={index}
                  onClick={() => {
                    action.action();
                    handleRemove();
                  }}
                  className={`
                    px-3 py-1 text-xs font-medium rounded-md transition-colors
                    ${action.style === 'primary' 
                      ? 'bg-blue-600 text-white hover:bg-blue-700' 
                      : action.style === 'danger'
                      ? 'bg-red-600 text-white hover:bg-red-700'
                      : 'bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 hover:bg-gray-300 dark:hover:bg-gray-600'
                    }
                  `}
                >
                  {action.label}
                </button>
              ))}
            </div>
          )}
        </div>

        <button
          onClick={handleRemove}
          className={`
            p-1 rounded-md transition-colors
            ${textColorClasses[notification.type]} 
            hover:bg-black hover:bg-opacity-10 dark:hover:bg-white dark:hover:bg-opacity-10
          `}
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </motion.div>
  );
};

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [notifications, setNotifications] = useState<NotificationMessage[]>([]);

  const addNotification = useCallback((notification: Omit<NotificationMessage, 'id' | 'timestamp'>) => {
    const id = Math.random().toString(36).substr(2, 9);
    const newNotification: NotificationMessage = {
      ...notification,
      id,
      timestamp: Date.now(),
      duration: notification.duration ?? 5000 // Default 5 seconds
    };

    setNotifications(prev => [newNotification, ...prev]);
    return id;
  }, []);

  const removeNotification = useCallback((id: string) => {
    setNotifications(prev => prev.filter(notification => notification.id !== id));
  }, []);

  const clearNotifications = useCallback(() => {
    setNotifications([]);
  }, []);

  return (
    <NotificationContext.Provider value={{
      notifications,
      addNotification,
      removeNotification,
      clearNotifications
    }}>
      {children}
      
      {/* Notification Container */}
      <div className="fixed top-4 right-4 z-50 space-y-2">
        <AnimatePresence mode="popLayout">
          {notifications.map(notification => (
            <NotificationItem
              key={notification.id}
              notification={notification}
              onRemove={removeNotification}
            />
          ))}
        </AnimatePresence>
      </div>
    </NotificationContext.Provider>
  );
};

// Convenience hooks for different notification types
export const useNotificationHelpers = () => {
  const { addNotification } = useNotifications();

  return {
    success: (title: string, message: string, options?: Partial<NotificationMessage>) =>
      addNotification({ type: 'success', title, message, ...options }),
    
    error: (title: string, message: string, options?: Partial<NotificationMessage>) =>
      addNotification({ type: 'error', title, message, ...options }),
    
    warning: (title: string, message: string, options?: Partial<NotificationMessage>) =>
      addNotification({ type: 'warning', title, message, ...options }),
    
    info: (title: string, message: string, options?: Partial<NotificationMessage>) =>
      addNotification({ type: 'info', title, message, ...options })
  };
};