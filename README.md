# Las Tapas — Team Sigma

Restaurant table-ordering web app. Guests scan a QR code at their table and order from their phone.

---

## Prerequisites

- Node.js 20+
- A [Neon](https://neon.tech) PostgreSQL database (free tier is fine)

---

## Setup

**1. Install dependencies**
```bash
npm install
```

**2. Set up environment variables**

Copy `.env.example` to `.env.local` and fill in your Neon connection string:
```bash
cp .env.example .env.local
```

Get the connection string from your Neon project dashboard → **Connection Details** → select **Pooled connection**.

**3. Push the database schema**

This creates all tables in your database. Run once after cloning:
```bash
npx drizzle-kit push
```

**4. Start the dev server**
```bash
npm run dev
```

App runs at `http://localhost:3000`.

---

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Start dev server with hot reload |
| `npm run build` | Production build |
| `npm start` | Start production server |
| `npm run lint` | Run ESLint |

---

## After changing the database schema

Whenever you edit `src/db/schema.ts`, push the changes to the database:
```bash
npx drizzle-kit push
```

To inspect the database visually:
```bash
npx drizzle-kit studio
```

---

## Project structure

```
src/
  app/
    admin/        # Admin dashboard (menu management, table overview)
    kitchen/      # Kitchen display — incoming orders
    staff/        # Staff view
    table/[tableNumber]/  # Guest-facing menu & ordering
  db/
    index.ts      # Drizzle database client
    schema.ts     # All table definitions
```
