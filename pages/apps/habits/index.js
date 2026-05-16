import { useState, useEffect } from "react";
import { CheckSquare } from "lucide-react";
import { getAuthUser } from "../../../lib/auth";
import AppNav from "../../../components/AppNav";
import connectDB from "../../../lib/mongodb";
import User from "../../../models/User";

const COLORS = ["#6c63ff","#f97316","#10b981","#f59e0b","#ec4899","#0ea5e9","#8b5cf6","#ef4444"];

function todayISO() { return new Date().toISOString().slice(0,10); }

function calcStreak(completions, frequency) {
  if (!completions?.length) return 0;
  const dates = completions.map(c => new Date(c.date).toISOString().slice(0,10)).sort().reverse();
  if (frequency === "daily") {
    let streak = 0, cursor = new Date();
    cursor.setHours(0,0,0,0);
    for (let i = 0; i < 365; i++) {
      const d = cursor.toISOString().slice(0,10);
      if (dates.includes(d)) streak++;
      else if (i > 0) break;
      cursor.setDate(cursor.getDate()-1);
    }
    return streak;
  }
  return dates.length > 0 ? 1 : 0;
}

function initForm() { return { name:"", description:"", frequency:"daily", color:"#6c63ff", targetPerWeek:"7" }; }

export default function HabitsApp({ user }) {
  const [activeTab, setActiveTab] = useState("today");
  const [habits, setHabits]       = useState([]);
  const [loading, setLoading]     = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editHabit, setEditHabit] = useState(null);
  const [form, setForm]           = useState(initForm);
  const [saving, setSaving]       = useState(false);
  const [toggling, setToggling]   = useState({});

  useEffect(() => { fetchHabits(); }, []);

  async function fetchHabits() {
    setLoading(true);
    const res = await fetch("/api/habits");
    if (res.ok) setHabits((await res.json()).habits);
    setLoading(false);
  }

  async function toggleHabit(id) {
    setToggling(t => ({...t, [id]:true}));
    const res = await fetch(`/api/habits/${id}`, { method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({action:"toggle"}) });
    if (res.ok) {
      const updated = (await res.json()).habit;
      setHabits(h => h.map(x => x._id === id ? {...updated} : x));
    }
    setToggling(t => ({...t, [id]:false}));
  }

  async function saveHabit() {
    if (!form.name.trim()) return;
    setSaving(true);
    try {
      const url = editHabit ? `/api/habits/${editHabit._id}` : "/api/habits";
      const method = editHabit ? "PUT" : "POST";
      const res = await fetch(url, { method, headers:{"Content-Type":"application/json"}, body:JSON.stringify({...form, targetPerWeek:Number(form.targetPerWeek)}) });
      if (res.ok) { setShowModal(false); fetchHabits(); }
    } finally { setSaving(false); }
  }

  async function toggleActive(h) {
    await fetch(`/api/habits/${h._id}`, { method:"PUT", headers:{"Content-Type":"application/json"}, body:JSON.stringify({isActive:!h.isActive}) });
    fetchHabits();
  }

  async function deleteHabit(id) {
    if (!confirm("Delete this habit?")) return;
    await fetch(`/api/habits/${id}`, { method:"DELETE" });
    fetchHabits();
  }

  function openAdd() { setEditHabit(null); setForm(initForm()); setShowModal(true); }
  function openEdit(h) { setEditHabit(h); setForm({name:h.name,description:h.description||"",frequency:h.frequency,color:h.color||"#6c63ff",targetPerWeek:String(h.targetPerWeek||7)}); setShowModal(true); }

  const activeHabits = habits.filter(h => h.isActive);
  const doneToday    = activeHabits.filter(h => h.doneToday).length;
  const today        = new Date().toLocaleDateString("en-IN",{weekday:"long",day:"numeric",month:"long"});

  return (
    <div className="app-page">
      <AppNav user={user} title="Habits" />

      <div className="tabs">
        {[{key:"today",label:"Today"},{key:"manage",label:"Manage"}].map(t=>(
          <button key={t.key} className={`tab ${activeTab===t.key?"active":""}`} onClick={()=>setActiveTab(t.key)}>{t.label}</button>
        ))}
      </div>

      {/* TODAY */}
      {activeTab === "today" && (
        <div className="tab-content">
          <div style={{marginBottom:"1.25rem"}}>
            <div style={{fontSize:"0.82rem",color:"var(--text-muted)",marginBottom:"0.5rem"}}>{today}</div>
            {activeHabits.length > 0 && (
              <>
                <div style={{display:"flex",justifyContent:"space-between",fontSize:"0.82rem",marginBottom:"0.4rem"}}>
                  <span>{doneToday} / {activeHabits.length} done</span>
                  <span style={{color:"var(--text-muted)"}}>{activeHabits.length>0?Math.round((doneToday/activeHabits.length)*100):0}%</span>
                </div>
                <div className="progress-track"><div className="progress-fill" style={{width:`${activeHabits.length>0?(doneToday/activeHabits.length)*100:0}%`,background:"var(--success)"}}/></div>
              </>
            )}
          </div>

          {loading ? <div className="empty-state">Loading…</div> : activeHabits.length === 0 ? (
            <div className="empty-state"><div className="empty-state-icon"><CheckSquare size={28}/></div>No habits yet.<br/><span style={{fontSize:"0.78rem"}}>Go to Manage to add your first habit.</span></div>
          ) : (
            <div style={{display:"flex",flexDirection:"column",gap:"0.6rem"}}>
              {activeHabits.map(h => {
                const streak = calcStreak(h.completions, h.frequency);
                return (
                  <div key={h._id} className="tx-item" style={{alignItems:"center"}}>
                    <div style={{width:12,height:12,borderRadius:"50%",background:h.color||"#6c63ff",flexShrink:0}}/>
                    <div className="tx-info">
                      <div className="tx-desc">{h.name}</div>
                      <div className="tx-meta">
                        {h.frequency==="daily"?"Daily":`${h.targetPerWeek}×/week`}
                        {streak > 0 && <span style={{color:"#f97316"}}> · 🔥 {streak} day streak</span>}
                      </div>
                    </div>
                    <button
                      onClick={()=>toggleHabit(h._id)}
                      disabled={toggling[h._id]}
                      style={{
                        width:36,height:36,borderRadius:"50%",border:`2px solid ${h.doneToday?"transparent":h.color||"#6c63ff"}`,
                        background:h.doneToday?(h.color||"#6c63ff"):"transparent",
                        color:h.doneToday?"#fff":(h.color||"#6c63ff"),
                        cursor:"pointer",fontSize:"1rem",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,
                        transition:"all 0.15s ease",
                      }}
                    >{h.doneToday?"✓":"○"}</button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* MANAGE */}
      {activeTab === "manage" && (
        <div className="tab-content">
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"1rem"}}>
            <h3 style={{fontSize:"0.9rem",fontWeight:600}}>All Habits</h3>
            <button className="btn" style={{width:"auto",padding:"0.42rem 0.9rem",fontSize:"0.82rem",marginTop:0}} onClick={openAdd}>+ New Habit</button>
          </div>

          {loading ? <div className="empty-state">Loading…</div> : habits.length === 0 ? (
            <div className="empty-state"><div className="empty-state-icon"><CheckSquare size={28}/></div>No habits yet.</div>
          ) : (
            <div style={{display:"flex",flexDirection:"column",gap:"0.5rem"}}>
              {habits.map(h=>(
                <div key={h._id} className="tx-item">
                  <div style={{width:12,height:12,borderRadius:"50%",background:h.isActive?(h.color||"#6c63ff"):"var(--text-muted)",flexShrink:0}}/>
                  <div className="tx-info">
                    <div className="tx-desc" style={{opacity:h.isActive?1:0.5}}>{h.name}</div>
                    <div className="tx-meta">{h.frequency==="daily"?"Daily":`${h.targetPerWeek}×/week`} · {calcStreak(h.completions,h.frequency)} day streak{!h.isActive&&" · paused"}</div>
                  </div>
                  <div className="tx-right">
                    <div className="tx-actions" style={{opacity:1}}>
                      <button className="icon-btn" onClick={()=>toggleActive(h)} title={h.isActive?"Pause":"Resume"} style={{fontSize:"0.85rem"}}>{h.isActive?"⏸":"▶️"}</button>
                      <button className="icon-btn" onClick={()=>openEdit(h)}>✏️</button>
                      <button className="icon-btn" onClick={()=>deleteHabit(h._id)}>🗑️</button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* MODAL */}
      {showModal && (
        <div className="modal-overlay" onClick={e=>e.target===e.currentTarget&&setShowModal(false)}>
          <div className="modal">
            <div className="modal-title"><span>{editHabit?"Edit Habit":"New Habit"}</span><button className="icon-btn" onClick={()=>setShowModal(false)}>✕</button></div>
            <div className="form-group"><label className="form-label">Name</label><input className="form-input" placeholder="e.g. Morning run" value={form.name} onChange={e=>setForm(f=>({...f,name:e.target.value}))} autoFocus/></div>
            <div className="form-group"><label className="form-label">Description <span style={{textTransform:"none",fontWeight:400,color:"var(--text-muted)"}}>(optional)</span></label><input className="form-input" placeholder="Why this habit?" value={form.description} onChange={e=>setForm(f=>({...f,description:e.target.value}))}/></div>
            <div className="form-group">
              <label className="form-label">Frequency</label>
              <div className="type-toggle" style={{marginBottom:0}}>
                <button className={`type-btn ${form.frequency==="daily"?"active-expense":""}`} onClick={()=>setForm(f=>({...f,frequency:"daily"}))}>Daily</button>
                <button className={`type-btn ${form.frequency==="weekly"?"active-expense":""}`} onClick={()=>setForm(f=>({...f,frequency:"weekly"}))}>Weekly</button>
              </div>
            </div>
            {form.frequency==="weekly" && (
              <div className="form-group"><label className="form-label">Target days/week</label><input className="form-input" type="number" min="1" max="7" value={form.targetPerWeek} onChange={e=>setForm(f=>({...f,targetPerWeek:e.target.value}))}/></div>
            )}
            <div className="form-group">
              <label className="form-label">Color</label>
              <div style={{display:"flex",gap:"0.5rem",flexWrap:"wrap"}}>
                {COLORS.map(c=><button key={c} onClick={()=>setForm(f=>({...f,color:c}))} style={{width:26,height:26,borderRadius:"50%",background:c,border:form.color===c?"3px solid #fff":"2px solid transparent",cursor:"pointer"}}/>)}
              </div>
            </div>
            <button className="btn" onClick={saveHabit} disabled={saving||!form.name.trim()}>{saving?"Saving…":editHabit?"Update Habit":"Create Habit"}</button>
          </div>
        </div>
      )}
    </div>
  );
}

export async function getServerSideProps(ctx) {
  const decoded = getAuthUser(ctx.req);
  if (!decoded) return { redirect: { destination: "/login", permanent: false } };
  try {
    await connectDB();
    const dbUser = await User.findById(decoded.userId).lean();
    if (!dbUser) return { redirect: { destination: "/login", permanent: false } };
    if (dbUser.role === "admin") return { props: { user: { id: dbUser._id.toString(), name: dbUser.name, email: dbUser.email, role: "admin" } } };
    const allowedApps = dbUser.allowedApps?.length ? dbUser.allowedApps : ["expenses","health","habits","notes","goals","calendar","reports","calculators"];
    if (!allowedApps.includes("habits")) return { redirect: { destination: "/dashboard", permanent: false } };
    return { props: { user: { id: dbUser._id.toString(), name: dbUser.name, email: dbUser.email, role: dbUser.role || "user" } } };
  } catch {
    return { redirect: { destination: "/login", permanent: false } };
  }
}
