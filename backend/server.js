import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import path from 'path';
import { fileURLToPath } from 'url';
import connectDB from './config/db.js';
import errorHandler from './middleware/errorHandler.js';

// Route imports
import bootstrapRouter from './routes/bootstrap.js';
import vehiclesRouter from './routes/vehicles.js';
import soldRouter from './routes/sold.js';
import investorsRouter from './routes/investors.js';
import expensesRouter from './routes/expenses.js';
import collectionsRouter from './routes/collections.js';
import moneyInRouter from './routes/moneyIn.js';
import moneyOutRouter from './routes/moneyOut.js';
import viewingsRouter from './routes/viewings.js';
import tasksRouter from './routes/tasks.js';
import finesRouter from './routes/fines.js';
import excelRouter from './routes/excel.js';

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

// API Routes
app.use('/api/bootstrap', bootstrapRouter);
app.use('/api/vehicles', vehiclesRouter);
app.use('/api/sold', soldRouter);
app.use('/api/investors', investorsRouter);
app.use('/api/expenses', expensesRouter);
app.use('/api/collections', collectionsRouter);
app.use('/api/money-in', moneyInRouter);
app.use('/api/money-out', moneyOutRouter);
app.use('/api/viewings', viewingsRouter);
app.use('/api/tasks', tasksRouter);
app.use('/api/fines', finesRouter);
app.use('/api/excel', excelRouter);

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
