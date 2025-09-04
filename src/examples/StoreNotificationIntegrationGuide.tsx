import React from 'react';
import StoreNotificationCenter from '@/components/stores/StoreNotificationCenter';
import StoreNotificationToast from '@/components/stores/StoreNotificationToast';
import StoreNotificationSystem from '@/components/stores/StoreNotificationSystem';

// Example 1: Basic integration in existing store dashboard
const ExampleStoreDashboard = () => {
  // Assume you have the store information available from your authentication/context
  const current_store = {
    id: 'your-store-id-here' // This should come from your store context/auth
  };

  return (
    <div className="store-dashboard">
      {/* Your existing dashboard header */}
      <div className="dashboard-header">
        <h1>لوحة تحكم المتجر</h1>
        
        {/* Add notification center in header */}
        <div className="header-notifications max-w-sm">
          <StoreNotificationCenter 
            current_store={current_store}
            maxHeight="300px"
            showHeader={false}
            className="shadow-lg"
          />
        </div>
      </div>

      {/* Your existing dashboard content */}
      <div className="dashboard-content">
        {/* Your orders, stats, etc. */}
        <div className="orders-section">
          {/* Your orders content */}
        </div>
        
        <div className="stats-section">
          {/* Your stats content */}
        </div>
      </div>

      {/* Add toast notifications at the end - they'll show as overlays */}
      <StoreNotificationToast 
        current_store={current_store}
        autoHideDuration={10000} // 10 seconds as specified
      />
    </div>
  );
};

// Example 2: Sidebar integration
const ExampleSidebarWithNotifications = () => {
  const current_store = { id: 'your-store-id-here' };

  return (
    <div className="dashboard-layout">
      <aside className="sidebar">
        {/* Your navigation items */}
        <nav className="sidebar-nav">
          <ul>
            <li><a href="/store-dashboard">الرئيسية</a></li>
            <li><a href="/store-orders">الطلبات</a></li>
            <li><a href="/store-products">المنتجات</a></li>
          </ul>
        </nav>
        
        {/* Notifications section in sidebar */}
        <div className="sidebar-notifications mt-4">
          <StoreNotificationCenter 
            current_store={current_store}
            maxHeight="400px"
            showHeader={true}
          />
        </div>
      </aside>
      
      <main className="main-content">
        {/* Your dashboard content */}
        <div className="content-area">
          {/* Your main content */}
        </div>
      </main>

      {/* Toast notifications */}
      <StoreNotificationToast 
        current_store={current_store}
        autoHideDuration={12000}
      />
    </div>
  );
};

// Example 3: Complete system integration (Recommended)
const ExampleCompleteSystemIntegration = () => {
  const current_store = { id: 'your-store-id-here' };

  return (
    <div className="page-container">
      {/* Your existing content */}
      <div className="main-content">
        {/* Your existing dashboard components */}
      </div>
      
      {/* Add the complete notification system */}
      <div className="notifications-section">
        <StoreNotificationSystem 
          current_store={current_store}
          showTestPanel={false} // Set to true only in development
          notificationCenterProps={{
            maxHeight: "500px",
            showHeader: true,
            className: "shadow-md"
          }}
          toastProps={{
            autoHideDuration: 10000 // 10 seconds as specified
          }}
        />
      </div>
    </div>
  );
};

// Example 4: Integration in existing StoreDashboard.tsx
const ExampleExistingStoreDashboardIntegration = () => {
  const current_store = { id: 'demo-store-001' }; // Replace with actual store data

  return (
    <div className="store-dashboard">
      <div className="dashboard-header flex items-center justify-between">
        <h1>لوحة تحكم المتجر</h1>
        
        {/* Notification Bell Icon with Center */}
        <div className="notification-area">
          <StoreNotificationCenter 
            current_store={current_store}
            maxHeight="350px"
            showHeader={true}
            className="min-w-[350px]"
          />
        </div>
      </div>

      {/* Your existing stats cards */}
      <div className="stats-grid grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        {/* Your existing stats */}
      </div>

      {/* Your existing orders section */}
      <div className="orders-section">
        {/* Your existing orders content */}
      </div>

      {/* Toast notifications for urgent alerts */}
      <StoreNotificationToast 
        current_store={current_store}
        autoHideDuration={10000}
      />
    </div>
  );
};

// Usage with React Context
interface StoreContextType {
  current_store: { id: string } | null;
}

const StoreContext = React.createContext<StoreContextType>({ current_store: null });

const ExampleWithContext = () => {
  const { current_store } = React.useContext(StoreContext);

  if (!current_store) {
    return <div>Loading store information...</div>;
  }

  return (
    <StoreNotificationSystem 
      current_store={current_store}
      showTestPanel={process.env.NODE_ENV === 'development'}
    />
  );
};

export {
  ExampleStoreDashboard,
  ExampleSidebarWithNotifications,
  ExampleCompleteSystemIntegration,
  ExampleExistingStoreDashboardIntegration,
  ExampleWithContext
};
