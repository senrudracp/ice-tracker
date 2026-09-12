"""
Dependency classification for column K ("Dependent On").

Given the raw column-K text for a task belonging to FR <current_fr>, classify
it into one of:
  - 'can_start' — no dependency (Ready now)
  - 'dep_on'     — depends only on task(s) within the same FR (Intra-FR dep)
  - 'needs_fr'   — depends on a task in a different FR, or the external NFR doc
                   (Needs another FR)
"""
import re

_EMPTY_VALUES = {'', 'none', 'nan', '—', '-'}
_SPLIT_RE = re.compile(r'[\n,;·]+')  # newline, comma, semicolon, middle dot (·)
_FR_RE = re.compile(r'\bFR-(\d+)\b')
_NFR_RE = re.compile(r'\bNFR-(\d+)\b')


def classify_dependency(raw, current_fr):
    """Returns (readiness, dependent_on) for storage in Supabase."""
    text = '' if raw is None else str(raw).strip()

    if text.lower() in _EMPTY_VALUES:
        return 'can_start', ''

    current_num = _fr_number(current_fr)
    tokens = [t.strip() for t in _SPLIT_RE.split(text) if t.strip()]

    if not tokens:
        return 'can_start', text

    any_cross = False
    for token in tokens:
        if _NFR_RE.search(token):
            any_cross = True
            break
        fr_refs = [int(n) for n in _FR_RE.findall(token)]
        if any(n != current_num for n in fr_refs):
            any_cross = True
            break

    readiness = 'needs_fr' if any_cross else 'dep_on'
    return readiness, text


def _fr_number(fr):
    m = _FR_RE.search(fr)
    return int(m.group(1)) if m else None
