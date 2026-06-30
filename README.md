# Workout Journal 💪

Single-file workout tracker. AM strength (machine/DB) → PM cardio + supplement-flavored metcon.

**Live:** https://workout-journal-85a.pages.dev/ (Cloudflare Pages)

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
# Push to GitHub for backup
git add . && git commit -m "your message" && git push

# Deploy to Cloudflare Pages
npx wrangler pages deploy . --project-name=workout-journal --branch=main --commit-dirty=true
```

Live within ~10 seconds.

To set up Git auto-deploy (so `git push` alone is enough), connect the GitHub repo to the Pages project in the Cloudflare dashboard:
**dash.cloudflare.com → Workers & Pages → workout-journal → Settings → Builds & deployments → Connect**

## Constraints (Tanner-specific)

- AM = machine + DB only (no bench, no squat rack in mornings)
- No deadlifts — RDLs OK (DB RDL, single-leg RDL)
- Legs AM = leg press, leg curls, leg extensions, DB lunges/RDL
- Wednesday abs gets moved around based on schedule
