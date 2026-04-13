import { Router } from 'express';
import MoneyOut from '../models/MoneyOut.js';
import { normalizeAmount, normalizeDate, normalizeMonth, normalizeString } from '../services/normalize.js';

const router = Router();

router.get('/', async (req, res, next) => {
  try {
    const filter = {};
    if (req.query.month) filter.month = req.query.month;
    const items = await MoneyOut.find(filter).sort('-date');
    res.json(items);
  } catch (err) { next(err); }
});

router.post('/', async (req, res, next) => {
  try {
    const b = req.body;
    const item = await MoneyOut.create({
      date: normalizeDate(b.date) || new Date().toISOString().slice(0, 10),
      month: normalizeMonth(b.date || b.month || new Date()),
      category: normalizeString(b.category),
      amount: normalizeAmount(b.amount),
      notes: normalizeString(b.notes)
    });
    res.status(201).json(item);
  } catch (err) { next(err); }
});

router.put('/:id', async (req, res, next) => {
  try {
    const item = await MoneyOut.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!item) return res.status(404).json({ error: 'Not found' });
    res.json(item);
  } catch (err) { next(err); }
});

router.delete('/:id', async (req, res, next) => {
  try {
    const item = await MoneyOut.findByIdAndDelete(req.params.id);
    if (!item) return res.status(404).json({ error: 'Not found' });
    res.json({ message: 'Deleted' });
  } catch (err) { next(err); }
});

export default router;
