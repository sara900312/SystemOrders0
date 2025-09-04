import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { testDivisionErrorFix } from '@/utils/testDivisionError';
import { getErrorMessage } from '@/utils/errorLogger';

export default function TestDivisionErrorFix() {
  const [testResults, setTestResults] = useState<string[]>([]);
  const [isRunning, setIsRunning] = useState(false);

  const runErrorTest = () => {
    setIsRunning(true);
    setTestResults([]);
    
    try {
      // Test the exact error patterns that were causing "[object Object]"
      const testErrors = [
        {
          code: 'PGRST116',
          details: 'No rows found',
          hint: 'Check your query'
        },
        {
          status: 404,
          statusText: 'Not Found'
        },
        {
          someRandomProperty: 'value',
          nested: { data: 'test' }
        },
        null,
        undefined,
        'Simple string error'
      ];

      const results: string[] = [];
      
      testErrors.forEach((error, index) => {
        const extracted = getErrorMessage(error, 'خطأ افتراضي');
        const testMessage = `❌ البحث عن الطلب الأصلي: ${extracted}`;
        
        results.push(`Test ${index + 1}: ${testMessage}`);
        
        // Check if we got "[object Object]"
        if (extracted === '[object Object]') {
          results.push(`  ❌ FAILED: Still getting "[object Object]"`);
        } else {
          results.push(`  ✅ PASSED: Got meaningful message: "${extracted}"`);
        }
      });
      
      // Run the comprehensive test
      testDivisionErrorFix();
      
      setTestResults(results);
      
    } catch (error) {
      setTestResults([`Error running test: ${getErrorMessage(error, 'خطأ في الاختبار')}`]);
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            🔧 اختبار إصلاح خطأ البحث عن الطلب الأصلي
            <Badge variant="outline">Division Error Fix Test</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-sm text-gray-600">
            <p>هذا الاختبار يتحقق من إصلاح الخطأ:</p>
            <code className="bg-red-50 text-red-800 p-1 rounded">
              ❌ البحث عن الطلب الأصلي: [object Object]
            </code>
          </div>
          
          <Button 
            onClick={runErrorTest} 
            disabled={isRunning}
            className="w-full"
          >
            {isRunning ? 'جاري الاختبار...' : 'تشغيل اختبار الأخطاء'}
          </Button>

          {testResults.length > 0 && (
            <div className="mt-4 p-4 bg-gray-50 rounded-lg">
              <h3 className="font-semibold mb-2">نتائج الاختبار:</h3>
              <div className="space-y-1 text-sm font-mono">
                {testResults.map((result, index) => (
                  <div 
                    key={index}
                    className={`p-2 rounded ${
                      result.includes('FAILED') ? 'bg-red-100 text-red-800' :
                      result.includes('PASSED') ? 'bg-green-100 text-green-800' :
                      'bg-blue-100 text-blue-800'
                    }`}
                  >
                    {result}
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="mt-6 p-4 bg-blue-50 rounded-lg">
            <h4 className="font-semibold text-blue-800 mb-2">تعليمات للتحقق:</h4>
            <ul className="text-sm text-blue-700 space-y-1">
              <li>1. افتح Developer Tools (F12)</li>
              <li>2. انقر على "تشغيل اختبار الأخطاء"</li>
              <li>3. راقب Console للتأكد من عدم ظهور "[object Object]"</li>
              <li>4. جميع رسائل الأخطاء يجب أن تكون واضحة ومفهومة</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
