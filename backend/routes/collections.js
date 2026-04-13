import { Router } from 'express';
import Collection from '../models/Collection.js';
import Vehicle from '../models/Vehicle.js';
import { nextStockId } from '../services/stockIdGenerator.js';
import { createVehicleFolders } from '../services/fileManager.js';
import { normalizePlate, normalizeDate, normalizeString } from '../services/normalize.js';

const router = Router();

router.get('/', async (req, res, next) => {
  try {
    const filter = {};
    if (req.query.status) filter.status = req.query.status;
    const collections = await Collection.find(filter).sort('-date_won');
    res.json(collections);
  } catch (err) { next(err); }
});

router.get('/:id', async (req, res, next) => {
  try {
    const c = await Collection.findById(req.params.id);
    if (!c) return res.status(404).json({ error: 'Collection not found' });
    res.json(c);
  } catch (err) { next(err); }
});

router.post('/', async (req, res, next) => {
  try {
    const b = req.body;
    const c = await Collection.create({
      plate: normalizePlate(b.plate),
      make_model: normalizeString(b.make_model),
      source: normalizeString(b.source),
      date_won: normalizeDate(b.date_won),
      collection_date: normalizeDate(b.collection_date),
      address: normalizeString(b.address),
      postcode: normalizeString(b.postcode),
      distance_note: normalizeString(b.distance_note),
      number: normalizeString(b.number),
      notes: normalizeString(b.notes),
      status: b.status || 'Pending'
    });
    res.status(201).json(c);
  } catch (err) { next(err); }
});

router.put('/:id', async (req, res, next) => {
  try {
    const c = await Collection.findById(req.params.id);
    if (!c) return res.status(404).json({ error: 'Collection not found' });
    const b = req.body;
    if (b.plate !== undefined) c.plate = normalizePlate(b.plate);
    if (b.make_model !== undefined) c.make_model = normalizeString(b.make_model);
    if (b.source !== undefined) c.source = normalizeString(b.source);
    if (b.date_won !== undefined) c.date_won = normalizeDate(b.date_won);
    if (b.collection_date !== undefined) c.collection_date = normalizeDate(b.collection_date);
    if (b.address !== undefined) c.address = normalizeString(b.address);
    if (b.postcode !== undefined) c.postcode = normalizeString(b.postcode);
    if (b.status !== undefined) c.status = b.status;
    if (b.notes !== undefined) c.notes = normalizeString(b.notes);
    await c.save();
    res.json(c);
  } catch (err) { next(err); }
});

router.delete('/:id', async (req, res, next) => {
  try {
    const c = await Collection.findByIdAndDelete(req.params.id);
    if (!c) return res.status(404).json({ error: 'Collection not found' });
    res.json({ message: 'Deleted' });
  } catch (err) { next(err); }
});

// POST /api/collections/:id/convert — convert collection to stock vehicle
router.post('/:id/convert', async (req, res, next) => {
  try {
    const c = await Collection.findById(req.params.id);
    if (!c) return res.status(404).json({ error: 'Collection not found' });
    const stock_id = await nextStockId();
    const vehicle = await Vehicle.create({
      stock_id,
      plate: c.plate,
      model: c.make_model,
      source: c.source,
      date_acquired: c.collection_date || new Date().toISOString().slice(0, 10),
      month: c.collection_date ? c.collection_date.slice(0, 7) + '-01' : '',
      status: 'In Stock',
      notes: `Converted from collection. ${c.notes || ''}`
    });
    createVehicleFolders(stock_id);
    c.status = 'Collected';
    c.stock_id = stock_id;
    await c.save();
    res.status(201).json({ vehicle, collection: c });
  } catch (err) { next(err); }
});

export default router;
