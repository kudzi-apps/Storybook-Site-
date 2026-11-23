CREATE TABLE IF NOT EXISTS enquiries (
  id TEXT PRIMARY KEY,
  client_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT NOT NULL DEFAULT '',
  event_date TEXT,
  location TEXT NOT NULL DEFAULT '',
  services_json TEXT NOT NULL DEFAULT '[]',
  quote_amount REAL,
  status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new','contacted','negotiating','confirmed','declined')),
  notes TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_enquiries_status_created ON enquiries(status, created_at DESC);
