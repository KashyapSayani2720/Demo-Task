import { Router } from 'express';
import Task from '../models/Task.js';
import { normalizeDate, normalizeString } from '../services/normalize.js';

const router = Router();

router.get('/', async (req, res, next) => {
  try {
    const tasks = await Task.find().sort('-due_date');
    res.json(tasks);
  } catch (err) { next(err); }
});

router.post('/', async (req, res, next) => {
  try {
    const b = req.body;
    const task = await Task.create({
      stock_id: normalizeString(b.stock_id),
      title: normalizeString(b.title),
      due_date: normalizeDate(b.due_date),
      status: b.status || 'Pending',
      notes: normalizeString(b.notes)
    });
    res.status(201).json(task);
  } catch (err) { next(err); }
});

router.put('/:id', async (req, res, next) => {
  try {
    const t = await Task.findById(req.params.id);
    if (!t) return res.status(404).json({ error: 'Not found' });
    Object.assign(t, req.body);
    await t.save();
    res.json(t);
  } catch (err) { next(err); }
});

router.delete('/:id', async (req, res, next) => {
  try {
    const t = await Task.findByIdAndDelete(req.params.id);
    if (!t) return res.status(404).json({ error: 'Not found' });
    res.json({ message: 'Deleted' });
  } catch (err) { next(err); }
});

export default router;
