/**
 * Configuration Diagnostics Utility
 * Helps identify and fix common configuration issues
 */

import { supabase } from '@/integrations/supabase/client';

export interface ConfigDiagnostics {
  overall: 'healthy' | 'warning' | 'error';
  supabase: {
    status: 'ok' | 'warning' | 'error';
    url: string;
    hasKey: boolean;
    connection?: 'ok' | 'failed';
    errorDetails?: string;
  };
  edgeFunctions: {
    status: 'ok' | 'warning' | 'error';
    baseUrl: string;
    hasEnvVar: boolean;
    connectivity?: 'ok' | 'failed';
    errorDetails?: string;
  };
  environment: {
    nodeEnv: string;
    hasEnvFile: boolean;
    missingVars: string[];
  };
  recommendations: string[];
}

export class ConfigDiagnosticsService {
  private static instance: ConfigDiagnosticsService;

  static getInstance(): ConfigDiagnosticsService {
    if (!ConfigDiagnosticsService.instance) {
      ConfigDiagnosticsService.instance = new ConfigDiagnosticsService();
    }
    return ConfigDiagnosticsService.instance;
  }

  /**
   * تشخيص شامل للتكوين
   */
  async runFullDiagnostics(): Promise<ConfigDiagnostics> {
    console.log('🔍 Running configuration diagnostics...');

    const diagnostics: ConfigDiagnostics = {
      overall: 'healthy',
      supabase: await this.checkSupabaseConfig(),
      edgeFunctions: await this.checkEdgeFunctionsConfig(),
      environment: this.checkEnvironmentConfig(),
      recommendations: []
    };

    // تحديد الحالة العامة
    const hasErrors = [diagnostics.supabase.status, diagnostics.edgeFunctions.status].includes('error');
    const hasWarnings = [diagnostics.supabase.status, diagnostics.edgeFunctions.status].includes('warning');

    if (hasErrors) {
      diagnostics.overall = 'error';
    } else if (hasWarnings) {
      diagnostics.overall = 'warning';
    }

    // إنشاء التوصيات
    diagnostics.recommendations = this.generateRecommendations(diagnostics);

    console.log('📋 Diagnostics completed:', diagnostics);
    return diagnostics;
  }

  /**
   * فحص تكوين Supabase
   */
  private async checkSupabaseConfig(): Promise<ConfigDiagnostics['supabase']> {
    const url = import.meta.env.VITE_SUPABASE_URL || "https://wkzjovhlljeaqzoytpeb.supabase.co";
    const hasKey = !!(import.meta.env.VITE_SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndrempvdmhsbGplYXF6b3l0cGViIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDkwNDY2MjIsImV4cCI6MjA2NDYyMjYyMn0.mx8PnQJaMochaPbjYUmwzlVNIULM05LUDBIM7OFFjZ8");

    const result: ConfigDiagnostics['supabase'] = {
      status: 'ok',
      url,
      hasKey
    };

    // اختبار الاتصال
    try {
      console.log('🔗 Testing Supabase connection...');
      const { error } = await supabase.from('notifications').select('id').limit(1);
      
      if (error) {
        result.status = 'warning';
        result.connection = 'failed';
        result.errorDetails = error.message;
        console.warn('⚠️ Supabase connection test failed:', error);
      } else {
        result.connection = 'ok';
        console.log('✅ Supabase connection test successful');
      }
    } catch (error) {
      result.status = 'error';
      result.connection = 'failed';
      result.errorDetails = error instanceof Error ? error.message : 'Unknown connection error';
      console.error('❌ Supabase connection test error:', error);
    }

    return result;
  }

  /**
   * فحص تكوين Edge Functions
   */
  private async checkEdgeFunctionsConfig(): Promise<ConfigDiagnostics['edgeFunctions']> {
    const baseUrl = import.meta.env.VITE_SUPABASE_EDGE_FUNCTIONS_BASE || 'https://wkzjovhlljeaqzoytpeb.supabase.co/functions/v1';
    const hasEnvVar = !!import.meta.env.VITE_SUPABASE_EDGE_FUNCTIONS_BASE;

    const result: ConfigDiagnostics['edgeFunctions'] = {
      status: hasEnvVar ? 'ok' : 'warning',
      baseUrl,
      hasEnvVar
    };

    // اختبار الاتصال بـ Edge Functions
    try {
      console.log('🔗 Testing Edge Functions connectivity...');
      const response = await fetch(`${baseUrl}/get-order`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ orderId: 'connectivity-test' })
      });

      // نتوقع خطأ 400 أو مشابه للمعرف غير الصالح، لكن ليس خطأ شبكة
      if (response.status < 500) {
        result.connectivity = 'ok';
        console.log('✅ Edge Functions connectivity test successful (status:', response.status, ')');
      } else {
        result.status = 'error';
        result.connectivity = 'failed';
        result.errorDetails = `HTTP ${response.status}: ${response.statusText}`;
        console.error('❌ Edge Functions connectivity test failed:', response.status, response.statusText);
      }
    } catch (error) {
      result.status = 'error';
      result.connectivity = 'failed';
      result.errorDetails = error instanceof Error ? error.message : 'Network connectivity error';
      console.error('❌ Edge Functions connectivity error:', error);
    }

    return result;
  }

  /**
   * فحص تكوين البيئة
   */
  private checkEnvironmentConfig(): ConfigDiagnostics['environment'] {
    const nodeEnv = import.meta.env.VITE_NODE_ENV || import.meta.env.NODE_ENV || 'production';
    
    // فحص المتغيرات المطلوبة
    const requiredVars = [
      'VITE_SUPABASE_URL',
      'VITE_SUPABASE_ANON_KEY',
      'VITE_SUPABASE_EDGE_FUNCTIONS_BASE'
    ];

    const missingVars = requiredVars.filter(varName => !import.meta.env[varName]);
    const hasEnvFile = missingVars.length === 0; // تقدير بسيط

    return {
      nodeEnv,
      hasEnvFile,
      missingVars
    };
  }

  /**
   * إنشاء التوصيات بناءً على نتائج التشخيص
   */
  private generateRecommendations(diagnostics: ConfigDiagnostics): string[] {
    const recommendations: string[] = [];

    // توصيات Supabase
    if (diagnostics.supabase.status === 'error') {
      recommendations.push('🔴 إصلاح مطلوب: مشكلة في الاتصال بـ Supabase. تحقق من صحة URL و API Key.');
    } else if (diagnostics.supabase.status === 'warning') {
      recommendations.push('🟡 تحذير: مشكلة في الاتصال بـ Supabase. قد تحتاج لفحص أذونات قاعدة البيانات.');
    }

    // توصيات Edge Functions
    if (diagnostics.edgeFunctions.status === 'error') {
      recommendations.push('🔴 إصلاح مطلوب: لا يمكن الوصول لـ Edge Functions. تحقق من URL ووجود Functions.');
    } else if (!diagnostics.edgeFunctions.hasEnvVar) {
      recommendations.push('🟡 تحسين: استخدم متغير البيئة VITE_SUPABASE_EDGE_FUNCTIONS_BASE بدلاً من القيمة المدمجة.');
    }

    // توصيات البيئة
    if (diagnostics.environment.missingVars.length > 0) {
      recommendations.push(`🟡 تحسين: أضف متغيرات البيئة التالية: ${diagnostics.environment.missingVars.join(', ')}`);
      recommendations.push('💡 نصيحة: أنشئ ملف .env.local وأضف المتغيرات المطلوبة.');
    }

    // توصيات عامة
    if (diagnostics.overall === 'error') {
      recommendations.push('🚨 إجراء عاجل: يوجد مشاكل حرجة تمنع النظام من العمل بشكل صحيح.');
    } else if (diagnostics.overall === 'healthy' && recommendations.length === 0) {
      recommendations.push('✅ ممتاز: التكوين يبدو صحيحاً وجميع الخدمات تعمل بشكل طبيعي.');
    }

    return recommendations;
  }

  /**
   * اختبار سريع للتكوين
   */
  async quickHealthCheck(): Promise<{
    healthy: boolean;
    errors: string[];
    warnings: string[];
  }> {
    const errors: string[] = [];
    const warnings: string[] = [];

    // فحص سريع للمتغيرات الأساسية
    if (!import.meta.env.VITE_SUPABASE_URL && !import.meta.env.VITE_SUPABASE_ANON_KEY) {
      errors.push('Missing Supabase configuration');
    }

    // فحص سريع للاتصال
    try {
      const { error } = await supabase.from('notifications').select('id').limit(1);
      if (error) {
        warnings.push(`Database access issue: ${error.message}`);
      }
    } catch (error) {
      errors.push('Cannot connect to Supabase');
    }

    return {
      healthy: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * طباعة تقرير التشخيص
   */
  printDiagnosticsReport(diagnostics: ConfigDiagnostics): void {
    console.group('📊 Configuration Diagnostics Report');
    
    console.log(`Overall Status: ${this.getStatusEmoji(diagnostics.overall)} ${diagnostics.overall.toUpperCase()}`);
    
    console.group('🔧 Supabase Configuration');
    console.log(`Status: ${this.getStatusEmoji(diagnostics.supabase.status)} ${diagnostics.supabase.status}`);
    console.log(`URL: ${diagnostics.supabase.url}`);
    console.log(`Has Key: ${diagnostics.supabase.hasKey ? '✅' : '❌'}`);
    if (diagnostics.supabase.connection) {
      console.log(`Connection: ${diagnostics.supabase.connection === 'ok' ? '✅' : '❌'}`);
    }
    if (diagnostics.supabase.errorDetails) {
      console.log(`Error: ${diagnostics.supabase.errorDetails}`);
    }
    console.groupEnd();

    console.group('⚡ Edge Functions Configuration');
    console.log(`Status: ${this.getStatusEmoji(diagnostics.edgeFunctions.status)} ${diagnostics.edgeFunctions.status}`);
    console.log(`Base URL: ${diagnostics.edgeFunctions.baseUrl}`);
    console.log(`Has Env Var: ${diagnostics.edgeFunctions.hasEnvVar ? '✅' : '❌'}`);
    if (diagnostics.edgeFunctions.connectivity) {
      console.log(`Connectivity: ${diagnostics.edgeFunctions.connectivity === 'ok' ? '✅' : '❌'}`);
    }
    if (diagnostics.edgeFunctions.errorDetails) {
      console.log(`Error: ${diagnostics.edgeFunctions.errorDetails}`);
    }
    console.groupEnd();

    console.group('🌍 Environment Configuration');
    console.log(`Environment: ${diagnostics.environment.nodeEnv}`);
    console.log(`Has Env File: ${diagnostics.environment.hasEnvFile ? '✅' : '❌'}`);
    if (diagnostics.environment.missingVars.length > 0) {
      console.log(`Missing Variables: ${diagnostics.environment.missingVars.join(', ')}`);
    }
    console.groupEnd();

    if (diagnostics.recommendations.length > 0) {
      console.group('💡 Recommendations');
      diagnostics.recommendations.forEach(rec => console.log(rec));
      console.groupEnd();
    }

    console.groupEnd();
  }

  private getStatusEmoji(status: string): string {
    switch (status) {
      case 'ok':
      case 'healthy':
        return '✅';
      case 'warning':
        return '🟡';
      case 'error':
        return '🔴';
      default:
        return '❓';
    }
  }
}

// إنشاء instance مشترك
export const configDiagnostics = ConfigDiagnosticsService.getInstance();

// دوال مساعدة سريعة
export const runDiagnostics = () => configDiagnostics.runFullDiagnostics();
export const quickCheck = () => configDiagnostics.quickHealthCheck();

export default configDiagnostics;
