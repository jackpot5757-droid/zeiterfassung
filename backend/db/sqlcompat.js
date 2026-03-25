/**
 * Compatibility wrapper: makes sql.js behave like better-sqlite3 (synchronous API).
 * Once initialized, all db.prepare().get/all/run() calls are synchronous.
 */
const initSqlJs = require('sql.js');
const fs = require('fs');
const path = require('path');

const DB_PATH = path.join(__dirname, 'zeiterfassung.db');

class Stmt {
  constructor(db, sql, saveFn) {
    this._db = db;
    this._sql = sql;
    this._save = saveFn;
  }

  _normalize(params) {
    if (params.length === 0) return [];
    if (params.length === 1 && Array.isArray(params[0])) return params[0];
    return params;
  }

  get(...params) {
    const p = this._normalize(params);
    const stmt = this._db.prepare(this._sql);
    if (p.length) stmt.bind(p);
    let result = null;
    if (stmt.step()) result = stmt.getAsObject();
    stmt.free();
    return result || undefined;
  }

  all(...params) {
    const p = this._normalize(params);
    const results = [];
    const stmt = this._db.prepare(this._sql);
    if (p.length) stmt.bind(p);
    while (stmt.step()) results.push(stmt.getAsObject());
    stmt.free();
    return results;
  }

  run(...params) {
    const p = this._normalize(params);
    this._db.run(this._sql, p.length ? p : undefined);
    const lastInsertRowid = this._db.exec('SELECT last_insert_rowid()')[0]?.values[0][0] ?? 0;
    const changes = this._db.exec('SELECT changes()')[0]?.values[0][0] ?? 0;
    this._save();
    return { lastInsertRowid, changes };
  }
}

class CompatDB {
  constructor(sqlJsDb) {
    this._db = sqlJsDb;
    this._save = this._save.bind(this);
  }

  _save() {
    try {
      const data = this._db.export();
      fs.writeFileSync(DB_PATH, Buffer.from(data));
    } catch (e) {
      console.error('DB save error:', e.message);
    }
  }

  pragma(str) {
    this._db.run(`PRAGMA ${str}`);
  }

  exec(sql) {
    this._db.exec(sql);
    this._save();
  }

  prepare(sql) {
    return new Stmt(this._db, sql, this._save);
  }
}

async function createDb() {
  const SQL = await initSqlJs();
  const buffer = fs.existsSync(DB_PATH) ? fs.readFileSync(DB_PATH) : null;
  const sqlDb = buffer ? new SQL.Database(buffer) : new SQL.Database();
  return new CompatDB(sqlDb);
}

module.exports = { createDb };
