# Clinic POS – 90 Minute Execution Plan

AI-Assisted Build Strategy (Claude CLI)

Goal:
Deliver a thin, tenant-safe vertical slice that runs with:
docker compose up --build

DO NOT over-engineer.
Correct boundaries > feature count.

---

## STEP 1 — Project Structure (5 minutes)

Create this structure:

/src
/backend
/frontend
docker-compose.yml
.env.example
README.md
AI_PROMPTS.md

Command example:

mkdir clinic-pos
cd clinic-pos
mkdir -p src/backend
mkdir -p src/frontend
touch docker-compose.yml .env.example README.md AI_PROMPTS.md

---

## STEP 2 — Backend Scaffold (.NET 10) (10 minutes)

Use Claude to generate:

- .NET 10 Web API
- EF Core + PostgreSQL
- Redis client
- RabbitMQ client
- Dockerfile
- Folder structure:
  Controllers
  Application
  Domain
  Infrastructure
- Health check endpoint
- Basic DbContext
- Appsettings via env

DO NOT implement business logic yet.

---

## STEP 3 — Frontend Scaffold (Next.js) (10 minutes)

Generate:

- Latest Next.js app
- /patients page (empty placeholder)
- API base URL via env
- Dockerfile

Keep minimal.

---

## STEP 4 — Docker Compose (10 minutes)

Services:

- postgres
- redis
- rabbitmq
- backend
- frontend

Requirements:

- backend depends_on postgres, redis, rabbitmq
- expose:
  postgres 5432
  redis 6379
  rabbitmq 5672, 15672
  backend 5000
  frontend 3000
- env via .env
- one command:
  docker compose up --build

Test that everything boots.

---

## STEP 5 — Core Slice: Patients (20 minutes)

Implement:

Patient entity:

- Id
- TenantId
- FirstName
- LastName
- PhoneNumber
- CreatedAt (server-generated)
- PrimaryBranchId (optional)

Database:

- Composite unique index on (TenantId, PhoneNumber)
- Migration auto-applied on startup

Endpoints:
POST /patients
GET /patients?tenantId=...&branchId=...

Rules:

- Phone unique within Tenant
- Required Tenant filter on ALL reads/writes
- Sorted by CreatedAt DESC

Return safe error on duplicate.

---

## STEP 6 — Authorization + Roles (15 minutes)

Roles:

- Admin
- User
- Viewer

Permissions:

- Create patient
- View patient

Implementation:

- Simple JWT auth
- Extract TenantId + Role from claims
- Policy-based authorization
- Viewer cannot create patient

Endpoints:

- Create User
- Assign Role
- Associate User with Tenant + Branch

---

## STEP 7 — Seeder (5 minutes)

Seeder must create:

- 1 Tenant
- 2 Branches
- 3 Users (Admin, User, Viewer)
- Proper associations

Runnable with one command or auto-run at startup.

---

## STEP 8 — Caching (Section D) (10 minutes)

Cache GET /patients

Key format:
tenant:{tenantId}:patients:list:{branchId|all}

On Create Patient:

- Invalidate related cache key

Keep simple Redis implementation.

---

## STEP 9 — Tests (10 minutes)

Provide at least 3 tests:

1. Tenant isolation test
2. Duplicate phone prevented within tenant
3. Simple integration/smoke test

Minimal but meaningful.

---

## STEP 10 — Documentation (5 minutes)

README.md must include:

- Architecture overview
- Tenant isolation explanation
- Trade-offs
- How to run (one command)
- Seeded users + login info
- API examples (curl)
- How to run tests

AI_PROMPTS.md must include:

- Exact prompts used
- Iterations
- Accepted vs rejected AI outputs
- Validation method

---

## STEP 11 - UI GENERATION DIRECTIVE — Clinic Admin System

You are generating a production-ready Next.js (App Router) admin UI.

The design must follow a clean, modern medical clinic style inspired by Aura Bangkok Clinic.

====================================================
VISUAL STYLE
====================================================

Overall feeling:

- Clean
- Bright
- Professional
- Trustworthy
- Medical-grade
- Spacious
- Minimal

No dark theme.
No heavy gradients.
No fintech/startup neon style.

====================================================
COLOR SYSTEM
====================================================

Primary Brand Color:
#00B6D6

Primary Hover:
#0FA3C4

Light Blue Background:
#E6F8FC

Main Background:
#FFFFFF

Primary Text:
#1A1A1A

Secondary Text:
#4A4A4A

Muted Text:
#7A7A7A

Borders:
#E5E5E5

====================================================
DESIGN RULES
====================================================

Spacing:

- Generous padding (24–32px sections)
- No cramped layouts

Corners:

- Rounded (12px–16px)

Shadows:

- Very subtle only
- Soft shadow-sm equivalent

Typography:

- Clean sans-serif
- Clear hierarchy
- Strong but calm headers

====================================================
COMPONENT STANDARDS
====================================================

Buttons:
Primary:

- Background: #00B6D6
- Text: white
- Rounded
- Slight darker hover

Secondary:

- White background
- Border: #00B6D6
- Text: #00B6D6

Forms:

- White inputs
- Border: #E5E5E5
- Focus border: #00B6D6
- Labels above inputs
- Clear validation state

Cards:

- White background
- Rounded
- Subtle shadow

Tables:

- Clean white rows
- Light row hover (#E6F8FC)
- Thin borders
- Clear spacing

Modals:

- Centered
- Rounded
- Clean white background
- Soft overlay

====================================================
LAYOUT STRUCTURE
====================================================

Create:

1. Admin Dashboard Layout
   - Left Sidebar (light blue accent)
   - Top Navbar (white)
   - Main Content Area (white)

Sidebar:

- Logo area
- Navigation items:
  - Dashboard
  - Patients
  - Appointments
  - Treatments
  - Staff
- Active item highlighted in brand color

Navbar:

- Page title
- User profile area (stub user)

====================================================
PATIENT MODULE
====================================================

Create full working UI for:

1. Patient List Page
   - Header with title
   - "Add Patient" primary button
   - Search input
   - Table:
     - Name
     - Phone
     - Date of Birth
     - Status
     - Actions (Edit/Delete)

2. Create Patient Page
   - Card layout form
   - Fields:
     - First Name
     - Last Name
     - Phone
     - Email
     - Date of Birth
     - Gender (select)
     - Notes (textarea)
   - Save (primary button)
   - Cancel (secondary button)

3. Edit Patient Modal
   - Same fields as create
   - Clean modal style

====================================================
TECHNICAL REQUIREMENTS
====================================================

- Use TailwindCSS
- Clean component structure
- Separate layout and pages
- Production-quality code
- No placeholder lorem ipsum
- Use realistic example Thai/English patient data

====================================================
DO NOT
====================================================

- Do not use dark backgrounds
- Do not use purple/pink palette
- Do not use glassmorphism
- Do not over-animate
- Do not use heavy gradients

====================================================
OUTPUT EXPECTATION
====================================================

Generate:

- Layout component
- Sidebar component
- Navbar component
- Patient list page
- Patient form page
- Reusable UI components

All code must be clean, structured, and ready to run.

## STRATEGY NOTES

DO:

- Enforce tenant filter everywhere
- Use DB-level unique constraints
- Keep code minimal and readable
- Focus on correctness

DO NOT:

- Implement full appointment system
- Overbuild microservices
- Spend time on UI styling
- Add unnecessary abstraction layers

Win condition:
Demonstrate senior-level thinking under constraint.
