import mongoose from 'mongoose';

const moneyInSchema = new mongoose.Schema({
  date: { type: String, default: '' },
  month: { type: String, default: '' },
  category: { type: String, default: '' },
  amount: { type: Number, default: 0 },
  stock_id: { type: String, default: '' },
  plate: { type: String, default: '' },
  notes: { type: String, default: '' }
}, { timestamps: true });

export default mongoose.model('MoneyIn', moneyInSchema);
