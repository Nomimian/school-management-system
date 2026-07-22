require('dotenv').config();
const express    = require('express');
const cors       = require('cors');
const morgan     = require('morgan');
const connectDB  = require('./config/db');
const routes     = require('./routes/index');
const errorHandler = require('./middleware/errorHandler');

const app = express();

// Connect MongoDB
connectDB();

// Middleware
app.use(cors({ origin: ['http://localhost:5173', 'http://localhost:5174', 'http://localhost:5175', 'http://localhost:3000'], credentials: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
if (process.env.NODE_ENV === 'development') app.use(morgan('dev'));

// Health check
// Serve uploaded files
app.use('/uploads', require('express').static(require('path').join(__dirname, 'uploads')));

app.get('/', (req, res) => res.json({ message: '🏫 School Management API is running', version: '1.0.0' }));
app.get('/health', (req, res) => res.json({ status: 'OK', timestamp: new Date() }));

// API Routes
// NOTE: SuperAdmin MUST be mounted before the tenant '/api' router — the tenant
// router has a catch-all `protect, requireSchool` guard that would otherwise
// intercept every /api/superadmin/* request (including the open /login).
app.use('/api/superadmin', require('./routes/superadmin'));
app.use('/api', routes);

// 404
app.use('*', (req, res) => res.status(404).json({ success: false, message: `Route ${req.originalUrl} not found.` }));

// Error handler
app.use(errorHandler);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server running on http://localhost:${PORT}`));

module.exports = app;
