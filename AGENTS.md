# Cereal API - Agent Guidelines

## Project Overview

**Cereal** is a license key management API for software products. It provides:

- Product/application registration and management
- License key generation and lifecycle management
- API key authentication for secure access
- OpenAPI/Swagger documentation

**Tech Stack**: Bun runtime, PostgreSQL database, Drizzle ORM, OpenAPI 3.1

**Database Schema**:

- `applications` - Software products that can be licensed
- `licenses` - License keys linked to products with optional expiration
- `api_keys` - API keys for authenticating requests

## Available API Routes

### Public Routes

- `GET /` - Redirects to `/health`
- `GET /health` - Health check with server uptime and version
- `GET /swagger` - Swagger UI documentation
- `GET /swagger.json` - OpenAPI specification

### Products (Authenticated)

- `POST /products/add` - Create new product (requires `id`, `name`)
- `POST /products/edit` - Update product (requires `id`, optional `name`)
- `POST /products/delete` - Delete product (requires `id`)

### Licenses (Authenticated)

- `POST /licenses/add` - Generate new license (requires `productId`, optional `expirationDate`)
- `POST /licenses/edit` - Update license (requires `key`, optional `productId`, `expirationDate`)
- `POST /licenses/delete` - Revoke license (requires `key`)

**Authentication**: All authenticated routes require `Authorization: Bearer <api-key>` header

## Project Structure

```
src/
├── config/         # Server configuration (port, environment)
├── db/             # Database connection and Drizzle schema definitions
├── db-data/        # Persistent database data (mounted to Docker volume)
├── middleware/     # Authentication and other middleware
├── routes/         # API route handlers (one file per resource)
└── templates/      # HTML/JS templates for Swagger UI

index.ts            # Main server entry point with route registration
swagger.ts          # OpenAPI specification
scripts/            # Utility scripts (API key creation, testing)
```

## Creating New API Routes

Follow this pattern when adding new endpoints:

### 1. Create Route Handler (`src/routes/<resource>.ts`)

```typescript
import { db } from "../db/index.ts";
import { myTable } from "../db/schema.ts";
import { eq } from "drizzle-orm";
import { authenticate } from "../middleware/auth.ts";

export async function handleMyResourceRequest(req: Request): Promise<Response> {
  const url = new URL(req.url);

  // Add authentication if needed
  if (!(await authenticate(req))) {
    return new Response("Unauthorized", { status: 401 });
  }

  // Check HTTP method
  if (req.method !== "POST") {
    return new Response("Method Not Allowed", { status: 405 });
  }

  try {
    const body: any = await req.json();

    // Route to specific sub-paths
    if (url.pathname === "/myresource/add") {
      // Validate required fields
      if (!body.field) {
        return new Response("Missing field", { status: 400 });
      }

      // Database operation
      await db.insert(myTable).values({ field: body.field });

      return Response.json({ success: true });
    }

    return new Response("Not Found", { status: 404 });
  } catch (error) {
    console.error("MyResource error:", error);
    return new Response("Internal Server Error", { status: 500 });
  }
}
```

### 2. Update Database Schema (if needed)

Edit `src/db/schema.ts`:

```typescript
export const myTable = pgTable("my_table", {
  id: text("id").primaryKey(),
  field: text("field").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
```

Then run:

```bash
bun run db:generate  # Generate migration
bun run db:push      # Apply to database
```

### 3. Register Route in `index.ts`

```typescript
import { handleMyResourceRequest } from "./src/routes/myresource.ts";

// Inside Bun.serve fetch handler:
if (url.pathname.startsWith("/myresource")) {
  return handleMyResourceRequest(req);
}
```

### 4. Update Swagger Spec (optional)

Add endpoint documentation in `swagger.ts` following existing patterns.

**Reference**: See `src/routes/products.ts` for a complete example.

## Environment Variables

Copy `.env.example` to `.env` and configure:

```bash
# Database configuration (used to build POSTGRES_URL)
POSTGRES_USER=postgres      # Database username
POSTGRES_PASSWORD=postgres  # Database password
POSTGRES_DB=cereal         # Database name

# Server configuration
PORT=3000                  # Server port (default: 3000)
NODE_ENV=production        # Environment: development | production

# Full connection string (automatically constructed if not set)
POSTGRES_URL=postgres://user:pass@localhost:5432/cereal
```

**Note**: Bun automatically loads `.env` files - no need for dotenv package.

## Authentication Flow

### Creating API Keys

Run the interactive script:

```bash
bun run scripts/create-api-key.ts
```

This will:

1. Prompt for an optional key name
2. Prompt for an optional expiration date (YYYY-MM-DD)
3. Generate a UUID as the API key
4. Store it in the `api_keys` table
5. Display the key (save it - it won't be shown again)

### Using API Keys

Include the API key in the `Authorization` header:

```bash
curl -H "Authorization: Bearer YOUR-API-KEY-HERE" \
     -X POST http://localhost:3000/products/add \
     -d '{"id":"myapp","name":"My App"}'
```

### How Authentication Works

1. Request arrives with `Authorization: Bearer <key>` header
2. `authenticate()` middleware extracts the key
3. Looks up key in `api_keys` table
4. Checks if key exists and hasn't expired
5. Returns `true` (authenticated) or `false` (rejected)

See `src/middleware/auth.ts` for implementation details.

## Build, Lint, and Test Commands

### Development

```bash
bun start              # Run production server
bun run dev            # Run with watch mode (auto-restart)
bun run index.ts       # Run directly
```

### Code Quality

```bash
bun run lint           # Check for linting issues
bun run lint:fix       # Auto-fix linting issues
bun run format         # Format all files with Prettier
bun run format:check   # Check if files are formatted
```

### Database

```bash
bun run db:generate    # Generate Drizzle migrations from schema
bun run db:push        # Push schema changes to database
```

### Testing

```bash
bun test               # Run all tests
bun test <file>        # Run specific test file (e.g., bun test src/tests/products.test.ts)
bun test --watch       # Watch mode
```

**Test Organization**: Use `describe` blocks to group related tests, and `beforeEach` for setup.

**Note**: When adding tests, use `bun:test` framework (see Bun policy below).

## Git Hooks & Automation

This project uses **Husky** and **lint-staged** to automatically enforce code quality standards before every commit.

- **Pre-commit hook**: Runs `bunx lint-staged` on staged files
  - TypeScript/JavaScript files (`*.{ts,tsx,js,jsx}`): `eslint --fix` → `prettier --write`
  - All other files (`*`): `prettier --write --ignore-unknown`

**Important for commits:**

- Files may be auto-modified by the pre-commit hook (eslint --fix, prettier)
- If commit SUCCEEDS but hook auto-modified files that need including, you may amend
- If commit FAILS or is REJECTED by hook, NEVER amend - fix the issue and create a NEW commit
- NEVER skip hooks (--no-verify, --no-gpg-sign, etc) unless the user explicitly requests it

**Configuration**: `package.json` → `lint-staged`

## Code Style Guidelines

### Imports

- **Use inline type imports**: `import { type User } from "./types.ts"` (enforced by ESLint)
- **Import order** (with newlines between groups, enforced by ESLint):
  1. Built-in imports (Node.js/Bun)
  2. External packages
  3. Internal absolute imports
  4. Relative imports (parent/sibling)
  5. Type imports
- **Alphabetize** within each group (enforced by ESLint)
- **Include `.ts` extension** for local imports
- **No duplicate imports** (enforced by ESLint)

Example:

```typescript
import { eq } from "drizzle-orm";

import { db } from "../db/index.ts";
import { applications } from "../db/schema.ts";
import { authenticate } from "../middleware/auth.ts";
```

### Formatting (Prettier)

- **Quotes**: Double quotes for strings
- **Semicolons**: Required
- **Trailing commas**: Always in multiline
- **Indentation**: 2 spaces (no tabs)
- **Line width**: 80 characters
- **Arrow parens**: Always use parentheses

### TypeScript

- **Strict mode enabled** - all strict checks are on
- **No `any` types** - Use proper types or `unknown` (enforced by ESLint)
- **Indexed access safety** - Array/object access can be undefined (`noUncheckedIndexedAccess`)
- **Prefer `const` over `let`**, never use `var` (enforced by ESLint)
- **No explicit return types** for internal functions (type inference preferred)
- **Unused vars**: Prefix with `_` if intentionally unused
- **Object shorthand**: Use shorthand syntax for object properties (enforced by ESLint)
- **Template literals**: Prefer template literals over string concatenation (enforced by ESLint)
- **Object destructuring**: Prefer destructuring for objects, not arrays (enforced by ESLint)

### Naming Conventions

- **camelCase**: variables, functions, parameters (`userId`, `handleRequest`)
- **PascalCase**: types, interfaces, classes (`User`, `RequestHandler`)
- **UPPER_SNAKE_CASE**: constants (`MAX_RETRIES`, `API_VERSION`)
- **File names**: kebab-case or camelCase (`api-routes.ts`, `userHandler.ts`)

### Error Handling

Always wrap route handlers in try-catch:

```typescript
try {
  // Route logic here
  return Response.json({ success: true });
} catch (error) {
  console.error("Descriptive context:", error);
  return new Response("Internal Server Error", { status: 500 });
}
```

**HTTP Status Codes**:

- `200` - Success
- `400` - Bad Request (missing/invalid parameters)
- `401` - Unauthorized (authentication failed)
- `404` - Not Found
- `405` - Method Not Allowed
- `500` - Internal Server Error

### Database Patterns (Drizzle ORM)

```typescript
import { db } from "../db/index.ts";
import { myTable } from "../db/schema.ts";
import { eq } from "drizzle-orm";

// Insert
await db.insert(myTable).values({ id: "123", name: "Test" });

// Select single record (note destructuring)
const [record] = await db
  .select()
  .from(myTable)
  .where(eq(myTable.id, "123"))
  .limit(1);

// Update
await db.update(myTable).set({ name: "Updated" }).where(eq(myTable.id, "123"));

// Delete
await db.delete(myTable).where(eq(myTable.id, "123"));
```

**Always use `.limit(1)` for single record queries.**

### API Response Patterns

```typescript
// Simple JSON response
return Response.json({ data: "value" });

// With custom headers
return new Response(JSON.stringify(data), {
  headers: { "Content-Type": "application/json" },
});

// Serve static files
const file = Bun.file("./path/to/file.html");
return new Response(file, {
  headers: { "Content-Type": "text/html" },
});

// Redirect
return new Response(null, {
  status: 308,
  headers: { Location: "/new-path" },
});
```

## Policy on Bun

Default to using Bun instead of Node.js. For more information on Bun,
read the Bun API docs in `node_modules/bun-types/docs/**.mdx`.

- Use `bun <file>` instead of `node <file>` or `ts-node <file>`
- Use `bun test` instead of `jest` or `vitest`
- Use `bun build <file.html|file.ts|file.css>` instead of `webpack` or `esbuild`
- Use `bun install` instead of `npm install` or `yarn install` or `pnpm install`
- Use `bun run <script>` instead of `npm run <script>` or `yarn run <script>` or `pnpm run <script>`
- Use `bunx <package> <command>` instead of `npx <package> <command>`
- Bun automatically loads .env, so don't use dotenv.

### APIs

- `Bun.serve()` supports WebSockets, HTTPS, and routes. Don't use `express`.
- `bun:sqlite` for SQLite. Don't use `better-sqlite3`.
- `Bun.redis` for Redis. Don't use `ioredis`.
- `Bun.sql` for Postgres. Don't use `pg` or `postgres.js`.
- `WebSocket` is built-in. Don't use `ws`.
- Prefer `Bun.file` over `node:fs`'s readFile/writeFile
- Bun.$`ls` instead of execa.

### Testing

Use `bun test` to run tests.

```ts
import { test, expect } from "bun:test";

test("hello world", () => {
  expect(1).toBe(1);
});
```

**Organizing Tests with `describe` and `beforeEach`**:

```ts
import { describe, expect, test, mock, beforeEach } from "bun:test";

describe("Products Endpoints", () => {
  beforeEach(() => {
    // Setup code that runs before each test
    mockInsert.mockClear();
  });

  test("POST /products/add should create a product", async () => {
    const req = new Request("http://localhost/products/add", {
      method: "POST",
      body: JSON.stringify({ id: "prod_123", name: "Test" }),
    });

    const res = await handleProductsRequest(req);
    expect(res.status).toBe(200);
  });
});
```

**Mocking Modules**:

```ts
// Mock authentication
mock.module("../middleware/auth.ts", () => ({
  authenticate: () => Promise.resolve(true),
}));

// Mock database
const mockInsert = mock(() => ({ values: () => Promise.resolve() }));

mock.module("../db/index.ts", () => ({
  db: {
    insert: mockInsert,
    update: mockUpdate,
    delete: mockDelete,
  },
}));
```
