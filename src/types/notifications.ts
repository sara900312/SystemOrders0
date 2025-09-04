// Enhanced notification types for the store notification system

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

export interface NotificationStats {
  total: number;
  unread: number;
  unsent: number;
  byType: Record<string, number>;
}

export interface NotificationSystemConfig {
  storeId: string;
  autoHideDuration?: number;
  showOnlyUrgent?: boolean;
  maxNotifications?: number;
  enableRealtime?: boolean;
}

export type NotificationPriority = 'low' | 'medium' | 'high' | 'urgent';
export type NotificationType = 'order_assigned' | 'order_reminder' | 'system' | 'general';
export type RecipientType = 'store' | 'admin' | 'customer';
