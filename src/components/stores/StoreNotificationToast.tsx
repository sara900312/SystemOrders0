import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Toast, ToastClose, ToastDescription, ToastProvider, ToastTitle, ToastViewport } from '@/components/ui/toast';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Bell, X, ExternalLink, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Notification {
  id: string;
  title: string;
  message: string;
  order_id?: string;
  created_at: string;
  read: boolean;
  sent: boolean;
  url?: string;
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  type?: string;
  recipient_id: string;
  recipient_type: string;
}

interface ToastNotification extends Notification {
  show: boolean;
  autoHideTimer?: NodeJS.Timeout;
}

interface StoreNotificationToastProps {
  current_store: {
    id: string;
  };
  autoHideDuration?: number; // in milliseconds (default 10 seconds)
}

export const StoreNotificationToast: React.FC<StoreNotificationToastProps> = ({
  current_store,
  autoHideDuration = 10000 // 10 seconds as specified
}) => {
  const [toastNotifications, setToastNotifications] = useState<ToastNotification[]>([]);

  // Setup real-time subscription for toast notifications using exact specifications
  useEffect(() => {
    console.log(`🔔 Setting up toast notifications for store: ${current_store.id}`);
    
    // Use the same Supabase Realtime subscription (notifications_channel)
    const channel = supabase
      .channel('notifications_channel')
      .on('broadcast',
        {
          event: 'new_notification'
        },
        (payload) => {
          console.log('🍞 New toast notification event received:', payload);
          const newNotification = payload.payload as Notification;
          
          // When a new_notification event is received that is intended for the current store
          if (newNotification.recipient_type === 'store' && 
              newNotification.recipient_id === current_store.id) {
            
            // Additional filter to only show toasts for notifications with priority set to 'urgent' or 'high'
            const shouldShowToast = newNotification.priority === 'urgent' || newNotification.priority === 'high';
            
            if (shouldShowToast) {
              const toastNotification: ToastNotification = {
                ...newNotification,
                show: true
              };
              
              setToastNotifications(prev => [...prev, toastNotification]);
              
              // The toast should automatically disappear after a few seconds (e.g., 10 seconds) if not dismissed
              const timer = setTimeout(() => {
                hideToast(newNotification.id);
              }, autoHideDuration);
              
              // Store timer reference
              setToastNotifications(current => 
                current.map(toast => 
                  toast.id === newNotification.id 
                    ? { ...toast, autoHideTimer: timer }
                    : toast
                )
              );
              
              console.log('✅ Showing toast for urgent/high priority notification');
            }
          }
        }
      )
      .subscribe((status) => {
        console.log(`📡 Toast notifications_channel status:`, status);
      });

    return () => {
      supabase.removeChannel(channel);
      console.log(`🔔 Unsubscribed from toast notifications_channel`);
    };
  }, [current_store.id, autoHideDuration]);

  // Hide specific toast
  const hideToast = useCallback((notificationId: string) => {
    setToastNotifications(prev => {
      const notification = prev.find(n => n.id === notificationId);
      if (notification?.autoHideTimer) {
        clearTimeout(notification.autoHideTimer);
      }
      return prev.filter(n => n.id !== notificationId);
    });
  }, []);

  // Handle toast click - navigate to URL if provided
  const handleToastClick = useCallback((notification: ToastNotification) => {
    // If the user clicks anywhere on the toast body (not the close button), 
    // navigate them directly to the URL in the notification's url field
    if (notification.url) {
      window.location.href = notification.url;
    }
    hideToast(notification.id);
  }, [hideToast]);

  // Get priority styling
  const getPriorityStyles = (priority?: string) => {
    switch (priority) {
      case 'urgent':
        return {
          className: 'border-red-500 bg-red-50 text-red-900',
          icon: '🚨',
          badgeClass: 'bg-red-500 text-white'
        };
      case 'high':
        return {
          className: 'border-orange-500 bg-orange-50 text-orange-900',
          icon: '⚠️',
          badgeClass: 'bg-orange-500 text-white'
        };
      case 'medium':
        return {
          className: 'border-blue-500 bg-blue-50 text-blue-900',
          icon: '📢',
          badgeClass: 'bg-blue-500 text-white'
        };
      case 'low':
        return {
          className: 'border-gray-500 bg-gray-50 text-gray-900',
          icon: 'ℹ️',
          badgeClass: 'bg-gray-500 text-white'
        };
      default:
        return {
          className: 'border-gray-400 bg-gray-50 text-gray-900',
          icon: '📝',
          badgeClass: 'bg-gray-400 text-white'
        };
    }
  };

  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      toastNotifications.forEach(notification => {
        if (notification.autoHideTimer) {
          clearTimeout(notification.autoHideTimer);
        }
      });
    };
  }, [toastNotifications]);

  if (toastNotifications.length === 0) {
    return null;
  }

  return (
    <ToastProvider>
      {/* Create a "toast" or "alert" component that appears as an overlay in a corner of the screen (e.g., top-right) */}
      <ToastViewport className="fixed top-4 right-4 z-[100] flex max-h-screen w-full flex-col-reverse p-4 sm:flex-col md:max-w-[420px]" />
      {toastNotifications.map((notification) => {
        const priorityStyles = getPriorityStyles(notification.priority);
        
        return (
          <Toast
            key={notification.id}
            className={cn(
              "border-2 shadow-lg max-w-md",
              priorityStyles.className,
              notification.url && "cursor-pointer hover:shadow-xl transition-shadow"
            )}
            onClick={notification.url ? () => handleToastClick(notification) : undefined}
          >
            <div className="flex items-start gap-3 w-full">
              {/* Priority Icon */}
              <div className="flex-shrink-0">
                <span className="text-lg">{priorityStyles.icon}</span>
              </div>
              
              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between mb-2">
                  {/* The toast should display the new notification's title */}
                  <ToastTitle className="text-right font-semibold text-sm">
                    {notification.title}
                  </ToastTitle>
                  <div className="flex items-center gap-1 ml-2">
                    {notification.priority && (
                      <Badge 
                        variant="outline" 
                        className={cn("text-xs px-1 py-0", priorityStyles.badgeClass)}
                      >
                        {notification.priority}
                      </Badge>
                    )}
                    {notification.url && (
                      <ExternalLink className="w-3 h-3 opacity-60" />
                    )}
                  </div>
                </div>
                
                {/* and message */}
                <ToastDescription className="text-right text-sm">
                  {notification.message}
                </ToastDescription>
                
                {/* Action buttons */}
                <div className="flex items-center justify-between mt-3">
                  {notification.url && (
                    <Button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleToastClick(notification);
                      }}
                      variant="outline"
                      size="sm"
                      className="text-xs"
                    >
                      عرض التفاصيل
                    </Button>
                  )}
                  
                  <div className="flex items-center gap-2 text-xs opacity-60">
                    <Clock className="w-3 h-3" />
                    الآن
                  </div>
                </div>
              </div>
            </div>
            
            {/* It should have a clear close button (X) to allow the user to dismiss it */}
            <ToastClose
              onClick={(e) => {
                e.stopPropagation();
                hideToast(notification.id);
              }}
              className="absolute top-2 left-2"
            >
              <X className="w-4 h-4" />
            </ToastClose>
          </Toast>
        );
      })}
    </ToastProvider>
  );
};

// Hook for easier integration
export const useStoreNotificationToast = (current_store: { id: string }, options?: {
  autoHideDuration?: number;
}) => {
  return {
    StoreNotificationToast: () => (
      <StoreNotificationToast 
        current_store={current_store} 
        autoHideDuration={options?.autoHideDuration}
      />
    )
  };
};

export default StoreNotificationToast;
