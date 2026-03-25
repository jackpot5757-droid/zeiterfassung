import { useState, useEffect } from 'react';
import { api } from '../api.js';
import UserModal from '../components/UserModal.jsx';

export default function AdminPage() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);

  const load = async () => {
    setLoading(true);
    try { setUsers(await api.getUsers()); }
    catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const openEdit = (u) => { setEditing(u); setShowModal(true); };
  const openNew = () => { setEditing(null); setShowModal(true); };

  const deleteUser = async (id) => {
    if (!confirm('Mitarbeiter löschen? Alle Zeiteinträge werden ebenfalls gelöscht.')) return;
    try { await api.deleteUser(id); load(); } catch (e) { alert(e.message); }
  };

  const employees = users.filter(u => u.role === 'employee');
  const admins = users.filter(u => u.role === 'admin');

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Mitarbeiter</h1>
        <button className="btn btn-primary btn-sm" onClick={openNew}>+ Neu</button>
      </div>

      {loading ? <div className="spinner" /> : (
        <>
          {admins.length > 0 && (
            <>
              <div className="section-title">Administratoren</div>
              {admins.map(u => <UserRow key={u.id} user={u} onEdit={openEdit} onDelete={deleteUser} />)}
            </>
          )}

          <div className="section-title" style={{ marginTop: 12 }}>
            Mitarbeiter ({employees.length})
          </div>
          {employees.length === 0 ? (
            <div className="empty"><p>Noch keine Mitarbeiter angelegt</p></div>
          ) : employees.map(u => (
            <UserRow key={u.id} user={u} onEdit={openEdit} onDelete={deleteUser} />
          ))}
        </>
      )}

      {showModal && (
        <UserModal user={editing} onClose={() => setShowModal(false)}
          onSaved={() => { setShowModal(false); load(); }} />
      )}
    </div>
  );
}

function UserRow({ user, onEdit, onDelete }) {
  return (
    <div className="employee-row">
      <div className="employee-info">
        <h3>{user.name}</h3>
        <p>{user.email}</p>
        {user.role === 'admin' && <span className="badge badge-orange" style={{ marginTop: 3 }}>Admin</span>}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        {user.role === 'employee' && (
          <div className="employee-rate">{Number(user.hourly_rate).toFixed(2)} €/h</div>
        )}
        <button className="btn btn-ghost btn-icon" onClick={() => onEdit(user)} title="Bearbeiten">✏️</button>
        <button className="btn btn-ghost btn-icon" onClick={() => onDelete(user.id)} title="Löschen"
          style={{ color: 'var(--danger)' }}>🗑</button>
      </div>
    </div>
  );
}
