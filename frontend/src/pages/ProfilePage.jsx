import { useState } from 'react';
import { api } from '../api.js';
import { useAuth } from '../App.jsx';

export default function ProfilePage() {
  const { user, logout } = useAuth();
  const [oldPw, setOldPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [msg, setMsg] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const changePassword = async (e) => {
    e.preventDefault();
    setMsg(''); setError('');
    if (newPw !== confirmPw) return setError('Passwörter stimmen nicht überein');
    if (newPw.length < 6) return setError('Neues Passwort mind. 6 Zeichen');
    setSaving(true);
    try {
      await api.changePassword(oldPw, newPw);
      setMsg('Passwort erfolgreich geändert!');
      setOldPw(''); setNewPw(''); setConfirmPw('');
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Mein Profil</h1>
      </div>

      {/* Profil-Info */}
      <div className="card" style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 12 }}>
          <div style={{
            width: 52, height: 52, borderRadius: '50%', background: 'var(--primary)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: 'white', fontSize: 20, fontWeight: 700
          }}>
            {user.name.charAt(0).toUpperCase()}
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: 17 }}>{user.name}</div>
            <div style={{ color: 'var(--gray-500)', fontSize: 13 }}>{user.email}</div>
            <span className={`badge ${user.role === 'admin' ? 'badge-orange' : 'badge-blue'}`} style={{ marginTop: 4 }}>
              {user.role === 'admin' ? 'Administrator' : 'Mitarbeiter'}
            </span>
          </div>
        </div>
      </div>

      {/* Passwort ändern */}
      <div className="card">
        <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 16 }}>Passwort ändern</h2>

        {error && <div className="alert alert-danger">{error}</div>}
        {msg && <div className="alert alert-success">{msg}</div>}

        <form onSubmit={changePassword}>
          <div className="form-group">
            <label className="form-label">Aktuelles Passwort</label>
            <input className="form-input" type="password" value={oldPw}
              onChange={e => setOldPw(e.target.value)} required />
          </div>
          <div className="form-group">
            <label className="form-label">Neues Passwort</label>
            <input className="form-input" type="password" value={newPw}
              onChange={e => setNewPw(e.target.value)} required minLength={6} />
          </div>
          <div className="form-group">
            <label className="form-label">Passwort bestätigen</label>
            <input className="form-input" type="password" value={confirmPw}
              onChange={e => setConfirmPw(e.target.value)} required />
          </div>
          <button className="btn btn-primary btn-full" type="submit" disabled={saving}>
            {saving ? 'Wird geändert...' : 'Passwort ändern'}
          </button>
        </form>
      </div>

      <div style={{ marginTop: 16 }}>
        <button className="btn btn-ghost btn-full" onClick={logout}
          style={{ color: 'var(--danger)', borderColor: 'var(--danger)' }}>
          Abmelden
        </button>
      </div>
    </div>
  );
}
