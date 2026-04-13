const Counter = require('../models/Counter');

async function nextStockId() {
  const c = await Counter.findOneAndUpdate(
    { _id: 'stock_id' },
    { $inc: { seq: 1 } },
    { new: true, upsert: true }
  );
  return 'STK-' + String(c.seq).padStart(4, '0');
}

async function resetCounter(startAt = 0) {
  await Counter.findOneAndUpdate(
    { _id: 'stock_id' },
    { seq: startAt },
    { upsert: true }
  );
}

module.exports = { nextStockId, resetCounter };
