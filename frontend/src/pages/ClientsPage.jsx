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
  const [expanded, setExpanded] = useState(null);
  const [search, setSearch] = useState('');

  const load = async () => {
    setLoading(true);
    try { setClients(await api.getClients()); }
    catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const filtered = clients.filter(c =>
    `${c.name} ${c.vorname || ''}`.toLowerCase().includes(search.toLowerCase())
  );

  const openEdit = (c) => { setEditing(c); setShowModal(true); };
  const openNew = () => { setEditing(null); setShowModal(true); };

  const deleteClient = async (id) => {
    if (!confirm('Klient löschen?')) return;
    try { await api.deleteClient(id); load(); } catch (e) { alert(e.message); }
  };

  const calcAge = (geb) => {
    if (!geb) return null;
    const d = new Date(geb);
    const age = Math.floor((Date.now() - d) / (365.25 * 24 * 60 * 60 * 1000));
    return isNaN(age) ? null : age;
  };

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Klienten</h1>
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
          <p>Keine Klienten gefunden</p>
        </div>
      ) : filtered.map(c => {
        const age = calcAge(c.geburtsdatum);
        const isOpen = expanded === c.id;
        return (
          <div key={c.id} className="client-card" style={{ cursor: 'pointer' }}
            onClick={() => setExpanded(isOpen ? null : c.id)}>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <div className="client-name">
                  {c.name}{c.vorname ? `, ${c.vorname}` : ''}
                  {c.pflegegrad > 0 && (
                    <span className="badge badge-blue" style={{ marginLeft: 8 }}>PG {c.pflegegrad}</span>
                  )}
                </div>
                <div className="client-details" style={{ marginTop: 4 }}>
                  {(c.street || c.city) && (
                    <span>📍 {[c.street, c.zip, c.city].filter(Boolean).join(', ')}</span>
                  )}
                  {c.phone && <span>📞 <a href={`tel:${c.phone}`} onClick={e => e.stopPropagation()}>{c.phone}</a></span>}
                  {age && <span>🎂 {age} Jahre</span>}
                </div>
              </div>
              <span style={{ color: 'var(--gray-400)', fontSize: 18 }}>{isOpen ? '▲' : '▼'}</span>
            </div>

            {isOpen && (
              <div style={{ marginTop: 12, borderTop: '1px solid var(--gray-100)', paddingTop: 12 }}>
                {c.krankenkasse && (
                  <InfoRow label="Krankenkasse" value={c.krankenkasse} />
                )}
                {c.versichertennummer && (
                  <InfoRow label="Versichertennummer" value={c.versichertennummer} />
                )}
                {c.geburtsdatum && (
                  <InfoRow label="Geburtsdatum" value={new Date(c.geburtsdatum).toLocaleDateString('de-DE')} />
                )}
                {c.krankheiten && (
                  <div style={{ marginTop: 8, padding: '8px 10px', background: 'var(--gray-50)', borderRadius: 6 }}>
                    <div style={{ fontSize: 11, color: 'var(--gray-500)', marginBottom: 4 }}>Krankheiten / Diagnosen</div>
                    <div style={{ fontSize: 13 }}>{c.krankheiten}</div>
                  </div>
                )}
                {c.notes && (
                  <div style={{ marginTop: 8, padding: '8px 10px', background: '#fffbeb', borderRadius: 6 }}>
                    <div style={{ fontSize: 11, color: 'var(--gray-500)', marginBottom: 4 }}>Notizen</div>
                    <div style={{ fontSize: 13 }}>{c.notes}</div>
                  </div>
                )}
                {user.role === 'admin' && c.assigned_employees && (
                  <div style={{ marginTop: 8 }}>
                    <span className="badge badge-blue">👤 {c.assigned_employees}</span>
                  </div>
                )}
                {user.role === 'admin' && (
                  <div className="entry-actions" style={{ marginTop: 10 }} onClick={e => e.stopPropagation()}>
                    <button className="btn btn-ghost btn-sm" onClick={() => openEdit(c)}>✏️ Bearbeiten</button>
                    <button className="btn btn-ghost btn-sm" style={{ color: 'var(--danger)' }} onClick={() => deleteClient(c.id)}>🗑 Löschen</button>
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}

      {showModal && user.role === 'admin' && (
        <ClientModal client={editing} onClose={() => setShowModal(false)}
          onSaved={() => { setShowModal(false); load(); }} />
      )}
    </div>
  );
}

function InfoRow({ label, value }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0',
      borderBottom: '1px solid var(--gray-100)', fontSize: 13 }}>
      <span style={{ color: 'var(--gray-500)' }}>{label}</span>
      <span style={{ fontWeight: 500 }}>{value}</span>
    </div>
  );
}
