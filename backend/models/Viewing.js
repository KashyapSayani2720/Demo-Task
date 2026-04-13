const mongoose = require('mongoose');

const viewingSchema = new mongoose.Schema({
  stock_id: { type: String, default: '' },
  vehicle: { type: String, default: '' },
  name: { type: String, default: '' },
  phone: { type: String, default: '' },
  date: { type: String, default: '' },
  time: { type: String, default: '' },
  source: { type: String, default: '' },
  finance: { type: String, default: '' },
  delivery: { type: String, default: '' },
  status: { type: String, default: 'Booked' },
  notes: { type: String, default: '' },
  outcome: { type: String, default: '' }
}, { timestamps: true });

module.exports = mongoose.model('Viewing', viewingSchema);
