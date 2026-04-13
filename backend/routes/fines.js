import { Router } from 'express';
import Fine from '../models/Fine.js';
import { normalizeAmount, normalizeDate, normalizeString, normalizePlate } from '../services/normalize.js';

const router = Router();

router.get('/', async (req, res, next) => {
  try {
    const fines = await Fine.find().sort('-date');
    res.json(fines);
  } catch (err) { next(err); }
});

router.post('/', async (req, res, next) => {
  try {
    const b = req.body;
    const fine = await Fine.create({
      stock_id: normalizeString(b.stock_id),
      plate: normalizePlate(b.plate),
      type: normalizeString(b.type),
      date: normalizeDate(b.date) || new Date().toISOString().slice(0, 10),
      due: normalizeDate(b.due),
      amount: normalizeAmount(b.amount),
      ref: normalizeString(b.ref),
      reason: normalizeString(b.reason),
      status: b.status || 'Unpaid',
      notes: normalizeString(b.notes)
    });
    res.status(201).json(fine);
  } catch (err) { next(err); }
});

router.put('/:id', async (req, res, next) => {
  try {
    const f = await Fine.findById(req.params.id);
    if (!f) return res.status(404).json({ error: 'Not found' });
    const b = req.body;
    if (b.status !== undefined) f.status = b.status;
    if (b.amount !== undefined) f.amount = normalizeAmount(b.amount);
    if (b.notes !== undefined) f.notes = normalizeString(b.notes);
    if (b.date !== undefined) f.date = normalizeDate(b.date);
    if (b.due !== undefined) f.due = normalizeDate(b.due);
    await f.save();
    res.json(f);
  } catch (err) { next(err); }
});

router.delete('/:id', async (req, res, next) => {
  try {
    const f = await Fine.findByIdAndDelete(req.params.id);
    if (!f) return res.status(404).json({ error: 'Not found' });
    res.json({ message: 'Deleted' });
  } catch (err) { next(err); }
});

export default router;
