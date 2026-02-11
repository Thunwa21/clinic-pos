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
| Frontend | Next.js 16 (App Router, TypeScript, Tailwind) | Login, patient management UI |
| Backend | .NET 10 Web API | REST API, JWT auth, business logic |
| Database | PostgreSQL 17 | Persistent data storage |
| Cache | Redis 7 | GET /patients response caching |
| Message Broker | RabbitMQ 4 | Event bus (wired, not yet consumed) |

### Project Structure

```
clinic-pos/
├── src/
│   ├── backend/
│   │   ├── ClinicPos.Api/           # .NET 10 Web API
│   │   │   ├── Controllers/         # AuthController, PatientsController
│   │   │   ├── Application/         # DTOs
│   │   │   ├── Domain/Entities/     # Patient, User, Tenant
│   │   │   └── Infrastructure/Data/ # DbContext, Seeder, Migrations
│   │   └── ClinicPos.Tests/         # xUnit integration tests
│   └── frontend/                    # Next.js 16 app
├── docker-compose.yml
├── .env / .env.example
└── EXECUTION_PLAN.md
```

## Tenant Isolation

Every data operation is scoped to a tenant. Isolation is enforced at multiple layers:

1. **Authentication** — User must select the correct tenant (by short code, e.g. `SKV`) at login. The system verifies the user belongs to that tenant before issuing a JWT.
2. **JWT Claims** — `TenantId` is embedded in the JWT token. The backend extracts it from claims on every request.
3. **Query Filtering** — All database queries include `WHERE TenantId = ...`. There is no endpoint that returns cross-tenant data.
4. **Unique Constraints** — Phone number uniqueness is scoped per tenant: `UNIQUE(TenantId, PhoneNumber)`.
5. **Caching** — Cache keys include tenant ID: `tenant:{tenantId}:patients:list:{branchId|all}`.

A user in Tenant A **cannot** see, create, or modify data belonging to Tenant B.

## Trade-offs

| Decision | Rationale |
|----------|-----------|
| Monolith API (not microservices) | Simplicity — correct boundaries over premature decomposition |
| JWT in sessionStorage | Simple for demo; production should use httpOnly cookies |
| PBKDF2-SHA256 (100k iterations) | Standard password hashing; BCrypt/Argon2 are alternatives |
| CORS AllowAnyOrigin | Development convenience; restrict in production |
| RabbitMQ wired but unused | Infrastructure ready for future event-driven features |
| SQLite for tests, PostgreSQL for prod | Fast tests without Docker dependency; provider-specific SQL avoided |
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

The system auto-seeds 2 tenants and 6 users on first startup:

### Tenant 1 — Clinic Sukhumvit (Code: `SKV`)

| Username | Password | Role |
|----------|----------|------|
| admin | admin1234 | Admin |
| user | user1234 | User |
| viewer | viewer1234 | Viewer |

### Tenant 2 — Clinic Silom (Code: `SLM`)

| Username | Password | Role |
|----------|----------|------|
| admin2 | admin1234 | Admin |
| user2 | user1234 | User |
| viewer2 | viewer1234 | Viewer |

### Roles

| Role | Create Patient | View Patient |
|------|---------------|--------------|
| Admin | Yes | Yes |
| User | Yes | Yes |
| Viewer | No | Yes |

## API Examples

### List tenants (public)

```bash
curl http://localhost:5001/auth/tenants
```

### Login

```bash
curl -X POST http://localhost:5001/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin1234","tenantCode":"SKV"}'
```

### Create patient (Admin/User only)

```bash
TOKEN="<token from login response>"

curl -X POST http://localhost:5001/patients \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"firstName":"John","lastName":"Doe","phoneNumber":"0812345678"}'
```

### List patients

```bash
curl http://localhost:5001/patients \
  -H "Authorization: Bearer $TOKEN"
```

### Filter by branch

```bash
curl "http://localhost:5001/patients?branchId=aaaa0000-0000-0000-0000-000000000001" \
  -H "Authorization: Bearer $TOKEN"
```

### Register new user

```bash
curl -X POST http://localhost:5001/auth/register \
  -H "Content-Type: application/json" \
  -d '{"username":"newuser","password":"pass1234","tenantCode":"SKV"}'
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
