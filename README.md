# ERP S/4HANA for SMEs

A scalable, modular ERP system architecture built with NestJS and React.

## 🧱 Tech Stack
- **Backend:** Node.js, NestJS, PostgreSQL, Prisma ORM
- **Frontend:** React.js, Tailwind CSS, Lucide Icons, Axios
- **Mobile:** React Native (Structure only)
- **Auth:** JWT, Role-Based Access Control (RBAC)

## 📁 Project Structure
- `/backend`: NestJS modular API
- `/frontend`: React Dashboard UI
- `/mobile`: React Native boilerplate structure

## 🚀 Getting Started

### 1. Prerequisites
- Node.js (v18+)
- PostgreSQL database

### 2. Backend Setup
```bash
cd backend
npm install
cp .env.example .env
# Update DATABASE_URL in .env with your PostgreSQL credentials
npx prisma generate
npx prisma db push
npm run start:dev
```

### 3. Frontend Setup
```bash
cd frontend
npm install
npm run dev
```

## 📊 Modules Implemented
- **Core:** Auth, RBAC, Multi-company, Global Middleware
- **Inventory:** Full CRUD, Stock tracking, Movements
- **Others (Placeholders):** Warehouse, Sales, Purchase, Finance, HR, CRM

## 🛠 Next Steps
1. **Warehouse Module:** Implement warehouse CRUD and bin locations.
2. **Sales/Purchase Integration:** Update `InventoryService` to automatically adjust stock when orders are completed.
3. **Finance:** Create a `TransactionService` that listens to events from Sales and Purchase modules to record entries.
4. **Reports:** Add a reporting service for real-time analytics.
