#!/usr/bin/env python3
"""
Dry-run: computes what sync.py's new readiness/dependent_on values would be,
compares against what's currently live in Supabase, and reports transition
counts WITHOUT pushing anything.
"""
import urllib.request
from collections import Counter
from sync import (
    XLSX_PATH, SPRINT_XLSX_PATH, SUPABASE_URL, SUPABASE_KEY,
    read_excel, read_sprint_lookup,
)

HEADERS = {"apikey": SUPABASE_KEY, "Authorization": f"Bearer {SUPABASE_KEY}"}


def fetch_live():
    req = urllib.request.Request(
        f"{SUPABASE_URL}/rest/v1/tasks?select=fr,task_num,readiness,dependent_on",
        headers=HEADERS,
    )
    import json
    with urllib.request.urlopen(req) as resp:
        rows = json.loads(resp.read())
    return {(r['fr'], r['task_num']): r for r in rows}


def main():
    sprint_lookup = read_sprint_lookup(SPRINT_XLSX_PATH)
    new_tasks = {(t['fr'], t['task_num']): t for t in read_excel(XLSX_PATH, sprint_lookup)}
    live = fetch_live()

    transitions = Counter()
    new_only = []   # tasks in master_v132 that don't exist in Supabase yet
    changed = []

    for key, t in new_tasks.items():
        old = live.get(key)
        if old is None:
            new_only.append(key)
            transitions[f"(new task) -> {t['readiness']}"] += 1
            continue
        if old['readiness'] != t['readiness']:
            transitions[f"{old['readiness']} -> {t['readiness']}"] += 1
            changed.append((key, old['readiness'], t['readiness'], old['dependent_on'], t['dependent_on']))

    print(f"Total tasks in master_v132   : {len(new_tasks)}")
    print(f"Total tasks live in Supabase : {len(live)}")
    print(f"New tasks (not yet in Supabase): {len(new_only)}")
    print(f"Readiness changes on existing tasks: {len(changed)}")
    print()
    print("-- Transition counts --")
    for k, v in sorted(transitions.items()):
        print(f"  {k}: {v}")
    print()

    spot_checks = [
        ('FR-001', 'BE-02'),
        ('FR-036', 'BE-01'),
        ('FR-054', 'BE-01'),
    ]
    print("-- Spot checks --")
    for key in spot_checks:
        t = new_tasks.get(key)
        old = live.get(key)
        print(f"  {key[0]}/{key[1]}: before={old['readiness'] if old else 'N/A'} "
              f"after={t['readiness'] if t else 'N/A'} raw={t['dependent_on'] if t else 'N/A'!r}")

    print()
    print("-- FR-013..017 bare BE-XX dependency cases --")
    for key, t in sorted(new_tasks.items()):
        fr_num = key[0]
        if fr_num in ('FR-013', 'FR-014', 'FR-015', 'FR-016', 'FR-017'):
            dep = t['dependent_on']
            if dep and 'FR-' not in dep and 'NFR-' not in dep:
                old = live.get(key)
                print(f"  {key[0]}/{key[1]}: before={old['readiness'] if old else 'N/A'} "
                      f"after={t['readiness']} raw={dep!r}")

    if changed:
        print()
        print(f"-- All {len(changed)} changed rows (FR, Task, old, new, old_dep, new_dep) --")
        for key, old_r, new_r, old_dep, new_dep in changed:
            print(f"  {key[0]} {key[1]}: {old_r} -> {new_r}")


if __name__ == "__main__":
    main()
