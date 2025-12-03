# Pushboard - Professional Kanban Board Application

A modern, real-time Kanban board application built with Next.js 16, React 19, and Convex.

## Features

- **Authentication**: Built-in Convex authentication
- **Real-time Updates**: Automatic synchronization across all connected clients using Convex
- **Drag and Drop**: Intuitive task management with @dnd-kit
- **Multi-user Collaboration**: Share boards with team members
- **Modern UI**: Clean, utility-focused design with Tailwind CSS

## Tech Stack

- **Frontend**: Next.js 16, React 19, TypeScript
- **Backend**: Convex (Database, Real-time, Auth)
- **Styling**: Tailwind CSS
- **Drag & Drop**: @dnd-kit

## Getting Started

### Prerequisites

- Node.js 18+ installed
- A Convex account (free tier works)

### Installation

1. Clone the repository and install dependencies:

```bash
npm install
```

2. Set up environment variables:

Create a `.env.local` file in the root directory:

```env
NEXT_PUBLIC_CONVEX_URL=your_convex_deployment_url
CONVEX_DEPLOY_KEY=your_convex_deploy_key
```

3. Set up Convex:

```bash
npx convex dev
```

This will:
- Create a new Convex project (if needed)
- Push your schema and functions
- Generate the deployment URL

4. Update your `.env.local` with the Convex URL from the previous step.

5. Run the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Authentication

This app uses Convex's built-in authentication. Users can sign up and sign in through the `/sign-up` and `/sign-in` pages.

## Project Structure

```
pushboard/
├── app/                    # Next.js app directory
│   ├── boards/            # Board pages
│   ├── sign-in/           # Sign-in page
│   ├── sign-up/           # Sign-up page
│   └── page.tsx           # Home page
├── components/            # React components
│   └── ConvexClientProvider.tsx
├── convex/                # Convex backend
│   ├── schema.ts          # Database schema
│   ├── boards.ts          # Board queries/mutations
│   ├── columns.ts         # Column queries/mutations
│   ├── tasks.ts           # Task queries/mutations
│   ├── users.ts           # User queries/mutations
│   ├── seed.ts            # Seed data function
│   └── http.ts            # HTTP routes
└── middleware.ts          # Next.js middleware (removed - not needed)
```

## Phase 1 Features

✅ Authentication with Convex built-in auth
✅ Database schema (users, boards, columns, tasks)
✅ CRUD operations for all entities
✅ Real-time updates via Convex subscriptions
✅ Drag-and-drop task management
✅ Multi-user collaboration support
✅ Seed data for testing

## Usage

1. **Sign Up**: Create an account at `/sign-up`
2. **Sign In**: Sign in at `/sign-in`
3. **Create a Board**: Click "New Board" on the boards page
4. **Add Columns**: Click "+ Add column" to create workflow stages
5. **Add Tasks**: Click "+ Add task" in any column
6. **Drag Tasks**: Drag tasks between columns to update their status
7. **Real-time Sync**: Changes automatically sync across all users viewing the board

## Development

The app uses Convex's `useQuery` hook which automatically provides real-time subscriptions. Any changes to the database will automatically update all connected clients.

## License

MIT
