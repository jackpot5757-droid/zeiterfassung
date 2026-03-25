import { useState, useEffect } from 'react';
import { api } from '../api.js';

const today = () => new Date().toISOString().split('T')[0];

export default function EntryModal({ entry, onClose, onSaved }) {
  const [form, setForm] = useState({
    date: entry?.date || today(),
    start_time: entry?.start_time || '08:00',
    end_time: entry?.end_time || '17:00',
    break_minutes: entry?.break_minutes || 0,
    client_id: entry?.client_id || '',
    kilometers: entry?.kilometers || 0,
    parking_fees: entry?.parking_fees || 0,
    notes: entry?.notes || '',
  });
  const [clients, setClients] = useState([]);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.getClients().then(setClients).catch(() => {});
  }, []);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const calcHours = () => {
    const [sh, sm] = form.start_time.split(':').map(Number);
    const [eh, em] = form.end_time.split(':').map(Number);
    const mins = (eh * 60 + em) - (sh * 60 + sm) - Number(form.break_minutes);
    return Math.max(0, Math.round(mins / 60 * 100) / 100);
  };

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      const payload = {
        ...form,
        client_id: form.client_id || null,
        break_minutes: Number(form.break_minutes),
        kilometers: Number(form.kilometers),
        parking_fees: Number(form.parking_fees),
      };
      if (entry?.id) {
        await api.updateEntry(entry.id, payload);
      } else {
        await api.createEntry(payload);
      }
      onSaved();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const hours = calcHours();

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-header">
          <h2 className="modal-title">{entry ? 'Eintrag bearbeiten' : 'Neue Zeiterfassung'}</h2>
          <button className="btn btn-ghost btn-sm" onClick={onClose}>✕</button>
        </div>

        {error && <div className="alert alert-danger">{error}</div>}

        <form onSubmit={submit}>
          <div className="form-group">
            <label className="form-label">Datum</label>
            <input className="form-input" type="date" value={form.date}
              onChange={e => set('date', e.target.value)} required />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Beginn</label>
              <input className="form-input" type="time" value={form.start_time}
                onChange={e => set('start_time', e.target.value)} required />
            </div>
            <div className="form-group">
              <label className="form-label">Ende</label>
              <input className="form-input" type="time" value={form.end_time}
                onChange={e => set('end_time', e.target.value)} required />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Pause (Minuten)</label>
              <input className="form-input" type="number" min="0" value={form.break_minutes}
                onChange={e => set('break_minutes', e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Netto-Stunden</label>
              <input className="form-input" value={`${hours} Std.`} readOnly
                style={{ background: 'var(--primary-light)', color: 'var(--primary)', fontWeight: 700 }} />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Klient</label>
            <select className="form-input" value={form.client_id}
              onChange={e => set('client_id', e.target.value)}>
              <option value="">– bitte wählen –</option>
              {clients.map(c => (
                <option key={c.id} value={c.id}>
                  {c.name}{c.vorname ? `, ${c.vorname}` : ''}
                </option>
              ))}
            </select>
          </div>

          <div className="section-title" style={{ marginTop: 4 }}>Fahrt & Kosten</div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Gefahrene km</label>
              <input className="form-input" type="number" step="0.1" min="0" value={form.kilometers}
                onChange={e => set('kilometers', e.target.value)} placeholder="0" />
            </div>
            <div className="form-group">
              <label className="form-label">Parkgebühren €</label>
              <input className="form-input" type="number" step="0.01" min="0" value={form.parking_fees}
                onChange={e => set('parking_fees', e.target.value)} placeholder="0.00" />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Notiz</label>
            <input className="form-input" type="text" value={form.notes}
              onChange={e => set('notes', e.target.value)} placeholder="Optional..." />
          </div>

          <button className="btn btn-primary btn-full" type="submit" disabled={saving}>
            {saving ? 'Speichern...' : (entry ? 'Änderungen speichern' : 'Eintrag speichern')}
          </button>
        </form>
      </div>
    </div>
  );
}
