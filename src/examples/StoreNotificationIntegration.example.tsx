import React from 'react';
import StoreNotificationCenter from '@/components/stores/StoreNotificationCenter';
import StoreNotificationToast from '@/components/stores/StoreNotificationToast';
// This is an example of how to integrate the notification system into your existing StoreDashboard

const ExampleStoreDashboardWithNotifications = () => {
  // Assume you have the store information available
  const storeInfo = {
    id: 'your-store-id-here', // This should come from your store context/auth
    name: 'اسم المتجر'
  };

  return (
    <div className="store-dashboard">
      {/* Your existing dashboard header */}
      <div className="dashboard-header">
        <h1>لوحة تحكم المتجر</h1>
        {/* Add notification center in header */}
        <div className="header-notifications">
          <StoreNotificationCenter 
            storeId={storeInfo.id}
            maxHeight="300px"
            showHeader={false}
            className="max-w-sm"
          />
        </div>
      </div>

      {/* Your existing dashboard content */}
      <div className="dashboard-content">
        {/* Your orders, stats, etc. */}
      </div>

      {/* Add toast notifications at the end - they'll show as overlays */}
      <StoreNotificationToast 
        storeId={storeInfo.id}
        autoHideDuration={10000}
        showOnlyUrgent={true} // Only show urgent/high priority as toasts
      />
    </div>
  );
};

// Alternative: Sidebar integration
const ExampleSidebarWithNotifications = () => {
  const storeInfo = { id: 'your-store-id-here' };

  return (
    <div className="dashboard-layout">
      <aside className="sidebar">
        {/* Navigation items */}
        <nav>
          {/* Your nav items */}
        </nav>
        
        {/* Notifications section in sidebar */}
        <div className="sidebar-notifications">
          <StoreNotificationCenter 
            storeId={storeInfo.id}
            maxHeight="400px"
            showHeader={true}
            className="mt-4"
          />
        </div>
      </aside>
      
      <main className="main-content">
        {/* Your dashboard content */}
      </main>

      {/* Toast notifications */}
      <StoreNotificationToast 
        storeId={storeInfo.id}
        autoHideDuration={12000}
        showOnlyUrgent={false}
      />
    </div>
  );
};

// Simple integration with just the full system
const ExampleFullSystemIntegration = () => {
  const storeInfo = { id: 'your-store-id-here' };

  return (
    <div className="page-container">
      {/* Your existing content */}
      
      {/* Add the complete notification system */}
      <div className="notifications-section">
        <StoreNotificationSystem 
          storeId={storeInfo.id}
          showTestPanel={false} // Set to true only in development
          notificationCenterProps={{
            maxHeight: "500px",
            showHeader: true
          }}
          toastProps={{
            autoHideDuration: 10000,
            showOnlyUrgent: true
          }}
        />
      </div>
    </div>
  );
};

export {
  ExampleStoreDashboardWithNotifications,
  ExampleSidebarWithNotifications,
  ExampleFullSystemIntegration
};
