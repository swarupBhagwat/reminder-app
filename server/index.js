require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const { initDb } = require('./db');
const { initScheduler, checkReminders } = require('./scheduler');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '..', 'public')));

// API routes
app.use('/api/reminders', require('./routes/reminders'));
app.use('/api/push', require('./routes/push'));
app.use('/api/telegram', require('./routes/telegram'));
app.use('/api/todos', require('./routes/todos'));

// Vercel Cron Job endpoint
app.get('/api/cron/check-reminders', async (req, res) => {
  // Verify the request is from Vercel Cron (in production)
  if (process.env.VERCEL && req.headers['authorization'] !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  try {
    await initDb();
    initScheduler();
    const count = await checkReminders();
    res.json({ ok: true, processed: count });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// SPA fallback
app.get('*path', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'index.html'));
});

const PORT = process.env.PORT || 3000;

// Local dev: start server normally
if (!process.env.VERCEL) {
  async function start() {
    await initDb();
    initScheduler();
    app.listen(PORT, () => {
      console.log(`Reminder app running at http://localhost:${PORT}`);
    });
  }
  start().catch(console.error);
}

module.exports = app;
