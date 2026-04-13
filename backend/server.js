require('dotenv').config();
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const path = require('path');
const connectDB = require('./config/db');
const errorHandler = require('./middleware/errorHandler');

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
// app.use('/api/bootstrap', require('./routes/bootstrap'));
// app.use('/api/vehicles', require('./routes/vehicles'));
// app.use('/api/sold', require('./routes/sold'));
// app.use('/api/investors', require('./routes/investors'));
// app.use('/api/expenses', require('./routes/expenses'));
// app.use('/api/collections', require('./routes/collections'));
// app.use('/api/money-in', require('./routes/moneyIn'));
// app.use('/api/money-out', require('./routes/moneyOut'));
// app.use('/api/viewings', require('./routes/viewings'));
// app.use('/api/tasks', require('./routes/tasks'));
// app.use('/api/fines', require('./routes/fines'));
// app.use('/api/excel', require('./routes/excel'));
// app.use('/api/files', require('./routes/files'));

// Fallback: serve frontend for non-API routes
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'frontend', 'index.html'));
});

// Error handler
app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`DealerOS server running on http://localhost:${PORT}`);
});

module.exports = app;
