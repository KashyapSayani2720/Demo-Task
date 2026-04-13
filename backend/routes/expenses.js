import { Router } from 'express';
import Expense from '../models/Expense.js';
import Vehicle from '../models/Vehicle.js';
import { normalizeAmount, normalizeDate, normalizeMonth, normalizeString, normalizePlate } from '../services/normalize.js';

const router = Router();

router.get('/', async (req, res, next) => {
  try {
    const filter = {};
    if (req.query.month) filter.month = req.query.month;
    if (req.query.category) filter.category = req.query.category;
    if (req.query.stock_id) filter.stock_id = req.query.stock_id;
    const expenses = await Expense.find(filter).sort('-date');
    res.json(expenses);
  } catch (err) { next(err); }
});

router.get('/:id', async (req, res, next) => {
  try {
    const e = await Expense.findById(req.params.id);
    if (!e) return res.status(404).json({ error: 'Expense not found' });
    res.json(e);
  } catch (err) { next(err); }
});

router.post('/', async (req, res, next) => {
  try {
    const b = req.body;
    const plate = normalizePlate(b.plate);
    let stock_id = normalizeString(b.stock_id);

    // Try to resolve stock_id from plate
    if (!stock_id && plate) {
      const v = await Vehicle.findOne({ plate });
      if (v) stock_id = v.stock_id;
    }

    const expense = await Expense.create({
      stock_id,
      plate,
      date: normalizeDate(b.date) || new Date().toISOString().slice(0, 10),
      month: normalizeMonth(b.date || b.month || new Date()),
      category: normalizeString(b.category),
      from: normalizeString(b.from),
      amount: normalizeAmount(b.amount),
      payment_method: normalizeString(b.payment_method),
      paid_by: normalizeString(b.paid_by),
      notes: normalizeString(b.notes)
    });
    res.status(201).json(expense);
  } catch (err) { next(err); }
});

router.put('/:id', async (req, res, next) => {
  try {
    const e = await Expense.findById(req.params.id);
    if (!e) return res.status(404).json({ error: 'Expense not found' });
    const b = req.body;
    if (b.category !== undefined) e.category = normalizeString(b.category);
    if (b.amount !== undefined) e.amount = normalizeAmount(b.amount);
    if (b.date !== undefined) e.date = normalizeDate(b.date);
    if (b.from !== undefined) e.from = normalizeString(b.from);
    if (b.notes !== undefined) e.notes = normalizeString(b.notes);
    if (b.payment_method !== undefined) e.payment_method = normalizeString(b.payment_method);
    if (b.paid_by !== undefined) e.paid_by = normalizeString(b.paid_by);
    await e.save();
    res.json(e);
  } catch (err) { next(err); }
});

router.delete('/:id', async (req, res, next) => {
  try {
    const e = await Expense.findByIdAndDelete(req.params.id);
    if (!e) return res.status(404).json({ error: 'Expense not found' });
    res.json({ message: 'Deleted' });
  } catch (err) { next(err); }
});

export default router;
