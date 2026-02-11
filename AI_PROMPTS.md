# AI Prompts Log

Prompts used during development of Clinic POS.

Tool: **Claude Code CLI** (Claude Opus 4.6)

## Development Flow

All steps were executed via Claude Code CLI in a single continuous session. Each step followed the `EXECUTION_PLAN.md` and was prompted by the developer with brief Thai-language instructions.

## Step 2 — Backend Scaffold

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

**Validation:** All 5 services started, `curl /health` returned "Healthy".

## Step 5 — Core Slice: Patients

**Prompt:** "ต่อ Step 5 ได้เลย"

**Iterations:**
- Created Patient entity, DTOs, controller, migration.
- Docker wasn't picking up code changes because no `.dockerignore` existed (bin/obj bloated context). Added `.dockerignore`, rebuilt with `--no-cache`.
- Tested: POST 201, duplicate 409, GET with tenant/branch filter, sort order.

**Validation:** All CRUD operations verified via curl.

## Frontend POST/GET

**Prompt:** "ทำเลย ฉันต้องการมอง ui ด้วย" (Do it, I want to see the UI)

**Iterations:**
- `.env.local` had wrong port (5000 instead of 5001). Fixed.
- Added CORS `AllowAnyOrigin` to backend.
- Built patients page with create form and data table.

**Validation:** UI tested in browser at localhost:3001.

## Step 6 — Authorization + Roles

**Prompt:** "ทำเลย Stubbing auth is acceptable only if permissions are still enforced reliably"

**Iterations:**
- Created User entity, JWT auth, policy-based authorization.
- Admin bootstrap chicken-and-egg problem: no admin user existed to call assign-role endpoint. Resolved by direct DB UPDATE, later replaced by seeder.
- Updated PatientsController to extract TenantId from JWT claims instead of request body.
- Updated frontend with login page and auth-gated patients page.

**Validation:** Tested all role scenarios: Admin 201, User 201, Viewer 403, unauthenticated 401.

## Step 7 — Seeder

**Prompt:** "ต่อ step 7 ได้เลย"

**Iterations:**
- Created idempotent seeder (checks if "admin" exists).
- Initially 1 tenant / 3 users.
- Developer asked about multi-tenant testing: "user ผูกกับ tenant ใช่ไหม หากมี 2 tenant จะทดสอบยังไง"
- Expanded to 2 tenants / 6 users. Verified tenant isolation via curl.

**Validation:** Clean deploy (down -v, up) confirmed seeder runs correctly.

## Tenant Selection at Login

**Prompt:** "ฉันอยากให้ตอน login ให้ระบุ tenant ด้วย และ tenant ฉันอยากให้สั้นลงเพื่อให้กรอกได้ง่าย"

**Iterations:**
- Created Tenant entity with short `Code` field (SKV, SLM).
- Added `GET /auth/tenants` public endpoint.
- Updated login to require and validate `tenantCode`.
- Frontend shows dropdown fetched from API.

**Validation:** admin+SKV succeeds, admin2+SKV rejected, admin2+SLM succeeds.

## Step 8 — Caching

**Prompt:** "ทำเลย" (Do it)

**Iterations:**
- Added `IDistributedCache` to PatientsController.
- Cache key: `tenant:{tenantId}:patients:list:{branchId|all}`, TTL 5 min.
- POST invalidates both "all" and branch-specific keys.

**Validation:** Verified full cycle via Redis CLI: GET (miss) → key stored → POST (key removed) → GET (miss, re-cached).

## Step 9 — Tests

**Prompt:** "ต่อ 9"

**Iterations:**
- Created xUnit test project with WebApplicationFactory.
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

## Step 10 — Documentation

**Prompt:** "ทำเลย"

- Created README.md with architecture, tenant isolation, trade-offs, how to run, seeded users, API examples, test instructions.
- Created this AI_PROMPTS.md.

## Summary

| Metric | Value |
|--------|-------|
| Total steps | 10 (+ tenant selection enhancement) |
| AI-assisted iterations | ~30 prompt-response cycles |
| Major blockers resolved | Port conflicts, Docker cache, EF Core provider swaps, SQLite compatibility |
| Test coverage | 4 integration tests covering tenant isolation, uniqueness, auth, and authorization |
