import { useState, useEffect } from 'react';
import { api } from '../api.js';
import { useAuth } from '../App.jsx';
import ClientModal from '../components/ClientModal.jsx';

export default function ClientsPage() {
  const { user } = useAuth();
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [search, setSearch] = useState('');

  const load = async () => {
    setLoading(true);
    try { setClients(await api.getClients()); }
    catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const filtered = clients.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    (c.company || '').toLowerCase().includes(search.toLowerCase())
  );

  const openEdit = (c) => { setEditing(c); setShowModal(true); };
  const openNew = () => { setEditing(null); setShowModal(true); };

  const deleteClient = async (id) => {
    if (!confirm('Kunde löschen?')) return;
    try { await api.deleteClient(id); load(); } catch (e) { alert(e.message); }
  };

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Kunden</h1>
        {user.role === 'admin' && (
          <button className="btn btn-primary btn-sm" onClick={openNew}>+ Neu</button>
        )}
      </div>

      <div className="form-group">
        <input className="form-input" type="search" placeholder="Suchen..." value={search}
          onChange={e => setSearch(e.target.value)} />
      </div>

      {loading ? <div className="spinner" /> : filtered.length === 0 ? (
        <div className="empty">
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/></svg>
          <p>Keine Kunden gefunden</p>
        </div>
      ) : filtered.map(c => (
        <div key={c.id} className="client-card">
          <div className="client-name">{c.name}</div>
          {c.company && <div className="client-company">🏢 {c.company}</div>}
          <div className="client-details">
            {(c.street || c.city) && (
              <span>📍 {[c.street, c.zip, c.city].filter(Boolean).join(', ')}</span>
            )}
            {c.phone && <span>📞 <a href={`tel:${c.phone}`}>{c.phone}</a></span>}
            {c.email && <span>✉️ <a href={`mailto:${c.email}`}>{c.email}</a></span>}
            {c.notes && <span style={{ color: 'var(--gray-500)', fontStyle: 'italic' }}>📝 {c.notes}</span>}
            {user.role === 'admin' && c.assigned_employees && (
              <span style={{ marginTop: 4 }}>
                <span className="badge badge-blue">👤 {c.assigned_employees}</span>
              </span>
            )}
          </div>

          {user.role === 'admin' && (
            <div className="entry-actions" style={{ marginTop: 10 }}>
              <button className="btn btn-ghost btn-sm" onClick={() => openEdit(c)}>✏️ Bearbeiten</button>
              <button className="btn btn-ghost btn-sm" style={{ color: 'var(--danger)' }} onClick={() => deleteClient(c.id)}>🗑 Löschen</button>
            </div>
          )}
        </div>
      ))}

      {showModal && user.role === 'admin' && (
        <ClientModal client={editing} onClose={() => setShowModal(false)} onSaved={() => { setShowModal(false); load(); }} />
      )}
    </div>
  );
}
