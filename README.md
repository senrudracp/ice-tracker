# ICE 3.0 — Dev Command Centre

Enterprise sprint tracker for the ICE 3.0 platform — persisted to Supabase, hosted on GitHub Pages.

**Live:** https://senrudracp.github.io/ice-tracker/

---

## One-time setup (5 minutes)

### Step 1 — Supabase schema
1. Go to your Supabase project → **SQL Editor**
2. Paste the entire contents of `schema.sql`
3. Click **Run**

That creates all tables, indexes, RLS policies, and seeds the default developers + tasks.

### Step 2 — GitHub Pages
1. Go to your repo → **Settings → Pages**
2. Source: **GitHub Actions**
3. Save

### Step 3 — Push
```bash
git clone https://github.com/senrudracp/ice-tracker
cd ice-tracker
# copy index.html, schema.sql, .github/ into the repo
git add .
git commit -m "feat: ICE Dev Command Centre v1"
git push origin main
```

GitHub Actions deploys automatically. Live in ~60 seconds.

---

## Features

| Feature | Detail |
|---|---|
| **Task Register** | All tasks with status + assigned dev, editable inline |
| **Persistence** | Every change saved to Supabase in real time |
| **Audit log** | Every status change recorded in `status_history` |
| **Team management** | Add/remove developers, workload breakdown |
| **Dependencies** | Per-FR readiness view (Ready / Queued / Blocked) |
| **Sprint board** | Kanban lanes per FR |
| **Global search** | Search across FR, task, file, developer |
| **Filters** | By type (BE/FE/INT), status, FR, sprint |

---

## Adding all 60 FRs

The schema seeds FR-022, FR-028, and FR-043 as a preview.
To add remaining FRs: append INSERT rows to the `tasks` section of `schema.sql` and re-run in Supabase SQL Editor.

---

## Database schema

```
developers       — id, name, role, color
sprints          — id, name, start_date, end_date, status
tasks            — id (FR:task), fr, task_id, type, description, file_name, module, pkg_path, est_days, readiness
task_assignments — task_id, developer_id, status, sprint_id, notes, updated_at
status_history   — task_id, old_status, new_status, changed_by, changed_at
```
