ALTER TABLE cs_call_notes RENAME TO cs_call_notes_old;

DROP INDEX IF EXISTS idx_cs_call_notes_call;

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

INSERT INTO cs_call_notes (id, call_id, status, author, note, created_by, created_at)
SELECT id, call_id, status, author, note, created_by, created_at FROM cs_call_notes_old;

DROP TABLE cs_call_notes_old;

CREATE INDEX IF NOT EXISTS idx_cs_call_notes_call ON cs_call_notes(call_id, created_at);
