const express = require('express');
const router = express.Router();
const { db } = require('../db');

// List all reminders
router.get('/', async (req, res) => {
  const result = await db.execute('SELECT * FROM reminders ORDER BY datetime ASC');
  res.json(result.rows);
});

// Create reminder
router.post('/', async (req, res) => {
  const { title, message, datetime, repeat, priority } = req.body;
  if (!title || !datetime) {
    return res.status(400).json({ error: 'title and datetime are required' });
  }
  const result = await db.execute({
    sql: 'INSERT INTO reminders (title, message, datetime, repeat, priority) VALUES (?, ?, ?, ?, ?)',
    args: [title, message || '', datetime, repeat || 'none', priority || 'medium'],
  });
  res.status(201).json({ id: Number(result.lastInsertRowid), title, message, datetime, repeat, priority });
});

// Update reminder
router.put('/:id', async (req, res) => {
  const { title, message, datetime, repeat, priority } = req.body;
  await db.execute({
    sql: 'UPDATE reminders SET title = ?, message = ?, datetime = ?, repeat = ?, priority = ?, notified = 0 WHERE id = ?',
    args: [title, message, datetime, repeat || 'none', priority || 'medium', req.params.id],
  });
  res.json({ success: true });
});

// Delete reminder
router.delete('/:id', async (req, res) => {
  await db.execute({ sql: 'DELETE FROM reminders WHERE id = ?', args: [req.params.id] });
  res.json({ success: true });
});

module.exports = router;
