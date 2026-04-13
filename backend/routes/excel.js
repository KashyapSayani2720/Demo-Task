import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { generateWorkbook } from '../services/excelExport.js';
import { parseWorkbook } from '../services/excelImport.js';
import { nextStockId } from '../services/stockIdGenerator.js';
import { normalizePlate } from '../services/normalize.js';
import { createVehicleFolders } from '../services/fileManager.js';
import Vehicle from '../models/Vehicle.js';
import Investor from '../models/Investor.js';
import Expense from '../models/Expense.js';
import Collection from '../models/Collection.js';
import MoneyIn from '../models/MoneyIn.js';
import MoneyOut from '../models/MoneyOut.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const upload = multer({ dest: path.join(__dirname, '..', '..', 'storage', 'temp') });
const router = Router();

// GET /api/excel/export — download workbook
router.get('/export', async (req, res, next) => {
  try {
    const wb = await generateWorkbook();
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=DealerOS_Export.xlsx');
    await wb.xlsx.write(res);
    res.end();
  } catch (err) { next(err); }
});

// POST /api/excel/import — upload and import workbook (upsert mode)
router.post('/import', upload.single('file'), async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
    const filePath = req.file.path;
    const data = await parseWorkbook(filePath);

    let added = 0, updated = 0, skipped = 0;

    // Build plate -> stock_id map from existing vehicles
    const existingVehicles = await Vehicle.find({}, 'stock_id plate');
    const plateMap = new Map();
    for (const v of existingVehicles) {
      if (v.plate) plateMap.set(v.plate, v.stock_id);
    }

    // Upsert sold vehicles
    for (const v of data.soldStock) {
      if (!v.plate) { skipped++; continue; }
      const existing = await Vehicle.findOne({ plate: v.plate });
      if (existing) {
        Object.assign(existing, v);
        await existing.save();
        updated++;
      } else {
        const stock_id = await nextStockId();
        await Vehicle.create({ ...v, stock_id });
        createVehicleFolders(stock_id);
        added++;
      }
    }

    // Upsert stock vehicles
    for (const v of data.stockData) {
      if (!v.plate) { skipped++; continue; }
      const existing = await Vehicle.findOne({ plate: v.plate });
      if (existing) {
        // Don't overwrite sold data with stock data
        if (existing.status !== 'Sold') {
          Object.assign(existing, v);
          await existing.save();
          updated++;
        } else {
          skipped++;
        }
      } else {
        const stock_id = await nextStockId();
        await Vehicle.create({ ...v, stock_id });
        createVehicleFolders(stock_id);
        added++;
      }
    }

    // Upsert investors
    for (const inv of data.investors) {
      await Investor.findOneAndUpdate({ name: inv.name }, inv, { upsert: true });
    }

    // Append new expenses, money in, money out, collections
    if (data.expenses.length) await Expense.insertMany(data.expenses);
    if (data.moneyIn.length) await MoneyIn.insertMany(data.moneyIn);
    if (data.moneyOut.length) await MoneyOut.insertMany(data.moneyOut);
    if (data.collections.length) await Collection.insertMany(data.collections);

    // Cleanup temp file
    fs.unlinkSync(filePath);

    res.json({
      message: 'Import complete',
      added,
      updated,
      skipped,
      expenses: data.expenses.length,
      moneyIn: data.moneyIn.length,
      moneyOut: data.moneyOut.length,
      collections: data.collections.length
    });
  } catch (err) { next(err); }
});

export default router;
