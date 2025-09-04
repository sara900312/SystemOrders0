import { supabase } from '@/integrations/supabase/client';
import { storeNotificationService, handleOrderAssignmentNotification } from '@/services/storeNotificationService';
import { centralNotificationManager } from '@/services/centralNotificationManager';

// متغيرات لمنع تكرار التشغيل
let isInitialized = false;
let reminderIntervalId: NodeJS.Timeout | null = null;
let ordersChannel: any = null;
let orderDivisionsChannel: any = null;

// دالة لمراقبة الطلبات الجديدة وإرسال إشعارات تلقائية
export const initializeOrderNotificationTriggers = () => {
  // منع التكرار
  if (isInitialized) {
    console.log('ℹ️ Order notification triggers already initialized, skipping...');
    return () => {};
  }
  console.log('🔔 Initializing order notification triggers...');
  isInitialized = true;

  // م���اقبة إدراج طلبات جديدة
  ordersChannel = supabase
    .channel('orders-notifications')
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'orders'
      },
      async (payload) => {
        console.log('📦 New order detected:', payload.new);
        
        const order = payload.new as any;
        
        // إرسال إشعار للمتج�� إذا كان الطلب مُعيَّن
        if (order.assigned_store_id && order.customer_name) {
          await handleOrderAssignmentNotification(
            order.id,
            order.order_code || order.id.slice(0, 8),
            order.assigned_store_id,
            order.customer_name
          );
        }
      }
    )
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'orders'
      },
      async (payload) => {
        console.log('🔄 Order updated:', payload);
        
        const oldOrder = payload.old as any;
        const newOrder = payload.new as any;
        
        // إرسال إشعار عند تعيين طلب لمتجر لأول مرة
        if (!oldOrder.assigned_store_id && newOrder.assigned_store_id) {
          console.log('🏪 Order assigned to store, sending notification...');

          // استخدام المدير المركزي مباشرة مع key فريد لمنع التكرار
          await centralNotificationManager.notifyStore(
            newOrder.assigned_store_id,
            'طلب جديد وصل!',
            `وصل طلب جديد رقم ${newOrder.order_code || newOrder.id.slice(0, 8)} من العميل ${newOrder.customer_name || 'عميل'}. يرجى المراجعة والرد سريعاً.`,
            newOrder.id
          );
        }
        
        // إرسال إشعار عند تغيير حالة الطلب من قبل الإدارة
        if (oldOrder.order_status !== newOrder.order_status && newOrder.assigned_store_id) {
          let notificationMessage = '';
          let notificationTitle = '';
          
          switch (newOrder.order_status) {
            case 'urgent':
              notificationTitle = 'طلب عاجل!';
              notificationMessage = `تم تحديد الطلب رقم ${newOrder.order_code} كطلب عاجل. يرجى المعالجة فوراً!`;
              break;
            case 'cancelled':
              notificationTitle = 'تم إلغاء الطلب';
              notificationMessage = `تم إلغاء الطلب رقم ${newOrder.order_code} من قبل الإدارة.`;
              break;
            default:
              // لا نرسل إشعارات للحالات الأخرى
              return;
          }
          
          if (notificationMessage) {
            await storeNotificationService.sendSystemNotification(
              newOrder.assigned_store_id,
              notificationTitle,
              notificationMessage
            );
          }
        }
      }
    )
    .subscribe();

  // مراقبة إنشاء order_divisions جديدة (للطلبات الموحدة)
  orderDivisionsChannel = supabase
    .channel('order-divisions-notifications')
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'order_divisions'
      },
      async (payload) => {
        console.log('📦 New order division detected:', payload.new);
        
        const division = payload.new as any;
        
        if (division.store_id && division.order_id) {
          try {
            // الحصول على تفاصيل الطلب الأصلي
            const { data: order, error } = await supabase
              .from('orders')
              .select('order_code, customer_name')
              .eq('id', division.order_id)
              .single();

            if (!error && order) {
              await storeNotificationService.notifyNewOrder(
                division.store_id,
                order.order_code || 'طلب موحد',
                order.customer_name || 'عميل',
                division.order_id
              );
            }
          } catch (error) {
            console.error('❌ Error sending order division notification:', {
              error: error,
              formattedError: JSON.stringify(error, null, 2),
              operation: 'sendOrderDivisionNotification',
              divisionId: division.id,
              storeId: division.store_id,
              orderId: division.order_id,
              stack: error?.stack
            });
          }
        }
      }
    )
    .subscribe();

  console.log('✅ Order notification triggers initialized');

  return () => {
    console.log('🧹 Cleaning up order notification triggers...');
    isInitialized = false;

    if (ordersChannel) {
      supabase.removeChannel(ordersChannel);
      ordersChannel = null;
    }

    if (orderDivisionsChannel) {
      supabase.removeChannel(orderDivisionsChannel);
      orderDivisionsChannel = null;
    }

    console.log('✅ Order notification triggers cleaned up');
  };
};

// دالة لإرسال إشعارات تذكي�� دورية للطلبات المعلقة
export const startPeriodicReminders = () => {
  // منع تكرار تشغيل النظام
  if (reminderIntervalId !== null) {
    console.log('ℹ️ Periodic reminder system already running, skipping...');
    return () => {};
  }

  console.log('⏰ Starting periodic reminder system...');
  
  const sendReminders = async () => {
    try {
      console.log('🔍 Checking for orders needing reminders...');
      
      const fiveMinutesAgo = new Date();
      fiveMinutesAgo.setMinutes(fiveMinutesAgo.getMinutes() - 5);
      
      // البحث عن الطلبات التي لم يتم الرد عليها لأكثر من 5 دقائق
      const { data: orders, error } = await supabase
        .from('orders')
        .select('id, order_code, assigned_store_id, created_at')
        .eq('order_status', 'assigned')
        .is('store_response_status', null)
        .lt('created_at', fiveMinutesAgo.toISOString());

      if (error) {
        console.error('❌ Error fetching orders for reminders:', {
          error: error,
          formattedError: JSON.stringify(error, null, 2),
          timeWindow: fiveMinutesAgo.toISOString(),
          operation: 'fetchOrdersForReminders',
          query: 'orders.eq(order_status, assigned).is(store_response_status, null).lt(created_at, timeWindow)'
        });
        return;
      }

      if (orders && orders.length > 0) {
        console.log(`📋 Found ${orders.length} orders needing reminders`);
        
        for (const order of orders) {
          if (order.assigned_store_id) {
            await storeNotificationService.sendOrderReminder(
              order.assigned_store_id,
              order.order_code || order.id.slice(0, 8),
              order.id
            );
          }
        }
      } else {
        console.log('✅ No orders need reminders at this time');
      }
    } catch (error) {
      console.error('❌ Error in periodic reminder system:', {
        error: error,
        formattedError: JSON.stringify(error, null, 2),
        operation: 'periodicReminderSystem',
        timeWindow: fiveMinutesAgo?.toISOString(),
        stack: error?.stack
      });
    }
  };

  // تشغيل التذ��يرات كل 5 دقائق
  reminderIntervalId = setInterval(sendReminders, 5 * 60 * 1000);

  // تشغيل فوري عند البدء
  sendReminders();

  console.log('✅ Periodic reminder system started');

  return () => {
    console.log('🧹 Stopping periodic reminder system...');
    if (reminderIntervalId) {
      clearInterval(reminderIntervalId);
      reminderIntervalId = null;
    }
    console.log('✅ Periodic reminder system stopped');
  };
};

// دالة لتنظيف جميع أنظمة الإشعارات
export const cleanupNotificationSystems = () => {
  console.log('🧹 Cleaning up all notification systems...');

  // تنظيف triggers
  isInitialized = false;

  if (ordersChannel) {
    supabase.removeChannel(ordersChannel);
    ordersChannel = null;
  }

  if (orderDivisionsChannel) {
    supabase.removeChannel(orderDivisionsChannel);
    orderDivisionsChannel = null;
  }

  // تنظيف reminder system
  if (reminderIntervalId) {
    clearInterval(reminderIntervalId);
    reminderIntervalId = null;
  }

  console.log('✅ All notification systems cleaned up');
};

// دالة مساعدة لإرسال إشعار اختبار لجميع المتاجر
export const sendTestBroadcast = async () => {
  const currentTime = new Date().toLocaleTimeString('ar');
  
  return await storeNotificationService.sendBroadcastNotification(
    'رسالة تجريبية',
    `هذه رسالة تجريبية تم إرسالها لجميع المتاجر في الساعة ${currentTime}`,
    'general'
  );
};

// دالة للحصول على إحصائيات الإشعارات لجميع المتاجر
export const getGlobalNotificationStats = async () => {
  try {
    const { data, error } = await supabase
      .from('notifications')
      .select('recipient_id, read, created_at')
      .eq('recipient_type', 'store');

    if (error || !data) {
      return { totalStores: 0, totalNotifications: 0, unreadNotifications: 0, storeStats: {} };
    }

    const storeStats: Record<string, { total: number; unread: number }> = {};
    
    data.forEach(notification => {
      const storeId = notification.recipient_id;
      if (!storeStats[storeId]) {
        storeStats[storeId] = { total: 0, unread: 0 };
      }
      storeStats[storeId].total++;
      if (!notification.read) {
        storeStats[storeId].unread++;
      }
    });

    return {
      totalStores: Object.keys(storeStats).length,
      totalNotifications: data.length,
      unreadNotifications: data.filter(n => !n.read).length,
      storeStats
    };
  } catch (error) {
    console.error('❌ Error getting global notification stats:', {
      error: error,
      formattedError: JSON.stringify(error, null, 2),
      operation: 'getGlobalNotificationStats',
      stack: error?.stack
    });
    return { totalStores: 0, totalNotifications: 0, unreadNotifications: 0, storeStats: {} };
  }
};
