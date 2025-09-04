/**
 * Realtime 401 Fix Component
 * 
 * A simple button component that fixes Supabase Realtime 401 errors
 * Use this component anywhere in your app to diagnose and fix Realtime issues
 */

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, XCircle, AlertTriangle, RefreshCw, Zap } from 'lucide-react';

import { fixAndTestRealtime, diagnoseRealtimeIssue } from '@/utils/realtime401Fix';

interface FixResult {
  authFixed: boolean;
  connectionWorking: boolean;
  authResult: any;
  connectionResult: any;
  instructions: string[];
}

const RealtimeFix: React.FC<{ 
  onFixed?: () => void;
  showDiagnostics?: boolean;
}> = ({ onFixed, showDiagnostics = true }) => {
  const [isFixing, setIsFixing] = useState(false);
  const [isDiagnosing, setIsDiagnosing] = useState(false);
  const [fixResult, setFixResult] = useState<FixResult | null>(null);
  const [diagnostics, setDiagnostics] = useState<any>(null);

  const handleFix = async () => {
    setIsFixing(true);
    setFixResult(null);
    
    try {
      console.log('🔧 Starting Realtime fix...');
      const result = await fixAndTestRealtime();
      setFixResult(result);
      
      if (result.authFixed && result.connectionWorking && onFixed) {
        onFixed();
      }
    } catch (error) {
      console.error('❌ Error during fix:', error);
      setFixResult({
        authFixed: false,
        connectionWorking: false,
        authResult: { success: false, method: 'error', message: `Error: ${error}` },
        connectionResult: { connected: false, message: 'Fix process failed' },
        instructions: ['❌ An error occurred during the fix process. Check console for details.']
      });
    } finally {
      setIsFixing(false);
    }
  };

  const handleDiagnose = async () => {
    setIsDiagnosing(true);
    setDiagnostics(null);
    
    try {
      const result = await diagnoseRealtimeIssue();
      setDiagnostics(result);
    } catch (error) {
      console.error('❌ Error during diagnosis:', error);
      setDiagnostics({
        currentSession: null,
        anonymousEnabled: false,
        suggestions: [`❌ Diagnosis failed: ${error}`]
      });
    } finally {
      setIsDiagnosing(false);
    }
  };

  const getStatusIcon = (success: boolean) => {
    return success ? (
      <CheckCircle className="h-4 w-4 text-green-500" />
    ) : (
      <XCircle className="h-4 w-4 text-red-500" />
    );
  };

  const getStatusBadge = (success: boolean, label: string) => {
    return (
      <Badge variant={success ? "default" : "destructive"}>
        {success ? '✅' : '❌'} {label}
      </Badge>
    );
  };

  return (
    <Card className="w-full max-w-2xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Zap className="h-5 w-5" />
          Realtime 401 Fix
        </CardTitle>
        <CardDescription>
          Diagnose and fix Supabase Realtime WebSocket 401 Unauthorized errors
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        
        {/* Action Buttons */}
        <div className="flex gap-3 flex-wrap">
          <Button 
            onClick={handleFix} 
            disabled={isFixing}
            className="flex items-center gap-2"
          >
            {isFixing ? (
              <RefreshCw className="h-4 w-4 animate-spin" />
            ) : (
              <Zap className="h-4 w-4" />
            )}
            {isFixing ? 'Fixing...' : 'Fix Realtime 401'}
          </Button>

          {showDiagnostics && (
            <Button 
              variant="outline" 
              onClick={handleDiagnose} 
              disabled={isDiagnosing}
              className="flex items-center gap-2"
            >
              {isDiagnosing ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : (
                <AlertTriangle className="h-4 w-4" />
              )}
              {isDiagnosing ? 'Diagnosing...' : 'Diagnose Issue'}
            </Button>
          )}
        </div>

        {/* Fix Results */}
        {fixResult && (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <h4 className="font-medium">Fix Results:</h4>
              {getStatusBadge(fixResult.authFixed && fixResult.connectionWorking, 'Fixed')}
            </div>

            {/* Status Summary */}
            <div className="grid grid-cols-2 gap-4 p-3 bg-muted rounded-lg">
              <div className="flex items-center gap-2">
                {getStatusIcon(fixResult.authFixed)}
                <span className="text-sm">
                  Authentication: {fixResult.authFixed ? 'Fixed' : 'Failed'}
                </span>
              </div>
              <div className="flex items-center gap-2">
                {getStatusIcon(fixResult.connectionWorking)}
                <span className="text-sm">
                  Connection: {fixResult.connectionWorking ? 'Working' : 'Failed'}
                </span>
              </div>
            </div>

            {/* Auth Details */}
            {fixResult.authResult && (
              <Alert>
                <AlertDescription>
                  <strong>Authentication Method:</strong> {fixResult.authResult.method}<br/>
                  <strong>Message:</strong> {fixResult.authResult.message}
                  {fixResult.authResult.sessionInfo && (
                    <div className="mt-2">
                      <strong>Session:</strong> {fixResult.authResult.sessionInfo.user} 
                      (expires: {fixResult.authResult.sessionInfo.expires})
                    </div>
                  )}
                </AlertDescription>
              </Alert>
            )}

            {/* Instructions */}
            {fixResult.instructions.length > 0 && (
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  <div className="space-y-1">
                    <strong>Instructions:</strong>
                    <ul className="list-disc list-inside space-y-1 mt-2">
                      {fixResult.instructions.map((instruction, index) => (
                        <li key={index} className="text-sm">
                          {instruction}
                        </li>
                      ))}
                    </ul>
                  </div>
                </AlertDescription>
              </Alert>
            )}
          </div>
        )}

        {/* Diagnostics Results */}
        {diagnostics && (
          <div className="space-y-4">
            <h4 className="font-medium">Diagnostic Results:</h4>
            
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                {getStatusIcon(!!diagnostics.currentSession)}
                <span className="text-sm">
                  Current Session: {diagnostics.currentSession ? 
                    `${diagnostics.currentSession.user} (expires: ${diagnostics.currentSession.expires})` : 
                    'None'
                  }
                </span>
              </div>
              
              <div className="flex items-center gap-2">
                {getStatusIcon(diagnostics.anonymousEnabled)}
                <span className="text-sm">
                  Anonymous Auth: {diagnostics.anonymousEnabled ? 'Enabled' : 'Disabled'}
                </span>
              </div>
            </div>

            {diagnostics.suggestions.length > 0 && (
              <Alert>
                <AlertDescription>
                  <div className="space-y-1">
                    <strong>Suggestions:</strong>
                    <ul className="list-disc list-inside space-y-1 mt-2">
                      {diagnostics.suggestions.map((suggestion: string, index: number) => (
                        <li key={index} className="text-sm">
                          {suggestion}
                        </li>
                      ))}
                    </ul>
                  </div>
                </AlertDescription>
              </Alert>
            )}
          </div>
        )}

        {/* Quick Help */}
        <Alert>
          <AlertDescription className="text-sm">
            <strong>Quick Help:</strong><br/>
            • This tool automatically fixes the most common Realtime 401 errors<br/>
            • It creates an anonymous session or system user session for Realtime access<br/>
            • If the fix fails, follow the instructions to configure your Supabase project<br/>
            • For detailed guide, see <code>REALTIME_401_FIX.md</code>
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  );
};

export default RealtimeFix;
