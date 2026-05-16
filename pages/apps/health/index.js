import { useState, useEffect } from "react";
import { Activity, Heart, Footprints, Flame, Timer, Weight } from "lucide-react";
import { getAuthUser } from "../../../lib/auth";
import AppNav from "../../../components/AppNav";
import connectDB from "../../../lib/mongodb";
import User from "../../../models/User";

const WORKOUT_TYPES = ["running","cycling","gym","yoga","swimming","walking","other"];
const WORKOUT_ICONS = { running:"🏃",cycling:"🚴",gym:"🏋️",yoga:"🧘",swimming:"🏊",walking:"🚶",other:"⚡" };

function todayISO() { return new Date().toISOString().slice(0,10); }

function initForm() {
  return { type:"workout", date:todayISO(), workoutType:"running", duration:"", calories:"", distance:"", weight:"", bpSystolic:"", bpDiastolic:"", heartRate:"", steps:"", sleepHours:"", notes:"" };
}

export default function HealthApp({ user }) {
  const [activeTab, setActiveTab]   = useState("overview");
  const [entries, setEntries]       = useState([]);
  const [loading, setLoading]       = useState(true);
  const [form, setForm]             = useState(initForm);
  const [saving, setSaving]         = useState(false);
  const [saveMsg, setSaveMsg]       = useState("");
  const [showModal, setShowModal]   = useState(false);
  const [editEntry, setEditEntry]   = useState(null);
  const [filterYear, setFilterYear] = useState(new Date().getFullYear());
  const [filterMonth, setFilterMonth] = useState(new Date().getMonth() + 1);

  useEffect(() => { fetchEntries(); }, [filterYear, filterMonth]);

  async function fetchEntries() {
    setLoading(true);
    const res = await fetch(`/api/health?year=${filterYear}&month=${filterMonth}`);
    if (res.ok) setEntries((await res.json()).entries);
    setLoading(false);
  }

  async function saveEntry() {
    if (!form.type) return;
    setSaving(true); setSaveMsg("");
    try {
      const url    = editEntry ? `/api/health/${editEntry._id}` : "/api/health";
      const method = editEntry ? "PUT" : "POST";
      const body   = { ...form };
      ["duration","calories","distance","weight","bpSystolic","bpDiastolic","heartRate","steps","sleepHours"].forEach(k => { if (body[k]) body[k] = Number(body[k]); });
      const res = await fetch(url, { method, headers:{"Content-Type":"application/json"}, body:JSON.stringify(body) });
      if (res.ok) { setSaveMsg("Saved!"); setShowModal(false); fetchEntries(); setForm(initForm()); setEditEntry(null); setTimeout(()=>setSaveMsg(""),2000); }
    } finally { setSaving(false); }
  }

  function openEdit(e) {
    setEditEntry(e);
    setForm({ type:e.type, date:e.date?.slice(0,10)||todayISO(), workoutType:e.workoutType||"running", duration:String(e.duration||""), calories:String(e.calories||""), distance:String(e.distance||""), weight:String(e.weight||""), bpSystolic:String(e.bpSystolic||""), bpDiastolic:String(e.bpDiastolic||""), heartRate:String(e.heartRate||""), steps:String(e.steps||""), sleepHours:String(e.sleepHours||""), notes:e.notes||"" });
    setShowModal(true);
  }

  async function deleteEntry(id) {
    if (!confirm("Delete this entry?")) return;
    await fetch(`/api/health/${id}`, { method:"DELETE" });
    fetchEntries();
  }

  const workouts   = entries.filter(e => e.type === "workout");
  const vitals     = entries.filter(e => e.type === "vital");
  const totalCal   = workouts.reduce((s,e) => s + (e.calories||0), 0);
  const latestWeight = [...vitals].reverse().find(e => e.weight > 0)?.weight;
  const latestSteps  = [...vitals].reverse().find(e => e.steps  > 0)?.steps;

  const TABS = [
    { key:"overview", label:"Overview" },
    { key:"log",      label:"Log" },
    { key:"history",  label:"History" },
  ];

  return (
    <div className="app-page">
      <AppNav user={user} title="Health" />

      <div className="tabs">
        {TABS.map(t => <button key={t.key} className={`tab ${activeTab===t.key?"active":""}`} onClick={()=>setActiveTab(t.key)}>{t.label}</button>)}
      </div>

      {/* OVERVIEW */}
      {activeTab === "overview" && (
        <div className="tab-content">
          <div className="stat-grid" style={{marginBottom:"1.25rem"}}>
            <div className="stat-card"><div className="stat-card-label">Workouts</div><div className="stat-card-value">{workouts.length}</div></div>
            <div className="stat-card"><div className="stat-card-label">Calories Burned</div><div className="stat-card-value c-expense">{totalCal.toLocaleString()}</div></div>
            <div className="stat-card"><div className="stat-card-label">Latest Weight</div><div className="stat-card-value">{latestWeight ? `${latestWeight} kg` : "—"}</div></div>
            <div className="stat-card"><div className="stat-card-label">Latest Steps</div><div className="stat-card-value c-income">{latestSteps ? latestSteps.toLocaleString() : "—"}</div></div>
          </div>

          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"0.75rem"}}>
            <h3 style={{fontSize:"0.88rem",fontWeight:600}}>Recent entries</h3>
            <button className="btn" style={{width:"auto",padding:"0.38rem 0.9rem",fontSize:"0.8rem",marginTop:0}} onClick={()=>{setEditEntry(null);setForm(initForm());setShowModal(true);}}>+ Log</button>
          </div>

          {loading ? <div className="empty-state">Loading…</div> : entries.length === 0 ? (
            <div className="empty-state"><div className="empty-state-icon"><Activity size={28}/></div>No entries yet.<br/><span style={{fontSize:"0.78rem"}}>Start logging workouts and vitals.</span></div>
          ) : (
            <div style={{display:"flex",flexDirection:"column",gap:"0.4rem"}}>
              {entries.slice(0,5).map(e => (
                <div key={e._id} className="tx-item">
                  <div className="cat-icon" style={{background:e.type==="workout"?"rgba(99,255,178,0.15)":"rgba(248,131,172,0.15)",fontSize:"1.2rem"}}>{e.type==="workout" ? (WORKOUT_ICONS[e.workoutType]||"⚡") : "💊"}</div>
                  <div className="tx-info">
                    <div className="tx-desc">{e.type==="workout" ? (e.workoutType.charAt(0).toUpperCase()+e.workoutType.slice(1)) : "Vitals"}</div>
                    <div className="tx-meta">{new Date(e.date).toLocaleDateString("en-IN",{day:"numeric",month:"short"})}{e.type==="workout" && e.duration > 0 && ` · ${e.duration} min`}{e.type==="workout" && e.calories > 0 && ` · ${e.calories} cal`}{e.type==="vital" && e.weight > 0 && ` · ${e.weight} kg`}{e.type==="vital" && e.heartRate > 0 && ` · ${e.heartRate} bpm`}</div>
                  </div>
                  <div className="tx-right">
                    <div className="tx-actions" style={{opacity:1}}>
                      <button className="icon-btn" onClick={()=>openEdit(e)}>✏️</button>
                      <button className="icon-btn" onClick={()=>deleteEntry(e._id)}>🗑️</button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* LOG */}
      {activeTab === "log" && (
        <div className="tab-content">
          <div className="type-toggle" style={{marginBottom:"1rem"}}>
            <button className={`type-btn ${form.type==="workout"?"active-expense":""}`} onClick={()=>setForm(f=>({...f,type:"workout"}))}>Workout</button>
            <button className={`type-btn ${form.type==="vital"?"active-income":""}`} onClick={()=>setForm(f=>({...f,type:"vital"}))}>Vitals</button>
          </div>

          {form.type === "workout" && (
            <>
              <div className="form-group">
                <label className="form-label">Type</label>
                <select className="form-input" value={form.workoutType} onChange={e=>setForm(f=>({...f,workoutType:e.target.value}))}>
                  {WORKOUT_TYPES.map(w=><option key={w} value={w}>{WORKOUT_ICONS[w]} {w.charAt(0).toUpperCase()+w.slice(1)}</option>)}
                </select>
              </div>
              <div style={{display:"flex",gap:"0.5rem"}}>
                <div className="form-group" style={{flex:1}}><label className="form-label">Duration (min)</label><input className="form-input" type="number" min="0" value={form.duration} onChange={e=>setForm(f=>({...f,duration:e.target.value}))} /></div>
                <div className="form-group" style={{flex:1}}><label className="form-label">Calories</label><input className="form-input" type="number" min="0" value={form.calories} onChange={e=>setForm(f=>({...f,calories:e.target.value}))} /></div>
                <div className="form-group" style={{flex:1}}><label className="form-label">Distance (km)</label><input className="form-input" type="number" min="0" step="0.1" value={form.distance} onChange={e=>setForm(f=>({...f,distance:e.target.value}))} /></div>
              </div>
            </>
          )}

          {form.type === "vital" && (
            <>
              <div style={{display:"flex",gap:"0.5rem"}}>
                <div className="form-group" style={{flex:1}}><label className="form-label">Weight (kg)</label><input className="form-input" type="number" min="0" step="0.1" value={form.weight} onChange={e=>setForm(f=>({...f,weight:e.target.value}))} /></div>
                <div className="form-group" style={{flex:1}}><label className="form-label">Heart Rate (bpm)</label><input className="form-input" type="number" min="0" value={form.heartRate} onChange={e=>setForm(f=>({...f,heartRate:e.target.value}))} /></div>
              </div>
              <div style={{display:"flex",gap:"0.5rem"}}>
                <div className="form-group" style={{flex:1}}><label className="form-label">BP Systolic</label><input className="form-input" type="number" min="0" value={form.bpSystolic} onChange={e=>setForm(f=>({...f,bpSystolic:e.target.value}))} /></div>
                <div className="form-group" style={{flex:1}}><label className="form-label">BP Diastolic</label><input className="form-input" type="number" min="0" value={form.bpDiastolic} onChange={e=>setForm(f=>({...f,bpDiastolic:e.target.value}))} /></div>
              </div>
              <div style={{display:"flex",gap:"0.5rem"}}>
                <div className="form-group" style={{flex:1}}><label className="form-label">Steps</label><input className="form-input" type="number" min="0" value={form.steps} onChange={e=>setForm(f=>({...f,steps:e.target.value}))} /></div>
                <div className="form-group" style={{flex:1}}><label className="form-label">Sleep (hrs)</label><input className="form-input" type="number" min="0" max="24" step="0.5" value={form.sleepHours} onChange={e=>setForm(f=>({...f,sleepHours:e.target.value}))} /></div>
              </div>
            </>
          )}

          <div className="form-group">
            <label className="form-label">Date</label>
            <input className="form-input" type="date" value={form.date} max={todayISO()} onChange={e=>setForm(f=>({...f,date:e.target.value}))} />
          </div>
          <div className="form-group">
            <label className="form-label">Notes <span style={{textTransform:"none",fontWeight:400,color:"var(--text-muted)"}}>(optional)</span></label>
            <input className="form-input" placeholder="How did it feel?" value={form.notes} onChange={e=>setForm(f=>({...f,notes:e.target.value}))} />
          </div>

          {saveMsg && <div className="alert alert-success">{saveMsg}</div>}
          <button className="btn" onClick={saveEntry} disabled={saving}>{saving?"Saving…":"Save Entry"}</button>
        </div>
      )}

      {/* HISTORY */}
      {activeTab === "history" && (
        <div className="tab-content">
          <div className="filter-row" style={{marginBottom:"1rem"}}>
            <select className="form-input" style={{width:"auto"}} value={filterYear} onChange={e=>setFilterYear(parseInt(e.target.value))}>
              {Array.from({length:3},(_,i)=>new Date().getFullYear()-i).map(y=><option key={y} value={y}>{y}</option>)}
            </select>
            <select className="form-input" style={{width:"auto"}} value={filterMonth} onChange={e=>setFilterMonth(parseInt(e.target.value))}>
              {["January","February","March","April","May","June","July","August","September","October","November","December"].map((n,i)=><option key={i+1} value={i+1}>{n}</option>)}
            </select>
          </div>

          {loading ? <div className="empty-state">Loading…</div> : entries.length === 0 ? (
            <div className="empty-state"><div className="empty-state-icon"><Activity size={28}/></div>No entries this month.</div>
          ) : (
            <div style={{display:"flex",flexDirection:"column",gap:"0.4rem"}}>
              {entries.map(e=>(
                <div key={e._id} className="tx-item">
                  <div className="cat-icon" style={{background:e.type==="workout"?"rgba(99,255,178,0.15)":"rgba(248,131,172,0.15)",fontSize:"1.2rem"}}>{e.type==="workout"?(WORKOUT_ICONS[e.workoutType]||"⚡"):"💊"}</div>
                  <div className="tx-info">
                    <div className="tx-desc">{e.type==="workout"?(e.workoutType.charAt(0).toUpperCase()+e.workoutType.slice(1)):"Vitals"}</div>
                    <div className="tx-meta">
                      {new Date(e.date).toLocaleDateString("en-IN",{day:"numeric",month:"short"})}
                      {e.type==="workout" && <>{e.duration>0&&` · ${e.duration} min`}{e.calories>0&&` · ${e.calories} cal`}{e.distance>0&&` · ${e.distance} km`}</>}
                      {e.type==="vital" && <>{e.weight>0&&` · ${e.weight} kg`}{e.heartRate>0&&` · ${e.heartRate} bpm`}{e.steps>0&&` · ${e.steps.toLocaleString()} steps`}{e.sleepHours>0&&` · ${e.sleepHours}h sleep`}</>}
                      {e.bpSystolic>0&&` · BP ${e.bpSystolic}/${e.bpDiastolic}`}
                    </div>
                  </div>
                  <div className="tx-right">
                    <div className="tx-actions" style={{opacity:1}}>
                      <button className="icon-btn" onClick={()=>openEdit(e)}>✏️</button>
                      <button className="icon-btn" onClick={()=>deleteEntry(e._id)}>🗑️</button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* EDIT MODAL */}
      {showModal && (
        <div className="modal-overlay" onClick={e=>e.target===e.currentTarget&&setShowModal(false)}>
          <div className="modal">
            <div className="modal-title"><span>{editEntry?"Edit Entry":"New Entry"}</span><button className="icon-btn" onClick={()=>setShowModal(false)}>✕</button></div>
            <div className="type-toggle">
              <button className={`type-btn ${form.type==="workout"?"active-expense":""}`} onClick={()=>setForm(f=>({...f,type:"workout"}))}>Workout</button>
              <button className={`type-btn ${form.type==="vital"?"active-income":""}`} onClick={()=>setForm(f=>({...f,type:"vital"}))}>Vitals</button>
            </div>
            {form.type==="workout" && (
              <>
                <div className="form-group"><label className="form-label">Type</label><select className="form-input" value={form.workoutType} onChange={e=>setForm(f=>({...f,workoutType:e.target.value}))}>{WORKOUT_TYPES.map(w=><option key={w} value={w}>{WORKOUT_ICONS[w]} {w.charAt(0).toUpperCase()+w.slice(1)}</option>)}</select></div>
                <div style={{display:"flex",gap:"0.5rem"}}>
                  <div className="form-group" style={{flex:1}}><label className="form-label">Duration (min)</label><input className="form-input" type="number" min="0" value={form.duration} onChange={e=>setForm(f=>({...f,duration:e.target.value}))}/></div>
                  <div className="form-group" style={{flex:1}}><label className="form-label">Calories</label><input className="form-input" type="number" min="0" value={form.calories} onChange={e=>setForm(f=>({...f,calories:e.target.value}))}/></div>
                </div>
              </>
            )}
            {form.type==="vital" && (
              <>
                <div style={{display:"flex",gap:"0.5rem"}}>
                  <div className="form-group" style={{flex:1}}><label className="form-label">Weight (kg)</label><input className="form-input" type="number" step="0.1" value={form.weight} onChange={e=>setForm(f=>({...f,weight:e.target.value}))}/></div>
                  <div className="form-group" style={{flex:1}}><label className="form-label">Heart Rate</label><input className="form-input" type="number" value={form.heartRate} onChange={e=>setForm(f=>({...f,heartRate:e.target.value}))}/></div>
                </div>
                <div style={{display:"flex",gap:"0.5rem"}}>
                  <div className="form-group" style={{flex:1}}><label className="form-label">Steps</label><input className="form-input" type="number" value={form.steps} onChange={e=>setForm(f=>({...f,steps:e.target.value}))}/></div>
                  <div className="form-group" style={{flex:1}}><label className="form-label">Sleep (hrs)</label><input className="form-input" type="number" step="0.5" value={form.sleepHours} onChange={e=>setForm(f=>({...f,sleepHours:e.target.value}))}/></div>
                </div>
              </>
            )}
            <div className="form-group"><label className="form-label">Date</label><input className="form-input" type="date" value={form.date} max={todayISO()} onChange={e=>setForm(f=>({...f,date:e.target.value}))}/></div>
            <div className="form-group"><label className="form-label">Notes</label><input className="form-input" value={form.notes} onChange={e=>setForm(f=>({...f,notes:e.target.value}))}/></div>
            <button className="btn" onClick={saveEntry} disabled={saving}>{saving?"Saving…":editEntry?"Update":"Save"}</button>
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
    if (!allowedApps.includes("health")) return { redirect: { destination: "/dashboard", permanent: false } };
    return { props: { user: { id: dbUser._id.toString(), name: dbUser.name, email: dbUser.email, role: dbUser.role || "user" } } };
  } catch {
    return { redirect: { destination: "/login", permanent: false } };
  }
}
