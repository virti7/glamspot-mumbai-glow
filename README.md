# GlamSpot — Mumbai Glow

A production-grade salon platform for Mumbai, powered by AI beauty diagnosis.

## Architecture

```
glamspot-mumbai-glow/
├── frontend/          # TanStack Start + React 19 + Tailwind CSS
├── backend/           # Express API server
├── shared/            # Shared types, schemas, constants
├── database/          # SQL migrations
├── docs/              # Documentation
├── docker-compose.yml # Container orchestration
└── package.json       # Monorepo root
```

## Tech Stack

- **Frontend**: React 19, TanStack Start/Router/Query, Tailwind CSS v4, Vite
- **Backend**: Express, TypeScript, Zod validation
- **Database**: Supabase (PostgreSQL + Storage)
- **AI**: Anthropic Claude API for hair/skin analysis
- **Auth**: Supabase Auth with JWT/Bearer tokens

## Getting Started

### Prerequisites

- Node.js 18+
- npm or bun
- Supabase account
- Anthropic API key

### Installation

```bash
# Install dependencies
npm install

# Copy environment variables
cp .env.example .env

# Update .env with your keys
```

### Development

```bash
# Start all services
npm run dev

# Start frontend only
npm run dev:frontend

# Start backend only
npm run dev:backend
```

### Build

```bash
npm run build
```

## API Endpoints

- `POST /api/auth/login` - User login
- `POST /api/auth/register` - User registration
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

## Deployment

### Vercel (Frontend)

```bash
cd frontend
vercel deploy
```

### Railway/Render (Backend)

```bash
cd backend
# Configure environment variables
# Deploy
```

### Supabase

Run migrations from `database/migrations/` in your Supabase dashboard.

## Database Tables

- `profiles` - User profiles
- `glam_scans` - AI scan results
- `appointments` - Salon bookings

## License

Private - All rights reserved.
