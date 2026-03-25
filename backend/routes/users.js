const express = require('express');
const bcrypt = require('bcryptjs');
const { pool } = require('../db/schema');
const { requireAuth, requireAdmin } = require('../middleware/auth');

const router = express.Router();

router.get('/', requireAdmin, async (req, res) => {
  try {
    const { rows } = await pool.query(
      'SELECT id, name, email, role, hourly_rate, km_rate, travel_flat_rate, created_at FROM users ORDER BY name'
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', requireAdmin, async (req, res) => {
  try {
    const { name, email, password, role, hourly_rate, km_rate, travel_flat_rate } = req.body;
    if (!name || !email || !password) return res.status(400).json({ error: 'Name, E-Mail und Passwort erforderlich' });

    const { rows: existing } = await pool.query('SELECT id FROM users WHERE email = $1', [email.toLowerCase().trim()]);
    if (existing.length > 0) return res.status(400).json({ error: 'E-Mail bereits vergeben' });

    const hash = bcrypt.hashSync(password, 10);
    const { rows } = await pool.query(
      'INSERT INTO users (name, email, password_hash, role, hourly_rate, km_rate, travel_flat_rate) VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING id',
      [name.trim(), email.toLowerCase().trim(), hash, role || 'employee',
       hourly_rate || 0, km_rate ?? 0.30, travel_flat_rate || 0]
    );
    res.json({ id: rows[0].id, name, email, role: role || 'employee' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/:id', requireAdmin, async (req, res) => {
  try {
    const { name, email, password, role, hourly_rate, km_rate, travel_flat_rate } = req.body;
    const { rows } = await pool.query('SELECT id FROM users WHERE id = $1', [req.params.id]);
    if (rows.length === 0) return res.status(404).json({ error: 'Mitarbeiter nicht gefunden' });

    if (password && password.length >= 6) {
      const hash = bcrypt.hashSync(password, 10);
      await pool.query(
        'UPDATE users SET name=$1, email=$2, password_hash=$3, role=$4, hourly_rate=$5, km_rate=$6, travel_flat_rate=$7 WHERE id=$8',
        [name, email.toLowerCase().trim(), hash, role, hourly_rate, km_rate ?? 0.30, travel_flat_rate || 0, req.params.id]
      );
    } else {
      await pool.query(
        'UPDATE users SET name=$1, email=$2, role=$3, hourly_rate=$4, km_rate=$5, travel_flat_rate=$6 WHERE id=$7',
        [name, email.toLowerCase().trim(), role, hourly_rate, km_rate ?? 0.30, travel_flat_rate || 0, req.params.id]
      );
    }
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', requireAdmin, async (req, res) => {
  try {
    if (parseInt(req.params.id) === req.user.id) {
      return res.status(400).json({ error: 'Kann sich nicht selbst löschen' });
    }
    await pool.query('DELETE FROM users WHERE id = $1', [req.params.id]);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/me/profile', requireAuth, async (req, res) => {
  try {
    const { rows } = await pool.query(
      'SELECT id, name, email, role, hourly_rate, km_rate, travel_flat_rate FROM users WHERE id = $1',
      [req.user.id]
    );
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
