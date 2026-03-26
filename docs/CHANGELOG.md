# Changelog

All notable changes to the BioAestheticAx Network project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [3.4.0] - 2026-01-31

### Added
- **Google OAuth Sign-In**
  - Sign in with Google account using OAuth 2.0
  - One-click registration for new users via Google account
  - Authorized JavaScript origins for multiple Vercel domains
  - Support for `bioaestheticaxnetwork.vercel.app` and legacy domains

- **Gmail API Integration**
  - Replaced Nodemailer SMTP with Google Gmail API for email delivery
  - OAuth 2.0 authentication for secure API-based email sending
  - Automatic retry mechanism with exponential backoff and jitter
  - Email tracking and quota management
  - Removed mock email filters for production reliability

- **Doctor-to-Doctor Appointment Restriction**
  - Doctors cannot set appointments with other doctors
  - Proper modal popup with explanation (not just toast)
  - Feature is exclusively for patients booking consultations
  - Admins can still set appointments

- **Navigation Protection**
  - All protected pages require authentication
  - Automatic redirect to login page with toast notification
  - Return URL preserved for post-login redirect
  - Works on both desktop and mobile navigation

- **Network Resilience Features**
  - Automatic API retry with exponential backoff
  - Network status detection (online/offline/slow)
  - Connection status component with user feedback
  - Lazy image loading with placeholders and fallbacks

### Changed
- **Doctor Cards UI**
  - Removed profile circle placeholders (cleaner design)
  - Changed Doctor Profile button to use Next.js Link for reliable navigation
  - Online status indicator kept and repositioned

- **Socket Connection**
  - Reduced reconnection attempts to avoid spam
  - Increased timeout for slow connections
  - Changed transport order (polling first, then websocket)
  - Limited error logging to max 2 messages

- **CORS Configuration**
  - Added `bioaestheticaxnetwork.vercel.app` to allowed origins
  - Added `qwebsitedepolying.vercel.app` for backward compatibility
  - Added wildcard patterns for Vercel preview deployments
  - Updated default production URLs

### Fixed
- **CORS Socket Errors**: Fixed socket connection errors for new Vercel domain
- **Doctor Profile Navigation**: Fixed "Doctor Profile" button not navigating correctly
- **Profile Image URLs**: Fixed 404 errors for profile images on production

### Technical Details
- Backend: Updated `urlConfig.ts` with new domain allowlist
- Backend: Replaced `gmailService.ts` SMTP with Gmail API implementation
- Frontend: Updated `DoctorCard.tsx` with modal and Link navigation
- Frontend: Updated `socket.ts` with better error handling
- Frontend: Added `networkUtils.ts`, `useNetworkStatus.ts`, `ConnectionStatus.tsx`
- Frontend: Added `useFetch.ts` hook with retry logic

---

## [3.3.0] - 2026-01-28

### Added
- **Enhanced Doctors Page**
  - Quick action cards: "Set Appointment with Doctors" (green gradient)
  - Quick action cards: "Appointments Status" link (purple gradient)
  - Sign-in prompts for non-authenticated users
  - Visual icons and status badges (Send Request, Get Notified, Pending, Confirmed)
  - Removed generic "Connect with healthcare professionals" text

- **Notification System Improvements**
  - Robust `/api/notifications` endpoint with raw SQL fallback
  - Graceful handling of missing `is_read` database column
  - Database migration for `is_read` column (in correct db/migrations folder)
  - Updated type constraint to support `new_message` and `appointment_accepted`
  - COALESCE function for backward compatibility

- **Read/Unread Status**
  - Appointment messages show read/unread indicators
  - Blue badges for unread messages
  - Mark as read functionality

### Changed
- **Doctors Page UI**
  - Replaced text with actionable info cards
  - Added direct links to appointments functionality
  - Role-based card content (different for doctors/admins vs regular users)

- **Notification Controller**
  - Rewrote to use raw SQL queries for better error handling
  - Added fallback queries when `is_read` column doesn't exist
  - Improved error messages and logging

### Fixed
- **Notifications API Error**: Fixed "Failed to fetch notifications" caused by missing `is_read` column
- **Migration Path**: Moved migration file to correct `src/db/migrations/` folder
- **Type Constraint**: Added new notification types to database constraint

### Technical Details
- Backend: Updated `notificationController.ts` with raw SQL and fallback queries
- Backend: Moved `1706358000000-AddIsReadToNotifications.ts` to correct migrations folder
- Backend: Updated initial migration to include `is_read` column and new notification types
- Frontend: Updated `/doctors` page with quick action cards and conditional rendering
- Frontend: Messages page shows read/unread status with blue badges

---

## [3.2.0] - 2026-01-27

### Added
- **Doctor Appointment System**
  - Regular users can send appointment requests to doctors
  - Doctors receive, review, and accept/decline appointment requests
  - Status workflow: Pending → Accepted with clear UI indicators
  - Privacy controls: appointments visible only to specific doctor, patient, and admins
  - Automatic email notifications when doctor accepts request
  - Doctor contact info (email, WhatsApp, clinic, address) shared upon approval

- **Doctor Online Status**
  - Real-time status indicators: 🟢 Online, 🟡 Away, ⚫ Offline
  - WebSocket integration via Socket.io for live updates
  - Automatic status updates based on user activity
  - Availability settings: Available, Busy, Do Not Disturb

- **Notifications System**
  - Bell icon with unread notification count
  - `/api/notifications` endpoint for fetching user notifications
  - Mark as read functionality (single and bulk)
  - Appointment-specific notifications with doctor contact details
  - Real-time notification updates

- **Location at Signup**
  - Privacy-respecting location collection (no browser geolocation)
  - Location entered manually during registration
  - Used for nearby doctor discovery and delivery routing
  - No real-time GPS tracking

- **Terms of Service Updates**
  - New Section 9: Location Data Collection policy
  - New Section 10: Doctor Online Status and Availability
  - Clear privacy disclosures about location usage
  - Online status indicator explanations

### Changed
- **Navigation Renamed**
  - "Doctors" → "Set Appointment with Doctors"
  - "Appointments" → "Appointments Status"
  - Navigation visibility based on user role (doctors/admins see Appointments Status)

- **Hero Section Redesign**
  - Removed Featured Products section from landing page
  - Enlarged "Order Products" and "Find Doctors" hero cards
  - More prominent call-to-action buttons

### Technical Details
- Backend: Added `Conversation` model with `pending`/`accepted` status workflow
- Backend: Added `Notification` model with `appointment_accepted` type
- Backend: New `/api/notifications` routes and controller
- Backend: New `/api/conversations/:id/accept` endpoint for doctors
- Backend: Added `is_read` column to notifications with migration
- Frontend: Updated `Header.tsx` with renamed navigation items
- Frontend: Added `NotificationBell.tsx` component with notification dropdown
- Frontend: Updated `DoctorCard.tsx` with role-based "Set Appointment" button
- Frontend: Updated `HeroCards.tsx` with enlarged, prominent design
- Frontend: Updated Terms of Service page with new sections

---

## [3.1.0] - 2026-01-22

### Added
- **Debt Limit Enforcement System**
  - Modal notification when user reaches debt limit during order placement
  - Visual debt bar on user profile (visible to admin and user)
  - Shows current debt, debt limit, remaining limit, and over-limit amount
  - Automatic order blocking when debt limit exceeded
  - Enhanced modal with gradient header, progress bar, and action steps

- **Award Messages Improvements**
  - Success modal for template update/create operations (replaced alerts)
  - Enhanced certificate preview with external link and download options
  - Improved email preview with better styling and DOMPurify configuration
  - Fixed "Show Preview" / "Hide Preview" functionality

- **Background Message Processing**
  - Bulk email sending now runs in background to prevent timeouts
  - Immediate API response with background processing notification
  - Batched email sending with delays to prevent rate limiting
  - Better user feedback during message sending

- **User Profile Debt Bar**
  - Visual debt status indicator on user profile page
  - Color-coded progress bar (red for over limit, orange for 80%+, yellow for 50%+)
  - Shows current debt vs debt limit with percentage
  - Visible to both admin and profile owner

### Fixed
- **Gmail Messages Page**: Fixed "No users selected" error caused by incorrect Axios syntax
- **Research Paper Download**: Fixed "s.json is not a function" error
- **Bio Update**: Fixed "e.json is not a function" error when updating bio
- **User Profile Timeout**: Fixed API timeout errors on user profile page
- **Debt Limit Modal**: Fixed modal showing as toast instead of proper modal dialog
- **Debt Limit Regex**: Fixed parsing of debt limit amounts with PKR prefix

### Changed
- **Frontend API Calls**: Corrected Axios syntax (data as second argument, config as third)
- **Error Handling**: Improved error parsing for structured Axios error responses
- **Order Processing**: Added immediate break when debt limit detected to prevent duplicate errors
- **Removed Hardcoded Email**: Removed `custom.admin@test.com` hardcoded filter from email sending

### Technical Details
- Frontend: Updated `frontend/src/app/admin/gmail-messages/page.tsx` with proper Axios syntax
- Frontend: Updated `frontend/src/app/admin/award-messages/page.tsx` with SuccessModal component
- Frontend: Updated `frontend/src/app/user/[id]/page.tsx` with debt bar component
- Frontend: Updated `frontend/src/app/order/page.tsx` with debt limit modal improvements
- Frontend: Enhanced `frontend/src/components/DebtRestrictionModal.tsx` with visual improvements
- Backend: Updated `backend/src/controllers/messageController.ts` with background processing
- Backend: Updated `backend/src/services/gmailService.ts` to remove hardcoded email filter
- Backend: Updated `backend/src/controllers/userStatsController.ts` to include debt data

## [3.0.0] - 2025-12-28

### Added
- **Badge Management System**
  - Admin dashboard for creating and assigning badges to users (`/admin/badge-management`)
  - Badge types: Achievement, Milestone, Special, Custom
  - Badge assignment to users with earned date tracking
  - Badge display on user profiles with icons, colors, and descriptions
  - Badge search and filtering functionality

- **Enhanced User Profile System**
  - Bio editing functionality
  - Tags management (add, edit, remove tags)
  - WhatsApp number editing
  - Clinic name editing
  - Live rank progress data (current tier, progress percentage, points to next rank)
  - All tier certificates display (not just current tier)
  - Research papers download functionality

- **Certificate Auto-Generation System**
  - Automatic certificate generation for all achieved tiers
  - Certificates generated when user profile is viewed
  - All previous tier certificates displayed on user profile
  - PDF certificate download functionality
  - Certificate storage in database with file paths

### Changed
- **PayFast Payment System**
  - Payment amount now correctly set to `order_total` for each individual order
  - Orders show "Paid: PKR [order_total]" instead of "Paid: PKR 0"
  - Tier progress updates automatically when orders are paid through PayFast
  - Both ITN handler and `confirmPaymentSuccess` endpoint now set payment amounts correctly

- **Debt Limit Calculation**
  - Debt calculation now correctly excludes completed/cancelled orders
  - Only counts truly pending/unpaid orders
  - Admin order management page shows correct "Pending" and "Pending Revenue" values

- **Team Creation System**
  - Fixed team creation on leaderboard
  - Removed conflicting local `getApiUrl` function
  - All API calls now use global `getApiUrl()` utility

- **Advertisement System**
  - Fixed advertisement type handling (Video/Image/GIF)
  - Advertisement pricing modal now correctly uses selected `ad_type` instead of hardcoded 'video'
  - All advertisement types (video, image, GIF/animation) now work correctly
  - Fixed API URL issues for mobile devices

### Fixed
- **PayFast Payment Amount Updates**: Orders now correctly show payment amounts after PayFast payment
- **Tier Progress Updates**: Tier progress updates automatically after PayFast payment
- **Debt Limit Calculation**: Correctly calculates pending orders and revenue
- **Team Creation**: Fixed team creation functionality on leaderboard
- **Advertisement Types**: Fixed video/image/GIF advertisement type handling
- **Order Payment Display**: Fixed "Paid: PKR 0" issue in admin order management

### Technical Details
- Backend: Added `Badge` entity to database schema
- Backend: Implemented `badgeController.ts` with CRUD operations
- Backend: Added badge routes (`/api/badges`)
- Backend: Updated `userStatsController.ts` to fetch badges from database
- Backend: Updated `certificateService.ts` to save certificates to database
- Backend: Updated `paymentController.ts` to set payment amounts correctly
- Backend: Updated `debtService.ts` to correctly calculate pending debt
- Frontend: Added Badge Management admin page (`/admin/badge-management`)
- Frontend: Updated user profile page with badge display
- Frontend: Updated user profile with certificate auto-generation support
- Frontend: Fixed advertisement pricing modal to use correct `ad_type`

## [2.1.0] - 2025-12-18

### Added
- **Login Redirect to Signup Feature**
  - Automatic redirect to signup page when login fails (non-existent user or wrong password)
  - Backend returns 404 status with `userNotFound: true` flag for non-existent users
  - Backend returns 401 status for wrong password attempts
  - Frontend handles both 401 and 404 errors and redirects to `/signup` page
  - Implemented in both main login page (`/login`) and LoginModal component
  - Shows appropriate success message before redirecting
  - Case-insensitive email lookup in backend for better user matching
  - Enhanced error handling with comprehensive logging

### Changed
- **Login Error Handling**: Failed login attempts now redirect to signup instead of showing error messages
- **User Experience**: Improved flow for users who don't have accounts - automatic redirect to signup

### Technical Details
- Backend: Updated `authController.ts` to return 404 with `userNotFound: true` for non-existent users
- Backend: Enhanced email lookup with case-insensitive query using QueryBuilder
- Frontend: Updated `login/page.tsx` to handle 401 and 404 errors and redirect to signup
- Frontend: Updated `LoginModal.tsx` with same redirect functionality
- Frontend: Updated axios interceptor to skip showing toast errors for login failures (handled by component)

## [2.0.0] - 2024-12-05

### Added
- **Mobile Device Support**
  - Dynamic API URL detection for mobile devices
  - Order page now works correctly on mobile devices
  - All API calls use correct IP address when accessed from mobile
  - Product images load correctly on mobile devices

- **GIF Animation Support**
  - Automatic GIF detection when uploaded as video_file
  - Proper routing to animations folder
  - Type automatically set to 'animation'
  - Frontend display logic for GIF animations

- **Enhanced Advertisement Approval Flow**
  - Conflict detection for time slot conflicts
  - "Wait in Queue" option when conflicts occur
  - Styled approval success modals
  - Styled conflict warning modals
  - Email notifications for activation and waiting queue

- **Advertisement Status Management**
  - Timer only runs for ACTIVE ads (not waiting/approved)
  - Enhanced status filtering in admin panel
  - Waiting queue management
  - Automatic activation when capacity becomes available

- **Image/Video Display Improvements**
  - Fixed size constraints for all media types
  - Responsive display with maxWidth and maxHeight
  - Prevents layout issues with high-resolution media

### Changed
- **Video File Size Limit**: Increased from 10MB to 50MB
- **Advertisement Placement Preview**: Updated to show only 4 active placements
- **Order Page API Calls**: Replaced hardcoded localhost URLs with dynamic detection
- **Advertisement Status Workflow**: Enhanced with proper PENDING → APPROVED → ACTIVE flow

### Fixed
- **Order Page Mobile Access**: Fixed "Error Loading products" on mobile devices
- **API URL Detection**: Fixed hardcoded localhost URLs throughout frontend
- **GIF Display**: Fixed GIF animations not displaying correctly
- **Click Interactions**: Fixed overlays blocking clicks on advertisements
- **Timer Display**: Fixed timer running for waiting ads (now only for active)
- **TypeScript Errors**: Fixed type comparison errors in admin advertisements page

## [1.0.0] - 2024-11-XX (Initial Release)

### Added
- **Advertisement System**
  - Visual area selection with mobile/desktop preview
  - Pricing modal with real-time cost calculation
  - 3-step application flow (Area Selection → Upload Content → Payment)
  - Support for videos (any length, 50MB max), images (2MB, JPG/PNG), animations (5MB, GIF)
  - Payment options: PayFast and Cash/End of Month
  - Advertisement guidelines with disclaimer

- **Admin Features**
  - Application approval workflow
  - Status filtering (All, Pending, Active, Waiting, Rejected, Expired)
  - Stop/Pause advertisement functionality
  - Live time display with seconds
  - Area configuration management
  - Rotation settings (interval, auto-rotation)

- **Core Platform Features**
  - Order Management System
  - Research Papers Management
  - Tier System with Performance Tracking
  - Employee Management
  - Admin Dashboard
  - Payment Integration (PayFast)
  - Email and WhatsApp Notifications

### Technical Stack
- Frontend: Next.js 14.x, TypeScript, Tailwind CSS
- Backend: Node.js 20, Express.js, TypeScript, TypeORM
- Database: PostgreSQL 15
- Authentication: JWT
- File Upload: Multer
- Email: Nodemailer (Gmail)
- Payment: PayFast

---

## Version History Summary

| Version | Date | Highlights |
|---------|------|------------|
| 3.4.0 | Jan 31, 2026 | Google OAuth, Gmail API, doctor restrictions, navigation protection |
| 3.3.0 | Jan 28, 2026 | Enhanced doctors page, notification system fixes, read/unread status |
| 3.2.0 | Jan 27, 2026 | Doctor appointment system, online status, location at signup |
| 3.1.0 | Jan 22, 2026 | Debt limit system, background messaging, award messages improvements |
| 3.0.0 | Dec 28, 2025 | Badge system, enhanced user profiles, certificate auto-generation |
| 2.1.0 | Dec 18, 2025 | Login redirect to signup feature |
| 2.0.0 | Dec 5, 2024 | Mobile support, GIF animations, enhanced approval workflow |
| 1.0.0 | Nov 2024 | Initial release |

---

**Document Version**: 3.4.0  
**Last Updated**: January 31, 2026
