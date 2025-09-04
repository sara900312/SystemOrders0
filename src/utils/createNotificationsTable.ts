import { supabase } from '@/integrations/supabase/client';

/**
 * التحقق من وجود جدول notifications وإنشاؤه إذا لم يكن موجوداً
 */
export async function checkAndCreateNotificationsTable(): Promise<{
  exists: boolean;
  created?: boolean;
  error?: string;
}> {
  try {
    console.log('🔍 Checking if notifications table exists...');

    // محاولة جلب سجل واحد من الجدول للتحقق من وجوده
    const { data, error } = await supabase
      .from('notifications')
      .select('id')
      .limit(1);

    if (!error) {
      console.log('✅ Notifications table exists');
      return { exists: true };
    }

    // إذا كان الخطأ يشير إلى عدم وجود الجدول
    if (error.code === 'PGRST116' || error.message?.includes('does not exist')) {
      console.log('❌ Notifications table does not exist');
      
      // في بيئة production، لا يمكننا إنشاء الجدول مباشرة
      // لذا سنعطي تعليمات للمستخدم
      console.log(`
📝 To create the notifications table, please run this SQL in your Supabase dashboard:

CREATE TABLE notifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  recipient_id TEXT NOT NULL,
  recipient_type TEXT NOT NULL CHECK (recipient_type IN ('store', 'admin', 'customer')),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  order_id TEXT,
  read BOOLEAN DEFAULT false,
  sent BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX idx_notifications_recipient ON notifications(recipient_id, recipient_type);
CREATE INDEX idx_notifications_order ON notifications(order_id);
CREATE INDEX idx_notifications_created_at ON notifications(created_at);

-- Enable RLS (Row Level Security)
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Create policies (adjust as needed for your security requirements)
CREATE POLICY "Enable read access for authenticated users" ON notifications
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Enable insert for authenticated users" ON notifications
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Enable update for authenticated users" ON notifications
  FOR UPDATE USING (auth.role() = 'authenticated');
      `);

      return { 
        exists: false, 
        error: 'Table does not exist. Please create it using the SQL provided in console.' 
      };
    }

    // خطأ آخر غير متوقع
    console.error('❌ Unexpected error checking notifications table:', error);
    return { 
      exists: false, 
      error: `Unexpected error: ${error.message}` 
    };

  } catch (exception) {
    console.error('❌ Exception checking notifications table:', exception);
    return { 
      exists: false, 
      error: `Exception: ${exception instanceof Error ? exception.message : String(exception)}` 
    };
  }
}

/**
 * اختبار إنشاء إشعار في الجدول
 */
export async function testNotificationsTable(): Promise<boolean> {
  try {
    const testNotification = {
      recipient_id: 'test-user',
      recipient_type: 'admin',
      title: 'Test Notification',
      message: 'This is a test notification to verify table functionality',
      read: false,
      sent: false
    };

    const { data, error } = await supabase
      .from('notifications')
      .insert(testNotification)
      .select()
      .single();

    if (error) {
      console.error('❌ Failed to insert test notification:', error);
      return false;
    }

    if (data) {
      console.log('✅ Test notification created successfully:', data.id);
      
      // حذف الإشعار التجريبي
      await supabase
        .from('notifications')
        .delete()
        .eq('id', data.id);
      
      console.log('🧹 Test notification cleaned up');
      return true;
    }

    return false;
  } catch (error) {
    console.error('❌ Exception testing notifications table:', error);
    return false;
  }
}

/**
 * تشغيل جميع فحوصات جدول الإشعارات
 */
export async function initializeNotificationsTable(): Promise<boolean> {
  console.log('🚀 Initializing notifications table...');

  const checkResult = await checkAndCreateNotificationsTable();
  
  if (!checkResult.exists) {
    console.error('⚠️ Notifications table setup required:', checkResult.error);
    return false;
  }

  const testResult = await testNotificationsTable();
  
  if (!testResult) {
    console.error('⚠️ Notifications table test failed');
    return false;
  }

  console.log('✅ Notifications table is ready!');
  return true;
}
