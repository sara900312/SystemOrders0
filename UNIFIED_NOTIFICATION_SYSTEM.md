# Unified Real-Time Notification System

## 🎯 Overview

A robust, real-time notification system that exclusively uses the **`notifications`** table in Supabase for all notification data. The system displays persistent notification lists and shows instant pop-up alerts (toasts) for new, urgent notifications. It's fully integrated with Supabase backend using the notifications table for historical data and Supabase Realtime for live updates.

## ✅ Key Accomplishments

### 🚫 CRITICAL COMPLIANCE
- ✅ **ABSOLUTELY NO ACCESS** to `store_order_responses` or `admin_notifications` tables
- ✅ **ALL notification data** fetched exclusively from the `notifications` table
- ✅ **Proper distinction** using `recipient_type` ('store', 'admin', 'customer') and `recipient_id`
- ✅ **NO WebPush functionality** or VAPID keys required

### 📊 Database Schema
The system uses a unified `notifications` table with the following structure:
```sql
CREATE TABLE notifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  recipient_id TEXT NOT NULL,
  recipient_type TEXT NOT NULL CHECK (recipient_type IN ('store', 'admin', 'customer')),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  order_id TEXT,
  read BOOLEAN DEFAULT false,
  sent BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  url TEXT,
  priority TEXT CHECK (priority IN ('low', 'medium', 'high', 'urgent')) DEFAULT 'medium',
  type TEXT DEFAULT 'general'
);
```

### 📡 Real-time Configuration
- **Channel Name**: `notifications_channel`
- **Event Name**: `new_notification`
- **Table**: `notifications`
- **Filtering**: Based on `recipient_type` and `recipient_id`

## 🏗️ System Architecture

### Core Components Created

#### 1. **Core Hook** (`src/hooks/useNotifications.ts`)
```typescript
function useNotifications(
  userContext: { type: 'store' | 'admin' | 'customer'; id: string },
  options?: UseNotificationsOptions
): UseNotificationsReturn
```

**Features:**
- ✅ Queries notifications table with proper filtering
- ✅ Real-time subscription on `notifications_channel`
- ✅ Auto-updates when new notifications arrive
- ✅ Mark as read functionality
- ✅ URL navigation support

#### 2. **Notification List Component** (`src/components/notifications/NotificationList.tsx`)
```typescript
<NotificationList
  userContext={{ type: 'store', id: 'store-123' }}
  maxHeight="400px"
  showHeader={true}
  showConnectionStatus={true}
/>
```

**Features:**
- ✅ Persistent list of notifications ordered by `created_at` DESC
- ✅ Visual distinction between read/unread notifications
- ✅ Real-time updates via the core hook
- ✅ Click to mark as read and navigate to URL
- ✅ Connection status indicator
- ✅ Refresh and mark all as read functionality

#### 3. **Toast Notification Component** (`src/components/notifications/NotificationToast.tsx`)
```typescript
<NotificationToast
  userContext={{ type: 'admin', id: 'admin' }}
  priorityFilter={['urgent', 'high']}
  autoHideDuration={10000}
/>
```

**Features:**
- ✅ Appears as overlay in top-right corner
- ✅ Only shows for `urgent` and `high` priority notifications
- ✅ Auto-disappears after 10 seconds (configurable)
- ✅ Clear close button (X)
- ✅ Click to navigate to URL
- ✅ Real-time triggers via `notifications_channel`

#### 4. **Unified Admin Notification Bell** (`src/components/ui/unified-admin-notification-bell.tsx`)
```typescript
<UnifiedAdminNotificationBell adminId="admin" />
```

**Features:**
- ✅ Uses unified notifications table (NOT admin_notifications)
- ✅ Real-time unread count badge
- ✅ Dropdown with notification list
- ✅ Connection status indicator
- ✅ Integrated toast alerts for urgent notifications

#### 5. **Services and Management**

**Central Notification Manager** (`src/services/centralNotificationManager.ts`)
- ✅ Prevents duplicate notifications
- ✅ Unified creation interface
- ✅ Proper filtering and caching

**Unified Admin Service** (`src/services/unifiedAdminNotificationService.ts`)
- ✅ Replaces old `adminNotificationService`
- ✅ Uses ONLY the notifications table
- ✅ Maintains same API for backward compatibility

## 🚀 Usage Examples

### For Store Dashboard
```typescript
import { NotificationList, NotificationToast } from '@/components/notifications';

function StoreDashboard() {
  const currentStore = { id: 'store-123' };
  
  return (
    <div>
      {/* Persistent notification list */}
      <NotificationList
        userContext={{ type: 'store', id: currentStore.id }}
        maxHeight="400px"
        showHeader={true}
      />
      
      {/* Toast alerts for urgent notifications */}
      <NotificationToast
        userContext={{ type: 'store', id: currentStore.id }}
        priorityFilter={['urgent', 'high']}
      />
    </div>
  );
}
```

### For Admin Dashboard
```typescript
import { UnifiedAdminNotificationBell } from '@/components/ui/unified-admin-notification-bell';

function AdminDashboard() {
  return (
    <div>
      {/* Admin notification bell with unified system */}
      <UnifiedAdminNotificationBell adminId="admin" />
    </div>
  );
}
```

### Creating Notifications
```typescript
import { centralNotificationManager } from '@/services/centralNotificationManager';

// For stores
await centralNotificationManager.notifyStore(
  'store-123',
  'New Order Assigned',
  'Order #12345 has been assigned to your store',
  'order-12345'
);

// For admin
await centralNotificationManager.notifyAdmin(
  'New Order Created',
  'A new order from customer John Doe',
  'order-12345'
);

// For customers
await centralNotificationManager.notifyCustomer(
  'customer-456',
  'Order Confirmed',
  'Your order has been confirmed and will be delivered soon',
  'order-12345'
);
```

## 🔍 Verification & Testing

### Verification Page
Access the comprehensive verification system at:
```typescript
import { NotificationSystemVerification } from '@/pages/NotificationSystemVerification';
```

**Tests Include:**
- ✅ Database table existence and structure
- ✅ No usage of deprecated tables
- ✅ Real-time channel configuration
- ✅ Store notification creation and filtering
- ✅ Admin notification creation and filtering
- ✅ Component integration
- ✅ Duplicate prevention
- ✅ Row-level security

### Demo Page
Interactive demo available at:
```typescript
import { UnifiedNotificationSystemDemo } from '@/examples/UnifiedNotificationSystemDemo';
```

## 📋 Migration Guide

### From Old Admin Notifications
Replace old `adminNotificationService` usage:

**Old (❌):**
```typescript
import { adminNotificationService } from '@/services/adminNotificationService';
```

**New (✅):**
```typescript
import { unifiedAdminNotificationService } from '@/services/unifiedAdminNotificationService';
// OR use the new components directly:
import { UnifiedAdminNotificationBell } from '@/components/ui/unified-admin-notification-bell';
```

### From Old Store Notifications
Replace existing store notification components:

**Old (❌):**
```typescript
import { StoreNotificationCenter } from '@/components/stores/StoreNotificationCenter';
```

**New (✅):**
```typescript
import { NotificationList } from '@/components/notifications/NotificationList';
```

## 🛡️ Security Features

### Row Level Security (RLS)
The system respects Supabase RLS policies on the notifications table:
```sql
-- Example policies (adjust as needed)
CREATE POLICY "Enable read access for authenticated users" ON notifications
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Enable insert for authenticated users" ON notifications
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');
```

### Proper Filtering
- **Store notifications**: `recipient_type = 'store' AND recipient_id = current_store.id`
- **Admin notifications**: `recipient_type = 'admin'` (with optional `recipient_id`)
- **Customer notifications**: `recipient_type = 'customer' AND recipient_id = customer_id`

## ⚡ Performance Features

### Duplicate Prevention
The `centralNotificationManager` implements intelligent duplicate prevention:
- ✅ Memory-based caching for recent notifications
- ✅ Database checks for order-specific notifications
- ✅ Configurable cache duration

### Real-time Optimization
- ✅ Efficient filtering at the database level
- ✅ Proper channel management and cleanup
- ✅ Connection status monitoring

## 🎨 UI/UX Features

### Visual Indicators
- ✅ Unread notification dots
- ✅ Priority-based styling (urgent = red, high = orange, etc.)
- ✅ Connection status indicators
- ✅ Loading and error states

### Accessibility
- ✅ Proper ARIA labels
- ✅ Keyboard navigation support
- ✅ Screen reader friendly
- ✅ Color contrast compliance

## 📦 File Structure

```
src/
├── hooks/
│   └── useNotifications.ts                     # Core notification hook
├── components/
│   ├── notifications/
│   │   ├── NotificationList.tsx               # Reusable notification list
│   │   └── NotificationToast.tsx              # Toast alert component
│   └── ui/
│       └── unified-admin-notification-bell.tsx # Admin notification bell
├── services/
│   ├── centralNotificationManager.ts          # Unified notification management
│   └── unifiedAdminNotificationService.ts     # Admin service using unified table
├── examples/
│   └── UnifiedNotificationSystemDemo.tsx      # Interactive demo
├── pages/
│   └── NotificationSystemVerification.tsx     # Comprehensive verification
└── utils/
    └── setupNotificationsTable.ts             # Table setup utilities
```

## 🔧 Configuration

### Environment Variables
Ensure these are set in your Supabase client:
```typescript
const SUPABASE_URL = "your-supabase-url";
const SUPABASE_ANON_KEY = "your-supabase-anon-key";
```

### Table Setup
Run the table creation SQL or use the utility functions:
```typescript
import { ensureNotificationsTableExists } from '@/utils/setupNotificationsTable';
await ensureNotificationsTableExists();
```

## 📊 Monitoring & Analytics

### Built-in Metrics
The system provides built-in monitoring:
- ✅ Connection status tracking
- ✅ Notification delivery confirmation
- ✅ Read/unread statistics
- ✅ Error logging and reporting

### Debug Information
Enable debug logging:
```typescript
// Check notification system status
const status = unifiedAdminNotificationService.getStatus();
console.log('Notification system status:', status);
```

## 🚀 Future Enhancements

### Planned Features
- [ ] Notification templates system
- [ ] Bulk operations support
- [ ] Advanced filtering options
- [ ] Notification scheduling
- [ ] Analytics dashboard

### Extensibility
The system is designed to be easily extensible:
- ✅ Plugin-ready architecture
- ✅ Configurable priorities and types
- ✅ Custom notification renderers
- ✅ Integration hooks

## 📞 Support

### Common Issues
1. **Real-time not working**: Check Supabase real-time configuration and permissions
2. **Notifications not appearing**: Verify table existence and RLS policies
3. **Duplicate notifications**: Check `centralNotificationManager` configuration

### Debug Steps
1. Run the verification page: `/NotificationSystemVerification`
2. Check browser console for real-time connection status
3. Verify database permissions and table structure
4. Test with the demo page: `/UnifiedNotificationSystemDemo`

---

## ✅ Final Verification Checklist

- [x] ✅ Uses ONLY the `notifications` table
- [x] ✅ NO access to `admin_notifications` or `store_order_responses`
- [x] ✅ Proper recipient filtering by `recipient_type` and `recipient_id`
- [x] ✅ Real-time updates via `notifications_channel`
- [x] ✅ Persistent notification lists
- [x] ✅ Toast alerts for urgent notifications
- [x] ✅ Mark as read functionality
- [x] ✅ URL navigation support
- [x] ✅ Duplicate prevention
- [x] ✅ Cross-platform compatibility (Store & Admin)
- [x] ✅ Comprehensive testing and verification
- [x] ✅ NO WebPush or VAPID requirements

**🎉 The unified notification system is complete and ready for production use!**
