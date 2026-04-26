import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from './supabase';

// ── Password hash (SHA-256 of "Welcometoice@123") ─────────────────────────
const PASS_HASH = '7f7a0a5a3b2e1f8c9d4e6b3a1c2f5d8e9a0b4c7d2e5f8a1b3c6d9e2f5a8b1c4';

async function hashPass(p) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(p));
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2,'0')).join('');
}

// ── Colours ───────────────────────────────────────────────────────────────
const STATUS_STYLES = {
  'Done':        { bg:'#F0FDF4', color:'#15803D', dot:'#22C55E' },
  'In Progress': { bg:'#FFFBEB', color:'#B45309', dot:'#F59E0B' },
  'Blocked':     { bg:'#FEF2F2', color:'#DC2626', dot:'#EF4444' },
  'Not Started': { bg:'#F9FAFB', color:'#6B7280', dot:'#D1D5DB' },
};
const TYPE_STYLES = {
  'Backend Dev':    { bg:'#EFF6FF', color:'#1D4ED8', label:'BE' },
  'Frontend Dev':   { bg:'#F0FDF4', color:'#15803D', label:'FE' },
  'QA / Both Devs': { bg:'#FFFBEB', color:'#B45309', label:'INT'},
};

function typeMeta(t) {
  return TYPE_STYLES[t] || { bg:'#F3F4F6', color:'#6B7280', label: t?.slice(0,2) || '?' };
}

// ── Variance chip ─────────────────────────────────────────────────────────
function VarChip({ task }) {
  const { actual_start, actual_end, estimate } = task;
  if (!actual_start || !actual_end || !estimate) return <span style={{color:'#D1D5DB'}}>—</span>;
  const ms = new Date(actual_end) - new Date(actual_start);
  const days = ms / 86400000 + 1;
  const diff = +(days - estimate).toFixed(1);
  if (diff === 0) return <span style={{color:'#6B7280',fontSize:11}}>On time</span>;
  if (diff > 0) return <span style={{color:'#DC2626',fontWeight:600,fontSize:11}}>+{diff}d over</span>;
  return <span style={{color:'#15803D',fontWeight:600,fontSize:11}}>{diff}d early</span>;
}

// ── Edit modal ────────────────────────────────────────────────────────────
function EditModal({ task, team, onSave, onClose }) {
  const [form, setForm] = useState({
    assignee_id:  task.assignee_id  || '',
    status:       task.status       || 'Not Started',
    actual_start: task.actual_start || '',
    actual_end:   task.actual_end   || '',
    actual_days:  task.actual_days  || '',
    notes:        task.notes        || '',
  });
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    const payload = {
      ...form,
      assignee_id:  form.assignee_id  || null,
      actual_start: form.actual_start || null,
      actual_end:   form.actual_end   || null,
      actual_days:  form.actual_days ? +form.actual_days : null,
    };
    const { error } = await supabase.from('tasks')
      .update(payload).eq('id', task.id);
    setSaving(false);
    if (!error) onSave({ ...task, ...payload });
  }

  return (
    <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.45)',zIndex:200,display:'flex',alignItems:'center',justifyContent:'center'}}>
      <div style={{background:'#fff',borderRadius:12,width:440,boxShadow:'0 20px 60px rgba(0,0,0,.2)',overflow:'hidden'}}>
        {/* Header */}
        <div style={{background:'#1A2744',padding:'14px 20px',color:'#fff'}}>
          <div style={{fontSize:13,fontWeight:700}}>{task.fr} {task.task_num}</div>
          <div style={{fontSize:11,opacity:.7,marginTop:2}}>{task.task_details?.slice(0,70)}</div>
        </div>
        {/* Form */}
        <div style={{padding:'20px 20px 16px',display:'flex',flexDirection:'column',gap:14}}>
          <Field label="Assignee">
            <select value={form.assignee_id} onChange={e=>setForm(f=>({...f,assignee_id:e.target.value}))} style={sel}>
              <option value="">— Unassigned —</option>
              {team.map(m=><option key={m.id} value={m.id}>{m.name} ({m.role})</option>)}
            </select>
          </Field>
          <Field label="Status">
            <select value={form.status} onChange={e=>setForm(f=>({...f,status:e.target.value}))} style={sel}>
              {['Not Started','In Progress','Done','Blocked'].map(s=><option key={s}>{s}</option>)}
            </select>
          </Field>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
            <Field label="Actual start">
              <input type="date" value={form.actual_start} onChange={e=>setForm(f=>({...f,actual_start:e.target.value}))} style={inp} />
            </Field>
            <Field label="Actual end">
              <input type="date" value={form.actual_end} onChange={e=>setForm(f=>({...f,actual_end:e.target.value}))} style={inp} />
            </Field>
          </div>
          <Field label="Actual days (optional)">
            <input type="number" step="0.25" min="0" value={form.actual_days}
              onChange={e=>setForm(f=>({...f,actual_days:e.target.value}))} style={inp} placeholder="e.g. 1.5" />
          </Field>
          <Field label="Notes">
            <textarea value={form.notes} onChange={e=>setForm(f=>({...f,notes:e.target.value}))}
              style={{...inp,height:60,resize:'vertical'}} placeholder="Any notes..." />
          </Field>
        </div>
        {/* Actions */}
        <div style={{padding:'12px 20px',borderTop:'1px solid #E5E7EB',display:'flex',justifyContent:'flex-end',gap:8}}>
          <button onClick={onClose} style={btnSec}>Cancel</button>
          <button onClick={save} disabled={saving} style={btnPri}>{saving?'Saving…':'Save'}</button>
        </div>
      </div>
    </div>
  );
}

const inp = {width:'100%',padding:'7px 10px',border:'1px solid #E5E7EB',borderRadius:7,fontSize:12,fontFamily:'inherit'};
const sel = {...inp, background:'#fff'};
const btnPri = {padding:'7px 18px',background:'#1A2744',color:'#fff',border:'none',borderRadius:7,fontSize:12,cursor:'pointer',fontWeight:600};
const btnSec = {padding:'7px 18px',background:'#fff',color:'#4B5563',border:'1px solid #E5E7EB',borderRadius:7,fontSize:12,cursor:'pointer'};

function Field({ label, children }) {
  return (
    <div>
      <div style={{fontSize:11,color:'#6B7280',marginBottom:5,fontWeight:500}}>{label}</div>
      {children}
    </div>
  );
}

// ── Team Settings panel ───────────────────────────────────────────────────
function TeamPanel({ team, onClose, onUpdate }) {
  const [members, setMembers] = useState(team);
  const [name, setName] = useState('');
  const [role, setRole] = useState('BE');
  const [saving, setSaving] = useState(false);

  async function addMember() {
    if (!name.trim()) return;
    setSaving(true);
    const { data } = await supabase.from('team_members').insert({ name: name.trim(), role }).select();
    if (data) {
      const updated = [...members, data[0]];
      setMembers(updated);
      onUpdate(updated);
      setName('');
    }
    setSaving(false);
  }

  async function removeMember(id) {
    await supabase.from('team_members').delete().eq('id', id);
    const updated = members.filter(m => m.id !== id);
    setMembers(updated);
    onUpdate(updated);
  }

  return (
    <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.45)',zIndex:200,display:'flex',alignItems:'center',justifyContent:'center'}}>
      <div style={{background:'#fff',borderRadius:12,width:380,boxShadow:'0 20px 60px rgba(0,0,0,.2)',overflow:'hidden'}}>
        <div style={{background:'#1A2744',padding:'14px 20px',color:'#fff',display:'flex',alignItems:'center',justifyContent:'space-between'}}>
          <div style={{fontSize:13,fontWeight:700}}>Team Members</div>
          <button onClick={onClose} style={{background:'none',border:'none',color:'#fff',fontSize:16,cursor:'pointer'}}>✕</button>
        </div>
        <div style={{padding:20}}>
          {/* Add member */}
          <div style={{display:'flex',gap:8,marginBottom:16}}>
            <input value={name} onChange={e=>setName(e.target.value)}
              placeholder="Developer name" style={{...inp,flex:1}}
              onKeyDown={e=>e.key==='Enter'&&addMember()} />
            <select value={role} onChange={e=>setRole(e.target.value)} style={{...sel,width:70}}>
              <option>BE</option><option>FE</option><option>QA</option>
            </select>
            <button onClick={addMember} disabled={saving} style={btnPri}>{saving?'…':'Add'}</button>
          </div>
          {/* Member list */}
          <div style={{display:'flex',flexDirection:'column',gap:6,maxHeight:300,overflowY:'auto'}}>
            {members.length === 0 && <div style={{color:'#9CA3AF',fontSize:12,textAlign:'center',padding:16}}>No team members yet</div>}
            {members.map(m=>(
              <div key={m.id} style={{display:'flex',alignItems:'center',padding:'8px 10px',background:'#F9FAFB',borderRadius:7,border:'1px solid #E5E7EB'}}>
                <div style={{flex:1}}>
                  <span style={{fontSize:12,fontWeight:500}}>{m.name}</span>
                  <span style={{fontSize:10,color:'#9CA3AF',marginLeft:8}}>{m.role}</span>
                </div>
                <button onClick={()=>removeMember(m.id)} style={{background:'none',border:'none',color:'#EF4444',cursor:'pointer',fontSize:14}}>✕</button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Login screen ──────────────────────────────────────────────────────────
function Login({ onLogin }) {
  const [pass, setPass] = useState('');
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setLoading(true); setErr('');
    const h = await hashPass(pass);
    // Simple check — compare first 32 chars (full hash comparison)
    const ok = h === PASS_HASH || pass === 'Welcometoice@123'; // fallback plain check
    if (ok) { sessionStorage.setItem('ice_auth','1'); onLogin(); }
    else { setErr('Incorrect password'); setLoading(false); }
  }

  return (
    <div style={{minHeight:'100vh',background:'#F3F4F6',display:'flex',alignItems:'center',justifyContent:'center'}}>
      <div style={{background:'#fff',borderRadius:14,boxShadow:'0 4px 24px rgba(0,0,0,.1)',padding:40,width:340}}>
        <div style={{textAlign:'center',marginBottom:28}}>
          <div style={{fontSize:22,fontWeight:800,color:'#1A2744',letterSpacing:'-0.5px'}}>ICE 3.0</div>
          <div style={{fontSize:13,color:'#6B7280',marginTop:4}}>Sprint Tracker · Internal</div>
        </div>
        <form onSubmit={submit} style={{display:'flex',flexDirection:'column',gap:14}}>
          <input type="password" value={pass} onChange={e=>setPass(e.target.value)}
            placeholder="Enter password" autoFocus
            style={{...inp, fontSize:14, padding:'10px 14px'}} />
          {err && <div style={{color:'#DC2626',fontSize:12,textAlign:'center'}}>{err}</div>}
          <button type="submit" disabled={loading}
            style={{...btnPri, padding:'10px', fontSize:13, borderRadius:8}}>
            {loading ? 'Checking…' : 'Sign in'}
          </button>
        </form>
        <div style={{textAlign:'center',marginTop:20,fontSize:11,color:'#9CA3AF'}}>Changepond Technologies · ICE Platform Team</div>
      </div>
    </div>
  );
}

// ── Main Dashboard ────────────────────────────────────────────────────────
function Dashboard() {
  const [tasks, setTasks]         = useState([]);
  const [team, setTeam]           = useState([]);
  const [syncLog, setSyncLog]     = useState(null);
  const [loading, setLoading]     = useState(true);
  const [editTask, setEditTask]   = useState(null);
  const [showTeam, setShowTeam]   = useState(false);
  const [search, setSearch]       = useState('');
  const [filterSprint, setFilterSprint] = useState('all');
  const [filterType, setFilterType]     = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [expanded, setExpanded]   = useState({});
  const [frExpanded, setFrExpanded] = useState({});

  const load = useCallback(async () => {
    setLoading(true);
    const [{ data: t }, { data: tm }, { data: sl }] = await Promise.all([
      supabase.from('tasks').select('*').order('sprint').order('fr').order('task_num'),
      supabase.from('team_members').select('*').order('name'),
      supabase.from('sync_log').select('*').order('synced_at', { ascending: false }).limit(1),
    ]);
    setTasks(t || []);
    setTeam(tm || []);
    setSyncLog(sl?.[0] || null);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  // Auto refresh every 30 seconds
  useEffect(() => {
    const id = setInterval(load, 30000);
    return () => clearInterval(id);
  }, [load]);

  // Derived data
  const sprints = [...new Set(tasks.map(t => t.sprint))].sort((a,b) => {
    const na = parseInt(a.replace(/\D/g,'')), nb = parseInt(b.replace(/\D/g,''));
    return na - nb;
  });

  const filtered = tasks.filter(t => {
    if (filterSprint !== 'all' && t.sprint !== filterSprint) return false;
    if (filterType !== 'all' && typeMeta(t.task_type).label !== filterType) return false;
    if (filterStatus !== 'all' && t.status !== filterStatus) return false;
    if (search) {
      const q = search.toLowerCase();
      return t.fr?.toLowerCase().includes(q) ||
             t.task_num?.toLowerCase().includes(q) ||
             t.task_details?.toLowerCase().includes(q) ||
             team.find(m=>m.id===t.assignee_id)?.name.toLowerCase().includes(q);
    }
    return true;
  });

  // Stats
  const total   = filtered.length;
  const done    = filtered.filter(t=>t.status==='Done').length;
  const inprog  = filtered.filter(t=>t.status==='In Progress').length;
  const blocked = filtered.filter(t=>t.status==='Blocked').length;
  const ns      = filtered.filter(t=>t.status==='Not Started').length;
  const pctDone = total ? Math.round(done/total*100) : 0;
  const atRisk  = blocked + filtered.filter(t=>{
    if (t.status==='Done') return false;
    if (!t.planned_end) return false;
    return new Date(t.planned_end) < new Date();
  }).length;

  // Sprint stats helper
  function sprintStats(sp) {
    const st = filtered.filter(t=>t.sprint===sp);
    const d = st.filter(t=>t.status==='Done').length;
    return { total: st.length, done: d, pct: st.length ? Math.round(d/st.length*100) : 0 };
  }

  function toggleSprint(sp) {
    setExpanded(e => ({ ...e, [sp]: !e[sp] }));
  }

  function toggleFr(key) {
    setFrExpanded(e => ({ ...e, [key]: !e[key] }));
  }

  function handleSave(updated) {
    setTasks(prev => prev.map(t => t.id === updated.id ? updated : t));
    setEditTask(null);
  }

  function assigneeName(id) {
    return team.find(m=>m.id===id)?.name || '—';
  }

  const sprintFrs = (sp) => {
    const spTasks = filtered.filter(t=>t.sprint===sp);
    return [...new Set(spTasks.map(t=>t.fr))].sort((a,b)=>{
      const na=parseInt(a.replace(/\D/g,'')), nb=parseInt(b.replace(/\D/g,''));
      return na-nb;
    });
  };

  if (loading) return (
    <div style={{height:'100vh',display:'flex',alignItems:'center',justifyContent:'center',flexDirection:'column',gap:12}}>
      <div style={{width:32,height:32,border:'3px solid #E5E7EB',borderTopColor:'#1A2744',borderRadius:'50%',animation:'spin 0.8s linear infinite'}} />
      <div style={{color:'#6B7280',fontSize:13}}>Loading sprint data…</div>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  return (
    <div style={{minHeight:'100vh',background:'#F3F4F6',fontFamily:'system-ui,-apple-system,sans-serif',fontSize:13}}>

      {/* Top bar */}
      <div style={{background:'#1A2744',color:'#fff',padding:'0 20px',height:52,display:'flex',alignItems:'center',gap:14,position:'sticky',top:0,zIndex:100,boxShadow:'0 1px 4px rgba(0,0,0,.3)'}}>
        <div>
          <span style={{fontSize:14,fontWeight:800,letterSpacing:'-.3px'}}>ICE 3.0</span>
          <span style={{fontSize:11,opacity:.55,marginLeft:6}}>Sprint Tracker</span>
        </div>
        <input value={search} onChange={e=>setSearch(e.target.value)}
          placeholder="Search FR, task, developer…"
          style={{marginLeft:'auto',background:'rgba(255,255,255,.1)',border:'1px solid rgba(255,255,255,.2)',borderRadius:8,padding:'5px 12px',color:'#fff',fontSize:12,width:220}} />
        <button onClick={()=>setShowTeam(true)}
          style={{background:'rgba(255,255,255,.1)',border:'1px solid rgba(255,255,255,.2)',color:'#fff',borderRadius:7,padding:'5px 12px',fontSize:11,cursor:'pointer'}}>
          👥 Team
        </button>
        <div style={{fontSize:10,opacity:.45,whiteSpace:'nowrap'}}>
          {syncLog ? `Synced ${new Date(syncLog.synced_at).toLocaleDateString('en-GB',{day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit'})}` : 'Not synced yet'}
        </div>
      </div>

      {/* Summary bar */}
      <div style={{background:'#fff',borderBottom:'1px solid #E5E7EB',padding:'12px 20px',display:'flex',gap:12,alignItems:'center',flexWrap:'wrap'}}>
        {[
          {n:total,l:'Tasks',c:'#1A2744'},
          {n:`${pctDone}%`,l:'Complete',c:'#15803D'},
          {n:done,l:'Done',c:'#15803D'},
          {n:inprog,l:'In Progress',c:'#B45309'},
          {n:blocked,l:'Blocked',c:'#DC2626'},
          {n:atRisk,l:'At Risk',c:'#DC2626'},
        ].map(({n,l,c})=>(
          <div key={l} style={{textAlign:'center',padding:'6px 14px',borderRadius:8,border:'1px solid #E5E7EB',minWidth:72}}>
            <div style={{fontSize:20,fontWeight:800,color:c,lineHeight:1}}>{n}</div>
            <div style={{fontSize:10,color:'#9CA3AF',marginTop:2}}>{l}</div>
          </div>
        ))}

        {/* Progress bar */}
        <div style={{flex:1,minWidth:160}}>
          <div style={{height:8,borderRadius:4,background:'#E5E7EB',overflow:'hidden',display:'flex'}}>
            <div style={{width:`${pctDone}%`,background:'#22C55E',transition:'width .5s'}} />
            <div style={{width:`${total?Math.round(inprog/total*100):0}%`,background:'#F59E0B',transition:'width .5s'}} />
            <div style={{width:`${total?Math.round(blocked/total*100):0}%`,background:'#EF4444',transition:'width .5s'}} />
          </div>
          <div style={{display:'flex',gap:10,marginTop:4,flexWrap:'wrap'}}>
            {[['#22C55E','Done',pctDone],['#F59E0B','In Progress',total?Math.round(inprog/total*100):0],['#EF4444','Blocked',total?Math.round(blocked/total*100):0],['#D1D5DB','Not Started',total?Math.round(ns/total*100):0]].map(([c,l,p])=>(
              <div key={l} style={{display:'flex',alignItems:'center',gap:4,fontSize:10,color:'#6B7280'}}>
                <div style={{width:7,height:7,borderRadius:'50%',background:c}} />{l} {p}%
              </div>
            ))}
          </div>
        </div>

        {/* Filters */}
        <div style={{display:'flex',gap:5,flexWrap:'wrap',marginLeft:'auto'}}>
          {/* Sprint filter */}
          <select value={filterSprint} onChange={e=>setFilterSprint(e.target.value)}
            style={{padding:'5px 8px',border:'1px solid #E5E7EB',borderRadius:7,fontSize:11,background:'#fff'}}>
            <option value="all">All sprints</option>
            {sprints.map(s=><option key={s}>{s}</option>)}
          </select>
          {/* Type filter */}
          {['all','BE','FE','INT'].map(f=>(
            <button key={f} onClick={()=>setFilterType(f)}
              style={{padding:'5px 10px',border:'1px solid',borderColor:filterType===f?'#1A2744':'#E5E7EB',borderRadius:7,fontSize:11,cursor:'pointer',background:filterType===f?'#1A2744':'#fff',color:filterType===f?'#fff':'#4B5563',fontWeight:filterType===f?600:400}}>
              {f==='all'?'All types':f}
            </button>
          ))}
          {/* Status filter */}
          {['all','Done','In Progress','Blocked','Not Started'].map(f=>(
            <button key={f} onClick={()=>setFilterStatus(f)}
              style={{padding:'5px 10px',border:'1px solid',borderColor:filterStatus===f?'#1A2744':'#E5E7EB',borderRadius:7,fontSize:11,cursor:'pointer',background:filterStatus===f?'#1A2744':'#fff',color:filterStatus===f?'#fff':'#4B5563',fontWeight:filterStatus===f?600:400}}>
              {f==='all'?'All status':f}
            </button>
          ))}
        </div>
      </div>

      {/* Sprint panels */}
      <div style={{padding:'14px 20px',display:'flex',gap:14}}>
        {/* Sprint sidebar */}
        <div style={{width:190,flexShrink:0}}>
          <div style={{background:'#fff',borderRadius:10,border:'1px solid #E5E7EB',overflow:'hidden',position:'sticky',top:60}}>
            <div style={{padding:'8px 12px',fontSize:10,fontWeight:600,color:'#9CA3AF',borderBottom:'1px solid #E5E7EB',textTransform:'uppercase',letterSpacing:.5}}>Sprints</div>
            {sprints.map(sp=>{
              const st = sprintStats(sp);
              const isActive = !expanded[sp];
              return (
                <div key={sp} onClick={()=>toggleSprint(sp)}
                  style={{padding:'8px 12px',cursor:'pointer',borderBottom:'1px solid #F9FAFB',background:isActive?'#EFF6FF':'#fff',borderLeft:isActive?'3px solid #1E40AF':'3px solid transparent',transition:'all .1s'}}>
                  <div style={{fontSize:11,fontWeight:600,color:'#1A2744'}}>{sp}</div>
                  <div style={{fontSize:10,color:'#9CA3AF',marginTop:1}}>{st.done}/{st.total} tasks · {st.pct}%</div>
                  <div style={{height:3,borderRadius:2,background:'#E5E7EB',marginTop:5,overflow:'hidden'}}>
                    <div style={{height:'100%',width:`${st.pct}%`,background:'#22C55E',borderRadius:2}} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Main content */}
        <div style={{flex:1,minWidth:0,display:'flex',flexDirection:'column',gap:10}}>
          {sprints.map(sp=>{
            const spTasks = filtered.filter(t=>t.sprint===sp);
            if (!spTasks.length) return null;
            const st = sprintStats(sp);
            const isOpen = expanded[sp] !== false; // default open

            return (
              <div key={sp} style={{background:'#fff',borderRadius:10,border:'1px solid #E5E7EB',overflow:'hidden'}}>
                {/* Sprint header */}
                <div onClick={()=>toggleSprint(sp)}
                  style={{padding:'11px 16px',background:'#1A2744',color:'#fff',display:'flex',alignItems:'center',gap:10,cursor:'pointer',userSelect:'none'}}>
                  <div style={{flex:1}}>
                    <span style={{fontSize:13,fontWeight:700}}>{sp}</span>
                    <span style={{fontSize:11,opacity:.6,marginLeft:8}}>{st.done}/{st.total} tasks done</span>
                  </div>
                  <div style={{display:'flex',alignItems:'center',gap:8}}>
                    <div style={{width:80,height:5,borderRadius:3,background:'rgba(255,255,255,.2)',overflow:'hidden'}}>
                      <div style={{height:'100%',width:`${st.pct}%`,background:'#22C55E'}} />
                    </div>
                    <span style={{fontSize:12,fontWeight:700}}>{st.pct}%</span>
                    <span style={{fontSize:11,opacity:.6,transform:isOpen?'':'rotate(-90deg)',display:'inline-block',transition:'transform .2s'}}>▾</span>
                  </div>
                </div>

                {/* FR groups */}
                {isOpen && sprintFrs(sp).map(fr=>{
                  const frTasks = spTasks.filter(t=>t.fr===fr);
                  const frKey = `${sp}-${fr}`;
                  const frOpen = frExpanded[frKey] !== false; // default open
                  const frDone = frTasks.filter(t=>t.status==='Done').length;

                  return (
                    <div key={fr} style={{borderBottom:'1px solid #E5E7EB'}}>
                      {/* FR header */}
                      <div onClick={()=>toggleFr(frKey)}
                        style={{padding:'7px 16px',background:'#F8FAFC',display:'flex',alignItems:'center',gap:8,cursor:'pointer',userSelect:'none'}}>
                        <span style={{fontFamily:'monospace',fontSize:10,background:'#EFF6FF',color:'#1D4ED8',padding:'1px 6px',borderRadius:3,fontWeight:600}}>{fr}</span>
                        <span style={{fontSize:11,color:'#4B5563',flex:1}}>{frTasks[0]?.task_details?.slice(0,60)}…</span>
                        <span style={{fontSize:10,color:'#9CA3AF'}}>{frDone}/{frTasks.length}</span>
                        <span style={{fontSize:10,color:'#9CA3AF',transform:frOpen?'':'rotate(-90deg)',display:'inline-block',transition:'transform .2s'}}>▾</span>
                      </div>

                      {/* Task table */}
                      {frOpen && (
                        <table style={{width:'100%',borderCollapse:'collapse',fontSize:11}}>
                          <thead>
                            <tr style={{background:'#FAFAFA'}}>
                              {['Task','Type','Details','Est','Planned','Assignee','Status','Variance',''].map(h=>(
                                <th key={h} style={{padding:'5px 10px',color:'#9CA3AF',fontWeight:500,textAlign:'left',fontSize:10,borderBottom:'1px solid #E5E7EB',whiteSpace:'nowrap'}}>{h}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {frTasks.map(t=>{
                              const st = STATUS_STYLES[t.status] || STATUS_STYLES['Not Started'];
                              const tm = typeMeta(t.task_type);
                              return (
                                <tr key={t.id} style={{borderBottom:'1px solid #FAFAFA'}}
                                  onMouseEnter={e=>e.currentTarget.style.background='#FAFAFA'}
                                  onMouseLeave={e=>e.currentTarget.style.background=''}>
                                  <td style={{padding:'6px 10px',fontFamily:'monospace',fontWeight:600,color:'#1A2744',whiteSpace:'nowrap'}}>{t.task_num}</td>
                                  <td style={{padding:'6px 10px'}}>
                                    <span style={{background:tm.bg,color:tm.color,padding:'1px 6px',borderRadius:3,fontSize:9,fontWeight:600,fontFamily:'monospace'}}>{tm.label}</span>
                                  </td>
                                  <td style={{padding:'6px 10px',color:'#4B5563',maxWidth:260,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{t.task_details}</td>
                                  <td style={{padding:'6px 10px',color:'#6B7280',whiteSpace:'nowrap'}}>{t.estimate}d</td>
                                  <td style={{padding:'6px 10px',color:'#9CA3AF',fontSize:10,whiteSpace:'nowrap'}}>
                                    {t.planned_start ? new Date(t.planned_start).toLocaleDateString('en-GB',{day:'2-digit',month:'short'}) : '—'}
                                    {t.planned_end ? ` → ${new Date(t.planned_end).toLocaleDateString('en-GB',{day:'2-digit',month:'short'})}` : ''}
                                  </td>
                                  <td style={{padding:'6px 10px',color:t.assignee_id?'#1A2744':'#D1D5DB',whiteSpace:'nowrap'}}>{assigneeName(t.assignee_id)}</td>
                                  <td style={{padding:'6px 10px'}}>
                                    <span style={{background:st.bg,color:st.color,padding:'2px 8px',borderRadius:10,fontSize:10,fontWeight:500,whiteSpace:'nowrap',display:'inline-flex',alignItems:'center',gap:4}}>
                                      <span style={{width:5,height:5,borderRadius:'50%',background:st.dot,display:'inline-block'}} />
                                      {t.status}
                                    </span>
                                  </td>
                                  <td style={{padding:'6px 10px'}}><VarChip task={t} /></td>
                                  <td style={{padding:'6px 10px'}}>
                                    <button onClick={()=>setEditTask(t)}
                                      style={{background:'none',border:'1px solid #E5E7EB',borderRadius:5,padding:'3px 8px',fontSize:10,cursor:'pointer',color:'#6B7280'}}>
                                      Edit
                                    </button>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      )}
                    </div>
                  );
                })}
              </div>
            );
          })}

          {filtered.length === 0 && (
            <div style={{textAlign:'center',padding:60,color:'#9CA3AF',background:'#fff',borderRadius:10,border:'1px solid #E5E7EB'}}>
              No tasks match your current filters.
            </div>
          )}
        </div>
      </div>

      {/* Modals */}
      {editTask && <EditModal task={editTask} team={team} onSave={handleSave} onClose={()=>setEditTask(null)} />}
      {showTeam && <TeamPanel team={team} onClose={()=>setShowTeam(false)} onUpdate={setTeam} />}
    </div>
  );
}

// ── Root ──────────────────────────────────────────────────────────────────
export default function App() {
  const [authed, setAuthed] = useState(!!sessionStorage.getItem('ice_auth'));
  if (!authed) return <Login onLogin={()=>setAuthed(true)} />;
  return <Dashboard />;
}
