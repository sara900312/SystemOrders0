// Enhanced Supabase Realtime Notification Service
// خدمة الإشعارات المحسنة مع Supabase Realtime

import { createClient, SupabaseClient, RealtimeChannel } from '@supabase/supabase-js';
import { ServiceWorkerNotifications, showOrderNotification } from './serviceWorkerNotifications';

export interface OrderNotification {
  id: string;
  customer_name?: string;
  total?: number;
  store_id?: string;
  status?: string;
  created_at?: string;
  customer_location?: string;
  items?: any[];
}

export class EnhancedSupabaseNotificationService {
  private static instance: EnhancedSupabaseNotificationService;
  private supabase: SupabaseClient;
  private ordersChannel: RealtimeChannel | null = null;
  private isConnected = false;
  private swNotificationService: ServiceWorkerNotifications;

  private constructor() {
    // Initialize Supabase client with environment variables
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://wkzjovhlljeaqzoytpeb.supabase.co';
    const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndrempvdmhsbGplYXF6b3l0cGViIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDkwNDY2MjIsImV4cCI6MjA2NDYyMjYyMn0.mx8PnQJaMochaPbjYUmwzlVNIULM05LUDBIM7OFFjZ8';
    
    this.supabase = createClient(supabaseUrl, supabaseKey);
    this.swNotificationService = ServiceWorkerNotifications.getInstance();
    
    console.log('🔧 Enhanced Supabase Notification Service initialized');
  }

  public static getInstance(): EnhancedSupabaseNotificationService {
    if (!EnhancedSupabaseNotificationService.instance) {
      EnhancedSupabaseNotificationService.instance = new EnhancedSupabaseNotificationService();
    }
    return EnhancedSupabaseNotificationService.instance;
  }

  // Initialize realtime connection and start listening for orders
  async initialize(): Promise<boolean> {
    try {
      console.log('🔧 Initializing Supabase realtime connection...');

      // Ensure Service Worker notifications are ready
      await this.swNotificationService.registerServiceWorker();
      await this.swNotificationService.requestPermission();

      // Create orders channel
      this.ordersChannel = this.supabase.channel('orders_channel');

      // Listen for new orders (INSERT events)
      this.ordersChannel
        .on('postgres_changes', {
          event: 'INSERT',
          schema: 'public',
          table: 'orders'
        }, (payload) => {
          console.log('📦 New order received:', payload);
          this.handleNewOrder(payload.new as OrderNotification);
        })
        
        // Listen for order updates (UPDATE events)
        .on('postgres_changes', {
          event: 'UPDATE',
          schema: 'public',
          table: 'orders'
        }, (payload) => {
          console.log('📝 Order updated:', payload);
          this.handleOrderUpdate(payload.new as OrderNotification, payload.old as OrderNotification);
        })
        
        // Handle connection status
        .on('system', {}, (payload) => {
          console.log('🔌 Realtime system event:', payload);
        })
        
        // Subscribe to the channel
        .subscribe((status) => {
          console.log('📡 Realtime subscription status:', status);
          this.isConnected = status === 'SUBSCRIBED';
          
          if (this.isConnected) {
            console.log('✅ Successfully connected to Supabase realtime orders channel');
            this.notifyConnectionStatus(true);
          } else if (status === 'CHANNEL_ERROR') {
            console.error('❌ Failed to connect to Supabase realtime');
            this.notifyConnectionStatus(false);
          }
        });

      return true;
    } catch (error) {
      console.error('❌ Failed to initialize Supabase realtime:', error);
      return false;
    }
  }

  // Handle new order notifications
  private async handleNewOrder(order: OrderNotification): Promise<void> {
    try {
      console.log('🔔 Processing new order notification:', order);

      // Format order details for notification
      const orderAmount = order.total ? `${order.total} ريال` : '';
      const customerName = order.customer_name || 'عميل جديد';
      
      // Create notification body
      const notificationBody = [
        `من: ${customerName}`,
        orderAmount && `المبلغ: ${orderAmount}`,
        order.customer_location && `الموقع: ${order.customer_location}`,
      ].filter(Boolean).join(' • ');

      // Show enhanced notification with action buttons
      const success = await showOrderNotification(`طلب جد��د #${order.id}`, {
        body: notificationBody,
        icon: '/icons/order.svg',
        actions: [
          { action: 'accept', title: 'قبول الطلب', icon: '/icons/check.svg' },
          { action: 'reject', title: 'رفض الطلب', icon: '/icons/close.svg' },
          { action: 'view', title: 'عرض التفاصيل', icon: '/icons/view.svg' }
        ],
        tag: `order-${order.id}`,
        renotify: true,
        requireInteraction: true,
        order_id: order.id,
        type: 'order',
        data: {
          order_id: order.id,
          customer_name: customerName,
          total: order.total,
          source: 'supabase_realtime'
        }
      });

      if (success) {
        console.log(`✅ Order notification sent successfully for order #${order.id}`);
        
        // Dispatch custom event for UI components
        window.dispatchEvent(new CustomEvent('newOrderNotification', {
          detail: {
            order,
            notificationSent: true,
            timestamp: new Date().toISOString()
          }
        }));
      } else {
        console.warn(`⚠️ Failed to send notification for order #${order.id}`);
      }

    } catch (error) {
      console.error('❌ Error handling new order notification:', error);
    }
  }

  // Handle order update notifications
  private async handleOrderUpdate(newOrder: OrderNotification, oldOrder: OrderNotification): Promise<void> {
    try {
      // Only notify for significant status changes
      if (newOrder.status !== oldOrder.status) {
        let notificationTitle = '';
        let notificationBody = '';
        
        switch (newOrder.status) {
          case 'accepted':
            notificationTitle = `تم قبول الطلب #${newOrder.id}`;
            notificationBody = 'تم قبول طلبك بنجاح وسيتم التحضير قريباً';
            break;
            
          case 'rejected':
            notificationTitle = `تم رفض الطلب #${newOrder.id}`;
            notificationBody = 'نعتذر، تم رفض طلبك';
            break;
            
          case 'preparing':
            notificationTitle = `جاري تحضير الطلب #${newOrder.id}`;
            notificationBody = 'بدء تحضير طلبك';
            break;
            
          case 'ready':
            notificationTitle = `الطلب جاهز #${newOrder.id}`;
            notificationBody = 'طلبك جاهز للاستلام أو التوصيل';
            break;
            
          case 'completed':
            notificationTitle = `تم إكمال الطلب #${newOrder.id}`;
            notificationBody = 'شكراً لك! تم إكمال طلبك بنجاح';
            break;
        }

        if (notificationTitle) {
          await showOrderNotification(notificationTitle, {
            body: notificationBody,
            icon: '/icons/order.svg',
            tag: `order-update-${newOrder.id}`,
            order_id: newOrder.id,
            type: 'order_update',
            actions: [
              { action: 'view', title: 'عرض الطلب', icon: '/icons/view.svg' }
            ]
          });

          // Dispatch update event
          window.dispatchEvent(new CustomEvent('orderStatusUpdate', {
            detail: {
              orderId: newOrder.id,
              oldStatus: oldOrder.status,
              newStatus: newOrder.status,
              timestamp: new Date().toISOString()
            }
          }));
        }
      }
    } catch (error) {
      console.error('❌ Error handling order update notification:', error);
    }
  }

  // Send connection status notification
  private async notifyConnectionStatus(connected: boolean): Promise<void> {
    const title = connected ? 'متصل بالخادم' : 'انقطع الاتصال';
    const body = connected 
      ? 'تم الاتصال بخادم الإشعارات بنج��ح' 
      : 'انقطع الاتصال مع خادم الإشعارات';

    await showOrderNotification(title, {
      body,
      icon: '/icons/icon-192x192.svg',
      tag: 'connection-status',
      type: 'system',
      requireInteraction: false,
      actions: []
    });
  }

  // Test the notification system
  async testNotification(orderId: string = 'TEST-123'): Promise<boolean> {
    const testOrder: OrderNotification = {
      id: orderId,
      customer_name: 'أحمد محمد',
      total: 150.50,
      store_id: 'store-1',
      status: 'pending',
      customer_location: 'الرياض',
      created_at: new Date().toISOString(),
      items: [
        { name: 'برجر لحم', quantity: 2, price: 45.00 },
        { name: 'بطاطس مقلية', quantity: 1, price: 20.50 },
        { name: 'مشروب غازي', quantity: 2, price: 15.00 }
      ]
    };

    console.log('🧪 Testing notification system with mock order:', testOrder);
    await this.handleNewOrder(testOrder);
    return true;
  }

  // Manually trigger a new order notification
  async sendManualOrderNotification(order: Partial<OrderNotification>): Promise<boolean> {
    const fullOrder: OrderNotification = {
      id: order.id || `MANUAL-${Date.now()}`,
      customer_name: order.customer_name || 'عميل',
      total: order.total || 0,
      status: order.status || 'pending',
      created_at: new Date().toISOString(),
      ...order
    };

    await this.handleNewOrder(fullOrder);
    return true;
  }

  // Check connection status
  isRealtimeConnected(): boolean {
    return this.isConnected;
  }

  // Get Supabase client for other operations
  getSupabaseClient(): SupabaseClient {
    return this.supabase;
  }

  // Disconnect from realtime
  disconnect(): void {
    if (this.ordersChannel) {
      this.supabase.removeChannel(this.ordersChannel);
      this.ordersChannel = null;
      this.isConnected = false;
      console.log('🔌 Disconnected from Supabase realtime');
    }
  }

  // Get service status
  getStatus() {
    return {
      connected: this.isConnected,
      hasChannel: !!this.ordersChannel,
      supabaseInitialized: !!this.supabase,
      serviceWorkerReady: this.swNotificationService.getSystemInfo().registered
    };
  }
}

// Export helper functions for direct use
export async function initializeEnhancedNotifications(): Promise<boolean> {
  const service = EnhancedSupabaseNotificationService.getInstance();
  return service.initialize();
}

export async function sendTestOrderNotification(orderId?: string): Promise<boolean> {
  const service = EnhancedSupabaseNotificationService.getInstance();
  return service.testNotification(orderId);
}

export function getSupabaseNotificationService(): EnhancedSupabaseNotificationService {
  return EnhancedSupabaseNotificationService.getInstance();
}

// Export the main service
export default EnhancedSupabaseNotificationService;
