const mongoose = require('mongoose');

const fineSchema = new mongoose.Schema({
  stock_id: { type: String, default: '' },
  plate: { type: String, default: '' },
  type: { type: String, default: '' },
  date: { type: String, default: '' },
  due: { type: String, default: '' },
  amount: { type: Number, default: 0 },
  ref: { type: String, default: '' },
  reason: { type: String, default: '' },
  status: {
    type: String,
    enum: ['Unpaid', 'Paid', 'Appealing'],
    default: 'Unpaid'
  },
  notes: { type: String, default: '' }
}, { timestamps: true });

module.exports = mongoose.model('Fine', fineSchema);
