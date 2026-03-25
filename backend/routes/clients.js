const express = require('express');
const { pool } = require('../db/schema');
const { requireAuth, requireAdmin } = require('../middleware/auth');

const router = express.Router();

router.get('/', requireAuth, async (req, res) => {
  try {
    let rows;
    if (req.user.role === 'admin') {
      ({ rows } = await pool.query(`
        SELECT c.*,
          STRING_AGG(u.name, ', ') as assigned_employees
        FROM clients c
        LEFT JOIN client_assignments ca ON c.id = ca.client_id
        LEFT JOIN users u ON ca.user_id = u.id
        GROUP BY c.id
        ORDER BY c.name
      `));
    } else {
      ({ rows } = await pool.query(`
        SELECT c.*
        FROM clients c
        JOIN client_assignments ca ON c.id = ca.client_id
        WHERE ca.user_id = $1
        ORDER BY c.name
      `, [req.user.id]));
    }
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:id', requireAuth, async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM clients WHERE id = $1', [req.params.id]);
    const client = rows[0];
    if (!client) return res.status(404).json({ error: 'Kunde nicht gefunden' });

    if (req.user.role !== 'admin') {
      const { rows: access } = await pool.query(
        'SELECT 1 FROM client_assignments WHERE client_id=$1 AND user_id=$2',
        [req.params.id, req.user.id]
      );
      if (access.length === 0) return res.status(403).json({ error: 'Kein Zugriff auf diesen Kunden' });
    }

    const { rows: assignments } = await pool.query(`
      SELECT u.id, u.name FROM client_assignments ca
      JOIN users u ON ca.user_id = u.id
      WHERE ca.client_id = $1
    `, [req.params.id]);

    res.json({ ...client, assigned_users: assignments });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', requireAdmin, async (req, res) => {
  try {
    const { name, company, street, city, zip, phone, email, notes, assigned_user_ids } = req.body;
    if (!name) return res.status(400).json({ error: 'Name erforderlich' });

    const { rows } = await pool.query(
      'INSERT INTO clients (name, company, street, city, zip, phone, email, notes) VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING id',
      [name.trim(), company || null, street || null, city || null, zip || null, phone || null, email || null, notes || null]
    );
    const clientId = rows[0].id;

    if (assigned_user_ids && assigned_user_ids.length > 0) {
      for (const uid of assigned_user_ids) {
        await pool.query(
          'INSERT INTO client_assignments (client_id, user_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
          [clientId, uid]
        );
      }
    }

    res.json({ id: clientId });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/:id', requireAdmin, async (req, res) => {
  try {
    const { name, company, street, city, zip, phone, email, notes, assigned_user_ids } = req.body;
    const { rows } = await pool.query('SELECT id FROM clients WHERE id = $1', [req.params.id]);
    if (rows.length === 0) return res.status(404).json({ error: 'Kunde nicht gefunden' });

    await pool.query(
      'UPDATE clients SET name=$1, company=$2, street=$3, city=$4, zip=$5, phone=$6, email=$7, notes=$8 WHERE id=$9',
      [name, company || null, street || null, city || null, zip || null, phone || null, email || null, notes || null, req.params.id]
    );

    await pool.query('DELETE FROM client_assignments WHERE client_id = $1', [req.params.id]);
    if (assigned_user_ids && assigned_user_ids.length > 0) {
      for (const uid of assigned_user_ids) {
        await pool.query(
          'INSERT INTO client_assignments (client_id, user_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
          [req.params.id, uid]
        );
      }
    }

    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', requireAdmin, async (req, res) => {
  try {
    await pool.query('DELETE FROM clients WHERE id = $1', [req.params.id]);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
