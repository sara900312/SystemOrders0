/**
 * Enhanced Edge Functions Service
 * Integrates with Supabase Edge Functions for order management
 */

import { supabase } from '@/integrations/supabase/client';

// Environment variable for Edge Functions base URL
const EDGE_FUNCTIONS_BASE = import.meta.env.VITE_SUPABASE_EDGE_FUNCTIONS_BASE || 'https://wkzjovhlljeaqzoytpeb.supabase.co/functions/v1';

// Types
export interface OrderDetailResponse {
  success: boolean;
  message?: string;
  error?: string;
  order?: {
    id: string;
    order_code: string;
    customer_name: string;
    customer_phone: string;
    customer_address: string;
    customer_city: string;
    customer_notes?: string;
    order_status: string;
    total_amount: number;
    subtotal?: number;
    created_at: string;
    updated_at?: string;
    main_store_name: string;
    assigned_store_id?: string;
    assigned_store_name?: string;
  };
  order_items?: Array<{
    id: number;
    product_id: number;
    quantity: number;
    merged_quantity?: number;
    price: number;
    total_price: number;
    product: {
      id: number;
      name: string;
      price: number;
      discounted_price?: number;
      main_store_name: string;
    };
  }>;
  assigned_store?: {
    id: string;
    name: string;
  };
}

export interface AssignOrderResponse {
  success: boolean;
  message?: string;
  error?: string;
  store_name?: string;
  order_status?: string;
}

export interface AutoAssignResult {
  order_id: string;
  status: 'assigned' | 'unmatched' | 'error';
  store_name?: string;
  error_message?: string;
  notified?: boolean;
  warning?: string;
}

export interface AutoAssignResponse {
  success: boolean;
  message?: string;
  error?: string;
  assigned_count: number;
  unmatched_count: number;
  error_count: number;
  notified_count?: number;
  notification_failed_count?: number;
  results?: AutoAssignResult[];
  errors?: string[];
}

export class EdgeFunctionsService {
  /**
   * Generic method to call Edge Functions with proper error handling
   */
  private static async callEdgeFunction<T>(
    functionName: string,
    body: any = {},
    options?: { timeout?: number; storeId?: string }
  ): Promise<T> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), options?.timeout || 30000);

    try {
      // بناء headers مع إضافة x-store-id إذا كان متوفراً
      const headers: HeadersInit = {
        'Content-Type': 'application/json',
      };

      // إضافة x-store-id header إذا كان مت��فراً ولا يساوي undefined أو فارغ
      if (options?.storeId && options.storeId.trim() !== '') {
        headers['x-store-id'] = options.storeId;
        console.log(`📌 Adding x-store-id header: ${options.storeId}`);
      } else {
        console.log(`ℹ️ No storeId provided for function: ${functionName} (admin mode)`);
      }

      console.log(`🔵 Calling Edge Function: ${functionName}`, {
        body,
        headers,
        url: `${EDGE_FUNCTIONS_BASE}/${functionName}`
      });

      const response = await fetch(`${EDGE_FUNCTIONS_BASE}/${functionName}`, {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      console.log(`📨 ${functionName} response status:`, response.status);

      if (!response.ok) {
        let errorMessage: string;
        try {
          const errorData = await response.json();
          errorMessage = errorData.error || errorData.message || 'Unknown error';

          // إضافة معلومات إضافية للأخطاء المتعلقة بالـ headers
          if (errorMessage.includes('x-store-id')) {
            errorMessage += ` (Headers sent: ${JSON.stringify(headers)})`;
          }
        } catch {
          errorMessage = `HTTP ${response.status}: ${response.statusText}`;
        }
        console.error(`❌ Edge Function ${functionName} failed:`, {
          status: response.status,
          statusText: response.statusText,
          errorMessage,
          headers,
          body
        });
        throw new Error(errorMessage);
      }

      const result = await response.json();
      console.log(`✅ ${functionName} success:`, result);
      return result;

    } catch (error) {
      clearTimeout(timeoutId);

      if (error instanceof Error && error.name === 'AbortError') {
        const timeoutMessage = `انتهت مهلة الاتصال مع ${functionName} (${options?.timeout || 30000}ms) - يرجى المحاولة مرة أخرى`;
        console.error('⏰ Timeout error:', timeoutMessage);
        throw new Error(timeoutMessage);
      }

      // Use enhanced error handling
      const detailedError = this.getDetailedErrorMessage(error, `callEdgeFunction(${functionName})`);
      console.error(`❌ Enhanced error details:`, detailedError);

      // Provide more context in the error
      const enhancedError = new Error(detailedError);
      enhancedError.name = 'EdgeFunctionError';
      (enhancedError as any).originalError = error;
      (enhancedError as any).functionName = functionName;
      (enhancedError as any).baseUrl = EDGE_FUNCTIONS_BASE;

      throw enhancedError;
    }
  }

  /**
   * Get detailed order information by order ID
   *
   * Customer data visibility:
   * - Admin mode (no storeId): Always shows customer data
   * - Store mode (with storeId): Shows customer data only if order status is 'available', 'delivered', or 'returned'
   *
   * Product merging:
   * - Products with same product_id are merged with combined quantity and total price
   */
  static async getOrderDetails(orderId: string, storeId?: string): Promise<OrderDetailResponse> {
    if (!orderId) {
      throw new Error('معرف الطلب مطلوب');
    }

    try {
      // Use GET method with query parameters as per documentation
      const url = new URL(`${EDGE_FUNCTIONS_BASE}/get-order`);
      url.searchParams.append('orderId', orderId);
      url.searchParams.append('adminMode', storeId ? 'false' : 'true');

      const headers: HeadersInit = {};

      // Add x-store-id header if provided (not needed for admin mode)
      if (storeId && storeId.trim() !== '') {
        headers['x-store-id'] = storeId;
        console.log(`📌 Adding x-store-id header for GET: ${storeId}`);
      }

      console.log(`🔵 GET order details:`, {
        orderId,
        storeId,
        adminMode: storeId ? 'false' : 'true',
        url: url.toString()
      });

      const response = await fetch(url.toString(), {
        method: 'GET',
        headers
      });

      console.log(`📨 get-order response status:`, response.status);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'فشل في جلب تفاصيل الطلب');
      }

      return data;
    } catch (error) {
      console.error('❌ Error getting order details:', error);
      
      // Fallback: Try to get basic order data from database
      try {
        console.log('🔄 Attempting database fallback for order:', orderId);

        // First, get the order with stores relation
        const { data: order, error: dbError } = await supabase
          .from('orders')
          .select(`
            *,
            stores:assigned_store_id(
              id,
              name
            )
          `)
          .eq('id', orderId)
          .single();

        if (dbError) {
          console.error('❌ خطأ في جلب الطلب:', dbError);
          throw dbError;
        }

        if (order) {
          console.log('✅ تم جلب الطلب الأساسي:', {
            orderId: order.id,
            order_code: order.order_code
          });

          // Now try to get order_items separately
          let orderItems: any[] = [];
          try {
            console.log('📦 محاولة جلب order_items للطلب:', orderId);
            const { data: items, error: itemsError } = await supabase
              .from('order_items')
              .select(`
                id,
                product_name,
                quantity,
                price,
                discounted_price,
                product_id,
                availability_status,
                products:product_id(
                  id,
                  name,
                  price,
                  discounted_price,
                  main_store_name
                )
              `)
              .eq('order_id', orderId);

            if (itemsError) {
              console.error('❌ خطأ في جلب order_items:', itemsError);
              console.error('❌ تفاصيل الخطأ:', {
                code: itemsError.code,
                details: itemsError.details,
                hint: itemsError.hint,
                message: itemsError.message
              });
              // Don't throw here, continue with fallback
            } else if (items && items.length > 0) {
              console.log('✅ تم جلب order_items بنجاح:', items.length, 'عناصر');
              orderItems = items;
            } else {
              console.log('ℹ️ لم يتم العثور على order_items، استخدام items من الطلب');
            }
          } catch (itemsError) {
            console.error('❌ خطأ في محاولة جلب order_items:', itemsError);
            let errorMessage = 'حدث خطأ في جلب order_items';

            if (itemsError instanceof Error) {
              errorMessage = itemsError.message;
            } else if (itemsError && typeof itemsError === 'object') {
              const errorObj = itemsError as any;
              if (errorObj.message) {
                errorMessage = errorObj.message;
              } else if (errorObj.details) {
                errorMessage = errorObj.details;
              } else {
                try {
                  errorMessage = JSON.stringify(itemsError);
                } catch {
                  errorMessage = 'خطأ غير محدد في جلب order_items';
                }
              }
            } else if (typeof itemsError === 'string') {
              errorMessage = itemsError;
            }

            console.error('❌ رسالة خطأ منسقة:', errorMessage);
            // Don't throw here, continue with fallback
          }

          // Fallback to items JSON if no order_items found
          if (orderItems.length === 0 && order.items) {
            console.log('🔄 استخدام items JSON ك��ديل');
            orderItems = Array.isArray(order.items) ? order.items : [];
          }

          console.log('✅ Database fallback successful');
          return {
            success: true,
            message: 'تم جلب البيانات من قاعدة البيانات (Edge Function غير متاح)',
            order: {
              id: order.id,
              order_code: order.order_code,
              customer_name: order.customer_name,
              customer_phone: order.customer_phone,
              customer_address: order.customer_address,
              customer_city: order.customer_city,
              customer_notes: order.customer_notes,
              order_status: order.order_status || order.status,
              total_amount: order.total_amount,
              subtotal: order.subtotal,
              created_at: order.created_at,
              updated_at: order.updated_at,
              main_store_name: order.main_store_name,
              assigned_store_id: order.assigned_store_id,
              assigned_store_name: order.stores?.name || order.assigned_store_name,
            },
            order_items: orderItems,
            assigned_store: order.assigned_store_id ? {
              id: order.assigned_store_id,
              name: order.stores?.name || order.assigned_store_name || 'متجر غير محدد'
            } : undefined
          };
        }
      } catch (fallbackError) {
        console.error('❌ Database fallback failed - النوع:', typeof fallbackError);
        console.error('❌ Database fallback failed - المحتوى:', fallbackError);

        let errorMessage = 'حدث خطأ في fallback لقاعدة البيانات';

        if (fallbackError instanceof Error) {
          errorMessage = fallbackError.message;
        } else if (fallbackError && typeof fallbackError === 'object') {
          const errorObj = fallbackError as any;
          if (errorObj.message) {
            errorMessage = errorObj.message;
          } else if (errorObj.details) {
            errorMessage = errorObj.details;
          } else {
            try {
              errorMessage = JSON.stringify(fallbackError);
            } catch {
              errorMessage = 'خطأ غير محدد في fallback';
            }
          }
        } else if (typeof fallbackError === 'string') {
          errorMessage = fallbackError;
        }

        console.error('❌ رسالة خطأ fallback منسقة:', errorMessage);
      }

      throw error;
    }
  }

  /**
   * Assign an order to a specific store
   */
  static async assignOrder(orderId: string, storeId: string): Promise<AssignOrderResponse> {
    if (!orderId || !storeId) {
      throw new Error('معرف الطلب ومعرف المتجر مطلوبان');
    }

    try {
      const response = await this.callEdgeFunction<AssignOrderResponse>('assign-order', {
        orderId,
        storeId
      }, {
        storeId
      });

      if (!response.success) {
        throw new Error(response.error || 'فشل في تعيين الطلب');
      }

      return response;
    } catch (error) {
      console.error('❌ Error assigning order:', error);
      throw error;
    }
  }

  /**
   * Auto-assign all pending orders to matching stores
   */
  static async autoAssignOrders(): Promise<AutoAssignResponse> {
    try {
      const response = await this.callEdgeFunction<AutoAssignResponse>('auto-assign-orders', {}, {
        timeout: 60000 // 60 seconds for auto-assign as it may process many orders
      });

      if (!response.success) {
        throw new Error(response.error || 'فشل في التعيين التلقائي للطلبات');
      }

      return response;
    } catch (error) {
      console.error('❌ Error auto-assigning orders:', error);
      throw error;
    }
  }

  /**
   * Check Edge Functions connectivity with detailed diagnostics
   */
  static async checkConnectivity(): Promise<{
    isConnected: boolean;
    status?: number;
    error?: string;
    baseUrl: string;
    hasEnvVar: boolean;
  }> {
    const hasEnvVar = !!import.meta.env.VITE_SUPABASE_EDGE_FUNCTIONS_BASE;

    try {
      console.log('🔍 Checking Edge Functions connectivity...');
      console.log('🔗 Base URL:', EDGE_FUNCTIONS_BASE);
      console.log('🔧 Has Environment Variable:', hasEnvVar);

      const response = await fetch(`${EDGE_FUNCTIONS_BASE}/get-order`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-store-id': 'connectivity-test'
        },
        body: JSON.stringify({ orderId: 'connectivity-test' })
      });

      const isConnected = response.status < 500;

      console.log(isConnected ? '✅ Edge Functions accessible' : '❌ Edge Functions not accessible');
      console.log('📊 Response status:', response.status);

      return {
        isConnected,
        status: response.status,
        baseUrl: EDGE_FUNCTIONS_BASE,
        hasEnvVar
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown network error';
      console.error('❌ Edge Functions connectivity check failed:', errorMessage);

      return {
        isConnected: false,
        error: errorMessage,
        baseUrl: EDGE_FUNCTIONS_BASE,
        hasEnvVar
      };
    }
  }

  /**
   * Enhanced error handling with better error messages
   */
  static getDetailedErrorMessage(error: any, context: string): string {
    if (!error) return 'Unknown error occurred';

    let message = `Error in ${context}: `;

    if (error.message) {
      message += error.message;
    } else if (typeof error === 'string') {
      message += error;
    } else {
      message += 'Unknown error';
    }

    // Add helpful hints based on common error patterns
    if (error.message?.includes('fetch')) {
      message += ' (Network connectivity issue - check if Edge Functions are deployed)';
    } else if (error.message?.includes('404')) {
      message += ' (Edge Function not found - check function name and deployment)';
    } else if (error.message?.includes('401') || error.message?.includes('403')) {
      message += ' (Authentication issue - check API keys and permissions)';
    } else if (error.message?.includes('500')) {
      message += ' (Server error - check Edge Function logs)';
    }

    return message;
  }
}

export default EdgeFunctionsService;
