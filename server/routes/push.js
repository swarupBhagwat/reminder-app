const express = require('express');
const router = express.Router();
const { db } = require('../db');

// Save push subscription
router.post('/subscribe', async (req, res) => {
  const { endpoint, keys } = req.body;
  if (!endpoint || !keys) {
    return res.status(400).json({ error: 'Invalid subscription' });
  }
  await db.execute({
    sql: `INSERT OR REPLACE INTO push_subscriptions (endpoint, keys_p256dh, keys_auth) VALUES (?, ?, ?)`,
    args: [endpoint, keys.p256dh, keys.auth],
  });
  res.json({ success: true });
});

// Get VAPID public key
router.get('/vapid-key', (req, res) => {
  res.json({ key: process.env.VAPID_PUBLIC_KEY });
});

module.exports = router;
