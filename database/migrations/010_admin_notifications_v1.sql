CREATE TABLE IF NOT EXISTS admin_notifications (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  notification_type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  link_url TEXT NOT NULL,
  entity_type TEXT,
  entity_id INTEGER,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  read_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_admin_notifications_created ON admin_notifications(created_at DESC, id DESC);
CREATE INDEX IF NOT EXISTS idx_admin_notifications_unread ON admin_notifications(read_at, created_at DESC);
