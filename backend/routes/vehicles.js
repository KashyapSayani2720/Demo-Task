import { Router } from 'express';
import Vehicle from '../models/Vehicle.js';
import Investor from '../models/Investor.js';
import MoneyIn from '../models/MoneyIn.js';
import { nextStockId } from '../services/stockIdGenerator.js';
import { normalizePlate, normalizeDate, normalizeMonth, normalizeAmount, normalizeString } from '../services/normalize.js';
import { createVehicleFolders, listVehicleFiles } from '../services/fileManager.js';
import upload from '../middleware/upload.js';

const DEFAULT_INVESTOR_SPLIT = 0.5;

const router = Router();

// GET /api/vehicles — list with optional filters
router.get('/', async (req, res, next) => {
  try {
    const filter = {};
    if (req.query.status) filter.status = req.query.status;
    if (req.query.investor) filter.investor = req.query.investor;
    if (req.query.month) filter.month = req.query.month;
    const vehicles = await Vehicle.find(filter).sort('-date_acquired');
    res.json(vehicles);
  } catch (err) { next(err); }
});

// GET /api/vehicles/:stock_id
router.get('/:stock_id', async (req, res, next) => {
  try {
    const v = await Vehicle.findOne({ stock_id: req.params.stock_id });
    if (!v) return res.status(404).json({ error: 'Vehicle not found' });
    res.json(v);
  } catch (err) { next(err); }
});

// POST /api/vehicles — create new vehicle
router.post('/', async (req, res, next) => {
  try {
    const stock_id = await nextStockId();
    const b = req.body;
    const price = normalizeAmount(b.purchase_price);
    const recon = normalizeAmount(b.recon_cost);
    const vehicle = await Vehicle.create({
      stock_id,
      plate: normalizePlate(b.plate),
      make_model: normalizeString(b.make_model),
      month: normalizeMonth(b.date_acquired || new Date()),
      date_acquired: normalizeDate(b.date_acquired) || new Date().toISOString().slice(0, 10),
      source: normalizeString(b.source),
      investor: normalizeString(b.investor),
      purchase_price: price,
      recon_cost: recon,
      px_value: normalizeAmount(b.px_value),
      total_cost: price + recon,
      status: b.status || 'In Stock',
      notes: normalizeString(b.notes)
    });
    createVehicleFolders(stock_id);
    res.status(201).json(vehicle);
  } catch (err) { next(err); }
});

// PUT /api/vehicles/:stock_id — update
router.put('/:stock_id', async (req, res, next) => {
  try {
    const v = await Vehicle.findOne({ stock_id: req.params.stock_id });
    if (!v) return res.status(404).json({ error: 'Vehicle not found' });
    const b = req.body;
    if (b.plate !== undefined) v.plate = normalizePlate(b.plate);
    if (b.make_model !== undefined) v.make_model = normalizeString(b.make_model);
    if (b.source !== undefined) v.source = normalizeString(b.source);
    if (b.investor !== undefined) v.investor = normalizeString(b.investor);
    if (b.purchase_price !== undefined) v.purchase_price = normalizeAmount(b.purchase_price);
    if (b.recon_cost !== undefined) v.recon_cost = normalizeAmount(b.recon_cost);
    if (b.px_value !== undefined) v.px_value = normalizeAmount(b.px_value);
    if (b.status !== undefined) v.status = b.status;
    if (b.notes !== undefined) v.notes = normalizeString(b.notes);
    if (b.date_acquired !== undefined) v.date_acquired = normalizeDate(b.date_acquired);
    if (b.date_listed !== undefined) v.date_listed = normalizeDate(b.date_listed);
    v.total_cost = v.purchase_price + v.recon_cost;
    await v.save();
    res.json(v);
  } catch (err) { next(err); }
});

// DELETE /api/vehicles/:stock_id
router.delete('/:stock_id', async (req, res, next) => {
  try {
    const v = await Vehicle.findOneAndDelete({ stock_id: req.params.stock_id });
    if (!v) return res.status(404).json({ error: 'Vehicle not found' });
    res.json({ message: 'Deleted', stock_id: req.params.stock_id });
  } catch (err) { next(err); }
});

// POST /api/vehicles/:stock_id/sell — mark as sold
router.post('/:stock_id/sell', async (req, res, next) => {
  try {
    const v = await Vehicle.findOne({ stock_id: req.params.stock_id });
    if (!v) return res.status(404).json({ error: 'Vehicle not found' });
    const b = req.body;
    v.status = 'Sold';
    v.sold_price = normalizeAmount(b.sold_price);
    v.date_sold = normalizeDate(b.date_sold) || new Date().toISOString().slice(0, 10);
    v.customer_name = normalizeString(b.customer_name);
    v.contact_info = normalizeString(b.contact_info);
    v.warranty = normalizeString(b.warranty);
    v.invoice_number = normalizeString(b.invoice_number);
    v.platform = normalizeString(b.platform);
    v.autoguard = normalizeString(b.autoguard);
    v.profit = v.sold_price - v.total_cost;
    v.month = normalizeMonth(v.date_sold);

    // Split profit between investor and dealership (MP)
    if (v.investor) {
      const investorExists = await Investor.findOne({ name: v.investor });
      if (investorExists) {
        v.investor_profit = +(v.profit * DEFAULT_INVESTOR_SPLIT).toFixed(2);
        v.mp_profit = +(v.profit - v.investor_profit).toFixed(2);
      } else {
        v.investor_profit = 0;
        v.mp_profit = v.profit;
      }
    } else {
      v.investor_profit = 0;
      v.mp_profit = v.profit;
    }

    await v.save();

    // Auto-create MoneyIn record for the sale
    await MoneyIn.create({
      date: v.date_sold,
      month: v.month,
      category: 'Vehicle Sale',
      amount: v.sold_price,
      stock_id: v.stock_id,
      plate: v.plate,
      notes: `${v.make_model} - ${v.plate}`
    });

    res.json(v);
  } catch (err) { next(err); }
});

// GET /api/vehicles/:stock_id/files — list files by category
router.get('/:stock_id/files', async (req, res, next) => {
  try {
    const files = listVehicleFiles(req.params.stock_id);
    res.json(files);
  } catch (err) { next(err); }
});

// POST /api/vehicles/:stock_id/files — upload file
router.post('/:stock_id/files', upload.single('file'), async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
    res.json({
      message: 'File uploaded',
      path: `/files/Cars/${req.params.stock_id}/${req.body.category || 'Documents'}/${req.file.filename}`
    });
  } catch (err) { next(err); }
});

export default router;
