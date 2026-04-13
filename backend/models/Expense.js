import mongoose from 'mongoose';

const expenseSchema = new mongoose.Schema({
  stock_id: { type: String, default: '' },
  plate: { type: String, default: '' },
  date: { type: String, default: '' },
  month: { type: String, default: '' },
  category: { type: String, default: '' },
  from: { type: String, default: '' },
  amount: { type: Number, default: 0 },
  payment_method: { type: String, default: '' },
  paid_by: { type: String, default: '' },
  notes: { type: String, default: '' }
}, { timestamps: true });

export default mongoose.model('Expense', expenseSchema);
