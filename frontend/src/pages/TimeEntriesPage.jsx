import { useState, useEffect } from 'react';
import { api } from '../api.js';
import { useAuth } from '../App.jsx';
import EntryModal from '../components/EntryModal.jsx';

export default function TimeEntriesPage() {
  const { user } = useAuth();
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [filter, setFilter] = useState(() => {
    const now = new Date();
    return { from: `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-01`, to: '' };
  });

  const load = async () => {
    setLoading(true);
    try {
      const params = {};
      if (filter.from) params.from = filter.from;
      if (filter.to) params.to = filter.to;
      const data = await api.getEntries(params);
      setEntries(data);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [filter]);

  const openNew = () => { setEditing(null); setShowModal(true); };
  const openEdit = (e) => { setEditing(e); setShowModal(true); };
  const closeModal = () => { setShowModal(false); setEditing(null); };
  const onSaved = () => { closeModal(); load(); };

  const deleteEntry = async (id) => {
    if (!confirm('Eintrag löschen?')) return;
    try { await api.deleteEntry(id); load(); } catch(e) { alert(e.message); }
  };

  const totals = entries.reduce((a, e) => ({
    hours: a.hours + Number(e.hours_worked),
    payout: a.payout + Number(e.total_payout),
  }), { hours: 0, payout: 0 });

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Zeiterfassung</h1>
      </div>

      <div className="card" style={{ padding: '12px 14px', marginBottom: 12 }}>
        <div className="form-row">
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Von</label>
            <input className="form-input" type="date" value={filter.from}
              onChange={e => setFilter(f => ({ ...f, from: e.target.value }))} />
          </div>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Bis</label>
            <input className="form-input" type="date" value={filter.to}
              onChange={e => setFilter(f => ({ ...f, to: e.target.value }))} />
          </div>
        </div>
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-label">Stunden gesamt</div>
          <div className="stat-value">{totals.hours.toFixed(1)}h</div>
          <div className="stat-sub">{entries.length} Einträge</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Auszahlung</div>
          <div className="stat-value" style={{ color: 'var(--success)' }}>
            {totals.payout.toFixed(2)} €
          </div>
          <div className="stat-sub">inkl. aller Kosten</div>
        </div>
      </div>

      {loading ? <div className="spinner" /> : entries.length === 0 ? (
        <div className="empty">
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
          <p>Keine Einträge gefunden</p>
        </div>
      ) : entries.map(e => (
        <div key={e.id} className="entry-item">
          <div className="entry-item-header">
            <div>
              <div style={{ fontWeight: 600, fontSize: 15 }}>{formatDate(e.date)}</div>
              {user.role === 'admin' && (
                <div className="entry-date">{e.employee_name}</div>
              )}
              {e.client_name && (
                <span className="badge badge-blue" style={{ marginTop: 4, display: 'inline-block' }}>
                  {e.client_name}{e.client_vorname ? `, ${e.client_vorname}` : ''}
                </span>
              )}
            </div>
            <div className="entry-hours">{Number(e.hours_worked).toFixed(2)}h</div>
          </div>

          <div className="entry-meta">
            <span>🕐 {e.start_time} – {e.end_time}</span>
            {e.break_minutes > 0 && <span>☕ {e.break_minutes} Min Pause</span>}
            {Number(e.kilometers) > 0 && <span>🚗 {Number(e.kilometers).toFixed(1)} km</span>}
            {Number(e.parking_fees) > 0 && <span>🅿️ {Number(e.parking_fees).toFixed(2)} €</span>}
          </div>

          {e.notes && (
            <div style={{ fontSize: 13, color: 'var(--gray-500)', marginTop: 6 }}>
              📝 {e.notes}
            </div>
          )}

          <div style={{ marginTop: 8, fontSize: 12, color: 'var(--gray-500)', display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            <span>Lohn: {Number(e.salary).toFixed(2)} €</span>
            {Number(e.km_costs) > 0 && <span>km-Kosten: {Number(e.km_costs).toFixed(2)} €</span>}
            {Number(e.travel_flat) > 0 && <span>Anfahrt: {Number(e.travel_flat).toFixed(2)} €</span>}
            {Number(e.parking_fees) > 0 && <span>Parken: {Number(e.parking_fees).toFixed(2)} €</span>}
            <strong style={{ color: 'var(--success)' }}>Gesamt: {Number(e.total_payout).toFixed(2)} €</strong>
          </div>

          {(user.role === 'admin' || e.user_id === user.id) && (
            <div className="entry-actions">
              <button className="btn btn-ghost btn-sm" onClick={() => openEdit(e)}>✏️ Bearbeiten</button>
              <button className="btn btn-ghost btn-sm" style={{ color: 'var(--danger)' }} onClick={() => deleteEntry(e.id)}>🗑 Löschen</button>
            </div>
          )}
        </div>
      ))}

      <button className="fab" onClick={openNew}>+</button>

      {showModal && (
        <EntryModal entry={editing} onClose={closeModal} onSaved={onSaved} />
      )}
    </div>
  );
}

function formatDate(dateStr) {
  const [y, m, d] = dateStr.split('-');
  const days = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'];
  const date = new Date(y, m - 1, d);
  return `${days[date.getDay()]}, ${d}.${m}.${y}`;
}
