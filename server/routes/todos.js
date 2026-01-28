const express = require('express');
const router = express.Router();
const { db } = require('../db');

// List all todos
router.get('/', async (req, res) => {
  const result = await db.execute('SELECT * FROM todos ORDER BY completed ASC, sort_order ASC, created_at DESC');
  res.json(result.rows);
});

// Create todo
router.post('/', async (req, res) => {
  const { title, priority } = req.body;
  if (!title) return res.status(400).json({ error: 'title is required' });
  const result = await db.execute({
    sql: 'INSERT INTO todos (title, priority) VALUES (?, ?)',
    args: [title, priority || 'medium'],
  });
  res.status(201).json({ id: Number(result.lastInsertRowid), title, priority: priority || 'medium' });
});

// Update todo
router.put('/:id', async (req, res) => {
  const { title, completed, priority, sort_order } = req.body;
  const fields = [];
  const args = [];
  if (title !== undefined) { fields.push('title = ?'); args.push(title); }
  if (completed !== undefined) { fields.push('completed = ?'); args.push(completed ? 1 : 0); }
  if (priority !== undefined) { fields.push('priority = ?'); args.push(priority); }
  if (sort_order !== undefined) { fields.push('sort_order = ?'); args.push(sort_order); }
  if (!fields.length) return res.status(400).json({ error: 'No fields to update' });
  args.push(req.params.id);
  await db.execute({ sql: `UPDATE todos SET ${fields.join(', ')} WHERE id = ?`, args });
  res.json({ success: true });
});

// Delete todo
router.delete('/:id', async (req, res) => {
  await db.execute({ sql: 'DELETE FROM todos WHERE id = ?', args: [req.params.id] });
  res.json({ success: true });
});

// Batch reorder
router.put('/reorder/batch', async (req, res) => {
  const { items } = req.body; // [{id, sort_order}]
  if (!items?.length) return res.status(400).json({ error: 'No items' });
  const stmts = items.map(i => ({
    sql: 'UPDATE todos SET sort_order = ? WHERE id = ?',
    args: [i.sort_order, i.id],
  }));
  await db.batch(stmts);
  res.json({ success: true });
});

module.exports = router;
