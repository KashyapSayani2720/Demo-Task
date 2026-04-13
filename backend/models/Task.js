const mongoose = require('mongoose');

const taskSchema = new mongoose.Schema({
  stock_id: { type: String, default: '' },
  title: { type: String, default: '' },
  due_date: { type: String, default: '' },
  status: { type: String, default: 'Pending' },
  notes: { type: String, default: '' }
}, { timestamps: true });

module.exports = mongoose.model('Task', taskSchema);
