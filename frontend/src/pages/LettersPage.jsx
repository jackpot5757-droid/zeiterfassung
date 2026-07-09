import { useState, useEffect } from 'react';
import { Document, Packer, Paragraph, TextRun, AlignmentType } from 'docx';
import { api } from '../api.js';

const SENDER_KEY = 'senifee_absender';

const defaultSender = {
  name: 'Seni Fee Alltagsbetreuung',
  street: '',
  zip: '',
  city: '',
  phone: '',
  email: '',
};

function loadSender() {
  try {
    return { ...defaultSender, ...JSON.parse(localStorage.getItem(SENDER_KEY) || '{}') };
  } catch {
    return defaultSender;
  }
}

function todayDE() {
  return new Date().toLocaleDateString('de-DE');
}

export default function LettersPage() {
  const [clients, setClients] = useState([]);
  const [clientId, setClientId] = useState('');
  const [sender, setSender] = useState(loadSender());
  const [showSender, setShowSender] = useState(false);

  const [recipient, setRecipient] = useState({ name: '', street: '', zip: '', city: '' });
  const [date, setDate] = useState(todayDE());
  const [subject, setSubject] = useState('');
  const [salutation, setSalutation] = useState('Sehr geehrte Damen und Herren,');
  const [body, setBody] = useState('');
  const [closing, setClosing] = useState('Mit freundlichen Grüßen');
  const [signature, setSignature] = useState(sender.name);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    api.getClients().then(setClients).catch(() => {});
  }, []);

  const saveSender = (next) => {
    setSender(next);
    localStorage.setItem(SENDER_KEY, JSON.stringify(next));
  };

  const client = clients.find(c => String(c.id) === String(clientId));

  const applyClientToRecipient = () => {
    if (!client) return;
    setRecipient({
      name: `${client.name}${client.vorname ? ', ' + client.vorname : ''}`,
      street: client.street || '',
      zip: client.zip || '',
      city: client.city || '',
    });
  };

  const applyKrankenkasseSubject = () => {
    if (!client) return;
    if (client.krankenkasse) setRecipient(r => ({ ...r, name: client.krankenkasse }));
    const lines = [
      `Versicherte(r): ${client.vorname ? client.vorname + ' ' : ''}${client.name}`,
      client.geburtsdatum ? `geb. am: ${new Date(client.geburtsdatum).toLocaleDateString('de-DE')}` : null,
      client.versichertennummer ? `Versichertennummer: ${client.versichertennummer}` : null,
      client.pflegegrad > 0 ? `Pflegegrad: ${client.pflegegrad}` : null,
    ].filter(Boolean).join('\n');
    setBody(b => (b ? b + '\n\n' + lines : lines));
  };

  const generate = async () => {
    setGenerating(true);
    try {
      const senderLines = [sender.name, sender.street, [sender.zip, sender.city].filter(Boolean).join(' '), sender.phone, sender.email]
        .filter(Boolean);

      const doc = new Document({
        sections: [{
          properties: {},
          children: [
            ...senderLines.map(line => new Paragraph({ children: [new TextRun({ text: line, size: 18 })] })),
            new Paragraph({ text: '', spacing: { after: 300 } }),

            new Paragraph({ children: [new TextRun(recipient.name || '')] }),
            new Paragraph({ children: [new TextRun(recipient.street || '')] }),
            new Paragraph({ children: [new TextRun([recipient.zip, recipient.city].filter(Boolean).join(' '))] }),
            new Paragraph({ text: '', spacing: { after: 300 } }),

            new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun(date)] }),
            new Paragraph({ text: '', spacing: { after: 300 } }),

            ...(subject ? [
              new Paragraph({ children: [new TextRun({ text: subject, bold: true })] }),
              new Paragraph({ text: '', spacing: { after: 200 } }),
            ] : []),

            new Paragraph({ children: [new TextRun(salutation)] }),
            new Paragraph({ text: '', spacing: { after: 200 } }),

            ...body.split('\n').map(line => new Paragraph({ children: [new TextRun(line)] })),
            new Paragraph({ text: '', spacing: { after: 400 } }),

            new Paragraph({ children: [new TextRun(closing)] }),
            new Paragraph({ text: '', spacing: { after: 400 } }),
            new Paragraph({ children: [new TextRun(signature)] }),
          ],
        }],
      });

      const blob = await Packer.toBlob(doc);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const namePart = (recipient.name || 'Brief').replace(/[^a-zA-Z0-9äöüÄÖÜß ,-]/g, '').trim();
      a.download = `Brief_${namePart || 'Empfaenger'}.docx`;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Brief</h1>
      </div>

      <div className="card" style={{ padding: '12px 14px', marginBottom: 16 }}>
        <div className="section-title" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          Absender
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => setShowSender(s => !s)}>
            {showSender ? 'einklappen' : 'bearbeiten'}
          </button>
        </div>
        {showSender && (
          <>
            <div className="form-group">
              <label className="form-label">Name</label>
              <input className="form-input" value={sender.name} onChange={e => saveSender({ ...sender, name: e.target.value })} />
            </div>
            <div className="form-group">
              <label className="form-label">Straße & Hausnummer</label>
              <input className="form-input" value={sender.street} onChange={e => saveSender({ ...sender, street: e.target.value })} />
            </div>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">PLZ</label>
                <input className="form-input" value={sender.zip} onChange={e => saveSender({ ...sender, zip: e.target.value })} />
              </div>
              <div className="form-group">
                <label className="form-label">Ort</label>
                <input className="form-input" value={sender.city} onChange={e => saveSender({ ...sender, city: e.target.value })} />
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Telefon</label>
                <input className="form-input" value={sender.phone} onChange={e => saveSender({ ...sender, phone: e.target.value })} />
              </div>
              <div className="form-group">
                <label className="form-label">E-Mail</label>
                <input className="form-input" value={sender.email} onChange={e => saveSender({ ...sender, email: e.target.value })} />
              </div>
            </div>
          </>
        )}
      </div>

      <div className="card" style={{ padding: '12px 14px', marginBottom: 16 }}>
        <div className="section-title">Klient-Daten übernehmen (optional)</div>
        <div className="form-group">
          <label className="form-label">Klient</label>
          <select className="form-input" value={clientId} onChange={e => setClientId(e.target.value)}>
            <option value="">– kein Klient –</option>
            {clients.map(c => (
              <option key={c.id} value={c.id}>{c.name}{c.vorname ? ', ' + c.vorname : ''}</option>
            ))}
          </select>
        </div>
        {client && (
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button type="button" className="btn btn-ghost btn-sm" onClick={applyClientToRecipient}>
              Adresse als Empfänger übernehmen
            </button>
            <button type="button" className="btn btn-ghost btn-sm" onClick={applyKrankenkasseSubject}>
              Krankenkasse + Bezugsdaten einfügen
            </button>
          </div>
        )}
      </div>

      <div className="card" style={{ padding: '12px 14px', marginBottom: 16 }}>
        <div className="section-title">Empfänger</div>
        <div className="form-group">
          <label className="form-label">Name / Firma</label>
          <input className="form-input" value={recipient.name} onChange={e => setRecipient(r => ({ ...r, name: e.target.value }))} placeholder="z.B. AOK NRW" />
        </div>
        <div className="form-group">
          <label className="form-label">Straße & Hausnummer</label>
          <input className="form-input" value={recipient.street} onChange={e => setRecipient(r => ({ ...r, street: e.target.value }))} />
        </div>
        <div className="form-row">
          <div className="form-group">
            <label className="form-label">PLZ</label>
            <input className="form-input" value={recipient.zip} onChange={e => setRecipient(r => ({ ...r, zip: e.target.value }))} />
          </div>
          <div className="form-group">
            <label className="form-label">Ort</label>
            <input className="form-input" value={recipient.city} onChange={e => setRecipient(r => ({ ...r, city: e.target.value }))} />
          </div>
        </div>
      </div>

      <div className="card" style={{ padding: '12px 14px', marginBottom: 16 }}>
        <div className="section-title">Brieftext</div>
        <div className="form-group">
          <label className="form-label">Datum</label>
          <input className="form-input" value={date} onChange={e => setDate(e.target.value)} />
        </div>
        <div className="form-group">
          <label className="form-label">Betreff</label>
          <input className="form-input" value={subject} onChange={e => setSubject(e.target.value)} placeholder="z.B. Antrag auf Kostenübernahme" />
        </div>
        <div className="form-group">
          <label className="form-label">Anrede</label>
          <input className="form-input" value={salutation} onChange={e => setSalutation(e.target.value)} />
        </div>
        <div className="form-group">
          <label className="form-label">Text</label>
          <textarea className="form-input" rows={10} style={{ resize: 'vertical' }}
            value={body} onChange={e => setBody(e.target.value)} placeholder="Brieftext..." />
        </div>
        <div className="form-group">
          <label className="form-label">Grußformel</label>
          <input className="form-input" value={closing} onChange={e => setClosing(e.target.value)} />
        </div>
        <div className="form-group">
          <label className="form-label">Unterschrift</label>
          <input className="form-input" value={signature} onChange={e => setSignature(e.target.value)} />
        </div>
      </div>

      <button className="btn btn-primary btn-full" onClick={generate} disabled={generating}>
        {generating ? 'Erstelle...' : '📄 Als Word-Dokument herunterladen'}
      </button>
    </div>
  );
}
