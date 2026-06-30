#!/usr/bin/env node
/**
 * Archive workouts older than N days from D1 → `data/archive.json` in this repo.
 *
 * Usage:
 *   node scripts/archive-old-workouts.mjs              # archive workouts > 30 days old (default)
 *   node scripts/archive-old-workouts.mjs --days 60    # archive workouts > 60 days old
 *   node scripts/archive-old-workouts.mjs --dry-run    # show what would happen, don't write
 *   node scripts/archive-old-workouts.mjs --keep       # archive but don't delete from D1
 *
 * The frontend loads BOTH `data/archive.json` AND live D1 data, so archived
 * workouts continue to show in week/history views.
 *
 * Note: D1 free tier is 5GB / 5M reads per month. A single-user workout journal
 * will never approach this — the archive script is for backup discipline and
 * keeping the live DB small for fast queries, not for cost reasons.
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(__dirname, '..');
const ARCHIVE_PATH = join(REPO_ROOT, 'data', 'archive.json');
const API_BASE = 'https://workout-journal-85a.pages.dev/api/workouts';

const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const keep = args.includes('--keep');
const daysIdx = args.indexOf('--days');
const cutoffDays = daysIdx >= 0 ? parseInt(args[daysIdx + 1]) : 30;

console.log(`Archive cutoff: ${cutoffDays} days`);
console.log(`Dry run: ${dryRun ? 'YES' : 'no'}`);
console.log(`Keep in D1: ${keep ? 'YES' : 'no (will delete after archive)'}`);

// 1. Fetch live workouts from D1
const res = await fetch(API_BASE);
if (!res.ok) {
  console.error('Failed to fetch:', res.status, await res.text());
  process.exit(1);
}
const { workouts: live } = await res.json();
console.log(`\nFetched ${live.length} live workouts from D1`);

// 2. Determine cutoff date
const cutoff = new Date();
cutoff.setDate(cutoff.getDate() - cutoffDays);
const cutoffStr = cutoff.toISOString().slice(0, 10);
console.log(`Archiving workouts older than ${cutoffStr}`);

const toArchive = live.filter(w => w.date < cutoffStr);
console.log(`Workouts to archive: ${toArchive.length}`);
if (!toArchive.length) {
  console.log('\nNothing to archive. Exiting.');
  process.exit(0);
}

// 3. Load existing archive (if any) and merge
let archive = { workouts: [] };
if (existsSync(ARCHIVE_PATH)) {
  archive = JSON.parse(readFileSync(ARCHIVE_PATH, 'utf-8'));
  console.log(`Existing archive: ${archive.workouts.length} workouts`);
}
const byDate = {};
archive.workouts.forEach(w => { byDate[w.date] = w; });
toArchive.forEach(w => { byDate[w.date] = w; });
archive.workouts = Object.values(byDate).sort((a, b) => b.date.localeCompare(a.date));
archive.archivedAt = new Date().toISOString();
archive.totalCount = archive.workouts.length;

// 4. Write to disk
if (!dryRun) {
  if (!existsSync(dirname(ARCHIVE_PATH))) mkdirSync(dirname(ARCHIVE_PATH), { recursive: true });
  writeFileSync(ARCHIVE_PATH, JSON.stringify(archive, null, 2));
  console.log(`\nWrote ${archive.workouts.length} total workouts to ${ARCHIVE_PATH}`);
} else {
  console.log(`\n[DRY RUN] Would write ${archive.workouts.length} workouts to ${ARCHIVE_PATH}`);
}

// 5. Delete from D1 (unless --keep)
if (!keep && !dryRun) {
  console.log(`\nDeleting ${toArchive.length} archived workouts from D1...`);
  let deleted = 0;
  for (const w of toArchive) {
    const dres = await fetch(`${API_BASE}/${w.date}`, { method: 'DELETE' });
    if (dres.ok) deleted++;
    else console.warn(`  Failed to delete ${w.date}: ${dres.status}`);
  }
  console.log(`Deleted ${deleted}/${toArchive.length} from D1`);
} else if (!keep && dryRun) {
  console.log(`\n[DRY RUN] Would delete ${toArchive.length} from D1`);
}

console.log('\nDone. Remember to commit + push the updated archive.json:');
console.log('  git add data/archive.json && git commit -m "archive workouts through ' + cutoffStr + '" && git push');
