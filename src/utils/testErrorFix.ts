/**
 * Test utility to verify that "[object Object]" errors are fixed
 */

import { getErrorMessage } from './errorLogger';

export function testErrorHandling() {
  console.log('🧪 Testing error handling fixes...');

  // Test cases that previously caused "[object Object]"
  const testCases = [
    // Supabase-style error object
    {
      code: 'PGRST116',
      details: 'No rows found',
      hint: 'Check your query',
      message: null
    },
    // Error with only details
    {
      details: 'Connection failed',
      code: '500'
    },
    // Empty object
    {},
    // String error
    'Simple string error',
    // Error instance
    new Error('Standard error message'),
    // Null/undefined
    null,
    undefined,
    // Complex object
    {
      nested: {
        error: {
          message: 'Nested error message'
        }
      }
    }
  ];

  testCases.forEach((testCase, index) => {
    const result = getErrorMessage(testCase, 'خطأ افتراضي');
    console.log(`Test ${index + 1}:`, {
      input: testCase,
      output: result,
      isObjectString: result === '[object Object]'
    });
    
    // Assert no "[object Object]" results
    if (result === '[object Object]') {
      console.error(`❌ Test ${index + 1} failed: Still producing "[object Object]"`);
    } else {
      console.log(`✅ Test ${index + 1} passed: "${result}"`);
    }
  });

  console.log('🎯 Error handling test completed');
}

// Auto-run test if this file is imported
if (typeof window !== 'undefined') {
  // Only run in browser environment
  setTimeout(() => testErrorHandling(), 1000);
}
