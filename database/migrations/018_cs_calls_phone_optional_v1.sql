ALTER TABLE cs_calls RENAME TO cs_calls_old;

DROP INDEX IF EXISTS idx_cs_calls_status;
DROP INDEX IF EXISTS idx_cs_calls_category;
DROP INDEX IF EXISTS idx_cs_calls_call_date;
DROP INDEX IF EXISTS idx_cs_calls_created;

CREATE TABLE IF NOT EXISTS cs_calls (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  category TEXT NOT NULL CHECK (category IN ('homepage','taedo','eightsolar')),
  call_date TEXT NOT NULL,
  phone TEXT,
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

INSERT INTO cs_calls (id, category, call_date, phone, customer_name, address, content, channel, receiver, status, created_by, created_at, updated_at)
SELECT id, category, call_date, phone, customer_name, address, content, channel, receiver, status, created_by, created_at, updated_at FROM cs_calls_old;

DROP TABLE cs_calls_old;

CREATE INDEX IF NOT EXISTS idx_cs_calls_status ON cs_calls(status);
CREATE INDEX IF NOT EXISTS idx_cs_calls_category ON cs_calls(category);
CREATE INDEX IF NOT EXISTS idx_cs_calls_call_date ON cs_calls(call_date);
CREATE INDEX IF NOT EXISTS idx_cs_calls_created ON cs_calls(created_at);
