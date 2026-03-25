import { useState, useEffect, createContext, useContext } from 'react';
import { api } from './api.js';
import LoginPage from './pages/LoginPage.jsx';
import TimeEntriesPage from './pages/TimeEntriesPage.jsx';
import ClientsPage from './pages/ClientsPage.jsx';
import AdminPage from './pages/AdminPage.jsx';
import SalaryPage from './pages/SalaryPage.jsx';
import ProfilePage from './pages/ProfilePage.jsx';

export const AuthContext = createContext(null);
export const useAuth = () => useContext(AuthContext);

const NAV = [
  { id: 'entries', label: 'Zeitnachweis', icon: ClockIcon },
  { id: 'clients', label: 'Klienten', icon: UsersIcon },
  { id: 'salary', label: 'Gehalt', icon: EuroIcon },
  { id: 'admin', label: 'Admin', icon: SettingsIcon, adminOnly: true },
  { id: 'profile', label: 'Profil', icon: PersonIcon },
];

export default function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState('entries');

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) { setLoading(false); return; }
    api.me().then(u => { setUser(u); setLoading(false); }).catch(() => {
      localStorage.removeItem('token');
      setLoading(false);
    });
  }, []);

  const login = async (email, password) => {
    const res = await api.login(email, password);
    localStorage.setItem('token', res.token);
    setUser(res.user);
  };

  const logout = () => {
    localStorage.removeItem('token');
    setUser(null);
    setPage('entries');
  };

  if (loading) return <div className="spinner" style={{ height: '100dvh' }} />;
  if (!user) return <LoginPage onLogin={login} />;

  const visibleNav = NAV.filter(n => !n.adminOnly || user.role === 'admin');
  const currentPage = page === 'admin' && user.role !== 'admin' ? 'entries' : page;

  return (
    <AuthContext.Provider value={{ user, logout }}>
      <div className="app">
        <header className="top-bar">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <img src="/logo.png" alt="Seni Fee" style={{ height: 32, objectFit: 'contain' }}
              onError={e => e.target.style.display='none'} />
            <div>
              <div style={{ fontSize: 15, fontWeight: 700, lineHeight: 1.1 }}>Seni Fee</div>
              <div style={{ fontSize: 10, opacity: 0.8, letterSpacing: '0.05em' }}>ALLTAGSBETREUUNG</div>
            </div>
          </div>
          <span style={{ fontSize: 12, opacity: 0.85 }}>👤 {user.name}</span>
        </header>

        <main className="main-content">
          {currentPage === 'entries' && <TimeEntriesPage />}
          {currentPage === 'clients' && <ClientsPage />}
          {currentPage === 'salary' && <SalaryPage />}
          {currentPage === 'admin' && <AdminPage />}
          {currentPage === 'profile' && <ProfilePage />}
        </main>

        <nav className="bottom-nav">
          {visibleNav.map(n => (
            <button key={n.id} className={`nav-btn ${currentPage === n.id ? 'active' : ''}`} onClick={() => setPage(n.id)}>
              <n.icon />
              {n.label}
            </button>
          ))}
        </nav>
      </div>
    </AuthContext.Provider>
  );
}

function ClockIcon() {
  return <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>;
}
function UsersIcon() {
  return <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>;
}
function EuroIcon() {
  return <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}><path d="M4 10h12M4 14h12M19.5 6.5A7.5 7.5 0 1 0 19.5 17.5"/></svg>;
}
function SettingsIcon() {
  return <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>;
}
function PersonIcon() {
  return <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>;
}
