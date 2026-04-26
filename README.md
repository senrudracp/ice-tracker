# ICE 3.0 — Sprint Tracker

Live dashboard for ICE 3.0 sprint tracking. Internal use — Changepond Technologies.

**Live URL:** https://senrudracp.github.io/ice-tracker

---

## Setup (one-time, ~15 minutes)

### Step 1 — Supabase schema

1. Go to https://supabase.com → sign in → open project `tracker`
2. Click **SQL Editor** → **New Query**
3. Paste the contents of `scripts/schema.sql`
4. Click **Run**

### Step 2 — Initial data import

Run the sync script to import all 595 tasks from Excel:

```bash
# Install dependency
pip install openpyxl

# Run sync (from this folder)
python scripts/sync.py path/to/ICE_Plan_v18.xlsx
```

### Step 3 — Push to GitHub

```bash
git init
git remote add origin https://github.com/senrudracp/ice-tracker.git
git add .
git commit -m "Initial ICE 3.0 Sprint Tracker"
git push -u origin main
```

GitHub Actions will auto-build and deploy to GitHub Pages in ~2 minutes.

### Step 4 — Enable GitHub Pages

1. Go to https://github.com/senrudracp/ice-tracker → **Settings**
2. Click **Pages** in the left sidebar
3. Under **Source** → select **gh-pages** branch → click **Save**

Your app is live at: **https://senrudracp.github.io/ice-tracker**

---

## Daily usage

### Updating task status
1. Open https://senrudracp.github.io/ice-tracker
2. Password: `Welcometoice@123`
3. Click **Edit** on any task row
4. Update status, assignee, actual dates → **Save**
5. Stakeholders see it instantly

### Adding team members
1. Click **👥 Team** in the top bar
2. Type developer name + role → **Add**
3. They appear in all Assignee dropdowns immediately

### Syncing plan changes from Excel
When you add tasks or change estimates in ICE_Plan_v18.xlsx:

```bash
python scripts/sync.py ICE_Plan_v18.xlsx
```

- New tasks are inserted
- Existing task details/estimates are updated
- Status, assignee, actual dates are **never touched** by sync

---

## Architecture

```
ICE_Plan_v18.xlsx  →  sync.py  →  Supabase DB
                                        ↓
                          React App (GitHub Pages)
                                        ↓
                           Stakeholders (read-only view)
                           You (edit status, assignees)
```

---

## Files

| File | Purpose |
|---|---|
| `src/App.js` | Full React dashboard |
| `src/supabase.js` | Supabase client config |
| `scripts/schema.sql` | Run once in Supabase SQL Editor |
| `scripts/sync.py` | Run after any Excel changes |
| `.github/workflows/deploy.yml` | Auto-deploy on git push |
