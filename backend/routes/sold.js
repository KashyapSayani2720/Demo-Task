import { Router } from 'express';
import Vehicle from '../models/Vehicle.js';

const router = Router();

// GET /api/sold — shortcut for sold vehicles
router.get('/', async (req, res, next) => {
  try {
    const filter = { status: 'Sold' };
    if (req.query.month) filter.month = req.query.month;
    if (req.query.investor) filter.investor = req.query.investor;
    const sold = await Vehicle.find(filter).sort('-date_sold');
    res.json(sold);
  } catch (err) { next(err); }
});

export default router;
