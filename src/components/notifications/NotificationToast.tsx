import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Toast, ToastClose, ToastDescription, ToastProvider, ToastTitle, ToastViewport } from '@/components/ui/toast';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Bell, X, ExternalLink, Clock, AlertTriangle, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';
import { NotificationData } from '@/hooks/useNotifications';

interface ToastNotification extends NotificationData {
  show: boolean;
  autoHideTimer?: NodeJS.Timeout;
}

interface NotificationToastProps {
  userContext: {
    type: 'store' | 'admin' | 'customer';
    id: string;
  };
  autoHideDuration?: number; // in milliseconds (default 10 seconds as specified)
  priorityFilter?: ('urgent' | 'high')[];
  className?: string;
}

/**
 * Real-time toast notification component for urgent alerts
 * Uses the same Supabase Realtime subscription as specified
 * Shows instant pop-up alerts for new, urgent notifications
 */
export const NotificationToast: React.FC<NotificationToastProps> = ({
  userContext,
  autoHideDuration = 10000, // 10 seconds as specified in requirements
  priorityFilter = ['urgent', 'high'], // Only show urgent and high priority by default
  className = ""
}) => {
  const [toastNotifications, setToastNotifications] = useState<ToastNotification[]>([]);

  // Setup real-time subscription for toast notifications using exact specifications
  useEffect(() => {
    if (!userContext.id) return;

    console.log(`🍞 Setting up toast notifications for ${userContext.type}: ${userContext.id}`);
    
    // Use the same Supabase Realtime subscription from Part 1 (notifications_channel)
    const channel = supabase
      .channel('notifications_channel')
      .on('postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          // Filter based on current user's context
          filter: userContext.type === 'admin' 
            ? `recipient_type=eq.${userContext.type}` 
            : `recipient_type=eq.${userContext.type}.and.recipient_id=eq.${userContext.id}`
        },
        (payload) => {
          console.log('🍞 New toast notification event received via postgres_changes:', payload);
          
          if (payload.new) {
            const newNotification = payload.new as NotificationData;
            
            // When a new_notification event is received that is intended for the current user
            const isForCurrentUser = 
              newNotification.recipient_type === userContext.type &&
              (userContext.type === 'admin' || newNotification.recipient_id === userContext.id);
            
            if (isForCurrentUser) {
              // Additional filter to only show toasts for notifications with priority set to 'urgent' or 'high'
              const shouldShowToast = priorityFilter.includes(newNotification.priority as any);
              
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
                
                console.log(`✅ Showing toast for ${newNotification.priority} priority notification`);
              } else {
                console.log(`🚫 Skipping toast for ${newNotification.priority} priority notification (not in filter)`);
              }
            }
          }
        }
      )
      .subscribe((status) => {
        console.log(`📡 Toast notifications_channel status for ${userContext.type} ${userContext.id}:`, status);
        
        if (status === 'SUBSCRIBED') {
          console.log(`✅ Successfully subscribed to toast notifications_channel`);
        } else if (status === 'CHANNEL_ERROR') {
          console.error(`❌ Toast channel error for notifications_channel`);
        } else if (status === 'TIMED_OUT') {
          console.warn(`⏰ Toast channel timed out for notifications_channel`);
        }
      });

    return () => {
      supabase.removeChannel(channel);
      console.log(`🍞 Unsubscribed from toast notifications_channel`);
    };
  }, [userContext.type, userContext.id, autoHideDuration, priorityFilter]);

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

  // Handle toast body click - navigate to URL if provided
  const handleToastClick = useCallback((notification: ToastNotification) => {
    // If the user clicks anywhere on the toast body (not the close button), 
    // navigate them directly to the URL in the notification's url field
    if (notification.url) {
      window.location.href = notification.url;
    }
    hideToast(notification.id);
  }, [hideToast]);

  // Get priority styling for toasts
  const getPriorityStyles = (priority?: string) => {
    switch (priority) {
      case 'urgent':
        return {
          className: 'border-red-500 bg-red-50 text-red-900 shadow-lg shadow-red-500/20',
          icon: <AlertTriangle className="w-5 h-5 text-red-600" />,
          iconEmoji: '🚨',
          badgeClass: 'bg-red-500 text-white',
          titleClass: 'text-red-900 font-bold'
        };
      case 'high':
        return {
          className: 'border-orange-500 bg-orange-50 text-orange-900 shadow-lg shadow-orange-500/20',
          icon: <Zap className="w-5 h-5 text-orange-600" />,
          iconEmoji: '⚠️',
          badgeClass: 'bg-orange-500 text-white',
          titleClass: 'text-orange-900 font-semibold'
        };
      case 'medium':
        return {
          className: 'border-blue-500 bg-blue-50 text-blue-900 shadow-lg shadow-blue-500/20',
          icon: <Bell className="w-5 h-5 text-blue-600" />,
          iconEmoji: '📢',
          badgeClass: 'bg-blue-500 text-white',
          titleClass: 'text-blue-900 font-medium'
        };
      default:
        return {
          className: 'border-gray-400 bg-gray-50 text-gray-900 shadow-lg',
          icon: <Bell className="w-5 h-5 text-gray-600" />,
          iconEmoji: '📝',
          badgeClass: 'bg-gray-400 text-white',
          titleClass: 'text-gray-900'
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
      <ToastViewport className={cn(
        "fixed top-4 right-4 z-[100] flex max-h-screen w-full flex-col-reverse p-4 sm:flex-col md:max-w-[420px]",
        className
      )} />
      
      {toastNotifications.map((notification) => {
        const priorityStyles = getPriorityStyles(notification.priority);
        
        return (
          <Toast
            key={notification.id}
            className={cn(
              "border-2 shadow-xl max-w-md transition-all duration-300 animate-in slide-in-from-right-full",
              priorityStyles.className,
              notification.url && "cursor-pointer hover:shadow-2xl hover:scale-105"
            )}
            onClick={notification.url ? () => handleToastClick(notification) : undefined}
          >
            <div className="flex items-start gap-3 w-full">
              {/* Priority Icon */}
              <div className="flex-shrink-0 mt-1">
                {priorityStyles.icon}
              </div>
              
              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between mb-2">
                  {/* The toast should display the new notification's title */}
                  <ToastTitle className={cn(
                    "text-right text-sm flex items-center gap-2",
                    priorityStyles.titleClass
                  )}>
                    <span>{priorityStyles.iconEmoji}</span>
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
                <ToastDescription className="text-right text-sm leading-relaxed">
                  {notification.message}
                </ToastDescription>
                
                {/* Action section */}
                <div className="flex items-center justify-between mt-3 pt-2 border-t border-current/10">
                  {notification.url && (
                    <Button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleToastClick(notification);
                      }}
                      variant="outline"
                      size="sm"
                      className="text-xs h-7"
                    >
                      عرض التفاصيل
                    </Button>
                  )}
                  
                  <div className="flex items-center gap-2 text-xs opacity-70">
                    <Clock className="w-3 h-3" />
                    الآن
                    {notification.order_id && (
                      <>
                        <span>•</span>
                        <span>طلب: {notification.order_id.slice(0, 8)}...</span>
                      </>
                    )}
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
              className="absolute top-2 left-2 h-6 w-6 rounded-full bg-black/10 hover:bg-black/20 transition-colors"
            >
              <X className="w-3 h-3" />
            </ToastClose>
          </Toast>
        );
      })}
    </ToastProvider>
  );
};

// Hook for easier integration
export const useNotificationToast = (
  userContext: { type: 'store' | 'admin' | 'customer'; id: string }, 
  options?: {
    autoHideDuration?: number;
    priorityFilter?: ('urgent' | 'high')[];
  }
) => {
  return {
    NotificationToast: () => (
      <NotificationToast 
        userContext={userContext} 
        autoHideDuration={options?.autoHideDuration}
        priorityFilter={options?.priorityFilter}
      />
    )
  };
};

export default NotificationToast;
