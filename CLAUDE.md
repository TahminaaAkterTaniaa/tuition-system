# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

### Essential Commands
- `npm run dev` - Start development server with Turbopack
- `npm run build` - Build production application
- `npm run lint` - Run ESLint checks
- `npm start` - Start production server

### Database Commands
- `npm run prisma:generate` - Generate Prisma client
- `npm run prisma:migrate` - Run database migrations
- `npm run prisma:seed` - Seed database with initial data
- `npm run seed:test` - Seed database with test data

### Migration Scripts
- `npm run migrate:reset-classes` - Reset classes for scheduling
- `npm run migrate:run` - Run custom migration scripts

### Deployment
- `npm run vercel-build` - Custom Vercel build script with database setup

## Architecture Overview

This is a comprehensive tuition management system built with Next.js 15, using PostgreSQL with Prisma ORM. The system supports four user roles: Admin, Teacher, Student, and Parent, each with dedicated dashboards and functionality.

### Tech Stack
- **Framework**: Next.js 15 (App Router)
- **Database**: PostgreSQL with Prisma ORM
- **Authentication**: NextAuth.js with credentials provider
- **UI**: Tailwind CSS with Headless UI components
- **State Management**: Zustand
- **Form Handling**: React Hook Form with Zod validation
- **File Storage**: Vercel Blob + Cloudinary integration
- **Real-time**: Socket.io implementation
- **PDF Generation**: html2pdf.js for reports

### Project Structure

#### Core Directories
- `src/app/` - Next.js App Router pages and API routes
- `src/app/api/` - API routes organized by feature and role
- `src/components/` - Shared React components
- `src/lib/` - Utility libraries (auth, database, file storage)
- `prisma/` - Database schema and migrations
- `scripts/` - Database migration and seeding scripts

#### Role-Based Routes
- `src/app/admin/` - Admin dashboard (user management, analytics, finance)
- `src/app/teacher/` - Teacher dashboard (classes, gradebook, resources)
- `src/app/student/` - Student dashboard (classes, grades, attendance)
- `src/app/parent/` - Parent dashboard (child monitoring, payments)

### Database Schema Key Points

#### Core Models
- **User**: Base model with role-based polymorphic relationships
- **Student/Teacher/Admin/Parent**: Role-specific profile data
- **Class**: Courses with scheduling, capacity, and fee management
- **Enrollment**: Student-class relationships with payment tracking
- **Grade**: Assessment tracking with weighted scoring system
- **Payment**: Financial transaction management with parent linking

#### Important Relationships
- Users have polymorphic relationships to role-specific profiles
- Classes have complex scheduling through ClassSchedule model
- Parents can link to multiple students via ParentStudent junction table
- Enrollments create automatic payment records
- All major actions create notifications for relevant users

### Authentication & Authorization

#### NextAuth Configuration
- Uses JWT strategy with 30-day session duration
- Credentials provider with bcrypt password hashing
- Role-based session data includes user ID, email, name, and role
- Custom redirect handling for different environments

#### Role Access Patterns
- API routes use role-based middleware patterns
- Each role has dedicated API route prefixes (`/api/admin/*`, `/api/teacher/*`, etc.)
- Frontend components implement role-based conditional rendering
- Session data is typed with Prisma Role enum

### File Upload & Storage

#### Multiple Storage Backends
- **Vercel Blob**: Primary file storage for documents and resources
- **Cloudinary**: Alternative storage with image optimization
- **Local uploads/**: Fallback local storage directory

#### Upload Patterns
- Student documents (transcripts, ID documents) stored per enrollment
- Teacher resources organized by class
- File paths include user/class context for organization

### Business Logic Patterns

#### Financial Calculations
- Revenue calculations filter enrollments by current month
- Teacher salaries: `(salaryPerClass × classCount) + (extraPerSchedule × scheduleCount)`
- Weighted grade calculations: `(score/maxScore) * weight * 100`
- Payment due dates and reminder systems

#### Scheduling System
- Classes have multiple schedules via ClassSchedule model
- Room and TimeSlot management for conflict prevention
- Schedule conflict detection APIs

#### Notification System
- Real-time notifications via Socket.io
- Database-stored notifications with read status tracking
- Type-based notifications (enrollment, payment, grade, attendance)

## Development Guidelines

### Code Patterns
- Use TypeScript throughout with strict typing
- Prisma models generate types - import from `@prisma/client`
- API routes follow RESTful patterns with proper HTTP methods
- Error handling with try-catch and appropriate HTTP status codes

### Form Handling
- React Hook Form with Zod validation schemas
- Form components in role-specific directories
- File upload forms handle multiple storage backends

### State Management
- Zustand for client-side state (see `src/lib/store/`)
- Server state fetching with built-in React patterns
- Session state managed by NextAuth

### Database Patterns
- Use `src/lib/prisma.ts` for database client
- Include proper relations in queries to avoid N+1 problems
- Filter data by user role and permissions in API routes
- Use transactions for multi-table operations (enrollments + payments)

### Environment Variables
- `DATABASE_URL` - PostgreSQL connection string
- `NEXTAUTH_SECRET` - JWT signing secret
- `NEXTAUTH_URL` - Application URL for auth redirects
- `BLOB_READ_WRITE_TOKEN` - Vercel Blob storage token
- `CLOUDINARY_*` - Cloudinary configuration (fallback storage)

## Testing & Quality

### Current Testing Setup
- No formal test framework configured yet
- Manual testing scripts in `scripts/` directory
- Database seeding for test data scenarios

### Code Quality
- ESLint configuration with Next.js rules
- TypeScript strict mode enabled
- Prisma generates type-safe database client

## Common Development Tasks

### Adding New User Roles
1. Update `Role` enum in `prisma/schema.prisma`
2. Create corresponding profile model
3. Update `src/lib/auth.ts` session handling
4. Add role-specific API routes and pages

### Database Schema Changes
1. Modify `prisma/schema.prisma`
2. Run `npm run prisma:migrate` to create migration
3. Update TypeScript types throughout codebase
4. Test with `npm run seed:test`

### API Route Development
- Follow existing patterns in `src/app/api/`
- Include proper authentication and role checking
- Use Prisma client from `src/lib/prisma.ts`
- Return consistent JSON response formats

### File Upload Implementation
- Use `src/lib/blob-storage.ts` for Vercel Blob
- Fallback to `src/lib/cloudinary.ts` for images
- Organize uploads by user context and purpose