const express = require('express');
const cors = require('cors');
const path = require('path');
const { initDb } = require('./db/schema');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// API Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/users', require('./routes/users'));
app.use('/api/time-entries', require('./routes/timeentries'));
app.use('/api/clients', require('./routes/clients'));

// Frontend ausliefern (nach Build)
const frontendDist = path.join(__dirname, '../frontend/dist');
app.use(express.static(frontendDist));
app.get('*', (req, res) => {
  res.sendFile(path.join(frontendDist, 'index.html'));
});

// Datenbank initialisieren, dann Server starten
initDb().then(() => {
  app.listen(PORT, () => {
    console.log(`\n✅ Server läuft auf http://localhost:${PORT}`);
    console.log('📋 Admin-Login: admin@firma.de / admin123\n');
  });
}).catch(err => {
  console.error('Fehler beim Starten:', err);
  process.exit(1);
});
