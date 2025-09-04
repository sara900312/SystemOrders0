// Store notification types matching the exact specifications

export interface StoreNotification {
  id: string;
  recipient_type: 'store' | 'admin' | 'customer';
  recipient_id: string;
  title: string;
  message: string;
  order_id?: string;
  created_at: string;
  updated_at?: string;
  read: boolean;
  sent: boolean;
  sent_at?: string;
  url?: string;
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  type?: string;
}

export interface CurrentStore {
  id: string;
}

export interface StoreNotificationCenterProps {
  current_store: CurrentStore;
  className?: string;
  maxHeight?: string;
  showHeader?: boolean;
}

export interface StoreNotificationToastProps {
  current_store: CurrentStore;
  autoHideDuration?: number; // in milliseconds (default 10 seconds)
}

export interface StoreNotificationSystemProps {
  current_store: CurrentStore;
  className?: string;
  showTestPanel?: boolean;
  notificationCenterProps?: {
    maxHeight?: string;
    showHeader?: boolean;
    className?: string;
  };
  toastProps?: {
    autoHideDuration?: number;
  };
}

// Supabase Realtime specifications
export const NOTIFICATION_CHANNEL = 'notifications_channel';
export const NEW_NOTIFICATION_EVENT = 'new_notification';
export const NOTIFICATIONS_TABLE = 'notifications';

// Priority levels for toast filtering
export const URGENT_PRIORITIES = ['urgent', 'high'] as const;
export type UrgentPriority = typeof URGENT_PRIORITIES[number];

// Recipient types
export const RECIPIENT_TYPES = ['store', 'admin', 'customer'] as const;
export type RecipientType = typeof RECIPIENT_TYPES[number];
