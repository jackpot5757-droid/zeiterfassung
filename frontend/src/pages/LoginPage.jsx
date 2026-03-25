import { useState } from 'react';

export default function LoginPage({ onLogin }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await onLogin(email, password);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-logo">
          <img src="/logo.png" alt="Seni Fee" style={{ maxHeight: 90, maxWidth: '100%', marginBottom: 8 }}
            onError={e => e.target.style.display='none'} />
          <h1 style={{ fontSize: 28, fontWeight: 800, color: '#7c3aed', fontFamily: 'Georgia, serif' }}>
            Seni Fee
          </h1>
          <p style={{ fontSize: 12, letterSpacing: '0.15em', color: '#5b21b6', fontWeight: 600, marginTop: 2 }}>
            ALLTAGSBETREUUNG
          </p>
          <p style={{ fontSize: 13, color: '#6b7280', marginTop: 10 }}>Bitte anmelden</p>
        </div>
        {error && <div className="alert alert-danger">{error}</div>}
        <form onSubmit={submit}>
          <div className="form-group">
            <label className="form-label">E-Mail</label>
            <input className="form-input" type="email" value={email}
              onChange={e => setEmail(e.target.value)} placeholder="name@senifee.de"
              autoComplete="email" required />
          </div>
          <div className="form-group">
            <label className="form-label">Passwort</label>
            <input className="form-input" type="password" value={password}
              onChange={e => setPassword(e.target.value)} placeholder="••••••••"
              autoComplete="current-password" required />
          </div>
          <button className="btn btn-primary btn-full" type="submit" disabled={loading}
            style={{ background: 'linear-gradient(135deg, #7c3aed, #ec4899)' }}>
            {loading ? 'Anmelden...' : 'Anmelden'}
          </button>
        </form>
      </div>
    </div>
  );
}
