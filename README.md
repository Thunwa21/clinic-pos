# Clinic POS

Multi-tenant Point of Sale system for clinics.

## Architecture

```
┌─────────────┐     ┌──────────────┐     ┌────────────┐
│  Next.js 16  │────▶│  .NET 10 API │────▶│ PostgreSQL  │
│  (Frontend)  │     │  (Backend)   │────▶│   Redis     │
│  Port 3001   │     │  Port 5001   │────▶│  RabbitMQ   │
└─────────────┘     └──────────────┘     └────────────┘
```

| Layer | Technology | Purpose |
|-------|-----------|---------|
| Frontend | Next.js 16 (App Router, TypeScript, Tailwind) | Login, branch selection, patient management UI |
| Backend | .NET 10 Web API | REST API, JWT auth, business logic |
| Database | PostgreSQL 17 | Persistent data storage |
| Cache | Redis 7 | GET /patients response caching (5 min TTL) |
| Message Broker | RabbitMQ 4 | Event bus (wired, not yet consumed) |

### Entity Relationships

```
Tenant (1) ──▶ (N) Branch
Tenant (1) ──▶ (N) Patient
Tenant (1) ──▶ (N) User
User   (N) ◀──▶ (N) Branch   (via UserBranch junction table)
Patient (N) ──▶ (0..1) Branch  (optional PrimaryBranchId)
```

### Project Structure

```
clinic-pos/
├── src/
│   ├── backend/
│   │   ├── ClinicPos.Api/
│   │   │   ├── Controllers/         # Auth, Patients, Branches
│   │   │   ├── Application/         # DTOs (AuthDtos, PatientDtos)
│   │   │   ├── Domain/Entities/     # Patient, User, Tenant, Branch, UserBranch
│   │   │   └── Infrastructure/
│   │   │       ├── ITenantContext.cs # Scoped tenant resolver from JWT
│   │   │       └── Data/            # DbContext, Seeder, Migrations
│   │   └── ClinicPos.Tests/         # xUnit integration tests
│   └── frontend/
│       └── src/
│           ├── app/                  # Pages (login, dashboard, patients)
│           ├── components/           # UI components, layout, patient modules
│           └── lib/                  # API client, auth helpers, types
├── docker-compose.yml
├── .env / .env.example
├── EXECUTION_PLAN.md
└── AI_PROMPTS.md
```

## Tenant Isolation Strategy (Section E2)

Every data operation is scoped to a tenant. Isolation is enforced at multiple layers:

### How TenantId is Derived

1. **Login** — User enters a short **Tenant Code** (e.g. `AURA`) along with username and password. The server validates the user belongs to that tenant before issuing a JWT.
2. **JWT Claims** — `TenantId` is embedded in the JWT token along with `UserId`, `Role`, and `BranchIds`.
3. **ITenantContext (DI)** — A scoped service `HttpTenantContext` extracts `TenantId` from the current HTTP request's JWT claims. Injected into controllers and DbContext via DI.

### How TenantId is Enforced in the Data Access Layer

**EF Core Global Query Filters:**

```csharp
// In ClinicPosDbContext.OnModelCreating:
entity.HasQueryFilter(p => _currentTenantId == null || p.TenantId == _currentTenantId);
```

- DbContext receives `ITenantContext` via constructor injection
- Global query filter is applied to `Patient` entity
- ALL queries automatically include `WHERE TenantId = @currentTenantId`
- Even if a developer forgets to filter, EF Core enforces it

**Write-side enforcement:**

- On Create, the server sets `TenantId` from `ITenantContext` (ignores client-supplied value)
- If a referenced `BranchId` doesn't belong to the current tenant, the request is rejected with 400

### How We Prevent Accidental Missing Filters

1. **EF Core Global Query Filters** — automatic, cannot be bypassed without explicit `.IgnoreQueryFilters()`
2. **ITenantContext as required DI** — if TenantId is not resolvable (no JWT), the request fails early
3. **No raw SQL** — all queries go through EF Core, which enforces the filter
4. **Unique Constraints** — Phone number uniqueness is scoped per tenant: `UNIQUE(TenantId, PhoneNumber)`
5. **Cache Scoping** — Cache keys include tenant ID: `tenant:{tenantId}:patients:list:{branchId|all}`
6. **Integration tests** — verify Tenant A cannot see Tenant B's data

## Caching Strategy (Section D)

| Aspect | Implementation |
|--------|---------------|
| Technology | Redis 7 via `IDistributedCache` |
| Scope | GET /patients per tenant + branch combination |
| Key Format | `tenant:{tenantId}:patients:list:{branchId\|all}` |
| TTL | 5 minutes |
| Invalidation | On POST /patients — delete "all" key + branch-specific key |

## Trade-offs

| Decision | Rationale |
|----------|-----------|
| Single DB, shared schema (row-level isolation) | Simplest for v1; can migrate to schema-per-tenant later |
| Global query filter can be bypassed with `.IgnoreQueryFilters()` | Acceptable risk with code review |
| Monolith API (not microservices) | Simplicity — correct boundaries over premature decomposition |
| JWT in sessionStorage | Simple for demo; production should use httpOnly cookies |
| PBKDF2-SHA256 (100k iterations) | Standard password hashing; BCrypt/Argon2 are alternatives |
| CORS AllowAnyOrigin | Development convenience; restrict in production |
| RabbitMQ wired but unused | Infrastructure ready for future event-driven features |
| SQLite for tests, PostgreSQL for prod | Fast tests without Docker dependency |
| Cache TTL 5 min | Balance between freshness and DB load; invalidated on writes |

## How to Run

### Prerequisites
- Docker & Docker Compose

### One Command

```bash
docker compose up --build
```

### Access

| Service | URL |
|---------|-----|
| Frontend | http://localhost:3001 |
| Backend API | http://localhost:5001 |
| Health Check | http://localhost:5001/health |
| RabbitMQ UI | http://localhost:15672 (guest/guest) |

## Seeded Users

The system auto-seeds on first startup:

### Tenant 1 — Aura Clinic Bangkok (Code: `AURA`)

**Branches:** Siam Branch, Thonglor Branch

| Username | Password | Role | Branches |
|----------|----------|------|----------|
| admin@aura | Admin123! | Admin | Siam Branch, Thonglor Branch |
| user@aura | User123! | User | Siam Branch |
| viewer@aura | Viewer123! | Viewer | Thonglor Branch |

### Tenant 2 — Clinic Silom (Code: `SLM`)

**Branches:** Silom Main, Sathorn Branch

| Username | Password | Role | Branches |
|----------|----------|------|----------|
| admin@silom | Admin123! | Admin | Silom Main, Sathorn Branch |

### Roles & Permissions

| Action | Admin | User | Viewer |
|--------|-------|------|--------|
| Create Patient | Yes | Yes | No |
| View Patients | Yes | Yes | Yes |
| Create User | Yes | No | No |
| Assign Role | Yes | No | No |

### Login Flow

1. Enter **Clinic Code** (text input, e.g. `AURA`) + Username + Password
2. If user has **multiple branches** → Select Branch screen appears
3. If user has **single branch** → auto-selected, redirects to Dashboard

## API Examples

### Login

```bash
curl -X POST http://localhost:5001/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin@aura","password":"Admin123!","tenantCode":"AURA"}'
```

Response includes `token`, `fullName`, `role`, `tenantId`, `branches[]`.

### List branches (authenticated)

```bash
curl http://localhost:5001/branches \
  -H "Authorization: Bearer $TOKEN"
```

### Create patient (Admin/User only)

```bash
curl -X POST http://localhost:5001/patients \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"firstName":"John","lastName":"Doe","phoneNumber":"0812345678","primaryBranchId":"aaaa0000-0000-0000-0000-000000000001"}'
```

### List patients

```bash
curl http://localhost:5001/patients \
  -H "Authorization: Bearer $TOKEN"
```

### Filter patients by branch

```bash
curl "http://localhost:5001/patients?branchId=aaaa0000-0000-0000-0000-000000000001" \
  -H "Authorization: Bearer $TOKEN"
```

### Create user (Admin only)

```bash
curl -X POST http://localhost:5001/auth/users \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"username":"newuser","password":"Pass123!","fullName":"New User","role":"User","branchIds":["aaaa0000-0000-0000-0000-000000000001"]}'
```

## How to Run Tests

```bash
cd src/backend
dotnet test ClinicPos.Tests
```

Tests use SQLite in-memory (no Docker required). 4 integration tests:

1. **Tenant isolation** — Tenant 1 patient invisible to Tenant 2
2. **Duplicate phone** — Same phone in same tenant returns 409
3. **Unauthenticated** — No token returns 401
4. **Viewer restriction** — Viewer role cannot create patient (403)
