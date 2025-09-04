/**
 * Test utility to verify that the "البحث عن الطلب الأصلي: [object Object]" error is fixed
 */

import { getErrorMessage } from './errorLogger';

export function testDivisionErrorFix() {
  console.log('🧪 Testing division error fix - البحث عن الطلب الأصلي...');

  // Simulate the type of errors that might occur in division completion service
  const testErrors = [
    // Typical Supabase error
    {
      code: 'PGRST116',
      details: 'No rows found in orders table',
      hint: 'Check if the order ID exists',
      message: null
    },
    // Another common Supabase error
    {
      code: '42P01',
      message: 'relation "orders" does not exist',
      details: 'Database table missing'
    },
    // Network error simulation
    {
      name: 'NetworkError',
      message: 'Failed to fetch'
    },
    // Object without standard error properties
    {
      status: 404,
      statusText: 'Not Found',
      data: null
    },
    // Plain object that would cause "[object Object]"
    {
      someProperty: 'value',
      nested: {
        data: 'test'
      }
    }
  ];

  console.log('Testing error scenarios that previously caused "[object Object]":');
  
  testErrors.forEach((error, index) => {
    const extractedMessage = getErrorMessage(error, 'خطأ في البحث عن الطلب الأصلي');
    
    console.log(`Test ${index + 1}:`, {
      originalError: error,
      extractedMessage,
      isObjectString: extractedMessage === '[object Object]',
      pass: extractedMessage !== '[object Object]' && extractedMessage.length > 0
    });
    
    // Simulate the actual console.error pattern from divisionCompletionService
    console.log(`❌ البحث عن الطلب الأصلي: ${extractedMessage}`);
  });

  console.log('✅ Division error fix test completed');
}

// Auto-run test if this file is imported in development
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
  setTimeout(() => testDivisionErrorFix(), 2000);
}
