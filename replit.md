# ChatApp - Real-time Chat Application

## Overview

This is a modern real-time chat application built with a full-stack TypeScript architecture. The application features multiple chat rooms, real-time messaging via WebSockets, user authentication through Replit Auth, and a responsive UI built with React and shadcn/ui components.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Build Tool**: Vite for fast development and optimized builds
- **UI Library**: shadcn/ui components built on Radix UI primitives
- **Styling**: Tailwind CSS with CSS variables for theming
- **State Management**: TanStack Query (React Query) for server state
- **Routing**: Wouter for lightweight client-side routing
- **Theme Support**: Light/dark mode with persistent localStorage

### Backend Architecture
- **Runtime**: Node.js with Express.js
- **Language**: TypeScript with ES modules
- **Real-time Communication**: WebSocket Server (ws library)
- **Authentication**: Replit Auth with OpenID Connect
- **Session Management**: Express sessions with PostgreSQL storage

### Database Layer
- **Database**: PostgreSQL (configured for Neon serverless)
- **ORM**: Drizzle ORM with migrations
- **Schema Validation**: Zod schemas for type-safe data validation

## Key Components

### Authentication System
- Replit Auth integration with OpenID Connect
- Session-based authentication with PostgreSQL session store
- Automatic user profile creation and management
- Protected routes with authentication middleware

### Real-time Chat System
- WebSocket server for instant messaging
- Room-based chat with join/leave functionality
- Typing indicators and user presence
- Message history with pagination
- Profanity filtering and content moderation

### User Interface
- Responsive three-panel layout (sidebar, main chat, users list)
- Mobile-optimized with collapsible panels
- Rich message rendering with image support
- Typing indicators and connection status
- Theme switching with system preference detection

### Data Models
- **Users**: Profile management with status tracking
- **Rooms**: Public/private chat rooms with member management
- **Messages**: Text and image messages with timestamps
- **Room Members**: Join tracking with last read timestamps

## Data Flow

### Authentication Flow
1. User accesses the application
2. Redirected to Replit Auth if not authenticated
3. OAuth flow creates/updates user profile
4. Session established with persistent storage
5. User redirected to main chat interface

### Messaging Flow
1. User connects to WebSocket server
2. Authentication verified via session
3. User joins selected chat room
4. Messages broadcast to all room members
5. Message history loaded from database
6. Typing indicators shared in real-time

### Room Management
1. Users can create public/private rooms
2. Room membership tracked in database
3. Real-time user list updates
4. Automatic cleanup of inactive connections

## External Dependencies

### Core Dependencies
- **@neondatabase/serverless**: Serverless PostgreSQL client
- **drizzle-orm**: Type-safe database ORM
- **express**: Web application framework
- **ws**: WebSocket server implementation
- **openid-client**: OpenID Connect authentication
- **@tanstack/react-query**: Server state management

### UI Dependencies
- **@radix-ui/***: Accessible UI primitives
- **tailwindcss**: Utility-first CSS framework
- **wouter**: Lightweight routing
- **date-fns**: Date manipulation utilities

### Development Tools
- **vite**: Build tool and dev server
- **typescript**: Type checking and compilation
- **tsx**: TypeScript execution for development

## Deployment Strategy

### Development
- Vite dev server for frontend with HMR
- tsx for backend TypeScript execution
- Database migrations via Drizzle Kit
- Environment variables for database connection

### Production Build
1. Frontend built with Vite to static assets
2. Backend compiled with esbuild to single bundle
3. Assets served statically by Express
4. Database schema deployed via migrations
5. WebSocket server runs alongside HTTP server

### Environment Configuration
- **DATABASE_URL**: PostgreSQL connection string
- **SESSION_SECRET**: Session encryption key  
- **REPL_ID**: Replit application identifier
- **ISSUER_URL**: OpenID Connect issuer endpoint

The application is designed to run seamlessly on Replit's infrastructure while being portable to other deployment platforms with minimal configuration changes.