#!/usr/bin/env python3
"""
ICE 3.0 Sprint Tracker — Excel → Supabase Sync Script (v132+)
Usage: python sync.py [path/to/ICE_Master_Requirements_vXXX.xlsx]
Defaults to ..\ICE_Master_Requirements_v132.xlsx

FR/Task/dependency data comes from the Master Requirements workbook.
Sprint/wave scheduling still comes from ICE_Plan_v23.xlsx (Detailed
Requirements sheet), since the Master Requirements workbook carries no
Phase/Sprint columns — the two are merged by (fr, task_num) key. Tasks
present only in Master Requirements (not yet scheduled in ICE_Plan) fall
back to the same "Sprint 1" / no-wave default used for blank cells.
"""

import sys, json, os
from datetime import datetime, date
from openpyxl import load_workbook
import urllib.request
import urllib.error
from classify import classify_dependency

# ── Config ────────────────────────────────────────────────────────────────
SUPABASE_URL = "https://toweihaqxumykvdppdqr.supabase.co"
SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRvd2VpaGFxeHVteWt2ZHBwZHFyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzcxOTU1MzYsImV4cCI6MjA5Mjc3MTUzNn0.vQYm9FbYd7DbMWZn3aU4pxpz4DoHaJQljWD-MFKya58"
SHEET_NAME   = "ICE 3.0 — Master Requirements"
XLSX_PATH    = sys.argv[1] if len(sys.argv) > 1 else "..\\ICE_Master_Requirements_v132.xlsx"

SPRINT_XLSX_PATH  = "..\\ICE_Plan_v23.xlsx"
SPRINT_SHEET_NAME = "Detailed Requirements"

HEADERS = {
    "Content-Type": "application/json",
    "apikey": SUPABASE_KEY,
    "Authorization": f"Bearer {SUPABASE_KEY}",
    "Prefer": "return=minimal"
}

# Column indices in "ICE 3.0 — Master Requirements" sheet (0-based)
COL_FR            = 2
COL_TASK_NUM      = 5
COL_TASK_DET      = 6
COL_TASK_TYPE     = 9
COL_DEPENDENT_ON  = 10
COL_EFFORT_AI     = 13   # Effort w/ AI + Buffer (days)

# Column indices in ICE_Plan_v23.xlsx's "Detailed Requirements" sheet,
# used only to look up sprint/wave scheduling (0-based)
SPRINT_COL_FR          = 2
SPRINT_COL_TASK_NUM    = 5
SPRINT_COL_PHASE       = 22
SPRINT_COL_SPRINT_NO   = 23
SPRINT_COL_SPRINT_NAME = 24

def req(method, path, data=None):
    url = f"{SUPABASE_URL}/rest/v1/{path}"
    body = json.dumps(data).encode() if data else None
    r = urllib.request.Request(url, data=body, headers=HEADERS, method=method)
    try:
        with urllib.request.urlopen(r) as resp:
            raw = resp.read()
            return json.loads(raw) if raw else {}
    except urllib.error.HTTPError as e:
        print(f"  HTTP {e.code}: {e.read().decode()}")
        return None
    except urllib.error.URLError as e:
        print(f"  Network error: {e.reason}")
        print("  Check your internet connection / VPN.")
        return None

def normalise_task_type(raw):
    """Map verbose task type to short label used by the UI."""
    if not raw:
        return 'BE'
    r = str(raw).strip()
    if r.startswith('FE'):
        return 'Frontend Dev'
    if r.startswith('INT'):
        return 'QA / Both Devs'
    return 'Backend Dev'  # BE - Independent / BE - Dependent

def read_sprint_lookup(path):
    """Maps (fr, task_num) -> (wave, sprint_no, sprint_name) from ICE_Plan_v23."""
    if not os.path.exists(path):
        print(f"  Warning: sprint source not found at {path} — sprint/wave will use defaults")
        return {}

    wb = load_workbook(path, data_only=True)
    ws = wb[SPRINT_SHEET_NAME]
    lookup = {}

    for row in ws.iter_rows(min_row=2, max_row=ws.max_row, values_only=True):
        fr       = str(row[SPRINT_COL_FR]       or '').strip()
        task_num = str(row[SPRINT_COL_TASK_NUM] or '').strip()
        if not fr.startswith('FR-') or not task_num:
            continue
        lookup[(fr, task_num)] = (
            str(row[SPRINT_COL_PHASE] or '').strip(),
            row[SPRINT_COL_SPRINT_NO],
            str(row[SPRINT_COL_SPRINT_NAME] or '').strip(),
        )

    return lookup


def read_excel(path, sprint_lookup):
    wb = load_workbook(path, data_only=True)
    ws = wb[SHEET_NAME]
    tasks = []
    seen_keys = set()

    for row in ws.iter_rows(min_row=2, max_row=ws.max_row, values_only=True):
        fr       = str(row[COL_FR]       or '').strip()
        task_num = str(row[COL_TASK_NUM] or '').strip()

        if not fr.startswith('FR-') or not task_num:
            continue

        key = (fr, task_num)
        if key in seen_keys:
            continue
        seen_keys.add(key)

        wave, sprint_no, sprint_name = sprint_lookup.get(key, ('', None, ''))
        sprint = f"Sprint {sprint_no}" if sprint_no else "Sprint 1"
        if sprint_name:
            sprint = f"Sprint {sprint_no} — {sprint_name.split('—')[-1].strip()}" if sprint_no else sprint_name

        raw_type = str(row[COL_TASK_TYPE] or '').strip()
        estimate = row[COL_EFFORT_AI]
        readiness, dependent_on = classify_dependency(row[COL_DEPENDENT_ON], fr)

        tasks.append({
            'fr':           fr,
            'task_num':     task_num,
            'sprint':       sprint,
            'wave':         wave,
            'task_type':    normalise_task_type(raw_type),
            'task_details': str(row[COL_TASK_DET] or '')[:500],
            'estimate':     float(estimate) if estimate else None,
            'readiness':    readiness,
            'dependent_on': dependent_on,
            'planned_start': None,
            'planned_end':   None,
        })

    return tasks

def get_existing_keys():
    result = req("GET", "tasks?select=fr,task_num,id")
    if not result:
        return {}
    return {(r['fr'], r['task_num']): r['id'] for r in result}

def sync():
    if not os.path.exists(XLSX_PATH):
        print(f"File not found: {XLSX_PATH}")
        sys.exit(1)

    print(f"\n{'='*55}")
    print(f"  ICE 3.0 Sprint Tracker — Sync")
    print(f"  Source : {XLSX_PATH}")
    print(f"  Target : {SUPABASE_URL}")
    print(f"  Time   : {datetime.now().strftime('%d %b %Y %H:%M')}")
    print(f"{'='*55}\n")

    print("Reading sprint/wave lookup...")
    sprint_lookup = read_sprint_lookup(SPRINT_XLSX_PATH)
    print(f"  Found {len(sprint_lookup)} scheduled tasks in {SPRINT_XLSX_PATH}\n")

    print("Reading Excel...")
    tasks = read_excel(XLSX_PATH, sprint_lookup)
    print(f"  Found {len(tasks)} tasks in Excel\n")

    if len(tasks) == 0:
        print("  No tasks found — check XLSX path and sheet name.")
        sys.exit(1)

    print("Fetching existing Supabase tasks...")
    existing = get_existing_keys()
    if existing is None:
        print("  Could not connect to Supabase. Aborting.")
        sys.exit(1)
    print(f"  Found {len(existing)} tasks in Supabase\n")

    added = updated = failed = 0

    for i, t in enumerate(tasks):
        key = (t['fr'], t['task_num'])
        if key in existing:
            payload = {
                'sprint':       t['sprint'],
                'wave':         t['wave'],
                'task_type':    t['task_type'],
                'task_details': t['task_details'],
                'estimate':     t['estimate'],
                'readiness':    t['readiness'],
                'dependent_on': t['dependent_on'],
                'synced_at':    datetime.now().isoformat(),
            }
            result = req("PATCH", f"tasks?fr=eq.{t['fr']}&task_num=eq.{t['task_num']}", payload)
            if result is not None:
                updated += 1
            else:
                failed += 1
                print(f"  ⚠  Failed to update {t['fr']} {t['task_num']}")
        else:
            payload = {**t, 'synced_at': datetime.now().isoformat()}
            result = req("POST", "tasks", payload)
            if result is not None:
                added += 1
                print(f"  + {t['fr']} {t['task_num']} — {t['task_details'][:50]}")
            else:
                failed += 1
                print(f"  ⚠  Failed to insert {t['fr']} {t['task_num']}")

        if (i+1) % 50 == 0:
            print(f"  ... processed {i+1}/{len(tasks)}")

    req("POST", "sync_log", {
        'rows_added':   added,
        'rows_updated': updated,
        'rows_skipped': 0,
        'source':       os.path.basename(XLSX_PATH)
    })

    print(f"\n{'='*55}")
    print(f"  Sync complete!")
    print(f"  Added   : {added}")
    print(f"  Updated : {updated}")
    print(f"  Failed  : {failed}")
    print(f"{'='*55}\n")

if __name__ == "__main__":
    sync()
