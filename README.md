# Workout Journal 💪

Single-file workout tracker. AM strength (machine/DB) → PM cardio + supplement-flavored metcon.

**Live:** https://americanbiscuit.github.io/workout-journal/

## Features

- Auto-selects day's focus based on date (Mon=Chest/Tri, Tue=Back/Bi, Wed=Shoulders, Thu=Abs, Fri=Legs)
- Big exercise pool per category — autocomplete pulls from the day's pool
- AM strength: sets/reps/weight per exercise
- PM cardio (distance/time/HR) + metcon (rounds/RPE/exercises)
- History with stats (total workouts, last 7 days, total miles, categories hit)
- Click any past workout to load it back into the form
- Export/Import JSON for backup
- All data stored in browser localStorage — no backend, no account, no tracking

## Local dev

Just open `index.html` in a browser. No build step.

## Deploying changes

```bash
git add . && git commit -m "your message" && git push
```

GitHub Pages will pick it up within ~1 minute.

## Constraints (Tanner-specific)

- AM = machine + DB only (no bench, no squat rack in mornings)
- No deadlifts — RDLs OK (DB RDL, single-leg RDL)
- Legs AM = leg press, leg curls, leg extensions, DB lunges/RDL
- Wednesday abs gets moved around based on schedule
