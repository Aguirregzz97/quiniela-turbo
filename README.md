# Quiniela Turbo ⚽

A modern football prediction pool (quiniela) application built with Next js 15. Compete with friends by predicting match scores and track your standings on the leaderboard.

![Next.js](https://img.shields.io/badge/Next.js-15-black?style=flat-square&logo=next.js)
![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?style=flat-square&logo=typescript)
![Tailwind CSS](https://img.shields.io/badge/Tailwind-4-38B2AC?style=flat-square&logo=tailwind-css)
![Drizzle ORM](https://img.shields.io/badge/Drizzle-ORM-green?style=flat-square)

## Features

### Core Functionality

- **Create & Manage Quinielas** - Create prediction pools for specific football leagues and rounds
- **Make Predictions** - Submit your score predictions for upcoming matches
- **Live Leaderboard** - Track standings with automatic point calculation
- **View All Predictions** - See how other participants predicted (hidden until match starts)

### User Management

- **Google Authentication** - Secure sign-in with NextAuth.js
- **Participant Management** - Admins can view participants and remove users if needed
- **Join via Code** - Share a unique code to invite friends to your quiniela

### Match Data & Odds

- **Live Match Data** - Real-time fixtures from API-Football
- **Betting Odds** - View match probabilities to help inform your predictions
- **Multiple Leagues** - Support for various football leagues and seasons

### Scoring System

- **Exact Score** - Higher points for predicting the exact score
- **Correct Result** - Points for predicting the correct winner/draw
- **Customizable Points** - Admins can configure point values per quiniela

## Tech Stack

### Frontend

- **[Next.js 15](https://nextjs.org/)** - React framework with App Router & Turbopack
- **[TypeScript](https://www.typescriptlang.org/)** - Type-safe development
- **[Tailwind CSS 4](https://tailwindcss.com/)** - Utility-first styling
- **[shadcn/ui](https://ui.shadcn.com/)** - Beautiful UI components built on Radix UI
- **[Lucide Icons](https://lucide.dev/)** - Clean, consistent icons
- **[React Hook Form](https://react-hook-form.com/)** - Performant form handling
- **[Zod](https://zod.dev/)** - Schema validation

### Backend & Database

- **[Drizzle ORM](https://orm.drizzle.team/)** - TypeScript ORM for PostgreSQL
- **[PostgreSQL](https://www.postgresql.org/)** - Relational database (via Supabase)
- **[Redis](https://redis.io/)** - Caching layer for API responses

### Authentication

- **[NextAuth.js v5](https://authjs.dev/)** - Authentication with Google OAuth

### Data Fetching

- **[TanStack Query](https://tanstack.com/query)** - Server state management & caching
- **[API-Football](https://www.api-football.com/)** - Football data API for fixtures, results & odds

### Other

- **[Vaul](https://vaul.emilkowal.ski/)** - Drawer component for mobile
- **[next-themes](https://github.com/pacocoursey/next-themes)** - Dark/light mode support
- **[Recharts](https://recharts.org/)** - Charts and data visualization

## Getting Started

### Prerequisites

- Node.js 18+
- pnpm (recommended) or npm
- PostgreSQL database
- Redis instance
- API-Football API key
- Google OAuth credentials

### Environment Variables

Create a `.env.local` file with the following variables:

```env
# Database
DATABASE_URL=postgres://...

# Auth
NEXTAUTH_SECRET=your-secret
NEXTAUTH_URL=http://localhost:3000
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret

# API Football
API_FOOTBALL_KEY=your-api-key

# Redis
REDIS_URL=redis://...
```

### Installation

```bash
# Clone the repository
git clone https://github.com/aguirregzz97/quiniela-turbo.git
cd quiniela-turbo

# Install dependencies
pnpm install

# Push database schema
pnpm push

# Run development server
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) to see the application.

## Project Structure

```
quiniela-turbo/
├── app/                    # Next.js App Router pages
│   ├── api/               # API routes
│   ├── quinielas/         # Quiniela pages & actions
│   ├── sign-in/           # Authentication pages
│   └── ...
├── components/            # React components
│   ├── Navbar/           # Navigation components
│   ├── QuinielaComponents/ # Quiniela-specific components
│   └── ui/               # shadcn/ui components
├── db/                    # Database schema & config
├── hooks/                 # Custom React hooks
├── lib/                   # Utility functions
├── Providers/            # Context providers
└── types/                # TypeScript type definitions
```

## Scripts

```bash
pnpm dev          # Start development server with Turbopack
pnpm build        # Build for production
pnpm start        # Start production server
pnpm lint         # Run ESLint
pnpm push         # Push schema changes to database
pnpm generate     # Generate Drizzle migrations
```

## Author

Created by [Andres Aguirre Gonzalez](https://github.com/aguirregzz97)

## License

This project is private and not licensed for public use.
