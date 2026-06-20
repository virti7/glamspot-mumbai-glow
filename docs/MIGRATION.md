# Migration Guide: GlamSpot Mumbai Glow Refactor

## Overview

This document describes the architectural changes made to the GlamSpot Mumbai Glow project for production-grade scalability.

## What Changed

### 1. Monorepo Structure

**Before:**
```
glamspot-mumbai-glow/
├── src/           # All frontend code
├── backend/       # Limited backend utilities
└── package.json   # Single package
```

**After:**
```
glamspot-mumbai-glow/
├── frontend/      # Complete TanStack Start app
├── backend/       # Full Express API server
├── shared/        # Shared types, schemas, constants
├── database/      # SQL migrations
├── docs/          # Documentation
└── package.json   # Monorepo root with workspaces
```

### 2. Component Extraction

**Before:**
- Single 2084-line `index.tsx` containing all UI components

**After:**
- `components/Navbar.tsx` - Navigation bar
- `components/Hero.tsx` - Hero section
- `components/ReelsStrip.tsx` - Instagram reels section
- `components/GlamAI.tsx` - AI diagnosis section
- `components/WhatWeDo.tsx` - Services section
- `components/ExclusiveHairServices.tsx` - Hair services carousel
- `components/SalonDiscovery.tsx` - Salon discovery with filters
- `components/Team.tsx` - Team section
- `components/Tour360.tsx` - 360° salon tour
- `components/Testimonials.tsx` - Customer testimonials
- `components/Brands.tsx` - Brand logos
- `components/Footer.tsx` - Footer
- `components/BookingModal.tsx` - Booking modal
- `components/SectionFade.tsx` - Scroll animation wrapper
- `components/ResultsView.tsx` - AI scan results display

### 3. Data Separation

**Before:**
- All data (salons, reels, testimonials, etc.) hardcoded in index.tsx

**After:**
- `data/salons.ts` - Salon data and filters
- `data/reels.ts` - Instagram reels data
- `data/what-we-do.ts` - Services data
- `data/stylists.ts` - Team data
- `data/testimonials.ts` - Customer testimonials
- `data/brands.ts` - Brand logos
- `data/tour-salons.ts` - 360° tour data
- `data/exclusive-services.ts` - Hair services data
- `data/booking.ts` - Booking modal data
- `data/glamai.ts` - AI diagnosis data and types

### 4. Shared Layer

**New:**
- `shared/schemas/scan.schema.ts` - Zod schemas for API validation
- `shared/types/index.ts` - TypeScript interfaces
- `shared/constants/index.ts` - Application constants
- `shared/utils/index.ts` - Utility functions

### 5. Backend API

**New REST API endpoints:**
- `POST /api/auth/login` - User login
- `POST /api/auth/register` - User registration
- `POST /api/auth/logout` - User logout
- `GET /api/auth/session` - Get session
- `GET /api/users/profile` - Get user profile
- `PUT /api/users/profile` - Update user profile
- `GET /api/salons` - List salons
- `GET /api/salons/:id` - Get salon details
- `POST /api/bookings` - Create booking
- `GET /api/bookings` - List user bookings
- `PUT /api/bookings/:id/status` - Update booking status
- `POST /api/glamai/upload` - Upload scan image
- `POST /api/glamai/analyze` - Analyze scan with AI
- `GET /api/glamai/scans` - Get user scans

### 6. Backend Architecture

**Controllers:**
- `auth.routes.ts` - Authentication endpoints
- `user.routes.ts` - User profile endpoints
- `salon.routes.ts` - Salon endpoints
- `booking.routes.ts` - Booking endpoints
- `glamai.routes.ts` - AI diagnosis endpoints
- `upload.routes.ts` - File upload endpoints

**Services:**
- `scan.service.ts` - Scan upload logic
- `analysis.service.ts` - AI analysis logic
- `user.service.ts` - User profile logic
- `appointment.service.ts` - Booking logic

**Repositories:**
- `scan.repository.ts` - Scan database operations
- `user.repository.ts` - User database operations
- `appointment.repository.ts` - Booking database operations

**Middleware:**
- `auth.middleware.ts` - Authentication middleware
- `error.middleware.ts` - Error handling
- `not-found.middleware.ts` - 404 handling
- `validation.middleware.ts` - Request validation

**Integrations:**
- `supabase/client.ts` - Supabase client
- `supabase/auth.ts` - Supabase auth
- `supabase/storage.ts` - Supabase storage
- `anthropic/client.ts` - Anthropic Claude API

### 7. Database

**Moved:**
- `database/migrations/001_create_tables.sql`
- `database/migrations/002_create_storage.sql`
- `database/schema/README.md` - Schema documentation

## What Didn't Change

- All UI components preserved exactly
- All Tailwind classes preserved exactly
- All animations preserved exactly
- All routes preserved exactly
- All pages preserved exactly
- All styling preserved exactly
- All responsiveness preserved exactly
- User experience unchanged

## Deployment

### Frontend (Vercel)
```bash
cd frontend
vercel deploy
```

### Backend (Railway/Render)
```bash
cd backend
# Configure environment variables
# Deploy
```

### Database (Supabase)
Run migrations from `database/migrations/` in Supabase dashboard.

## Environment Variables

See `.env.example` for required environment variables:

```env
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
ANTHROPIC_API_KEY=your_anthropic_api_key
PORT=3001
NODE_ENV=development
FRONTEND_URL=http://localhost:3000
```
