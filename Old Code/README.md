# 🏢 ERP System — SME Enterprise Resource Planning

> A scalable, modular ERP system inspired by SAP S/4HANA architecture, built for Small & Medium Enterprises.
> Built with NestJS + React + PostgreSQL + Prisma.

---

## 📁 Project Structure

```
erp-system/
├── backend/                    # NestJS API Server
│   ├── prisma/
│   │   ├── schema.prisma       # Full database schema
│   │   └── seed.ts             # Demo data seeder
│   └── src/
│       ├── main.ts             # App entry point
│       ├── app.module.ts       # Root module
│       ├── config/             # App & logger config
│       ├── common/
│       │   ├── prisma/         # Global DB service
│       │   ├── guards/         # JWT + RBAC guards
│       │   ├── filters/        # Global error handler
│       │   ├── interceptors/   # Transform + logging
│       │   ├── decorators/     # @CurrentUser, @Roles, @Public
│       │   └── dto/            # PaginationDto, PaginatedResult
│       └── modules/
│           ├── auth/           # JWT auth, register, login, refresh
│           ├── users/          # User management
│           ├── inventory/      # Items CRUD + stock tracking ✅ FULL
│           ├── warehouse/      # Warehouses + bins + transfers ✅ FULL
│           ├── sales/          # Customers + orders ✅ FULL
│           ├── purchase/       # Vendors + PO + GRN ✅ FULL
│           ├── finance/        # CoA + transactions + reports ✅ FULL
│           ├── hr/             # Employees + attendance ✅ FULL
│           └── crm/            # Leads + interactions ✅ FULL
│
├── frontend/                   # React + Vite Dashboard
│   └── src/
│       ├── api/                # Typed API client + all service modules
│       ├── store/              # Zustand auth store
│       ├── components/
│       │   ├── common/         # DataTable, Modal (reusable)
│       │   └── layout/         # DashboardLayout + sidebar
│       ├── pages/
│       │   ├── auth/           # Login, Register
│       │   ├── dashboard/      # KPI dashboard with charts
│       │   ├── inventory/      # Items (full CRUD), Movements
│       │   ├── warehouse/      # Warehouses (stub)
│       │   ├── sales/          # Customers, Orders (stubs)
│       │   ├── purchase/       # Vendors, PO (stubs)
│       │   ├── finance/        # Accounts, Transactions, Reports (stubs)
│       │   ├── hr/             # Employees, Attendance (stubs)
│       │   └── crm/            # Leads, Interactions (stubs)
│       └── styles/             # Global CSS design system
│
├── mobile/                     # React Native (Expo) — structure only
└── docs/
    └── ERP-System.postman_collection.json
```

---

## 🚀 Getting Started — Local Setup

### Prerequisites

| Tool | Version | Install |
|------|---------|---------|
| Node.js | ≥ 18.x | https://nodejs.org |
| PostgreSQL | ≥ 14 | https://postgresql.org |
| npm | ≥ 9.x | Bundled with Node |

---

### Step 1 — Clone & Install

```bash
# Clone the project
git clone <your-repo-url> erp-system
cd erp-system

# Install backend dependencies
cd backend
npm install

# Install frontend dependencies
cd ../frontend
npm install
```

---

### Step 2 — Configure the Database

```bash
# Create PostgreSQL database
psql -U postgres -c "CREATE DATABASE erp_db;"
# OR use pgAdmin / TablePlus
```

---

### Step 3 — Configure Environment Variables

```bash
# In /backend directory
cp .env.example .env
```

Edit `.env` and set your values:

```env
DATABASE_URL="postgresql://postgres:YOUR_PASSWORD@localhost:5432/erp_db"
JWT_ACCESS_SECRET=your-very-long-random-secret-key-here
JWT_REFRESH_SECRET=another-very-long-random-secret-key-here
```

Generate secure secrets with:
```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

---

### Step 4 — Run Database Migrations

```bash
cd backend

# Generate Prisma client
npm run db:generate

# Run migrations (creates all tables)
npm run db:migrate

# Seed demo data
npm run db:seed
```

After seeding you will see:
```
✅ Company: Demo Company Ltd
✅ Users: admin@demo.com, manager@demo.com
✅ Chart of Accounts: 18 accounts
✅ Warehouses: Main + East, 6 bins
✅ Items: 10 products with initial stock
✅ Customers: 5
✅ Vendors: 4
✅ Employees: 5
✅ Leads: 5

Login Credentials:
  Company Code : DEMO
  Admin        : admin@demo.com / Admin@1234
  Manager      : manager@demo.com / Manager@1234
```

---

### Step 5 — Start the Backend

```bash
cd backend
npm run start:dev
```

Backend runs at: **http://localhost:3000**
Swagger docs at: **http://localhost:3000/api/docs**

---

### Step 6 — Start the Frontend

```bash
cd frontend
npm run dev
```

Frontend runs at: **http://localhost:5173**

---

### Step 7 — Login

Open **http://localhost:5173** and log in:
- Company Code: `DEMO`
- Email: `admin@demo.com`
- Password: `Admin@1234`

---

## 🔑 API Authentication

All API endpoints (except `/auth/register` and `/auth/login`) require a Bearer token:

```http
Authorization: Bearer <accessToken>
```

Tokens expire in **15 minutes**. Use the refresh endpoint to get a new one:

```http
POST /api/v1/auth/refresh
{ "refreshToken": "<your-refresh-token>" }
```

---

## 🗄️ Database Management

```bash
cd backend

# Open Prisma Studio (visual DB browser)
npm run db:studio

# Create a new migration after schema changes
npx prisma migrate dev --name "add-new-field"

# Reset database (CAUTION: deletes all data)
npx prisma migrate reset
```

---

## 🧩 Module Integration Rules

The modules communicate through the service layer — never directly between controllers:

```
Sales Order SHIPPED  →  InventoryService.recordStockMovement(OUT)
Purchase Order GRN   →  InventoryService.recordStockMovement(IN)
Warehouse Transfer   →  InventoryService.recordStockMovement(TRANSFER)
```

To add Finance auto-posting:
1. Inject `FinanceService` into `SalesService`
2. Call `financeService.createTransaction()` after order status changes
3. Use the seeded accounts (AR debit / Revenue credit)

---

## 📊 API Quick Reference

| Module | Base URL | Key Endpoints |
|--------|----------|---------------|
| Auth | `/api/v1/auth` | POST /register, /login, /refresh, /logout |
| Inventory | `/api/v1/inventory` | CRUD /items, GET /stock, POST /movements |
| Warehouse | `/api/v1/warehouses` | CRUD, POST /transfer, GET /:id/bins |
| Sales | `/api/v1/sales` | /customers CRUD, /orders CRUD + status |
| Purchase | `/api/v1/purchase` | /vendors CRUD, /orders CRUD, /:id/receive |
| Finance | `/api/v1/finance` | /accounts, /transactions, /reports/* |
| HR | `/api/v1/hr` | /employees CRUD, /:id/attendance, /report |
| CRM | `/api/v1/crm` | /leads CRUD, /pipeline, /interactions |

Full documentation: **http://localhost:3000/api/docs**

---

## 🛣️ Step-by-Step Expansion Roadmap

### Phase 1 — Complete Frontend Pages (Week 1–2)
Each stub page follows the `ItemsPage.tsx` pattern:
1. Copy `ItemsPage.tsx` as your template
2. Import the relevant API module (e.g. `salesApi`)
3. Define columns and form fields
4. Connect `useQuery` for listing and `useMutation` for CUD

### Phase 2 — Finance Auto-Posting (Week 3)
- Auto-record journal entries when Sales Orders are confirmed
- Auto-record COGS when goods are shipped
- Auto-post AP when Purchase Orders are received

### Phase 3 — Invoice Generation (Week 4)
- Add `invoice` table to Prisma schema
- Generate PDF invoices using `pdfkit` or `puppeteer`
- Email invoices via SendGrid / Nodemailer

### Phase 4 — Advanced Inventory (Week 5–6)
- Serial number / lot tracking
- FIFO / LIFO costing methods
- Reorder point automation (scheduled jobs with `@nestjs/schedule`)
- Barcode scanning (frontend camera integration)

### Phase 5 — Reporting & Analytics (Week 7–8)
- Sales reports by period / customer / product
- Purchase analysis
- Cash flow statement
- Inventory valuation report
- Export to Excel / PDF

### Phase 6 — Multi-Currency (Week 9)
- Add currency rates table
- Currency conversion in transactions
- Multi-currency invoicing

### Phase 7 — AI Integration (Week 10+)
The system is already structured for AI integration:
- Add `ai/` module with OpenAI/Anthropic client
- Natural language queries: "Show me top 5 customers by revenue this month"
- Demand forecasting using historical stock movements
- Anomaly detection on financial transactions
- AI-assisted lead scoring in CRM

### Phase 8 — Microservices Migration
Each NestJS module is already self-contained and ready to extract:
1. Extract module to standalone NestJS app
2. Add message broker (RabbitMQ / Kafka) for inter-service events
3. Add API Gateway (Kong / custom NestJS gateway)
4. Containerize with Docker + Kubernetes

---

## 🐳 Docker Setup (Optional)

Create `docker-compose.yml` at project root:

```yaml
version: '3.8'
services:
  postgres:
    image: postgres:15
    environment:
      POSTGRES_DB: erp_db
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
    ports:
      - "5432:5432"
    volumes:
      - pgdata:/var/lib/postgresql/data

  backend:
    build: ./backend
    ports:
      - "3000:3000"
    environment:
      DATABASE_URL: postgresql://postgres:postgres@postgres:5432/erp_db
    depends_on:
      - postgres

  frontend:
    build: ./frontend
    ports:
      - "5173:80"
    depends_on:
      - backend

volumes:
  pgdata:
```

Run with:
```bash
docker-compose up -d
docker-compose exec backend npm run db:migrate
docker-compose exec backend npm run db:seed
```

---

## 🔒 Role Permissions Matrix

| Feature | USER | MANAGER | ADMIN | SUPER_ADMIN |
|---------|------|---------|-------|-------------|
| View all modules | ✅ | ✅ | ✅ | ✅ |
| Create/Edit records | ❌ | ✅ | ✅ | ✅ |
| Delete records | ❌ | ❌ | ✅ | ✅ |
| User management | ❌ | ❌ | ✅ | ✅ |
| Finance entries | ❌ | ✅ | ✅ | ✅ |
| Cross-company access | ❌ | ❌ | ❌ | ✅ |

---

## 🧪 Testing

```bash
cd backend

# Unit tests
npm test

# E2E tests
npm run test:e2e

# Test coverage
npm run test:cov
```

---

## 📦 Tech Stack Summary

| Layer | Technology | Purpose |
|-------|-----------|---------|
| Backend | NestJS 10 | Modular Node.js framework |
| Language | TypeScript | Type safety throughout |
| Database | PostgreSQL 15 | Primary data store |
| ORM | Prisma 5 | Type-safe DB access |
| Auth | JWT + Passport | Access + refresh tokens |
| API Docs | Swagger/OpenAPI | Auto-generated docs |
| Frontend | React 18 + Vite | Fast SPA dashboard |
| State | Zustand | Lightweight state mgmt |
| Queries | TanStack Query | Server state + caching |
| Charts | Recharts | Dashboard visualizations |
| Styling | Custom CSS | No framework dependency |
| Mobile | React Native / Expo | Mobile app foundation |

---

*Built with ❤️ — Modular, Scalable, Production-Ready*
