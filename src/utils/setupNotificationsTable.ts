import { supabase } from '@/integrations/supabase/client';
import { quickCheckNotificationsTable, quickCreateNotificationsTable } from './quickNotificationCheck';

export async function ensureNotificationsTableExists(): Promise<boolean> {
  console.log('🔍 Checking if notifications table exists...');
  
  try {
    const checkResult = await quickCheckNotificationsTable();
    
    if (checkResult.exists && !checkResult.needsMigration) {
      console.log('✅ Notifications table already exists and is working properly');
      return true;
    }
    
    if (checkResult.needsMigration || !checkResult.exists) {
      console.log('🔧 Creating notifications table...');
      const createResult = await quickCreateNotificationsTable();
      
      if (createResult.success) {
        console.log('✅ Notifications table created successfully');
        
        // Add additional fields for the notification system
        const enhancementSQL = `
          ALTER TABLE notifications 
          ADD COLUMN IF NOT EXISTS url TEXT,
          ADD COLUMN IF NOT EXISTS priority TEXT CHECK (priority IN ('low', 'medium', 'high', 'urgent')) DEFAULT 'medium',
          ADD COLUMN IF NOT EXISTS type TEXT DEFAULT 'general',
          ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT now();

          CREATE INDEX IF NOT EXISTS idx_notifications_priority ON notifications(priority);
          CREATE INDEX IF NOT EXISTS idx_notifications_type ON notifications(type);
          CREATE INDEX IF NOT EXISTS idx_notifications_url ON notifications(url);
        `;

        const { error: enhanceError } = await supabase.rpc('execute_sql', {
          sql_query: enhancementSQL
        });

        if (enhanceError) {
          console.warn('⚠️ Failed to add enhancement columns:', enhanceError);
        } else {
          console.log('✅ Notifications table enhanced successfully');
        }
        
        return true;
      } else {
        console.error('❌ Failed to create notifications table:', createResult.error);
        return false;
      }
    }
    
    return true;
  } catch (error) {
    console.error('❌ Error ensuring notifications table exists:', error);
    return false;
  }
}

export async function addSampleNotifications(storeId: string): Promise<boolean> {
  try {
    console.log('📝 Adding sample notifications for store:', storeId);
    
    const sampleNotifications = [
      {
        recipient_type: 'store',
        recipient_id: storeId,
        title: 'مرحباً بك في نظام الإشعارات',
        message: 'تم تفعيل نظام الإشعارات الجديد بنجاح. ستصلك الآن إشعارات فورية للطلبات الجديدة والتحديثات المهمة.',
        type: 'system',
        priority: 'medium',
        read: false,
        sent: true,
        url: '/store-dashboard'
      },
      {
        recipient_type: 'store',
        recipient_id: storeId,
        title: 'طلب تجريبي جديد',
        message: 'وصل طلب تجريبي رقم TEST-001 من العميل أحمد محمد. يرجى المراجعة والرد سريعاً.',
        type: 'order_assigned',
        priority: 'high',
        read: false,
        sent: true,
        order_id: 'sample-order-1',
        url: '/store-dashboard'
      },
      {
        recipient_type: 'store',
        recipient_id: storeId,
        title: 'تحديث مهم',
        message: 'تم إضافة ميزات جديدة لتحسين تجربة المتاجر. تعرف على المزيد من التحديثات.',
        type: 'general',
        priority: 'low',
        read: true,
        sent: true,
        url: '/updates'
      }
    ];

    for (const notification of sampleNotifications) {
      const { error } = await supabase
        .from('notifications')
        .insert(notification);

      if (error) {
        console.warn('⚠️ Failed to insert sample notification:', error);
      }
    }

    console.log('✅ Sample notifications added successfully');
    return true;
  } catch (error) {
    console.error('❌ Error adding sample notifications:', error);
    return false;
  }
}
