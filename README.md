# OGANCORE Backend

NestJS backend for **OGANCORE** — a multi-tenant Business Management + POS SaaS platform. Handles sales, inventory, procurement, payments, expenses, financial reporting, subscription/licensing, and audit logging across multiple branches.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Runtime | Node.js |
| Framework | NestJS (TypeScript) |
| ORM | Prisma |
| Database | MySQL |
| Auth | JWT (access + refresh tokens) with httpOnly cookies |
| API Docs | Swagger (`@nestjs/swagger`) |
| Validation | class-validator + class-transformer |
| Security | Helmet, CORS, ThrottlerGuard |

---

## Getting Started

1. **Clone the repository**
   ```bash
   git clone https://github.com/InnovativeSphere/ogancore-backend.git
   cd ogancore-backend
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   Copy `.env.example` (or create your own `.env`) and fill in:
   ```env
   DATABASE_URL=mysql://root:password@localhost:3306/ogancore
   JWT_SECRET=your-256-bit-secret
   JWT_REFRESH_SECRET=your-other-secret
   JWT_EXPIRATION=15m
   JWT_REFRESH_EXPIRATION=7d
   ```

4. **Create the database**
   Use MySQL Workbench or CLI to create an empty schema:
   ```sql
   CREATE DATABASE ogancore CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
   ```

5. **Run Prisma migrations**
   ```bash
   npx prisma migrate dev --name init
   ```

6. **Seed default data**
   Run these SQL inserts in your MySQL client:
   ```sql
   INSERT INTO ROLES (role_name, description) VALUES ('Admin', 'Default admin role');
   INSERT INTO BRANCHES (name, address) VALUES ('Head Office', 'Default branch');
   ```

7. **Start the server**
   ```bash
   npm run start:dev
   ```
   The API will be available at `http://localhost:3000`.

8. **View API documentation**
   Open `http://localhost:3000/api/docs` in your browser for interactive Swagger docs.

---

## Project Structure

```
src/
├── main.ts
├── app.module.ts
├── common/
│   ├── guards/         # JWT auth guard, roles guard
│   ├── decorators/     # @Roles, @GetUser
│   ├── filters/
│   └── interceptors/
├── config/
├── modules/
│   ├── auth/           # Register, login, JWT strategy, refresh
│   ├── users/          # User management, profile
│   ├── branches/       # Multi‑branch support
│   ├── products/       # Product catalog
│   ├── categories/     # Product categories
│   ├── suppliers/      # Supplier profiles
│   ├── inventory/      # Per‑branch stock tracking
│   ├── customers/      # Customer profiles
│   ├── sales/          # Sales transactions + POS
│   ├── payments/       # Split payments per sale
│   ├── expenses/       # Branch‑level expenses
│   ├── procurement/    # Purchase requisitions → orders → receipts
│   ├── reporting/      # Sales, inventory, financial reports
│   ├── subscriptions/  # SaaS plan management
│   ├── audit/          # Immutable audit logs
│   ├── notifications/  # In‑app notifications
│   └── admin/          # Admin dashboard endpoints
├── utils/
├── data/
└── prisma/
    ├── schema.prisma   # 20+ table MySQL schema
    ├── seed.ts
    └── migrations/
```

---

## API Modules Progress

| Module | Status | Completion |
|---|---|---|
| Database + Schema | ✅ 20+ tables created | 100% |
| Authentication | ✅ Register, login, JWT, refresh | 100% |
| Users | ⬜ CRUD, role/branch assignment | 0% |
| Branches | ⬜ Multi‑branch management | 0% |
| Products & Catalog | ⬜ Products, categories, suppliers | 0% |
| Inventory | ⬜ Stock per branch, movement history | 0% |
| Customers | ⬜ Profiles, statements | 0% |
| Sales & POS | ⬜ Transactions, invoice generation | 0% |
| Payments | ⬜ Split payments, methods | 0% |
| Expenses | ⬜ Branch‑level expense tracking | 0% |
| Procurement | ⬜ Requisitions → POs → receipts | 0% |
| Reporting | ⬜ Sales, inventory, financial reports | 0% |
| Subscriptions | ⬜ SaaS plan enforcement | 0% |
| Audit & Logging | ⬜ Immutable audit trail | 0% |
| Notifications | ⬜ In‑app alerts | 0% |
| Admin | ⬜ Super admin endpoints | 0% |

**Overall Project Completion: ~15%**

---

## Team

- **Backend Developer:** Salim Sambo (InnovativeSphere)
```

---
