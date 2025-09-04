import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { UserX, AlertTriangle } from 'lucide-react';
import { ArabicText } from '@/components/ui/arabic-text';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/contexts/LanguageContext';

interface CustomerRejectionButtonProps {
  orderId: string;
  orderStatus?: string;
  storeResponseStatus?: string;
  adminMode?: boolean;
  onRejectComplete?: () => void;
  disabled?: boolean;
  size?: 'sm' | 'default' | 'lg';
  variant?: 'default' | 'outline' | 'destructive' | 'secondary' | 'ghost' | 'link';
}

export const CustomerRejectionButton: React.FC<CustomerRejectionButtonProps> = ({
  orderId,
  orderStatus,
  storeResponseStatus,
  adminMode = false,
  onRejectComplete,
  disabled = false,
  size = 'sm',
  variant = 'destructive'
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const { t } = useLanguage();

  // تحديد ما إذا كان يجب إظهار الزر
  const shouldShowButton = () => {
    // إخفاء الزر إذا كان الطلب معلق أو مسلم أو مسترجع أو مرفوض من الزبون (حتى للمدير)
    if (orderStatus === 'pending' ||
        orderStatus === 'delivered' ||
        orderStatus === 'returned' ||
        orderStatus === 'customer_rejected' ||
        storeResponseStatus === 'customer_rejected') {
      return false;
    }

    // في جميع الحالات الأخرى، الزر متاح (للمدير والمستخدمين العاديين)
    return true;
  };

  // إذا كان الزر يجب إخفاؤه، لا نعرض شيء
  if (!shouldShowButton()) {
    return null;
  }

  const handleCustomerReject = async () => {
    try {
      setIsLoading(true);

      console.log('🚫 بدء عملية رفض الزبون للطلب:', orderId);

      // استخدام Supabase مباشرة ب��لاً من Edge Function لتجنب مشاكل الشبكة
      console.log('📋 جلب بيانات الطلب...');

      const { data: order, error: orderError } = await supabase
        .from('orders')
        .select('*')
        .eq('id', orderId)
        .single();

      if (orderError || !order) {
        throw new Error('لم يتم العثور على الطلب');
      }

      console.log('📝 تحديث حالة الطلب...');

      // تحديث حالة الطلب إلى customer_rejected
      const { error: updateError } = await supabase
        .from('orders')
        .update({
          store_response_status: 'customer_rejected',
          store_response_at: new Date().toISOString(),
          order_status: 'customer_rejected',
          updated_at: new Date().toISOString()
        })
        .eq('id', orderId);

      if (updateError) {
        throw new Error(`فشل في تحديث الطلب: ${updateError.message}`);
      }

      // لا حاجة لتحديث جدول منفصل - المعلومات محفوظة في جدول orders
      console.log('✅ تم رفض الطلب من قبل الزبون بنجاح');

      toast({
        title: "تم رفض الطلب من قبل الزبون",
        description: "تم تحديث حالة الطلب بنجاح. المتجر لن يستطيع تسليم أو استرجاع هذا الطلب.",
      });

      setIsOpen(false);
      onRejectComplete?.();

    } catch (error) {
      console.error('❌ خطأ في رفض الطلب من قبل الزبون:', error);

      let errorMessage = "حدث خطأ غير متوقع";

      if (error instanceof Error) {
        if (error.message.includes('Failed to fetch')) {
          errorMessage = "فشل الاتصال بالخادم. يرجى المحاولة مرة أخرى.";
        } else if (error.message.includes('لم يتم العثور على الطلب')) {
          errorMessage = "لم يتم العثور على الطلب. يرجى التأكد من صحة رقم الطلب.";
        } else if (error.message.includes('فشل في تحديث')) {
          errorMessage = "فشل في تحديث الطلب. يرجى المحاولة مرة أخرى.";
        } else {
          errorMessage = error.message;
        }
      }

      toast({
        title: "خطأ في رفض الطلب",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <Button
        onClick={() => setIsOpen(true)}
        disabled={disabled || isLoading}
        variant={variant}
        size={size}
        className="gap-2"
      >
        <UserX className="w-4 h-4" />
        <ArabicText>{t('customer.rejected')}</ArabicText>
      </Button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="sm:max-w-[500px]" dir="rtl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserX className="w-5 h-5 text-red-600" />
              <ArabicText>رفض الطلب من قبل الزبون</ArabicText>
            </DialogTitle>
            <DialogDescription className="text-right">
              <ArabicText>
                هل أنت متأكد من رفض هذا الطلب من قبل الزبون؟ بعد الرفض، لن يتمكن المتجر من تسليم أو استرجاع هذا الطلب.
              </ArabicText>
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 my-4">
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle className="w-4 h-4 text-red-600" />
                <span className="font-semibold text-red-800">
                  <ArabicText>تحذير:</ArabicText>
                </span>
              </div>
              <div className="text-sm text-red-700">
                <ArabicText>
                  • سيتم تحديث حالة الطلب إلى "مرفوض من الزبون"
                  <br />
                  • المتجر لن يستطيع الضغط على أزرار التسليم أو الاسترجاع
                  <br />
                  • هذا الإجراء سيكون مرئياً للمتجر
                </ArabicText>
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button 
              variant="outline" 
              onClick={() => setIsOpen(false)}
              disabled={isLoading}
            >
              <ArabicText>إلغاء</ArabicText>
            </Button>
            <Button 
              onClick={handleCustomerReject}
              disabled={isLoading}
              variant="destructive"
            >
              {isLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin ml-2" />
                  <ArabicText>جاري الرفض...</ArabicText>
                </>
              ) : (
                <>
                  <UserX className="w-4 h-4 ml-2" />
                  <ArabicText>تأكيد الرف��</ArabicText>
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};
