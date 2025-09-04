import { supabase } from '@/integrations/supabase/client';
import { RealtimeChannel } from '@supabase/supabase-js';

interface ChannelConfig {
  name: string;
  table: string;
  events: ('INSERT' | 'UPDATE' | 'DELETE')[];
  filter?: string;
  schema?: string;
}

export class RealtimeChannelManager {
  private channels: Map<string, RealtimeChannel> = new Map();
  private retryAttempts: Map<string, number> = new Map();
  private maxRetries = 3;
  private retryDelay = 2000;

  /**
   * إنشاء channel مع معالجة أخطاء CHANNEL_ERROR وإعادة المحاولة
   */
  async createChannelWithRetry(
    config: ChannelConfig,
    onSuccess?: (channel: RealtimeChannel) => void,
    onError?: (error: string) => void
  ): Promise<RealtimeChannel | null> {
    const { name, table, events, filter, schema = 'public' } = config;
    
    // إزالة القناة الموجودة إذا كانت موجودة
    this.removeChannel(name);
    
    console.log(`🔄 إنشاء قناة Real-time: ${name} للجدول ${table}`);
    
    try {
      let channel = supabase.channel(name);
      
      // إضافة مستمعات للأحداث المطلوبة
      events.forEach(event => {
        const config: any = {
          event,
          schema,
          table
        };
        
        if (filter) {
          config.filter = filter;
        }
        
        channel = channel.on('postgres_changes', config, (payload) => {
          console.log(`📨 حدث Real-time في ${name}:`, {
            table,
            event: payload.eventType,
            data: payload.new || payload.old
          });
        });
      });
      
      return new Promise((resolve, reject) => {
        let resolved = false;
        
        channel.subscribe((status) => {
          console.log(`📡 حالة القناة ${name}:`, status);
          
          if (resolved) return;
          
          if (status === 'SUBSCRIBED') {
            console.log(`✅ نجح الاشتراك في القناة ${name}`);
            this.channels.set(name, channel);
            this.retryAttempts.delete(name); // إعادة تعيين عدد المحاولات
            resolved = true;
            
            if (onSuccess) onSuccess(channel);
            resolve(channel);
            
          } else if (status === 'CHANNEL_ERROR') {
            console.error(`❌ خطأ في القناة ${name}: CHANNEL_ERROR`);
            
            const attempts = this.retryAttempts.get(name) || 0;
            
            if (attempts < this.maxRetries) {
              this.retryAttempts.set(name, attempts + 1);
              console.log(`🔄 إعادة المحاولة ${attempts + 1}/${this.maxRetries} للقناة ${name} بعد ${this.retryDelay}ms`);
              
              setTimeout(() => {
                this.createChannelWithRetry(config, onSuccess, onError);
              }, this.retryDelay * (attempts + 1)); // تأخير متزايد
              
            } else {
              console.error(`❌ فشل في إنشاء القناة ${name} بعد ${this.maxRetries} محاولات`);
              resolved = true;
              
              if (onError) onError(`CHANNEL_ERROR بعد ${this.maxRetries} محاولات`);
              reject(new Error(`CHANNEL_ERROR for ${name}`));
            }
            
          } else if (status === 'TIMED_OUT') {
            console.warn(`⏰ انتهت مهلة القناة ${name}، إعادة محاولة...`);
            
            setTimeout(() => {
              this.createChannelWithRetry(config, onSuccess, onError);
            }, this.retryDelay);
            
          } else if (status === 'CLOSED') {
            console.log(`🔒 تم إغلاق القناة ${name}`);
            resolved = true;
            resolve(null);
          }
        });
        
        // مهلة زمنية للاشتراك
        setTimeout(() => {
          if (!resolved) {
            console.error(`⏰ انتهت مهلة انتظار الاشتراك في القناة ${name}`);
            resolved = true;
            supabase.removeChannel(channel);
            reject(new Error(`Subscription timeout for ${name}`));
          }
        }, 15000);
      });
      
    } catch (error) {
      console.error(`❌ خطأ في إنشاء القناة ${name}:`, error);
      if (onError) onError(error instanceof Error ? error.message : String(error));
      return null;
    }
  }
  
  /**
   * إزالة قناة
   */
  removeChannel(name: string): void {
    const channel = this.channels.get(name);
    if (channel) {
      console.log(`🗑️ إزالة القناة ${name}`);
      supabase.removeChannel(channel);
      this.channels.delete(name);
      this.retryAttempts.delete(name);
    }
  }
  
  /**
   * إزالة جميع القنوات
   */
  removeAllChannels(): void {
    console.log('🧹 إزالة جميع القنوات...');
    this.channels.forEach((channel, name) => {
      supabase.removeChannel(channel);
    });
    this.channels.clear();
    this.retryAttempts.clear();
  }
  
  /**
   * الحصول على حالة جميع القنوات
   */
  getChannelsStatus(): { [key: string]: boolean } {
    const status: { [key: string]: boolean } = {};
    this.channels.forEach((channel, name) => {
      status[name] = true; // متصل
    });
    return status;
  }
  
  /**
   * فحص صحة الاتصال بـ Supabase
   */
  async testConnection(): Promise<{
    database: boolean;
    realtime: boolean;
    auth: boolean;
    errors: string[];
  }> {
    const result = {
      database: false,
      realtime: false,
      auth: false,
      errors: [] as string[]
    };
    
    // فحص قاعدة البيانات
    try {
      const { data, error } = await supabase.from('orders').select('count').limit(1);
      if (error) {
        result.errors.push(`Database error: ${error.message}`);
      } else {
        result.database = true;
      }
    } catch (error) {
      result.errors.push(`Database exception: ${error}`);
    }
    
    // فحص المصادقة
    try {
      const { data: session, error } = await supabase.auth.getSession();
      if (error) {
        result.errors.push(`Auth error: ${error.message}`);
      } else {
        result.auth = true;
      }
    } catch (error) {
      result.errors.push(`Auth exception: ${error}`);
    }
    
    // فحص Real-time
    try {
      const testResult = await this.createChannelWithRetry({
        name: `connection-test-${Date.now()}`,
        table: 'orders',
        events: ['INSERT']
      });
      
      if (testResult) {
        result.realtime = true;
        this.removeChannel(`connection-test-${Date.now()}`);
      } else {
        result.errors.push('Realtime connection failed');
      }
    } catch (error) {
      result.errors.push(`Realtime exception: ${error}`);
    }
    
    return result;
  }
}

// إنشاء instance مشترك
export const channelManager = new RealtimeChannelManager();

// دوال مساعدة للاستخدام السريع
export const createOrdersChannel = (
  channelName: string,
  onSuccess?: (channel: RealtimeChannel) => void,
  onError?: (error: string) => void
) => {
  return channelManager.createChannelWithRetry({
    name: channelName,
    table: 'orders',
    events: ['INSERT', 'UPDATE']
  }, onSuccess, onError);
};

export const createNotificationsChannel = (
  channelName: string,
  recipientType: 'admin' | 'store' | 'customer',
  recipientId?: string,
  onSuccess?: (channel: RealtimeChannel) => void,
  onError?: (error: string) => void
) => {
  let filter = `recipient_type=eq.${recipientType}`;
  if (recipientId) {
    filter += `.and.recipient_id=eq.${recipientId}`;
  }

  return channelManager.createChannelWithRetry({
    name: channelName,
    table: 'notifications', // استخدام الجدول الموحد
    events: ['INSERT'],
    filter
  }, onSuccess, onError);
};

export default channelManager;
