-- Findings catalogue — Cloudflare D1 (SQLite)
--
-- Apply with:
--   npx wrangler d1 execute mecmua --remote --file=schema.sql

CREATE TABLE IF NOT EXISTS findings (
  id          TEXT PRIMARY KEY,                     -- uuid
  category    TEXT NOT NULL,                        -- book | symbol | figure | art | ritual | quote
  title       TEXT NOT NULL,
  notes       TEXT,                                 -- raw pasted text or freeform
  source_url  TEXT,
  tradition   TEXT,                                 -- Stoic | Sufi | Both | Visual | Other
  status      TEXT NOT NULL DEFAULT 'draft',        -- draft | published
  image_url   TEXT,                                 -- for art/symbol cards
  created_at  INTEGER NOT NULL,                     -- epoch ms
  published_at INTEGER,

  CHECK (category IN ('book','symbol','figure','art','ritual','quote')),
  CHECK (status IN ('draft','published'))
);

-- The catalogue endpoint reads published rows newest-first; the findings list
-- reads every row newest-first. Both are covered here.
CREATE INDEX IF NOT EXISTS idx_findings_created ON findings (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_findings_status_created ON findings (status, created_at DESC);
