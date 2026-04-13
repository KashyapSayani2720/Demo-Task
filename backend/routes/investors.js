import { Router } from 'express';
import Investor from '../models/Investor.js';
import { calculateInvestor, calculateAllInvestors } from '../services/investorCalculator.js';
import { normalizeAmount, normalizeString } from '../services/normalize.js';
import { createInvestorFolder } from '../services/fileManager.js';

const router = Router();

// GET /api/investors
router.get('/', async (req, res, next) => {
  try {
    const investors = await Investor.find().sort('name');
    const result = await calculateAllInvestors(investors);
    res.json(result);
  } catch (err) { next(err); }
});

// GET /api/investors/:id
router.get('/:id', async (req, res, next) => {
  try {
    const inv = await Investor.findById(req.params.id);
    if (!inv) return res.status(404).json({ error: 'Investor not found' });
    const result = await calculateInvestor(inv);
    res.json(result);
  } catch (err) { next(err); }
});

// POST /api/investors
router.post('/', async (req, res, next) => {
  try {
    const b = req.body;
    const inv = await Investor.create({
      name: normalizeString(b.name),
      initial_balance: normalizeAmount(b.initial_balance),
      capital_returned: normalizeAmount(b.capital_returned),
      notes: normalizeString(b.notes)
    });
    createInvestorFolder(inv.name);
    const result = await calculateInvestor(inv);
    res.status(201).json(result);
  } catch (err) { next(err); }
});

// PUT /api/investors/:id
router.put('/:id', async (req, res, next) => {
  try {
    const inv = await Investor.findById(req.params.id);
    if (!inv) return res.status(404).json({ error: 'Investor not found' });
    const b = req.body;
    if (b.name !== undefined) inv.name = normalizeString(b.name);
    if (b.initial_balance !== undefined) inv.initial_balance = normalizeAmount(b.initial_balance);
    if (b.capital_returned !== undefined) inv.capital_returned = normalizeAmount(b.capital_returned);
    if (b.notes !== undefined) inv.notes = normalizeString(b.notes);
    await inv.save();
    const result = await calculateInvestor(inv);
    res.json(result);
  } catch (err) { next(err); }
});

// DELETE /api/investors/:id
router.delete('/:id', async (req, res, next) => {
  try {
    const inv = await Investor.findByIdAndDelete(req.params.id);
    if (!inv) return res.status(404).json({ error: 'Investor not found' });
    res.json({ message: 'Deleted' });
  } catch (err) { next(err); }
});

export default router;
