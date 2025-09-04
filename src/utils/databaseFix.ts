import { supabase } from '../integrations/supabase/client';

/**
 * ملاحظة: تم إزالة جدول store_order_responses
 * البيانات محفوظة في جدول orders في الأعمدة التالية:
 * - store_response_status
 * - store_response_at  
 * - rejection_reason
 */

/**
 * إنشاء جدول order_store_history إذا لم يكن موجوداً
 */
export async function createOrderStoreHistoryTable(): Promise<{ success: boolean; error?: string }> {
  try {
    console.log('🔧 محاولة إنشاء جدول order_store_history...');

    const createTableSQL = `
      CREATE TABLE IF NOT EXISTS order_store_history (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
        from_store_id UUID REFERENCES stores(id) ON DELETE SET NULL,
        to_store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
        transfer_reason TEXT,
        transferred_by TEXT,
        transferred_at TIMESTAMPTZ DEFAULT NOW(),
        created_at TIMESTAMPTZ DEFAULT NOW()
      );

      -- إنشاء فهارس
      CREATE INDEX IF NOT EXISTS idx_order_store_history_order_id ON order_store_history(order_id);
      CREATE INDEX IF NOT EXISTS idx_order_store_history_from_store ON order_store_history(from_store_id);
      CREATE INDEX IF NOT EXISTS idx_order_store_history_to_store ON order_store_history(to_store_id);
    `;

    const { error } = await supabase.rpc('exec_sql', { 
      sql_query: createTableSQL 
    });

    if (error) {
      console.error('❌ خطأ في إنشاء جدول التاريخ:', error);
      return { success: false, error: error.message };
    }

    console.log('✅ تم إنشاء جدول order_store_history بنجاح');
    return { success: true };

  } catch (error) {
    console.error('❌ خطأ عام في إنشاء جدول التاريخ:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'خطأ غير معروف' 
    };
  }
}

/**
 * إضافة الأعمدة المفقودة لجدول orders
 */
export async function addMissingOrderColumns(): Promise<{ success: boolean; error?: string }> {
  try {
    console.log('🔧 فحص وإضافة أعمدة orders المفقودة...');

    const alterColumns = [
      'ALTER TABLE orders ADD COLUMN IF NOT EXISTS store_response_status TEXT',
      'ALTER TABLE orders ADD COLUMN IF NOT EXISTS store_response_at TIMESTAMPTZ',
      'ALTER TABLE orders ADD COLUMN IF NOT EXISTS rejection_reason TEXT',
      'ALTER TABLE orders ADD COLUMN IF NOT EXISTS assigned_store_name TEXT',
      'ALTER TABLE orders ADD COLUMN IF NOT EXISTS shipping_type TEXT',
      'ALTER TABLE orders ADD COLUMN IF NOT EXISTS customer_rejected BOOLEAN DEFAULT false',
      'ALTER TABLE orders ADD COLUMN IF NOT EXISTS return_reason TEXT',
      'ALTER TABLE orders ADD COLUMN IF NOT EXISTS is_returned BOOLEAN DEFAULT false',
      'ALTER TABLE orders ADD COLUMN IF NOT EXISTS discounted_price NUMERIC'
    ];

    for (const sql of alterColumns) {
      const { error } = await supabase.rpc('exec_sql', { sql_query: sql });
      if (error && !error.message.includes('already exists')) {
        console.warn(`تحذير في تنفيذ: ${sql}`, error.message);
      }
    }

    console.log('✅ تم فحص/إضافة أعمدة orders');
    return { success: true };

  } catch (error) {
    console.error('❌ خطأ في إضافة أعمدة orders:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'خطأ غير معروف' 
    };
  }
}

/**
 * الإصلاح الشامل لقاعدة البيانات
 */
export async function fullDatabaseFix(): Promise<{ success: boolean; errors: string[] }> {
  console.log('🔧 بدء الإصلاح الشامل لقاعدة البيانات...');
  
  const errors: string[] = [];

  // 1. إضافة أعمدة orders المفقودة
  const ordersResult = await addMissingOrderColumns();
  if (!ordersResult.success && ordersResult.error) {
    errors.push(`أعمدة Orders: ${ordersResult.error}`);
  }

  // 2. إنشاء جدول order_store_history
  const historyTableResult = await createOrderStoreHistoryTable();
  if (!historyTableResult.success && historyTableResult.error) {
    errors.push(`جدول التاريخ: ${historyTableResult.error}`);
  }

  const success = errors.length === 0;
  
  if (success) {
    console.log('✅ تم الإصلاح الشامل بنجاح');
  } else {
    console.log('❌ حدثت أخطاء في الإصلاح:', errors);
  }

  return { success, errors };
}

/**
 * اختبار التحديث في جدول orders (بدلاً من store_order_responses)
 */
export async function testOrderStatusUpdate(): Promise<{ success: boolean; error?: string }> {
  try {
    console.log('🧪 اختبار تحديث حالة استجابة المتجر في جدول orders...');

    // البحث عن طلب موجود للاختبار
    const { data: orders, error: fetchError } = await supabase
      .from('orders')
      .select('id')
      .limit(1);

    if (fetchError) {
      return { success: false, error: `خطأ في جلب الطلبات: ${fetchError.message}` };
    }

    if (!orders || orders.length === 0) {
      return { success: false, error: 'لا توجد طلبات للاختبار' };
    }

    const testOrderId = orders[0].id;

    // تحديث حالة استجابة المتجر
    const { error: updateError } = await supabase
      .from('orders')
      .update({
        store_response_status: 'test_response',
        store_response_at: new Date().toISOString(),
        rejection_reason: null
      })
      .eq('id', testOrderId);

    if (updateError) {
      return { success: false, error: updateError.message };
    }

    console.log('✅ نجح اختبار تحديث استجابة المتجر في جدول orders');
    return { success: true };

  } catch (error) {
    console.error('❌ خطأ في الاختبار:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'خطأ غير معروف' 
    };
  }
}
