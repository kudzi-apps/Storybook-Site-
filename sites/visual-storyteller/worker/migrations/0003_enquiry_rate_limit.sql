CREATE TABLE IF NOT EXISTS public_enquiry_limits (
  ip_hash TEXT PRIMARY KEY,
  window_started INTEGER NOT NULL,
  submissions INTEGER NOT NULL DEFAULT 0
);
