-- CS 전화상담 관리 (홈페이지 / 태투사 / 에잇솔라) v1
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS cs_calls (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  category TEXT NOT NULL CHECK (category IN ('homepage','taedo','eightsolar')),
  call_date TEXT NOT NULL,
  phone TEXT NOT NULL,
  customer_name TEXT,
  address TEXT,
  content TEXT,
  channel TEXT,
  receiver TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'waiting' CHECK (status IN ('waiting','in_progress','done')),
  created_by INTEGER,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (created_by) REFERENCES members(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_cs_calls_status ON cs_calls(status);
CREATE INDEX IF NOT EXISTS idx_cs_calls_category ON cs_calls(category);
CREATE INDEX IF NOT EXISTS idx_cs_calls_call_date ON cs_calls(call_date);
CREATE INDEX IF NOT EXISTS idx_cs_calls_created ON cs_calls(created_at);

CREATE TABLE IF NOT EXISTS cs_call_notes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  call_id INTEGER NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('waiting','in_progress','done')),
  author TEXT NOT NULL,
  note TEXT NOT NULL,
  created_by INTEGER,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (call_id) REFERENCES cs_calls(id) ON DELETE CASCADE,
  FOREIGN KEY (created_by) REFERENCES members(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_cs_call_notes_call ON cs_call_notes(call_id, created_at);
