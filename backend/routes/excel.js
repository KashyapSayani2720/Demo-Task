import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import os from 'os';
import { fileURLToPath } from 'url';
import { generateWorkbook } from '../services/excelExport.js';
import { parseWorkbook } from '../services/excelImport.js';
import { nextStockId } from '../services/stockIdGenerator.js';
import mongoose from 'mongoose';
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

// Use os.tmpdir() so this works on Vercel (/tmp) and locally
const upload = multer({ dest: os.tmpdir() });
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

    // Validate file type before attempting to parse
    const ext = path.extname(req.file.originalname).toLowerCase();
    if (ext !== '.xlsx' && ext !== '.xls') {
      fs.unlinkSync(filePath);
      return res.status(400).json({
        error: `Unsupported file format "${ext}". Please upload a valid Excel file.\n\nSupported formats:\n  • .xlsx (Excel Workbook)\n  • .xls (Excel 97-2003 Workbook)`
      });
    }

    let data;
    try {
      data = await parseWorkbook(filePath);
    } catch (parseErr) {
      fs.unlinkSync(filePath);
      return res.status(400).json({
        error: 'The uploaded file could not be read as a valid Excel workbook. Please make sure the file is not corrupted and is in .xlsx or .xls format.'
      });
    }

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
    let investorsProcessed = 0;
    for (const inv of data.investors) {
      if (!inv.name) { skipped++; continue; }
      await Investor.findOneAndUpdate({ name: inv.name }, inv, { upsert: true });
      investorsProcessed++;
    }

    // Helper: build a bulkWrite op that matches by _id (from app export)
    // or falls back to a composite key (for external/new records).
    function upsertOp(record, fallbackFilter) {
      const { _id, ...fields } = record;
      if (_id && mongoose.isValidObjectId(_id)) {
        // Existing record from a previous export — match exactly by _id
        return { updateOne: { filter: { _id }, update: { $set: fields } } };
      }
      // New row added in Excel or external file — upsert by composite key
      return { updateOne: { filter: fallbackFilter, update: { $set: fields }, upsert: true } };
    }

    // Upsert expenses
    let expensesAdded = 0, expensesUpdated = 0;
    if (data.expenses.length) {
      const ops = data.expenses.map(e =>
        upsertOp(e, { date: e.date, month: e.month, category: e.category, from: e.from })
      );
      const r = await Expense.bulkWrite(ops);
      expensesAdded = r.upsertedCount;
      expensesUpdated = r.modifiedCount;
    }

    // Upsert money in
    let moneyInAdded = 0, moneyInUpdated = 0;
    if (data.moneyIn.length) {
      const ops = data.moneyIn.map(m =>
        upsertOp(m, { date: m.date, month: m.month, category: m.category, plate: m.plate })
      );
      const r = await MoneyIn.bulkWrite(ops);
      moneyInAdded = r.upsertedCount;
      moneyInUpdated = r.modifiedCount;
    }

    // Upsert money out
    let moneyOutAdded = 0, moneyOutUpdated = 0;
    if (data.moneyOut.length) {
      const ops = data.moneyOut.map(m =>
        upsertOp(m, { date: m.date, month: m.month, category: m.category, amount: m.amount })
      );
      const r = await MoneyOut.bulkWrite(ops);
      moneyOutAdded = r.upsertedCount;
      moneyOutUpdated = r.modifiedCount;
    }

    // Upsert collections
    let collectionsAdded = 0, collectionsUpdated = 0;
    if (data.collections.length) {
      const ops = data.collections.map(c =>
        upsertOp(c, { plate: c.plate, date_won: c.date_won })
      );
      const r = await Collection.bulkWrite(ops);
      collectionsAdded = r.upsertedCount;
      collectionsUpdated = r.modifiedCount;
    }

    // Cleanup temp file
    fs.unlinkSync(filePath);

    console.log('[Excel Import] DB results:', {
      vehiclesAdded: added, vehiclesUpdated: updated, vehiclesSkipped: skipped,
      investorsProcessed,
      expensesAdded, expensesUpdated,
      moneyInAdded, moneyInUpdated,
      moneyOutAdded, moneyOutUpdated,
      collectionsAdded, collectionsUpdated
    });

    res.json({
      message: 'Import complete',
      added,
      updated,
      skipped,
      investorsProcessed,
      expensesAdded,
      expensesUpdated,
      moneyInAdded,
      moneyInUpdated,
      moneyOutAdded,
      moneyOutUpdated,
      collectionsAdded,
      collectionsUpdated
    });
  } catch (err) { next(err); }
});

export default router;
