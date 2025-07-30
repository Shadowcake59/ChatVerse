# Replit Configuration

## Overview

This is a modern chat application built with a full-stack TypeScript architecture. The application features real-time messaging using WebSockets, user authentication with Passport.js, and a responsive React frontend built with shadcn/ui components and Tailwind CSS.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

The application follows a monorepo structure with clear separation between client, server, and shared code:

- **Frontend**: React with TypeScript, Vite for building and development
- **Backend**: Express.js server with TypeScript
- **Database**: PostgreSQL with Drizzle ORM
- **Authentication**: Passport.js with local strategy and session-based auth
- **Real-time Communication**: WebSocket implementation for chat functionality
- **UI Framework**: shadcn/ui components with Radix UI primitives and Tailwind CSS

## Key Components

### Frontend Architecture
- **React with TypeScript**: Modern React using functional components and hooks
- **Vite**: Fast development server and build tool with hot module replacement
- **TanStack Query**: Data fetching and caching for API calls
- **Wouter**: Lightweight client-side routing
- **shadcn/ui**: Pre-built accessible UI components based on Radix UI
- **Tailwind CSS**: Utility-first CSS framework with custom theming
- **Theme System**: Light/dark mode support with context-based theme switching

### Backend Architecture
- **Express.js**: Web framework handling HTTP requests and WebSocket upgrades
- **TypeScript**: Strongly typed backend code
- **Passport.js**: Authentication middleware with local strategy
- **Session Management**: PostgreSQL-backed session storage using connect-pg-simple
- **WebSocket Server**: Real-time bidirectional communication for chat features
- **Password Security**: Scrypt-based password hashing with salt

### Database Design
- **Drizzle ORM**: Type-safe database queries and migrations
- **PostgreSQL**: Primary database using Neon serverless
- **Schema Structure**:
  - `users`: User accounts with authentication details
  - `rooms`: Chat rooms (public/private)
  - `messages`: Chat messages with user associations
  - `room_members`: Many-to-many relationship between users and rooms
  - `sessions`: Server-side session storage

## Data Flow

### Authentication Flow
1. User submits login credentials via frontend form
2. Passport.js validates credentials against database
3. Session created and stored in PostgreSQL
4. Frontend receives authentication status and user data
5. Protected routes require valid session

### Real-time Chat Flow
1. WebSocket connection established after authentication
2. User joins specific chat rooms via WebSocket messages
3. Messages broadcast to all room members in real-time
4. Message persistence handled through database storage
5. Typing indicators and online status managed via WebSocket events

### Data Fetching
1. Frontend uses TanStack Query for HTTP requests
2. Automatic error handling and retry logic
3. Optimistic updates for better user experience
4. Cache invalidation on mutations

## External Dependencies

### Core Dependencies
- **@neondatabase/serverless**: Neon PostgreSQL database connection
- **@tanstack/react-query**: Data fetching and state management
- **@radix-ui/***: Accessible UI component primitives
- **drizzle-orm**: Type-safe database ORM
- **passport**: Authentication middleware
- **ws**: WebSocket implementation
- **express-session**: Session management
- **zod**: Runtime type validation

### Development Dependencies
- **vite**: Build tool and development server
- **typescript**: Type checking and compilation
- **tailwindcss**: CSS framework
- **esbuild**: Fast JavaScript bundler for production

## Deployment Strategy

### Build Process
1. Frontend built using Vite into `dist/public` directory
2. Backend compiled with esbuild for Node.js production
3. Static assets served by Express in production
4. Single deployment artifact containing both frontend and backend

### Environment Configuration
- **Development**: Vite dev server with Express backend
- **Production**: Express serves both API and static assets
- **Database**: PostgreSQL connection via `DATABASE_URL` environment variable
- **Sessions**: Configurable session secret for security

### Key Environment Variables
- `DATABASE_URL`: PostgreSQL connection string
- `SESSION_SECRET`: Secret key for session encryption
- `NODE_ENV`: Environment mode (development/production)

The application is designed to run on platforms like Replit with minimal configuration, requiring only a PostgreSQL database and basic environment variables.