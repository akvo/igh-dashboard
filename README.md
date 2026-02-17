# IGH Dashboard

Global Portfolio Overview dashboard — a Next.js frontend with an Apollo GraphQL backend backed by a SQLite OLAP database.

## Prerequisites

- Node.js 20+
- npm
- The `star_schema.db` SQLite file placed in `backend/`

## Quick start

```bash
./dev.sh
```

This installs dependencies in both services and starts them concurrently. Press Ctrl+C to stop both.

## Manual start

**Backend** (GraphQL API — port 4000):

```bash
cd backend
npm install
npm run dev
```

**Frontend** (Next.js — port 3000):

```bash
cd frontend
npm install
npm run dev
```

## Running all checks

Run frontend tests, backend tests, and all backend linting and type checking with a single command from the project root:

```bash
npm run check:all
```

This runs the following in sequence, stopping on the first failure:

1. Frontend unit tests (Vitest)
2. Backend unit tests (Vitest)
3. Backend type checking, linting, and formatting verification (tsc, ESLint, Prettier)

## Services

| Service  | URL                    | Description             |
| -------- | ---------------------- | ----------------------- |
| Frontend | http://localhost:3000   | Next.js dashboard UI    |
| Backend  | http://localhost:4000   | Apollo GraphQL API      |
