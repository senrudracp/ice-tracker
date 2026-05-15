-- ICE 3.0 Dev Command Centre — Supabase Schema
-- Paste this entire file into Supabase → SQL Editor → Run

-- ============================================================
-- TABLES
-- ============================================================

create table if not exists public.developers (
  id          text primary key,
  name        text not null,
  role        text not null check (role in ('BE','FE','QA','LEAD')),
  color       text not null default '#185FA5',
  created_at  timestamptz default now()
);

create table if not exists public.sprints (
  id          serial primary key,
  name        text not null,
  start_date  date,
  end_date    date,
  status      text default 'ACTIVE' check (status in ('ACTIVE','COMPLETED','PLANNED')),
  created_at  timestamptz default now()
);

create table if not exists public.tasks (
  id          text primary key,  -- e.g. "FR-022:BE-01"
  fr          text not null,
  fr_name     text not null,
  task_id     text not null,
  type        text not null check (type in ('BE','FE','INT')),
  description text not null,
  file_name   text,
  module      text,
  pkg_path    text,
  est_days    numeric(4,2) default 0,
  readiness   text default 'can_start' check (readiness in ('can_start','dep_on','needs_fr')),
  sprint_no   integer,
  wave        text,
  created_at  timestamptz default now()
);

create table if not exists public.task_assignments (
  id            serial primary key,
  task_id       text references public.tasks(id) on delete cascade,
  developer_id  text references public.developers(id) on delete set null,
  status        text default 'NOT STARTED' check (status in ('NOT STARTED','IN PROGRESS','DONE','BLOCKED','AT RISK')),
  sprint_id     integer references public.sprints(id) on delete set null,
  notes         text,
  updated_at    timestamptz default now(),
  updated_by    text,
  unique(task_id)
);

create table if not exists public.status_history (
  id            serial primary key,
  task_id       text references public.tasks(id) on delete cascade,
  old_status    text,
  new_status    text,
  changed_by    text,
  changed_at    timestamptz default now()
);

-- ============================================================
-- INDEXES
-- ============================================================
create index if not exists idx_tasks_fr on public.tasks(fr);
create index if not exists idx_tasks_type on public.tasks(type);
create index if not exists idx_assignments_developer on public.task_assignments(developer_id);
create index if not exists idx_assignments_status on public.task_assignments(status);
create index if not exists idx_history_task on public.status_history(task_id);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================
alter table public.developers enable row level security;
alter table public.sprints enable row level security;
alter table public.tasks enable row level security;
alter table public.task_assignments enable row level security;
alter table public.status_history enable row level security;

-- Allow full anon access (internal tool — no auth needed)
create policy "anon_all_developers"   on public.developers       for all using (true) with check (true);
create policy "anon_all_sprints"      on public.sprints           for all using (true) with check (true);
create policy "anon_all_tasks"        on public.tasks             for all using (true) with check (true);
create policy "anon_all_assignments"  on public.task_assignments  for all using (true) with check (true);
create policy "anon_all_history"      on public.status_history    for all using (true) with check (true);

-- ============================================================
-- SEED — Default sprint
-- ============================================================
insert into public.sprints (name, start_date, end_date, status)
values ('Sprint 1', current_date, current_date + interval '14 days', 'ACTIVE')
on conflict do nothing;

-- ============================================================
-- SEED — Default developers
-- ============================================================
insert into public.developers (id, name, role, color) values
  ('B1','BE Dev 1','BE','#185FA5'),
  ('B2','BE Dev 2','BE','#0F6E56'),
  ('B3','BE Dev 3','BE','#8250DF'),
  ('B4','BE Dev 4','BE','#D29922'),
  ('B5','BE Dev 5','BE','#993C1D'),
  ('F1','FE Dev 1','FE','#E24B4A'),
  ('F2','FE Dev 2','FE','#1D9E75'),
  ('F3','FE Dev 3','FE','#444441'),
  ('F4','FE Dev 4','FE','#7c3aed'),
  ('F5','FE Dev 5','FE','#0369a1')
on conflict (id) do nothing;

-- ============================================================
-- SEED — Tasks (FR-022, FR-028, FR-043 preview)
-- ============================================================
insert into public.tasks (id,fr,fr_name,task_id,type,description,file_name,module,pkg_path,est_days,readiness,sprint_no,wave) values
('FR-022:BE-01','FR-022','Execute Tests','BE-01','BE','GET /run-config — environments, browsers, run modes, journey list','RunConfigController.java','ice-execution-module','execution.controller',0.75,'can_start',4,'Wave 2'),
('FR-022:BE-02','FR-022','Execute Tests','BE-02','BE','GET /commits — commit list for Commit Regression panel','CommitRegressionController.java','ice-execution-module','execution.controller',0.75,'needs_fr',4,'Wave 2'),
('FR-022:BE-03','FR-022','Execute Tests','BE-03','BE','POST /impact/commit — SHA diff + ownership map impact','CommitRegressionService.java','ice-execution-module','execution.service',1.0,'dep_on',4,'Wave 2'),
('FR-022:BE-04','FR-022','Execute Tests','BE-04','BE','POST /impact/release — release ref diff impact analysis','ReleaseRegressionService.java','ice-execution-module','execution.service',1.0,'dep_on',4,'Wave 2'),
('FR-022:BE-05','FR-022','Execute Tests','BE-05','BE','POST /run — orchestrate run, validate payload, dispatch','RunOrchestrationService.java','ice-execution-module','execution.service',1.0,'dep_on',4,'Wave 2'),
('FR-022:BE-06','FR-022','Execute Tests','BE-06','BE','Local run executor — SSE stream via ICE agent pool','LocalAgentExecutionService.java','ice-execution-module','execution.service',1.5,'dep_on',4,'Wave 2'),
('FR-022:BE-07','FR-022','Execute Tests','BE-07','BE','Jenkins run relay — trigger configured Jenkins pipeline','JenkinsExecutionService.java','ice-execution-module','execution.service',1.0,'dep_on',4,'Wave 2'),
('FR-022:FE-01','FR-022','Execute Tests','FE-01','FE','ExecuteTestsComponent — full Angular screen layout','execute-tests.component.ts','ice-frontend (Angular)','features/execute-tests',1.75,'dep_on',4,'Wave 2'),
('FR-022:FE-02','FR-022','Execute Tests','FE-02','FE','EnvironmentDropdown — @Input/@Output Angular component','environment-dropdown.component.ts','ice-frontend (Angular)','features/execute-tests/components',0.5,'dep_on',4,'Wave 2'),
('FR-022:FE-03','FR-022','Execute Tests','FE-03','FE','RunModeRadios — Angular Reactive Forms radio group','run-mode-radios.component.ts','ice-frontend (Angular)','features/execute-tests/components',0.5,'dep_on',4,'Wave 2'),
('FR-022:FE-04','FR-022','Execute Tests','FE-04','FE','BrowserCheckboxes — All/individual mutual exclusion','browser-checkboxes.component.ts','ice-frontend (Angular)','features/execute-tests/components',0.5,'dep_on',4,'Wave 2'),
('FR-022:FE-05','FR-022','Execute Tests','FE-05','FE','TestTypeCheckboxes — Functional always locked','test-type-checkboxes.component.ts','ice-frontend (Angular)','features/execute-tests/components',0.5,'dep_on',4,'Wave 2'),
('FR-022:FE-06','FR-022','Execute Tests','FE-06','FE','ViewportCheckboxes — viewport multiplier selection','viewport-checkboxes.component.ts','ice-frontend (Angular)','features/execute-tests/components',0.5,'dep_on',4,'Wave 2'),
('FR-022:FE-07','FR-022','Execute Tests','FE-07','FE','RunTypeDropdown — switches context panel below','run-type-dropdown.component.ts','ice-frontend (Angular)','features/execute-tests/components',0.5,'can_start',4,'Wave 2'),
('FR-022:FE-08','FR-022','Execute Tests','FE-08','FE','cx-manual — Journey table with row checkboxes','cx-manual.component.ts','ice-frontend (Angular)','features/execute-tests/context-panels',1.0,'dep_on',4,'Wave 2'),
('FR-022:FE-09','FR-022','Execute Tests','FE-09','FE','cx-commit — Commit list + expandable impact chip','cx-commit.component.ts','ice-frontend (Angular)','features/execute-tests/context-panels',1.25,'dep_on',4,'Wave 2'),
('FR-022:FE-10','FR-022','Execute Tests','FE-10','FE','cx-release — From/To ref inputs + impact chips','cx-release.component.ts','ice-frontend (Angular)','features/execute-tests/context-panels',1.25,'dep_on',4,'Wave 2'),
('FR-022:FE-11','FR-022','Execute Tests','FE-11','FE','RunActionBar — dynamic Run button + events','run-action-bar.component.ts','ice-frontend (Angular)','features/execute-tests/components',0.5,'dep_on',4,'Wave 2'),
('FR-022:FE-12','FR-022','Execute Tests','FE-12','FE','LiveResultsArea — SSE EventSource consumer','live-results-area.component.ts','ice-frontend (Angular)','features/execute-tests/components',1.0,'dep_on',4,'Wave 2'),
('FR-022:FE-13','FR-022','Execute Tests','FE-13','FE','AnalyticsBtn — navigate to Analytics overlay','analytics-btn.component.ts','ice-frontend (Angular)','features/execute-tests/components',0.25,'can_start',4,'Wave 2'),
('FR-022:INT-01','FR-022','Execute Tests','INT-01','INT','Config rows render correctly + run triggered','ManualRunTest.java','ice-execution-module','integration',1.0,'dep_on',4,'Wave 2'),
('FR-022:INT-02','FR-022','Execute Tests','INT-02','INT','Commit Regression flow end-to-end','CommitRegressionTest.java','ice-execution-module','integration',1.0,'dep_on',4,'Wave 2'),
('FR-028:BE-01','FR-028','LLM Config','BE-01','BE','LlmConfig entity + JPA Repository + GET/PUT endpoints','LlmConfig.java','ice-settings-module','settings.llm.domain',0.5,'can_start',2,'Wave 2'),
('FR-028:BE-02','FR-028','LLM Config','BE-02','BE','LlmConfigService — hot-swap provider without restart','LlmConfigService.java','ice-settings-module','settings.llm.service',0.75,'dep_on',2,'Wave 2'),
('FR-028:BE-03','FR-028','LLM Config','BE-03','BE','POST /llm-config/test — send minimal test prompt','LlmTestConnectionController.java','ice-settings-module','settings.llm',0.5,'dep_on',2,'Wave 2'),
('FR-028:FE-01','FR-028','LLM Config','FE-01','FE','LlmConfigScreen — main settings panel','LlmConfigScreen.tsx','ice-frontend (React)','modules/settings/panels/llm',0.75,'can_start',2,'Wave 2'),
('FR-028:FE-02','FR-028','LLM Config','FE-02','FE','ProviderDropdown — Anthropic / OpenAI / Azure / Bedrock','ProviderDropdown.tsx','ice-frontend (React)','modules/settings/panels/llm',0.5,'dep_on',2,'Wave 2'),
('FR-028:FE-03','FR-028','LLM Config','FE-03','FE','ModelInput — free-text model identifier field','ModelInput.tsx','ice-frontend (React)','modules/settings/panels/llm',0.25,'dep_on',2,'Wave 2'),
('FR-028:FE-04','FR-028','LLM Config','FE-04','FE','ApiKeyInput — masked password + sentinel pattern','ApiKeyInput.tsx','ice-frontend (React)','modules/settings/panels/llm',0.5,'dep_on',2,'Wave 2'),
('FR-028:FE-05','FR-028','LLM Config','FE-05','FE','TemperatureSlider — 0.0 to 2.0 range with live label','TemperatureSlider.tsx','ice-frontend (React)','modules/settings/panels/llm',0.5,'dep_on',2,'Wave 2'),
('FR-028:FE-06','FR-028','LLM Config','FE-06','FE','TestConnectionButton — POST with unsaved values','TestConnectionButton.tsx','ice-frontend (React)','modules/settings/panels/llm',0.5,'dep_on',2,'Wave 2'),
('FR-028:FE-07','FR-028','LLM Config','FE-07','FE','SaveChangesButton — PUT config + hot-swap toast','SaveChangesButton.tsx','ice-frontend (React)','modules/settings/panels/llm',0.25,'dep_on',2,'Wave 2'),
('FR-028:INT-01','FR-028','LLM Config','INT-01','INT','Full LLM config flow — save, test, hot-swap verified','LlmConfigSettingsTest.java','ice-settings-module','integration',1.0,'dep_on',2,'Wave 2'),
('FR-043:BE-01','FR-043','Analytics Dashboard','BE-01','BE','GET /analytics/runs — run history list with filters','RunAnalyticsService.java','ice-analytics-module','analytics.service',1.0,'needs_fr',6,'Wave 4'),
('FR-043:BE-02','FR-043','Analytics Dashboard','BE-02','BE','GET /analytics/runs/{runId} — per-TC results paginated','RunAnalyticsService.java','ice-analytics-module','analytics.service',1.0,'needs_fr',6,'Wave 4'),
('FR-043:BE-03','FR-043','Analytics Dashboard','BE-03','BE','GET+PUT /settings/confidence — confidence gate threshold','ConfidenceGateService.java','ice-analytics-module','analytics.service',1.0,'needs_fr',6,'Wave 4'),
('FR-043:BE-04','FR-043','Analytics Dashboard','BE-04','BE','CLAP async root cause analysis — run_analysis table','RootCauseService.java','ice-analytics-module','analytics.service',1.5,'dep_on',6,'Wave 4'),
('FR-043:BE-05','FR-043','Analytics Dashboard','BE-05','BE','PDF/Excel report generator — iText 7 + Apache POI','ReportGenerationService.java','ice-analytics-module','analytics.service',1.75,'dep_on',6,'Wave 4'),
('FR-043:BE-06','FR-043','Analytics Dashboard','BE-06','BE','POST /create-jira — Jira issue from CLAP root cause','JiraIssueService.java','ice-analytics-module','analytics.service',1.0,'dep_on',6,'Wave 4'),
('FR-043:FE-01','FR-043','Analytics Dashboard','FE-01','FE','AnalyticsDashboard — full-screen overlay shell','analytics-dashboard.component.ts','ice-frontend (Angular)','features/analytics',1.0,'dep_on',6,'Wave 4'),
('FR-043:FE-02','FR-043','Analytics Dashboard','FE-02','FE','Per-TC Results Table — expandable failed rows','tc-results-table.component.ts','ice-frontend (Angular)','features/analytics/components',1.0,'dep_on',6,'Wave 4'),
('FR-043:FE-03','FR-043','Analytics Dashboard','FE-03','FE','Confidence Gate Card — PASS/FAIL + inline edit','confidence-gate.component.ts','ice-frontend (Angular)','features/analytics/components',0.5,'dep_on',6,'Wave 4'),
('FR-043:FE-04','FR-043','Analytics Dashboard','FE-04','FE','CLAP Root Cause Card + Create Jira Ticket button','clap-root-cause.component.ts','ice-frontend (Angular)','features/analytics/components',1.0,'dep_on',6,'Wave 4'),
('FR-043:FE-05','FR-043','Analytics Dashboard','FE-05','FE','Generate Report Button — POST + window.open on success','analytics-dashboard.component.ts','ice-frontend (Angular)','features/analytics',0.25,'dep_on',6,'Wave 4'),
('FR-043:INT-01','FR-043','Analytics Dashboard','INT-01','INT','Analytics overlay + stat cards + results table','AnalyticsDashboardLayoutE2ETest.java','ice-analytics-module','integration',1.25,'dep_on',6,'Wave 4'),
('FR-043:INT-02','FR-043','Analytics Dashboard','INT-02','INT','Confidence gate + CLAP root cause + Jira ticket','ConfidenceGateClapJiraE2ETest.java','ice-analytics-module','integration',1.25,'dep_on',6,'Wave 4'),
('FR-043:INT-03','FR-043','Analytics Dashboard','INT-03','INT','PDF Report download flow end-to-end','PdfReportE2ETest.java','ice-analytics-module','integration',1.0,'dep_on',6,'Wave 4')
on conflict (id) do nothing;

-- ============================================================
-- DEFAULT ASSIGNMENTS (B4 → FR-022 BE, F2 → FR-022 FE, etc.)
-- ============================================================
insert into public.task_assignments (task_id, developer_id, status) values
('FR-022:BE-01','B4','NOT STARTED'),('FR-022:BE-02','B4','NOT STARTED'),
('FR-022:BE-03','B4','NOT STARTED'),('FR-022:BE-04','B4','NOT STARTED'),
('FR-022:BE-05','B4','NOT STARTED'),('FR-022:BE-06','B4','NOT STARTED'),
('FR-022:BE-07','B4','NOT STARTED'),('FR-022:INT-01','B4','NOT STARTED'),
('FR-022:INT-02','B4','NOT STARTED'),('FR-022:FE-01','F2','NOT STARTED'),
('FR-022:FE-02','F2','NOT STARTED'),('FR-022:FE-03','F2','NOT STARTED'),
('FR-022:FE-04','F2','NOT STARTED'),('FR-022:FE-05','F2','NOT STARTED'),
('FR-022:FE-06','F2','NOT STARTED'),('FR-022:FE-07','F2','NOT STARTED'),
('FR-022:FE-08','F2','NOT STARTED'),('FR-022:FE-09','F2','NOT STARTED'),
('FR-022:FE-10','F2','NOT STARTED'),('FR-022:FE-11','F2','NOT STARTED'),
('FR-022:FE-12','F2','NOT STARTED'),('FR-022:FE-13','F2','NOT STARTED'),
('FR-028:BE-01','B4','NOT STARTED'),('FR-028:BE-02','B4','NOT STARTED'),
('FR-028:BE-03','B4','NOT STARTED'),('FR-028:INT-01','B4','NOT STARTED'),
('FR-028:FE-01','F5','NOT STARTED'),('FR-028:FE-02','F5','NOT STARTED'),
('FR-028:FE-03','F5','NOT STARTED'),('FR-028:FE-04','F5','NOT STARTED'),
('FR-028:FE-05','F5','NOT STARTED'),('FR-028:FE-06','F5','NOT STARTED'),
('FR-028:FE-07','F5','NOT STARTED'),('FR-043:BE-01','B5','NOT STARTED'),
('FR-043:BE-02','B5','NOT STARTED'),('FR-043:BE-03','B5','NOT STARTED'),
('FR-043:BE-04','B5','NOT STARTED'),('FR-043:BE-05','B5','NOT STARTED'),
('FR-043:BE-06','B5','NOT STARTED'),('FR-043:INT-01','B5','NOT STARTED'),
('FR-043:INT-02','B5','NOT STARTED'),('FR-043:INT-03','B5','NOT STARTED'),
('FR-043:FE-01','F2','NOT STARTED'),('FR-043:FE-02','F2','NOT STARTED'),
('FR-043:FE-03','F2','NOT STARTED'),('FR-043:FE-04','F2','NOT STARTED'),
('FR-043:FE-05','F2','NOT STARTED')
on conflict (task_id) do nothing;
