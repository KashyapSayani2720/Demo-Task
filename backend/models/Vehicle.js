import mongoose from 'mongoose';

const vehicleSchema = new mongoose.Schema({
  stock_id: { type: String, unique: true, index: true },
  plate: { type: String, index: true },
  model: { type: String, default: '' },
  month: { type: String, default: '' },
  date_acquired: { type: String, default: '' },
  source: { type: String, default: '' },
  investor: { type: String, default: '' },
  purchase_price: { type: Number, default: 0 },
  recon_cost: { type: Number, default: 0 },
  px_value: { type: Number, default: 0 },
  total_cost: { type: Number, default: 0 },
  status: {
    type: String,
    enum: ['In Stock', 'Live', 'Reserved', 'Sold', 'Delivered', 'SOR', 'Trade'],
    default: 'In Stock'
  },
  date_listed: { type: String, default: '' },
  date_sold: { type: String, default: '' },
  sold_price: { type: Number, default: 0 },
  profit: { type: Number, default: 0 },
  profit_share: { type: String, default: '' },
  investor_profit: { type: Number, default: 0 },
  mp_profit: { type: Number, default: 0 },
  platform: { type: String, default: '' },
  customer_name: { type: String, default: '' },
  contact_info: { type: String, default: '' },
  warranty: { type: String, default: '' },
  invoice_number: { type: String, default: '' },
  autoguard: { type: String, default: '' },
  notes: { type: String, default: '' },
  todo: [String]
}, { timestamps: true });

vehicleSchema.virtual('days_in_stock').get(function () {
  if (!this.date_acquired) return 0;
  const start = new Date(this.date_acquired);
  const end = this.date_sold ? new Date(this.date_sold) : new Date();
  return Math.max(0, Math.floor((end - start) / 86400000));
});

vehicleSchema.set('toJSON', { virtuals: true });
vehicleSchema.set('toObject', { virtuals: true });

export default mongoose.model('Vehicle', vehicleSchema);
