# Clinic POS – Execution Plan

AI-Assisted Build Strategy (Claude CLI)

Goal:
Deliver a thin, tenant-safe vertical slice that runs with:
docker compose up --build

Scope:

- Section A (Core slice) — mandatory
- Section B (Authorization & user management) — mandatory
- Section D (Caching & data access) — chosen
- Section E2 (Tenant isolation strategy) — chosen

DO NOT over-engineer.
Correct boundaries > feature count.

---

## STEP 1 — Project Structure (5 minutes)

Create this structure:

```
/src
  /backend
  /frontend
docker-compose.yml
.env.example
README.md
AI_PROMPTS.md
```

Command example:

```bash
mkdir clinic-pos
cd clinic-pos
mkdir -p src/backend
mkdir -p src/frontend
touch docker-compose.yml .env.example README.md AI_PROMPTS.md
```

---

## STEP 2 — Backend Scaffold (.NET 10) (10 minutes)

Use Claude to generate:

- .NET 10 Web API
- EF Core + PostgreSQL
- Redis client
- Dockerfile
- Folder structure:
  Controllers/
  Application/
  Domain/
  Infrastructure/
- Health check endpoint
- Basic DbContext
- Appsettings via env

DO NOT implement business logic yet.

---

## STEP 3 — Frontend Scaffold (Next.js) (10 minutes)

Generate:

- Latest Next.js app (App Router)
- /patients page (empty placeholder)
- API base URL via env
- Dockerfile

Keep minimal.

---

## STEP 4 — Docker Compose (10 minutes)

Services:

- postgres
- redis
- rabbitmq (included for infrastructure completeness, not actively used in chosen sections)
- backend
- frontend

Requirements:

- backend depends_on postgres, redis
- expose:
  - postgres 5432
  - redis 6379
  - rabbitmq 5672, 15672 (optional, for future use)
  - backend 5000
  - frontend 3000
- env via .env
- one command: `docker compose up --build`

Test that everything boots.

---

## STEP 5 — Domain Model & Database (15 minutes)

### Entity Definitions

**Tenant:**

- Id (Guid, PK)
- Name (string, required)
- CreatedAt (DateTime, server-generated)

**Branch:**

- Id (Guid, PK)
- TenantId (Guid, FK → Tenant, required)
- Name (string, required)
- Address (string, optional)
- PhoneNumber (string, optional)
- CreatedAt (DateTime, server-generated)

**Patient:**

- Id (Guid, PK)
- TenantId (Guid, FK → Tenant, required)
- FirstName (string, required)
- LastName (string, required)
- PhoneNumber (string, required)
- PrimaryBranchId (Guid?, FK → Branch, optional)
- CreatedAt (DateTime, server-generated)

Design note on patient–branch relationship:
Using PrimaryBranchId (nullable FK) instead of a separate mapping table.
Reason: For v1 this is sufficient. A patient "belongs" to a primary branch but
can visit any branch within the Tenant. If multi-branch visit tracking is needed
later, a PatientBranchVisit junction table can be added without breaking the
current model.

**User:**

- Id (Guid, PK)
- TenantId (Guid, FK → Tenant, required)
- Username (string, required, unique globally)
- PasswordHash (string, required)
- FullName (string, required)
- Role (enum: Admin, User, Viewer)
- CreatedAt (DateTime, server-generated)

**UserBranch (junction table — User ↔ Branch):**

- Id (Guid, PK)
- UserId (Guid, FK → User, required)
- BranchId (Guid, FK → Branch, required)
- Composite unique index on (UserId, BranchId)

A User belongs to 1 Tenant and is associated with 1 or more Branches.
Role is at the Tenant level (not per-branch).

### Database Constraints

- Patient: Composite unique index on (TenantId, PhoneNumber)
- Branch: TenantId FK to Tenant
- User: TenantId FK to Tenant
- UserBranch: UserId FK to User, BranchId FK to Branch
- UserBranch: Composite unique index on (UserId, BranchId)

### Migrations

- Auto-applied on startup via `context.Database.Migrate()`

---

## STEP 6 — Core Slice: Patients (15 minutes)

### Endpoints

**POST /api/patients**

- Body: { firstName, lastName, phoneNumber, tenantId, primaryBranchId? }
- TenantId is validated against the authenticated user's TenantId (cannot create patient in another tenant)
- Returns 201 with created patient
- Returns 409 on duplicate phone within tenant

**GET /api/patients?tenantId={tenantId}&branchId={branchId}**

- Required filter: TenantId (enforced from JWT claims, not query param in production — but for v1, accept from query and validate against claims)
- Optional filter: BranchId (filter by PrimaryBranchId)
- Sorted by CreatedAt DESC
- TenantId in query must match authenticated user's TenantId

### Rules

- Phone unique within Tenant (DB constraint + friendly 409 error)
- ALL reads/writes must include TenantId filter
- Return safe, structured error on duplicate

---

## STEP 7 — Authorization + Roles (15 minutes)

### Roles (enum)

- Admin — full access
- User — can create and view patients
- Viewer — can only view patients

### Permission Matrix

| Action             | Admin | User | Viewer |
| ------------------ | ----- | ---- | ------ |
| Create Patient     | ✅    | ✅   | ❌     |
| View Patients      | ✅    | ✅   | ✅     |
| Create Appointment | ✅    | ✅   | ❌     |
| Create User        | ✅    | ❌   | ❌     |
| Assign Role        | ✅    | ❌   | ❌     |

### Implementation

- Simple JWT-based auth
- Login endpoint: POST /api/auth/login (username + password → JWT)
- JWT claims: UserId, TenantId, Role, BranchIds (comma-separated)
- Policy-based authorization middleware
- TenantId extracted from JWT claims, NOT from request body/query for enforcement
- Server-side enforcement: middleware checks Role against required permission before controller executes

### Endpoints

**POST /api/auth/login**

- Body: { username, password }
- Returns: { token, user: { id, username, role, tenantId, branches } }

**POST /api/users** (Admin only)

- Body: { username, password, fullName, role, tenantId, branchIds[] }
- Creates user with tenant and branch associations

**PUT /api/users/{userId}/role** (Admin only)

- Body: { role }
- Updates user's role

**POST /api/users/{userId}/branches** (Admin only)

- Body: { branchIds[] }
- Associates user with additional branches

### Enforcement Rules

- Every API request (except login) must include Authorization: Bearer {token}
- TenantId from token is used for all data filtering
- Viewer role cannot call POST /api/patients (returns 403)
- User cannot call POST /api/users or PUT /api/users/{id}/role (returns 403)

---

## STEP 8 — Seeder (5 minutes)

Seeder auto-runs on startup (or via command) and creates:

### Seed Data

**1 Tenant:**

- Name: "Aura Clinic Bangkok"

**2 Branches:**

- Branch 1: "Siam Branch" (TenantId = above)
- Branch 2: "Thonglor Branch" (TenantId = above)

**3 Users:**

| Username    | Password   | Role   | Branches                     |
| ----------- | ---------- | ------ | ---------------------------- |
| admin@aura  | Admin123!  | Admin  | Siam Branch, Thonglor Branch |
| user@aura   | User123!   | User   | Siam Branch                  |
| viewer@aura | Viewer123! | Viewer | Thonglor Branch              |

**Sample Patients (optional, for demo):**

- 2-3 patients with Thai names, associated with the tenant

### Implementation

- Check if Tenant already exists before seeding (idempotent)
- Passwords hashed with BCrypt or ASP.NET Identity hasher
- Runnable: auto on startup if DB is empty, or via `dotnet run -- --seed`

---

## STEP 9 — Caching — Section D (10 minutes)

### D1. Cache List Patients

- Cache the result of GET /api/patients for each tenant+branch combination
- Use Redis with `IDistributedCache` or `StackExchange.Redis`

### D2. Cache Key Strategy (Tenant-Scoped)

Key format:

```
tenant:{tenantId}:patients:list:{branchId|all}
```

Examples:

```
tenant:abc-123:patients:list:all
tenant:abc-123:patients:list:branch-456
```

TTL: 5 minutes (short, since patient data changes frequently)

### D3. Invalidation

On **Create Patient**:

- Invalidate `tenant:{tenantId}:patients:list:all`
- If patient has PrimaryBranchId, also invalidate `tenant:{tenantId}:patients:list:{branchId}`
- Use key deletion (simple approach for v1)

Implementation pattern:

```
// On GET /patients
1. Build cache key from tenantId + branchId
2. Check Redis → if hit, return cached
3. If miss, query DB, serialize, store in Redis with TTL
4. Return result

// On POST /patients
1. Save to DB
2. Delete relevant cache keys
3. Return created patient
```

---

## STEP 10 — Tenant Isolation Strategy — Section E2 (in README)

### How TenantId is Derived

- TenantId is stored as a claim in the JWT token
- On login, the server embeds `tenant_id` claim from the User's record
- Every authenticated request carries TenantId in the token — not in headers, not in URL
- The server extracts TenantId from the validated JWT, never trusting client-supplied TenantId for authorization

### How TenantId is Enforced in the Data Access Layer

**Approach: Global Query Filter (EF Core)**

```csharp
// In DbContext.OnModelCreating:
modelBuilder.Entity<Patient>()
    .HasQueryFilter(p => p.TenantId == _currentTenantId);
```

- A scoped `ITenantContext` service resolves the current TenantId from JWT claims
- DbContext receives ITenantContext via DI and applies global query filters
- ALL queries on tenant-scoped entities automatically include WHERE TenantId = @currentTenantId
- This means even if a developer forgets to filter, EF Core does it automatically

**Write-side enforcement:**

- On Create, the server sets TenantId from ITenantContext (ignores any client-supplied TenantId in the body)
- Validation: if a referenced BranchId doesn't belong to the current Tenant, reject with 400

### How We Prevent Accidental Missing Filters

1. **EF Core Global Query Filters** — automatic, cannot be bypassed without explicit `.IgnoreQueryFilters()`
2. **ITenantContext as required DI** — if TenantId is not resolvable (e.g., no JWT), the request fails early
3. **No raw SQL** — all queries go through EF Core, which enforces the filter
4. **Code review rule** — any use of `.IgnoreQueryFilters()` requires explicit justification
5. **Integration tests** — test that Tenant A cannot see Tenant B's data

### Trade-offs

- Single database, shared schema (row-level isolation) — simplest for v1
- Not using schema-per-tenant or database-per-tenant (overkill for this stage)
- Global query filters can be bypassed with `.IgnoreQueryFilters()` — acceptable risk with code review
- Future: can migrate to schema-per-tenant if tenant count grows significantly

---

## STEP 11 — Tests (10 minutes)

Provide at least 3 automated tests:

### Test 1: Tenant Isolation (Backend)

- Create patients in Tenant A and Tenant B
- Query as Tenant A → should only see Tenant A's patients
- Query as Tenant B → should only see Tenant B's patients
- Verify zero cross-tenant data leakage

### Test 2: Duplicate Phone Prevention (Backend)

- Create patient with phone "0812345678" in Tenant A → success
- Create another patient with same phone in Tenant A → expect 409 Conflict
- Create patient with same phone in Tenant B → success (different tenant, should work)

### Test 3: Authorization / Smoke Test

- Viewer role attempts POST /api/patients → expect 403 Forbidden
- Admin role attempts POST /api/patients → expect 201 Created
- (Alternative: frontend smoke test with Playwright/Cypress if time allows)

### Test Implementation

- Backend: xUnit + WebApplicationFactory (in-memory or TestContainers for PostgreSQL)
- Frontend: optional Playwright smoke test (navigate to /patients, verify page loads)

---

## STEP 12 — Documentation (5 minutes)

### README.md must include:

- Architecture overview (how tenant safety works — reference E2 strategy)
- Entity relationship summary (Tenant → Branch, Tenant → Patient, Tenant → User, User ↔ Branch)
- Assumptions and trade-offs
- How to run: `docker compose up --build`
- Environment variables (.env.example)
- Seeded users and how to login (table with credentials)
- API examples (curl for login, create patient, list patients)
- How to run tests

### AI_PROMPTS.md must include:

- Exact prompts used
- Iterations and refinements
- Accepted vs rejected AI outputs
- How correctness was validated

---

## STEP 13 — UI Generation — Clinic Admin System

You are generating a production-ready Next.js (App Router) admin UI.

The design must follow a clean, modern medical clinic style inspired by Aura Bangkok Clinic.

### Visual Style

Overall feeling:

- Clean, Bright, Professional, Trustworthy
- Medical-grade, Spacious, Minimal
- No dark theme
- No heavy gradients
- No fintech/startup neon style

### Color System

| Token                 | Value   |
| --------------------- | ------- |
| Primary Brand         | #00B6D6 |
| Primary Hover         | #0FA3C4 |
| Light Blue Background | #E6F8FC |
| Main Background       | #FFFFFF |
| Primary Text          | #1A1A1A |
| Secondary Text        | #4A4A4A |
| Muted Text            | #7A7A7A |
| Borders               | #E5E5E5 |

### Design Rules

- Spacing: Generous padding (24–32px sections), no cramped layouts
- Corners: Rounded (12px–16px)
- Shadows: Very subtle only (soft shadow-sm equivalent)
- Typography: Clean sans-serif, clear hierarchy, strong but calm headers

### Component Standards

**Buttons:**

- Primary: bg #00B6D6, text white, rounded, darker hover
- Secondary: white bg, border #00B6D6, text #00B6D6

**Forms:**

- White inputs, border #E5E5E5, focus border #00B6D6
- Labels above inputs, clear validation state

**Cards:** White bg, rounded, subtle shadow

**Tables:**

- Clean white rows, light row hover (#E6F8FC)
- Thin borders, clear spacing

**Modals:** Centered, rounded, clean white bg, soft overlay

### Layout Structure

1. Admin Dashboard Layout
   - Left Sidebar (light blue accent)
   - Top Navbar (white)
   - Main Content Area (white)

Sidebar:

- Logo area
- Navigation: Dashboard, Patients, Appointments (stub), Treatments (stub), Staff (stub)
- Active item highlighted in brand color

Navbar:

- Page title
- User profile area (show logged-in user name + role)
- Branch selector (dropdown to switch active branch context)

### Patient Module

1. **Patient List Page**
   - Header with title + "Add Patient" primary button
   - Filter: Branch dropdown (from user's associated branches)
   - Table: Name, Phone, Primary Branch, Created At, Actions
   - Empty state message if no patients

2. **Create Patient Form**
   - Card layout
   - Fields: First Name, Last Name, Phone Number, Primary Branch (dropdown, optional)
   - TenantId: auto-set from logged-in user (not shown in form)
   - Save (primary) + Cancel (secondary) buttons
   - Validation messages on error
   - Show 409 duplicate phone error clearly

3. **Login Page**
   - Simple centered card
   - Username + Password fields
   - Login button
   - Error message on invalid credentials
   - Redirect to /patients on success

### Technical Requirements

- Use TailwindCSS
- Clean component structure (separate layout, pages, components)
- Store JWT in httpOnly cookie or localStorage (for v1, localStorage acceptable)
- API calls via fetch or axios with Authorization header
- Auth context/provider for logged-in user state
- Protected routes (redirect to /login if no token)

### DO NOT

- Do not use dark backgrounds
- Do not use purple/pink palette
- Do not use glassmorphism
- Do not over-animate
- Do not use heavy gradients

---

## STRATEGY NOTES

### DO:

- Enforce tenant filter everywhere (global query filter + JWT claims)
- Use DB-level unique constraints
- Keep code minimal and readable
- Focus on correctness over feature count
- Test the 3 critical paths (isolation, uniqueness, authorization)

### DO NOT:

- Implement full appointment system (not in chosen sections)
- Implement RabbitMQ messaging (not in chosen sections)
- Overbuild microservices
- Add unnecessary abstraction layers
- Spend excessive time on UI polish

### Win Condition:

Demonstrate senior-level thinking under constraint:

- Tenant-safe by default (global query filters)
- Correct data model (Tenant → Branch, User ↔ Branch junction)
- Working auth with role enforcement
- Cached reads with proper invalidation
- Clear documentation of tenant isolation strategy
- Runs with one command
