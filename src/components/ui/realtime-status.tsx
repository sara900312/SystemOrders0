import React, { useState, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { 
  Wifi, 
  WifiOff, 
  RefreshCw, 
  Activity, 
  Clock,
  Users,
  Database,
  Zap
} from 'lucide-react';
import { realtimeNotificationService } from '@/services/realtimeNotificationService';

interface RealtimeStatusProps {
  showDetails?: boolean;
  compact?: boolean;
}

const RealtimeStatus: React.FC<RealtimeStatusProps> = ({ 
  showDetails = false, 
  compact = false 
}) => {
  const [status, setStatus] = useState({
    isConnected: false,
    subscribersCount: 0,
    channelState: null as string | null
  });
  
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
  const [isReconnecting, setIsReconnecting] = useState(false);

  useEffect(() => {
    const updateStatus = () => {
      const currentStatus = realtimeNotificationService.getStatus();
      setStatus(currentStatus);
      setLastUpdate(new Date());
    };

    // تحديث فوري
    updateStatus();

    // تحديث كل 5 ثوانٍ
    const interval = setInterval(updateStatus, 5000);

    return () => clearInterval(interval);
  }, []);

  const handleReconnect = async () => {
    setIsReconnecting(true);
    try {
      await realtimeNotificationService.reconnect();
      setStatus(realtimeNotificationService.getStatus());
    } catch (error) {
      console.error('Failed to reconnect:', error);
    } finally {
      setIsReconnecting(false);
    }
  };

  const getConnectionIcon = () => {
    if (isReconnecting) {
      return <RefreshCw className="w-4 h-4 animate-spin text-blue-500" />;
    }
    return status.isConnected ? (
      <Wifi className="w-4 h-4 text-green-600" />
    ) : (
      <WifiOff className="w-4 h-4 text-red-600" />
    );
  };

  const getConnectionColor = () => {
    if (isReconnecting) return 'text-blue-600';
    return status.isConnected ? 'text-green-600' : 'text-red-600';
  };

  const getConnectionBadge = () => {
    if (isReconnecting) {
      return <Badge variant="secondary" className="text-blue-600">جاري الاتصال...</Badge>;
    }
    return (
      <Badge variant={status.isConnected ? "default" : "destructive"}>
        {status.isConnected ? "متصل" : "غير متصل"}
      </Badge>
    );
  };

  const formatLastUpdate = () => {
    return lastUpdate.toLocaleTimeString('ar', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  if (compact) {
    return (
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="ghost" size="sm" className="h-8 px-2">
            {getConnectionIcon()}
            <span className={`ml-1 text-xs ${getConnectionColor()}`}>
              Realtime
            </span>
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-80" align="end">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="font-medium">حالة Realtime</h4>
              {getConnectionBadge()}
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1">
                  <Users className="w-3 h-3" />
                  المشتركون
                </span>
                <Badge variant="outline">{status.subscribersCount}</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1">
                  <Database className="w-3 h-3" />
                  حالة القناة
                </span>
                <Badge variant="outline">{status.channelState || 'N/A'}</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  آخر تحديث
                </span>
                <span className="text-xs text-muted-foreground">
                  {formatLastUpdate()}
                </span>
              </div>
            </div>
            {!status.isConnected && (
              <Button 
                onClick={handleReconnect} 
                disabled={isReconnecting}
                size="sm" 
                className="w-full"
              >
                <RefreshCw className="w-3 h-3 mr-1" />
                إعادة اتصال
              </Button>
            )}
          </div>
        </PopoverContent>
      </Popover>
    );
  }

  if (!showDetails) {
    return (
      <div className="flex items-center gap-2">
        {getConnectionIcon()}
        <span className={`text-sm font-medium ${getConnectionColor()}`}>
          Realtime
        </span>
        {getConnectionBadge()}
      </div>
    );
  }

  return (
    <Card className="w-full">
      <CardContent className="p-4">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-medium flex items-center gap-2">
              <Zap className="w-4 h-4" />
              حالة Realtime
            </h3>
            {getConnectionBadge()}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">الاتصال</p>
                <p className={`text-sm font-medium ${getConnectionColor()}`}>
                  {status.isConnected ? 'نشط' : 'معطل'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">المشتركون</p>
                <p className="text-sm font-medium">{status.subscribersCount}</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Database className="w-4 h-4 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">حالة القناة</p>
                <p className="text-sm font-medium">{status.channelState || 'غير متاح'}</p>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between pt-2 border-t">
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Clock className="w-3 h-3" />
              آخر تحديث: {formatLastUpdate()}
            </div>
            
            {!status.isConnected && (
              <Button 
                onClick={handleReconnect} 
                disabled={isReconnecting}
                size="sm"
                variant="outline"
              >
                <RefreshCw className={`w-3 h-3 mr-1 ${isReconnecting ? 'animate-spin' : ''}`} />
                إعادة اتصال
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default RealtimeStatus;
