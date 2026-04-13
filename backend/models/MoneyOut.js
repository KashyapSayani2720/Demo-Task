const mongoose = require('mongoose');

const moneyOutSchema = new mongoose.Schema({
  date: { type: String, default: '' },
  month: { type: String, default: '' },
  category: { type: String, default: '' },
  amount: { type: Number, default: 0 },
  notes: { type: String, default: '' }
}, { timestamps: true });

module.exports = mongoose.model('MoneyOut', moneyOutSchema);
