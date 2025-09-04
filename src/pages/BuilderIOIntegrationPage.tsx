import React from 'react';
import BuilderIOIntegration from '@/components/integration/BuilderIOIntegration';

const BuilderIOIntegrationPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="container mx-auto py-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Builder.io Integration
          </h1>
          <p className="text-gray-600 max-w-2xl mx-auto">
            اختبار وإعداد تكامل نظام الإشعارات مع Builder.io. 
            استخدم هذه الصفحة لاختبار Service Worker والإشعارات قبل التطبيق في Builder.io.
          </p>
        </div>
        
        <BuilderIOIntegration />
        
        {/* إرشادات إضافية */}
        <div className="max-w-4xl mx-auto mt-8 grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white p-6 rounded-lg shadow-sm">
            <h3 className="text-lg font-semibold mb-3 text-green-700">
              ✅ نجح التكامل؟
            </h3>
            <ul className="text-sm text-gray-600 space-y-1">
              <li>• Service Worker مسجل بنجاح</li>
              <li>• صلاحية الإشعارات ممنوحة</li>
              <li>• الإشعارات التجريبية تعمل</li>
              <li>• يمكن استخدام الكود في Builder.io</li>
            </ul>
          </div>
          
          <div className="bg-white p-6 rounded-lg shadow-sm">
            <h3 className="text-lg font-semibold mb-3 text-red-700">
              ❌ المشاكل الشائعة
            </h3>
            <ul className="text-sm text-gray-600 space-y-1">
              <li>• المتصفح لا يدعم Service Workers</li>
              <li>• الصلاحيات محجوبة أو مرفوضة</li>
              <li>• الإشعارات معطلة في النظام</li>
              <li>• مشاكل HTTPS (مطلوب لـ Service Workers)</li>
            </ul>
          </div>
        </div>
        
        {/* معلومات تقنية */}
        <div className="max-w-4xl mx-auto mt-8">
          <div className="bg-white p-6 rounded-lg shadow-sm">
            <h3 className="text-lg font-semibold mb-3">معلومات تقنية</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div>
                <strong>Service Worker Path:</strong>
                <code className="block bg-gray-100 p-1 rounded mt-1">/service-worker.js</code>
              </div>
              <div>
                <strong>Scope:</strong>
                <code className="block bg-gray-100 p-1 rounded mt-1">/</code>
              </div>
              <div>
                <strong>Icons Path:</strong>
                <code className="block bg-gray-100 p-1 rounded mt-1">/icons/</code>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BuilderIOIntegrationPage;
