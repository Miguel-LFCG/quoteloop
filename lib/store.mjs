import { DatabaseSync } from 'node:sqlite';

export class Store {
  constructor(file = ':memory:') {
    this.db = new DatabaseSync(file);
    this.db.exec(`
      PRAGMA journal_mode = WAL;
      CREATE TABLE IF NOT EXISTS leads (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        created_at TEXT NOT NULL,
        name TEXT NOT NULL,
        trade TEXT NOT NULL,
        email TEXT NOT NULL,
        note TEXT NOT NULL DEFAULT '',
        source TEXT NOT NULL DEFAULT 'landing',
        status TEXT NOT NULL DEFAULT 'new'
      );
      CREATE TABLE IF NOT EXISTS events (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        created_at TEXT NOT NULL,
        kind TEXT NOT NULL,
        path TEXT NOT NULL,
        meta TEXT NOT NULL DEFAULT '{}'
      );
      CREATE INDEX IF NOT EXISTS idx_leads_created ON leads(created_at);
      CREATE INDEX IF NOT EXISTS idx_events_kind ON events(kind);
    `);
  }

  addLead(lead, source = 'landing') {
    const createdAt = new Date().toISOString();
    const stmt = this.db.prepare('INSERT INTO leads (created_at, name, trade, email, note, source) VALUES (?, ?, ?, ?, ?, ?)');
    const result = stmt.run(createdAt, lead.name, lead.trade, lead.email, lead.note ?? '', source);
    return { id: Number(result.lastInsertRowid), createdAt };
  }

  listLeads(limit = 100) {
    return this.db.prepare('SELECT id, created_at, name, trade, email, note, source, status FROM leads ORDER BY id DESC LIMIT ?').all(Math.min(Math.max(Number(limit) || 100, 1), 500));
  }

  logEvent(kind, path = '/', meta = {}) {
    const safeKind = String(kind).slice(0, 50);
    const safePath = String(path).slice(0, 200);
    this.db.prepare('INSERT INTO events (created_at, kind, path, meta) VALUES (?, ?, ?, ?)').run(new Date().toISOString(), safeKind, safePath, JSON.stringify(meta).slice(0, 1000));
  }

  metrics() {
    const leadCount = this.db.prepare('SELECT COUNT(*) AS count FROM leads').get().count;
    const rows = this.db.prepare('SELECT kind, COUNT(*) AS count FROM events GROUP BY kind ORDER BY kind').all();
    return { leadCount: Number(leadCount), events: Object.fromEntries(rows.map((r) => [r.kind, Number(r.count)])) };
  }

  close() { this.db.close(); }
}
