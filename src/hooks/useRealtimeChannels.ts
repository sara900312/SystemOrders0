import { useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { RealtimeChannel } from '@supabase/supabase-js';

interface OrderUpdatePayload {
  orderId: string;
  type: 'new_order' | 'status_change' | 'assignment' | 'store_response';
  storeId?: string;
  status?: string;
  customer_name?: string;
  order_code?: string;
  data?: any;
}

interface NotificationUpdatePayload {
  recipient_type: 'admin' | 'store' | 'customer';
  message: string;
  order_id?: string;
  store_id?: string;
  notification_type?: string;
  data?: any;
}

interface UseRealtimeChannelsOptions {
  onOrderUpdate?: (payload: OrderUpdatePayload) => void;
  onNotificationUpdate?: (payload: NotificationUpdatePayload) => void;
  enableLogging?: boolean;
}

export const useRealtimeChannels = (options: UseRealtimeChannelsOptions = {}) => {
  const { onOrderUpdate, onNotificationUpdate, enableLogging = true } = options;
  
  const ordersChannelRef = useRef<RealtimeChannel | null>(null);
  const notificationsChannelRef = useRef<RealtimeChannel | null>(null);

  useEffect(() => {
    if (enableLogging) {
      console.log('🔄 Setting up Realtime channels: orders_channel & notifications_channel');
    }

    // 2️⃣ إعداد قناة الطلبات (orders_channel)
    ordersChannelRef.current = supabase.channel('orders_channel');

    ordersChannelRef.current.on('broadcast', { event: 'order_update' }, (payload) => {
      if (enableLogging) {
        console.log('📦 تحديث طلب من orders_channel:', payload);
      }
      
      if (onOrderUpdate) {
        onOrderUpdate(payload as OrderUpdatePayload);
      }
    });

    // الاستماع لتغييرات قاعدة البيانات المباشرة للطلبات
    ordersChannelRef.current.on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'orders'
      },
      (payload) => {
        if (enableLogging) {
          console.log('📥 طلب جديد تم إنشاؤه:', payload.new);
        }
        
        const newOrder = payload.new as any;
        if (onOrderUpdate) {
          onOrderUpdate({
            orderId: newOrder.id,
            type: 'new_order',
            customer_name: newOrder.customer_name,
            order_code: newOrder.order_code,
            data: newOrder
          });
        }
      }
    );

    ordersChannelRef.current.on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'orders'
      },
      (payload) => {
        if (enableLogging) {
          console.log('🔄 تحديث طلب:', payload.new);
        }
        
        const newOrder = payload.new as any;
        const oldOrder = payload.old as any;
        
        if (onOrderUpdate) {
          let updateType: OrderUpdatePayload['type'] = 'status_change';
          
          // تحديد نوع التحديث
          if (newOrder.assigned_store_id !== oldOrder.assigned_store_id) {
            updateType = 'assignment';
          } else if (newOrder.store_response_status !== oldOrder.store_response_status) {
            updateType = 'store_response';
          }
          
          onOrderUpdate({
            orderId: newOrder.id,
            type: updateType,
            storeId: newOrder.assigned_store_id,
            status: newOrder.order_status,
            customer_name: newOrder.customer_name,
            order_code: newOrder.order_code,
            data: newOrder
          });
        }
      }
    );

    ordersChannelRef.current.subscribe((status) => {
      if (enableLogging) {
        console.log('📡 orders_channel status:', status);

        if (status === 'SUBSCRIBED') {
          console.log('✅ Successfully subscribed to orders_channel');
        } else if (status === 'CHANNEL_ERROR') {
          console.error('❌ خطأ في Real-time: CHANNEL_ERROR في orders_channel');
        } else if (status === 'TIMED_OUT') {
          console.warn('⏰ انتهت مهلة الاتصال في orders_channel');
        }
      }
    });

    // 3️⃣ إعداد قناة الإشعارات (notifications_channel)
    notificationsChannelRef.current = supabase.channel('notifications_channel');

    notificationsChannelRef.current.on('broadcast', { event: 'notification_update' }, (payload) => {
      if (enableLogging) {
        console.log('🔔 إشعار جديد من notifications_channel:', payload);
      }
      
      if (onNotificationUpdate) {
        onNotificationUpdate(payload as NotificationUpdatePayload);
      }
    });

    // الاستماع لتغييرات قاعدة البيانات المباشرة للإشعارات الموحدة
    notificationsChannelRef.current.on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'notifications' // استخدام الجدول الموحد
      },
      (payload) => {
        if (enableLogging) {
          console.log('🔔 إشعار جديد من الجدول الموحد:', payload.new);
        }

        const newNotification = payload.new as any;
        if (onNotificationUpdate) {
          onNotificationUpdate({
            recipient_type: newNotification.recipient_type,
            message: newNotification.message,
            order_id: newNotification.order_id,
            store_id: newNotification.recipient_type === 'store' ? newNotification.recipient_id : undefined,
            notification_type: newNotification.type,
            data: newNotification
          });
        }
      }
    );

    notificationsChannelRef.current.subscribe((status) => {
      if (enableLogging) {
        console.log('📡 notifications_channel status:', status);

        if (status === 'SUBSCRIBED') {
          console.log('✅ Successfully subscribed to notifications_channel');
        } else if (status === 'CHANNEL_ERROR') {
          console.error('❌ خطأ في Real-time: CHANNEL_ERROR في notifications_channel');
        } else if (status === 'TIMED_OUT') {
          console.warn('⏰ انتهت مهلة الاتصال في notifications_channel');
        }
      }
    });

    // Cleanup function
    return () => {
      if (enableLogging) {
        console.log('🧹 Cleaning up Realtime channels...');
      }
      
      if (ordersChannelRef.current) {
        supabase.removeChannel(ordersChannelRef.current);
        ordersChannelRef.current = null;
      }
      
      if (notificationsChannelRef.current) {
        supabase.removeChannel(notificationsChannelRef.current);
        notificationsChannelRef.current = null;
      }
    };
  }, [onOrderUpdate, onNotificationUpdate, enableLogging]);

  // إرجاع دوال للإرسال المباشر للقنوات
  const sendOrderUpdate = (payload: OrderUpdatePayload) => {
    if (ordersChannelRef.current) {
      ordersChannelRef.current.send({
        type: 'broadcast',
        event: 'order_update',
        payload
      });
    }
  };

  const sendNotificationUpdate = (payload: NotificationUpdatePayload) => {
    if (notificationsChannelRef.current) {
      notificationsChannelRef.current.send({
        type: 'broadcast',
        event: 'notification_update',
        payload
      });
    }
  };

  return {
    sendOrderUpdate,
    sendNotificationUpdate,
    isConnected: !!(ordersChannelRef.current && notificationsChannelRef.current)
  };
};

export default useRealtimeChannels;
