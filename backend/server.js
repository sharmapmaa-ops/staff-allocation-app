require('dotenv').config();
const fs = require('fs');
const path = require('path');
const express = require('express');
const cors = require('cors');
const { pool } = require('./config/db');

const authRoutes = require('./routes/auth');
const employeeRoutes = require('./routes/employees');
const projectRoutes = require('./routes/projects');
const settingsRoutes = require('./routes/settings');
const timeEntryRoutes = require('./routes/timeentry');
const reportRoutes = require('./routes/reports');
const dashboardRoutes = require('./routes/dashboard');
const notificationRoutes = require('./routes/notifications');
const migrationRoutes = require('./routes/migration');

const app = express();

const allowedOrigins = (process.env.CORS_ORIGIN || '')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.length === 0 || allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
}));
app.use(express.json());

app.get('/', (req, res) => res.json({ status: 'ok', service: 'staff-allocation-backend' }));
app.get('/api/health', (req, res) => res.json({ status: 'ok', time: new Date().toISOString() }));

app.use('/api/auth', authRoutes);
app.use('/api/employees', employeeRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/time-entries', timeEntryRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/migration', migrationRoutes);

app.use((req, res) => res.status(404).json({ error: 'Not found.' }));
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Internal server error.' });
});

const PORT = process.env.PORT || 4000;

// Ensure base tables exist before accepting traffic (idempotent - safe on every boot).
// This only creates empty tables/indexes; reference & demo DATA is loaded separately
// from Settings > Migration inside the app (see routes/migration.js), so that a fresh
// deploy always has a working login system without needing data pre-seeded.
async function ensureSchema() {
  try {
    const schemaSql = fs.readFileSync(path.join(__dirname, 'db', 'schema.sql'), 'utf8');
    await pool.query(schemaSql);
    console.log('[server] Database schema verified/created.');
  } catch (err) {
    console.error('[server] Could not verify/create database schema on boot:', err.message);
    console.error('[server] The API will still start, but requests that touch the DB will fail until DATABASE_URL is reachable.');
  }
}

ensureSchema().finally(() => {
  app.listen(PORT, () => console.log(`[server] Staff Allocation API listening on port ${PORT}`));
});
