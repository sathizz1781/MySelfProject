import { useState, useEffect, useRef } from "react";
import { Search, X, Pin, Archive, FileText } from "lucide-react";
import { getAuthUser } from "../../../lib/auth";
import AppNav from "../../../components/AppNav";
import connectDB from "../../../lib/mongodb";
import User from "../../../models/User";

const NOTE_COLORS = ["#1b1b2e","#162032","#1a1a0e","#1a0e0e","#0e1a1a","#1a0e1a","#1a150e","#151a0e"];

function timeAgo(iso) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff/60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m/60);
  if (h < 24) return `${h}h ago`;
  return new Date(iso).toLocaleDateString("en-IN",{day:"numeric",month:"short"});
}

export default function NotesApp({ user }) {
  const [notes, setNotes]         = useState([]);
  const [loading, setLoading]     = useState(true);
  const [filter, setFilter]       = useState("all");
  const [search, setSearch]       = useState("");
  const [activeNote, setActiveNote] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [tagInput, setTagInput]   = useState("");
  const saveTimer                 = useRef(null);
  const searchTimer               = useRef(null);

  useEffect(() => { fetchNotes(); }, [filter]);

  useEffect(() => {
    clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(fetchNotes, 350);
    return () => clearTimeout(searchTimer.current);
  }, [search]);

  async function fetchNotes() {
    setLoading(true);
    const p = new URLSearchParams();
    if (search) p.set("search", search);
    if (filter === "archived") p.set("archived", "true");
    const res = await fetch(`/api/notes?${p}`);
    if (res.ok) {
      let data = (await res.json()).notes;
      if (filter === "pinned") data = data.filter(n => n.isPinned);
      setNotes(data);
    }
    setLoading(false);
  }

  async function openNote(note) {
    setActiveNote({...note});
    setTagInput((note.tags||[]).join(", "));
    setShowModal(true);
  }

  async function createNote() {
    const res = await fetch("/api/notes", { method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({title:"",content:"",color:"#1b1b2e"}) });
    if (res.ok) {
      const note = (await res.json()).note;
      setActiveNote(note);
      setTagInput("");
      setShowModal(true);
      fetchNotes();
    }
  }

  function scheduleAutoSave(updated) {
    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => persistNote(updated), 800);
  }

  async function persistNote(note) {
    if (!note?._id) return;
    const tags = note._tags || (note.tags||[]);
    await fetch(`/api/notes/${note._id}`, { method:"PUT", headers:{"Content-Type":"application/json"}, body:JSON.stringify({ title:note.title, content:note.content, color:note.color, isPinned:note.isPinned, isArchived:note.isArchived, tags }) });
  }

  function updateNote(field, value) {
    const updated = {...activeNote, [field]:value};
    setActiveNote(updated);
    scheduleAutoSave(updated);
  }

  function handleTagsChange(val) {
    setTagInput(val);
    const tags = val.split(",").map(t=>t.trim()).filter(Boolean);
    const updated = {...activeNote, tags, _tags:tags};
    setActiveNote(updated);
    scheduleAutoSave(updated);
  }

  async function closeModal() {
    clearTimeout(saveTimer.current);
    if (activeNote?._id) await persistNote(activeNote);
    setShowModal(false);
    setActiveNote(null);
    fetchNotes();
  }

  async function deleteNote(id, e) {
    e?.stopPropagation();
    if (!confirm("Delete this note?")) return;
    await fetch(`/api/notes/${id}`, { method:"DELETE" });
    fetchNotes();
    if (activeNote?._id === id) { setShowModal(false); setActiveNote(null); }
  }

  async function togglePin(note, e) {
    e?.stopPropagation();
    await fetch(`/api/notes/${note._id}`, { method:"PUT", headers:{"Content-Type":"application/json"}, body:JSON.stringify({isPinned:!note.isPinned}) });
    fetchNotes();
  }

  async function toggleArchive(note, e) {
    e?.stopPropagation();
    await fetch(`/api/notes/${note._id}`, { method:"PUT", headers:{"Content-Type":"application/json"}, body:JSON.stringify({isArchived:!note.isArchived}) });
    fetchNotes();
  }

  return (
    <div className="app-page">
      <AppNav user={user} title="Notes">
        <span style={{fontSize:"0.75rem",color:"var(--text-muted)"}}>{notes.length}</span>
      </AppNav>

      <div style={{padding:"0 1.25rem 0"}}>
        <div className="search-bar" style={{marginBottom:"0.75rem",marginTop:"0.75rem"}}>
          <Search size={15} color="var(--text-muted)"/>
          <input className="search-input" placeholder="Search notes…" value={search} onChange={e=>setSearch(e.target.value)}/>
          {search && <button className="icon-btn" onClick={()=>setSearch("")}><X size={13}/></button>}
        </div>

        <div style={{display:"flex",gap:"0.4rem",marginBottom:"1rem"}}>
          {["all","pinned","archived"].map(f=>(
            <button key={f} className={`filter-chip ${filter===f?"active":""}`} onClick={()=>setFilter(f)}>{f.charAt(0).toUpperCase()+f.slice(1)}</button>
          ))}
        </div>
      </div>

      <div style={{padding:"0 1.25rem 5rem"}}>
        {loading ? <div className="empty-state">Loading…</div> : notes.length === 0 ? (
          <div className="empty-state"><div className="empty-state-icon"><FileText size={28}/></div>No notes yet.<br/><span style={{fontSize:"0.78rem"}}>Tap + to create one.</span></div>
        ) : (
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(155px,1fr))",gap:"0.75rem"}}>
            {notes.map(note=>(
              <div key={note._id} onClick={()=>openNote(note)} style={{background:note.color||"#1b1b2e",borderRadius:"var(--radius-lg)",padding:"1rem",minHeight:120,cursor:"pointer",border:"1px solid rgba(255,255,255,0.06)",position:"relative",transition:"transform 0.12s ease, box-shadow 0.12s ease"}}
                onMouseEnter={e=>{e.currentTarget.style.transform="translateY(-2px)";e.currentTarget.style.boxShadow="0 6px 20px rgba(0,0,0,0.3)"}}
                onMouseLeave={e=>{e.currentTarget.style.transform="";e.currentTarget.style.boxShadow=""}}>
                {note.isPinned && <div style={{position:"absolute",top:"0.5rem",right:"0.5rem",fontSize:"0.7rem"}}>📌</div>}
                {note.title && <div style={{fontWeight:600,fontSize:"0.875rem",marginBottom:"0.4rem",lineHeight:1.3,display:"-webkit-box",WebkitLineClamp:2,WebkitBoxOrient:"vertical",overflow:"hidden"}}>{note.title}</div>}
                {note.content && <div style={{fontSize:"0.75rem",opacity:0.75,lineHeight:1.4,display:"-webkit-box",WebkitLineClamp:4,WebkitBoxOrient:"vertical",overflow:"hidden"}}>{note.content}</div>}
                {!note.title && !note.content && <div style={{fontSize:"0.75rem",opacity:0.4,fontStyle:"italic"}}>Empty note</div>}
                <div style={{marginTop:"0.6rem",fontSize:"0.62rem",opacity:0.5}}>{timeAgo(note.updatedAt)}</div>
                <div style={{position:"absolute",bottom:"0.5rem",right:"0.5rem",display:"flex",gap:"0.2rem",opacity:0}} className="note-actions-overlay"
                  onClick={e=>e.stopPropagation()}>
                  <button className="icon-btn" style={{fontSize:"0.7rem",padding:"0.2rem"}} onClick={e=>togglePin(note,e)} title={note.isPinned?"Unpin":"Pin"}>📌</button>
                  <button className="icon-btn" style={{fontSize:"0.7rem",padding:"0.2rem"}} onClick={e=>toggleArchive(note,e)} title={note.isArchived?"Unarchive":"Archive"}>📦</button>
                  <button className="icon-btn" style={{fontSize:"0.7rem",padding:"0.2rem"}} onClick={e=>deleteNote(note._id,e)} title="Delete">🗑️</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <button className="fab" onClick={createNote}>+</button>

      {showModal && activeNote && (
        <div className="modal-overlay" onClick={e=>e.target===e.currentTarget&&closeModal()}>
          <div className="modal" style={{maxHeight:"85vh",display:"flex",flexDirection:"column"}}>
            <div className="modal-title" style={{flexShrink:0}}>
              <div style={{display:"flex",gap:"0.4rem",alignItems:"center"}}>
                {NOTE_COLORS.map(c=><button key={c} onClick={()=>updateNote("color",c)} style={{width:16,height:16,borderRadius:"50%",background:c,border:activeNote.color===c?"2px solid #fff":"1px solid rgba(255,255,255,0.2)",cursor:"pointer"}}/>)}
              </div>
              <div style={{display:"flex",gap:"0.3rem",marginLeft:"auto",alignItems:"center"}}>
                <button className="icon-btn" onClick={()=>{updateNote("isPinned",!activeNote.isPinned);}} title={activeNote.isPinned?"Unpin":"Pin"}>{activeNote.isPinned?"📌":"📍"}</button>
                <button className="icon-btn" onClick={()=>deleteNote(activeNote._id)} title="Delete">🗑️</button>
                <button className="icon-btn" onClick={closeModal} style={{fontSize:"1rem"}}>✕</button>
              </div>
            </div>
            <input value={activeNote.title||""} onChange={e=>updateNote("title",e.target.value)} placeholder="Title" style={{background:"none",border:"none",outline:"none",color:"var(--text)",fontSize:"1.05rem",fontWeight:600,padding:"0 0 0.5rem",fontFamily:"var(--font)",width:"100%"}}/>
            <textarea value={activeNote.content||""} onChange={e=>updateNote("content",e.target.value)} placeholder="Write something…" style={{background:"none",border:"none",outline:"none",color:"var(--text)",fontSize:"0.9rem",fontFamily:"var(--font)",resize:"none",flex:1,minHeight:200,lineHeight:1.6}}/>
            <div style={{borderTop:"1px solid var(--border)",paddingTop:"0.6rem",marginTop:"0.5rem",flexShrink:0}}>
              <input value={tagInput} onChange={e=>handleTagsChange(e.target.value)} placeholder="Tags (comma-separated)" style={{background:"none",border:"none",outline:"none",color:"var(--text-muted)",fontSize:"0.78rem",fontFamily:"var(--font)",width:"100%"}}/>
              {(activeNote.tags||[]).length > 0 && (
                <div style={{display:"flex",gap:"0.3rem",flexWrap:"wrap",marginTop:"0.4rem"}}>
                  {(activeNote.tags||[]).map(t=><span key={t} className="tag-chip">#{t}</span>)}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <style jsx>{`.note-actions-overlay { opacity: 0; transition: opacity 0.15s; } div:hover > .note-actions-overlay { opacity: 1 !important; }`}</style>
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
    if (!allowedApps.includes("notes")) return { redirect: { destination: "/dashboard", permanent: false } };
    return { props: { user: { id: dbUser._id.toString(), name: dbUser.name, email: dbUser.email, role: dbUser.role || "user" } } };
  } catch {
    return { redirect: { destination: "/login", permanent: false } };
  }
}
