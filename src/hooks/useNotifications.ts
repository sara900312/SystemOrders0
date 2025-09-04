import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { ensureNotificationsTableExists } from '@/utils/setupNotificationsTable';

// Core notification interface matching the notifications table schema
export interface NotificationData {
  id: string;
  recipient_type: 'store' | 'admin' | 'customer';
  recipient_id: string;
  title: string;
  message: string;
  order_id?: string;
  read: boolean;
  sent: boolean;
  created_at: string;
  updated_at?: string;
  url?: string;
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  type?: string;
}

export interface UseNotificationsOptions {
  limit?: number;
  enableRealtime?: boolean;
  autoMarkAsRead?: boolean;
}

export interface UseNotificationsReturn {
  // State
  notifications: NotificationData[];
  loading: boolean;
  error: string | null;
  unreadCount: number;
  
  // Actions
  refreshNotifications: () => Promise<void>;
  markAsRead: (notificationId: string) => Promise<boolean>;
  markAllAsRead: () => Promise<boolean>;
  navigateToNotification: (notification: NotificationData) => void;
  
  // Status
  isConnected: boolean;
  tableExists: boolean;
}

/**
 * Core reusable notification hook that works for both store and admin dashboards
 * Uses ONLY the notifications table as specified
 */
export function useNotifications(
  userContext: {
    type: 'store' | 'admin' | 'customer';
    id: string;
  },
  options: UseNotificationsOptions = {}
): UseNotificationsReturn {
  const { limit = 50, enableRealtime = true, autoMarkAsRead = false } = options;
  
  // State management
  const [notifications, setNotifications] = useState<NotificationData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isConnected, setIsConnected] = useState(false);
  const [tableExists, setTableExists] = useState(false);

  // Data fetching logic that queries the notifications table
  const fetchNotifications = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      console.log(`📋 Fetching notifications for ${userContext.type} ${userContext.id}`);

      // Build query based on current user's context
      let query = supabase
        .from('notifications')
        .select('*')
        .eq('recipient_type', userContext.type);

      // For Store Dashboard: recipient_type is 'store' AND recipient_id matches current_store.id
      // For Admin Dashboard: recipient_type is 'admin' (and optionally recipient_id if specific admin targeting is needed)
      if (userContext.type === 'store' || userContext.type === 'customer') {
        query = query.eq('recipient_id', userContext.id);
      } else if (userContext.type === 'admin') {
        // For admin, we can either filter by recipient_id if specific admin targeting is needed,
        // or get all admin notifications if recipient_id is null or generic
        query = query.eq('recipient_id', userContext.id);
      }

      // Order the results by created_at in descending order
      query = query.order('created_at', { ascending: false }).limit(limit);

      const { data, error: fetchError } = await query;

      if (fetchError) {
        throw fetchError;
      }

      const notificationList = data || [];
      
      // Store these notifications in state
      setNotifications(notificationList);
      setUnreadCount(notificationList.filter(n => !n.read).length);
      setTableExists(true);

      console.log(`📋 Loaded ${notificationList.length} notifications for ${userContext.type} ${userContext.id}`);
    } catch (err: any) {
      console.error('❌ Error fetching notifications:', err);
      
      // Check if table doesn't exist
      if (err.code === 'PGRST116' || err.message?.includes('does not exist')) {
        setTableExists(false);
        setError('Notifications table not found. Please ensure it exists in your database.');
      } else {
        setError(err.message || 'Failed to fetch notifications');
      }
      
      setNotifications([]);
      setUnreadCount(0);
    } finally {
      setLoading(false);
    }
  }, [userContext.type, userContext.id, limit]);

  // Setup real-time subscription
  useEffect(() => {
    if (!enableRealtime || !userContext.id) return;

    console.log(`📡 Setting up real-time subscription for ${userContext.type} ${userContext.id}`);

    // Subscribe to the Supabase Realtime channel named notifications_channel
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
          console.log('🔔 New notification received via postgres_changes:', payload);
          
          if (payload.new) {
            const newNotification = payload.new as NotificationData;
            
            // Check if the payload's recipient_type and recipient_id match the current user's context
            const isForCurrentUser = 
              newNotification.recipient_type === userContext.type &&
              (userContext.type === 'admin' || newNotification.recipient_id === userContext.id);
            
            if (isForCurrentUser) {
              // Prepend the new notification object to the notifications state array
              setNotifications(prev => [newNotification, ...prev]);
              setUnreadCount(prev => prev + 1);
              console.log('✅ Added new notification to list');
            }
          }
        }
      )
      .subscribe((status) => {
        console.log(`📡 notifications_channel status for ${userContext.type} ${userContext.id}:`, status);
        
        if (status === 'SUBSCRIBED') {
          setIsConnected(true);
          console.log(`✅ Successfully subscribed to notifications_channel`);
        } else if (status === 'CHANNEL_ERROR') {
          setIsConnected(false);
          console.error(`❌ Channel error for notifications_channel`);
          setError('Real-time connection error. Please refresh the page.');
        } else if (status === 'TIMED_OUT') {
          setIsConnected(false);
          console.warn(`⏰ Real-time connection timed out`);
        } else if (status === 'CLOSED') {
          setIsConnected(false);
          console.log(`🔒 Real-time connection closed`);
        }
      });

    return () => {
      supabase.removeChannel(channel);
      setIsConnected(false);
      console.log(`📡 Unsubscribed from notifications_channel`);
    };
  }, [userContext.type, userContext.id, enableRealtime]);

  // Initialize notifications table and fetch data
  useEffect(() => {
    const initialize = async () => {
      // Ensure notifications table exists
      const exists = await ensureNotificationsTableExists();
      setTableExists(exists);
      
      if (exists && userContext.id) {
        await fetchNotifications();
      }
    };

    initialize();
  }, [fetchNotifications, userContext.id]);

  // Mark notification as read
  const markAsRead = useCallback(async (notificationId: string): Promise<boolean> => {
    try {
      // Trigger a Supabase database update to set the read property to true
      const { error } = await supabase
        .from('notifications')
        .update({ read: true })
        .eq('id', notificationId);

      if (error) {
        throw error;
      }

      // Upon successful update, remove the "unread" indicator from the UI
      setNotifications(prev =>
        prev.map(n =>
          n.id === notificationId ? { ...n, read: true } : n
        )
      );
      setUnreadCount(prev => Math.max(0, prev - 1));

      console.log('✅ Notification marked as read:', notificationId);
      return true;
    } catch (err: any) {
      console.error('❌ Error marking notification as read:', err);
      setError(err.message || 'Failed to mark notification as read');
      return false;
    }
  }, []);

  // Mark all notifications as read
  const markAllAsRead = useCallback(async (): Promise<boolean> => {
    try {
      let query = supabase
        .from('notifications')
        .update({ read: true })
        .eq('recipient_type', userContext.type)
        .eq('read', false);

      if (userContext.type !== 'admin') {
        query = query.eq('recipient_id', userContext.id);
      }

      const { error } = await query;

      if (error) {
        throw error;
      }

      setNotifications(prev =>
        prev.map(n => ({ ...n, read: true }))
      );
      setUnreadCount(0);

      console.log('✅ All notifications marked as read');
      return true;
    } catch (err: any) {
      console.error('❌ Error marking all notifications as read:', err);
      setError(err.message || 'Failed to mark all notifications as read');
      return false;
    }
  }, [userContext.type, userContext.id]);

  // Navigate to notification URL
  const navigateToNotification = useCallback((notification: NotificationData) => {
    // Mark as read if auto-mark is enabled
    if (autoMarkAsRead && !notification.read) {
      markAsRead(notification.id);
    }
    
    // Navigate the user to the URL specified in the notification's url field
    if (notification.url) {
      window.location.href = notification.url;
    }
  }, [autoMarkAsRead, markAsRead]);

  // Refresh notifications manually
  const refreshNotifications = useCallback(async () => {
    await fetchNotifications();
  }, [fetchNotifications]);

  return {
    // State
    notifications,
    loading,
    error,
    unreadCount,
    
    // Actions
    refreshNotifications,
    markAsRead,
    markAllAsRead,
    navigateToNotification,
    
    // Status
    isConnected,
    tableExists
  };
}

export default useNotifications;
