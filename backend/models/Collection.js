import mongoose from 'mongoose';

const collectionSchema = new mongoose.Schema({
  stock_id: { type: String, default: '' },
  plate: { type: String, default: '' },
  make_model: { type: String, default: '' },
  source: { type: String, default: '' },
  date_won: { type: String, default: '' },
  collection_date: { type: String, default: '' },
  address: { type: String, default: '' },
  postcode: { type: String, default: '' },
  distance_note: { type: String, default: '' },
  number: { type: String, default: '' },
  status: {
    type: String,
    enum: ['Pending', 'Scheduled', 'Collected'],
    default: 'Pending'
  },
  notes: { type: String, default: '' }
}, { timestamps: true });

export default mongoose.model('Collection', collectionSchema);
