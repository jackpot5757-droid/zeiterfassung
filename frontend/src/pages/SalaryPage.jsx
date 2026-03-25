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

  const MONTHS = ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni',
                  'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'];

  // Mitarbeiter sehen nur sich selbst, Admin sieht alle
  const myReport = user.role === 'admin' ? report : report.filter(r => r.user_id === user.id);

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Gehalt</h1>
      </div>

      <div className="card" style={{ padding: '12px 14px', marginBottom: 16 }}>
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

      {loading ? <div className="spinner" /> : myReport.length === 0 ? (
        <div className="empty">
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
            <path d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 11h.01M12 11h.01M15 11h.01M4 5h16a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1z"/>
          </svg>
          <p>Keine Daten für diesen Monat</p>
        </div>
      ) : myReport.map(r => (
        <SalaryCard key={r.user_id} r={r} month={month} year={year} MONTHS={MONTHS} showName={user.role === 'admin'} />
      ))}
    </div>
  );
}

function SalaryCard({ r, month, year, MONTHS, showName }) {
  const exportExcel = () => {
    const rows = [
      ['Seni Fee Alltagsbetreuung'],
      [`${showName ? r.employee_name + ' — ' : ''}${MONTHS[month-1]} ${year}`],
      [],
      ['Position', 'Betrag'],
      ['Arbeitsstunden Gesamt', `${Number(r.total_hours).toFixed(2)} Std.`],
      ['Stundenlohn', `${Number(r.hourly_rate).toFixed(2)} €`],
      ['Gehalt nur Stunden', `${Number(r.gross_salary).toFixed(2)} €`],
      [`Fahrtgeld je Fahrt ${Number(r.travel_flat_rate).toFixed(2)} €`, `${Number(r.travel_total).toFixed(2)} €`],
      [`Kilometergeld (${Number(r.total_km).toFixed(1)} km × ${Number(r.km_rate).toFixed(2)} €)`, `${Number(r.total_km_costs).toFixed(2)} €`],
      ['Parkgebühren', `${Number(r.total_parking).toFixed(2)} €`],
      ['Abrechnung Gesamt', `${Number(r.total_payout).toFixed(2)} €`],
    ];
    const csv = rows.map(r => r.map(c => `"${c}"`).join(';')).join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Abrechnung_${showName ? r.employee_name + '_' : ''}${MONTHS[month-1]}_${year}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const printPDF = () => {
    const content = `
      <html><head><style>
        body { font-family: Arial, sans-serif; padding: 30px; color: #333; }
        h1 { color: #7c3aed; border-bottom: 2px solid #7c3aed; padding-bottom: 8px; }
        h2 { color: #555; font-size: 16px; }
        .row { display: flex; justify-content: space-between; padding: 10px 14px;
               border: 1px solid #e5e7eb; border-radius: 8px; margin-bottom: 8px; background: #fafafa; }
        .label { color: #6b7280; font-size: 13px; }
        .value { font-size: 22px; font-weight: bold; text-align: center; margin: 4px 0; }
        .total { background: #f3e8ff; border-color: #7c3aed; }
        .total .value { color: #7c3aed; font-size: 26px; }
      </style></head><body>
        <h1>Seni Fee Alltagsbetreuung</h1>
        <h2>${showName ? r.employee_name + ' — ' : ''}${MONTHS[month-1]} ${year}</h2>
        <div class="row total"><div class="label">Abrechnung Gesamt</div><div class="value">${Number(r.total_payout).toFixed(2)} €</div></div>
        <div class="row"><div class="label">Arbeitsstunden Gesamt</div><div class="value">${Number(r.total_hours).toFixed(2)} Std.</div></div>
        <div class="row"><div class="label">Stundenlohn</div><div class="value">${Number(r.hourly_rate).toFixed(2)} €</div></div>
        <div class="row"><div class="label">Gehalt nur Stunden</div><div class="value">${Number(r.gross_salary).toFixed(2)} €</div></div>
        <div class="row"><div class="label">Fahrtgeld je Fahrt ${Number(r.travel_flat_rate).toFixed(2)} €</div><div class="value">${Number(r.travel_total).toFixed(2)} €</div></div>
        <div class="row"><div class="label">Kilometergeld × ${Number(r.km_rate).toFixed(2)} €</div><div class="value">${Number(r.total_km_costs).toFixed(2)} €</div></div>
        <div class="row"><div class="label">Gefahrene Kilometer</div><div class="value">${Number(r.total_km).toFixed(1)} km</div></div>
        <div class="row"><div class="label">Parkgebühren</div><div class="value">${Number(r.total_parking).toFixed(2)} €</div></div>
      </body></html>
    `;
    const w = window.open('', '_blank');
    w.document.write(content);
    w.document.close();
    w.print();
  };

  return (
    <div className="card" style={{ marginBottom: 16 }}>
      {showName && (
        <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 12, color: 'var(--primary)' }}>
          {r.employee_name}
        </div>
      )}

      <SalaryBox label="Arbeitsstunden Gesamt" value={`${Number(r.total_hours).toFixed(2)} Std.`} />
      <SalaryBox label="Abrechnung Gesamt" value={`${Number(r.total_payout).toFixed(2)} €`} highlight />
      <SalaryBox label={`Fahrtgeld je Fahrt ${Number(r.travel_flat_rate).toFixed(2)} €`}
        value={`${Number(r.travel_total).toFixed(2)} €`} />
      <SalaryBox label={`Kilometergeld × ${Number(r.km_rate).toFixed(2)} €`}
        value={`${Number(r.total_km_costs).toFixed(2)} €`} />
      <SalaryBox label="Parkgebühren" value={`${Number(r.total_parking).toFixed(2)} €`} />
      <SalaryBox label="Gehalt nur Stunden" value={`${Number(r.gross_salary).toFixed(2)} €`} />
      <SalaryBox label="Stundenlohn" value={`${Number(r.hourly_rate).toFixed(2)} €`} />

      <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
        <button className="btn btn-primary btn-full"
          style={{ background: 'linear-gradient(135deg, #7c3aed, #ec4899)' }}
          onClick={printPDF}>
          PDF erstellen
        </button>
        <button className="btn btn-full"
          style={{ background: '#16a34a', color: 'white', fontWeight: 600 }}
          onClick={exportExcel}>
          Excel
        </button>
      </div>
    </div>
  );
}

function SalaryBox({ label, value, highlight }) {
  return (
    <div style={{
      border: `1px solid ${highlight ? 'var(--primary)' : 'var(--gray-200)'}`,
      borderRadius: 10, padding: '10px 16px', marginBottom: 8,
      background: highlight ? 'var(--primary-light)' : 'var(--gray-50)'
    }}>
      <div style={{ fontSize: 12, color: 'var(--gray-500)', marginBottom: 4 }}>{label}</div>
      <div style={{
        fontSize: highlight ? 24 : 20, fontWeight: 700, textAlign: 'center',
        color: highlight ? 'var(--primary)' : '#111'
      }}>{value}</div>
    </div>
  );
}
