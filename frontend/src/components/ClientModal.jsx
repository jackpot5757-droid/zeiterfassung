import { useState, useEffect } from 'react';
import { api } from '../api.js';

export default function ClientModal({ client, onClose, onSaved }) {
  const [form, setForm] = useState({
    name: client?.name || '',
    vorname: client?.vorname || '',
    street: client?.street || '',
    zip: client?.zip || '',
    city: client?.city || '',
    phone: client?.phone || '',
    geburtsdatum: client?.geburtsdatum || '',
    versichertennummer: client?.versichertennummer || '',
    krankenkasse: client?.krankenkasse || '',
    pflegegrad: client?.pflegegrad || 0,
    krankheiten: client?.krankheiten || '',
    notes: client?.notes || '',
    assigned_user_ids: [],
  });
  const [users, setUsers] = useState([]);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.getUsers().then(setUsers).catch(() => {});
    if (client?.id) {
      api.getClient(client.id).then(c => {
        setForm(f => ({ ...f, assigned_user_ids: (c.assigned_users || []).map(u => u.id) }));
      }).catch(() => {});
    }
  }, []);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const toggleUser = (uid) => {
    setForm(f => ({
      ...f,
      assigned_user_ids: f.assigned_user_ids.includes(uid)
        ? f.assigned_user_ids.filter(id => id !== uid)
        : [...f.assigned_user_ids, uid]
    }));
  };

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      if (client?.id) {
        await api.updateClient(client.id, form);
      } else {
        await api.createClient(form);
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
          <h2 className="modal-title">{client ? 'Klient bearbeiten' : 'Neuer Klient'}</h2>
          <button className="btn btn-ghost btn-sm" onClick={onClose}>✕</button>
        </div>

        {error && <div className="alert alert-danger">{error}</div>}

        <form onSubmit={submit}>
          <div className="section-title">Stammdaten</div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Nachname *</label>
              <input className="form-input" value={form.name}
                onChange={e => set('name', e.target.value)} required placeholder="Mustermann" />
            </div>
            <div className="form-group">
              <label className="form-label">Vorname</label>
              <input className="form-input" value={form.vorname}
                onChange={e => set('vorname', e.target.value)} placeholder="Max" />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Straße & Hausnummer</label>
            <input className="form-input" value={form.street}
              onChange={e => set('street', e.target.value)} placeholder="Musterstraße 1" />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">PLZ</label>
              <input className="form-input" value={form.zip}
                onChange={e => set('zip', e.target.value)} placeholder="12345" />
            </div>
            <div className="form-group">
              <label className="form-label">Ort</label>
              <input className="form-input" value={form.city}
                onChange={e => set('city', e.target.value)} placeholder="Berlin" />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Telefon</label>
              <input className="form-input" type="tel" value={form.phone}
                onChange={e => set('phone', e.target.value)} placeholder="02372 12345" />
            </div>
            <div className="form-group">
              <label className="form-label">Geburtsdatum</label>
              <input className="form-input" type="date" value={form.geburtsdatum}
                onChange={e => set('geburtsdatum', e.target.value)} />
            </div>
          </div>

          <div className="section-title" style={{ marginTop: 4 }}>Pflege & Versicherung</div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Pflegegrad</label>
              <select className="form-input" value={form.pflegegrad}
                onChange={e => set('pflegegrad', e.target.value)}>
                <option value={0}>– kein –</option>
                <option value={1}>Pflegegrad 1</option>
                <option value={2}>Pflegegrad 2</option>
                <option value={3}>Pflegegrad 3</option>
                <option value={4}>Pflegegrad 4</option>
                <option value={5}>Pflegegrad 5</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Krankenkasse</label>
              <input className="form-input" value={form.krankenkasse}
                onChange={e => set('krankenkasse', e.target.value)} placeholder="AOK, TK, IKK..." />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Versichertennummer</label>
            <input className="form-input" value={form.versichertennummer}
              onChange={e => set('versichertennummer', e.target.value)} placeholder="A123456789" />
          </div>

          <div className="form-group">
            <label className="form-label">Krankheiten / Diagnosen</label>
            <textarea className="form-input" value={form.krankheiten}
              onChange={e => set('krankheiten', e.target.value)}
              placeholder="z.B. Diabetes, Hypertonie, Demenz..."
              rows={3} style={{ resize: 'vertical' }} />
          </div>

          <div className="form-group">
            <label className="form-label">Notizen</label>
            <textarea className="form-input" value={form.notes}
              onChange={e => set('notes', e.target.value)}
              placeholder="Besondere Hinweise..."
              rows={2} style={{ resize: 'vertical' }} />
          </div>

          {users.length > 0 && (
            <div className="form-group">
              <div className="section-title" style={{ marginBottom: 8 }}>Zugewiesene Mitarbeiter</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {users.filter(u => u.role === 'employee').map(u => (
                  <label key={u.id} style={{
                    display: 'flex', alignItems: 'center', gap: 6, padding: '7px 12px',
                    border: `1.5px solid ${form.assigned_user_ids.includes(u.id) ? 'var(--primary)' : 'var(--gray-200)'}`,
                    borderRadius: 8, cursor: 'pointer',
                    background: form.assigned_user_ids.includes(u.id) ? 'var(--primary-light)' : 'white',
                    fontSize: 13, fontWeight: 500
                  }}>
                    <input type="checkbox" checked={form.assigned_user_ids.includes(u.id)}
                      onChange={() => toggleUser(u.id)} style={{ display: 'none' }} />
                    {form.assigned_user_ids.includes(u.id) ? '✓' : '+'} {u.name}
                  </label>
                ))}
              </div>
            </div>
          )}

          <button className="btn btn-primary btn-full" type="submit" disabled={saving}>
            {saving ? 'Speichern...' : (client ? 'Änderungen speichern' : 'Klient anlegen')}
          </button>
        </form>
      </div>
    </div>
  );
}
