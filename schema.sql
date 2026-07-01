-- Workout Journal D1 schema

-- Per-date workout state. `data` JSON now holds an ordered `sections` array
-- keyed by section index, plus legacy `am`/`pm` fields for backward compat.
CREATE TABLE IF NOT EXISTS workouts (
  date TEXT PRIMARY KEY,            -- ISO date YYYY-MM-DD
  category TEXT NOT NULL,
  body_weight REAL,
  data TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_workouts_category ON workouts(category);
CREATE INDEX IF NOT EXISTS idx_workouts_updated ON workouts(updated_at);

-- =============================================================
-- Day templates: named layouts of sections (strength/cardio/metcon/notes/custom).
-- Each user builds their own; a default single-section template ships for new users.
-- =============================================================
CREATE TABLE IF NOT EXISTS day_templates (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  name TEXT NOT NULL,
  sections TEXT NOT NULL,          -- JSON: [{type, title, subtitle}]
  is_default INTEGER DEFAULT 0,    -- 1 = the fallback if no schedule matches
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id)
);
CREATE INDEX IF NOT EXISTS idx_day_templates_user ON day_templates(user_id);

-- =============================================================
-- Schedules: a weekly pattern + duration. A schedule maps day-of-week to
-- a template, and applies from start_date for duration_days (NULL = indefinite).
-- Resolution: given a date, find the latest schedule whose window covers it,
-- then read weekly_map[dayOfWeek(date)] to get the template.
-- =============================================================
CREATE TABLE IF NOT EXISTS schedules (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  name TEXT NOT NULL,
  start_date TEXT NOT NULL,        -- ISO date YYYY-MM-DD
  duration_days INTEGER,           -- NULL = indefinite
  weekly_map TEXT NOT NULL,        -- JSON: {"0":templateId,"1":templateId,...} Sun=0..Sat=6, null = default template
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id)
);
CREATE INDEX IF NOT EXISTS idx_schedules_user ON schedules(user_id);
CREATE INDEX IF NOT EXISTS idx_schedules_start ON schedules(start_date);

-- =============================================================
-- App suggestions: any authenticated user can submit; admin sees all.
-- status: 'new' | 'in-progress' | 'done' | 'wontfix'
-- =============================================================
CREATE TABLE IF NOT EXISTS suggestions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  text TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'new',
  admin_note TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id)
);
CREATE INDEX IF NOT EXISTS idx_suggestions_user ON suggestions(user_id);
CREATE INDEX IF NOT EXISTS idx_suggestions_status ON suggestions(status);
