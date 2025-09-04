import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import OrderDetails from "@/components/OrderDetails";
import { EnhancedOrderCard } from "@/components/orders/EnhancedOrderCard";
import { OrderItems } from "@/components/orders/OrderItems";
import { ErrorBoundary } from "@/components/ui/ErrorBoundary";
import { ArabicText } from "@/components/ui/arabic-text";
import { ReturnReasonDialog } from "@/components/orders/ReturnReasonDialog";
import { handleError, logError } from "@/utils/errorHandling";
import { LanguageToggle } from "@/components/ui/LanguageToggle";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { useLanguage } from "@/contexts/LanguageContext";
import { runStoreNamesFix } from "@/utils/fixStoreNames";
import {
  LogOut,
  Package,
  Clock,
  CheckCircle,
  XCircle,
  Loader2,
  Eye,
  RefreshCw,
  User,
  UserX,
} from "lucide-react";
import { Tables } from "@/integrations/supabase/types";
import { formatCurrency } from "@/utils/currency";
import { getProductNameWithPriority } from "@/utils/productNameFixer";
import { StoreProductAvailabilityCheck } from "@/components/stores/StoreProductAvailabilityCheck";
import { CustomerDeliveryDetails } from "@/components/stores/CustomerDeliveryDetails";
import { CustomerInfoDisplay } from "@/components/stores/CustomerInfoDisplay";
import { submitStoreResponse } from "@/services/storeResponseService";
import { submitTempStoreResponse } from "@/services/temporaryStoreResponseService";
import DivisionCompletionStatus from "@/components/orders/DivisionCompletionStatus";
import { useDivisionCompletion, extractOriginalOrderId, isDividedOrder as checkIsDividedOrder } from "@/hooks/useDivisionCompletion";
import { DeliveryControlForDividedOrder, DeliveryStatusMessage } from "@/components/orders/DeliveryControlForDividedOrder";
import { StoreNotificationBell } from "@/components/ui/store-notification-bell";

type OrderWithProduct = {
  order_id: string;
  customer_name: string;
  customer_phone: string;
  customer_address: string;
  customer_city: string;
  product_name: string;
  product_price: number;
  assigned_store_name: string;
  created_at: string;
  order_code: string;
  order_status: string;
  assigned_store_id: string;
  total_amount: number;
  subtotal: number;
  customer_notes: string;
  order_details?: string;
  store_response_status?: string;
  store_response_at?: string;
  order_items?: any[];
  items: {
    name: string;
    price: number;
    quantity: number;
    product_id: number;
  }[];
};

const StoreDashboard = () => {
  const [orders, setOrders] = useState<OrderWithProduct[]>([]);
  const [storeInfo, setStoreInfo] = useState<{
    id: string;
    name: string;
  } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [showOrderDetails, setShowOrderDetails] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showReturnDialog, setShowReturnDialog] = useState(false);
  const [pendingReturnOrder, setPendingReturnOrder] = useState<{id: string, code: string} | null>(null);
  const [showCustomerDetails, setShowCustomerDetails] = useState(false);
  const [customerDetailsOrderId, setCustomerDetailsOrderId] = useState<string | null>(null);
  const navigate = useNavigate();
  const { toast } = useToast();
  const { t, dir } = useLanguage();

  // دالة مس��عدة لتشخيص بيانات الطلب
  const diagnoseOrderData = (order: any) => {
    const diagnosis = {
      order_id: order.id,
      order_code: order.order_code,
      has_order_items: !!order.order_items,
      order_items_count: order.order_items?.length || 0,
      has_items_json: !!order.items,
      items_json_count: Array.isArray(order.items) ? order.items.length : 0,
      data_source: 'unknown'
    };

    if (order.order_items && Array.isArray(order.order_items) && order.order_items.length > 0) {
      diagnosis.data_source = 'order_items_table';
    } else if (order.items && Array.isArray(order.items) && order.items.length > 0) {
      diagnosis.data_source = 'items_json';
    } else {
      diagnosis.data_source = 'no_data';
    }

    console.log('📊 تشخيص بيانات الطلب:', diagnosis);
    return diagnosis;
  };

  useEffect(() => {
    console.log("🔵 StoreDashboard: Checking authentication...");

    // تشغيل إصلاح أسماء المتاجر في بيئة التطوير
    runStoreNamesFix();

    const storeAuth = localStorage.getItem("storeAuth");

    if (!storeAuth) {
      console.log("No storeAuth found, redirecting to login...");
      navigate("/store-login-space9003", { replace: true });
      return;
    }

    try {
      const store = JSON.parse(storeAuth);
      console.log("✅ Store authenticated:", store);
      setStoreInfo(store);
      fetchOrders(store.id);

      // إعداد real-time subscriptions للمتجر - هنا الإضافة الجديدة!
      console.log("🔔 إعداد real-time subscriptions للمتجر:", store.id);
      
      const ordersChannel = supabase
        .channel(`store-orders-${store.id}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'orders',
            filter: `assigned_store_id=eq.${store.id}`
          },
          (payload) => {
            console.log('🔔 طلب جديد للمتجر:', payload);
            // تحديث قائمة الطلبات عند وصول طلب جديد
            fetchOrders(store.id, false);
            toast({
              title: "طلب جديد! 🎉",
              description: `تم تعيين طلب جديد للمتجر`,
            });
          }
        )
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'orders',
            filter: `assigned_store_id=eq.${store.id}`
          },
          (payload) => {
            console.log('🔄 تحديث طلب للمتجر:', payload);
            const updatedOrder = payload.new;
            
            // تحديث محلي سريع للطلب المحدث
            setOrders(prevOrders => 
              prevOrders.map(order => 
                order.order_id === updatedOrder.id 
                  ? {
                      ...order,
                      order_status: updatedOrder.order_status || order.order_status,
                      store_response_status: updatedOrder.store_response_status || order.store_response_status,
                      customer_name: updatedOrder.customer_name || order.customer_name,
                      customer_phone: updatedOrder.customer_phone || order.customer_phone,
                      total_amount: updatedOrder.total_amount || order.total_amount
                    }
                  : order
              )
            );
            
            // إظهار إشعار للتحديثات المهمة
            if (updatedOrder.order_status && ['delivered', 'returned', 'customer_rejected'].includes(updatedOrder.order_status)) {
              const statusMessages = {
                delivered: "تم تسليم ��لطلب ✅",
                returned: "تم إرجاع الطلب 🔄", 
                customer_rejected: "تم رفض الطلب من الزبون 🚫"
              };
              toast({
                title: "تحديث حالة الطلب",
                description: statusMessages[updatedOrder.order_status as keyof typeof statusMessages] || "تم تحديث الطلب",
              });
            }
          }
        )
        .on(
          'postgres_changes',
          {
            event: 'DELETE', 
            schema: 'public',
            table: 'orders',
            filter: `assigned_store_id=eq.${store.id}`
          },
          (payload) => {
            console.log('🗑️ حذف طلب من المتجر:', payload);
            const deletedOrderId = payload.old.id;
            
            // إزالة الطلب المحذوف من القائمة
            setOrders(prevOrders => 
              prevOrders.filter(order => order.order_id !== deletedOrderId)
            );
            
            toast({
              title: "تم حذف طلب",
              description: "تم حذف أحد الطلبات من النظام",
              variant: "destructive"
            });
          }
        )
        .subscribe((status) => {
          console.log(`📡 Store channel subscription status: ${status}`, {
            storeId: store.id,
            channelName: `store-orders-${store.id}`,
            timestamp: new Date().toISOString()
          });
          
          if (status === 'SUBSCRIBED') {
            toast({
              title: "متصل بالنظام 📡",
              description: "سيتم تحديث الطلبات تلقائياً",
            });
          }
        });

      // تنظيف الاشتراكات عند إلغاء التحميل
      return () => {
        console.log("🧹 تنظيف real-time subscriptions للمتجر");
        supabase.removeChannel(ordersChannel);
      };

    } catch (error) {
      logError('تحليل بيانات تسجيل الدخول', error, { storeAuth });
      localStorage.removeItem("storeAuth");
      navigate("/store-login-space9003", { replace: true });
    }
  }, [navigate, toast]);

  const fetchOrders = async (storeId: string, showLoading = true) => {
    try {
      if (showLoading) {
        setIsLoading(true);
      } else {
        setIsRefreshing(true);
      }
      setError(null);

      console.log('📊 جلب طلبات المتجر:', storeId);

      // Query orders directly from the orders table with proper filtering
      // إخفاء الطلبات التي تم رفضها (غير متوفرة)
      const { data, error } = await supabase
        .from("orders")
        .select(
          `
          id,
          customer_name,
          customer_phone,
          customer_address,
          customer_city,
          items,
          total_amount,
          subtotal,
          customer_notes,
          order_details,
          order_code,
          order_status,
          status,
          assigned_store_id,
          store_response_status,
          store_response_at,
          created_at,
          stores!assigned_store_id(name),
          order_items(
            id,
            product_name,
            quantity,
            price,
            discounted_price,
            availability_status,
            product_id,
            main_store_name,
            products!product_id(
              id,
              name
            )
          )
        `,
        )
        .eq("assigned_store_id", storeId)
        .in("order_status", ["assigned", "delivered", "returned", "customer_rejected"]) // جميع حالات الطلبات بما في ذلك رفض الزبون
        .or("store_response_status.is.null,store_response_status.neq.unavailable,store_response_status.eq.customer_rejected") // إظهار جميع الطلبات بما في ذلك المرفوضة من الزبون
        .order("created_at", { ascending: false });

      if (error) {
        console.error('❌ خطأ في استعلام Supabase:', error);
        throw error;
      }

      // إذا لم نحصل على order_items من join، جلبها منفصلة
      if (data && data.length > 0) {
        for (const order of data) {
          if (!order.order_items || order.order_items.length === 0) {
            console.log(`🔧 جلب order_items منفصلة للطلب ${order.id}`);

            const { data: orderItems, error: itemsError } = await supabase
              .from('order_items')
              .select(`
                id,
                product_name,
                quantity,
                price,
                discounted_price,
                availability_status,
                product_id,
                main_store_name,
                products!product_id(
                  id,
                  name
                )
              `)
              .eq('order_id', order.id);

            if (!itemsError && orderItems) {
              order.order_items = orderItems;
              console.log(`✅ تم جلب ${orderItems.length} عنصر للطلب ${order.id}`);
            } else {
              console.error(`❌ فشل جلب order_items للطلب ${order.id}:`, itemsError);
            }
          }
        }
      }

      console.log('✅ تم جلب الطلبات بنجاح:', {
        storeId,
        totalOrders: data?.length || 0,
        ordersByStatus: {
          assigned: data?.filter(o => o.order_status === 'assigned').length || 0,
          delivered: data?.filter(o => o.order_status === 'delivered').length || 0,
          returned: data?.filter(o => o.order_status === 'returned').length || 0
        },
        sampleOrderItems: data?.[0]?.order_items || 'no order_items',
        sampleOrder: data?.[0] ? {
          id: data[0].id,
          order_code: data[0].order_code,
          total_amount: data[0].total_amount,
          order_items_count: data[0].order_items?.length || 0,
          items_count: data[0].items ? (Array.isArray(data[0].items) ? data[0].items.length : 'not array') : 'no items'
        } : 'no orders'
      });

      // تتبع الطلبات بدون أسماء عملاء صالحة
      const ordersWithoutValidCustomerNames = data?.filter(o =>
        !o.customer_name || o.customer_name.trim() === ''
      );

      if (ordersWithoutValidCustomerNames && ordersWithoutValidCustomerNames.length > 0) {
        console.log(`🔧 إصلاح ${ordersWithoutValidCustomerNames.length} طلب بدون أسماء عملاء`);

        // محاولة إصلاح البيانات بإضافة أسماء تجريبية
        for (const order of ordersWithoutValidCustomerNames) {
          try {
            const tempName = `${t('customer')} ${order.order_code || order.id.slice(0, 8)}`;

            const { error: updateError } = await supabase
              .from('orders')
              .update({ customer_name: tempName })
              .eq('id', order.id);

            if (updateError) {
              console.error('❌ فشل في تحديث اسم العميل:', updateError);
            }
          } catch (error) {
            console.error('حدث خطأ في إصلاح اسم العميل:', error);
          }
        }
      }

      // تتبع إضافي للطلبات التي لا تحتوي على أسماء منتجات صالحة
      const ordersWithoutValidProducts = data?.filter(o => {
        const hasValidOrderItems = o.order_items && o.order_items.some(item =>
          item.product_name && item.product_name.trim() !== '' && item.product_name !== 'منتج غير محدد'
        );
        const hasValidItems = Array.isArray(o.items) && o.items.some(item =>
          item.name && item.name.trim() !== '' && item.name !== 'منتج غير محدد'
        );
        return !hasValidOrderItems && !hasValidItems;
      });

      if (ordersWithoutValidProducts && ordersWithoutValidProducts.length > 0) {
        console.warn('⚠️ Orders without valid product names:', ordersWithoutValidProducts);
      }

      // تحويل البيانات إلى الشكل المطلوب

      // Transform the data to match the expected format
      const transformedOrders: OrderWithProduct[] =
        data?.map((order) => {
          // تشخيص بيانات كل طلب
          diagnoseOrderData(order);

          return {
          order_id: order.id,
          customer_name: (() => {
            const name = order.customer_name?.trim();
            if (name && name !== '') {
              return name;
            }
            // إذا لم يكن هناك اسم، استخدم اسم تجريبي مبني على order_code أو id
            const orderRef = order.order_code || order.id.slice(0, 8);
            return `${t('customer')} ${orderRef}`;
          })(),
          customer_phone: order.customer_phone || "",
          customer_address: order.customer_address || "",
          customer_city: order.customer_city || "",
          product_name: (() => {
            // استخدام نفس منطق لوحة المدير: order_items أولاً، ثم items كاحتياط
            if (order.order_items && Array.isArray(order.order_items) && order.order_items.length > 0) {
              const productNames = order.order_items.map((item) => getProductNameWithPriority(item))
                .filter(name => name && name.trim() !== '' && name !== 'منتج غير محدد');

              if (productNames.length > 0) {
                return productNames.join(', ');
              }
            }

            // احتياطي: استخدام items إذا لم تنجح order_items
            if (order.items && Array.isArray(order.items) && order.items.length > 0) {
              const productNames = order.items.map((item) => getProductNameWithPriority(item))
                .filter(name => name && name.trim() !== '' && name !== 'منتج غير محدد');

              if (productNames.length > 0) {
                return productNames.join(', ');
              }
            }

            return `منتج طلب ${order.order_code || order.id.slice(0, 8)}`;
          })(),
          product_price:
            order.order_items && Array.isArray(order.order_items) && order.order_items.length > 0
              ? order.order_items[0]?.price || 0
              : order.items && Array.isArray(order.items) && order.items.length > 0
              ? order.items[0]?.price || 0
              : 0,
          assigned_store_name: order.stores?.name || "غير معين",
          created_at: order.created_at,
          order_code: order.order_code || "",
          order_status: order.order_status || order.status || "pending",
          assigned_store_id: order.assigned_store_id || "",
          total_amount: order.total_amount || 0,
          subtotal: order.subtotal || 0,
          customer_notes: order.customer_notes || "",
          order_details: order.order_details || "",
          store_response_status: order.store_response_status,
          store_response_at: order.store_response_at,
          order_items: order.order_items || [],
          items:
            // أولوية مط��قة لـ order_items من قاعدة البيانات
            order.order_items && Array.isArray(order.order_items) && order.order_items.length > 0
              ? order.order_items.map((item: any) => {
                  console.log('🔧 معالجة order_item من قاعدة البيانات:', {
                    id: item.id,
                    product_name: item.product_name,
                    quantity: item.quantity,
                    price: item.price,
                    discounted_price: item.discounted_price,
                    product_id: item.product_id,
                    products_name: item.products?.name
                  });

                  return {
                    id: item.id,
                    name: getProductNameWithPriority(item),
                    product_name: getProductNameWithPriority(item),
                    price: item.price || 0,
                    quantity: item.quantity || 1,
                    discounted_price: item.discounted_price || 0,
                    product_id: item.product_id || 0,
                    products: item.products || null,
                    main_store_name: item.main_store_name || storeInfo?.name || 'المتجر',
                  };
                })
              // احتياطي: استخدام items JSON إذا لم تكن order_items متوفرة
              : order.items && Array.isArray(order.items) && order.items.length > 0
              ? order.items.map((item: any, index: number) => {
                  console.log(`⚠️ استخدام items JSON احتياطي للعنصر ${index}:`, item);
                  return {
                    id: `json-item-${index}`,
                    name: getProductNameWithPriority(item),
                    product_name: getProductNameWithPriority(item),
                    price: item.price || 0,
                    quantity: item.quantity || 1,
                    product_id: item.product_id || 0,
                  };
                })
              : [],
          };
        }) || [];

      setOrders(transformedOrders);
    } catch (error) {
      console.error('❌ خطأ في تحميل الطلبات:', {
        error,
        message: error?.message || error,
        stack: error?.stack,
        details: error?.details,
        hint: error?.hint,
        code: error?.code,
        storeId,
        timestamp: new Date().toISOString()
      });

      const formattedError = handleError(
        'تحميل الطلبات',
        error,
        toast,
        { storeId }
      );
      setError(formattedError.message);
      setOrders([]);
    } finally {
      if (showLoading) {
        setIsLoading(false);
      } else {
        setIsRefreshing(false);
      }
    }
  };

  // باقي الدوال تبقى نفسها...
  const handleStatusUpdate = async (orderId: string, newStatus: string) => {
    // البحث عن الطلب الحالي للتحقق من حالته
    const currentOrder = orders.find(order => order.order_id === orderId);
    if (!currentOrder) {
      toast({
        title: "خطأ",
        description: "لم يتم العثور على الطلب",
        variant: "destructive",
      });
      return;
    }

    // منع تغيير حالة الطلب إذا كان "مسلمة" أو "مرتجعة"
    if (currentOrder.order_status === 'delivered') {
      toast({
        title: "غير مسموح",
        description: "لا يمكن تغيير حالة الطلب بعد تسليمه",
        variant: "destructive",
      });
      return;
    }

    if (currentOrder.order_status === 'returned') {
      toast({
        title: "غير مسموح",
        description: "لا يمكن تغيير حالة الطلب المرتجع",
        variant: "destructive",
      });
      return;
    }

    // إذا كان المستخدم يريد تحويل الطلب إلى "مرتجعة"، اطلب سبب الإرجاع
    if (newStatus === 'returned') {
      setPendingReturnOrder({
        id: orderId,
        code: currentOrder.order_code || orderId
      });
      setShowReturnDialog(true);
      return;
    }

    // التحديث العادي للحالات الأخرى
    await updateOrderStatus(orderId, newStatus);
  };

  const updateOrderStatus = async (orderId: string, newStatus: string, returnReason?: string) => {
    try {
      console.log('🔄 بدء تحديث حالة الطلب:', {
        orderId,
        newStatus,
        returnReason,
        storeId: storeInfo?.id,
        timestamp: new Date().toISOString()
      });

      const updateData: any = {
        order_status: newStatus,
        status: newStatus,
        updated_at: new Date().toISOString(),
      };

      // إضافة سبب الإرجاع في order_details إذا كان متوفراً
      if (returnReason && newStatus === 'returned') {
        updateData.order_details = `Return reason: ${returnReason}`;
        console.log('📝 إضافة سبب الإرجاع:', { returnReason, order_details: updateData.order_details });
      }

      console.log('📤 إرسال التحديث إلى قاعدة البيانات:', updateData);

      const { data, error } = await supabase
        .from("orders")
        .update(updateData)
        .eq("id", orderId)
        .select();

      if (error) {
        console.error('❌ خطأ في تحديث قاعدة البيانات:', {
          error,
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code,
          orderId,
          updateData
        });
        throw error;
      }

      console.log('✅ تم تحديث الطلب بنجاح:', { data, orderId, newStatus });

      const statusMessages = {
        delivered: "تم تسليم الطلب بنجاح",
        returned: "تم إرجاع الطلب بنجاح",
        assigned: "تم تحديث حالة الطلب"
      };

      toast({
        title: "تم التحديث",
        description: statusMessages[newStatus as keyof typeof statusMessages] || "تم تحديث حالة الطلب بنجاح",
      });

      fetchOrders(storeInfo!.id, false);
    } catch (error) {
      console.error('❌ خطأ في تحديث حالة الطلب:', {
        error,
        message: error?.message || error,
        stack: error?.stack,
        orderId,
        newStatus,
        returnReason,
        storeId: storeInfo?.id,
        timestamp: new Date().toISOString()
      });

      handleError(
        'تحديث حالة الطلب',
        error,
        toast,
        { orderId, newStatus, returnReason }
      );
    }
  };

  const handleReturnConfirm = async (reason: string) => {
    if (pendingReturnOrder) {
      console.log('🔄 تأكيد إرجاع الطلب:', {
        orderId: pendingReturnOrder.id,
        orderCode: pendingReturnOrder.code,
        reason,
        timestamp: new Date().toISOString()
      });

      try {
        await updateOrderStatus(pendingReturnOrder.id, 'returned', reason);
        setPendingReturnOrder(null);
        setShowReturnDialog(false);
        console.log('✅ تم إرجاع الطلب بنجاح');
      } catch (error) {
        console.error('❌ خطأ في إرجاع ��لطلب:', error instanceof Error ? error.message : error);
        // لا نحتاج لعرض toast هنا لأن updateOrderStatus سيتولى ذلك
      }
    }
  };

  const handleReturnCancel = () => {
    setPendingReturnOrder(null);
    setShowReturnDialog(false);
  };

  const handleLogout = () => {
    localStorage.removeItem("storeAuth");
    navigate("/store-login-space9003");
  };

  const handleViewOrder = (orderId: string) => {
    setSelectedOrderId(orderId);
    setShowOrderDetails(true);
  };

  const handleCloseOrderDetails = () => {
    setShowOrderDetails(false);
    setSelectedOrderId(null);
  };

  const handleOrderUpdated = () => {
    if (storeInfo?.id) {
      fetchOrders(storeInfo.id, false);
    }
  };

  const handleRefreshOrders = () => {
    if (storeInfo?.id) {
      fetchOrders(storeInfo.id, false);
    }
  };

  // معالج استجابة المتجر بالموافقة (المنتج متوفر)
  const handleStoreAvailableResponse = async (orderId: string) => {
    try {
      console.log('🟢 تأكيد توفر المنتج - تحديث البيانات:', { orderId, storeId: storeInfo?.id });

      // تحديث قائمة الطلبات لإظهار التغيير
      if (storeInfo?.id) {
        await fetchOrders(storeInfo.id, false);
      }

    } catch (error) {
      console.error('❌ خطأ في callback توفر المنتج:', error instanceof Error ? error.message : error);
    }
  };

  // معالج استجابة المتجر بالرفض (المنتج غير متوفر)
  const handleStoreUnavailableResponse = async (orderId: string) => {
    try {
      console.log('🔴 رفض الطلب - تحديث البيانات:', { orderId, storeId: storeInfo?.id });

      // تحديث قائمة الطلبات لإظهار التغيير
      if (storeInfo?.id) {
        await fetchOrders(storeInfo.id, false);
      }

      // إغلاق Dialog إذا كان مفتوحاً
      setShowOrderDetails(false);

    } catch (error) {
      console.error('❌ خطأ في callback رفض الطلب:', error instanceof Error ? error.message : error);
    }
  };

  // معالج تأكيد التسليم
  const handleDeliveryConfirm = async (orderId: string) => {
    try {
      console.log('🚚 تأكيد جاهزية الطلب للتسليم:', { orderId, storeId: storeInfo?.id });

      setCustomerDetailsOrderId(orderId);
      setShowCustomerDetails(true);
      setShowOrderDetails(false); // إغلاق dialog تفاصيل الطلب

      toast({
        title: "جاهز للتسليم",
        description: "تم تأكيد جاهزية الطلب للتسليم. تفاصيل العميل متاحة الآن.",
      });

    } catch (error) {
      console.error('❌ خطأ في تأكيد التسليم:', error instanceof Error ? error.message : error);
      handleError('تأكيد التسليم', error, toast, { orderId });
    }
  };

  // معالج إكمال التسليم
  const handleDeliveryComplete = async (orderId: string) => {
    try {
      console.log('✅ إكمال تسليم الطلب:', { orderId, storeId: storeInfo?.id });

      setShowCustomerDetails(false);
      setCustomerDetailsOrderId(null);

      // تحديث قائمة الطلبات
      if (storeInfo?.id) {
        fetchOrders(storeInfo.id, false);
      }

      toast({
        title: "تم التسليم بنجاح ✅",
        description: "تم تأكيد تسليم الطلب للعميل بنجاح",
      });

    } catch (error) {
      console.error('❌ خطأ في إكمال التسليم:', error instanceof Error ? error.message : error);
      handleError('إكمال التسليم', error, toast, { orderId });
    }
  };

  // معالج إرجاع الطلب
  const handleReturnOrder = async (orderId: string, returnReason: string) => {
    try {
      console.log('🔄 إرجاع الطلب:', { orderId, storeId: storeInfo?.id, returnReason });

      setShowCustomerDetails(false);
      setCustomerDetailsOrderId(null);
      setShowOrderDetails(false);

      // تحديث قائمة الطلبات
      if (storeInfo?.id) {
        await fetchOrders(storeInfo.id, false);
      }

      toast({
        title: "تم إرجاع الطلب 🔄",
        description: `تم إرجاع الطلب بنجاح - السبب: ${returnReason}`,
        variant: "destructive",
      });

    } catch (error) {
      console.error('❌ خطأ في إرجاع الطلب:', error instanceof Error ? error.message : error);
      handleError('إرجاع الطلب', error, toast, { orderId, returnReason });
    }
  };

  // التحقق من كون الطلب مقسماً (استخدام Hook الجديد)
  const isDividedOrder = (order: OrderWithProduct) => {
    return checkIsDividedOrder(order.order_details);
  };

  // استخراج معرف الطلب الأصلي (استخدام Hook الجديد)
  const getOriginalOrderId = (order: OrderWithProduct) => {
    return extractOriginalOrderId(order.order_details);
  };

  const getStatusBadge = (status: string) => {
    const statusMap = {
      pending: {
        label: "معلقة",
        message: "⏳ في الانتظار: لم يتم تعيين هذا الطلب لأي متجر بعد.",
        variant: "secondary" as const,
        icon: Clock,
      },
      assigned: {
        label: t('assigned'),
        message: `📦 ${t('order')} ${t('assigned')} إلى المتجر، جاري المعالجة.`,
        variant: "default" as const,
        icon: Package,
      },
      delivered: {
        label: t('delivered'),
        message: `✅ تم تسليم ${t('order')} بنجاح.`,
        variant: "default" as const,
        icon: CheckCircle,
      },
      completed: {
        label: t('delivered'),
        message: `✅ تم تسليم ${t('order')} بنجاح.`,
        variant: "default" as const,
        icon: CheckCircle,
      },
      returned: {
        label: t('returned'),
        message: `🔄 تم إرجاع ${t('order')}.`,
        variant: "destructive" as const,
        icon: XCircle,
      },
      customer_rejected: {
        label: "رفض الزبون",
        message: "🚫 تم رفض الطلب من قبل الزبون.",
        variant: "destructive" as const,
        icon: UserX,
      },
    };

    return (
      statusMap[status as keyof typeof statusMap] || {
        label: status,
        message: `⚠️ حالة غير معروفة: ${status}`,
        variant: "secondary" as const,
        icon: Package,
      }
    );
  };

  const getStatusStats = () => {
    const assignedOrders = orders.filter((order) => order.order_status === "assigned");
    const returnedOrders = orders.filter((order) => order.order_status === "returned");

    // Debug logging للطلبات المرتجعة
    console.log('🔍 StoreDashboard - getStatusStats:', {
      totalOrders: orders.length,
      returnedCount: returnedOrders.length,
      returnedOrders: returnedOrders.map(o => ({
        id: o.order_id,
        status: o.order_status,
        code: o.order_code
      })),
      allOrderStatuses: orders.map(o => o.order_status)
    });

    const stats = {
      total: orders.length,
      assigned: assignedOrders.length,
      delivered: orders.filter((order) => order.order_status === "delivered")
        .length,
      returned: returnedOrders.length,
      customer_rejected: orders.filter((order) => order.order_status === "customer_rejected")
        .length,
    };

    return stats;
  };

  const getOrdersByStatus = (status: string) => {
    const filteredOrders = orders.filter((order) => order.order_status === status);

    // Debug logging للطلبات حسب الحالة
    if (status === 'returned') {
      console.log('🔍 StoreDashboard - getOrdersByStatus (returned):', {
        status,
        totalOrders: orders.length,
        filteredCount: filteredOrders.length,
        filteredOrders: filteredOrders.map(o => ({
          id: o.order_id,
          status: o.order_status,
          code: o.order_code
        }))
      });
    }

    return filteredOrders;
  };

  // دالة محسّنة لعرض اسم المنتج مع إصلاح الأسماء الفارغة أو المولدة تلقائياً
  // (نفس منطق AdminDashboard)
  function getProductName(item: any) {
    return getProductNameWithPriority(item);
  }

  const renderOrderCard = (order: OrderWithProduct) => {
    const statusInfo = getStatusBadge(order.order_status || "assigned");
    const StatusIcon = statusInfo.icon;

    // Get product information
    const getProductInfo = () => {
      // أولاً: استخدام order_items إذا كانت موجودة
      if (order.order_items && Array.isArray(order.order_items) && order.order_items.length > 0) {
        return order.order_items.map(item => ({
          name: getProductNameWithPriority(item),
          quantity: item.quantity || 1,
          price: item.price || 0
        }));
      }
      // ثانياً: استخدام items كبديل
      if (order.items && Array.isArray(order.items) && order.items.length > 0) {
        return order.items.map(item => ({
          name: getProductNameWithPriority(item),
          quantity: item.quantity || 1,
          price: item.price || 0
        }));
      }
      // ثالثاً: إذا كان product_name يحتوي على منتجات متعددة مفصولة بفاصلة
      // لا نقسم السعر، بل نعرض كمنتج واحد مدمج
      if (order.product_name && order.product_name.includes(',')) {
        const productNames = order.product_name.split(',').map(name => name.trim()).filter(name => name.length > 0);
        return productNames.map(productName => {
          // أسعار تقديرية بناءً ��لى نوع المنتج
          let estimatedPrice = 0;
          const lowerName = productName.toLowerCase();

          if (lowerName.includes('ryzen') || lowerName.includes('معالج')) {
            estimatedPrice = 300000; // معالجات
          } else if (lowerName.includes('logitech') || lowerName.includes('keyboard') || lowerName.includes('لوحة')) {
            estimatedPrice = 120000; // لوحات المفاتيح
          } else if (lowerName.includes('شاشة') || lowerName.includes('monitor') || lowerName.includes('بوصة')) {
            estimatedPrice = 250000; // شاشات
          } else if (lowerName.includes('mouse') || lowerName.includes('فأرة')) {
            estimatedPrice = 50000; // الفأرة
          } else {
            // توزيع متساوي للمنتجات غير المعروفة
            estimatedPrice = Math.floor((order.total_amount || 0) / productNames.length);
          }

          return {
            name: productName,
            quantity: 1,
            price: estimatedPrice
          };
        });
      }

      // أخيراً: منتج واحد افتراضي
      const orderRef = order.order_code || order.order_id.slice(0, 8);
      return [{
        name: order.product_name || `منتج طلب ${orderRef}`,
        quantity: 1,
        price: order.total_amount || 0
      }];
    };

    const products = getProductInfo();

    return (
      <div
        key={order.order_id}
        className="p-4 border rounded-lg bg-card hover:bg-accent/50 transition-colors"
      >
        <div className="flex flex-col space-y-3">
          {/* Header with status */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex items-center gap-3">
              <StatusIcon className="w-5 h-5 text-muted-foreground" />
              <div className="flex flex-col">
                <h3 className="font-bold text-lg text-blue-800">
                  {(() => {
                    const name = order.customer_name?.trim();
                    if (name && name !== '') {
                      return name;
                    }
                    // استخدام كود الطلب لإنشاء اسم مؤقت
                    const orderRef = order.order_code || order.order_id.slice(0, 8);
                    return `${t('customer')} ${orderRef}`;
                  })()}
                </h3>
                <p className="text-sm text-gray-600">طلب #{order.order_code || order.order_id.slice(0, 8)}</p>
              </div>
              <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleViewOrder(order.order_id)}
                className="flex items-center gap-1"
              >
                <Eye className="w-4 h-4" />
                {t('details')}
              </Button>
              {(order.order_status === 'delivered' || order.order_status === 'returned') && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setCustomerDetailsOrderId(order.order_id);
                    setShowCustomerDetails(true);
                  }}
                  className="flex items-center gap-1 bg-blue-50 hover:bg-blue-100 text-blue-700 border-blue-200"
                >
                  <User className="w-4 h-4" />
                  {t('customer.details.delivery')}
                </Button>
              )}
              <Select
                value={order.order_status || "assigned"}
                onValueChange={(newStatus) =>
                  handleStatusUpdate(order.order_id, newStatus)
                }
                disabled={order.order_status === 'delivered' || order.order_status === 'returned' || order.order_status === 'customer_rejected'}
              >
                <SelectTrigger className={`w-40 ${
                  order.order_status === 'delivered' || order.order_status === 'returned' || order.order_status === 'customer_rejected'
                    ? 'opacity-60 cursor-not-allowed'
                    : ''
                }`}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="assigned">{t('assigned')}</SelectItem>
                  <DeliveryControlForDividedOrder
                    orderDetails={order.order_details}
                    storeResponseStatus={order.store_response_status}
                  >
                    <SelectItem
                      value="delivered"
                      disabled={order.store_response_status !== 'available'}
                    >
                      {t('delivered')}
                    </SelectItem>
                  </DeliveryControlForDividedOrder>
                </SelectContent>
              </Select>
              {(order.order_status === 'delivered' || order.order_status === 'returned' || order.order_status === 'customer_rejected') && (
                <span className="text-xs text-muted-foreground">
                  ({order.order_status === 'customer_rejected' ? 'مرفوض من الزبون' : t('cannot.change')})
                </span>
              )}
              {order.order_status !== 'delivered' &&
               order.order_status !== 'returned' &&
               order.order_status !== 'customer_rejected' && (
                <DeliveryStatusMessage
                  orderDetails={order.order_details}
                  storeResponseStatus={order.store_response_status}
                />
              )}
            </div>
          </div>

          {/* Customer Rejection Information */}
          {order.order_status === 'customer_rejected' && (
            <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <UserX className="w-5 h-5 text-purple-600" />
                <h4 className="font-semibold text-purple-800">تم رفض الطلب من قبل الزبون</h4>
              </div>
              <div className="text-sm text-purple-700">
                <p>هذا الطلب تم رفضه من قبل الزبون ولا يمكن معالجته.</p>
                {order.store_response_at && (
                  <p className="mt-1 text-xs text-purple-600">
                    تاريخ الرفض: {new Date(order.store_response_at).toLocaleDateString('ar-IQ', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                      hour: 'numeric',
                      minute: 'numeric'
                    })}
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Product Details Section - Using OrderItems component like admin dashboard */}
          <div className="space-y-3">
            {(() => {
              console.log('🔍 StoreDashboard renderOrderCard - تشخيص بيانات الطلب:', {
                order_id: order.order_id,
                order_code: order.order_code,
                total_amount: order.total_amount,
                has_order_items: !!order.order_items,
                order_items_count: order.order_items?.length || 0,
                order_items_details: order.order_items?.map(item => ({
                  id: item.id,
                  product_name: item.product_name,
                  name: item.name,
                  price: item.price,
                  discounted_price: item.discounted_price,
                  quantity: item.quantity,
                  product_id: item.product_id,
                  products_name: item.products?.name
                })),
                has_items_json: !!order.items,
                items_json_count: Array.isArray(order.items) ? order.items.length : 'not_array',
                items_json_sample: Array.isArray(order.items) ? order.items[0] : order.items,
                product_name: order.product_name
              });

              // استخدام نفس منطق AdminDashboard لعرض المنتجات
              let itemsToShow = [];

              // أولاً: محاولة استخدام order_items إذا كانت موجودة ومعالجة بشكل صحيح
              if (order.order_items && Array.isArray(order.order_items) && order.order_items.length > 0) {
                itemsToShow = order.order_items.map((item, index) => {
                  // استخدام السعر الصحيح: إذا كان هناك خصم، استخدم السعر المخفض، وإلا استخدم السعر الأصلي
                  let finalPrice = item.price || 0;
                  let discountPrice = item.discounted_price || 0;

                  console.log(`🔍 Processing item ${index}:`, {
                    product_name: getProductNameWithPriority(item),
                    original_price: item.price,
                    discounted_price: item.discounted_price,
                    quantity: item.quantity
                  });

                  return {
                    id: item.id || `order-item-${index}`,
                    product_name: getProductNameWithPriority(item),
                    name: getProductNameWithPriority(item),
                    quantity: item.quantity || 1,
                    price: finalPrice,
                    discounted_price: discountPrice,
                    product_id: item.product_id
                  };
                });

                console.log('✅ Using order_items:', itemsToShow);
              }
              // ثانياً: استخ��ام items كبديل
              else if (order.items && Array.isArray(order.items) && order.items.length > 0) {
                itemsToShow = order.items.map((item, index) => {
                  console.log(`🔍 Processing legacy item ${index}:`, {
                    product_name: getProductNameWithPriority(item),
                    price: item.price,
                    quantity: item.quantity
                  });

                  return {
                    id: item.product_id || `item-${index}`,
                    product_name: getProductNameWithPriority(item),
                    name: getProductNameWithPriority(item),
                    quantity: item.quantity || 1,
                    price: item.price || 0,
                    discounted_price: 0,
                    product_id: item.product_id
                  };
                });

                console.log('✅ Using items:', itemsToShow);
              }
              // ثالثاً: إذا كان product_name يحتوي على منتجات متعددة مفصولة بفاصلة
              else if (order.product_name && order.product_name.includes(',')) {
                const productNames = order.product_name.split(',').map(name => name.trim()).filter(name => name.length > 0);

                // محاولة الحصول على أسعار تقديرية لكل منتج بناءً على نوع المنتج
                itemsToShow = productNames.map((productName, index) => {
                  // أسعار تقديرية بناءً على نوع المنتج
                  let estimatedPrice = 0;
                  const lowerName = productName.toLowerCase();

                  if (lowerName.includes('ryzen') || lowerName.includes('معالج')) {
                    estimatedPrice = 300000; // معالجات
                  } else if (lowerName.includes('logitech') || lowerName.includes('keyboard') || lowerName.includes('لوحة')) {
                    estimatedPrice = 120000; // لوحات المفاتيح
                  } else if (lowerName.includes('شاشة') || lowerName.includes('monitor') || lowerName.includes('بوصة')) {
                    estimatedPrice = 250000; // شاشات
                  } else if (lowerName.includes('mouse') || lowerName.includes('فأرة')) {
                    estimatedPrice = 50000; // الفأرة
                  } else {
                    // توزيع متساوي للمنتجات غير المعروفة
                    estimatedPrice = Math.floor((order.total_amount || 0) / productNames.length);
                  }

                  return {
                    id: `split-product-${index}`,
                    product_name: productName,
                    name: productName,
                    quantity: 1,
                    price: estimatedPrice,
                    discounted_price: 0
                  };
                });

                console.log('✅ Split product_name with estimated prices:', itemsToShow);
              }
              // أخيراً: منتج واحد افتراضي
              else {
                itemsToShow = [{
                  id: `default-${order.order_id}`,
                  product_name: order.product_name || `منتج طلب ${order.order_code || order.order_id.slice(0, 8)}`,
                  name: order.product_name || `منتج طلب ${order.order_code || order.order_id.slice(0, 8)}`,
                  quantity: 1,
                  price: order.total_amount || 0,
                  discounted_price: 0
                }];

                console.log('✅ Using fallback product:', itemsToShow);
              }

              return itemsToShow && itemsToShow.length > 0 && (
                <OrderItems
                  items={itemsToShow}
                  compact={true}
                  hidePrices={false}
                  assignedStoreName={order.assigned_store_name || storeInfo?.name}
                />
              );
            })()}
          </div>

          {/* عرض حالة الاكتمال للطلبات المقسمة فقط */}
          {isDividedOrder(order) && getOriginalOrderId(order) && (
            <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <h4 className="text-sm font-semibold mb-2 text-blue-800 flex items-center gap-2">
                <Package className="w-4 h-4" />
                حالة اكتمال الطلب المقسم
              </h4>
              <DivisionCompletionStatus
                originalOrderId={getOriginalOrderId(order)!}
                autoRefresh={true}
                showDetails={false}
              />
              <div className="mt-2 text-xs text-blue-700">
                💡 يمكن تسليم الطلب فقط عندما تصبح الحالة "مكتملة" (جميع المتاجر أكدت توفر منتجاتها)
              </div>
            </div>
          )}

        </div>
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex items-center gap-3 text-lg">
          <Loader2 className="w-6 h-6 animate-spin" />
          جاري التحميل...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="text-lg text-destructive mb-4">{error}</div>
          <Button onClick={() => fetchOrders(storeInfo?.id || "")}>
            المحاولة مرة أخرى
          </Button>
        </div>
      </div>
    );
  }

  const stats = getStatusStats();

  return (
    <div
      className="min-h-screen bg-gradient-to-br from-primary/5 to-secondary/5 p-6"
      dir={dir}
    >
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-primary">
              {t('store.name')}: {storeInfo?.name}
            </h1>
            <p className="text-muted-foreground">{t('store.dashboard')} 📡 REALTIME</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex gap-2">
              <ThemeToggle />
              <LanguageToggle />
            </div>

            {/* Store Notification Bell */}
            {storeInfo?.id && (
              <StoreNotificationBell
                storeId={storeInfo.id}
                refreshInterval={30}
              />
            )}

            <Button
              onClick={handleRefreshOrders}
              variant="outline"
              disabled={isRefreshing}
              className="gap-2"
            >
              {isRefreshing ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current"></div>
                  {t('loading')}
                </>
              ) : (
                <>
                  <RefreshCw className="w-4 h-4" />
                  {t('store.refresh')}
                </>
              )}
            </Button>
            <Button onClick={handleLogout} variant="outline" className="gap-2">
              <LogOut className="w-4 h-4" />
              {t('store.logout')}
            </Button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-6 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <Package className="w-8 h-8 text-primary" />
                <div>
                  <p className="text-2xl font-bold">{stats.total}</p>
                  <p className="text-muted-foreground">{t('store.orders.total')}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <Clock className="w-8 h-8 text-blue-600" />
                <div>
                  <p className="text-2xl font-bold">{stats.assigned}</p>
                  <p className="text-muted-foreground">{t('store.orders.assigned')}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <CheckCircle className="w-8 h-8 text-green-600" />
                <div>
                  <p className="text-2xl font-bold">{stats.delivered}</p>
                  <p className="text-muted-foreground">{t('store.orders.delivered')}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <XCircle className="w-8 h-8 text-red-600" />
                <div>
                  <p className="text-2xl font-bold">{stats.returned}</p>
                  <p className="text-muted-foreground">{t('store.orders.returned')}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <UserX className="w-8 h-8 text-purple-600" />
                <div>
                  <p className="text-2xl font-bold">{stats.customer_rejected}</p>
                  <p className="text-muted-foreground">
                    <ArabicText>رفض الزبون</ArabicText>
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Orders List with Tabs */}
        <Card>
          <CardHeader>
            <CardTitle>{t('store.orders')}</CardTitle>
            <CardDescription>
              {t('store.orders.description')}&nbsp;
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="assigned" className="w-full">
              <TabsList className="grid w-full grid-cols-4 md:grid-cols-4 lg:grid-cols-4">
                <TabsTrigger value="assigned">
                  📦 {t('store.tab.assigned')} ({stats.assigned})
                </TabsTrigger>
                <TabsTrigger value="delivered">
                  ✅ {t('delivered')} ({stats.delivered})
                </TabsTrigger>
                <TabsTrigger value="returned">
                  🔁 مرتجع ({stats.returned})
                </TabsTrigger>
                <TabsTrigger value="customer_rejected">
                  🚫 <ArabicText>رفض الزبون</ArabicText> ({stats.customer_rejected})
                </TabsTrigger>
              </TabsList>

              <TabsContent
                value="assigned"
                className="space-y-4 max-h-96 overflow-y-auto"
              >
                {getOrdersByStatus("assigned").map((order) =>
                  renderOrderCard(order),
                )}
                {getOrdersByStatus("assigned").length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    {t('no.orders.assigned')}
                  </div>
                )}
              </TabsContent>

              <TabsContent
                value="delivered"
                className="space-y-4 max-h-96 overflow-y-auto"
              >
                {getOrdersByStatus("delivered").map((order) =>
                  renderOrderCard(order),
                )}
                {getOrdersByStatus("delivered").length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    {t('no.orders.delivered')}
                  </div>
                )}
              </TabsContent>

              <TabsContent
                value="returned"
                className="space-y-4 max-h-96 overflow-y-auto"
              >
                {getOrdersByStatus("returned").map((order) =>
                  renderOrderCard(order),
                )}
                {getOrdersByStatus("returned").length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    لا توجد طلبات مرتجعة
                  </div>
                )}
              </TabsContent>

              <TabsContent
                value="customer_rejected"
                className="space-y-4 max-h-96 overflow-y-auto"
              >
                {getOrdersByStatus("customer_rejected").map((order) =>
                  renderOrderCard(order),
                )}
                {getOrdersByStatus("customer_rejected").length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    <ArabicText>{t('no.rejected.orders.customer')}</ArabicText>
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>

      {/* Order Details Dialog */}
      <Dialog open={showOrderDetails} onOpenChange={setShowOrderDetails}>
        <DialogContent className="max-w-[95vw] sm:max-w-4xl max-h-[80vh] overflow-y-auto" dir={dir}>
          <DialogHeader>
            <DialogTitle>
              {(() => {
                if (!selectedOrderId) return t('store.order.details');
                const selectedOrder = orders.find(o => o.order_id === selectedOrderId);
                if (selectedOrder?.order_status === "assigned") {
                  if (!selectedOrder?.store_response_status) {
                    return t('store.dialog.inventory.status');
                  } else if (selectedOrder?.store_response_status === "available") {
                    return t('store.dialog.available.customer');
                  }
                }
                return t('store.order.details');
              })()}
            </DialogTitle>
          </DialogHeader>
          {selectedOrderId && (() => {
            const selectedOrder = orders.find(o => o.order_id === selectedOrderId);

            console.log('🔍 Dialog selectedOrder:', {
              selectedOrderId,
              selectedOrder: selectedOrder ? {
                id: selectedOrder.order_id,
                order_status: selectedOrder.order_status,
                store_response_status: selectedOrder.store_response_status,
                order_items: selectedOrder.order_items?.length || 0,
                order_items_data: selectedOrder.order_items,
                items: selectedOrder.items?.length || 0,
                items_data: selectedOrder.items
              } : null
            });

            // إذا كان الطلب معيناً عرض مكون التحقق من المخزون
            if (selectedOrder?.order_status === "assigned") {
              return (
                <StoreProductAvailabilityCheck
                  storeId={storeInfo?.id || ""}
                  order={{
                    id: selectedOrder.order_id,
                    order_code: selectedOrder.order_code,
                    customer_name: selectedOrder.customer_name,
                    customer_phone: selectedOrder.customer_phone,
                    customer_address: selectedOrder.customer_address,
                    customer_notes: selectedOrder.customer_notes,
                    total_amount: selectedOrder.total_amount,
                    subtotal: selectedOrder.subtotal,
                    created_at: selectedOrder.created_at,
                    order_status: selectedOrder.order_status,
                    store_response_status: selectedOrder.store_response_status,
                    order_items: selectedOrder.order_items || [],
                    items: selectedOrder.items || []
                  }}
                  onAvailableResponse={handleStoreAvailableResponse}
                  onUnavailableResponse={handleStoreUnavailableResponse}
                  onDeliveryConfirm={handleDeliveryConfirm}
                />
              );
            }

            // للطلبات الأخرى، عرض التفاصيل العادية
            return (
              <OrderDetails
                orderId={selectedOrder?.order_id || ""}
                onClose={handleCloseOrderDetails}
                onOrderUpdated={handleOrderUpdated}
              />
            );
          })()}
        </DialogContent>
      </Dialog>

      {/* Return Reason Dialog */}
      <ReturnReasonDialog
        isOpen={showReturnDialog}
        onClose={handleReturnCancel}
        onConfirm={handleReturnConfirm}
        orderCode={pendingReturnOrder?.code || ""}
      />

      {/* Customer Details Dialog */}
      <Dialog open={showCustomerDetails} onOpenChange={setShowCustomerDetails}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto" dir={dir}>
          <DialogHeader>
            <DialogTitle>{t('customer.details.delivery')}</DialogTitle>
          </DialogHeader>
          {customerDetailsOrderId && (() => {
            const customerOrder = orders.find(o => o.order_id === customerDetailsOrderId);
            return customerOrder && (
              <CustomerDeliveryDetails
                order={{
                  id: customerOrder.order_id,
                  order_code: customerOrder.order_code,
                  customer_name: customerOrder.customer_name,
                  customer_phone: customerOrder.customer_phone,
                  customer_address: customerOrder.customer_address,
                  customer_city: customerOrder.customer_city,
                  customer_notes: customerOrder.customer_notes,
                  total_amount: customerOrder.total_amount,
                  created_at: customerOrder.created_at,
                  order_status: customerOrder.order_status,
                  order_items: customerOrder.order_items || [],
                  items: customerOrder.items || []
                }}
                onDeliveryComplete={handleDeliveryComplete}
                onReturnOrder={handleReturnOrder}
                onClose={() => setShowCustomerDetails(false)}
              />
            );
          })()}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default StoreDashboard;
