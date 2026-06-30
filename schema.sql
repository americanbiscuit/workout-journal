-- Workout Journal D1 schema
-- One row per workout date; full workout stored as JSON blob (data column).
-- Indexable fields broken out for future queries (strength progression by category, etc.)

CREATE TABLE IF NOT EXISTS workouts (
  date TEXT PRIMARY KEY,            -- ISO date YYYY-MM-DD
  category TEXT NOT NULL,
  body_weight REAL,
  data TEXT NOT NULL,               -- full JSON blob (am exercises, cardio, metcon, notes)
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_workouts_category ON workouts(category);
CREATE INDEX IF NOT EXISTS idx_workouts_updated ON workouts(updated_at);
