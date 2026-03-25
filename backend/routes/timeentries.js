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
      SELECT
        u.id as user_id,
        u.name as employee_name,
        u.hourly_rate,
        u.km_rate,
        u.travel_flat_rate,
        COALESCE(SUM(t.hours_worked), 0) as total_hours,
        COALESCE(SUM(t.kilometers), 0) as total_km,
        COALESCE(SUM(t.parking_fees), 0) as total_parking,
        COALESCE(SUM(t.hours_worked * u.hourly_rate), 0) as gross_salary,
        COALESCE(SUM(t.kilometers * u.km_rate), 0) as total_km_costs,
        COALESCE(COUNT(DISTINCT t.date), 0) as work_days,
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

    query += ' GROUP BY u.id, u.name, u.hourly_rate, u.km_rate, u.travel_flat_rate ORDER BY u.name';
    const { rows } = await pool.query(query, params);

    // Anfahrtspauschale pro Besuch (pro Eintrag)
    const report = rows.map(r => {
      const travel_total = Number(r.entry_count) * Number(r.travel_flat_rate);
      const total_payout = Number(r.gross_salary) + Number(r.total_km_costs) + travel_total + Number(r.total_parking);
      return {
        ...r,
        travel_total: Math.round(travel_total * 100) / 100,
        total_payout: Math.round(total_payout * 100) / 100,
        gross_salary: Math.round(Number(r.gross_salary) * 100) / 100,
        total_km_costs: Math.round(Number(r.total_km_costs) * 100) / 100,
        total_parking: Math.round(Number(r.total_parking) * 100) / 100,
        total_km: Math.round(Number(r.total_km) * 100) / 100,
        total_hours: Math.round(Number(r.total_hours) * 100) / 100,
      };
    });

    res.json({ month: m, year: y, report });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/', requireAuth, async (req, res) => {
  try {
    const { from, to, user_id } = req.query;
    let query = `
      SELECT t.*, u.name as employee_name, u.hourly_rate, u.km_rate, u.travel_flat_rate,
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
      km_costs: Math.round(e.kilometers * e.km_rate * 100) / 100,
      travel_flat: Math.round(e.travel_flat_rate * 100) / 100,
      total_payout: Math.round((
        e.hours_worked * e.hourly_rate +
        e.kilometers * e.km_rate +
        e.travel_flat_rate +
        e.parking_fees
      ) * 100) / 100
    }));

    res.json(enriched);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', requireAuth, async (req, res) => {
  try {
    const { date, start_time, end_time, break_minutes, client_id, kilometers, parking_fees, notes } = req.body;
    if (!date || !start_time || !end_time) return res.status(400).json({ error: 'Datum, Start- und Endzeit erforderlich' });

    const hours = calcHours(start_time, end_time, break_minutes || 0);
    if (hours <= 0) return res.status(400).json({ error: 'Endzeit muss nach Startzeit liegen' });

    const { rows } = await pool.query(
      `INSERT INTO time_entries (user_id, client_id, date, start_time, end_time, break_minutes, hours_worked, kilometers, parking_fees, notes)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING id`,
      [req.user.id, client_id || null, date, start_time, end_time,
       break_minutes || 0, hours, kilometers || 0, parking_fees || 0, notes || null]
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

    const { date, start_time, end_time, break_minutes, client_id, kilometers, parking_fees, notes } = req.body;
    const hours = calcHours(start_time, end_time, break_minutes || 0);

    await pool.query(
      `UPDATE time_entries SET date=$1, start_time=$2, end_time=$3, break_minutes=$4, hours_worked=$5,
       client_id=$6, kilometers=$7, parking_fees=$8, notes=$9 WHERE id=$10`,
      [date, start_time, end_time, break_minutes || 0, hours,
       client_id || null, kilometers || 0, parking_fees || 0, notes || null, req.params.id]
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
