import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { setupRealProductSystem, createRealProducts, updateOrdersWithRealProducts, updateOrderItemsWithRealProducts } from '@/utils/createRealProducts';
import { Loader2, Package, CheckCircle, AlertCircle } from 'lucide-react';

const FixProductDataPage = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState<any>(null);
  const { toast } = useToast();

  const handleFixAllData = async () => {
    setIsLoading(true);
    try {
      toast({
        title: "بدء إصلاح البيانات",
        description: "جاري إصلاح أسماء المنتجات في قاعدة البيانات..."
      });

      const result = await setupRealProductSystem();
      setResults(result.results);

      if (result.success) {
        toast({
          title: "تم الإصلاح بنجاح ✅",
          description: "تم إصلاح جميع أسماء المنتجات في النظام"
        });
      } else {
        toast({
          title: "إصلاح جزئي ⚠️",
          description: "تم إصلاح بعض البيانات مع وجود مشاكل",
          variant: "default"
        });
      }
    } catch (error) {
      console.error('خطأ في إصلاح البيانات:', error);
      toast({
        title: "خطأ في الإصلاح",
        description: "حدث خطأ أثناء إصلاح البيانات",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateProducts = async () => {
    setIsLoading(true);
    try {
      const result = await createRealProducts();
      if (result.success) {
        toast({
          title: "تم إنشاء المنتجات ✅",
          description: `تم إنشاء ${result.created} منتج في الكتالوج`
        });
      } else {
        toast({
          title: "فشل إنشاء المنتجات",
          description: result.error,
          variant: "destructive"
        });
      }
    } catch (error) {
      toast({
        title: "خطأ",
        description: "حدث خطأ أثناء إنشاء المنتجات",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateOrders = async () => {
    setIsLoading(true);
    try {
      const result = await updateOrdersWithRealProducts();
      if (result.success) {
        toast({
          title: "تم تحديث الطلبات ✅",
          description: `تم تحديث ${result.updated} طلب بأسماء منتجات حقيقية`
        });
      } else {
        toast({
          title: "فشل تحديث الطلبات",
          description: result.error,
          variant: "destructive"
        });
      }
    } catch (error) {
      toast({
        title: "خطأ",
        description: "حدث خطأ أثناء تحديث الطلبات",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateOrderItems = async () => {
    setIsLoading(true);
    try {
      const result = await updateOrderItemsWithRealProducts();
      if (result.success) {
        toast({
          title: "تم تحديث عناصر الطلبات ✅",
          description: `تم تحديث ${result.updated} عنصر بأسماء منتجات حقيقية`
        });
      } else {
        toast({
          title: "فشل تحديث عناصر الطلبات",
          description: result.error,
          variant: "destructive"
        });
      }
    } catch (error) {
      toast({
        title: "خطأ",
        description: "حدث خطأ أثناء تحديث عناصر الطلبات",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-6" dir="rtl">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-center mb-8">
          إصلاح أسماء المنتجات في النظام
        </h1>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="w-5 h-5" />
                إصلاح شامل للنظام
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-gray-600">
                يقوم بإصلاح جميع أسماء المنتجات في:
              </p>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• كتالوج المنتجات (products)</li>
                <li>• الطلبات (orders.items)</li>
                <li>• عناصر الطلبات (order_items)</li>
              </ul>
              <Button 
                onClick={handleFixAllData} 
                disabled={isLoading}
                className="w-full"
                size="lg"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin ml-2" />
                    جاري الإصلاح...
                  </>
                ) : (
                  "إصلاح شامل للنظام"
                )}
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle className="w-5 h-5" />
                إصلاح منفصل
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button 
                onClick={handleCreateProducts} 
                disabled={isLoading}
                variant="outline"
                className="w-full"
              >
                إنشاء كتالوج المنتجات
              </Button>
              <Button 
                onClick={handleUpdateOrders} 
                disabled={isLoading}
                variant="outline"
                className="w-full"
              >
                تحديث الطلبات
              </Button>
              <Button 
                onClick={handleUpdateOrderItems} 
                disabled={isLoading}
                variant="outline"
                className="w-full"
              >
                تحديث عناصر الطلبات
              </Button>
            </CardContent>
          </Card>
        </div>

        {results && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertCircle className="w-5 h-5" />
                نتائج الإصلاح
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="p-4 bg-blue-50 rounded-lg">
                    <h4 className="font-semibold text-blue-800">كتالوج المنتجات</h4>
                    <p className="text-sm text-blue-600">
                      الحالة: {results.products?.success ? '✅ نجح' : '❌ فشل'}
                    </p>
                    {results.products?.created && (
                      <p className="text-xs text-blue-500">
                        تم إنشاء: {results.products.created} منتج
                      </p>
                    )}
                    {results.products?.error && (
                      <p className="text-xs text-red-500">
                        خطأ: {results.products.error}
                      </p>
                    )}
                  </div>

                  <div className="p-4 bg-green-50 rounded-lg">
                    <h4 className="font-semibold text-green-800">الطلبات</h4>
                    <p className="text-sm text-green-600">
                      الحالة: {results.orders?.success ? '✅ نجح' : '❌ فشل'}
                    </p>
                    {results.orders?.updated && (
                      <p className="text-xs text-green-500">
                        تم تحديث: {results.orders.updated} طلب
                      </p>
                    )}
                    {results.orders?.error && (
                      <p className="text-xs text-red-500">
                        خطأ: {results.orders.error}
                      </p>
                    )}
                  </div>

                  <div className="p-4 bg-purple-50 rounded-lg">
                    <h4 className="font-semibold text-purple-800">عناصر الطلبات</h4>
                    <p className="text-sm text-purple-600">
                      الحالة: {results.orderItems?.success ? '✅ نجح' : '❌ فشل'}
                    </p>
                    {results.orderItems?.updated && (
                      <p className="text-xs text-purple-500">
                        تم تحديث: {results.orderItems.updated} عنصر
                      </p>
                    )}
                    {results.orderItems?.error && (
                      <p className="text-xs text-red-500">
                        خطأ: {results.orderItems.error}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="mt-8 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <h3 className="font-semibold text-yellow-800 mb-2">ملاحظات مهمة:</h3>
          <ul className="text-sm text-yellow-700 space-y-1">
            <li>• يُنصح بتشغيل الإصلاح الشامل مرة واحدة فقط</li>
            <li>• يمكن استخدام الإصلاح المنفصل لتحديث جزء محدد من البيانات</li>
            <li>• سيتم استبدال أسماء المنتجات العامة (مثل "منتج 1") بأسماء حقيقية</li>
            <li>• الأسماء الموجودة والصحيحة ستبقى كما هي</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default FixProductDataPage;
