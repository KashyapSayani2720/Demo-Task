import 'dotenv/config';
import mongoose from 'mongoose';
import path from 'path';
import { fileURLToPath } from 'url';
import { parseWorkbook } from '../backend/services/excelImport.js';
import { nextStockId, resetCounter } from '../backend/services/stockIdGenerator.js';
import { normalizePlate } from '../backend/services/normalize.js';
import Vehicle from '../backend/models/Vehicle.js';
import Investor from '../backend/models/Investor.js';
import Expense from '../backend/models/Expense.js';
import Collection from '../backend/models/Collection.js';
import MoneyIn from '../backend/models/MoneyIn.js';
import MoneyOut from '../backend/models/MoneyOut.js';
import Counter from '../backend/models/Counter.js';
import { createVehicleFolders } from '../backend/services/fileManager.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const XLSX_PATH = path.join(__dirname, 'Master_Spreadsheet.xlsx');

async function seed() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB');

    // Drop all collections (idempotent)
    const collections = await mongoose.connection.db.listCollections().toArray();
    for (const col of collections) {
      await mongoose.connection.db.dropCollection(col.name);
    }
    console.log('Dropped all existing collections');

    // Reset counter
    await resetCounter(0);

    // Parse workbook
    console.log('Reading workbook...');
    const data = await parseWorkbook(XLSX_PATH);
    console.log(`Parsed: ${data.soldStock.length} sold, ${data.stockData.length} stock, ${data.collections.length} collections, ${data.investors.length} investors, ${data.expenses.length} expenses, ${data.moneyIn.length} money_in, ${data.moneyOut.length} money_out`);

    // 1. Import Investors
    for (const inv of data.investors) {
      await Investor.create(inv);
    }
    console.log(`Imported ${data.investors.length} investors`);

    // 2. Import Sold Vehicles (from Sold Stock sheet)
    const plateToStockId = new Map();
    let soldCount = 0;
    for (const v of data.soldStock) {
      if (!v.plate) continue;
      const stock_id = await nextStockId();
      plateToStockId.set(v.plate, stock_id);
      await Vehicle.create({ ...v, stock_id });
      soldCount++;
    }
    console.log(`Imported ${soldCount} sold vehicles`);

    // 3. Import Stock Vehicles (from Stock Data sheet)
    // Skip rows that are already in the sold set (by plate match)
    let stockCount = 0;
    let skippedCount = 0;
    for (const v of data.stockData) {
      if (!v.plate) continue;
      const existing = plateToStockId.get(v.plate);
      if (existing) {
        // Already imported from Sold Stock - update with additional fields if needed
        skippedCount++;
        continue;
      }
      const stock_id = await nextStockId();
      plateToStockId.set(v.plate, stock_id);
      await Vehicle.create({ ...v, stock_id });
      stockCount++;
    }
    console.log(`Imported ${stockCount} stock vehicles (${skippedCount} skipped as already sold)`);

    // 4. Import Collections
    for (const c of data.collections) {
      await Collection.create(c);
    }
    console.log(`Imported ${data.collections.length} collections`);

    // 5. Import Expenses — link to stock_id by plate where possible
    let expLinked = 0;
    for (const e of data.expenses) {
      // Try to match plate from notes/from field
      let plate = e.plate || '';
      if (!plate) {
        const text = (e.notes || '') + ' ' + (e.from || '');
        const match = text.match(/[A-Z]{2}\d{2}\s?[A-Z]{3}/i);
        if (match) plate = normalizePlate(match[0]);
      }
      const stock_id = plate ? (plateToStockId.get(plate) || '') : '';
      if (stock_id) expLinked++;
      await Expense.create({ ...e, plate, stock_id });
    }
    console.log(`Imported ${data.expenses.length} expenses (${expLinked} linked to vehicles)`);

    // 6. Import Money In — link to stock_id by plate
    let miLinked = 0;
    for (const m of data.moneyIn) {
      const stock_id = m.plate ? (plateToStockId.get(m.plate) || '') : '';
      if (stock_id) miLinked++;
      await MoneyIn.create({ ...m, stock_id });
    }
    console.log(`Imported ${data.moneyIn.length} money_in records (${miLinked} linked)`);

    // 7. Import Money Out
    for (const m of data.moneyOut) {
      await MoneyOut.create(m);
    }
    console.log(`Imported ${data.moneyOut.length} money_out records`);

    // 8. Create vehicle folders on disk
    const allVehicles = await Vehicle.find({}, 'stock_id');
    let folderCount = 0;
    for (const v of allVehicles) {
      try { createVehicleFolders(v.stock_id); folderCount++; } catch (e) { /* skip */ }
    }
    console.log(`Created folders for ${folderCount} vehicles`);

    // Summary
    const totalVehicles = await Vehicle.countDocuments();
    const totalSold = await Vehicle.countDocuments({ status: 'Sold' });
    const totalStock = totalVehicles - totalSold;
    console.log('\n=== SEED COMPLETE ===');
    console.log(`Vehicles: ${totalVehicles} total (${totalStock} in stock, ${totalSold} sold)`);
    console.log(`Investors: ${await Investor.countDocuments()}`);
    console.log(`Expenses: ${await Expense.countDocuments()}`);
    console.log(`Collections: ${await Collection.countDocuments()}`);
    console.log(`Money In: ${await MoneyIn.countDocuments()}`);
    console.log(`Money Out: ${await MoneyOut.countDocuments()}`);

  } catch (err) {
    console.error('Seed failed:', err);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

seed();
