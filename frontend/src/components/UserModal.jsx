import { useState } from 'react';
import { api } from '../api.js';

export default function UserModal({ user, onClose, onSaved }) {
  const [form, setForm] = useState({
    name: user?.name || '',
    email: user?.email || '',
    password: '',
    role: user?.role || 'employee',
    hourly_rate: user?.hourly_rate ?? 0,
    km_rate: user?.km_rate ?? 0.30,
    travel_flat_rate: user?.travel_flat_rate ?? 0,
  });
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    if (!user && !form.password) return setError('Passwort ist erforderlich');
    if (form.password && form.password.length < 6) return setError('Passwort mind. 6 Zeichen');
    setSaving(true);
    try {
      if (user?.id) {
        await api.updateUser(user.id, form);
      } else {
        await api.createUser(form);
      }
      onSaved();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-header">
          <h2 className="modal-title">{user ? 'Mitarbeiter bearbeiten' : 'Neuer Mitarbeiter'}</h2>
          <button className="btn btn-ghost btn-sm" onClick={onClose}>✕</button>
        </div>

        {error && <div className="alert alert-danger">{error}</div>}

        <form onSubmit={submit}>
          <div className="form-group">
            <label className="form-label">Name *</label>
            <input className="form-input" value={form.name}
              onChange={e => set('name', e.target.value)} required placeholder="Max Mustermann" />
          </div>

          <div className="form-group">
            <label className="form-label">E-Mail *</label>
            <input className="form-input" type="email" value={form.email}
              onChange={e => set('email', e.target.value)} required placeholder="max@firma.de" />
          </div>

          <div className="form-group">
            <label className="form-label">{user ? 'Neues Passwort (leer = unverändert)' : 'Passwort *'}</label>
            <input className="form-input" type="password" value={form.password}
              onChange={e => set('password', e.target.value)}
              placeholder={user ? 'Leer lassen = nicht ändern' : 'Mind. 6 Zeichen'}
              required={!user} />
          </div>

          <div className="form-group">
            <label className="form-label">Rolle</label>
            <select className="form-input" value={form.role} onChange={e => set('role', e.target.value)}>
              <option value="employee">Mitarbeiter</option>
              <option value="admin">Administrator</option>
            </select>
          </div>

          <div className="section-title" style={{ marginTop: 4 }}>Vergütung</div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Stundenlohn (€)</label>
              <input className="form-input" type="number" step="0.01" min="0" value={form.hourly_rate}
                onChange={e => set('hourly_rate', e.target.value)} placeholder="0.00" />
            </div>
            <div className="form-group">
              <label className="form-label">km-Satz (€/km)</label>
              <input className="form-input" type="number" step="0.01" min="0" value={form.km_rate}
                onChange={e => set('km_rate', e.target.value)} placeholder="0.30" />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Anfahrtspauschale (€ pro Arbeitstag)</label>
            <input className="form-input" type="number" step="0.01" min="0" value={form.travel_flat_rate}
              onChange={e => set('travel_flat_rate', e.target.value)} placeholder="0.00" />
          </div>

          <button className="btn btn-primary btn-full" type="submit" disabled={saving}>
            {saving ? 'Speichern...' : (user ? 'Änderungen speichern' : 'Mitarbeiter anlegen')}
          </button>
        </form>
      </div>
    </div>
  );
}
