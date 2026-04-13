# Known Issues — DealerOS v1.0

## Tier 3 Modules (localStorage only, not wired to backend)
These modules work with local browser data and will lose data if the browser storage is cleared:
- Sell Car (invoice generation)
- Receipts & AI Scan
- Investor Invoices
- Staff & Wages
- VAT Tracker
- Reports & Analytics
- Auto Trader integration
- Instagram integration
- Insurance & SORN Check (uses external MIB portal link)
- Service Records

## Per-Vehicle Excel Sheets
The original workbook contains ~90 per-vehicle sheets with detailed reconditioning breakdowns. These are not imported — the aggregate `recon_cost` from the Stock Data sheet is used instead.

## DVSA Credentials
The DVSA MOT check credentials are currently inline in the frontend (line ~1912 area). These should be moved to a backend proxy with credentials in `.env` in a future update.

## Excel Formula Cells
Some cells in the original workbook contain formulas. The import handles formula results correctly, but `[object Object]` values (from broken formula cells) are recomputed from component fields where possible.

## File Upload
- No file size limit enforced on the frontend (backend uses multer defaults)
- No image preview or thumbnail generation
- "Open Folder" button opens the file server listing in a new tab, not the OS file explorer

## Investor Validation
Investors must be created on the Investors page before they can be assigned to a vehicle. The API rejects vehicle create, update, and sell requests that reference a non-existent investor name (HTTP 400). The value "SA" is a special case meaning dealership-owned and does not require an investor record.

## Missing Frontend Features
- No vehicle delete button in the UI (API endpoint exists at DELETE /api/vehicles/:stock_id)
- No collection-to-stock conversion button (API endpoint exists at POST /api/collections/:id/convert)
- No inline editing of vehicle fields — must use the original forms
- Sold breakdown now opens the same detail modal as stock, but with additional sold fields
