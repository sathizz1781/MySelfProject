import { useState, useEffect } from "react";
import Link from "next/link";
import { Target, X } from "lucide-react";
import { getAuthUser } from "../../../lib/auth";
import ThemePicker from "../../../components/ThemePicker";

const COLORS = ["#6c63ff","#f97316","#10b981","#f59e0b","#ec4899","#0ea5e9","#8b5cf6","#ef4444"];
const CAT_COLORS = { health:"#10b981",career:"#6c63ff",personal:"#f783ac",learning:"#ffd43b",finance:"#34d399",relationships:"#f97316",other:"#6b7280" };
const CATEGORIES = ["health","career","personal","learning","finance","relationships","other"];

function initForm() { return { title:"", description:"", category:"personal", progress:"0", color:"#6c63ff", deadline:"", notes:"", milestones:[] }; }

export default function GoalsApp() {
  const [activeTab, setActiveTab] = useState("active");
  const [goals, setGoals]         = useState([]);
  const [loading, setLoading]     = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editGoal, setEditGoal]   = useState(null);
  const [form, setForm]           = useState(initForm);
  const [newMilestone, setNewMilestone] = useState("");
  const [saving, setSaving]       = useState(false);
  const [error, setError]         = useState("");

  useEffect(() => { fetchGoals(); }, []);

  async function fetchGoals() {
    setLoading(true);
    const res = await fetch("/api/life-goals");
    if (res.ok) setGoals((await res.json()).goals);
    setLoading(false);
  }

  function openAdd() { setEditGoal(null); setForm(initForm()); setNewMilestone(""); setError(""); setShowModal(true); }
  function openEdit(g) {
    setEditGoal(g);
    setForm({ title:g.title, description:g.description||"", category:g.category||"personal", progress:String(g.progress||0), color:g.color||"#6c63ff", deadline:g.deadline?.slice(0,10)||"", notes:g.notes||"", milestones:g.milestones||[] });
    setNewMilestone(""); setError(""); setShowModal(true);
  }

  async function saveGoal() {
    if (!form.title.trim()) return setError("Title is required.");
    setSaving(true);
    try {
      const url = editGoal ? `/api/life-goals/${editGoal._id}` : "/api/life-goals";
      const res = await fetch(url, { method:editGoal?"PUT":"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({...form, progress:Number(form.progress), deadline:form.deadline||undefined}) });
      if (res.ok) { setShowModal(false); fetchGoals(); }
      else setError((await res.json()).error||"Failed.");
    } finally { setSaving(false); }
  }

  async function deleteGoal(id) {
    if (!confirm("Delete this goal?")) return;
    await fetch(`/api/life-goals/${id}`, { method:"DELETE" });
    fetchGoals();
  }

  async function setStatus(g, status) {
    await fetch(`/api/life-goals/${g._id}`, { method:"PUT", headers:{"Content-Type":"application/json"}, body:JSON.stringify({status, progress:status==="completed"?100:g.progress}) });
    fetchGoals();
  }

  async function toggleMilestone(g, idx) {
    const milestones = g.milestones.map((m,i) => i===idx ? {...m,isDone:!m.isDone} : m);
    const progress = Math.round((milestones.filter(m=>m.isDone).length / milestones.length) * 100);
    await fetch(`/api/life-goals/${g._id}`, { method:"PUT", headers:{"Content-Type":"application/json"}, body:JSON.stringify({milestones, progress}) });
    fetchGoals();
  }

  function addMilestone() {
    if (!newMilestone.trim()) return;
    setForm(f=>({...f, milestones:[...f.milestones, {title:newMilestone.trim(),isDone:false}]}));
    setNewMilestone("");
  }

  function removeMilestone(idx) { setForm(f=>({...f, milestones:f.milestones.filter((_,i)=>i!==idx)})); }

  const active    = goals.filter(g=>g.status==="active");
  const completed = goals.filter(g=>g.status==="completed");
  const avgProg   = active.length ? Math.round(active.reduce((s,g)=>s+g.progress,0)/active.length) : 0;

  return (
    <div className="app-page">
      <nav className="app-nav">
        <Link href="/dashboard" className="app-nav-back">←</Link>
        <h2>Goals</h2>
        <div style={{marginLeft:"auto"}}><ThemePicker /></div>
      </nav>

      <div className="tabs">
        {[{key:"active",label:`Active (${active.length})`},{key:"completed",label:`Done (${completed.length})`}].map(t=>(
          <button key={t.key} className={`tab ${activeTab===t.key?"active":""}`} onClick={()=>setActiveTab(t.key)}>{t.label}</button>
        ))}
      </div>

      {activeTab === "active" && (
        <div className="tab-content">
          {active.length > 0 && (
            <div className="stat-grid" style={{marginBottom:"1.25rem"}}>
              <div className="stat-card"><div className="stat-card-label">Active Goals</div><div className="stat-card-value">{active.length}</div></div>
              <div className="stat-card"><div className="stat-card-label">Avg Progress</div><div className="stat-card-value c-income">{avgProg}%</div></div>
            </div>
          )}

          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"1rem"}}>
            <h3 style={{fontSize:"0.9rem",fontWeight:600}}>Active Goals</h3>
            <button className="btn" style={{width:"auto",padding:"0.42rem 0.9rem",fontSize:"0.82rem",marginTop:0}} onClick={openAdd}>+ New Goal</button>
          </div>

          {loading ? <div className="empty-state">Loading…</div> : active.length === 0 ? (
            <div className="empty-state"><div className="empty-state-icon"><Target size={28}/></div>No active goals.<br/><span style={{fontSize:"0.78rem"}}>Set a goal to start tracking.</span></div>
          ) : (
            <div style={{display:"flex",flexDirection:"column",gap:"0.75rem"}}>
              {active.map(g=>(<GoalCard key={g._id} g={g} onEdit={openEdit} onDelete={deleteGoal} onStatus={setStatus} onToggleMilestone={toggleMilestone}/>))}
            </div>
          )}
        </div>
      )}

      {activeTab === "completed" && (
        <div className="tab-content">
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"1rem"}}>
            <h3 style={{fontSize:"0.9rem",fontWeight:600}}>Completed Goals</h3>
            <button className="btn" style={{width:"auto",padding:"0.42rem 0.9rem",fontSize:"0.82rem",marginTop:0}} onClick={openAdd}>+ New Goal</button>
          </div>
          {loading ? <div className="empty-state">Loading…</div> : completed.length === 0 ? (
            <div className="empty-state"><div className="empty-state-icon">🏆</div>No completed goals yet.</div>
          ) : (
            <div style={{display:"flex",flexDirection:"column",gap:"0.75rem"}}>
              {completed.map(g=>(<GoalCard key={g._id} g={g} onEdit={openEdit} onDelete={deleteGoal} onStatus={setStatus} onToggleMilestone={toggleMilestone}/>))}
            </div>
          )}
        </div>
      )}

      {showModal && (
        <div className="modal-overlay" onClick={e=>e.target===e.currentTarget&&setShowModal(false)}>
          <div className="modal">
            <div className="modal-title"><span>{editGoal?"Edit Goal":"New Goal"}</span><button className="icon-btn" onClick={()=>setShowModal(false)}>✕</button></div>
            <div className="form-group"><label className="form-label">Title</label><input className="form-input" placeholder="What do you want to achieve?" value={form.title} onChange={e=>setForm(f=>({...f,title:e.target.value}))} autoFocus/></div>
            <div className="form-group"><label className="form-label">Category</label>
              <select className="form-input" value={form.category} onChange={e=>setForm(f=>({...f,category:e.target.value}))}>
                {CATEGORIES.map(c=><option key={c} value={c}>{c.charAt(0).toUpperCase()+c.slice(1)}</option>)}
              </select>
            </div>
            <div className="form-group"><label className="form-label">Description <span style={{textTransform:"none",fontWeight:400,color:"var(--text-muted)"}}>(optional)</span></label><textarea className="form-input" rows={2} value={form.description} onChange={e=>setForm(f=>({...f,description:e.target.value}))}/></div>
            <div className="form-group">
              <label className="form-label">Progress — {form.progress}%</label>
              <input type="range" min="0" max="100" value={form.progress} onChange={e=>setForm(f=>({...f,progress:e.target.value}))} style={{width:"100%",accentColor:"var(--accent)"}}/>
            </div>
            <div className="form-group"><label className="form-label">Deadline <span style={{textTransform:"none",fontWeight:400,color:"var(--text-muted)"}}>(optional)</span></label><input className="form-input" type="date" value={form.deadline} onChange={e=>setForm(f=>({...f,deadline:e.target.value}))}/></div>
            <div className="form-group">
              <label className="form-label">Colour</label>
              <div style={{display:"flex",gap:"0.4rem",flexWrap:"wrap"}}>
                {COLORS.map(c=><button key={c} onClick={()=>setForm(f=>({...f,color:c}))} style={{width:24,height:24,borderRadius:"50%",background:c,border:form.color===c?"3px solid #fff":"2px solid transparent",cursor:"pointer"}}/>)}
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Milestones</label>
              {form.milestones.map((m,i)=>(
                <div key={i} style={{display:"flex",alignItems:"center",gap:"0.4rem",marginBottom:"0.35rem"}}>
                  <span style={{flex:1,fontSize:"0.82rem",textDecoration:m.isDone?"line-through":"none",color:m.isDone?"var(--text-muted)":"var(--text)"}}>{m.title}</span>
                  <button className="icon-btn" onClick={()=>removeMilestone(i)}><X size={12}/></button>
                </div>
              ))}
              <div style={{display:"flex",gap:"0.4rem",marginTop:"0.25rem"}}>
                <input className="form-input" style={{flex:1}} placeholder="Add milestone…" value={newMilestone} onChange={e=>setNewMilestone(e.target.value)} onKeyDown={e=>e.key==="Enter"&&addMilestone()}/>
                <button className="btn btn-ghost" style={{width:"auto",padding:"0.5rem 0.75rem",marginTop:0,fontSize:"0.8rem"}} onClick={addMilestone}>Add</button>
              </div>
            </div>
            <div className="form-group"><label className="form-label">Notes <span style={{textTransform:"none",fontWeight:400,color:"var(--text-muted)"}}>(optional)</span></label><textarea className="form-input" rows={2} value={form.notes} onChange={e=>setForm(f=>({...f,notes:e.target.value}))}/></div>
            {error && <div className="alert alert-error">{error}</div>}
            <button className="btn" onClick={saveGoal} disabled={saving}>{saving?"Saving…":editGoal?"Update Goal":"Create Goal"}</button>
          </div>
        </div>
      )}
    </div>
  );
}

function GoalCard({ g, onEdit, onDelete, onStatus, onToggleMilestone }) {
  const daysLeft = g.deadline ? Math.ceil((new Date(g.deadline)-Date.now())/86400000) : null;
  const catColor = CAT_COLORS[g.category]||"#6b7280";
  const doneMilestones = (g.milestones||[]).filter(m=>m.isDone).length;
  return (
    <div className="goal-card">
      <div className="goal-header">
        <div style={{display:"flex",alignItems:"center",gap:"0.55rem",minWidth:0}}>
          <span style={{padding:"0.18rem 0.6rem",borderRadius:999,background:`${catColor}18`,color:catColor,fontSize:"0.65rem",fontWeight:700,border:`1px solid ${catColor}30`,textTransform:"capitalize",whiteSpace:"nowrap"}}>{g.category}</span>
          <div style={{fontWeight:600,fontSize:"0.875rem",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{g.title}</div>
        </div>
        <div style={{display:"flex",gap:"0.3rem",flexShrink:0}}>
          <button className="icon-btn" onClick={()=>onStatus(g,g.status==="active"?"completed":"active")} title={g.status==="active"?"Mark complete":"Reopen"}>{g.status==="active"?"✅":"↩️"}</button>
          <button className="icon-btn" onClick={()=>onEdit(g)}>✏️</button>
          <button className="icon-btn" onClick={()=>onDelete(g._id)}>🗑️</button>
        </div>
      </div>
      {g.description && <div style={{fontSize:"0.78rem",color:"var(--text-muted)",margin:"0.4rem 0"}}>{g.description}</div>}
      <div style={{display:"flex",justifyContent:"space-between",fontSize:"0.72rem",color:"var(--text-muted)",margin:"0.45rem 0 0.3rem"}}>
        <span>{g.progress}% complete</span>
        <span style={{display:"flex",gap:"0.6rem"}}>
          {g.milestones?.length>0 && <span>{doneMilestones}/{g.milestones.length} milestones</span>}
          {daysLeft!==null && <span style={{color:daysLeft<0?"var(--error)":daysLeft<14?"#ffd43b":"var(--text-muted)"}}>{daysLeft<0?`${Math.abs(daysLeft)}d overdue`:`${daysLeft}d left`}</span>}
        </span>
      </div>
      <div className="progress-track"><div className="progress-fill" style={{width:`${g.progress}%`,background:g.status==="completed"?"var(--success)":(g.color||"var(--accent)")}} /></div>
      {g.milestones?.length > 0 && (
        <div style={{marginTop:"0.65rem",display:"flex",flexDirection:"column",gap:"0.3rem"}}>
          {g.milestones.map((m,i)=>(
            <div key={i} style={{display:"flex",alignItems:"center",gap:"0.5rem",fontSize:"0.78rem"}}>
              <button onClick={()=>onToggleMilestone(g,i)} style={{width:16,height:16,borderRadius:3,border:`1.5px solid ${m.isDone?"var(--success)":"var(--border)"}`,background:m.isDone?"var(--success)":"transparent",cursor:"pointer",flexShrink:0,color:"#fff",fontSize:"0.65rem",display:"flex",alignItems:"center",justifyContent:"center"}}>{m.isDone?"✓":""}</button>
              <span style={{textDecoration:m.isDone?"line-through":"none",color:m.isDone?"var(--text-muted)":"var(--text)"}}>{m.title}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export async function getServerSideProps(ctx) {
  const user = getAuthUser(ctx.req);
  if (!user) return { redirect: { destination: "/login", permanent: false } };
  return { props: {} };
}
