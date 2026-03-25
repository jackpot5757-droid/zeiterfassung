const jwt = require('jsonwebtoken');
const JWT_SECRET = process.env.JWT_SECRET || 'zeiterfassung-secret-2024';

function requireAuth(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Nicht angemeldet' });
  }
  try {
    const token = header.slice(7);
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ error: 'Sitzung abgelaufen' });
  }
}

function requireAdmin(req, res, next) {
  requireAuth(req, res, () => {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Kein Zugriff' });
    }
    next();
  });
}

module.exports = { requireAuth, requireAdmin, JWT_SECRET };
