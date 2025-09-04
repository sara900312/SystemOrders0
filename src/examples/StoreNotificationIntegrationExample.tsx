import React from 'react';
import StoreNotificationCenter from '@/components/stores/StoreNotificationCenter';
import StoreNotificationToast from '@/components/stores/StoreNotificationToast';

// Example: How to integrate the notification system into your existing store dashboard

interface ExistingStoreDashboardProps {
  storeId: string; // This comes from your authentication/context
}

const ExistingStoreDashboardWithNotifications: React.FC<ExistingStoreDashboardProps> = ({ 
  storeId 
}) => {
  // Create the current_store object as required by the notification components
  const current_store = { id: storeId };

  return (
    <div className="store-dashboard">
      {/* Your existing dashboard header */}
      <div className="dashboard-header flex items-center justify-between p-6">
        <h1 className="text-2xl font-bold">لوحة تحكم المتجر</h1>
        
        {/* Add notification center in header */}
        <div className="notifications-header max-w-sm">
          <StoreNotificationCenter 
            current_store={current_store}
            maxHeight="300px"
            showHeader={true}
            className="shadow-lg"
          />
        </div>
      </div>

      {/* Your existing dashboard content */}
      <div className="dashboard-content p-6">
        {/* Your existing stats, orders, etc. */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {/* Your existing stats cards */}
          <div className="bg-white p-6 rounded-lg shadow">
            <h3>إجمالي الطلبات</h3>
            {/* Your stats content */}
          </div>
          <div className="bg-white p-6 rounded-lg shadow">
            <h3>الطلبات الجديدة</h3>
            {/* Your stats content */}
          </div>
          <div className="bg-white p-6 rounded-lg shadow">
            <h3>الطلبات المكتملة</h3>
            {/* Your stats content */}
          </div>
        </div>

        {/* Your existing orders section */}
        <div className="orders-section">
          <h2 className="text-xl font-semibold mb-4">الطلبات الحديثة</h2>
          {/* Your orders list */}
        </div>
      </div>

      {/* Add toast notifications - they appear as overlays */}
      <StoreNotificationToast 
        current_store={current_store}
        autoHideDuration={10000} // 10 seconds as specified
      />
    </div>
  );
};

// Alternative: Sidebar integration
const StoreDashboardWithSidebarNotifications: React.FC<ExistingStoreDashboardProps> = ({ 
  storeId 
}) => {
  const current_store = { id: storeId };

  return (
    <div className="dashboard-layout flex">
      {/* Sidebar */}
      <aside className="sidebar w-80 bg-gray-50 p-4">
        {/* Your navigation */}
        <nav className="mb-6">
          <ul className="space-y-2">
            <li><a href="/store" className="block p-2 hover:bg-gray-100 rounded">الرئيسية</a></li>
            <li><a href="/store/orders" className="block p-2 hover:bg-gray-100 rounded">الطلبات</a></li>
            <li><a href="/store/products" className="block p-2 hover:bg-gray-100 rounded">المنتجات</a></li>
          </ul>
        </nav>
        
        {/* Notifications in sidebar */}
        <StoreNotificationCenter 
          current_store={current_store}
          maxHeight="400px"
          showHeader={true}
        />
      </aside>
      
      {/* Main content */}
      <main className="main-content flex-1 p-6">
        {/* Your dashboard content */}
        <h1 className="text-2xl font-bold mb-6">لوحة تحكم المتجر</h1>
        {/* Your existing content */}
      </main>

      {/* Toast notifications */}
      <StoreNotificationToast 
        current_store={current_store}
        autoHideDuration={10000}
      />
    </div>
  );
};

// Example with React Context (if you use context for store data)
interface StoreContextType {
  storeId: string | null;
  storeName: string | null;
}

const StoreContext = React.createContext<StoreContextType>({
  storeId: null,
  storeName: null
});

const StoreDashboardWithContext: React.FC = () => {
  const { storeId } = React.useContext(StoreContext);

  if (!storeId) {
    return <div>Loading store information...</div>;
  }

  const current_store = { id: storeId };

  return (
    <div className="dashboard">
      {/* Your dashboard content */}
      <div className="main-content">
        {/* Your existing components */}
      </div>

      {/* Add notifications */}
      <div className="fixed top-4 right-4 z-50">
        <StoreNotificationCenter 
          current_store={current_store}
          maxHeight="350px"
          showHeader={true}
          className="w-80 shadow-xl"
        />
      </div>

      <StoreNotificationToast 
        current_store={current_store}
        autoHideDuration={10000}
      />
    </div>
  );
};

// Minimal integration - just add to any existing component
const MinimalIntegration: React.FC<{ storeId: string }> = ({ storeId }) => {
  const current_store = { id: storeId };

  return (
    <>
      {/* Your existing JSX */}
      
      {/* Add these two components anywhere */}
      <StoreNotificationCenter 
        current_store={current_store}
        maxHeight="400px"
        showHeader={true}
      />
      
      <StoreNotificationToast 
        current_store={current_store}
        autoHideDuration={10000}
      />
    </>
  );
};

// Usage examples:
export {
  ExistingStoreDashboardWithNotifications,
  StoreDashboardWithSidebarNotifications,
  StoreDashboardWithContext,
  MinimalIntegration
};

/* 
How to use in your existing code:

1. Import the components:
   import StoreNotificationCenter from '@/components/stores/StoreNotificationCenter';
   import StoreNotificationToast from '@/components/stores/StoreNotificationToast';

2. Create current_store object:
   const current_store = { id: yourStoreId };

3. Add the components to your JSX:
   <StoreNotificationCenter current_store={current_store} />
   <StoreNotificationToast current_store={current_store} />

4. That's it! The system will:
   - Automatically connect to notifications_channel
   - Listen for new_notification events
   - Filter by recipient_type='store' and recipient_id=current_store.id
   - Show all notifications in the center component
   - Show urgent/high priority notifications as toasts
   - Handle read status updates and URL navigation
*/
