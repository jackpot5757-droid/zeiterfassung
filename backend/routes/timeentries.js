const express = require('express');
const { pool } = require('../db/schema');
const { requireAuth, requireAdmin } = require('../middleware/auth');

const router = express.Router();

function calcHours(start, end, breakMin) {
  const [sh, sm] = start.split(':').map(Number);
  const [eh, em] = end.split(':').map(Number);
  const totalMin = (eh * 60 + em) - (sh * 60 + sm) - (breakMin || 0);
  return Math.max(0, Math.round(totalMin / 60 * 100) / 100);
}

// Gehaltsübersicht (muss vor /:id stehen!)
router.get('/report/salary', requireAuth, async (req, res) => {
  try {
    const { month, year } = req.query;
    const y = year || new Date().getFullYear();
    const m = (month || new Date().getMonth() + 1).toString().padStart(2, '0');
    const from = `${y}-${m}-01`;
    const to = `${y}-${m}-31`;

    let query = `
      SELECT u.id as user_id, u.name as employee_name, u.hourly_rate,
             COALESCE(SUM(t.hours_worked), 0) as total_hours,
             COALESCE(SUM(t.travel_costs), 0) as total_travel,
             COALESCE(SUM(t.parking_fees), 0) as total_parking,
             COALESCE(SUM(t.other_costs), 0) as total_other,
             COALESCE(SUM(t.hours_worked * u.hourly_rate), 0) as gross_salary,
             COALESCE(SUM(t.hours_worked * u.hourly_rate + t.travel_costs + t.parking_fees + t.other_costs), 0) as total_payout,
             COUNT(t.id) as entry_count
      FROM users u
      LEFT JOIN time_entries t ON u.id = t.user_id AND t.date BETWEEN $1 AND $2
      WHERE u.role = 'employee'
    `;
    const params = [from, to];

    if (req.user.role !== 'admin') {
      params.push(req.user.id);
      query += ` AND u.id = $${params.length}`;
    }

    query += ' GROUP BY u.id, u.name, u.hourly_rate ORDER BY u.name';
    const { rows } = await pool.query(query, params);
    res.json({ month: m, year: y, report: rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/', requireAuth, async (req, res) => {
  try {
    const { from, to, user_id } = req.query;
    let query = `
      SELECT t.*, u.name as employee_name, u.hourly_rate,
             c.name as client_name
      FROM time_entries t
      JOIN users u ON t.user_id = u.id
      LEFT JOIN clients c ON t.client_id = c.id
      WHERE 1=1
    `;
    const params = [];

    if (req.user.role !== 'admin') {
      params.push(req.user.id);
      query += ` AND t.user_id = $${params.length}`;
    } else if (user_id) {
      params.push(user_id);
      query += ` AND t.user_id = $${params.length}`;
    }

    if (from) { params.push(from); query += ` AND t.date >= $${params.length}`; }
    if (to)   { params.push(to);   query += ` AND t.date <= $${params.length}`; }

    query += ' ORDER BY t.date DESC, t.start_time DESC';
    const { rows } = await pool.query(query, params);

    const enriched = rows.map(e => ({
      ...e,
      salary: Math.round(e.hours_worked * e.hourly_rate * 100) / 100,
      total_costs: Math.round((e.travel_costs + e.parking_fees + e.other_costs) * 100) / 100,
      total_payout: Math.round((e.hours_worked * e.hourly_rate + e.travel_costs + e.parking_fees + e.other_costs) * 100) / 100
    }));

    res.json(enriched);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', requireAuth, async (req, res) => {
  try {
    const { date, start_time, end_time, break_minutes, client_id, travel_costs, parking_fees, other_costs, notes } = req.body;
    if (!date || !start_time || !end_time) return res.status(400).json({ error: 'Datum, Start- und Endzeit erforderlich' });

    const hours = calcHours(start_time, end_time, break_minutes || 0);
    if (hours <= 0) return res.status(400).json({ error: 'Endzeit muss nach Startzeit liegen' });

    const { rows } = await pool.query(
      `INSERT INTO time_entries (user_id, client_id, date, start_time, end_time, break_minutes, hours_worked, travel_costs, parking_fees, other_costs, notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) RETURNING id`,
      [req.user.id, client_id || null, date, start_time, end_time, break_minutes || 0, hours,
       travel_costs || 0, parking_fees || 0, other_costs || 0, notes || null]
    );

    res.json({ id: rows[0].id, hours_worked: hours });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/:id', requireAuth, async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM time_entries WHERE id = $1', [req.params.id]);
    const entry = rows[0];
    if (!entry) return res.status(404).json({ error: 'Eintrag nicht gefunden' });
    if (req.user.role !== 'admin' && entry.user_id !== req.user.id) {
      return res.status(403).json({ error: 'Kein Zugriff' });
    }

    const { date, start_time, end_time, break_minutes, client_id, travel_costs, parking_fees, other_costs, notes } = req.body;
    const hours = calcHours(start_time, end_time, break_minutes || 0);

    await pool.query(
      `UPDATE time_entries SET date=$1, start_time=$2, end_time=$3, break_minutes=$4, hours_worked=$5,
       client_id=$6, travel_costs=$7, parking_fees=$8, other_costs=$9, notes=$10 WHERE id=$11`,
      [date, start_time, end_time, break_minutes || 0, hours, client_id || null,
       travel_costs || 0, parking_fees || 0, other_costs || 0, notes || null, req.params.id]
    );

    res.json({ ok: true, hours_worked: hours });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', requireAuth, async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM time_entries WHERE id = $1', [req.params.id]);
    const entry = rows[0];
    if (!entry) return res.status(404).json({ error: 'Eintrag nicht gefunden' });
    if (req.user.role !== 'admin' && entry.user_id !== req.user.id) {
      return res.status(403).json({ error: 'Kein Zugriff' });
    }
    await pool.query('DELETE FROM time_entries WHERE id = $1', [req.params.id]);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
