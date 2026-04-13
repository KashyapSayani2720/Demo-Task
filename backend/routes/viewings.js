import { Router } from 'express';
import Viewing from '../models/Viewing.js';
import { normalizeDate, normalizeString } from '../services/normalize.js';

const router = Router();

router.get('/', async (req, res, next) => {
  try {
    const viewings = await Viewing.find().sort('-date');
    res.json(viewings);
  } catch (err) { next(err); }
});

router.post('/', async (req, res, next) => {
  try {
    const b = req.body;
    const viewing = await Viewing.create({
      stock_id: normalizeString(b.stock_id),
      vehicle: normalizeString(b.vehicle),
      name: normalizeString(b.name),
      phone: normalizeString(b.phone),
      date: normalizeDate(b.date) || new Date().toISOString().slice(0, 10),
      time: normalizeString(b.time),
      source: normalizeString(b.source),
      finance: normalizeString(b.finance),
      delivery: normalizeString(b.delivery),
      status: b.status || 'Booked',
      notes: normalizeString(b.notes)
    });
    res.status(201).json(viewing);
  } catch (err) { next(err); }
});

router.put('/:id', async (req, res, next) => {
  try {
    const v = await Viewing.findById(req.params.id);
    if (!v) return res.status(404).json({ error: 'Not found' });
    Object.assign(v, req.body);
    await v.save();
    res.json(v);
  } catch (err) { next(err); }
});

router.delete('/:id', async (req, res, next) => {
  try {
    const v = await Viewing.findByIdAndDelete(req.params.id);
    if (!v) return res.status(404).json({ error: 'Not found' });
    res.json({ message: 'Deleted' });
  } catch (err) { next(err); }
});

export default router;
