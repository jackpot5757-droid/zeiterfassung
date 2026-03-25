import { useState, useEffect } from 'react';
import { api } from '../api.js';
import { useAuth } from '../App.jsx';

export default function SalaryPage() {
  const { user } = useAuth();
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [report, setReport] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const data = await api.getSalaryReport(month, year);
      setReport(data.report);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [month, year]);

  const MONTHS = ['Jan', 'Feb', 'Mär', 'Apr', 'Mai', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dez'];

  const totals = report.reduce((a, r) => ({
    hours: a.hours + Number(r.total_hours || 0),
    payout: a.payout + Number(r.total_payout || 0),
  }), { hours: 0, payout: 0 });

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Gehaltsübersicht</h1>
      </div>

      <div className="card" style={{ padding: '12px 14px', marginBottom: 12 }}>
        <div className="form-row">
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Monat</label>
            <select className="form-input" value={month} onChange={e => setMonth(Number(e.target.value))}>
              {MONTHS.map((m, i) => <option key={i} value={i+1}>{m}</option>)}
            </select>
          </div>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Jahr</label>
            <select className="form-input" value={year} onChange={e => setYear(Number(e.target.value))}>
              {[2024, 2025, 2026, 2027].map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
        </div>
      </div>

      {user.role === 'admin' && (
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-label">Stunden gesamt</div>
            <div className="stat-value">{totals.hours.toFixed(1)}h</div>
            <div className="stat-sub">alle Mitarbeiter</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Auszahlung gesamt</div>
            <div className="stat-value" style={{ color: 'var(--success)', fontSize: 18 }}>
              {totals.payout.toFixed(2)} €
            </div>
            <div className="stat-sub">inkl. aller Kosten</div>
          </div>
        </div>
      )}

      {loading ? <div className="spinner" /> : report.length === 0 ? (
        <div className="empty">
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}><path d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 11h.01M12 11h.01M15 11h.01M4 5h16a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1z"/></svg>
          <p>Keine Daten für diesen Monat</p>
        </div>
      ) : report.map(r => (
        <div key={r.user_id} className="card" style={{ marginBottom: 10 }}>
          <div className="card-header">
            <div>
              <div className="card-title">{r.employee_name}</div>
              <div style={{ fontSize: 12, color: 'var(--gray-500)' }}>
                {Number(r.hourly_rate).toFixed(2)} €/Std · {Number(r.km_rate).toFixed(2)} €/km · {r.entry_count} Einträge
              </div>
            </div>
            <div className="salary-amount">{Number(r.total_payout).toFixed(2)} €</div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            <InfoRow label="Arbeitsstunden" value={`${Number(r.total_hours).toFixed(2)} h`} />
            <InfoRow label="Brutto-Lohn" value={`${Number(r.gross_salary).toFixed(2)} €`} />
            <InfoRow label="Gefahrene km" value={`${Number(r.total_km).toFixed(1)} km`} />
            <InfoRow label="km-Vergütung" value={`${Number(r.total_km_costs).toFixed(2)} €`} />
            <InfoRow
              label={`Anfahrtspauschale (${r.work_days} Tage × ${Number(r.travel_flat_rate).toFixed(2)} €)`}
              value={`${Number(r.travel_total).toFixed(2)} €`}
            />
            <InfoRow label="Parkgebühren" value={`${Number(r.total_parking).toFixed(2)} €`} />
          </div>

          <div style={{
            marginTop: 12, padding: '10px 12px', background: 'var(--success-light)',
            borderRadius: 8, display: 'flex', justifyContent: 'space-between'
          }}>
            <span style={{ fontWeight: 600, color: 'var(--success)' }}>Gesamt-Auszahlung</span>
            <span style={{ fontWeight: 700, fontSize: 16, color: 'var(--success)' }}>
              {Number(r.total_payout).toFixed(2)} €
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}

function InfoRow({ label, value }) {
  return (
    <div style={{ padding: '8px 10px', background: 'var(--gray-50)', borderRadius: 6 }}>
      <div style={{ fontSize: 11, color: 'var(--gray-500)', marginBottom: 2 }}>{label}</div>
      <div style={{ fontSize: 14, fontWeight: 600 }}>{value}</div>
    </div>
  );
}
