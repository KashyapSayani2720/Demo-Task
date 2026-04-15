import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { parseWorkbook } from './excelImport.js';
import { nextStockId, resetCounter } from './stockIdGenerator.js';
import { normalizePlate } from './normalize.js';
import Vehicle from '../models/Vehicle.js';
import Investor from '../models/Investor.js';
import Expense from '../models/Expense.js';
import Collection from '../models/Collection.js';
import MoneyIn from '../models/MoneyIn.js';
import MoneyOut from '../models/MoneyOut.js';
import Counter from '../models/Counter.js';
import { createVehicleFolders } from './fileManager.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const XLSX_PATH = path.join(__dirname, '..', '..', 'scripts', 'Master_Spreadsheet.xlsx');

const TAG = '[Seeder]';

/**
 * Safe, idempotent auto-seed.
 * Checks each collection independently — only seeds those with zero documents.
 * Safe to call on every server start.
 */
export async function autoSeed() {
  // Guard: spreadsheet must exist
  if (!fs.existsSync(XLSX_PATH)) {
    console.log(`${TAG} Master_Spreadsheet.xlsx not found — skipping seed`);
    return;
  }

  // Quick check: if every collection already has data, skip parsing entirely
  const counts = {
    vehicles: await Vehicle.countDocuments(),
    investors: await Investor.countDocuments(),
    expenses: await Expense.countDocuments(),
    collections: await Collection.countDocuments(),
    moneyIn: await MoneyIn.countDocuments(),
    moneyOut: await MoneyOut.countDocuments(),
  };

  const allPopulated = Object.values(counts).every(c => c > 0);
  if (allPopulated) {
    console.log(`${TAG} All collections already populated — skipping seed`);
    return;
  }

  // At least one collection is empty — parse the workbook
  console.log(`${TAG} Empty collections detected — parsing spreadsheet...`);
  let data;
  try {
    data = await parseWorkbook(XLSX_PATH);
  } catch (err) {
    console.error(`${TAG} Failed to parse spreadsheet:`, err.message);
    return;
  }

  // 1. Counter — ensure stock_id counter exists
  const counter = await Counter.findById('stock_id');
  if (!counter) {
    await resetCounter(0);
    console.log(`${TAG} Counter: initialized to 0`);
  } else {
    console.log(`${TAG} Counter: exists (seq=${counter.seq})`);
  }

  // 2. Investors
  if (counts.investors === 0 && data.investors.length > 0) {
    for (const inv of data.investors) {
      await Investor.create(inv);
    }
    console.log(`${TAG} Investors: seeded ${data.investors.length} records`);
  } else {
    console.log(`${TAG} Investors: skipped (${counts.investors} exist)`);
  }

  // 3. Vehicles (sold + stock)
  const plateToStockId = new Map();

  if (counts.vehicles === 0) {
    // Import sold vehicles first
    let soldCount = 0;
    for (const v of data.soldStock) {
      if (!v.plate) continue;
      const stock_id = await nextStockId();
      plateToStockId.set(v.plate, stock_id);
      await Vehicle.create({ ...v, stock_id });
      soldCount++;
    }

    // Import stock vehicles — skip duplicates already imported from sold sheet
    let stockCount = 0;
    let skippedCount = 0;
    for (const v of data.stockData) {
      if (!v.plate) continue;
      if (plateToStockId.has(v.plate)) {
        skippedCount++;
        continue;
      }
      const stock_id = await nextStockId();
      plateToStockId.set(v.plate, stock_id);
      await Vehicle.create({ ...v, stock_id });
      stockCount++;
    }
    console.log(`${TAG} Vehicles: seeded ${soldCount} sold + ${stockCount} stock (${skippedCount} duplicates skipped)`);

    // Create folders on disk
    let folderCount = 0;
    for (const [, stock_id] of plateToStockId) {
      try { createVehicleFolders(stock_id); folderCount++; } catch { /* skip */ }
    }
    console.log(`${TAG} Vehicle folders: created ${folderCount}`);
  } else {
    console.log(`${TAG} Vehicles: skipped (${counts.vehicles} exist)`);
  }

  // Build plate→stock_id map from DB (needed for Expense/MoneyIn linking)
  // This covers both freshly-seeded and pre-existing vehicles
  if (plateToStockId.size === 0) {
    const existing = await Vehicle.find({}, 'plate stock_id').lean();
    for (const v of existing) {
      if (v.plate && v.stock_id) plateToStockId.set(v.plate, v.stock_id);
    }
  }

  // 4. Collections
  if (counts.collections === 0 && data.collections.length > 0) {
    for (const c of data.collections) {
      await Collection.create(c);
    }
    console.log(`${TAG} Collections: seeded ${data.collections.length} records`);
  } else {
    console.log(`${TAG} Collections: skipped (${counts.collections} exist)`);
  }

  // 5. Expenses — link to vehicles by plate
  if (counts.expenses === 0 && data.expenses.length > 0) {
    let linked = 0;
    for (const e of data.expenses) {
      let plate = e.plate || '';
      if (!plate) {
        const text = (e.notes || '') + ' ' + (e.from || '');
        const match = text.match(/[A-Z]{2}\d{2}\s?[A-Z]{3}/i);
        if (match) plate = normalizePlate(match[0]);
      }
      const stock_id = plate ? (plateToStockId.get(plate) || '') : '';
      if (stock_id) linked++;
      await Expense.create({ ...e, plate, stock_id });
    }
    console.log(`${TAG} Expenses: seeded ${data.expenses.length} records (${linked} linked to vehicles)`);
  } else {
    console.log(`${TAG} Expenses: skipped (${counts.expenses} exist)`);
  }

  // 6. Money In — link to vehicles by plate
  if (counts.moneyIn === 0 && data.moneyIn.length > 0) {
    let linked = 0;
    for (const m of data.moneyIn) {
      const stock_id = m.plate ? (plateToStockId.get(m.plate) || '') : '';
      if (stock_id) linked++;
      await MoneyIn.create({ ...m, stock_id });
    }
    console.log(`${TAG} MoneyIn: seeded ${data.moneyIn.length} records (${linked} linked)`);
  } else {
    console.log(`${TAG} MoneyIn: skipped (${counts.moneyIn} exist)`);
  }

  // 7. Money Out
  if (counts.moneyOut === 0 && data.moneyOut.length > 0) {
    for (const m of data.moneyOut) {
      await MoneyOut.create(m);
    }
    console.log(`${TAG} MoneyOut: seeded ${data.moneyOut.length} records`);
  } else {
    console.log(`${TAG} MoneyOut: skipped (${counts.moneyOut} exist)`);
  }

  // Summary
  const after = {
    vehicles: await Vehicle.countDocuments(),
    investors: await Investor.countDocuments(),
    expenses: await Expense.countDocuments(),
    collections: await Collection.countDocuments(),
    moneyIn: await MoneyIn.countDocuments(),
    moneyOut: await MoneyOut.countDocuments(),
  };
  console.log(`${TAG} === Seed complete ===`);
  console.log(`${TAG} Vehicles: ${after.vehicles} | Investors: ${after.investors} | Expenses: ${after.expenses} | Collections: ${after.collections} | MoneyIn: ${after.moneyIn} | MoneyOut: ${after.moneyOut}`);
}
