import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import path from 'path';
import { fileURLToPath } from 'url';
import connectDB from './config/db.js';
import errorHandler from './middleware/errorHandler.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 5050;

// Connect to MongoDB
connectDB();

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(morgan('dev'));

// Static files
app.use(express.static(path.join(__dirname, '..', 'frontend')));
app.use('/files', express.static(path.join(__dirname, '..', process.env.STORAGE_ROOT || 'storage')));

// API Routes (will be added in Phase 6)
// app.use('/api/bootstrap', bootstrapRouter);
// app.use('/api/vehicles', vehiclesRouter);
// ... etc

// Fallback: serve frontend for non-API routes
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'frontend', 'index.html'));
});

// Error handler
app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`DealerOS server running on http://localhost:${PORT}`);
});

export default app;
