const express = require('express');
const router = express.Router();

router.get('/status', (req, res) => {
  const configured = !!(process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_CHAT_ID);
  res.json({ configured });
});

module.exports = router;
