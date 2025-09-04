import React from 'react';
import RealtimeMonitor from '@/components/debug/RealtimeMonitor';

export default function RealtimeMonitorPage() {
  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto p-6">
        <RealtimeMonitor />
      </div>
    </div>
  );
}
