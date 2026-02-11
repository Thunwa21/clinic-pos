# AI Prompts Log

Prompts used during development of Clinic POS.

Tool: **Claude Code CLI** (Claude Opus 4.6)

## Development Flow

All steps were executed via Claude Code CLI across multiple sessions. Each step followed the `EXECUTION_PLAN.md` and was prompted by the developer with brief Thai-language instructions. Steps were occasionally reordered or merged for efficiency.

---

## Step 1–2 — Project Structure & Backend Scaffold

**Prompt:** Provided a detailed plan for .NET 10 Web API scaffold including folder structure, NuGet packages, Program.cs configuration, and Dockerfile.

**Iterations:**

- Initial `dotnet new webapi` succeeded
- NuGet version mismatch: `Microsoft.EntityFrameworkCore` resolved to `10.0.0-preview` instead of `10.0.3`. Fixed by specifying explicit version.
- `.slnx` format: .NET 10 uses new solution format instead of `.sln`. Adapted accordingly.

**Validation:** `dotnet build` succeeded.

## Step 3 — Frontend Scaffold

**Prompt:** "ต่อ Step 3 ได้เลย" (Continue to Step 3)

**Iterations:**

- `create-next-app` had an interactive prompt for React Compiler that blocked automation. Fixed by piping `echo "No"` to stdin.
- Removed nested `.git` directory created by create-next-app.

**Validation:** `npm run build` succeeded, Dockerfile built.

## Step 4 — Docker Compose

**Prompt:** "ต่อ Step 4 ได้เลย"

**Iterations:**

- Port 5000 was already in use on host. Remapped backend to `5001:5000`.
- Port 3000 was already in use on host. Remapped frontend to `3001:3000`.

**Validation:** All 5 services started (postgres, redis, rabbitmq, backend, frontend). `curl /health` returned "Healthy".

## Step 5–6 — Domain Model & Patients CRUD

**Prompt:** "ต่อ Step 5 ได้เลย"

**Iterations:**

- Created Tenant, Branch, Patient, User, UserBranch entities with full FK relationships.
- Created DTOs, PatientsController, EF migration.
- Docker wasn't picking up code changes because no `.dockerignore` existed (bin/obj bloated context). Added `.dockerignore`, rebuilt with `--no-cache`.
- Tested: POST 201, duplicate phone 409, GET with tenant/branch filter, sort by CreatedAt DESC.

**Validation:** All CRUD operations verified via curl.

## Step 7 — Authorization + Roles

**Prompt:** "ทำเลย Stubbing auth is acceptable only if permissions are still enforced reliably"

**Iterations:**

- Created User entity, JWT auth (PBKDF2-SHA256, 100k iterations), policy-based authorization.
- Admin bootstrap chicken-and-egg problem: no admin user existed to call assign-role endpoint. Resolved by direct DB UPDATE, later replaced by seeder.
- Created `ITenantContext` (scoped DI service) to extract TenantId from JWT claims.
- Applied EF Core Global Query Filter on Patient entity for automatic tenant isolation.
- Updated PatientsController to use `ITenantContext` instead of request body for TenantId.
- Created AuthController with login, register, user management (create user, assign role, add branches).
- Created BranchesController for listing tenant branches.
- Updated frontend with login page and auth-gated patients page.

**Validation:** Tested all role scenarios: Admin 201, User 201, Viewer 403, unauthenticated 401.

## Step 8 — Seeder

**Prompt:** "ต่อ step 8 ได้เลย"

**Iterations:**

- Created idempotent seeder (checks if `admin@aura` exists before seeding).
- Developer asked about multi-tenant testing: "user ผูกกับ tenant ใช่ไหม หากมี 2 tenant จะทดสอบยังไง"
- Final seed data:
  - **Tenant 1** — Aura Clinic Bangkok (Code: `AURA`), 2 branches (Siam, Thonglor), 3 users (`admin@aura`, `user@aura`, `viewer@aura`)
  - **Tenant 2** — Clinic Silom (Code: `SLM`), 2 branches (Silom Main, Sathorn), 1 user (`admin@silom`)
  - 3 sample patients with Thai names assigned to Tenant 1
- Developer requirement: Tenant Code should be short for easy input (e.g. `AURA`, `SLM`).
- Login requires tenantCode + username + password. System validates user belongs to that tenant.

**Validation:** Clean deploy (`docker compose down -v && docker compose up --build`) confirmed seeder runs correctly. Cross-tenant isolation verified via curl.

## Step 9 — Caching (Section D)

**Prompt:** "ทำเลย" (Do it)

**Iterations:**

- Added `IDistributedCache` (Redis) to PatientsController.
- Cache key: `tenant:{tenantId}:patients:list:{branchId|all}`, TTL 5 min.
- POST invalidates both "all" and branch-specific keys.

**Validation:** Verified full cycle via Redis CLI: GET (miss) → key stored → POST (key removed) → GET (miss, re-cached).

## Step 10 — Tenant Isolation Strategy (Section E2)

Documented in README.md:

- How TenantId is derived (JWT claims → `ITenantContext`)
- EF Core Global Query Filter enforcement
- Write-side enforcement (server sets TenantId, validates BranchId belongs to tenant)
- Prevention strategies (no raw SQL, DI required, integration tests)
- Trade-offs (single DB shared schema, row-level isolation)

## Step 11 — Tests

**Prompt:** "ต่อ step 11"

**Iterations:**

- Created xUnit test project with `WebApplicationFactory<Program>`.
- Swapped PostgreSQL for SQLite in-memory, Redis for MemoryCache.
- Multiple issues resolved:
  1. Dual EF Core provider registration — removed all Npgsql descriptors before adding SQLite.
  2. HealthCheck service dependency chain broken — re-added `AddHealthChecks()` after removing external checks.
  3. `HasDefaultValueSql("gen_random_uuid()")` not supported by SQLite — moved defaults to C# entity constructors.
  4. PendingModelChangesWarning — created migration to sync model after removing SQL defaults.
  5. SQLite in-memory DB per-connection isolation — used shared named DB + keep-alive connection.
  6. SQLite unique constraint error message differs from PostgreSQL — added "UNIQUE constraint failed" to catch clause.

**Accepted outputs:** All 4 tests passing.
**Rejected/fixed outputs:** 6 iterations needed to get WebApplicationFactory working with SQLite.

**Validation:** `dotnet test` — 4 passed, 0 failed.

## Step 12 — Documentation

- Created README.md: architecture overview, entity relationships, tenant isolation strategy (E2), caching strategy (D), trade-offs, how to run, seeded users with branches, login flow, API examples, test instructions.
- Created this AI_PROMPTS.md.

## Step 13 — UI Generation

**Prompt:** "ทำเลย ฉันต้องการมอง ui ด้วย" (Do it, I want to see the UI)

Built full Next.js frontend following the Aura Clinic design system:

**Layout:**
- Sidebar with navigation (Dashboard, Patients, + coming soon stubs)
- Top navbar with user info, role badge, branch selector
- Protected routes via auth check in admin layout

**Login page:**
- Tenant Code text input (not dropdown — each clinic should not see other tenant codes)
- Username + Password fields
- Two-step flow: after login, if user has multiple branches → branch selection step appears
- Single branch → auto-selected, redirect to dashboard

**Patient module:**
- Patient list page with search + branch filter dropdown
- Patient table showing name, phone, branch name (resolved from ID), created date
- Create patient modal with Primary Branch dropdown (optional)
- Role-based visibility: Viewer sees warning banner, no Add button

**Components:** Button, Input, Select, Modal, Card, Badge, SearchInput

**Iterations:**
- `.env.local` had wrong port (5000 instead of 5001). Fixed.
- Added CORS `AllowAnyOrigin` to backend for development.
- Docker build cached stale frontend image despite code changes. Fixed with `docker compose build --no-cache frontend` + `--force-recreate`.

**Validation:** `next build` succeeded. Docker compose up — all services running. Tested login flow, branch selection, patient CRUD via browser at localhost:3001.

---

## Summary

| Metric                  | Value                                                                              |
| ----------------------- | ---------------------------------------------------------------------------------- |
| Total steps             | 13 (per EXECUTION_PLAN.md)                                                         |
| AI-assisted iterations  | ~35 prompt-response cycles                                                         |
| Major blockers resolved | Port conflicts, Docker cache, EF Core provider swaps, SQLite compatibility, NuGet versions |
| Test coverage           | 4 integration tests covering tenant isolation, uniqueness, auth, and authorization |
| Sections delivered      | A (Core slice), B (Auth & user mgmt), D (Caching), E2 (Tenant isolation)          |

## AI Usage Philosophy

AI was used as a productivity multiplier, not a decision-maker.

All architectural boundaries, tenant isolation rules,
and permission enforcement logic were manually reviewed
and validated.

AI-generated outputs were frequently incorrect in:

- Cross-provider EF configuration (PostgreSQL vs SQLite)
- Test host configuration (WebApplicationFactory service overrides)
- Migration consistency after model changes
- Docker layer caching behavior

Human review and iterative refinement were required
to reach a stable, production-like result.
