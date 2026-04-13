const mongoose = require('mongoose');

const investorSchema = new mongoose.Schema({
  name: { type: String, unique: true, required: true },
  initial_balance: { type: Number, default: 0 },
  capital_returned: { type: Number, default: 0 },
  notes: { type: String, default: '' }
}, { timestamps: true });

module.exports = mongoose.model('Investor', investorSchema);
