# GraphQL API for Global Portfolio Overview

GraphQL API serving the Global Portfolio Overview dashboard, backed by a read-only SQLite analytics database.

## Quick Start

```bash
npm install
npm run dev      # Development with hot-reload (tsx watch)
npm run build    # Compile TypeScript
npm run test     # Run unit tests
```

Endpoint: `http://localhost:4000`

## Project Structure

```
graphql-api/
├── src/
│   ├── index.ts              # Apollo Server entrypoint
│   ├── schema/
│   │   ├── typeDefs.ts       # GraphQL schema definitions
│   │   └── resolvers.ts      # Query resolvers
│   ├── db/
│   │   ├── connection.ts     # Database singleton with hot-reload detection
│   │   ├── types.ts          # TypeScript types mirroring DB schema
│   │   └── queries/          # SQL query functions by domain
│   │       ├── kpis.ts
│   │       ├── geographic.ts
│   │       ├── temporal.ts
│   │       ├── phaseDistribution.ts
│   │       ├── globalHealthArea.ts
│   │       ├── candidates.ts
│   │       └── lookups.ts
│   └── utils/
│       └── dataloader.ts     # DataLoader factories for N+1 prevention
├── tests/
│   ├── e2e/                         # API tests against static test DB
│   │   ├── dashboard.test.ts
│   │   ├── temporal.test.ts
│   │   ├── candidates.test.ts
│   │   └── nested-resolvers.test.ts
│   ├── unit/                        # Mocked business-logic tests
│   │   ├── db/queries/candidates.test.ts
│   │   └── schema/resolvers.test.ts
│   ├── helpers/
│   │   ├── graphql.ts               # Shared Apollo test client
│   │   └── types.ts                 # Shared response type definitions
│   └── star_schema.db               # Static DB snapshot for tests
├── docs/
│   └── FRONTEND_API_MAPPING.md    # Complete API reference for frontend
└── package.json
```

## Architecture

### Apollo Server 4 + better-sqlite3

Standard GraphQL server with synchronous SQLite access. SQLite is ideal for this read-only analytics workload: single-file deployment, zero network latency, and better-sqlite3 provides the fastest Node.js bindings.

### Hot-Reload Database Detection

The ETL process atomically swaps the database file (`new.db` -> `star_schema.db`). The `DatabaseManager` detects changes via inode/mtime checks on each request and reconnects automatically. No server restart required when ETL updates data.

```typescript
// src/db/connection.ts - simplified
class DatabaseManager {
  getConnection(): Database {
    const stat = fs.statSync(this.dbPath);
    const changed = stat.ino !== this.lastStat?.ino || stat.mtimeMs !== this.lastStat?.mtimeMs;
    if (changed) {
      this.db?.close();
      this.db = new Database(this.dbPath, { readonly: true });
    }
    return this.db;
  }
}
```

### DataLoader Pattern

Each GraphQL request receives fresh DataLoader instances via context. This prevents N+1 queries when resolving nested relationships (e.g., loading disease/phase/product for multiple candidates) while ensuring request isolation.

```typescript
// Fresh loaders per request
context: async () => ({
  loaders: createLoaders(),
})
```

### Query Modules by Domain

SQL queries are organized by dashboard visualization rather than by table. This keeps related logic together and makes it easy to modify a specific chart's data requirements.

| Module | Dashboard Component |
|--------|-------------------|
| `kpis.ts` | Three summary cards |
| `globalHealthArea.ts` | Bubble chart |
| `geographic.ts` | Choropleth map |
| `temporal.ts` | Cross-pipeline stacked bars |
| `phaseDistribution.ts` | Phase distribution bars |
| `candidates.ts` | Detail views and lists |
| `lookups.ts` | Filter dropdowns |

## API Reference

See **[docs/FRONTEND_API_MAPPING.md](docs/FRONTEND_API_MAPPING.md)** for complete query documentation with examples, response structures, and UI mapping guidance.

**Query categories:**
- KPIs: `portfolioKPIs`
- Geographic: `geographicDistribution`, `locationScopes`
- Temporal: `temporalSnapshots`, `availableYears`
- Phase distribution: `phaseDistribution`
- Scale of innovation: `globalHealthAreaSummaries`
- Filter dropdowns: `products`, `diseases`, `phases`, `countries`
- Candidate details: `candidates`, `candidate`

**Example query:**

```graphql
query Dashboard {
  portfolioKPIs {
    totalDiseases
    totalCandidates
    approvedProducts
  }
  globalHealthAreaSummaries {
    global_health_area
    candidateCount
  }
}
```

## Development Guide

### Adding a New Query

1. **Define the type** in `src/schema/typeDefs.ts`
2. **Add the resolver** in `src/schema/resolvers.ts`
3. **Implement the query** in appropriate `src/db/queries/*.ts` module

### Using DataLoaders for Nested Fields

When resolving relationships on a type (e.g., `DimCandidateCore.disease`), use the context loaders:

```typescript
// src/schema/resolvers.ts
DimCandidateCore: {
  disease: async (parent, _, ctx) => {
    const snapshot = await ctx.loaders.snapshotByCandidateLoader.load(parent.candidate_key);
    return snapshot?.disease_key
      ? ctx.loaders.diseaseLoader.load(snapshot.disease_key)
      : null;
  },
}
```

### Database Connection

All query modules import the singleton:

```typescript
import { getDatabase } from "../db/connection.js";

export function getPortfolioKPIs() {
  const db = getDatabase();
  return db.prepare(`SELECT ...`).get();
}
```

## Testing

| Command | Description | When to Use |
|---------|-------------|-------------|
| `npm run test` | Unit tests (mocked DB) | Fast iteration, CI |
| `npm run test:e2e` | E2E tests against static test DB | Verify API behaviour |
| `npm run test:all` | Both unit and E2E | Full verification |
| `npm run test:watch` | Watch mode | Active development |

**Unit tests** (`tests/unit/`) mock `getDatabase()` and test business logic in isolation — pagination capping, filter construction, resolver chaining.

**E2E tests** (`tests/e2e/`) run real GraphQL queries against a static snapshot of the database (`tests/star_schema.db`), so results are deterministic regardless of ETL refreshes.

## Code Quality

| Command | Description |
|---------|-------------|
| `npm run lint` | ESLint check |
| `npm run format:check` | Prettier check |
| `npm run check` | All checks (tsc + ESLint + Prettier) |
