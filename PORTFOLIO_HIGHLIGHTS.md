# Qatar Panel Tracker - Portfolio Highlights

## 🎯 Project Overview
Enterprise construction panel management system that digitizes the complete lifecycle of facade panels from production through installation, replacing manual tracking with automated workflow management.

---

## 1. Core Logic: Panel Status Workflow Engine

### Status Transition Prevention (Prevents Invalid Workflows)
- **12-Stage Finite State Machine**: Validated status transitions prevent invalid workflow jumps
  - Each status can only transition to specific next statuses (e.g., "Produced" → "Proceed for Delivery" or "On Hold")
  - Special statuses (On Hold, Cancelled) can interrupt from any state
  - Terminal status (Cancelled) blocks all further transitions
- **Database Triggers**: PostgreSQL triggers automatically log every status change
  - `log_panel_status_change()` function fires on INSERT/UPDATE
  - Captures user_id, timestamp, and status automatically
  - Exception handling ensures panel updates never fail due to history logging
- **Role-Based Status Restrictions**: Each role can only set specific statuses
  - Production Engineer → only "Produced"
  - QC Site → only "Approved Material", "Rejected Material", "Approved Final"
  - Store Site → only "Delivered" or "Broken at Site"
  - Prevents unauthorized status changes at the application level

### Status History Tracking
- Complete audit trail with user attribution for every status change
- Supports image attachments and notes for status documentation
- Custom timestamp support for retroactive status updates
- Timeline visualization showing complete panel journey

---

## 2. Tech Stack

### Frontend
- **Framework**: React 19 + TypeScript
- **State Management**: React Context API (AuthContext, ToastContext)
- **UI Framework**: Tailwind CSS + Radix UI (15+ components) + shadcn/ui pattern
- **Routing**: React Router DOM v6
- **Data Visualization**: Recharts (bar, pie, line, area, radar charts)
- **File Processing**: xlsx for Excel import/export
- **QR Codes**: qrcode.react for panel tracking

### Backend & Database
- **Backend**: Supabase (PostgreSQL 15+)
- **Database Features**:
  - Row Level Security (RLS) policies
  - PostgreSQL triggers and PL/pgSQL functions
  - Foreign key constraints with CASCADE/SET NULL behaviors
  - Indexed columns for query optimization
- **Storage**: Supabase Storage for image uploads (5MB limit, MIME validation)
- **Authentication**: Custom RBAC system with 9 user roles

---

## 3. Key Features & Modules

### Role-Based Access Control (RBAC)
- **9 User Roles**: Administrator, Data Entry, Customer, Production Engineer, QC Factory, Store Site, QC Site, Foreman Site, Site Engineer
- **Granular Permissions**: Resource-level (users, projects, panels, etc.) + Action-level (create, read, update, delete)
- **Customer Data Isolation**: Customers only see their own projects (database-level filtering)
- **UI Protection**: Buttons/actions hidden based on permissions
- **Centralized System**: Single source of truth in `rolePermissions.ts`

### Panel Management
- **Full CRUD**: Create, read, update, delete with user tracking
- **Status Change Dialog**: Validates transitions, supports image upload, notes, custom timestamps
- **QR Code Generation**: Dynamic QR codes linking to panel details page
- **Timeline Visualization**: Complete status history with images and user attribution
- **Bulk Operations**: Bulk status updates, bulk selection, bulk import

### Bulk Import System (3 Modules)
- **Bulk Import Projects**: Excel parsing, customer lookup, date validation, progress tracking
- **Bulk Import Panels**: Complex validation (project/building/facade lookup, duplicate detection, status validation)
- **Bulk Import Panel Histories**: Historical status change import with panel/user lookup
- **Performance Optimization**: Pre-fetching lookup data, in-memory maps for O(1) access
- **Error Reporting**: Row-by-row validation with detailed error messages

### Project Management
- **Hierarchical Structure**: Projects → Buildings → Facades → Panels
- **Project Details Page**: Comprehensive view with sections for buildings, facades, panels, notes
- **Cascade Deletion**: Smart deletion preserving data integrity (panels preserved when buildings deleted)

### Dashboard & Analytics
- **Real-Time Dashboard**: Customer, project, panel statistics
- **Advanced Visualizations**: Multiple chart types with filtering
- **Dynamic Filtering**: By project, building, facade, date range, status, location
- **Status Distribution**: Primary vs secondary status grouping

### Image Management
- **Status Documentation**: Image uploads attached to status changes
- **Supabase Storage**: Secure image storage with public URL generation
- **Timeline Integration**: Image thumbnails in status history
- **Full-Screen Viewer**: Modal with keyboard navigation

---

## 4. Complex Technical Implementations

### Status Workflow Validation Engine
```typescript
// Status flow with role-based restrictions
STATUS_FLOW: {
  0: [1, 9, 10],  // Issued For Production → Produced, On Hold, Cancelled
  1: [2, 9, 10],  // Produced → Proceed for Delivery, On Hold, Cancelled
  // ... 12 status definitions with validated transitions
}

ROLE_STATUS_RESTRICTIONS: {
  'Production engineer': [1],  // Can only set to "Produced"
  'QC Site': [4, 5, 8],         // Can approve/reject/approve final
}
```
- Prevents invalid workflow jumps
- Role-based validation ensures users can only set appropriate statuses
- Special status handling (On Hold can resume to any status)

### Database Trigger System
- PostgreSQL PL/pgSQL triggers automatically log status changes
- Exception handling prevents transaction failures
- User attribution with fallback to admin user

### Cascade Deletion Logic
- **Project Deletion**: Cascades through buildings → facades → panels
- **Building Deletion**: Sets `building_id` to NULL in panels (preserves data)
- **Customer Deletion**: Unlinks users, preserves project data
- **Transaction Safety**: Ensures data integrity throughout

### Bulk Import Optimization
- Pre-fetching strategy: Fetches all lookup data before import
- In-memory lookup maps: O(1) access instead of O(n) queries
- Batch processing: Continues even if individual rows fail
- Comprehensive validation: Type checking, foreign key validation, duplicate detection

### Image Upload & Storage
- File validation (size, MIME type)
- Unique filename generation
- Public URL generation for display
- Error handling with user-friendly messages

---

## 5. Business Impact

### Manual Process Replacement
**Before**: Paper-based tracking, manual status updates, no centralized visibility, error-prone

**After**:
- ✅ Digital workflow with automated history logging
- ✅ Real-time visibility via dashboard
- ✅ Bulk import: 10x faster (hours → minutes)
- ✅ QR code tracking for quick lookup
- ✅ Image documentation for status changes
- ✅ Complete audit trail with user attribution
- ✅ Role-based workflow enforcement

### Operational Improvements
- **Time Savings**: Bulk import reduces panel entry from hours to minutes
- **Error Reduction**: Status validation prevents invalid transitions
- **Visibility**: Real-time dashboards for project managers
- **Compliance**: Complete audit trail for regulatory requirements
- **Scalability**: Handles large-scale imports efficiently

---

## 6. Most Impressive Technical Achievements

### 🏆 1. Sophisticated Status Workflow Engine
- Finite state machine with 12 stages and 30+ validated transitions
- Role-based restrictions prevent unauthorized status changes
- Database triggers for automatic history logging
- Frontend validation prevents invalid transitions

### 🏆 2. Comprehensive RBAC System
- 9 user roles with granular permissions
- Centralized permission system (single source of truth)
- Customer data isolation at database level
- Type-safe implementation with TypeScript

### 🏆 3. Bulk Import with Advanced Validation
- Three specialized import modules (Projects, Panels, Histories)
- Performance optimization with pre-fetching and lookup maps
- Complex validation: foreign keys, types, duplicates
- Detailed error reporting per row

### 🏆 4. Cascade Deletion with Data Preservation
- Multi-level cascading (Projects → Buildings → Facades → Panels)
- Smart NULL assignment preserves panel data
- Complex customer deletion with user unlinking
- Transaction safety ensures data integrity

### 🏆 5. Real-Time Dashboard with Advanced Analytics
- Multiple chart types (bar, pie, line, area, radar)
- Dynamic filtering across multiple dimensions
- Status grouping and visualization
- Responsive design for all screen sizes

### 🏆 6. Database Architecture
- PostgreSQL triggers for automatic history logging
- Foreign key constraints with CASCADE/SET NULL
- Indexed columns for performance
- Row Level Security for access control

---

## Technical Metrics

- **Lines of Code**: 15,000+ TypeScript/TSX
- **Components**: 50+ React components
- **Database Tables**: 8+ main tables with relationships
- **User Roles**: 9 distinct roles
- **Status Workflow**: 12-stage workflow with 30+ transitions
- **Bulk Import**: Handles 1000+ rows efficiently
- **Database Triggers**: 2+ triggers for automatic logging

---

## Key Technologies Demonstrated

✅ **Frontend**: React 19, TypeScript, Tailwind CSS, Radix UI, Recharts  
✅ **Backend**: Supabase (PostgreSQL), PL/pgSQL, Database Triggers  
✅ **State Management**: React Context API  
✅ **File Processing**: Excel import/export (xlsx)  
✅ **Storage**: Supabase Storage for images  
✅ **Security**: RBAC, Row Level Security, Input Validation  
✅ **Performance**: Query optimization, pre-fetching, caching  
✅ **Architecture**: Component-based, type-safe, scalable

---

## Summary

This project demonstrates advanced skills in:
- **State Machine Design**: Complex workflow validation
- **Database Architecture**: Triggers, constraints, cascade behaviors
- **Security**: Role-based access control with granular permissions
- **Performance**: Bulk operations with optimization strategies
- **User Experience**: Intuitive UI with real-time feedback
- **Data Integrity**: Comprehensive validation and error handling

The application successfully transforms manual, error-prone construction panel tracking into an automated, efficient, and transparent system with complete audit trails and real-time visibility.
