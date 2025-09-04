import { supabase } from '@/integrations/supabase/client';
import { getErrorMessage, isNotFoundError } from '@/utils/errorLogger';

export interface DivisionCompletionStatus {
  isComplete: boolean;
  totalDivisions: number;
  acceptedDivisions: number;
  rejectedDivisions: number;
  pendingDivisions: number;
  completionPercentage: number;
  status: 'completed' | 'incomplete' | 'partially_completed';
  statusLabel: string;
}

export interface DivisionInfo {
  id: string;
  store_name: string;
  store_response_status?: string;
  order_status: string;
  rejection_reason?: string;
}

/**
 * حساب حالة الاكتمال للطلبات المقسمة
 * @param originalOrderId معرف الطلب الأصلي
 * @returns حالة الاكتمال التفصيلية
 */
export async function calculateDivisionCompletionStatus(
  originalOrderId: string
): Promise<DivisionCompletionStatus> {
  try {
    console.log('🔍 حساب حالة الاكتم��ل للطلب المقسم:', originalOrderId);

    // جلب جميع التقسيمات للطلب الأصلي
    const { data: divisions, error } = await supabase
      .from('orders')
      .select(`
        id,
        main_store_name,
        store_response_status,
        order_status,
        rejection_reason,
        order_details
      `)
      .like('order_details', `%تم تقسيمه من الطلب الأصلي ${originalOrderId}%`);

    if (error) {
      const errorMessage = getErrorMessage(error, 'خطأ في جلب تقسيمات ��لطلب');
      // تسجيل الخطأ بمستوى منخفض لأنه لا يؤثر على عملي���� المتجر
      console.info('ℹ️ جلب تقسيمات الطلب (خطأ غير حرج):', {
        message: errorMessage,
        rawError: error,
        code: error.code,
        details: error.details,
        hint: error.hint,
        originalOrderId: originalOrderId
      });
      throw error;
    }

    if (!divisions || divisions.length === 0) {
      console.log('ℹ️ لم يتم العثور على تقسيمات للطلب:', originalOrderId);
      return {
        isComplete: false,
        totalDivisions: 0,
        acceptedDivisions: 0,
        rejectedDivisions: 0,
        pendingDivisions: 0,
        completionPercentage: 0,
        status: 'incomplete',
        statusLabel: 'لا توجد تقسيما��'
      };
    }

    // حساب الإحصائيات
    const totalDivisions = divisions.length;
    const acceptedDivisions = divisions.filter(d => 
      d.store_response_status === 'available' || d.store_response_status === 'accepted'
    ).length;
    const rejectedDivisions = divisions.filter(d => 
      d.store_response_status === 'unavailable' || d.store_response_status === 'rejected'
    ).length;
    const pendingDivisions = divisions.filter(d => 
      !d.store_response_status || d.store_response_status === 'pending'
    ).length;

    const completionPercentage = Math.round((acceptedDivisions / totalDivisions) * 100);

    // تحديد حالة الاكتمال
    let status: 'completed' | 'incomplete' | 'partially_completed';
    let statusLabel: string;
    let isComplete: boolean;

    if (acceptedDivisions === totalDivisions) {
      // جميع المتاجر وافقت
      status = 'completed';
      statusLabel = 'مكتملة - جميع المتاجر وافقت';
      isComplete = true;
    } else if (rejectedDivisions === totalDivisions) {
      // جميع المتاجر رفضت
      status = 'incomplete';
      statusLabel = 'غير مكتملة - جميع المتاجر رفضت';
      isComplete = false;
    } else if (pendingDivisions === 0) {
      // ��ا توجد متاجر معلقة، لكن هناك خليط من القبول والرفض
      status = 'partially_completed';
      statusLabel = `مكتملة جزئياً - ${acceptedDivisions} من ${totalDivisions} متاج�� و��فقت`;
      isComplete = false;
    } else {
      // لا تزال هناك متاجر لم ترد
      status = 'incomplete';
      statusLabel = `غير مكتملة - ${pendingDivisions} متاجر لم ترد بعد`;
      isComplete = false;
    }

    const result: DivisionCompletionStatus = {
      isComplete,
      totalDivisions,
      acceptedDivisions,
      rejectedDivisions,
      pendingDivisions,
      completionPercentage,
      status,
      statusLabel
    };

    console.log('✅ حالة الاكتمال للطلب المقسم:', result);
    return result;

  } catch (error) {
    const errorMessage = getErrorMessage(error, 'خطأ في حساب حالة الاكتمال');
    // تسجيل الخطأ بمستوى منخفض لأنه لا يؤثر على عملية المتجر
    console.info('ℹ️ حساب حالة الاكتمال (خطأ غير حرج):', {
      message: errorMessage,
      rawError: error,
      code: error?.code,
      details: error?.details,
      hint: error?.hint,
      originalOrderId: originalOrderId
    });
    
    // إرجاع قيم افتراضية في حالة الخطأ
    return {
      isComplete: false,
      totalDivisions: 0,
      acceptedDivisions: 0,
      rejectedDivisions: 0,
      pendingDivisions: 0,
      completionPercentage: 0,
      status: 'incomplete',
      statusLabel: 'خطأ في تحديد الحالة'
    };
  }
}

/**
 * جلب تفاصيل التقسيمات مع حالة الاكتمال
 * @param originalOrderId معرف الطلب الأصلي
 * @returns تفاصيل التقسيمات مع حال�� الاكتمال
 */
export async function getDivisionsWithCompletionStatus(
  originalOrderId: string
): Promise<{
  divisions: DivisionInfo[];
  completionStatus: DivisionCompletionStatus;
}> {
  try {
    console.log('🔍 جلب التقسيمات مع حالة الاكتمال للطلب:', originalOrderId);

    // جلب تفاصيل التقسيمات
    const { data: divisions, error } = await supabase
      .from('orders')
      .select(`
        id,
        main_store_name,
        store_response_status,
        order_status,
        rejection_reason,
        order_details,
        customer_name,
        total_amount,
        created_at
      `)
      .like('order_details', `%تم تقسيمه من الطلب ا��أصلي ${originalOrderId}%`)
      .order('created_at', { ascending: false });

    if (error) {
      throw error;
    }

    const divisionsInfo: DivisionInfo[] = (divisions || []).map(d => ({
      id: d.id,
      store_name: d.main_store_name || 'متجر غير معروف',
      store_response_status: d.store_response_status,
      order_status: d.order_status,
      rejection_reason: d.rejection_reason
    }));

    // حساب حالة الاكتمال
    const completionStatus = await calculateDivisionCompletionStatus(originalOrderId);

    return {
      divisions: divisionsInfo,
      completionStatus
    };

  } catch (error) {
    const errorMessage = getErrorMessage(error, 'خطأ في جلب ��لتقسيمات مع حالة الاكتمال');
    // تسجيل الخطأ بمستوى منخفض لأنه لا يؤثر على عملية المتجر
    console.info('ℹ️ جلب التقسيمات مع حالة الاكتمال (خطأ غير حرج):', {
      message: errorMessage,
      rawError: error,
      code: error?.code,
      details: error?.details,
      hint: error?.hint,
      originalOrderId: originalOrderId
    });
    throw error;
  }
}

/**
 * تحديث حالة الطلب الأصلي بناءً على حالة التقسيمات
 * @param originalOrderId معرف الطلب الأصلي
 * @returns نتيجة التحديث
 */
export async function updateOriginalOrderBasedOnDivisions(
  originalOrderId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    console.log('🔄 تحديث حالة الطلب الأصلي بناءً على التقسيمات:', originalOrderId);

    // حساب حالة الاكتمال
    const completionStatus = await calculateDivisionCompletionStatus(originalOrderId);

    // تحدي�� الحالة الجديدة للطلب ا��أصلي
    let newOrderStatus: string;
    let orderNotes = '';

    switch (completionStatus.status) {
      case 'completed':
        newOrderStatus = 'assigned'; // جميع التقسيمات تم قبولها
        orderNotes = `الطلب مكتمل - جميع المتاجر (${completionStatus.totalDivisions}) وافقت`;
        break;
        
      case 'partially_completed':
        newOrderStatus = 'assigned'; // بعض التقسيمات تم قبولها
        orderNotes = `الطلب مكتمل جزئياً - ${completionStatus.acceptedDivisions} من ${completionStatus.totalDivisions} متاجر وافقت`;
        break;
        
      case 'incomplete':
        if (completionStatus.rejectedDivisions === completionStatus.totalDivisions) {
          newOrderStatus = 'rejected'; // جميع المتاجر رفضت
          orderNotes = `الطلب مرفوض - جميع المتاجر (${completionStatus.totalDivisions}) رفضت`;
        } else {
          newOrderStatus = 'pending'; // لا تزال هناك ردود معلقة
          orderNotes = `في الانتظار - ${completionStatus.pendingDivisions} متاجر لم ترد بعد`;
        }
        break;
        
      default:
        newOrderStatus = 'pending';
        orderNotes = 'حالة غير محددة';
    }

    // البحث عن الطلب الأصلي وتحديثه (إذا كان موجوداً)
    const { data: originalOrder, error: fetchError } = await supabase
      .from('orders')
      .select('id, order_status, order_details')
      .eq('id', originalOrderId)
      .single();

    if (fetchError && !isNotFoundError(fetchError)) {
      const errorMessage = getErrorMessage(fetchError, 'خطأ في البحث عن الطلب الأصلي');
      // تقليل مستوى الرسالة لأنها غير مهمة للمستخدم النهائي
      console.info('ℹ️ البحث عن الطلب الأصلي (خطأ غير حرج):', {
        message: errorMessage,
        code: fetchError.code,
        details: fetchError.details,
        originalOrderId: originalOrderId
      });
    }

    // إذا كان الطلب الأصلي موجوداً، نحدث حالته
    if (originalOrder) {
      const { error: updateError } = await supabase
        .from('orders')
        .update({
          order_status: newOrderStatus,
          order_details: `${originalOrder.order_details || ''}\n\nحالة التقسيم: ${orderNotes}`,
          updated_at: new Date().toISOString()
        })
        .eq('id', originalOrderId);

      if (updateError) {
        const errorMessage = getErrorMessage(updateError, 'خطأ في تحديث الطلب الأصلي');
        // تسجيل الخطأ بمستوى منخفض لأنه لا يؤثر على عملية المتجر
        console.info('ℹ️ تحديث الطلب الأصلي (خطأ غير حرج):', {
          message: errorMessage,
          code: updateError.code,
          details: updateError.details,
          originalOrderId: originalOrderId
        });
        return { success: false, error: getErrorMessage(updateError) };
      }

      console.log('✅ تم تحديث حالة الطلب الأصلي:', { 
        orderId: originalOrderId, 
        newStatus: newOrderStatus, 
        notes: orderNotes 
      });
    } else {
      console.log('ℹ️ الطلب الأصلي غير موجود (ربما تم حذفه بعد التقسيم)');
    }

    return { success: true };

  } catch (error) {
    const errorMessage = getErrorMessage(error, 'خطأ في تحديث حالة الطلب الأصلي');
    // تسجيل الخطأ بمستوى منخفض لأنه لا يؤثر على عملية المتجر
    console.info('ℹ️ تحديث حالة الطلب الأصلي (خطأ غير حرج):', {
      message: errorMessage,
      code: error?.code,
      details: error?.details,
      originalOrderId: originalOrderId
    });
    return {
      success: false,
      error: getErrorMessage(error, 'خطأ غير معروف في تحديث الطلب الأصلي')
    };
  }
}
