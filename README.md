# DealerOS

Dealership management system for SA Motors. Tracks vehicle stock, sales, investors, expenses, collections, and more.

## Requirements

- **Node.js 22+** — [https://nodejs.org](https://nodejs.org)
- **MongoDB 7+** — [https://www.mongodb.com/docs/manual/installation/](https://www.mongodb.com/docs/manual/installation/)

## Quick Start

```bash
# 1. Install dependencies
npm install

# 2. Copy environment config
cp .env.example .env
# Edit .env if your MongoDB is not on localhost:27017

# 3. Seed the database from the master spreadsheet
npm run seed

# 4. Start the server
npm start
# or for development with auto-reload:
npm run dev
```

Visit **http://localhost:5050** in your browser.

**Mac users:** Double-click `start.command` to launch.

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `5050` | Server port |
| `MONGO_URI` | `mongodb://127.0.0.1:27017/dealeros` | MongoDB connection string |
| `STORAGE_ROOT` | `./storage` | Root directory for vehicle files |

## Project Structure

```
backend/
  config/db.js          — MongoDB connection
  models/               — Mongoose schemas (Vehicle, Investor, Expense, etc.)
  routes/               — Express REST API routes
  services/             — Business logic (import/export, calculations, file management)
  middleware/            — Error handler, file upload config
frontend/
  index.html            — Single-page application (all 21 pages)
scripts/
  seed.js               — Import master spreadsheet into MongoDB
  Master_Spreadsheet.xlsx
storage/
  Cars/<stock_id>/      — Vehicle files (Photos, Documents, MOT, etc.)
```

## API Endpoints

| Method | Route | Description |
|--------|-------|-------------|
| GET | `/api/bootstrap` | Full app data payload |
| GET/POST | `/api/vehicles` | List / create vehicles |
| GET/PUT/DELETE | `/api/vehicles/:stock_id` | Vehicle CRUD |
| POST | `/api/vehicles/:stock_id/sell` | Mark vehicle as sold |
| POST | `/api/vehicles/:stock_id/files` | Upload file to vehicle |
| GET/POST | `/api/investors` | Investor CRUD (computed fields) |
| GET/POST | `/api/expenses` | Expense CRUD |
| GET/POST | `/api/collections` | Collection CRUD |
| POST | `/api/collections/:id/convert` | Convert collection to stock vehicle |
| GET/POST | `/api/money-in` | Money In CRUD |
| GET/POST | `/api/money-out` | Money Out CRUD |
| GET/POST | `/api/viewings` | Viewing CRUD |
| GET/POST | `/api/tasks` | Task CRUD |
| GET/POST | `/api/fines` | Fine CRUD |
| GET | `/api/excel/export` | Download Excel workbook |
| POST | `/api/excel/import` | Upload and import workbook |

## Excel Sync

- **Export:** Dashboard → Export Excel button. Downloads a workbook with the same sheet structure as the original master spreadsheet.
- **Import:** Dashboard → Import Excel button. Upserts vehicles by plate number, appends financial records.

## File Storage

Each vehicle gets a folder at `storage/Cars/<stock_id>/` with sub-folders: Photos, Documents, ServiceHistory, MOT, Purchase, Sale, Delivery, Collection. Files are accessible via the vehicle detail modal or at `/files/Cars/<stock_id>/`.

## Known Issues

See [KNOWN_ISSUES.md](KNOWN_ISSUES.md) for current limitations and planned improvements.
