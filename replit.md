# TripMate - Group Trip Planning Application

## Overview

TripMate is a comprehensive full-stack Progressive Web App (PWA) designed for collaborative trip planning and expense management. Built with React and Express.js, it enables groups to organize trips, manage expenses, track packing lists, and communicate through real-time chat functionality. The app features the tagline "Plan Together, Travel Better" and is optimized for both web and mobile deployment through Capacitor.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Routing**: Wouter (lightweight routing library)
- **State Management**: React Query (TanStack Query) for server state, React Context for global app state
- **UI Framework**: shadcn/ui components with Radix UI primitives
- **Styling**: Tailwind CSS with custom design system
- **Build Tool**: Vite for fast development and optimized builds
- **Real-time Communication**: WebSocket client for live updates

### Backend Architecture
- **Runtime**: Node.js with Express.js framework
- **Language**: TypeScript with ES modules
- **Authentication**: Passport.js with local strategy and session-based auth
- **Session Storage**: PostgreSQL-backed sessions using connect-pg-simple
- **Password Security**: Native Node.js crypto (scrypt) for hashing
- **Chat Encryption**: AES-256-GCM encryption for secure message storage
- **Real-time Features**: WebSocket server for live notifications and chat

### Database Architecture
- **Database**: PostgreSQL with Neon serverless hosting
- **ORM**: Drizzle ORM for type-safe database operations
- **Schema Management**: Drizzle Kit for migrations and schema management
- **Connection Pooling**: Neon serverless connection pooling

## Key Components

### Authentication System
- Session-based authentication with secure password hashing
- Password reset functionality with email verification
- User profile management with avatar support
- Protected routes with authentication middleware

### Trip Management
- Trip creation with customizable details (dates, location, description)
- Invite code system for joining trips
- Trip member management and permissions
- Trip archiving and past trip viewing

### Expense Tracking
- Expense creation with category support
- Split expense functionality among trip members
- Debt calculation and settlement tracking
- Payment preference management (Venmo, PayPal)

### Communication Features
- Real-time chat system with WebSocket integration and end-to-end encryption
- Notification system for trip updates
- Activity logging for trip events
- Secure chat message encryption using AES-256-GCM for user privacy
- Encrypted file sharing with secure download endpoints and access control

### Progressive Web App Features
- **Installable App**: Web app manifest enables installation on mobile and desktop devices
- **Offline Support**: Service worker caches essential resources for offline functionality
- **App Icons**: Custom PWA icons in multiple sizes (72x72 to 512x512 pixels)
- **Install Prompt**: User-friendly component encourages app installation
- **Offline Indicator**: Visual feedback for network connectivity status
- **App-like Experience**: Standalone display mode with custom theme colors
- **Background Sync**: Service worker handles data synchronization when back online

### Data Storage
- User profiles with encrypted personal information (displayName, email)
- Trip data with encrypted sensitive details (name, description, location)
- Expense records with encrypted descriptions and participant tracking
- Chat messages with end-to-end encryption and secure file attachments
- Grocery and packing lists with encrypted item names for privacy
- Activity logs and notification persistence
- Comprehensive encryption using AES-256-GCM with unique salts per record

## Data Flow

### Authentication Flow
1. User registers/logs in through frontend form
2. Credentials sent to Express.js backend
3. Passport.js validates credentials and creates session
4. Session stored in PostgreSQL with connect-pg-simple
5. Frontend receives user data and updates auth state

### Trip Operations Flow
1. Frontend sends trip operations via React Query mutations
2. Express.js validates user permissions and processes requests
3. Drizzle ORM executes database operations
4. WebSocket broadcasts updates to connected trip members
5. Frontend updates UI through query invalidation

### Real-time Communication Flow
1. WebSocket connection established on trip page load
2. User actions trigger WebSocket events
3. Server broadcasts events to relevant trip members
4. Frontend receives events and updates UI accordingly
5. Notification system displays relevant updates

## External Dependencies

### Core Dependencies
- **@tanstack/react-query**: Server state management and caching
- **@radix-ui/***: Accessible UI component primitives
- **drizzle-orm & drizzle-kit**: Database ORM and migration tools
- **@neondatabase/serverless**: PostgreSQL connection for Neon
- **passport & passport-local**: Authentication framework
- **express-session**: Session management
- **ws**: WebSocket implementation

### UI and Styling
- **tailwindcss**: Utility-first CSS framework
- **class-variance-authority**: Component variant management
- **framer-motion**: Animation library
- **lucide-react**: Icon library

### PWA Dependencies
- **vite-plugin-pwa**: PWA plugin for Vite build system
- **Service Worker API**: Native browser API for offline functionality
- **Web App Manifest**: Standard for installable web applications
- **Cache API**: Browser caching for offline resource management

### Email Services
- **nodemailer**: Email sending for password resets
- **@sendgrid/mail**: Alternative email service provider

### Development Tools
- **vite**: Build tool and development server
- **typescript**: Type safety and development experience
- **tsx**: TypeScript execution for development

## Deployment Strategy

### Development Environment
- **Runtime**: Node.js 20 with Replit hosting
- **Database**: PostgreSQL 16 with automatic provisioning
- **Development Server**: Vite dev server with HMR
- **Process Management**: tsx for TypeScript execution

### Production Build Process
1. Frontend build with Vite (`npm run build`)
2. Backend bundling with esbuild (`npm run build`)
3. Static assets served from Express.js
4. Database migrations applied via Drizzle

### Mobile App Deployment (Capacitor)
- **App ID**: `com.gearup.app`
- **App Name**: GearUp
- **Platforms**: iOS and Android native apps
- **Build Commands**: 
  - `npm run build` - Build web assets
  - `npx cap sync` - Sync to mobile platforms
  - `npx cap open android/ios` - Open in native IDEs
- **Store Deployment**: Ready for Google Play Store and Apple App Store submission

### Environment Configuration
- Database connection via `DATABASE_URL` environment variable
- SMTP configuration for email services
- Session secret for secure authentication
- WebSocket configuration for real-time features

### Scaling Considerations
- Autoscale deployment target for traffic handling
- Neon serverless database for automatic scaling
- WebSocket connection management for multiple instances
- Session store clustering for horizontal scaling

## External Port Synchronization

The external port 80 mapping requires production build files to reflect latest changes. Use the following process:

### Quick Sync Process
```bash
# Build and sync latest changes to external port 80
npm run build                    # Create production build in dist/public/
cp -r dist/public/* server/public/  # Copy to server expected location
# External port 80 will now serve the latest changes
```

### Automated Sync Script
A `sync-external-port.sh` script is available for quick synchronization:
```bash
./sync-external-port.sh  # Builds and copies files automatically
```

### Technical Details
- Development server (port 5000) uses Vite HMR for live changes
- External port 80 mapping requires static files in `server/public/` 
- Production build creates optimized files in `dist/public/`
- Manual copy operation ensures external port serves latest changes

## Changelog

```
Changelog:
- August 11, 2025. Fixed External Port 80 Synchronization Issue
  - ✅ Identified external port mapping requires production build files
  - ✅ Created production build with latest changes (CSS: 117KB, JS: 985KB)
  - ✅ Implemented sync process to copy build files to server/public/
  - ✅ Added automated sync script for future updates
  - ✅ External port 80 now reflects latest application changes
  - ✅ Documented sync process for ongoing maintenance
- August 10, 2025. Added No-Cache Headers for API Reliability
  - ✅ Added Cache-Control headers to prevent API response caching
  - ✅ Implemented no-cache, no-store, must-revalidate directives for all /api routes
  - ✅ Added Pragma: no-cache and Expires: 0 for better browser compatibility
  - ✅ Resolves issues with stale data being served from browser/proxy caches
- August 6, 2025. Enhanced Trip Date and Invite Code Encryption
  - ✅ Extended encryption to trip start dates, end dates, and invite codes
  - ✅ Updated database schema to support encrypted date fields using text storage
  - ✅ Enhanced encryption/decryption functions with backward compatibility
  - ✅ Fixed user profile encryption during updates to maintain data security
  - ✅ Implemented robust error handling for mixed encrypted/unencrypted data
  - ✅ All sensitive trip and user data now encrypted in database storage
  - ✅ Frontend continues to display all data in readable format
- July 31, 2025. Comprehensive Data Encryption Implementation
  - ✅ Implemented comprehensive AES-256-GCM encryption for all sensitive data types
  - ✅ User profile data (displayName, email) encrypted before database storage
  - ✅ Trip data (name, description, location) encrypted with unique salts
  - ✅ Grocery item names encrypted for shopping privacy
  - ✅ Expense descriptions encrypted for financial privacy
  - ✅ Packing item names encrypted for personal item privacy
  - ✅ File uploads now encrypted before storage with secure download endpoints
  - ✅ Chat messages continue to use end-to-end encryption
  - ✅ Backward compatibility maintained for existing unencrypted data
  - ✅ Secure file decryption API with trip member access control
  - ✅ Database schema updated with encryption flags for all sensitive tables
- July 31, 2025. Enhanced Security and Offline Functionality
  - ✅ Implemented end-to-end chat message encryption using AES-256-GCM
  - ✅ Enhanced offline authentication with cached user data
  - ✅ Improved service worker with proper offline caching strategies
  - ✅ Added offline banner for connection status awareness
  - ✅ Chat messages now encrypted before database storage for privacy
- July 26, 2025. Successfully converted TripMate to Progressive Web App (PWA)
  - ✅ Added web app manifest with installable features
  - ✅ Implemented service worker for offline functionality  
  - ✅ Created PWA icons in multiple sizes (72x72 to 512x512)
  - ✅ Added install prompt component with user-friendly interface
  - ✅ Implemented offline indicator for network status
  - ✅ Added service worker registration with update detection
  - ✅ Enhanced HTML meta tags for mobile app experience
  - ✅ App confirmed working and installable on mobile devices
- June 14, 2025. Initial setup
```

## User Preferences

```
Preferred communication style: Simple, everyday language.
```