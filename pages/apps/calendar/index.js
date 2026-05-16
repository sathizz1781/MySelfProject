import { useState, useEffect } from "react";
import { ChevronLeft, ChevronRight, Calendar, MapPin, Clock, X } from "lucide-react";
import { getAuthUser } from "../../../lib/auth";
import AppNav from "../../../components/AppNav";
import connectDB from "../../../lib/mongodb";
import User from "../../../models/User";

const CAT_COLORS = { work:"#6c63ff",personal:"#10b981",health:"#f97316",family:"#ec4899",social:"#0ea5e9",other:"#6b7280" };
const EVENT_COLORS = ["#6c63ff","#f97316","#10b981","#f59e0b","#ec4899","#0ea5e9","#8b5cf6","#ef4444"];
const CATEGORIES   = ["work","personal","health","family","social","other"];
const MONTH_NAMES  = ["January","February","March","April","May","June","July","August","September","October","November","December"];

function todayISO() { return new Date().toISOString().slice(0,10); }
function daysInMonth(y,m) { return new Date(y,m,0).getDate(); }
function firstDayOffset(y,m) { return (new Date(y,m-1,1).getDay()+6)%7; }
function dateToISO(d) { return new Date(d).toISOString().slice(0,10); }
function initForm() { return { title:"",description:"",date:todayISO(),endDate:"",isAllDay:true,startTime:"",endTime:"",category:"personal",color:"#6c63ff",location:"" }; }

export default function CalendarApp({ user }) {
  const [year, setYear]           = useState(new Date().getFullYear());
  const [month, setMonth]         = useState(new Date().getMonth()+1);
  const [events, setEvents]       = useState([]);
  const [loading, setLoading]     = useState(true);
  const [activeTab, setActiveTab] = useState("month");
  const [showModal, setShowModal] = useState(false);
  const [editEvent, setEditEvent] = useState(null);
  const [form, setForm]           = useState(initForm);
  const [formError, setFormError] = useState("");
  const [saving, setSaving]       = useState(false);

  useEffect(() => { fetchEvents(); }, [year, month]);

  async function fetchEvents() {
    setLoading(true);
    const res = await fetch(`/api/calendar?year=${year}&month=${month}`);
    if (res.ok) setEvents((await res.json()).events);
    setLoading(false);
  }

  function prevMonth() { if (month===1) { setYear(y=>y-1); setMonth(12); } else setMonth(m=>m-1); }
  function nextMonth() { if (month===12) { setYear(y=>y+1); setMonth(1); } else setMonth(m=>m+1); }

  function openAdd(dateStr) { setEditEvent(null); setForm({...initForm(), date:dateStr||todayISO()}); setFormError(""); setShowModal(true); }
  function openEdit(ev) {
    setEditEvent(ev);
    setForm({ title:ev.title,description:ev.description||"",date:dateToISO(ev.date),endDate:ev.endDate?dateToISO(ev.endDate):"",isAllDay:ev.isAllDay!==false,startTime:ev.startTime||"",endTime:ev.endTime||"",category:ev.category||"personal",color:ev.color||"#6c63ff",location:ev.location||"" });
    setFormError(""); setShowModal(true);
  }

  async function saveEvent() {
    if (!form.title.trim()) return setFormError("Title is required.");
    setSaving(true); setFormError("");
    try {
      const url = editEvent ? `/api/calendar/${editEvent._id}` : "/api/calendar";
      const res = await fetch(url, { method:editEvent?"PUT":"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify(form) });
      if (res.ok) { setShowModal(false); fetchEvents(); }
      else setFormError((await res.json()).error||"Failed.");
    } finally { setSaving(false); }
  }

  async function deleteEvent(id) {
    if (!confirm("Delete this event?")) return;
    await fetch(`/api/calendar/${id}`, { method:"DELETE" });
    fetchEvents();
  }

  // Build calendar grid
  const today    = todayISO();
  const offset   = firstDayOffset(year,month);
  const days     = daysInMonth(year,month);
  const byDay    = {};
  events.forEach(e => { const d = dateToISO(e.date); if (!byDay[d]) byDay[d]=[];  byDay[d].push(e); });

  // Upcoming events (from today, sorted)
  const upcoming = [...events].filter(e=>dateToISO(e.date)>=today).sort((a,b)=>new Date(a.date)-new Date(b.date));

  // Group upcoming by date
  const grouped = {};
  upcoming.forEach(e => { const d = dateToISO(e.date); if (!grouped[d]) grouped[d]=[]; grouped[d].push(e); });

  return (
    <div className="app-page">
      <AppNav user={user} title="Calendar" />

      <div className="tabs">
        {[{key:"month",label:"Month"},{key:"upcoming",label:"Upcoming"}].map(t=>(
          <button key={t.key} className={`tab ${activeTab===t.key?"active":""}`} onClick={()=>setActiveTab(t.key)}>{t.label}</button>
        ))}
      </div>

      {/* MONTH VIEW */}
      {activeTab === "month" && (
        <div className="tab-content">
          {/* Header */}
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:"1rem"}}>
            <button className="icon-btn" onClick={prevMonth} style={{padding:"0.4rem"}}><ChevronLeft size={18}/></button>
            <h3 style={{fontSize:"1rem",fontWeight:600}}>{MONTH_NAMES[month-1]} {year}</h3>
            <button className="icon-btn" onClick={nextMonth} style={{padding:"0.4rem"}}><ChevronRight size={18}/></button>
          </div>

          {/* Weekday labels */}
          <div className="calendar-weekdays">
            {["Mon","Tue","Wed","Thu","Fri","Sat","Sun"].map(d=><div key={d} className="calendar-weekday">{d}</div>)}
          </div>

          {/* Grid */}
          <div className="calendar-grid">
            {Array.from({length:offset}).map((_,i)=><div key={`e${i}`} className="calendar-day empty"/>)}
            {Array.from({length:days},(_,i)=>{
              const day = i+1;
              const iso = `${year}-${String(month).padStart(2,"0")}-${String(day).padStart(2,"0")}`;
              const dayEvents = byDay[iso]||[];
              const isToday = iso===today;
              return (
                <div key={day} className={`calendar-day ${dayEvents.length>0?"has-expenses":""}`} style={{cursor:"pointer",border:isToday?"1.5px solid var(--accent)":undefined}} onClick={()=>openAdd(iso)}>
                  <div className="calendar-day-number" style={{color:isToday?"var(--accent)":undefined,fontWeight:isToday?700:undefined}}>{day}</div>
                  {dayEvents.slice(0,2).map((ev,i)=>(
                    <div key={i} onClick={e=>{e.stopPropagation();openEdit(ev);}} style={{background:ev.color||"#6c63ff",borderRadius:3,padding:"1px 3px",fontSize:"0.52rem",fontWeight:500,color:"#fff",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis",marginTop:1}}>{ev.title}</div>
                  ))}
                  {dayEvents.length>2 && <div style={{fontSize:"0.5rem",color:"var(--text-muted)",marginTop:1}}>+{dayEvents.length-2} more</div>}
                </div>
              );
            })}
          </div>

          <button className="btn" style={{marginTop:"1.25rem"}} onClick={()=>openAdd(null)}>+ Add Event</button>
        </div>
      )}

      {/* UPCOMING VIEW */}
      {activeTab === "upcoming" && (
        <div className="tab-content">
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"1rem"}}>
            <h3 style={{fontSize:"0.9rem",fontWeight:600}}>Upcoming Events</h3>
            <button className="btn" style={{width:"auto",padding:"0.42rem 0.9rem",fontSize:"0.82rem",marginTop:0}} onClick={()=>openAdd(null)}>+ Add</button>
          </div>

          {loading ? <div className="empty-state">Loading…</div> : upcoming.length===0 ? (
            <div className="empty-state"><div className="empty-state-icon"><Calendar size={28}/></div>No upcoming events.<br/><span style={{fontSize:"0.78rem"}}>Click a day on the calendar to add one.</span></div>
          ) : (
            Object.entries(grouped).map(([date,evs])=>(
              <div key={date} style={{marginBottom:"1.25rem"}}>
                <div style={{fontSize:"0.72rem",fontWeight:700,textTransform:"uppercase",letterSpacing:"0.07em",color:"var(--text-muted)",marginBottom:"0.5rem",paddingBottom:"0.3rem",borderBottom:"1px solid var(--border)"}}>
                  {new Date(date+"T00:00:00").toLocaleDateString("en-IN",{weekday:"long",day:"numeric",month:"long"})}
                  {date===today && <span style={{marginLeft:"0.5rem",color:"var(--accent)",fontSize:"0.65rem"}}>Today</span>}
                </div>
                {evs.map(ev=>(
                  <div key={ev._id} style={{display:"flex",alignItems:"flex-start",gap:"0.75rem",padding:"0.75rem",background:"var(--surface)",border:"1px solid var(--border)",borderRadius:"var(--radius-lg)",marginBottom:"0.4rem",borderLeft:`3px solid ${ev.color||"#6c63ff"}`}}>
                    <div style={{flex:1,minWidth:0}}>
                      <div style={{fontWeight:600,fontSize:"0.875rem",marginBottom:"0.2rem"}}>{ev.title}</div>
                      <div style={{fontSize:"0.72rem",color:"var(--text-muted)",display:"flex",gap:"0.6rem",flexWrap:"wrap"}}>
                        {!ev.isAllDay && ev.startTime && <span style={{display:"flex",alignItems:"center",gap:"0.2rem"}}><Clock size={10}/>{ev.startTime}{ev.endTime&&`–${ev.endTime}`}</span>}
                        {ev.location && <span style={{display:"flex",alignItems:"center",gap:"0.2rem"}}><MapPin size={10}/>{ev.location}</span>}
                        <span style={{padding:"0.1rem 0.45rem",borderRadius:999,background:`${CAT_COLORS[ev.category]||"#6b7280"}18`,color:CAT_COLORS[ev.category]||"#6b7280",textTransform:"capitalize"}}>{ev.category}</span>
                      </div>
                      {ev.description && <div style={{fontSize:"0.75rem",color:"var(--text-muted)",marginTop:"0.3rem"}}>{ev.description}</div>}
                    </div>
                    <div style={{display:"flex",gap:"0.2rem",flexShrink:0}}>
                      <button className="icon-btn" onClick={()=>openEdit(ev)}>✏️</button>
                      <button className="icon-btn" onClick={()=>deleteEvent(ev._id)}>🗑️</button>
                    </div>
                  </div>
                ))}
              </div>
            ))
          )}
        </div>
      )}

      {/* MODAL */}
      {showModal && (
        <div className="modal-overlay" onClick={e=>e.target===e.currentTarget&&setShowModal(false)}>
          <div className="modal">
            <div className="modal-title"><span>{editEvent?"Edit Event":"New Event"}</span><button className="icon-btn" onClick={()=>setShowModal(false)}>✕</button></div>

            <div className="form-group"><label className="form-label">Title</label><input className="form-input" placeholder="Event title" value={form.title} onChange={e=>setForm(f=>({...f,title:e.target.value}))} autoFocus/></div>
            <div style={{display:"flex",gap:"0.5rem"}}>
              <div className="form-group" style={{flex:1}}><label className="form-label">Date</label><input className="form-input" type="date" value={form.date} onChange={e=>setForm(f=>({...f,date:e.target.value}))}/></div>
              <div className="form-group" style={{flex:1}}><label className="form-label">End Date <span style={{textTransform:"none",fontWeight:400,color:"var(--text-muted)"}}>(opt)</span></label><input className="form-input" type="date" value={form.endDate} onChange={e=>setForm(f=>({...f,endDate:e.target.value}))}/></div>
            </div>

            <div className="toggle-row" style={{marginBottom:"0.85rem"}}>
              <span className="toggle-label">All Day</span>
              <button className={`toggle-switch ${form.isAllDay?"on":""}`} onClick={()=>setForm(f=>({...f,isAllDay:!f.isAllDay}))}/>
            </div>

            {!form.isAllDay && (
              <div style={{display:"flex",gap:"0.5rem"}}>
                <div className="form-group" style={{flex:1}}><label className="form-label">Start Time</label><input className="form-input" type="time" value={form.startTime} onChange={e=>setForm(f=>({...f,startTime:e.target.value}))}/></div>
                <div className="form-group" style={{flex:1}}><label className="form-label">End Time</label><input className="form-input" type="time" value={form.endTime} onChange={e=>setForm(f=>({...f,endTime:e.target.value}))}/></div>
              </div>
            )}

            <div className="form-group"><label className="form-label">Category</label>
              <select className="form-input" value={form.category} onChange={e=>setForm(f=>({...f,category:e.target.value}))}>
                {CATEGORIES.map(c=><option key={c} value={c}>{c.charAt(0).toUpperCase()+c.slice(1)}</option>)}
              </select>
            </div>
            <div className="form-group"><label className="form-label">Location <span style={{textTransform:"none",fontWeight:400,color:"var(--text-muted)"}}>(optional)</span></label><input className="form-input" placeholder="Where?" value={form.location} onChange={e=>setForm(f=>({...f,location:e.target.value}))}/></div>
            <div className="form-group">
              <label className="form-label">Colour</label>
              <div style={{display:"flex",gap:"0.4rem",flexWrap:"wrap"}}>
                {EVENT_COLORS.map(c=><button key={c} onClick={()=>setForm(f=>({...f,color:c}))} style={{width:24,height:24,borderRadius:"50%",background:c,border:form.color===c?"3px solid #fff":"2px solid transparent",cursor:"pointer"}}/>)}
              </div>
            </div>
            <div className="form-group"><label className="form-label">Description <span style={{textTransform:"none",fontWeight:400,color:"var(--text-muted)"}}>(optional)</span></label><textarea className="form-input" rows={2} value={form.description} onChange={e=>setForm(f=>({...f,description:e.target.value}))}/></div>

            {formError && <div className="alert alert-error">{formError}</div>}
            <button className="btn" onClick={saveEvent} disabled={saving}>{saving?"Saving…":editEvent?"Update Event":"Add Event"}</button>
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
    if (!allowedApps.includes("calendar")) return { redirect: { destination: "/dashboard", permanent: false } };
    return { props: { user: { id: dbUser._id.toString(), name: dbUser.name, email: dbUser.email, role: dbUser.role || "user" } } };
  } catch {
    return { redirect: { destination: "/login", permanent: false } };
  }
}
