import { useState, useEffect, useCallback, useRef } from "react";
import { 
  PieChart, Pie, Cell, 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer 
} from 'recharts';
import Kiosk from './Kiosk';

const SUPA_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPA_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

const hdrs = (tok) => ({
  "Content-Type": "application/json",
  apikey: SUPA_KEY,
  Authorization: `Bearer ${tok || SUPA_KEY}`,
  Prefer: "return=representation",
});

const db = {
  async select(t, p = {}, tok) {
    let u = `${SUPA_URL}/rest/v1/${t}?`;
    if (p.select) u += `select=${encodeURIComponent(p.select)}&`;
    if (p.filter) u += `${p.filter}&`;
    if (p.order)  u += `order=${p.order}&`;
    if (p.limit)  u += `limit=${p.limit}&`;
    if (p.offset) u += `offset=${p.offset}&`;
    const r = await fetch(u, { headers: hdrs(tok) });
    if (!r.ok) throw new Error(await r.text());
    return r.json();
  },
  async insert(t, d, tok) {
    const r = await fetch(`${SUPA_URL}/rest/v1/${t}`, { method:"POST", headers:hdrs(tok), body:JSON.stringify(d) });
    if (!r.ok) throw new Error(await r.text());
    return r.json();
  },
  async update(t, d, p = {}, tok) {
    let u = `${SUPA_URL}/rest/v1/${t}?`;
    if (p.filter) u += `${p.filter}`;
    const r = await fetch(u, { method: "PATCH", headers: hdrs(tok), body: JSON.stringify(d) });
    if (!r.ok) throw new Error(await r.text());
    try { return await r.json(); } catch(e) { return null; }
  },
  async delete(t, p = {}, tok) {
    let u = `${SUPA_URL}/rest/v1/${t}?`;
    if (p.filter) u += `${p.filter}`;
    const r = await fetch(u, { method: "DELETE", headers: hdrs(tok) });
    if (!r.ok) throw new Error(await r.text());
  },
  async authSignIn(e, p) {
    const r = await fetch(`${SUPA_URL}/auth/v1/token?grant_type=password`, { method:"POST", headers:{"Content-Type":"application/json","apikey":SUPA_KEY}, body:JSON.stringify({email:e,password:p}) });
    if (!r.ok) throw new Error((await r.json()).error_description || "Login failed");
    return r.json();
  },
  async authSignUp(e, p) {
    const r = await fetch(`${SUPA_URL}/auth/v1/signup`, { method:"POST", headers:{"Content-Type":"application/json","apikey":SUPA_KEY}, body:JSON.stringify({email:e,password:p}) });
    if (!r.ok) throw new Error((await r.json()).error_description || "Signup failed");
    return r.json();
  },
  async authSignOut(tok) {
    await fetch(`${SUPA_URL}/auth/v1/logout`, { method:"POST", headers:{"apikey":SUPA_KEY,"Authorization":`Bearer ${tok}`} });
  },
  // 🌟 FORCE SUPABASE TO USE YOUR CURRENT PORT (5173)
  async authResetPassword(e) {
    const currentUrl = encodeURIComponent(window.location.origin + "/");
    const r = await fetch(`${SUPA_URL}/auth/v1/recover?redirect_to=${currentUrl}`, { 
      method:"POST", 
      headers:{"Content-Type":"application/json","apikey":SUPA_KEY}, 
      body:JSON.stringify({email:e}) 
    });
    if (!r.ok) throw new Error((await r.json()).error_description || "Failed to send reset email");
    return r;
  },
  // 🌟 MAKE SURE THIS IS HERE:
  async authUpdatePassword(newPassword, token) {
    const r = await fetch(`${SUPA_URL}/auth/v1/user`, { 
      method: "PUT", 
      headers: { "Content-Type": "application/json", apikey: SUPA_KEY, Authorization: `Bearer ${token}` }, 
      body: JSON.stringify({ password: newPassword }) 
    });
    if (!r.ok) throw new Error((await r.json()).error_description || "Failed to update password");
    return r.json();
  },
};


const fmt  = n => "₱" + Number(n||0).toLocaleString("en-PH",{minimumFractionDigits:2});
const fmtK = n => { const v=Number(n||0); return v>=1000000?"₱"+(v/1000000).toFixed(2)+"M":v>=1000?"₱"+(v/1000).toFixed(1)+"K":fmt(v); };
const today= ()=>new Date().toISOString().split("T")[0];
async function logAudit(tok,uid,uname,action,mod,details=""){
  try{ await db.insert("audit_logs",{user_id:uid,user_name:uname,action,module:mod,details,created_at:new Date().toISOString()},tok); }catch(_){}
}

// ── Animated counter ────────────────────────────────────────────────────────
function Counter({ value, prefix = "₱", isCurrency = true }) {
  const [display, setDisplay] = useState(0);
  const ref = useRef(null);
  useEffect(() => {
    const target = parseFloat(value) || 0;
    const dur = 900, steps = 40, step = target / steps;
    let cur = 0, i = 0;
    clearInterval(ref.current);
    ref.current = setInterval(() => {
      i++; cur = Math.min(cur + step, target);
      setDisplay(cur);
      if (i >= steps) clearInterval(ref.current);
    }, dur / steps);
    return () => clearInterval(ref.current);
  }, [value]);
  if (isCurrency) return <span>{fmtK(display)}</span>;
  return <span>{Math.round(display)}</span>;
}

// ── Global styles ───────────────────────────────────────────────────────────
const G = `
@import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@600;700;800&family=Outfit:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap');

*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

:root {
  --bg:       #0D1117;
  --bg2:      #161B22;
  --bg3:      #1C2333;
  --panel:    #1E2A3A;
  --border:   rgba(255,255,255,0.08);
  --border2:  rgba(255,255,255,0.14);
  --gold:     #D4A843;
  --gold2:    #F0C040;
  --gold-dim: rgba(212,168,67,0.12);
  --blue:     #2563EB;
  --blue2:    #3B82F6;
  --blue-dim: rgba(37,99,235,0.15);
  --green:    #059669;
  --green2:   #10B981;
  --green-dim:rgba(5,150,105,0.15);
  --red:      #DC2626;
  --red2:     #EF4444;
  --red-dim:  rgba(220,38,38,0.15);
  --text:     #E6EDF3;
  --text2:    #8B949E;
  --text3:    #6E7681;
  --white:    #FFFFFF;
  --font-display: 'Playfair Display', Georgia, serif;
  --font-body:    'Outfit', sans-serif;
  --font-mono:    'JetBrains Mono', monospace;
  --radius:   12px;
  --radius-lg:18px;
  --shadow:   0 4px 24px rgba(0,0,0,0.4);
  --shadow-lg:0 8px 40px rgba(0,0,0,0.6);
}

body.light-theme {
  --bg:       #F3F4F6;
  --bg2:      #FFFFFF;
  --bg3:      #F9FAFB;
  --panel:    #FFFFFF;
  --border:   rgba(0,0,0,0.1);
  --border2:  rgba(0,0,0,0.15);
  --text:     #111827;
  --text2:    #374151;
  --text3:    #6B7280;
  --white:    #111827; 
  --shadow:   0 4px 12px rgba(0,0,0,0.05);
  --shadow-lg:0 8px 24px rgba(0,0,0,0.08);
  --blue-dim: rgba(37,99,235,0.1);
  --green-dim:rgba(5,150,105,0.1);
  --red-dim:  rgba(220,38,38,0.1);
  --gold-dim: rgba(212,168,67,0.15);
}

html, body { height: 100%; }
body { background: var(--bg); color: var(--text); font-family: var(--font-body); font-size: 14px; line-height: 1.6; transition: background 0.3s ease, color 0.3s ease; }
/* ── Layout ── */
.shell   { display: flex; min-height: 100vh; }
.sidebar { width: 260px; height: 100vh; background: var(--bg2); border-right: 1px solid var(--border); display: flex; flex-direction: column; position: fixed; top: 0; left: 0; z-index: 200; }
.content { margin-left: 260px; flex: 1; min-height: 100vh; }

/* ── Sidebar ── */
.sb-brand {
  padding: 28px 24px 22px;
  border-bottom: 1px solid var(--border);
  background: linear-gradient(135deg, rgba(212,168,67,0.06) 0%, transparent 60%);
}
.sb-emblem {
  width: 48px; height: 48px; border-radius: 50%;
  background: linear-gradient(135deg, var(--gold) 0%, #B8860B 100%);
  display: flex; align-items: center; justify-content: center;
  font-size: 22px; margin-bottom: 12px;
  box-shadow: 0 0 0 4px rgba(212,168,67,0.15);
}
.sb-brand h1 { font-family: var(--font-display); font-size: 14px; font-weight: 700; color: var(--white); line-height: 1.4; letter-spacing: 0.5px; }
.sb-brand p  { font-family: var(--font-mono); font-size: 9px; color: var(--gold); letter-spacing: 0.15em; text-transform: uppercase; margin-top: 4px; }

.sb-nav { padding: 16px 12px; flex: 1; overflow-y: auto; }
.sb-section { margin-bottom: 20px; }
.sb-section-label { font-family: var(--font-mono); font-size: 9px; letter-spacing: 0.18em; text-transform: uppercase; color: var(--text3); padding: 0 12px; margin-bottom: 6px; }
.nav-btn {
  display: flex; align-items: center; gap: 10px;
  width: 100%; padding: 10px 12px; border-radius: 10px;
  border: none; background: transparent; cursor: pointer;
  font-family: var(--font-body); font-size: 13px; font-weight: 500;
  color: var(--text2); transition: all 0.18s; text-align: left;
  position: relative; margin-bottom: 2px;
}
.nav-btn:hover { background: rgba(255,255,255,0.05); color: var(--text); }
.nav-btn.active {
  background: linear-gradient(90deg, var(--blue-dim), rgba(37,99,235,0.08));
  color: var(--blue2);
  border-left: 2px solid var(--blue2);
}
.nav-btn .nav-icon { font-size: 16px; width: 22px; text-align: center; flex-shrink: 0; }
.nav-pill {
  margin-left: auto; background: var(--red); color: #fff;
  font-size: 10px; font-family: var(--font-mono); font-weight: 600;
  padding: 2px 7px; border-radius: 20px; min-width: 22px; text-align: center;
}

.sb-footer { padding: 16px; border-top: 1px solid var(--border); }
.sb-user {
  display: flex; align-items: center; gap: 10px; padding: 10px 12px;
  border-radius: 10px; background: var(--bg3); border: 1px solid var(--border);
  cursor: pointer; transition: all 0.18s;
}
.sb-user:hover { border-color: var(--border2); }
.sb-avatar {
  width: 34px; height: 34px; border-radius: 50%;
  background: linear-gradient(135deg, var(--gold) 0%, #B8860B 100%);
  display: flex; align-items: center; justify-content: center;
  font-size: 13px; font-weight: 700; color: #000; flex-shrink: 0;
}
.sb-user-name { font-size: 12px; font-weight: 600; color: var(--text); }
.sb-user-role { font-size: 10px; font-family: var(--font-mono); color: var(--gold); text-transform: uppercase; letter-spacing: 0.08em; }
.sb-logout { margin-left: auto; font-size: 18px; color: var(--text3); transition: color 0.15s; line-height: 1; }
.sb-user:hover .sb-logout { color: var(--red2); }

/* ── Topbar ── */
.topbar {
  display: flex; align-items: center; justify-content: space-between;
  padding: 24px 32px 0; margin-bottom: 28px;
}
.topbar-left h1 { font-family: var(--font-display); font-size: 26px; font-weight: 700; color: var(--white); }
.topbar-left p  { font-family: var(--font-mono); font-size: 11px; color: var(--text3); margin-top: 3px; }
.topbar-right   { display: flex; gap: 10px; align-items: center; }

/* ── Buttons ── */
.btn {
  display: inline-flex; align-items: center; gap: 7px;
  padding: 9px 18px; border-radius: 9px; border: none; cursor: pointer;
  font-family: var(--font-body); font-size: 13px; font-weight: 600;
  transition: all 0.18s; white-space: nowrap;
}
.btn-primary { background: var(--blue); color: #fff; }
.btn-primary:hover { background: #1D4ED8; transform: translateY(-1px); box-shadow: 0 4px 14px rgba(37,99,235,0.4); }
.btn-gold { background: linear-gradient(135deg, var(--gold) 0%, #B8860B 100%); color: #000; font-weight: 700; }
.btn-gold:hover { transform: translateY(-1px); box-shadow: 0 4px 14px rgba(212,168,67,0.4); }
.btn-success { background: var(--green); color: #fff; }
.btn-success:hover { background: #047857; transform: translateY(-1px); }
.btn-danger  { background: var(--red); color: #fff; }
.btn-outline {
  background: transparent; color: var(--text2);
  border: 1px solid var(--border2);
}
.btn-outline:hover { background: var(--bg3); color: var(--text); border-color: var(--border2); }
.btn-ghost  { background: transparent; color: var(--text2); border: 1px solid transparent; }
.btn-ghost:hover { background: rgba(255,255,255,0.05); color: var(--text); }
.btn-sm  { padding: 6px 12px; font-size: 12px; }
.btn-xs  { padding: 4px 9px; font-size: 11px; }
.btn:disabled { opacity: 0.5; cursor: not-allowed; transform: none !important; }

/* ── Stat Cards ── */
.stat-row { display: grid; grid-template-columns: repeat(4,1fr); gap: 16px; padding: 0 32px; margin-bottom: 24px; }
.stat-card {
  background: var(--panel);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  padding: 20px 22px;
  position: relative; overflow: hidden;
  transition: transform 0.2s, box-shadow 0.2s;
}
.stat-card:hover { transform: translateY(-2px); box-shadow: var(--shadow); }
.stat-card::after {
  content: ''; position: absolute; inset: 0;
  border-radius: var(--radius-lg);
  background: linear-gradient(135deg, rgba(255,255,255,0.03) 0%, transparent 60%);
  pointer-events: none;
}
.stat-accent { position: absolute; top: 0; left: 0; right: 0; height: 2px; border-radius: var(--radius-lg) var(--radius-lg) 0 0; }
.stat-accent.gold  { background: linear-gradient(90deg, var(--gold), var(--gold2)); }
.stat-accent.blue  { background: linear-gradient(90deg, var(--blue), var(--blue2)); }
.stat-accent.green { background: linear-gradient(90deg, var(--green), var(--green2)); }
.stat-accent.red   { background: linear-gradient(90deg, var(--red), var(--red2)); }
.stat-icon-bg {
  position: absolute; right: 16px; top: 16px; width: 44px; height: 44px;
  border-radius: 10px; display: flex; align-items: center; justify-content: center;
  font-size: 20px;
}
.stat-icon-bg.gold  { background: var(--gold-dim); }
.stat-icon-bg.blue  { background: var(--blue-dim); }
.stat-icon-bg.green { background: var(--green-dim); }
.stat-icon-bg.red   { background: var(--red-dim); }
.stat-label { font-family: var(--font-mono); font-size: 10px; letter-spacing: 0.1em; text-transform: uppercase; color: var(--text3); margin-bottom: 8px; }
.stat-value { font-family: var(--font-display); font-size: 28px; font-weight: 700; color: var(--white); line-height: 1; }
.stat-value.big-num { font-size: 22px; }
.stat-delta { font-size: 11px; color: var(--text3); margin-top: 6px; font-family: var(--font-mono); }

/* ── Page body ── */
.page-body { padding: 0 32px 32px; }

/* ── Panel / Card ── */
.card {
  background: var(--panel); border: 1px solid var(--border);
  border-radius: var(--radius-lg); overflow: hidden; margin-bottom: 20px;
}
.card-header {
  display: flex; align-items: center; justify-content: space-between;
  padding: 18px 22px; border-bottom: 1px solid var(--border);
}
.card-title { font-family: var(--font-display); font-size: 16px; font-weight: 600; color: var(--white); }
.card-sub   { font-size: 12px; color: var(--text3); font-family: var(--font-mono); margin-top: 2px; }
.card-body  { padding: 22px; }

.panel {
  background: var(--panel); border: 1px solid var(--border);
  border-radius: var(--radius-lg); padding: 22px; margin-bottom: 20px;
}
.panel-title {
  font-family: var(--font-display); font-size: 16px; font-weight: 600; color: var(--white);
  margin-bottom: 18px; padding-bottom: 14px; border-bottom: 1px solid var(--border);
  display: flex; align-items: center; gap: 8px;
}
.panel-title::before { content: ''; display: block; width: 3px; height: 18px; background: var(--gold); border-radius: 2px; }

/* ── Table ── */
.table-wrap { overflow-x: auto; }
table { width: 100%; border-collapse: collapse; }
thead tr { background: rgba(0,0,0,0.25); }
th {
  padding: 11px 16px; text-align: left;
  font-family: var(--font-mono); font-size: 10px; letter-spacing: 0.12em;
  text-transform: uppercase; color: var(--text3);
  border-bottom: 1px solid var(--border); white-space: nowrap;
}
td {
  padding: 13px 16px; font-size: 13px;
  border-bottom: 1px solid var(--border); vertical-align: middle;
  color: var(--text);
}
tbody tr { transition: background 0.12s; }
tbody tr:hover td { background: rgba(255,255,255,0.025); }
tbody tr:last-child td { border-bottom: none; }

/* ── Badges ── */
.badge {
  display: inline-flex; align-items: center; gap: 4px;
  padding: 3px 10px; border-radius: 20px;
  font-size: 11px; font-weight: 600; font-family: var(--font-mono);
  white-space: nowrap;
}
.badge::before { content:''; width:5px; height:5px; border-radius:50%; flex-shrink:0; }
.badge-green  { background: var(--green-dim);  color: var(--green2);  border: 1px solid rgba(16,185,129,0.2); }
.badge-green::before  { background: var(--green2); }
.badge-red    { background: var(--red-dim);    color: var(--red2);    border: 1px solid rgba(239,68,68,0.2); }
.badge-red::before    { background: var(--red2); }
.badge-gold   { background: var(--gold-dim);   color: var(--gold2);   border: 1px solid rgba(212,168,67,0.2); }
.badge-gold::before   { background: var(--gold2); }
.badge-blue   { background: var(--blue-dim);   color: var(--blue2);   border: 1px solid rgba(59,130,246,0.2); }
.badge-blue::before   { background: var(--blue2); }
.badge-slate  { background: rgba(139,148,158,0.1); color: #8B949E; border: 1px solid rgba(139,148,158,0.2); }
.badge-slate::before  { background: #8B949E; }

/* ── Mono text ── */
.mono { font-family: var(--font-mono); font-size: 12px; }
.mono-sm { font-family: var(--font-mono); font-size: 11px; color: var(--text3); }

/* ── Form elements ── */
.form-grid   { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
.form-grid-3 { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 16px; }
.form-group  { display: flex; flex-direction: column; gap: 6px; }
.form-group.span2 { grid-column: span 2; }
.form-label {
  font-family: var(--font-mono); font-size: 10px; letter-spacing: 0.1em;
  text-transform: uppercase; color: var(--text3);
}
input, select, textarea {
  background: var(--bg3); border: 1px solid var(--border2);
  color: var(--text); padding: 10px 14px; border-radius: 9px;
  font-size: 13px; font-family: var(--font-body); outline: none;
  transition: border-color 0.18s, box-shadow 0.18s; width: 100%;
}
input:focus, select:focus, textarea:focus {
  border-color: var(--blue2);
  box-shadow: 0 0 0 3px rgba(59,130,246,0.12);
}
select option { background: var(--bg2); }
input[type="checkbox"] { width: auto; }

/* ── Search bar ── */
.searchbar {
  display: flex; gap: 10px; padding: 16px 22px;
  border-bottom: 1px solid var(--border);
}
.searchbar input { flex: 1; }

/* ── Pagination ── */
.pagination {
  display: flex; align-items: center; gap: 8px;
  padding: 14px 22px; border-top: 1px solid var(--border);
  justify-content: space-between;
}
.pg-info { font-family: var(--font-mono); font-size: 11px; color: var(--text3); }
.pg-btns { display: flex; gap: 6px; }
.pg-btn  {
  padding: 5px 12px; border-radius: 7px; border: 1px solid var(--border2);
  background: transparent; color: var(--text2); cursor: pointer;
  font-size: 12px; font-family: var(--font-body); transition: all 0.15s;
}
.pg-btn:hover:not(:disabled) { background: var(--bg3); color: var(--text); }
.pg-btn:disabled { opacity: 0.3; cursor: default; }

/* ── Tabs ── */
.tabs-bar {
  display: flex; gap: 2px; padding: 4px;
  background: var(--bg3); border-radius: 11px; width: fit-content;
  margin-bottom: 22px;
}
.tab-btn {
  padding: 8px 20px; border-radius: 8px; border: none; cursor: pointer;
  font-family: var(--font-body); font-size: 13px; font-weight: 500;
  color: var(--text2); background: transparent; transition: all 0.18s;
}
.tab-btn.active { background: var(--panel); color: var(--white); box-shadow: var(--shadow); }
.tab-btn:hover:not(.active) { color: var(--text); }

/* ── Steps ── */
.steps { display: flex; align-items: center; gap: 0; margin-bottom: 28px; }
.step {
  display: flex; align-items: center; gap: 10px;
  padding: 10px 18px; border-radius: 10px; font-size: 13px; font-weight: 500;
  color: var(--text3); background: transparent; transition: all 0.2s;
}
.step.active { background: var(--blue-dim); color: var(--blue2); }
.step.done   { color: var(--green2); }
.step-num {
  width: 26px; height: 26px; border-radius: 50%; border: 2px solid currentColor;
  display: flex; align-items: center; justify-content: center;
  font-family: var(--font-mono); font-size: 11px; font-weight: 700; flex-shrink: 0;
}
.step.done .step-num { background: var(--green-dim); }
.step.active .step-num { background: var(--blue-dim); border-color: var(--blue2); }
.step-sep { width: 32px; height: 1px; background: var(--border); flex-shrink: 0; }

/* ── OR Receipt ── */
.or-paper {
  background: #FAFAF8; color: #1a1a1a; border-radius: var(--radius-lg);
  padding: 32px; max-width: 420px; margin: 0 auto;
  box-shadow: 0 20px 60px rgba(0,0,0,0.5);
  border: 1px solid rgba(0,0,0,0.1);
  font-family: var(--font-mono);
}
.or-header { text-align: center; margin-bottom: 16px; }
.or-seal { font-size: 36px; margin-bottom: 8px; }
.or-header h2 { font-family: var(--font-body); font-size: 11px; color: #666; font-weight: 400; }
.or-header h1 { font-family: var(--font-display); font-size: 17px; font-weight: 700; color: #000; margin: 3px 0; }
.or-number {
  background: #1a3a6e; color: #fff; text-align: center;
  padding: 8px; border-radius: 6px; font-size: 13px; font-weight: 700;
  letter-spacing: 0.06em; margin: 12px 0;
}
.or-divider { border: none; border-top: 2px dashed #d0d0c0; margin: 14px 0; }
.or-line { display: flex; justify-content: space-between; align-items: baseline; padding: 3px 0; font-size: 11px; }
.or-line .k { color: #555; font-weight: 400; }
.or-line .v { font-weight: 700; color: #111; text-align: right; max-width: 55%; word-break: break-word; }
.or-total-box {
  background: linear-gradient(135deg, #1a3a6e 0%, #0d2040 100%);
  color: #fff; padding: 14px 16px; border-radius: 8px; margin-top: 14px;
  display: flex; justify-content: space-between; align-items: center;
}
.or-total-box .label { font-size: 12px; letter-spacing: 0.1em; opacity: 0.8; }
.or-total-box .amount { font-size: 18px; font-weight: 700; color: var(--gold2); }
.or-qr { text-align: center; margin-top: 16px; }
.qr-placeholder { width: 64px; height: 64px; margin: 6px auto; border: 2px solid #ccc; display: flex; align-items: center; justify-content: center; border-radius: 4px; font-size: 9px; color: #aaa; }
.or-footer { text-align: center; font-size: 10px; color: #888; margin-top: 10px; }

/* ── Detail rows ── */
.detail-grid { display: flex; flex-direction: column; gap: 0; }
.drow {
  display: flex; justify-content: space-between; align-items: center;
  padding: 10px 0; border-bottom: 1px solid var(--border); font-size: 13px;
}
.drow:last-child { border-bottom: none; }
.drow .dk { color: var(--text3); font-size: 12px; }
.drow .dv { font-family: var(--font-mono); font-size: 12px; font-weight: 600; color: var(--text); }

/* ── Banners ── */
.banner {
  border-radius: var(--radius); padding: 12px 16px;
  font-size: 13px; margin-bottom: 16px;
  display: flex; align-items: flex-start; gap: 10px;
}
.banner-icon { font-size: 16px; flex-shrink: 0; margin-top: 1px; }
.banner-success { background: var(--green-dim); border: 1px solid rgba(16,185,129,0.25); color: var(--green2); }
.banner-warn    { background: var(--gold-dim);  border: 1px solid rgba(212,168,67,0.25);  color: var(--gold2); }
.banner-err     { background: var(--red-dim);   border: 1px solid rgba(220,38,38,0.25);   color: var(--red2); }
.banner-info    { background: var(--blue-dim);  border: 1px solid rgba(37,99,235,0.25);   color: var(--blue2); }

/* ── Spinner ── */
.spin {
  display: inline-block; width: 15px; height: 15px;
  border: 2px solid rgba(255,255,255,0.2); border-top-color: currentColor;
  border-radius: 50%; animation: spin 0.65s linear infinite; vertical-align: middle;
}
@keyframes spin { to { transform: rotate(360deg); } }
.loading-state { display: flex; align-items: center; justify-content: center; gap: 10px; padding: 48px; color: var(--text3); font-size: 13px; }

/* ── Empty state ── */
.empty { display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 52px; gap: 10px; color: var(--text3); }
.empty-icon { font-size: 40px; opacity: 0.4; }
.empty-text { font-size: 14px; }

/* ── Login ── */
.login-shell {
  min-height: 100vh; 
  width: 100vw;           /* 🌟 Forces full screen width */
  position: absolute;     /* 🌟 Ignores Vite/Bootstrap constraints */
  top: 0;                 
  left: 0;                
  display: flex; 
  align-items: center; 
  justify-content: center;
  background: var(--bg);
  background-image: radial-gradient(ellipse 80% 50% at 50% -20%, rgba(212,168,67,0.08) 0%, transparent 60%);
}
}
.login-box {
  width: 420px; background: var(--panel);
  border: 1px solid var(--border2); border-radius: 20px;
  padding: 40px; box-shadow: var(--shadow-lg);
}
.login-head { text-align: center; margin-bottom: 32px; }
.login-emblem {
  width: 64px; height: 64px; border-radius: 50%; margin: 0 auto 14px;
  background: linear-gradient(135deg, var(--gold) 0%, #B8860B 100%);
  display: flex; align-items: center; justify-content: center; font-size: 28px;
  box-shadow: 0 0 0 8px rgba(212,168,67,0.1);
}
.login-head h1 { font-family: var(--font-display); font-size: 20px; font-weight: 700; color: var(--white); letter-spacing: 0.5px; }
.login-head p  { font-size: 12px; color: var(--text3); margin-top: 5px; font-family: var(--font-mono); }
.login-divider { display: flex; align-items: center; gap: 12px; margin: 20px 0; }
.login-divider span { font-size: 11px; color: var(--text3); font-family: var(--font-mono); white-space: nowrap; }
.login-divider::before, .login-divider::after { content: ''; flex: 1; height: 1px; background: var(--border); }

/* ── Two-col layout ── */
.two-col { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
.three-col { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 16px; }
.col-8-4 { display: grid; grid-template-columns: 2fr 1fr; gap: 20px; }

/* ── Computation box ── */
.comp-row {
  display: flex; justify-content: space-between; align-items: center;
  padding: 9px 14px; border-radius: 8px; font-size: 13px;
  transition: background 0.12s;
}
.comp-row:hover { background: rgba(255,255,255,0.03); }
.comp-row.total {
  background: linear-gradient(90deg, var(--blue-dim), rgba(37,99,235,0.08));
  border: 1px solid rgba(59,130,246,0.2);
  margin-top: 6px;
}
.comp-row .ck { color: var(--text3); }
.comp-row .cv { font-family: var(--font-mono); font-weight: 600; color: var(--text); }
.comp-row.total .cv { color: var(--blue2); font-size: 15px; }

/* ── Property pill ── */
.prop-card {
  border: 1px solid var(--border); border-radius: var(--radius); padding: 14px 18px;
  cursor: pointer; transition: all 0.18s; background: var(--bg3);
  display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;
}
.prop-card:hover { border-color: var(--blue2); background: var(--blue-dim); }
.prop-card-left h3 { font-size: 14px; font-weight: 600; color: var(--white); }
.prop-card-left p  { font-size: 12px; color: var(--text3); margin-top: 3px; font-family: var(--font-mono); }

/* ── Audit log row ── */
.audit-entry {
  display: grid; grid-template-columns: 160px 120px 1fr 80px;
  gap: 12px; padding: 12px 0; border-bottom: 1px solid var(--border);
  align-items: center; font-size: 12px;
}
.audit-entry:last-child { border-bottom: none; }
.audit-time   { font-family: var(--font-mono); font-size: 10px; color: var(--text3); }
.audit-user   { font-family: var(--font-mono); color: var(--gold2); font-size: 11px; }
.audit-action { color: var(--text2); }

/* ── Chart bars ── */
.bar-chart { display: flex; align-items: flex-end; gap: 8px; height: 80px; }
.bar-wrap  { flex: 1; display: flex; flex-direction: column; align-items: center; gap: 4px; }
.bar-fill  { width: 100%; border-radius: 4px 4px 0 0; background: linear-gradient(180deg, var(--blue2), var(--blue)); min-height: 3px; transition: height 0.6s; }
.bar-lbl   { font-size: 9px; color: var(--text3); font-family: var(--font-mono); }

/* ── Misc ── */
.section-gap { padding: 0 32px; }
.grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
.amount-lg { font-family: var(--font-mono); font-size: 18px; font-weight: 700; color: var(--gold2); }
.divider { height: 1px; background: var(--border); margin: 16px 0; }
.text-muted { color: var(--text3); font-size: 12px; }
.text-right { text-align: right; }
.gap-row { display: flex; gap: 10px; align-items: center; }
.chip {
  display: inline-block; padding: 2px 10px; border-radius: 20px;
  font-size: 11px; font-family: var(--font-mono);
  background: var(--bg3); border: 1px solid var(--border2); color: var(--text3);
}
@media print {
  body * { visibility: hidden; }
  .soa-print-area, .soa-print-area * { visibility: visible; color: #000 !important; }
  .soa-print-area { position: absolute; left: 0; top: 0; width: 100%; min-height: 100%; background: #fff !important; padding: 20px; box-shadow: none; border: none; }
  .no-print { display: none !important; }
}
`;
/* ═══════════════════════════════════════════════════════════
   SETTINGS (LIGHT/DARK MODE)
═══════════════════════════════════════════════════════════ */
function Settings({ theme, setTheme }) {
  return (
    <>
      <div className="topbar">
        <div className="topbar-left">
          <h1>System Settings</h1>
          <p>APPLICATION PREFERENCES</p>
        </div>
      </div>
      <div className="page-body">
        <div className="panel" style={{maxWidth: 600}}>
          <div className="panel-title">Appearance</div>
          <div className="form-group" style={{marginBottom: 20}}>
            <label className="form-label">Interface Theme</label>
            <div style={{display: "flex", gap: "10px", marginTop: "8px"}}>
              <div 
                onClick={() => setTheme("dark")}
                style={{
                  flex: 1, padding: "20px", 
                  border: `2px solid ${theme === "dark" ? "var(--blue2)" : "var(--border)"}`, 
                  borderRadius: "12px", cursor: "pointer", 
                  background: "#0D1117", color: "#E6EDF3", textAlign: "center",
                  transition: "all 0.2s"
                }}>
                <div style={{fontSize: "24px", marginBottom: "8px"}}>🌙</div>
                <div style={{fontWeight: "bold"}}>Dark Mode</div>
              </div>
              <div 
                onClick={() => setTheme("light")}
                style={{
                  flex: 1, padding: "20px", 
                  border: `2px solid ${theme === "light" ? "var(--blue2)" : "var(--border)"}`, 
                  borderRadius: "12px", cursor: "pointer", 
                  background: "#F3F4F6", color: "#111827", textAlign: "center",
                  transition: "all 0.2s"
                }}>
                <div style={{fontSize: "24px", marginBottom: "8px"}}>☀️</div>
                <div style={{fontWeight: "bold"}}>Light Mode</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
/* ═══════════════════════════════════════════════════════════
   LOGIN & FORGOT PASSWORD (UPDATED WITH KIOSK BUTTON)
═══════════════════════════════════════════════════════════ */
function Login({ onLogin, onOpenKiosk }) {
  const [email, setEmail] = useState("");
  const [pass,  setPass]  = useState("");
  const [name,  setName]  = useState("");
  const [role,  setRole]  = useState("cashier");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [msg, setMsg] = useState("");

  const [showManual, setShowManual] = useState(false);
  const [manualLink, setManualLink] = useState("");

  const [mode, setMode] = useState(() => {
    if (typeof window !== "undefined" && window.location.hash.includes("type=recovery")) {
      return "reset";
    }
    return "login";
  });

  const [recoveryToken, setRecoveryToken] = useState(() => {
    if (typeof window !== "undefined") {
      const match = window.location.hash.match(/access_token=([^&]+)/);
      return match ? match[1] : "";
    }
    return "";
  });

  const handleManualPaste = () => {
    setErr("");
    const match = manualLink.match(/access_token=([^&]+)/);
    if (match && match[1]) {
      setRecoveryToken(match[1]);
      setMode("reset");
      setMsg("Link accepted! Please enter your new password below.");
      setShowManual(false);
    } else {
      setErr("Invalid link. Please copy the entire URL from the email.");
    }
  };

  const submit = async () => {
    setErr(""); setMsg("");
    
    if (mode === "reset" && !pass) { setErr("Please enter a new password."); return; }
    if (mode !== "reset" && !email) { setErr("Email is required."); return; }
    if (mode === "login" && !pass) { setErr("Password is required."); return; }
    if (mode === "register" && !name) { setErr("Full Name is required."); return; }
    
    setLoading(true); 
    try {
      if (mode === "login") {
        const data = await db.authSignIn(email, pass);
        const profiles = await db.select("user_profiles", { filter:`id=eq.${data.user.id}` }, data.access_token);
        onLogin({ token: data.access_token, user: data.user, profile: profiles[0] || { full_name: email, role: "cashier" } });
      
      } else if (mode === "register") {
        const existingName = await db.select("user_profiles", { filter: `full_name=ilike.${name}` });
        if (existingName && existingName.length > 0) {
          throw new Error("An account with this Full Name already exists.");
        }
        const data = await db.authSignUp(email, pass);
        if (data.user) {
          await db.insert("user_profiles", { id: data.user.id, full_name: name, role }, data.access_token || SUPA_KEY);
          await logAudit(data.access_token || SUPA_KEY, data.user.id, name, `New user registered: ${name}`, "AUTH");
          setMode("login"); 
          alert("Account created! Please sign in.");
        }
      
      } else if (mode === "forgot") {
        const currentUrl = encodeURIComponent(window.location.origin + "/");
        await fetch(`${SUPA_URL}/auth/v1/recover?redirect_to=${currentUrl}`, { 
          method:"POST", 
          headers:{"Content-Type":"application/json","apikey":SUPA_KEY}, 
          body:JSON.stringify({email}) 
        });
        
        setMsg("Password reset link sent! Please check your email inbox.");
        setTimeout(() => setMode("login"), 5000);
      
      } else if (mode === "reset") {
        if (!recoveryToken) throw new Error("Missing recovery token. Please paste the link again.");
        
        await db.authUpdatePassword(pass, recoveryToken);
        setMsg("Password successfully updated! You can now sign in.");
        setPass("");
        
        setTimeout(() => {
          window.location.hash = "";
          setMode("login");
        }, 3000);
      }
    } catch(e) { 
      let errMsg = e.message;
      if (errMsg.toLowerCase().includes("user already registered")) errMsg = "An account with this Email Address already exists.";
      setErr(errMsg); 
    }
    setLoading(false);
  };

  return (
    <div className="login-shell">
      <div className="login-box">
        <div className="login-head">
         <div className="login-emblem"><img src="https://i.postimg.cc/VktjPybt/macalelon-logo.png" alt="LGU Logo" style={{width: "100%", height: "100%", borderRadius: "50%", objectFit: "cover"}} /></div>
           <h1>Municipality of Macalelon</h1>
          <p>Real Property Tax Management System</p>
        </div>

        {err && <div className="banner banner-err"><span className="banner-icon">⚠</span>{err}</div>}
        {msg && <div className="banner banner-success"><span className="banner-icon">✓</span>{msg}</div>}

        <div style={{display:"flex",flexDirection:"column",gap:14}}>
          {mode === "register" && <>
            <div className="form-group">
              <label className="form-label">Full Name</label>
              <input value={name} onChange={e=>setName(e.target.value)} placeholder="e.g. VILLANUEVA, MARIA TERESA"/>
            </div>
            <div className="form-group">
              <label className="form-label">Role</label>
              <select value={role} onChange={e=>setRole(e.target.value)}>
                {["cashier","assessor","encoder","accountant","auditor","treasurer","admin"].map(r=>(
                  <option key={r} value={r}>{r.charAt(0).toUpperCase()+r.slice(1)}</option>
                ))}
              </select>
            </div>
          </>}
          
          {mode !== "reset" && !showManual && (
            <div className="form-group">
              <label className="form-label">Email Address</label>
              <input type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="user@lgu.gov.ph"/>
            </div>
          )}

          {showManual && (
            <div className="form-group" style={{padding: "16px", background: "var(--bg3)", borderRadius: "8px", border: "1px dashed var(--border2)"}}>
              <label className="form-label" style={{color: "var(--blue2)"}}>Paste the full link from your email here:</label>
              <input value={manualLink} onChange={e=>setManualLink(e.target.value)} placeholder="http://localhost:5173/#access_token=..."/>
              <div style={{display: "flex", gap: "8px", marginTop: "8px"}}>
                <button className="btn btn-primary btn-sm" style={{flex: 1}} onClick={handleManualPaste}>Submit Link</button>
                <button className="btn btn-outline btn-sm" onClick={() => setShowManual(false)}>Cancel</button>
              </div>
            </div>
          )}

          {(mode === "login" || mode === "register" || mode === "reset") && !showManual && (
            <div className="form-group">
              <div style={{display: "flex", justifyContent: "space-between"}}>
                <label className="form-label">{mode === "reset" ? "Enter New Password" : "Password"}</label>
                {mode === "login" && (
                  <span style={{fontSize: 11, cursor: "pointer", color: "var(--blue2)"}} onClick={() => {setMode("forgot"); setErr(""); setMsg("");}}>Forgot Password?</span>
                )}
              </div>
              <input type="password" value={pass} onChange={e=>setPass(e.target.value)} onKeyDown={e=>e.key==="Enter"&&submit()}/>
            </div>
          )}

          {!showManual && (
            <button className="btn btn-gold" style={{marginTop:4,width:"100%",justifyContent:"center",padding:"12px"}} onClick={submit} disabled={loading}>
              {loading ? <><span className="spin"/>&nbsp;Processing…</> : mode==="login"?"Sign In →": mode==="register"?"Create Account →" : mode==="reset"?"Save New Password" : "Send Reset Link ✉️"}
            </button>
          )}
        </div>

        <div className="login-divider">
          <span>{mode==="login"?"New to the system?": mode==="forgot" ? "Remember your password?" : mode==="reset" ? "Changed your mind?" : "Already registered?"}</span>
        </div>
        
        <div style={{display: "flex", flexDirection: "column", gap: "8px", alignItems: "center"}}>
          <button className="btn btn-ghost btn-sm" onClick={()=>{
            setMode(mode==="login"?"register":"login"); 
            setErr(""); setMsg(""); setShowManual(false);
            window.location.hash = ""; 
          }}>
            {mode==="login"?"Create an account":"Back to sign in"}
          </button>

          {mode === "login" && !showManual && (
            <span style={{fontSize: 10, color: "var(--text3)", cursor: "pointer", textDecoration: "underline"}} onClick={() => setShowManual(true)}>
              Have a recovery link? Paste it here.
            </span>
          )}
        </div>

        {/* 🌟 NEW: KIOSK BUTTON FOR PUBLIC */}
        <div style={{ marginTop: "24px", borderTop: "1px solid var(--border)", paddingTop: "16px", textAlign: "center" }}>
          <p style={{color: "var(--text3)", fontSize: "12px", marginBottom: "8px"}}>For Public Inquiries</p>
          <button
            onClick={onOpenKiosk}
            style={{ padding: "8px 16px", background: "transparent", border: "2px solid var(--blue)", color: "var(--blue)", borderRadius: "8px", fontWeight: "bold", cursor: "pointer", fontSize: "12px" }}
          >
            🖥️ Open Self-Service Kiosk
          </button>
        </div>

      </div>
    </div>
  );
}
/* ═══════════════════════════════════════════════════════════
   SIDEBAR (UPDATED TO NAVY & GOLD LGU THEME)
═══════════════════════════════════════════════════════════ */
function Sidebar({ active, setActive, profile, onLogout, delinqCount }) {
  const sections = [
    { label:"Overview", items:[
      { id:"dashboard",   icon:"📊",  label:"Dashboard" },
    ]},
    { label:"Records", items:[
      { id:"taxpayers",   icon:"👥",  label:"Taxpayers" },
      { id:"assessments", icon:"📋",  label:"Assessments" },
    ]},
    { label:"Treasury", items:[
      { id:"collection",  icon:"💰",  label:"Collection" },
      { id:"delinquency", icon:"⚠️",  label:"Delinquency", badge: delinqCount||null },
      { id:"receipts",    icon:"🧾",  label:"Official Receipts" },
    ]},
    { label:"Compliance", items:[
      { id:"reports",     icon:"📈",  label:"Reports" },
      { id:"auditlogs",   icon:"🔒",  label:"Audit Logs" },
    ]},
    { label:"System", items:[
      { id:"settings",    icon:"⚙️",  label:"Settings" },
    ]},
  ];
  
  const initials = (profile?.full_name||"U").split(",").map(s=>s.trim()[0]).join("").slice(0,2).toUpperCase();
  
  return (
    <div className="no-print-sidebar" style={{ width: "260px", height: "100vh", backgroundColor: "#1E3A5F", display: "flex", flexDirection: "column", position: "fixed", top: 0, left: 0, zIndex: 200, boxShadow: "2px 0 10px rgba(0,0,0,0.2)" }}>
      
      {/* 🌟 LGU BRANDING HEADER */}
      <div style={{ padding: "25px 20px 20px", borderBottom: "1px solid rgba(255,255,255,0.1)", textAlign: "center" }}>
        <img src="https://i.postimg.cc/VktjPybt/macalelon-logo.png" alt="LGU Logo" style={{width: "70px", height: "70px", borderRadius: "50%", objectFit: "cover", margin: "0 auto 10px", backgroundColor: "#fff", border: "2px solid #D4A017"}} />
        <h1 style={{ fontSize: "15px", fontWeight: "bold", color: "#D4A017", textTransform: "uppercase", margin: 0, letterSpacing: "0.5px" }}>Macalelon RPT</h1>
        <p style={{ fontSize: "11px", color: "rgba(255,255,255,0.7)", margin: "4px 0 0 0" }}>Treasury Operations</p>
      </div>

      {/* 🌟 NAVIGATION LINKS */}
      <div style={{ padding: "16px 12px", flex: 1, overflowY: "auto" }}>
        {sections.map(sec => (
          <div key={sec.label} style={{ marginBottom: "20px" }}>
            <div style={{ fontSize: "10px", letterSpacing: "0.1em", textTransform: "uppercase", color: "rgba(255,255,255,0.5)", padding: "0 12px", marginBottom: "8px", fontWeight: "bold" }}>{sec.label}</div>
            {sec.items.map(item => {
              const isActive = active === item.id;
              return (
                <button key={item.id} onClick={()=>setActive(item.id)} style={{
                  display: "flex", alignItems: "center", gap: "10px", width: "100%", padding: "10px 12px", borderRadius: "8px", border: "none", cursor: "pointer", fontSize: "13px", fontWeight: 600, marginBottom: "4px", transition: "all 0.2s",
                  backgroundColor: isActive ? "#D4A017" : "transparent",
                  color: isActive ? "#fff" : "rgba(255,255,255,0.8)",
                  boxShadow: isActive ? "0 2px 5px rgba(212,168,67,0.3)" : "none"
                }}>
                  <span style={{ fontSize: "16px", width: "22px", textAlign: "center", opacity: isActive ? 1 : 0.7 }}>{item.icon}</span>
                  {item.label}
                  {item.badge && <span style={{ marginLeft: "auto", background: "#DC2626", color: "#fff", fontSize: "10px", fontWeight: "bold", padding: "2px 7px", borderRadius: "20px" }}>{item.badge}</span>}
                </button>
              );
            })}
          </div>
        ))}
      </div>

      {/* 🌟 FOOTER & LOGOUT */}
      <div style={{ padding: "16px", borderTop: "1px solid rgba(255,255,255,0.1)" }}>
        <div onClick={() => { if(window.confirm("Are you sure you want to sign out?")) onLogout(); }} style={{ display: "flex", alignItems: "center", gap: "10px", padding: "10px", borderRadius: "8px", background: "rgba(0,0,0,0.2)", cursor: "pointer", border: "1px solid rgba(255,255,255,0.05)", transition: "all 0.2s" }}>
          <div style={{ width: "32px", height: "32px", borderRadius: "50%", background: "#D4A017", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "12px", fontWeight: "bold", color: "#1E3A5F", flexShrink: 0 }}>{initials}</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: "12px", fontWeight: "bold", color: "#fff", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{profile?.full_name||"User"}</div>
            <div style={{ fontSize: "10px", color: "#D4A017", textTransform: "uppercase" }}>{profile?.role||"user"}</div>
          </div>
          <span style={{ color: "rgba(255,255,255,0.5)", fontSize: "14px" }}>⏻</span>
        </div>
      </div>
      
    </div>
  );
}
/* ═══════════════════════════════════════════════════════════
   DASHBOARD
═══════════════════════════════════════════════════════════ */
function Dashboard({ token }) {
  const [stats, setStats] = useState({ today:0, month:0, delinq:0, ytd:0, recent:[], chartData: [], methodData: [], barangayChartData: [] });
  const [loading, setLoading] = useState(true);
  const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  const PIE_COLORS = ['#3B82F6', '#10B981', '#F0C040', '#EF4444', '#8B949E', '#A855F7'];

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const d = today(), ms = d.slice(0,7)+"-01", ys = d.slice(0,4)+"-01-01";
        const [tc,mc,yc,dq,rc] = await Promise.all([
          db.select("collections",{filter:`payment_date=eq.${d}&is_voided=eq.false`,select:"total_paid"},token),
          db.select("collections",{filter:`payment_date=gte.${ms}&is_voided=eq.false`,select:"total_paid"},token),
          // Fetch YTD collections with barangay & method details
          db.select("collections",{filter:`payment_date=gte.${ys}&is_voided=eq.false`,select:"total_paid,payment_date,payment_method,properties(barangay)"},token),
          // Fetch unpaid delinquencies with barangay details
          db.select("delinquency", { filter: "status=eq.UNPAID", select: "property_id,total_due,properties(barangay)" }, token),
          // Fetch recent transactions (limit 50 to allow grouping by OR)
          db.select("collections",{select:"or_number,payment_date,total_paid,basic_tax,sef_tax,payment_method,taxpayers(lastname,firstname)",order:"created_at.desc",limit:50,filter:"is_voided=eq.false"},token),
        ]);
        
        const sum = a => a.reduce((s,c)=>s+(+c.total_paid||0),0);
        
        // --- CHART DATA AGGREGATION ---
        const monthlyTotals = Array(12).fill(0);
        const methodTotals = {};
        const barangayMap = {};

        // Process Collections
        (yc || []).forEach(c => {
          const amt = parseFloat(c.total_paid) || 0;
          
          // 1. Group by Month
          const monthIdx = new Date(c.payment_date).getMonth();
          if (!isNaN(monthIdx)) monthlyTotals[monthIdx] += amt;
          
          // 2. Group by Method
          const meth = c.payment_method || "OTHER";
          methodTotals[meth] = (methodTotals[meth] || 0) + amt;

          // 3. Group by Barangay (Collections)
          const bName = c.properties?.barangay?.toUpperCase() || "UNSPECIFIED";
          if (!barangayMap[bName]) barangayMap[bName] = { name: bName, Collections: 0, Delinquencies: 0 };
          barangayMap[bName].Collections += amt;
        });

        // Process Delinquencies
        (dq || []).forEach(d => {
          const amt = parseFloat(d.total_due) || 0;
          const bName = d.properties?.barangay?.toUpperCase() || "UNSPECIFIED";
          if (!barangayMap[bName]) barangayMap[bName] = { name: bName, Collections: 0, Delinquencies: 0 };
          barangayMap[bName].Delinquencies += amt;
        });

        // Format data for Recharts
        const chartData = MONTHS.map((m, i) => ({ name: m, Total: monthlyTotals[i] }));
        const methodData = Object.keys(methodTotals).map(k => ({ name: k, value: methodTotals[k] }));
        const barangayChartData = Object.values(barangayMap)
          .sort((a, b) => (b.Collections + b.Delinquencies) - (a.Collections + a.Delinquencies))
          .slice(0, 6); // Keep only the top 6 most active barangays

        // Process Recent Collections (Group by OR Number)
        const groupedRecent = Object.values((rc || []).reduce((acc, c) => {
          if (!acc[c.or_number]) { acc[c.or_number] = { ...c, total_paid: 0, basic_tax: 0, sef_tax: 0 }; }
          acc[c.or_number].total_paid += parseFloat(c.total_paid) || 0;
          acc[c.or_number].basic_tax += parseFloat(c.basic_tax) || 0;
          acc[c.or_number].sef_tax += parseFloat(c.sef_tax) || 0;
          return acc;
        }, {})).slice(0, 6); // Keep top 6 recent receipts

        setStats({ 
          today: sum(tc), 
          month: sum(mc), 
          ytd: sum(yc), 
          delinq: new Set((dq || []).filter(d => d.property_id).map(d => d.property_id)).size, 
          recent: groupedRecent,
          chartData, 
          methodData,
          barangayChartData
        });
      } catch(e) { console.error(e); }
      setLoading(false);
    })();
  }, [token]);

  if (loading) return <div className="loading-state"><span className="spin"/>Loading dashboard…</div>;

  return (
    <>
      <div className="topbar">
        <div className="topbar-left">
          <h1>Dashboard</h1>
          <p>MUNICIPALITY OF MACALELON · {new Date().toLocaleDateString("en-PH",{weekday:"long",year:"numeric",month:"long",day:"numeric"})}</p>
        </div>
      </div>

      {/* TOP STAT CARDS */}
      <div className="stat-row">
        {[
          { label:"Today's Collections", value:stats.today,  color:"gold",  icon:"💰", isCur:true,  delta:"Real-time" },
          { label:"Month to Date",       value:stats.month,  color:"blue",  icon:"📈", isCur:true,  delta:"Current month" },
          { label:"YTD Collections",     value:stats.ytd,    color:"green", icon:"🏦", isCur:true,  delta:"Jan 1 – today" },
          { label:"Delinquent Accounts", value:stats.delinq, color:"red",   icon:"⚠️", isCur:false, delta:"Unpaid accounts" },
        ].map(s => (
          <div className="stat-card" key={s.label}>
            <div className={`stat-accent ${s.color}`}/>
            <div className={`stat-icon-bg ${s.color}`}>{s.icon}</div>
            <div className="stat-label">{s.label}</div>
            <div className={`stat-value ${s.isCur?"big-num":""}`}>
              <Counter value={s.value} isCurrency={s.isCur}/>
            </div>
            <div className="stat-delta">{s.delta}</div>
          </div>
        ))}
      </div>

      <div className="page-body">
        <div className="col-8-4">
          
          {/* LEFT COLUMN (WIDER - FOR BIG CHARTS) */}
          <div style={{display:"flex",flexDirection:"column",gap:16}}>
            
            {/* MONTHLY TREND BAR CHART */}
            <div className="card">
              <div className="card-header"><div className="card-title">Monthly Collection Trend (FY {new Date().getFullYear()})</div></div>
              <div className="card-body" style={{ height: "260px", paddingTop: "30px" }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={stats.chartData}>
                    <XAxis dataKey="name" stroke="#6E7681" fontSize={11} tickLine={false} axisLine={false} />
                    <Tooltip 
                      cursor={{fill: 'rgba(255,255,255,0.05)'}} 
                      contentStyle={{backgroundColor: '#1C2333', borderColor: '#3B82F6', borderRadius: '8px', color: '#fff'}} 
                      formatter={(value) => [`₱${value.toLocaleString(undefined, {minimumFractionDigits: 2})}`, 'Collected']}
                    />
                    <Bar dataKey="Total" fill="url(#colorBlue)" radius={[4, 4, 0, 0]} />
                    <defs>
                      <linearGradient id="colorBlue" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3B82F6" stopOpacity={1}/>
                        <stop offset="95%" stopColor="#2563EB" stopOpacity={0.6}/>
                      </linearGradient>
                    </defs>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* BARANGAY PERFORMANCE MATRIX */}
            <div className="card">
              <div className="card-header">
                <div>
                  <div className="card-title">Barangay Performance Matrix</div>
                  <div className="card-sub">Comparing collections vs. outstanding delinquencies</div>
                </div>
              </div>
              <div className="card-body" style={{ height: "260px", paddingTop: "20px" }}>
                {stats.barangayChartData.length === 0 ? (
                  <div className="empty-text" style={{textAlign:"center", marginTop:"80px"}}>No barangay data available</div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={stats.barangayChartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                      <XAxis dataKey="name" stroke="#6E7681" fontSize={10} tickLine={false} />
                      <Tooltip 
                        contentStyle={{ backgroundColor: '#1C2333', borderColor: 'var(--border2)', borderRadius: '8px', color: '#fff' }}
                        formatter={(value) => [`₱${Number(value).toLocaleString(undefined, {minimumFractionDigits: 2})}`]}
                      />
                      <Bar dataKey="Collections" fill="#3B82F6" radius={[4, 4, 0, 0]} name="Total Collected" />
                      <Bar dataKey="Delinquencies" fill="#EF4444" radius={[4, 4, 0, 0]} name="Unpaid Delinquency" />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>

          </div>

          {/* RIGHT COLUMN (NARROWER - FOR LISTS & DONUTS) */}
          <div style={{display:"flex",flexDirection:"column",gap:16}}>
            
            {/* PAYMENT METHODS DONUT CHART */}
            <div className="card">
              <div className="card-header"><div className="card-title">Payment Methods</div></div>
              <div className="card-body" style={{ height: "240px", display: "flex", flexDirection: "column", alignItems: "center" }}>
                {stats.methodData.length === 0 ? (
                   <div className="empty-text" style={{marginTop:"80px"}}>No data yet</div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={stats.methodData} innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value" stroke="none">
                        {stats.methodData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip 
                        contentStyle={{backgroundColor: '#1C2333', borderColor: 'var(--border2)', borderRadius: '8px', color: '#fff'}} 
                        formatter={(value) => [`₱${value.toLocaleString(undefined, {minimumFractionDigits: 2})}`, 'Total']}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                )}
                {/* Custom Legend */}
                <div style={{display: "flex", flexWrap: "wrap", gap: "12px", justifyContent: "center", marginTop: "-10px"}}>
                  {stats.methodData.map((entry, index) => (
                    <div key={entry.name} style={{display: "flex", alignItems: "center", gap: "4px", fontSize: "11px", color: "var(--text2)"}}>
                      <div style={{width: "10px", height: "10px", borderRadius: "50%", backgroundColor: PIE_COLORS[index % PIE_COLORS.length]}}></div>
                      {entry.name}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* RECENT COLLECTIONS TABLE */}
            <div className="card">
              <div className="card-header">
                <div><div className="card-title">Recent Collections</div><div className="card-sub">Latest transactions</div></div>
              </div>
              {stats.recent.length === 0
                ? <div className="empty"><div className="empty-icon">💳</div><div className="empty-text">No collections yet</div></div>
                : <div className="table-wrap">
                    <table>
                      <thead><tr><th>OR Number</th><th>Taxpayer</th><th>Total</th></tr></thead>
                      <tbody>
                        {stats.recent.map((c,i) => (
                          <tr key={i}>
                            <td><span className="badge badge-blue">{c.or_number}</span></td>
                            <td style={{fontWeight:600, fontSize: 12}}>{c.taxpayers?`${c.taxpayers.lastname}`:"—"}</td>
                            <td><span className="mono" style={{color:"var(--green2)",fontWeight:700}}>{fmt(c.total_paid)}</span></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
              }
            </div>

            {/* QUICK ACTIONS */}
            <div className="card">
              <div className="card-header"><div className="card-title">Quick Actions</div></div>
              <div className="card-body" style={{display:"flex",flexDirection:"column",gap:8}}>
                {[["💳","Post Payment"],["👥","Add Taxpayer"],["📋","Daily Report"]].map(([ic,label]) => (
                  <div key={label} style={{display:"flex",alignItems:"center",gap:10,padding:"10px 12px",borderRadius:9,background:"var(--bg3)",border:"1px solid var(--border)",cursor:"pointer",transition:"all .15s",fontSize:13,color:"var(--text2)"}}>
                    <span style={{fontSize:16}}>{ic}</span>{label}
                    <span style={{marginLeft:"auto",color:"var(--text3)"}}>→</span>
                  </div>
                ))}
              </div>
            </div>

          </div>

        </div>
      </div>
    </>
  );
}

/* ═══════════════════════════════════════════════════════════
   TAXPAYERS & PROPERTIES MODULE (WITH KPI COUNTERS)
═══════════════════════════════════════════════════════════ */
function Taxpayers({ token, profile }) {
  const [list,setList]   = useState([]);
  const [loading,setLoading] = useState(true);
  const [q,setQ]         = useState("");
  const [page,setPage]   = useState(0);
  const [sel,setSel]     = useState(null);
  const [props,setProps] = useState([]);
  const [showForm,setShowForm] = useState(false);
  const [saving,setSaving]     = useState(false);
  const [deleting,setDeleting] = useState(false);
  const [editId,setEditId]     = useState(null);
  const [form,setForm] = useState({ lastname:"",firstname:"",middlename:"",address:"",barangay:"",contact_no:"",email:"",tin:"" });
  const PER = 20;

  const [showPropForm, setShowPropForm] = useState(false);
  const [savingProp, setSavingProp] = useState(false);
  const [editPropId, setEditPropId] = useState(null); 
  const [propForm, setPropForm] = useState({ td_number: "", pin: "", classification: "Residential", barangay: "", assessed_value: "", container_code: "" });

  // 🌟 NEW: States to hold the live counts for the KPI Dashboard
  const [totals, setTotals] = useState({ taxpayers: 0, properties: 0 });

  // 🌟 THE OFFICIAL MACALELON BARANGAY LIST
  const barangays = [
    "AMONTAY", "ANOS", "BUYAO", "CALANTAS", "CANDANGAL", "LAHING", 
    "LUCTOB", "MABINI IBABA", "MABINI ILAYA", "MALABAHAY", "MAMBOG", 
    "OLONGTAO IBABA", "OLONGTAO ILAYA", "PADRE HERRERA", "PAJARILLO", 
    "PINAGBAYANAN", "SAN ISIDRO", "SAN JOSE", "SAN NICOLAS", "SAN VICENTE", 
    "TAGUIN", "TUBIGAN IBABA", "TUBIGAN ILAYA", "VISTA HERMOSA", 
    "CASTILLO (POB.)", "DAMAYAN (POB.)", "MASIPAG (POB.)", "PAG-ASA (POB.)", 
    "RIZAL (POB.)", "RODRIGUEZ (POB.)"
  ];

 // 🌟 FIXED: Added limit: 50000 to bypass the 1,000 row Supabase cap
  const loadTotals = useCallback(async () => {
    try {
      const tp = await db.select("taxpayers", { select: "id", limit: 50000 }, token);
      const pr = await db.select("properties", { select: "id", limit: 50000 }, token);
      setTotals({ taxpayers: tp?.length || 0, properties: pr?.length || 0 });
    } catch(e) { console.error("Error loading totals:", e); }
  }, [token]);

  const handleDelete = async () => {
    if (!sel) return;
    if (props.length > 0) {
      alert("Cannot delete this taxpayer because they have registered properties. Please delete their properties first.");
      return;
    }
    if (!window.confirm(`Are you sure you want to permanently delete ${sel.lastname}, ${sel.firstname}?`)) return;

    setDeleting(true);
    try {
      await db.delete("taxpayers", { filter: `id=eq.${sel.id}` }, token);
      setSel(null); 
      load();       
      loadTotals(); // 🌟 Update counters
    } catch (e) { alert("Failed to delete: " + e.message); }
    setDeleting(false);
  };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      let filterStr = "";

      if (q) {
        const matchedProps = await db.select("properties", { 
          filter: `or=(property_index_no.ilike.*${q}*,td_number.ilike.*${q}*)`, 
          select: "taxpayer_id" 
        }, token);
        
        const tpIdsFromProps = matchedProps.map(p => p.taxpayer_id).filter(id => id);

        let orConditions = [
          `lastname.ilike.*${q}*`,
          `firstname.ilike.*${q}*`,
          `taxpayer_code.ilike.*${q}*`
        ];

        if (tpIdsFromProps.length > 0) {
          orConditions.push(`id.in.(${tpIdsFromProps.join(',')})`);
        }

        filterStr = `or=(${orConditions.join(',')})`;
      }

      const data = await db.select("taxpayers",{
        filter: filterStr,
        order:"lastname.asc", limit:PER, offset:page*PER
      }, token);
      setList(data || []);
    } catch(e){console.error(e);}
    setLoading(false);
  },[token, q, page]);

  useEffect(()=>{ 
    load(); 
    loadTotals(); // 🌟 Load counters on initial mount
  },[load, loadTotals]);

  const selectTaxpayer = async t => {
    setSel(t);
    setShowPropForm(false); 
    setEditPropId(null);
    const p = await db.select("properties",{filter:`taxpayer_id=eq.${t.id}`},token);
    setProps(p);
  };

  const save = async () => {
    setSaving(true);
    try {
      const payload = {
        ...form,
        municipality: "MACALELON",
        province: "QUEZON"
      };

      if (editId) {
        await db.update("taxpayers", payload, { filter: `id=eq.${editId}` }, token);
      } else {
        const code = `TP-${new Date().getFullYear()}-${String(Date.now()).slice(-5)}`;
        await db.insert("taxpayers", { ...payload, taxpayer_code: code, created_by: profile?.id }, token);
      }
      setShowForm(false); setEditId(null);
      setForm({lastname:"",firstname:"",middlename:"",address:"",barangay:"",contact_no:"",email:"",tin:""});
      if (editId && sel && sel.id === editId) { setSel({ ...sel, ...payload }); }
      load();
      loadTotals(); // 🌟 Update counters
    } catch(e) { alert(e.message); }
    setSaving(false);
  };

  const saveProperty = async () => {
    if (!propForm.td_number || !propForm.pin || !propForm.assessed_value) {
      alert("TD Number, PIN, and Assessed Value are required."); return;
    }
    setSavingProp(true);
    try {
      const av = parseFloat(propForm.assessed_value);
      
      const payload = {
        td_number: propForm.td_number,
        property_index_no: propForm.pin, 
        classification: propForm.classification,
        barangay: propForm.barangay,
        assessed_value: av,
        container_code: propForm.container_code 
      };

      if (editPropId) {
        await db.update("properties", payload, { filter: `id=eq.${editPropId}` }, token);
      } else {
        payload.taxpayer_id = sel.id;
        await db.insert("properties", payload, token);
        
        const savedProp = await db.select("properties", { filter: `td_number=eq.${propForm.td_number}` }, token);
        
        if (savedProp && savedProp.length > 0) {
          const newPropId = savedProp[0].id;
          const tax = av * 0.01; 
          const currentYear = new Date().getFullYear();

          await db.insert("assessments", {
            property_id: newPropId,
            tax_year: currentYear,
            assessed_value: av,
            basic_tax: tax,
            sef_tax: tax
          }, token);
        }
      }
      
      const p = await db.select("properties",{filter:`taxpayer_id=eq.${sel.id}`},token);
      setProps(p);
      
      setShowPropForm(false);
      setEditPropId(null);
      setPropForm({ td_number: "", pin: "", classification: "Residential", barangay: "", assessed_value: "", container_code: "" });
      loadTotals(); // 🌟 Update counters
    } catch(e) { 
      if (e.message && e.message.includes("duplicate key")) {
        alert("Wait! This TD Number or PIN is already registered in the system. Please check the numbers and try again.");
      } else {
        alert("Failed to save property: " + e.message); 
      }
    }
    setSavingProp(false);
  };

  const handleDeleteProperty = async (p) => {
    if (!window.confirm(`Permanently delete property TD ${p.td_number}? Note: If this property has existing payment receipts, the database will block the deletion.`)) return;
    try {
      try { await db.delete("assessments", { filter: `property_id=eq.${p.id}` }, token); } catch(err) {}
      
      await db.delete("properties", { filter: `id=eq.${p.id}` }, token);      
      const refreshed = await db.select("properties",{filter:`taxpayer_id=eq.${sel.id}`},token);
      setProps(refreshed);
      loadTotals(); // 🌟 Update counters
    } catch (e) {
      alert("Cannot delete property. It likely has collections or delinquency records attached to it. Error: " + e.message);
    }
  };

  const fmt = (num) => {
    const n = parseFloat(num);
    return isNaN(n) ? "0.00" : n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const canEdit = ["admin","encoder","assessor","treasurer"].includes(profile?.role);

  return (
    <>
      <div className="topbar">
        <div className="topbar-left"><h1>Taxpayer & Property Registry</h1><p>PROPERTY OWNERS DATABASE</p></div>
        <div className="topbar-right">
          {canEdit && <button className="btn btn-gold" onClick={()=>setShowForm(!showForm)}>＋ Register Taxpayer</button>}
        </div>
      </div>

      {/* 🌟 NEW: LIVE KPI COUNTERS */}
      <div className="stat-row" style={{ gridTemplateColumns: "repeat(2, 1fr)", marginBottom: "20px" }}>
        <div className="stat-card">
          <div className="stat-accent blue" />
          <div className="stat-icon-bg blue">👥</div>
          <div className="stat-label">Total Registered Taxpayers</div>
          <div className="stat-value">{totals.taxpayers.toLocaleString()}</div> 
        </div>
        <div className="stat-card">
          <div className="stat-accent green" />
          <div className="stat-icon-bg green">🏠</div>
          <div className="stat-label">Total Encoded Properties</div>
          <div className="stat-value">{totals.properties.toLocaleString()}</div> 
        </div>
      </div>

      {showForm && (
        <div className="page-body" style={{paddingBottom:0}}>
          <div className="card">
            <div className="card-header">
              <div><div className="card-title">New Taxpayer Registration</div><div className="card-sub">All fields will be saved to the Supabase database</div></div>
              <button className="btn btn-ghost btn-sm" onClick={()=>setShowForm(false)}>✕ Close</button>
            </div>
            <div className="card-body">
              <div className="form-grid" style={{marginBottom:16}}>
                {[["lastname","Last Name"],["firstname","First Name"],["middlename","Middle Name"]].map(([k,l]) => (
                  <div className="form-group" key={k}>
                    <label className="form-label">{l}</label>
                    <input value={form[k]} onChange={e=>setForm(f=>({...f,[k]:e.target.value}))} />
                  </div>
                ))}
                
                <div className="form-group">
                  <label className="form-label">Barangay</label>
                  <select value={form.barangay} onChange={e=>setForm(f=>({...f, barangay: e.target.value}))}>
                    <option value="">— Select Barangay —</option>
                    {barangays.map(b => <option key={b} value={b}>{b}</option>)}
                  </select>
                </div>

                <div className="form-group" style={{gridColumn:"span 2"}}>
                  <label className="form-label">Complete Address</label>
                  <input value={form.address} onChange={e=>setForm(f=>({...f, address: e.target.value}))} />
                </div>

                {[["contact_no","Contact Number"],["email","Email Address"],["tin","TIN"]].map(([k,l]) => (
                  <div className="form-group" key={k}>
                    <label className="form-label">{l}</label>
                    <input value={form[k]} onChange={e=>setForm(f=>({...f,[k]:e.target.value}))} />
                  </div>
                ))}
              </div>
              <div className="gap-row">
                <button className="btn btn-success" onClick={save} disabled={saving}>{saving&&<><span className="spin"/>&nbsp;</>}Save Taxpayer</button>
                <button className="btn btn-outline" onClick={()=>{ setShowForm(false); setEditId(null); setForm({lastname:"",firstname:"",middlename:"",address:"",barangay:"",contact_no:"",email:"",tin:""}); }}>Cancel</button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="page-body">
        <div className="col-8-4">
          <div className="card">
            
            <div className="searchbar">
              <input 
                placeholder="Search by Name, Code, PIN, or TD No..." 
                value={q} 
                onChange={e => setQ(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') {
                    setPage(0);
                    load();
                  }
                }}
              />
              <button className="btn btn-outline btn-sm" onClick={() => { setPage(0); load(); }}>Search</button>
            </div>

            {loading
              ? <div className="loading-state"><span className="spin"/>Loading records…</div>
              : list.length===0
                ? <div className="empty"><div className="empty-icon">👥</div><div className="empty-text">No taxpayers matched your search.</div></div>
                : <div className="table-wrap"><table>
                    <thead><tr><th>Code</th><th>Full Name</th><th>Barangay</th><th>Contact</th><th>Status</th><th></th></tr></thead>
                    <tbody>
                      {list.map(t => (
                        <tr key={t.id} style={{cursor:"pointer", background: sel?.id === t.id ? "var(--bg3)" : "transparent"}} onClick={()=>selectTaxpayer(t)}>
                          <td><span className="mono-sm">{t.taxpayer_code}</span></td>
                          <td style={{fontWeight:600}}>{t.lastname}, {t.firstname}{t.middlename?" "+t.middlename[0]+".":""}</td>
                          <td style={{color:"var(--text3)"}}>{t.barangay||"—"}</td>
                          <td style={{color:"var(--text3)"}}>{t.contact_no||"—"}</td>
                          <td><span className="badge badge-green">Active</span></td>
                          <td><button className="btn btn-ghost btn-xs">View →</button></td>
                        </tr>
                      ))}
                    </tbody>
                  </table></div>
            }
            <div className="pagination">
              <span className="pg-info">Page {page+1}</span>
              <div className="pg-btns">
                <button className="pg-btn" onClick={()=>setPage(p=>Math.max(0,p-1))} disabled={page===0}>← Prev</button>
                <button className="pg-btn" onClick={()=>setPage(p=>p+1)} disabled={list.length<PER}>Next →</button>
              </div>
            </div>
          </div>

          <div>
          {sel ? (
              <div className="card">
                <div className="card-header">
                  <div><div className="card-title">{sel.lastname}, {sel.firstname}</div><div className="card-sub">{sel.taxpayer_code}</div></div>
                  <div style={{display: "flex", gap: "8px"}}>
                    {canEdit && (
                      <button className="btn btn-outline btn-sm" onClick={() => {
                        setForm({
                          lastname: sel.lastname || "", firstname: sel.firstname || "", middlename: sel.middlename || "",
                          address: sel.address || "", barangay: sel.barangay || "",
                          contact_no: sel.contact_no || "", email: sel.email || "", tin: sel.tin || ""
                        });
                        setEditId(sel.id);
                        setShowForm(true);
                      }}>✏️ Edit</button>
                    )}
                    {canEdit && (
                      <button className="btn btn-danger btn-sm" onClick={handleDelete} disabled={deleting}>
                        {deleting ? "Deleting..." : "🗑 Delete"}
                      </button>
                    )}
                  </div>
                </div>
                
                <div className="card-body">
                  <div className="detail-grid">
                    {[["Barangay",sel.barangay||"—"],["Address",sel.address||"—"],["Contact",sel.contact_no||"—"],["Email",sel.email||"—"],["TIN",sel.tin||"—"]].map(([k,v])=>(
                      <div className="drow" key={k}><span className="dk">{k}</span><span className="dv">{v}</span></div>
                    ))}
                  </div>
                  <div className="divider"/>
                  
                  <div style={{display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10}}>
                    <div style={{fontSize:12,color:"var(--text3)", fontWeight: "bold"}}>PROPERTIES ({props.length})</div>
                    {canEdit && (
                       <button className="btn btn-primary btn-xs" onClick={() => {
                         if (showPropForm && !editPropId) {
                           setShowPropForm(false);
                         } else {
                           setPropForm({ td_number: "", pin: "", classification: "Residential", barangay: "", assessed_value: "", container_code: "" });
                           setEditPropId(null);
                           setShowPropForm(true);
                         }
                       }}>
                         {showPropForm && !editPropId ? "Cancel" : "＋ Add Property"}
                       </button>
                    )}
                  </div>

                  {showPropForm && (
                    <div style={{background:"var(--bg3)",borderRadius:9,padding:"14px",marginBottom:12,border:"1px solid var(--blue)", borderLeft: "4px solid var(--blue)"}}>
                      <div style={{fontWeight: 600, fontSize: 13, marginBottom: 10}}>
                        {editPropId ? "Edit Property Details" : "Register New Property"}
                      </div>
                      
                      <div style={{display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginBottom: 8}}>
                        <div className="form-group">
                          <label className="form-label" style={{fontSize: 10}}>TD Number</label>
                          <input placeholder="e.g. 021-01-0001" value={propForm.td_number} onChange={e=>setPropForm({...propForm, td_number: e.target.value})} />
                        </div>
                        <div className="form-group">
                          <label className="form-label" style={{fontSize: 10}}>PIN</label>
                          <input placeholder="e.g. 021-01-0001-001" value={propForm.pin} onChange={e=>setPropForm({...propForm, pin: e.target.value})} />
                        </div>
                      </div>

                      <div style={{display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginBottom: 8}}>
                        <div className="form-group">
                           <label className="form-label" style={{fontSize: 10}}>Classification</label>
                           <select value={propForm.classification} onChange={e=>setPropForm({...propForm, classification: e.target.value})}>
                              <option>Residential</option>
                              <option>Agricultural</option>
                              <option>Commercial</option>
                              <option>Industrial</option>
                           </select>
                        </div>
                        <div className="form-group">
                          <label className="form-label" style={{fontSize: 10}}>RPTAR Box / Locator</label>
                          <input placeholder="e.g. BOX-42" value={propForm.container_code} onChange={e=>setPropForm({...propForm, container_code: e.target.value})} />
                        </div>
                      </div>

                      <div className="form-group" style={{marginBottom: 8}}>
                        <label className="form-label" style={{fontSize: 10}}>Property Barangay</label>
                        <select value={propForm.barangay} onChange={e=>setPropForm({...propForm, barangay: e.target.value})}>
                          <option value="">— Select Barangay —</option>
                          {barangays.map(b => <option key={b} value={b}>{b}</option>)}
                        </select>
                      </div>

                      <div className="form-group" style={{marginBottom: 12}}>
                        <label className="form-label" style={{fontSize: 10}}>Assessed Value (₱)</label>
                        <input type="number" placeholder="e.g. 150000" value={propForm.assessed_value} onChange={e=>setPropForm({...propForm, assessed_value: e.target.value})} />
                      </div>
                      
                      <div style={{display: "flex", gap: "8px"}}>
                        <button className="btn btn-success btn-sm" style={{flex: 1}} onClick={saveProperty} disabled={savingProp}>
                          {savingProp ? "Saving..." : "💾 Save"}
                        </button>
                        <button className="btn btn-outline btn-sm" onClick={() => { setShowPropForm(false); setEditPropId(null); }}>
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}

                  {props.length===0 && !showPropForm
                    ? <div style={{fontSize:12,color:"var(--text3)"}}>No properties registered.</div>
                    : props.map(p=>(
                        <div key={p.id} style={{background:"var(--bg3)",borderRadius:9,padding:"10px 14px",marginBottom:8,border:"1px solid var(--border)"}}>
                          <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
                            <div>
                              <div style={{fontWeight:600,fontSize:13}}>TD: {p.td_number}</div>
                              <div style={{fontSize:11,color:"var(--blue2)",fontFamily:"var(--font-mono)",marginTop:2, fontWeight: "bold"}}>PIN: {p.property_index_no || "—"}</div>
                              <div style={{fontSize:11,color:"var(--gold2)",fontFamily:"var(--font-mono)",marginTop:2, fontWeight: "bold"}}>🗄️ LOCATOR: {p.container_code || "Unassigned"}</div>
                              <div style={{fontSize:11,color:"var(--text3)",fontFamily:"var(--font-mono)",marginTop:2}}>{p.classification} · {p.barangay||"—"}</div>
                            </div>
                            <div style={{textAlign:"right"}}>
                              <div className="amount-lg" style={{fontSize:14}}>{fmt(p.assessed_value)}</div>
                              <div style={{fontSize:10,color:"var(--text3)",fontFamily:"var(--font-mono)", marginBottom: "8px"}}>ASSESSED VALUE</div>
                              
                              {canEdit && (
                                <div style={{display: "flex", gap: "4px", justifyContent: "flex-end"}}>
                                  <button className="btn btn-ghost btn-xs" style={{color: "var(--blue)"}} onClick={() => {
                                    setPropForm({
                                      td_number: p.td_number || "",
                                      pin: p.property_index_no || "",
                                      classification: p.classification || "Residential",
                                      barangay: p.barangay || "",
                                      assessed_value: p.assessed_value || "",
                                      container_code: p.container_code || ""
                                    });
                                    setEditPropId(p.id);
                                    setShowPropForm(true);
                                  }}>✏️ Edit</button>
                                  
                                  <button className="btn btn-ghost btn-xs" style={{color: "var(--red2)"}} onClick={() => handleDeleteProperty(p)}>✕ Del</button>
                                </div>
                              )}

                            </div>
                          </div>
                        </div>
                      ))
                  }
                </div>
              </div>
            ) : (
              <div className="card" style={{height:"100%",minHeight:200}}>
                <div className="empty"><div className="empty-icon">👆</div><div className="empty-text">Select a taxpayer to view details</div></div>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
/* ═══════════════════════════════════════════════════════════
   ASSESSMENTS (WITH DYNAMIC LIVE SEARCH & AUTO-SELECT)
═══════════════════════════════════════════════════════════ */
function Assessments({ token, profile }) {
  const [list, setList] = useState([]);
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [saving, setSaving] = useState(false);
  
  // 🌟 DYNAMIC SEARCH STATE (Replaces 'q')
  const [searchTerm, setSearchTerm] = useState(""); 
  
  const [propSearch, setPropSearch] = useState("");
  const [historyId, setHistoryId] = useState(null);
  const [editId, setEditId] = useState(null);
  const [editForm, setEditForm] = useState({ tax_year: "", assessed_value: "" });

  const [form, setForm] = useState({
    property_id: "", tax_year: String(new Date().getFullYear() + 1), assessed_value: ""
  });

  // 🌟 MODIFIED LOAD FUNCTION: Fetches all records once for instant client-side filtering
  const load = useCallback(async () => {
    setLoading(true);
    try {
      const d = await db.select("assessments", {
        select: "*,properties(td_number,property_index_no,classification,taxpayers(lastname,firstname))",
        order: "tax_year.desc"
      }, token);
      setList(d || []);
    } catch(e) { console.error(e); }
    setLoading(false);
  }, [token]);

  const loadProperties = async () => {
    try {
      const p = await db.select("properties", { select: "id,td_number,property_index_no,taxpayers(lastname,firstname)", order: "td_number.asc" }, token);
      setProperties(p || []);
    } catch(e) { console.error(e); }
  };

  useEffect(() => { load(); }, [load]);

  const computedBasic = (parseFloat(form.assessed_value) || 0) * 0.01;
  const computedSef = (parseFloat(form.assessed_value) || 0) * 0.01;
  const computedTotal = computedBasic + computedSef;

  const handleSaveRevision = async (e) => {
    e.preventDefault();
    if (!form.property_id || !form.assessed_value || !form.tax_year) { alert("Please fill in all required fields."); return; }
    setSaving(true);
    try {
      const av = parseFloat(form.assessed_value);
      await db.insert("assessments", [{ property_id: parseInt(form.property_id), tax_year: parseInt(form.tax_year), assessed_value: av, basic_tax: computedBasic, sef_tax: computedSef, status: "ACTIVE" }], token);
      await db.update("properties", { assessed_value: av }, { filter: `id=eq.${form.property_id}` }, token);
      setForm({ property_id: "", tax_year: String(new Date().getFullYear() + 1), assessed_value: "" });
      setShowAdd(false); load();
    } catch (e) { alert("Error saving revision: " + e.message); }
    setSaving(false);
  };

  const handleDelete = async (id, td) => {
    if(!window.confirm(`Delete assessment for TD ${td}?`)) return;
    try {
      await db.delete("assessments", { filter: `id=eq.${id}` }, token);
      if (historyId && list.filter(a => a.property_id === historyId).length <= 1) setHistoryId(null);
    } catch(e) { alert(e.message); }
  };

  const saveInlineEdit = async (historyRecord) => {
    if (!editForm.tax_year || !editForm.assessed_value) { alert("Tax year and Assessed Value cannot be empty."); return; }
    setSaving(true);
    try {
      const av = parseFloat(editForm.assessed_value); const ty = parseInt(editForm.tax_year);
      const basic = av * 0.01; const sef = av * 0.01;
      await db.update("assessments", { tax_year: ty, assessed_value: av, basic_tax: basic, sef_tax: sef }, { filter: `id=eq.${historyRecord.id}` }, token);
      const isLatest = historyRecord.id === historyData[0].id || ty >= historyData[0].tax_year;
      if (isLatest) await db.update("properties", { assessed_value: av }, { filter: `id=eq.${historyRecord.property_id}` }, token);
      setEditId(null); load();
    } catch (e) { alert("Error updating assessment: " + e.message); }
    setSaving(false);
  };

  const historyData = historyId ? list.filter(a => a.property_id === historyId) : [];
  
  // 🌟 DYNAMIC FILTERING LOGIC
  const uniqueList = list.filter((item, index, self) => index === self.findIndex((t) => t.property_id === item.property_id));
  
  const filteredList = uniqueList.filter(a => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    const taxpayer = a.properties?.taxpayers ? `${a.properties.taxpayers.lastname} ${a.properties.taxpayers.firstname}`.toLowerCase() : "";
    return (
      (a.properties?.property_index_no || "").toLowerCase().includes(term) ||
      (a.properties?.td_number || "").toLowerCase().includes(term) ||
      taxpayer.includes(term)
    );
  });

  const handlePropSearch = (val) => {
    setPropSearch(val);
    const cleanVal = val.trim().toLowerCase();
    if (cleanVal.length > 0) {
      const exactMatch = properties.find(p =>
        (p.property_index_no && p.property_index_no.toLowerCase() === cleanVal) ||
        (p.td_number && p.td_number.toLowerCase() === cleanVal)
      );
      if (exactMatch) {
        setForm(f => ({ ...f, property_id: exactMatch.id }));
      }
    }
  };

  const filteredProps = properties.filter(p => {
    if (!propSearch) return true;
    const term = propSearch.toLowerCase();
    return (
      (p.property_index_no || "").toLowerCase().includes(term) ||
      (p.td_number || "").toLowerCase().includes(term) ||
      (p.taxpayers?.lastname || "").toLowerCase().includes(term) ||
      (p.taxpayers?.firstname || "").toLowerCase().includes(term)
    );
  });

  return (
    <>
      <div className="topbar">
        <div className="topbar-left"><h1>Assessment Roll</h1><p>Determine property values, handle revisions, and compute standard RPT dues.</p></div>
        <div className="topbar-right">
          {["admin","assessor"].includes(profile?.role) && <button className="btn btn-primary" onClick={() => { setShowAdd(!showAdd); loadProperties(); }}>{showAdd ? "Cancel" : "📝 Add Revision"}</button>}
        </div>
      </div>

      <div className="page-body">
        {showAdd && (
          <div className="panel" style={{ marginBottom: 16, borderTop: "4px solid var(--blue)" }}>
            <div className="panel-title">Add Assessment Revision</div>
            <form onSubmit={handleSaveRevision}>
              <div className="form-grid" style={{ marginBottom: 20 }}>
                <div className="form-group span2">
                  <label className="form-label">Search & Select Target Property</label>
                  <input
                    type="text"
                    placeholder="🔍 Type Exact PIN or TD No. to auto-select..."
                    value={propSearch}
                    onChange={e => handlePropSearch(e.target.value)}
                    style={{ marginBottom: "6px", borderColor: "var(--blue)", fontWeight: "bold" }}
                  />
                  <select
                    value={form.property_id}
                    onChange={e => setForm({...form, property_id: e.target.value})}
                    size={propSearch && !form.property_id ? 5 : undefined}
                    required
                    style={{ width: "100%", background: form.property_id ? "var(--bg3)" : "inherit" }}
                  >
                    <option value="">— Select Registered Property —</option>
                    {filteredProps.map(p => (
                      <option key={p.id} value={p.id}>
                        PIN: {p.property_index_no || "—"} | TD: {p.td_number} | Owner: {p.taxpayers?.lastname}, {p.taxpayers?.firstname}
                      </option>
                    ))}
                  </select>
                  {propSearch && filteredProps.length === 0 && (
                    <div style={{ fontSize: "11px", color: "var(--red)", marginTop: "4px" }}>No properties found matching "{propSearch}"</div>
                  )}
                </div>

                <div className="form-group"><label className="form-label">Tax Year</label><input type="number" value={form.tax_year} onChange={e => setForm({...form, tax_year: e.target.value})} required/></div>
                <div className="form-group"><label className="form-label">Assessed Value (₱)</label><input type="number" step="0.01" value={form.assessed_value} onChange={e => setForm({...form, assessed_value: e.target.value})} required placeholder="e.g. 150000"/></div>
              </div>
              <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? "Saving..." : "💾 Save Revision"}</button>
            </form>
          </div>
        )}

{historyId && historyData.length > 0 && (
          <div className="card" style={{ marginBottom: 20, borderTop: "4px solid var(--gold)" }}>
            
            {/* 🌟 UPDATED TIMELINE HEADER WITH ADD REVISION BUTTON */}
            <div className="card-header" style={{ background: "var(--bg2)", display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <div>
                <div className="card-title">Revision History Timeline</div>
                <div className="card-sub" style={{ color: "var(--text2)", marginTop: 4 }}>
                  <strong>TD No:</strong> {historyData[0]?.properties?.td_number} &nbsp;|&nbsp; 
                  <strong>Taxpayer:</strong> {historyData[0]?.properties?.taxpayers?.lastname}, {historyData[0]?.properties?.taxpayers?.firstname}
                </div>
              </div>
              <div style={{ display: "flex", gap: "8px" }}>
                {["admin","assessor"].includes(profile?.role) && (
                  <button 
                    className="btn btn-primary btn-sm" 
                    onClick={() => { 
                      setShowAdd(true); 
                      loadProperties(); 
                      setForm(f => ({ ...f, property_id: historyId })); // Pre-selects the property
                      window.scrollTo({ top: 0, behavior: 'smooth' });  // Scrolls up to the form
                    }}
                  >
                    📝 Add Revision
                  </button>
                )}
                <button className="btn btn-outline btn-sm" onClick={() => { setHistoryId(null); setEditId(null); }}>✕ Close</button>
              </div>
            </div>

            <div className="table-wrap">
              <table>
                <thead><tr><th>Tax Year</th><th>Assessed Value</th><th>Basic Tax</th><th>SEF Tax</th><th style={{textAlign: "right"}}>Actions</th></tr></thead>
                <tbody>
                  {historyData.map((h, index) => {
                    const isEditing = editId === h.id;
                    return isEditing ? (
                      <tr key={h.id} style={{ background: "rgba(59, 130, 246, 0.1)" }}>
                        <td><input type="number" value={editForm.tax_year} onChange={e => setEditForm({...editForm, tax_year: e.target.value})} style={{ width: "80px", padding: "6px" }} /></td>
                        <td><input type="number" step="0.01" value={editForm.assessed_value} onChange={e => setEditForm({...editForm, assessed_value: e.target.value})} style={{ width: "120px", padding: "6px" }} /></td>
                        <td colSpan="2" style={{ fontSize: 11, color: "var(--text3)", verticalAlign: "middle" }}><i>Will auto-compute.</i></td>
                        <td style={{textAlign: "right"}}>
                          <button className="btn btn-success btn-xs" style={{marginRight: "6px"}} onClick={() => saveInlineEdit(h)} disabled={saving}>💾 Save</button>
                          <button className="btn btn-ghost btn-xs" onClick={() => setEditId(null)}>Cancel</button>
                        </td>
                      </tr>
                    ) : (
                      <tr key={h.id} style={{ background: index === 0 ? "rgba(59, 130, 246, 0.05)" : "transparent" }}>
                        <td><span className="chip" style={index === 0 ? { background: "var(--blue)", color: "white", borderColor: "var(--blue)" } : {}}>{h.tax_year} {index === 0 && "(Latest)"}</span></td>
                        <td><span className="mono" style={index === 0 ? {fontWeight: "bold"} : {}}>{fmt(h.assessed_value)}</span></td>
                        <td><span className="mono" style={{color: "var(--text2)"}}>{fmt(h.basic_tax)}</span></td>
                        <td><span className="mono" style={{color: "var(--text2)"}}>{fmt(h.sef_tax)}</span></td>
                        <td style={{textAlign: "right"}}>
                          {["admin","assessor"].includes(profile?.role) && (
                            <>
                              <button className="btn btn-ghost btn-xs" style={{color: "var(--blue2)", marginRight: "8px"}} onClick={() => { setEditId(h.id); setEditForm({ tax_year: h.tax_year, assessed_value: h.assessed_value }); }}>✏️ Edit</button>
                              <button className="btn btn-ghost btn-xs" style={{color: "var(--red2)"}} onClick={() => handleDelete(h.id, h.properties?.td_number)}>✕ Delete</button>
                            </>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        <div className="card">
          {/* 🌟 Dynamic Account Count */}
          <div className="card-header"><div className="card-title">Property Accounts Ledger</div><span className="chip">{filteredList.length} properties</span></div>

          {/* 🌟 DYNAMIC SEARCH BAR */}
          <div className="searchbar" style={{ padding: "16px", borderBottom: "1px solid var(--border)", background: "var(--bg2)", display: "flex", gap: "10px" }}>
            <input
              placeholder="Type Taxpayer Name, Code, PIN, or TD No..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)} // Filters instantly as you type
              style={{ flex: 1 }}
            />
            {searchTerm && (
              <button className="btn btn-outline" onClick={() => setSearchTerm("")}>✕ Clear</button>
            )}
          </div>

          {loading ? (
            <div className="loading-state"><span className="spin"/>Loading accounts…</div>
          ) : filteredList.length === 0 ? (
            <div className="empty"><div className="empty-icon">⬡</div><div className="empty-text">No property accounts matched your search.</div></div>
          ) : (
            <div className="table-wrap">
              <table>
                <thead><tr><th>TD No. / PIN</th><th>Taxpayer</th><th>Latest Tax Year</th><th>Current Assessed Value</th><th>Current Total Tax</th><th style={{textAlign: "right"}}>Actions</th></tr></thead>
                <tbody>
                  {/* 🌟 Maps through the live filtered list instead of uniqueList */}
                  {filteredList.map(a => (
                    <tr key={a.property_id} style={historyId === a.property_id ? {background: "var(--bg3)"} : {}}>
                      <td>
                        <span className="badge badge-blue">{a.properties?.td_number || "—"}</span>
                        <div style={{fontSize: 10, color: "var(--blue2)", marginTop: 4, fontWeight: "bold"}}>PIN: {a.properties?.property_index_no || "—"}</div>
                      </td>
                      <td style={{fontWeight:600}}>{a.properties?.taxpayers ? `${a.properties.taxpayers.lastname}, ${a.properties.taxpayers.firstname}` : "—"}</td>
                      <td><span className="chip">{a.tax_year}</span></td>
                      <td><span className="mono">{fmt(a.assessed_value)}</span></td>
                      <td><span className="mono" style={{fontWeight: 700, color: "var(--green2)"}}>{fmt((parseFloat(a.basic_tax)||0) + (parseFloat(a.sef_tax)||0))}</span></td>
                      <td style={{textAlign: "right"}}>
                        <button className="btn btn-ghost btn-xs" style={{marginRight: "8px", color: "var(--blue2)", fontWeight: "bold"}} onClick={() => { setHistoryId(a.property_id); setEditId(null); window.scrollTo(0, 0); }}>🕒 Timeline History</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
/* ═══════════════════════════════════════════════════════════
   COLLECTION (REACT.FRAGMENT CRASH FIXED + 15% DISCOUNT)
═══════════════════════════════════════════════════════════ */
function Collection({ token, profile }) {
  const [step,setStep]       = useState(1);
  const [q,setQ]             = useState("");
  const [found,setFound]     = useState(null);
  const [propList,setPropList] = useState([]);
  const [selProp,setSelProp] = useState(null);
  const [asmt,setAsmt]       = useState(null);
  const [selectedProps, setSelectedProps] = useState([]);
  const [multiPropData, setMultiPropData] = useState([]);
  const [asmtHistory, setAsmtHistory] = useState([]); 
  const [paidYears, setPaidYears] = useState([]);
  
  const [firstUnpaidYear, setFirstUnpaidYear] = useState(new Date().getFullYear());
  
  const [fromYear,setFromYear] = useState(String(new Date().getFullYear()));
  const [toYear,setToYear]     = useState(String(new Date().getFullYear()));
  const [method,setMethod]   = useState("CASH");
  const [fromQuarter, setFromQuarter] = useState("1");
  const [toQuarter, setToQuarter] = useState("4");
  
  const [orNumber, setOrNumber] = useState(""); 
  const [paidBy, setPaidBy] = useState(""); 
  const [checkNo,setCheckNo] = useState("");
  const [posting,setPosting] = useState(false);
  const [issued,setIssued]   = useState(null);
  const [err,setErr]         = useState("");
  const [paymentDate, setPaymentDate] = useState(today());
  const rd = (num) => Math.floor((parseFloat(num) || 0) * 100 + 0.0001) / 100;

  const search = async () => {
    setErr("");
    try {
      let tp = [];
      const cleanQ = q.trim();
      
      const exactPin = await db.select("properties", { filter: `property_index_no=eq.${cleanQ}`, select: "taxpayer_id", limit: 1 }, token);
      if (exactPin.length) {
        tp = await db.select("taxpayers", { filter: `id=eq.${exactPin[0].taxpayer_id}`, limit: 1 }, token);
      }

      if (!tp.length) {
        const exactTd = await db.select("properties", { filter: `td_number=eq.${cleanQ}`, select: "taxpayer_id", limit: 1 }, token);
        if (exactTd.length) {
          tp = await db.select("taxpayers", { filter: `id=eq.${exactTd[0].taxpayer_id}`, limit: 1 }, token);
        }
      }

      if (!tp.length) {
        tp = await db.select("taxpayers", { filter: `or=(lastname.ilike.*${cleanQ}*,taxpayer_code.ilike.*${cleanQ}*)`, limit: 1 }, token);
      }

      if (!tp.length) {
        const propMatch = await db.select("properties", { filter: `or=(property_index_no.ilike.*${cleanQ}*,td_number.ilike.*${cleanQ}*)`, select: "taxpayer_id", limit: 1 }, token);
        if (propMatch.length) {
          tp = await db.select("taxpayers", { filter: `id=eq.${propMatch[0].taxpayer_id}`, limit: 1 }, token);
        }
      }

      if (!tp.length) { setErr("Taxpayer or Property not found. Please check the spelling, PIN, or TD Number."); return; }
      
      setFound(tp[0]);
      setPaidBy(`${tp[0].firstname} ${tp[0].lastname}`); 
      const ps = await db.select("properties",{filter:`taxpayer_id=eq.${tp[0].id}`},token);
      setPropList(ps); setStep(2);
    } catch(e){ setErr(e.message); }
  };

  const toggleProp = (p) => {
    if (selectedProps.find(x => x.id === p.id)) {
      setSelectedProps(selectedProps.filter(x => x.id !== p.id));
    } else {
      setSelectedProps([...selectedProps, p]);
    }
  };

  const proceedWithSelected = async () => {
    if (selectedProps.length === 0) return;
    setErr(""); 
    try {
      let globalMinYear = new Date().getFullYear();
      let enrichedProps = [];

      for (const p of selectedProps) {
        const history = await db.select("assessments", { filter: `property_id=eq.${p.id}`, order: "tax_year.desc" }, token);
        const payments = await db.select("collections", { filter: `property_id=eq.${p.id}&is_voided=eq.false` }, token);
        const yearsPaid = payments ? payments.map(pay => parseInt(pay.tax_year)) : [];
        const delinqRecords = await db.select("delinquency", { filter: `property_id=eq.${p.id}&status=eq.UNPAID` }, token);
        
        let startingYear = new Date().getFullYear(); 
        if (delinqRecords && delinqRecords.length > 0) startingYear = Math.min(...delinqRecords.map(d => parseInt(d.tax_year)));
        if (startingYear < globalMinYear) globalMinYear = startingYear;

        enrichedProps.push({ prop: p, history: history || [], paidYears: yearsPaid });
      }
      
      setMultiPropData(enrichedProps);
      setFirstUnpaidYear(globalMinYear);
      setFromYear(String(globalMinYear));
      setToYear(String(Math.max(globalMinYear, new Date().getFullYear()))); 
      setStep(3);
    } catch(e) { setErr("Failed to load property data: " + e.message); }
  };

  const payDateObj = new Date(paymentDate || today());
  const currentYear = payDateObj.getFullYear();
  const currentMonth = payDateObj.getMonth() + 1;

  let start = parseInt(fromYear) || currentYear;
  let end = parseInt(toYear) || currentYear;
  if (start > end) { let temp = start; start = end; end = temp; }

  let displayCart = []; 
  let dbCart = [];      
  let tBasic = 0, tSef = 0, tPen = 0, tDisc = 0, gTotal = 0;

  for (let y = start; y <= end; y++) {
    let yearBasic = 0, yearSef = 0, yearPen = 0, yearDisc = 0;
    let allPaidThisYear = true;
    
    let startQ = (y === start) ? parseInt(fromQuarter) : 1;
    let endQ = (y === end) ? parseInt(toQuarter) : 4;
    if (y === start && y === end && startQ > endQ) { let temp = startQ; startQ = endQ; endQ = temp; }
    
    const qCount = (endQ - startQ) + 1;
    const qLabel = qCount === 4 ? "FULL" : (startQ === endQ ? `Q${startQ}` : `Q${startQ}-Q${endQ}`);
    const displayLabel = qCount === 4 ? y : `${y} (${qLabel})`;

    let quartersToPay = [];
    for (let q = startQ; q <= endQ; q++) quartersToPay.push(q);

    for (const mp of multiPropData) {
      if (mp.paidYears.includes(y)) continue; 
      allPaidThisYear = false;

      const activeAsmt = mp.history.find(a => parseInt(a.tax_year) <= y);
      const basicTax = activeAsmt ? parseFloat(activeAsmt.basic_tax) : rd(parseFloat(mp.prop.assessed_value) * 0.01);
      const sefTax   = activeAsmt ? parseFloat(activeAsmt.sef_tax)   : rd(parseFloat(mp.prop.assessed_value) * 0.01);

      const qBaseBasic = rd(basicTax / 4);
      const qBaseSef = rd(sefTax / 4);
      const getQBasic = (q) => q === 4 ? rd(basicTax - (qBaseBasic * 3)) : qBaseBasic;
      const getQSef   = (q) => q === 4 ? rd(sefTax - (qBaseSef * 3)) : qBaseSef;
      const getQDue   = (q) => rd(getQBasic(q) + getQSef(q));

      let rowBasic = 0, rowSef = 0;
      
      // 🌟 YOUR EXACT FIXED DISCOUNT LOGIC 🌟
      let rawDisc = 0;
      let rawPen = 0;
      
      if (y > currentYear) {
        quartersToPay.forEach(q => {
          rowBasic += getQBasic(q); rowSef += getQSef(q);
          if (currentMonth <= 9) rawDisc += getQDue(q) * 0.15; 
          else rawDisc += getQDue(q) * 0.10; 
        });
      } else if (y < currentYear) {
        const mosLate = ((currentYear - y) * 12) + currentMonth;
        let penaltyRate = (y <= 1991) ? Math.min(mosLate * 0.02, 0.24) : Math.min(mosLate * 0.02, 0.72);
        quartersToPay.forEach(q => {
          rowBasic += getQBasic(q); rowSef += getQSef(q);
          rawPen += getQDue(q) * penaltyRate;
        });
      } else {
        quartersToPay.forEach(q => {
          rowBasic += getQBasic(q); rowSef += getQSef(q);
          const dueMo = q * 3;
          if (currentMonth <= dueMo) rawDisc += getQDue(q) * 0.10;
          else rawPen += getQDue(q) * Math.min(currentMonth * 0.02, 0.72);
        });
      }

      rowBasic = rd(rowBasic); rowSef = rd(rowSef);
      let rowPen = rd(rawPen); let rowDisc = rd(rawDisc);
      const rowTot = rd(rowBasic + rowSef - rowDisc + rowPen);

      yearBasic += rowBasic; yearSef += rowSef; yearPen += rowPen; yearDisc += rowDisc;

      dbCart.push({ property_id: mp.prop.id, assessment_id: activeAsmt?.id, year: y, quarterTag: qLabel, basic: rowBasic, sef: rowSef, pen: rowPen, disc: rowDisc, total: rowTot });
    }

    if (allPaidThisYear) {
      displayCart.push({ year: y, display: displayLabel, isPaid: true });
    } else {
      yearBasic = rd(yearBasic); yearSef = rd(yearSef); yearPen = rd(yearPen); yearDisc = rd(yearDisc);
      const yearTot = rd(yearBasic + yearSef - yearDisc + yearPen);
      displayCart.push({ year: y, display: displayLabel, isPaid: false, basic: yearBasic, sef: yearSef, pen: yearPen, disc: yearDisc, total: yearTot });
      tBasic += yearBasic; tSef += yearSef; tPen += yearPen; tDisc += yearDisc; gTotal += yearTot;
    }
  }

  gTotal = rd(gTotal);

  const post = async () => {
    if (!orNumber.trim()) {
      setErr("Official Receipt (OR) Number is required. Please encode the serial number from Form 56.");
      return;
    }

    setPosting(true); setErr("");
    try {
      const mainOr = orNumber.trim(); 
      
      const rowsToInsert = dbCart.map((item) => ({
        or_number: mainOr, 
        taxpayer_id: found.id, 
        property_id: item.property_id,
        assessment_id: item.assessment_id, 
        tax_year: item.year,
        payment_date: paymentDate, 
        payment_method: method, 
        quarter: item.quarterTag,
        basic_tax: item.basic, sef_tax: item.sef, idle_tax: 0,
        penalty: item.pen, discount: item.disc, total_paid: item.total,
        cashier_id: profile?.id, check_no: checkNo || null,
        paid_by: paidBy.toUpperCase(), 
      }));

      const insertedRows = await db.insert("collections", rowsToInsert, token);
      const col = insertedRows[0]; 
      
      await db.insert("official_receipts",{or_number:mainOr, collection_id:col.id, printed_by:profile?.id, print_count:0},token);
      
      // 🌟 FIXED: Only mark the delinquency as PAID if they settle the 4th Quarter!
      for (const item of dbCart) {
        if (item.quarterTag === "FULL" || item.quarterTag.includes("4")) {
          try {
            await db.update("delinquency", { status: "PAID" }, { filter: `property_id=eq.${item.property_id}&tax_year=eq.${item.year}` }, token);
          } catch (updateErr) {}
        }
      }
      
      setIssued({...col, payment_date: paymentDate, or_number: mainOr, paid_by: paidBy.toUpperCase(), tax_year: `${start}-${end}`, basic_tax: tBasic, sef_tax: tSef, penalty: tPen, discount: tDisc, total_paid: gTotal, taxpayer:found, properties:selectedProps, cashier:profile?.full_name});
      setStep(4);
    } catch(e){ setErr(e.message); }
    setPosting(false);
  };

  const reset = () => { setStep(1);setFound(null);setPropList([]);setSelProp(null);setAsmt(null);setIssued(null);setQ("");setErr("");setOrNumber("");setSelectedProps([]); setMultiPropData([]); };

  if (step===4 && issued) return (
    <div>
      <div className="topbar"><div className="topbar-left"><h1>Receipt Issued</h1></div></div>
      <div className="page-body">
        <div className="banner banner-success"><span className="banner-icon">✓</span><span>{issued.or_number} successfully posted — {fmt(issued.total_paid)}</span></div>
        <div className="two-col">
          <div>
            <div className="or-paper">
              <div className="or-header">
                <div className="or-seal"><img src="https://i.postimg.cc/VktjPybt/macalelon-logo.png" alt="LGU Logo" style={{height: "56px", objectFit: "contain"}} /></div>
                <h2>Republic of the Philippines · Province of Quezon</h2>
                <h1>Municipality of Macalelon</h1>
                <h2>Office of the Municipal Treasurer</h2>
              </div>
              <div className="or-number">OFFICIAL RECEIPT NO. {issued.or_number}</div>
              <div className="or-divider"/>
              {/* 🌟 FIND this block and change today() to issued.payment_date */}
              {[["Date:", issued.payment_date], ["Taxpayer:",`${issued.taxpayer.lastname}, ${issued.taxpayer.firstname}`],["Paid By:", issued.paid_by],["Address:",issued.taxpayer.address||"—"],["TD Number:",issued.property?.td_number||"—"],["Tax Year:",issued.tax_year],["Payment:",issued.payment_method]].map(([k,v])=>(
                <div className="or-line" key={k}><span className="k">{k}</span><span className="v">{v}</span></div>
              ))}
              <div className="or-breakdown" style={{ marginTop: "16px", marginBottom: "16px", borderTop: "1px dashed #ccc", borderBottom: "1px dashed #ccc", padding: "12px 0" }}>
                    
                    {[
                      ["Basic Tax", fmt(issued?.basic_tax)],
                      ["SEF Tax", fmt(issued?.sef_tax)],
                      ["Penalty (Late)", issued?.penalty > 0 ? fmt(issued?.penalty) : "0.00"],
                      ["Discount", issued?.discount > 0 ? `-${fmt(issued?.discount)}` : "0.00"]
                    ].map(([label, amount], i) => (
                      <div key={i} style={{ display: "flex", justifyContent: "space-between", fontSize: "13px", marginBottom: "4px" }}>
                        <span>{label}</span>
                        <span style={{ 
                          fontFamily: "monospace", 
                          color: label === "Discount" && issued?.discount > 0 ? "var(--green2)" : "inherit" 
                        }}>
                          {amount}
                        </span>
                      </div>
                    ))}

                  </div>

                  <div style={{ display: "flex", justifyContent: "space-between", fontWeight: "bold", fontSize: "16px" }}>
                    <span>TOTAL AMOUNT PAID</span>
                    <span style={{ fontFamily: "monospace" }}>{fmt(issued?.total_paid)}</span>
                  </div>
              <div className="or-qr">
                <div className="qr-placeholder">QR</div>
                <div className="or-footer">Cashier: {issued.cashier} · Verify at lgu.gov.ph/verify</div>
              </div>
            </div>
            <div style={{display:"flex",gap:10,justifyContent:"center",marginTop:16}}>
              <button className="btn btn-primary">🖨 Print — 3 Copies</button>
              <button className="btn btn-outline" onClick={reset}>New Transaction</button>
            </div>
          </div>
          <div className="panel">
            <div className="panel-title">Transaction Summary</div>
            <div className="detail-grid">
              {[["OR Number",issued.or_number],["Taxpayer",`${issued.taxpayer.lastname}, ${issued.taxpayer.firstname}`],["Paid By", issued.paid_by],["TD No.",issued.property?.td_number||"—"],["Tax Year",issued.tax_year],["Quarter",issued.quarter],["Basic RPT",fmt(issued.basic_tax)],["SEF",fmt(issued.sef_tax)],["Total",fmt(issued.total_paid)],["Method",issued.payment_method],["Cashier",issued.cashier||"—"]].map(([k,v])=>(
                <div className="drow" key={k}><span className="dk">{k}</span><span className="dv">{v}</span></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div>
      <div className="topbar">
        <div className="topbar-left"><h1>Collection</h1><p>REAL PROPERTY TAX PAYMENT PROCESSING</p></div>
      </div>
      <div className="page-body">
        
        {/* 🌟 CRASH FIX: Replaced React.Fragment with a native div */}
        <div className="steps">
          {[["1","Search Taxpayer"],["2","Select Property"],["3","Compute & Pay"],["4","Receipt"]].map(([n,l],i)=>(
            <div key={n} style={{display: "flex", alignItems: "center"}}>
              <div className={`step ${step===i+1?"active":step>i+1?"done":""}`}>
                <div className="step-num">{step>i+1?"✓":n}</div>
                {l}
              </div>
              {i<3 && <div className="step-sep"/>}
            </div>
          ))}
        </div>

        {err && <div className="banner banner-err"><span className="banner-icon">⚠</span>{err}</div>}

        {step===1 && (
          <div className="panel" style={{maxWidth:520}}>
            <div className="panel-title">Search Property or Taxpayer</div>
            <div className="form-group" style={{marginBottom:14}}>
              <label className="form-label">Property Index No. (PIN), TD Number, or Last Name</label>
              <input value={q} onChange={e=>setQ(e.target.value)} onKeyDown={e=>e.key==="Enter"&&search()} placeholder="e.g. 015-18-013-11-120"/>
            </div>
            <button className="btn btn-gold" onClick={search}>Search →</button>
          </div>
        )}

        {step===2 && found && (
          <div>
            <div className="panel" style={{maxWidth:520,marginBottom:16}}>
              <div className="panel-title">Taxpayer Verified</div>
              <div className="detail-grid">
                {[["Name",`${found.lastname}, ${found.firstname}`],["Code",found.taxpayer_code],["Address",found.address||"—"],["Contact",found.contact_no||"—"]].map(([k,v])=>(
                  <div className="drow" key={k}><span className="dk">{k}</span><span className="dv">{v}</span></div>
                ))}
              </div>
            </div>
            <div className="panel-title" style={{marginBottom:12,paddingBottom:0}}>Select Property</div>
            {propList.length===0
              ? <div className="empty"><div className="empty-icon">🏠</div><div className="empty-text">No properties on record</div></div>
              : propList.map(p=>(
                  <div className="prop-card" key={p.id} onClick={()=>toggleProp(p)} style={{ border: selectedProps.find(x => x.id === p.id) ? "2px solid var(--blue2)" : "1px solid var(--border)" }}>
                    <div className="prop-card-left">
                      <h3>{p.td_number}  <span className="badge badge-blue">{p.classification}</span></h3>
                      <p style={{marginTop: "4px", fontWeight: "bold", color: "var(--blue2)"}}>PIN: {p.property_index_no || "—"}</p>
                      <p>AV: {fmt(p.assessed_value)} · {p.barangay||"—"}</p>
                    </div>
                    <div><input type="checkbox" checked={!!selectedProps.find(x => x.id === p.id)} readOnly style={{width: 22, height: 22, cursor: "pointer"}} /></div>
                  </div>
                ))
            }
           <div style={{display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 16}}>
              <button className="btn btn-ghost btn-sm" onClick={()=>setStep(1)}>← Back</button>
              {propList.length > 0 && <button className="btn btn-primary" onClick={proceedWithSelected} disabled={selectedProps.length === 0}>Compute Selected ({selectedProps.length}) →</button>}
            </div>
          </div>
        )}

        {step===3 && selectedProps.length > 0 && (
          <div className="two-col">
            <div>
              
              {firstUnpaidYear < new Date().getFullYear() && (
                <div className="banner banner-err" style={{ marginBottom: "16px" }}>
                  <span className="banner-icon">⚖️</span>
                  <span><strong>LGC Sec. 250 Enforced:</strong> Official delinquency detected starting <strong>{firstUnpaidYear}</strong>. By law, payments must first cover oldest delinquencies.</span>
                </div>
              )}

              <div className="panel">
                <div className="panel-title">Selected Properties ({selectedProps.length})</div>
                <div className="table-wrap">
                  <table>
                    <thead><tr><th>TD No.</th><th>Classification</th><th style={{textAlign: "right"}}>Assessed Value</th></tr></thead>
                    <tbody>
                      {selectedProps.map(p => (
                        <tr key={p.id}>
                          <td style={{fontWeight: "bold"}}>{p.td_number}</td>
                          <td>{p.classification}</td>
                          <td style={{textAlign: "right", fontFamily: "monospace"}}>{fmt(p.assessed_value)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
              <div className="panel">
                <div className="panel-title">Payment Options</div>
                <div className="form-grid" style={{marginBottom:14}}>
                  
                  <div className="form-group span2" style={{marginBottom: 8, padding: "12px", background: "rgba(220, 38, 38, 0.05)", borderRadius: "8px", border: "1px dashed var(--red2)"}}>
                    <label className="form-label" style={{color: "var(--red2)", fontWeight: "bold"}}>Official Receipt (OR) Number *</label>
                    <input 
                      value={orNumber} 
                      onChange={e => setOrNumber(e.target.value)} 
                      placeholder="Enter Serial Number from Form 56..."
                      style={{ border: "2px solid var(--red2)", fontWeight: "bold" }}
                    />
                  </div>

                <div className="form-group">
                    <label className="form-label">From</label>
                    <div style={{display: "flex", gap: "8px"}}>
                      <input 
                        type="number" 
                        value={fromYear} 
                        onChange={(e) => setFromYear(e.target.value)}
                        disabled={firstUnpaidYear < new Date().getFullYear()} 
                        title={firstUnpaidYear < new Date().getFullYear() ? "Locked by LGC Sec. 250" : ""}
                        style={{
                          width: "80px", padding: "10px 8px", textAlign: "center", 
                          background: firstUnpaidYear < new Date().getFullYear() ? "var(--bg3)" : "inherit", 
                          color: firstUnpaidYear < new Date().getFullYear() ? "var(--text3)" : "inherit", 
                          cursor: firstUnpaidYear < new Date().getFullYear() ? "not-allowed" : "text"
                        }} 
                      />
                      <select value={fromQuarter} onChange={e=>setFromQuarter(e.target.value)} style={{flex: 1}}>
                        <option value="1">Q1 (Jan-Mar)</option>
                        <option value="2">Q2 (Apr-Jun)</option>
                        <option value="3">Q3 (Jul-Sep)</option>
                        <option value="4">Q4 (Oct-Dec)</option>
                      </select>
                    </div>
                  </div>

                  <div className="form-group">
                    <label className="form-label">To</label>
                    <div style={{display: "flex", gap: "8px"}}>
                      <input type="number" value={toYear} onChange={(e) => setToYear(e.target.value)} min={fromYear} max={new Date().getFullYear() + 5} style={{width: "80px", padding: "10px 8px", textAlign: "center"}} />
                      <select value={toQuarter} onChange={e=>setToQuarter(e.target.value)} style={{flex: 1}}>
                        <option value="1">Q1 (Jan-Mar)</option>
                        <option value="2">Q2 (Apr-Jun)</option>
                        <option value="3">Q3 (Jul-Sep)</option>
                        <option value="4">Q4 (Oct-Dec)</option>
                      </select>
                    </div>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Payment Method</label>
                    <select value={method} onChange={e=>setMethod(e.target.value)}>
                      {["CASH","CHECK","GCASH","MAYA","LANDBANK","DBP","OTHER"].map(m=><option key={m}>{m}</option>)}
                    </select>
                  </div>
                  {method==="CHECK" && (
                    <div className="form-group">
                      <label className="form-label">Check Number</label>
                      <input value={checkNo} onChange={e=>setCheckNo(e.target.value)}/>
                    </div>
                  )}
                  <div className="form-group">
                    <label className="form-label" style={{color: "var(--blue2)", fontWeight: "bold"}}>Actual Date Paid (For Encoding)</label>
                    <input 
                      type="date" 
                      value={paymentDate} 
                      onChange={e => setPaymentDate(e.target.value)} 
                      max={today()} 
                      style={{ border: "2px solid var(--blue2)" }}
                    />
                  </div>

                  <div className="form-group span2" style={{marginTop: "8px"}}>
                    <label className="form-label">Paid By (Actual person paying)</label>
                    <input 
                      value={paidBy} 
                      onChange={e => setPaidBy(e.target.value)} 
                      placeholder="e.g. Maria Santos (Sister) or Juan Dela Cruz (Son)"
                    />
                  </div>

                </div>
              </div>
            </div>
            <div>
            <div className="panel">
                <div className="panel-title">Tax Computation</div>
                
                <div className="table-wrap" style={{marginBottom: 16}}>
                  <table style={{fontSize: 11}}>
                    <thead><tr><th>Year</th><th>Basic</th><th>SEF</th><th>Pen/Disc</th><th>Total</th></tr></thead>
                    <tbody>
                      {displayCart.map(c => (
                        <tr key={c.year} style={c.isPaid ? { backgroundColor: "var(--bg2)", opacity: 0.7 } : {}}>
                        <td><span className="chip">{c.display}</span></td>
                          
                          {c.isPaid ? (
                            <td colSpan="4" style={{ textAlign: "center", fontSize: "12px", color: "var(--green2)", fontWeight: 700, letterSpacing: "1px" }}>
                              ALREADY PAID
                            </td>
                          ) : (
                            <>
                              <td>{fmt(c.basic)}</td>
                              <td>{fmt(c.sef)}</td>
                              <td style={{color: c.disc > 0 ? 'var(--green2)' : c.pen > 0 ? 'var(--red2)' : 'inherit'}}>
                                {c.disc > 0 ? `-${fmt(c.disc)}` : c.pen > 0 ? `+${fmt(c.pen)}` : "—"}
                              </td>
                              <td style={{fontWeight: 700}}>{fmt(c.total)}</td>
                            </>
                          )}
                          
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="comp-row total">
                  <span style={{fontWeight:700,fontSize:14}}>GRAND TOTAL DUE</span>
                  <span className="cv" style={{fontSize:18}}>{fmt(gTotal)}</span>
                </div>
                <div style={{marginTop:16,display:"flex",gap:10}}>
                  <button className="btn btn-success" onClick={post} disabled={posting}>{posting?<><span className="spin"/>&nbsp;Posting…</>:"✓ Post Payment & Issue OR"}</button>
                  <button className="btn btn-ghost" onClick={()=>setStep(2)}>← Back</button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
/* ═══════════════════════════════════════════════════════════
   DELINQUENCY (SOA AGGREGATION, TRUE % DISPLAY & DISCOUNTS)
═══════════════════════════════════════════════════════════ */
function Delinquency({ token, profile }) {
  const [list,setList] = useState([]);
  const [loading,setLoading] = useState(true);
  const [showCalc,setShowCalc] = useState(false);
  const [showAdd,setShowAdd]   = useState(false);
  const [saving,setSaving]     = useState(false);
  const [deleting,setDeleting] = useState(false); 
  const [recalculating, setRecalculating] = useState(false);
  const [generating, setGenerating] = useState(false); 
  const [allProps,setAllProps] = useState([]);
  const [asmtHistory, setAsmtHistory] = useState([]); 
  const [paidCollections, setPaidCollections] = useState([]); 
  const [soaData, setSoaData]  = useState(null); 
  const [massSoaData, setMassSoaData] = useState(null); 
  const [calcTax,setCalcTax]   = useState("");
  const [calcMo,setCalcMo]     = useState("");
  const [q, setQ]              = useState("");
  const [brgyFilter, setBrgyFilter] = useState(""); 
  
  const [propSearch, setPropSearch] = useState("");
  
  const [form, setForm] = useState({ 
    property_id: "", 
    from_year: String(new Date().getFullYear() - 5), 
    to_year: String(new Date().getFullYear() - 1),
    target_month: String(new Date().getMonth() + 1)
  });

  const barangays = [
    "AMONTAY", "ANOS", "BUYAO", "CALANTAS", "CANDANGAL", "LAHING", 
    "LUCTOB", "MABINI IBABA", "MABINI ILAYA", "MALABAHAY", "MAMBOG", 
    "OLONGTAO IBABA", "OLONGTAO ILAYA", "PADRE HERRERA", "PAJARILLO", 
    "PINAGBAYANAN", "SAN ISIDRO", "SAN JOSE", "SAN NICOLAS", "SAN VICENTE", 
    "TAGUIN", "TUBIGAN IBABA", "TUBIGAN ILAYA", "VISTA HERMOSA", 
    "CASTILLO (POB.)", "DAMAYAN (POB.)", "MASIPAG (POB.)", "PAG-ASA (POB.)", 
    "RIZAL (POB.)", "RODRIGUEZ (POB.)"
  ];

  const rd = (num) => Math.floor((parseFloat(num) || 0) * 100 + 0.0001) / 100;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      let filterStr = "status=eq.UNPAID";

      if (q) {
        const props = await db.select("properties", { filter: `or=(property_index_no.ilike.*${q}*,td_number.ilike.*${q}*)`, select: "id" }, token);
        const propIds = props.map(p => p.id);
        const tps = await db.select("taxpayers", { filter: `or=(lastname.ilike.*${q}*,firstname.ilike.*${q}*,taxpayer_code.ilike.*${q}*)`, select: "id" }, token);
        const tpIds = tps.map(t => t.id);

        let orConditions = [];
        if (propIds.length > 0) orConditions.push(`property_id.in.(${propIds.join(',')})`);
        if (tpIds.length > 0) orConditions.push(`taxpayer_id.in.(${tpIds.join(',')})`);

        if (orConditions.length > 0) {
          filterStr += `&or=(${orConditions.join(',')})`;
        } else {
          setList([]); setLoading(false); return; 
        }
      }

      const d = await db.select("delinquency",{
        filter: filterStr,
        select:"*,properties(td_number,classification,property_index_no,barangay),taxpayers(lastname,firstname,barangay,address)",
        order:"months_delinquent.desc"
      },token);
      setList(d || []);
    } catch(e){console.error(e);}
    setLoading(false);
  },[token, q]);

  useEffect(()=>{ load(); },[load]);

  const handleGenerateReceivables = async () => {
    // Ask the Treasurer which year they are generating
    const suggestedYear = new Date().getFullYear();
    const inputYear = window.prompt("Enter the Tax Year you want to generate receivables for (e.g., 2026 or 2027):", suggestedYear);
    if (!inputYear) return;
    
    const targetYear = parseInt(inputYear);
    if (isNaN(targetYear) || targetYear < 2000 || targetYear > 2100) {
      alert("Please enter a valid year.");
      return;
    }

    if (!window.confirm(`⚠️ WARNING: Are you sure you want to mass-generate unpaid records for ALL active properties for the year ${targetYear}? This might take a few moments.`)) return;

    setGenerating(true);
    try {
      // 1. Fetch all properties with their assessed value (limit 50,000)
      const props = await db.select("properties", { select: "id, taxpayer_id, assessed_value", limit: 50000 }, token);
      
      // 2. Fetch existing delinquency records for the target year to avoid duplicates
      const existing = await db.select("delinquency", { filter: `tax_year=eq.${targetYear}`, select: "property_id", limit: 50000 }, token);
      const existingIds = new Set(existing.map(e => e.property_id));

      // 3. Filter out properties that already have a record for this year
      const toInsert = props.filter(p => !existingIds.has(p.id));

      if (toInsert.length === 0) {
        alert(`All properties have already been billed for ${targetYear}!`);
        setGenerating(false);
        return;
      }

      // 4. Process in chunks of 500 to protect the Supabase API limits
      const chunkSize = 500;
      let insertedCount = 0;

      for (let i = 0; i < toInsert.length; i += chunkSize) {
        const chunk = toInsert.slice(i, i + chunkSize).map(p => {
          const av = parseFloat(p.assessed_value) || 0;
          const tax = rd(av * 0.01); // 1% Basic, 1% SEF
          
          return {
            property_id: p.id,
            taxpayer_id: p.taxpayer_id,
            tax_year: targetYear,
            unpaid_basic: tax,
            unpaid_sef: tax,
            months_delinquent: 0,
            interest_amount: 0,
            total_due: rd(tax + tax),
            status: "UNPAID"
          };
        });

        await db.insert("delinquency", chunk, token);
        insertedCount += chunk.length;
      }

      alert(`✅ Success! Generated new ${targetYear} receivables for ${insertedCount} properties.`);
      load(); // Refresh the table
    } catch (e) {
      alert("Failed to generate receivables: " + e.message);
    }
    setGenerating(false);
  };

  const loadProps = async () => {
    // 🌟 Increased limit to 50,000 so NO properties are left behind
    const d = await db.select("properties",{select:"id,td_number,property_index_no,taxpayer_id,assessed_value,barangay,taxpayers(lastname,firstname,barangay,address)",limit:50000},token);
    setAllProps(d || []);
  };

  useEffect(() => {
    if (!form.property_id) { setAsmtHistory([]); setPaidCollections([]); return; }
    db.select("assessments", { filter: `property_id=eq.${form.property_id}`, order: "tax_year.desc" }, token)
      .then(d => setAsmtHistory(d || []));
    db.select("collections", { filter: `property_id=eq.${form.property_id}&is_voided=eq.false` }, token)
      .then(d => setPaidCollections(d || []));
  }, [form.property_id, token]);

  const generateSOA = () => {
    const prop = allProps.find(p => p.id === parseInt(form.property_id));
    if (!prop) { alert("Please select a property first."); return; }
    
    const existingUnpaid = list.filter(d => d.property_id === prop.id);
    
    const currentYear = new Date().getFullYear();
    const payMonth = parseInt(form.target_month);
    let start = parseInt(form.from_year);
    let end = parseInt(form.to_year);
    if (start > end) { let temp = start; start = end; end = temp; }

    let rows = [];
    let tBasic = 0, tSef = 0, tPen = 0, tDisc = 0, gTotal = 0, tAv = 0;
    let maxMos = 0, oldestAsmtId = null;

    for (let y = start; y <= end; y++) {
      if (existingUnpaid.some(d => parseInt(d.tax_year) === y)) continue; 

      let activeAsmt = asmtHistory.find(a => parseInt(a.tax_year) <= y);
      let dbAsmt = activeAsmt;
      if (!dbAsmt && asmtHistory.length > 0) dbAsmt = asmtHistory[asmtHistory.length - 1];
      if (y === start) oldestAsmtId = dbAsmt ? dbAsmt.id : null;

      const av = activeAsmt ? parseFloat(activeAsmt.assessed_value) : (prop?.assessed_value ? parseFloat(prop.assessed_value) : 0);
      const basic = activeAsmt ? parseFloat(activeAsmt.basic_tax) : (prop?.assessed_value ? rd(parseFloat(prop.assessed_value) * 0.01) : 0);
      const sef = activeAsmt ? parseFloat(activeAsmt.sef_tax) : (prop?.assessed_value ? rd(parseFloat(prop.assessed_value) * 0.01) : 0);
      
      const yearPayments = paidCollections.filter(c => parseInt(c.tax_year) === y);
      let paidQuarters = [];
      yearPayments.forEach(p => {
        const qTag = p.quarter;
        if (qTag === "FULL") paidQuarters.push(1, 2, 3, 4);
        else if (qTag && qTag.includes("-")) {
          const parts = qTag.split("-");
          for(let i=parseInt(parts[0].replace("Q","")); i<=parseInt(parts[1].replace("Q","")); i++) paidQuarters.push(i);
        } else if (qTag && qTag.startsWith("Q")) {
          paidQuarters.push(parseInt(qTag.replace("Q","")));
        }
      });

      if (paidQuarters.includes(1) && paidQuarters.includes(2) && paidQuarters.includes(3) && paidQuarters.includes(4)) continue; 

      let rowBasic = 0, rowSef = 0, rowPen = 0, rowDisc = 0;
      let mosLate = 0;
      
      // 🌟 NEW: Calculate EXACT display penalty percent
      let penaltyRateDisplay = 0;
      
      const qBaseBasic = rd(basic / 4);
      const qBaseSef = rd(sef / 4);
      const getQBasic = (q) => q === 4 ? rd(basic - (qBaseBasic * 3)) : qBaseBasic;
      const getQSef   = (q) => q === 4 ? rd(sef - (qBaseSef * 3)) : qBaseSef;
      const getQDue   = (q) => rd(getQBasic(q) + getQSef(q));
      
      const qDeadlines = [3, 6, 9, 12];

      if (y < currentYear) {
        mosLate = ((currentYear - y) * 12) + payMonth;
        penaltyRateDisplay = (y <= 1991) ? Math.min(mosLate * 0.02, 0.24) : Math.min(mosLate * 0.02, 0.72);
        
        [1, 2, 3, 4].forEach(q => {
          if (!paidQuarters.includes(q)) {
            rowBasic += getQBasic(q); rowSef += getQSef(q); rowPen += rd(getQDue(q) * penaltyRateDisplay);
          }
        });
      } else if (y === currentYear) {
        penaltyRateDisplay = "VARIES"; // Because quarters have different penalties in current year
        [1, 2, 3, 4].forEach(q => {
          if (!paidQuarters.includes(q)) {
            rowBasic += getQBasic(q); rowSef += getQSef(q);
            const dueMo = qDeadlines[q - 1]; 
            if (payMonth <= dueMo) { 
              rowDisc += rd(getQDue(q) * 0.10); 
            } else { 
              let currRate = Math.min(payMonth * 0.02, 0.72);
              rowPen += rd(getQDue(q) * currRate);
            }
          }
        });
      } else {
        penaltyRateDisplay = 0;
        [1, 2, 3, 4].forEach(q => {
          if (!paidQuarters.includes(q)) {
            rowBasic += getQBasic(q); rowSef += getQSef(q); 
            if (payMonth <= 9) { rowDisc += rd(getQDue(q) * 0.15); } 
            else { rowDisc += rd(getQDue(q) * 0.10); }
          }
        });
      }

      if (mosLate > maxMos) maxMos = mosLate;
      
      rowBasic = rd(rowBasic); rowSef = rd(rowSef); rowPen = rd(rowPen); rowDisc = rd(rowDisc);
      const rowTotal = rd(rowBasic + rowSef + rowPen - rowDisc);

      if (rowTotal > 0) {
          rows.push({ year: y, av: av, penalty_percent: penaltyRateDisplay, basic: rowBasic, sef: rowSef, penalty: rowPen, discount: rowDisc, total: rowTotal });
          tBasic += rowBasic; tSef += rowSef; tPen += rowPen; tDisc += rowDisc; gTotal += rowTotal; tAv += av;
      }
    }

    if (rows.length === 0) { alert("This property is already fully paid (or already recorded) for the selected years!"); return; }
    
    // 🌟 DYNAMIC AGGREGATION LOGIC
    let displayRows = [];
    if (rows.length > 0) {
      let curr = { ...rows[0], startYear: rows[0].year, endYear: rows[0].year, count: 1 };
      for (let i = 1; i < rows.length; i++) {
        const row = rows[i];
        // Groups only if AV is same AND exact penalty percentage is the same
        if (row.av === curr.av && row.penalty_percent === curr.penalty_percent && row.year === curr.endYear + 1) {
          curr.endYear = row.year; curr.count++; curr.basic += row.basic; curr.sef += row.sef;
          curr.penalty += row.penalty; curr.discount += row.discount; curr.total += row.total;
        } else {
          displayRows.push(curr);
          curr = { ...row, startYear: row.year, endYear: row.year, count: 1 };
        }
      }
      displayRows.push(curr);
    }

    setSoaData({ 
      property: prop, oldestAsmtId, start_year: start, end_year: end, target_month: payMonth, max_months: maxMos, 
      rows, displayRows, 
      totals: { av: rd(tAv), basic: rd(tBasic), sef: rd(tSef), penalty: rd(tPen), discount: rd(tDisc), total: rd(gTotal) } 
    });
  };

  const saveSOA = async () => {
    setSaving(true);
    try {
      // Save individual detailed rows to database
      const rowsToInsert = soaData.rows.map(r => ({
        assessment_id: soaData.oldestAsmtId, property_id: soaData.property.id, taxpayer_id: soaData.property.taxpayer_id, 
        tax_year: parseInt(r.year), unpaid_basic: r.basic, unpaid_sef: r.sef, months_delinquent: Math.min(soaData.max_months, 36), 
        interest_amount: r.penalty, total_due: r.total, status: "UNPAID"
      }));
      await db.insert("delinquency", rowsToInsert, token);
      setSoaData(null); setShowAdd(false); load();
    } catch(e) { alert(e.message); }
    setSaving(false);
  };

  const handleDeleteGroup = async (group) => {
    if (!window.confirm(`Permanently delete ALL unpaid delinquency records for PIN ${group.properties?.property_index_no || "this property"}?`)) return;
    setDeleting(true);
    try {
      await db.delete("delinquency", { filter: `id=in.(${group.rowIds.join(',')})` }, token);
      load();
    } catch(e) { alert("Delete failed: " + e.message); }
    setDeleting(false);
  };

  const formatSOARows = (details, targetMonth) => {
    const currentYear = new Date().getFullYear();
    const sortedDetails = details.sort((a, b) => parseInt(a.tax_year) - parseInt(b.tax_year));
    let tAv = 0;

    const detailedRows = sortedDetails.map(d => {
      const y = parseInt(d.tax_year);
      const basic = parseFloat(d.unpaid_basic) || 0; 
      const sef = parseFloat(d.unpaid_sef) || 0;
      const penalty = parseFloat(d.interest_amount) || 0; 
      const total = parseFloat(d.total_due) || 0;
      const av = basic / 0.01; 
      tAv += av;
      
      // 1. Calculate the actual discount money amount
      let calcDiscount = rd((basic + sef + penalty) - total);
      if (calcDiscount < 0.01) calcDiscount = 0; 

      // 2. Apply your date-strict 15% Advance rule
      let penaltyRate = 0;
      if (y < currentYear) {
          // LATE PENALTY (Past Years)
          const mosLate = ((currentYear - y) * 12) + targetMonth;
          penaltyRate = (y <= 1991) ? Math.min(mosLate * 0.02, 0.24) : Math.min(mosLate * 0.02, 0.72);
          
      } else if (y === currentYear) {
          // PROMPT PAYMENT (Current Year)
          penaltyRate = "10% DISC";
          
      } else if (y > currentYear) {
          // ADVANCE PAYMENT (Future Years)
          // 🌟 Must be paid on or before September (Months 1-9) to get 15%
          if (targetMonth <= 9) {
              penaltyRate = "15% DISC";
          } else {
              // Paid in Oct, Nov, or Dec
              penaltyRate = "10% DISC"; 
          }
      }
      
      return { year: y, av: av, penalty_percent: penaltyRate, basic: basic, sef: sef, penalty: penalty, discount: calcDiscount, total: total };
    });

    let displayRows = [];
    if (detailedRows.length > 0) {
      const sorted = [...detailedRows].sort((a,b) => a.year - b.year);
      let curr = { ...sorted[0], startYear: sorted[0].year, endYear: sorted[0].year, count: 1 };
      
      for (let i = 1; i < sorted.length; i++) {
        const row = sorted[i];
        if (row.av === curr.av && row.penalty_percent === curr.penalty_percent && row.year === curr.endYear + 1) {
          curr.endYear = row.year; curr.count++; curr.basic += row.basic; curr.sef += row.sef;
          curr.penalty += row.penalty; curr.discount += row.discount; curr.total += row.total;
        } else {
          displayRows.push(curr);
          curr = { ...row, startYear: row.year, endYear: row.year, count: 1 };
        }
      }
      displayRows.push(curr);
    }
    
    const totalDisc = rd(detailedRows.reduce((acc, row) => acc + row.discount, 0));
    return { detailedRows, displayRows, tAv, totalDisc };
  };

  const viewSavedSOA = (group) => {
    const targetMonth = new Date().getMonth() + 1;
    const { detailedRows, displayRows, tAv, totalDisc } = formatSOARows(group.details, targetMonth);
    setSoaData({
      isSavedRecord: true, property: { id: group.property_id, td_number: group.properties?.td_number, property_index_no: group.properties?.property_index_no, barangay: group.properties?.barangay, taxpayer_id: group.taxpayer_id, taxpayers: group.taxpayers },
      start_year: group.minYear, end_year: group.maxYear, target_month: targetMonth, rows: detailedRows, displayRows: displayRows,
      totals: { av: rd(tAv), basic: rd(group.sum_basic), sef: rd(group.sum_sef), penalty: rd(group.sum_int), discount: totalDisc, total: rd(group.sum_total) }
    });
  };

  const calcExactPenAndDisc = (y, basic, sef, targetMonth) => {
    const currentYear = new Date().getFullYear();
    const qBaseBasic = rd(basic / 4);
    const qBaseSef = rd(sef / 4);
    const getQBasic = (q) => q === 4 ? rd(basic - (qBaseBasic * 3)) : qBaseBasic;
    const getQSef   = (q) => q === 4 ? rd(sef - (qBaseSef * 3)) : qBaseSef;
    const getQDue   = (q) => rd(getQBasic(q) + getQSef(q));

    let rowPen = 0;
    let rowDisc = 0;

    if (y < currentYear) {
      const mosLate = ((currentYear - y) * 12) + targetMonth;
      const penaltyRate = (y <= 1991) ? Math.min(mosLate * 0.02, 0.24) : Math.min(mosLate * 0.02, 0.72);
      [1, 2, 3, 4].forEach(q => { rowPen += rd(getQDue(q) * penaltyRate); });
    } else if (y === currentYear) {
      const qDeadlines = [3, 6, 9, 12];
      [1, 2, 3, 4].forEach(q => {
        const dueMo = qDeadlines[q - 1]; 
        if (targetMonth <= dueMo) { 
          rowDisc += rd(getQDue(q) * 0.10); 
        } else { 
          let currRate = Math.min(targetMonth * 0.02, 0.72);
          rowPen += rd(getQDue(q) * currRate);
        }
      });
    } else {
       [1, 2, 3, 4].forEach(q => {
         if (targetMonth <= 9) rowDisc += rd(getQDue(q) * 0.15);
         else rowDisc += rd(getQDue(q) * 0.10);
       });
    }
    return { pen: rd(rowPen), disc: rd(rowDisc) };
  };

  const handleRecalculate = async (group) => {
    const inputMonth = window.prompt(`Enter target month (1-12) to calculate penalties for ${group.taxpayers?.lastname}:`, new Date().getMonth() + 1);
    if (inputMonth === null) return;
    const targetMonth = parseInt(inputMonth);
    if (isNaN(targetMonth) || targetMonth < 1 || targetMonth > 12) { alert("Invalid month. Please enter a number between 1 and 12."); return; }

    setRecalculating(true);
    try {
      for (const row of group.details) {
        const y = parseInt(row.tax_year);
        const basic = parseFloat(row.unpaid_basic) || 0; 
        const sef = parseFloat(row.unpaid_sef) || 0;
        
        const { pen, disc } = calcExactPenAndDisc(y, basic, sef, targetMonth);
        const newTot = rd(rd(basic + sef) + pen - disc);
        
        if (pen !== parseFloat(row.interest_amount) || newTot !== parseFloat(row.total_due)) {
            await db.update("delinquency", { interest_amount: pen, total_due: newTot }, { filter: `id=eq.${row.id}` }, token);
        }
      }
      load(); 
    } catch (e) { alert("Error recalculating: " + e.message); }
    setRecalculating(false);
  };

  const groupedList = Object.values(list.reduce((acc, d) => {
    const pid = d.property_id;
    if (!acc[pid]) {
      acc[pid] = { ...d, minYear: parseInt(d.tax_year), maxYear: parseInt(d.tax_year), sum_basic: 0, sum_sef: 0, sum_int: 0, sum_total: 0, rowIds: [], details: [] };
    }
    acc[pid].minYear = Math.min(acc[pid].minYear, parseInt(d.tax_year)); acc[pid].maxYear = Math.max(acc[pid].maxYear, parseInt(d.tax_year));
    acc[pid].sum_basic += parseFloat(d.unpaid_basic) || 0; acc[pid].sum_sef += parseFloat(d.unpaid_sef) || 0;
    acc[pid].sum_int += parseFloat(d.interest_amount) || 0; acc[pid].sum_total += parseFloat(d.total_due) || 0;
    acc[pid].rowIds.push(d.id); acc[pid].details.push(d); 
    return acc;
  }, {}));

  const filteredGroupedList = groupedList.filter(g => brgyFilter === "" || (g.properties?.barangay && g.properties.barangay.toUpperCase() === brgyFilter.toUpperCase()));
  const totals = filteredGroupedList.reduce((a,d)=>({due:a.due+d.sum_total, int:a.int+d.sum_int}), {due:0, int:0});

  const handleBatchRecalculate = async () => {
    if (filteredGroupedList.length === 0) { alert("No accounts displayed to recalculate."); return; }
    const inputMonth = window.prompt(`Enter target month (1-12) to calculate penalties for ALL ${filteredGroupedList.length} displayed accounts:`, new Date().getMonth() + 1);
    if (inputMonth === null) return;
    const targetMonth = parseInt(inputMonth);
    if (isNaN(targetMonth) || targetMonth < 1 || targetMonth > 12) { alert("Invalid month."); return; }

    if (!window.confirm(`This will recalculate penalties for ${filteredGroupedList.length} properties to match Month ${targetMonth}, ${new Date().getFullYear()}. Proceed?`)) return;

    setRecalculating(true);
    try {
      let updateCount = 0;
      for (const group of filteredGroupedList) {
        for (const row of group.details) {
          const y = parseInt(row.tax_year);
          const basic = parseFloat(row.unpaid_basic) || 0; 
          const sef = parseFloat(row.unpaid_sef) || 0;
          
          const { pen, disc } = calcExactPenAndDisc(y, basic, sef, targetMonth);
          const newTot = rd(rd(basic + sef) + pen - disc);
          
          if (pen !== parseFloat(row.interest_amount) || newTot !== parseFloat(row.total_due)) {
            await db.update("delinquency", { interest_amount: pen, total_due: newTot }, { filter: `id=eq.${row.id}` }, token);
            updateCount++;
          }
        }
      }
      load(); 
      alert(`Batch recalculation complete! Updated ${updateCount} individual year records.`);
    } catch (e) { alert("Error recalculating: " + e.message); }
    setRecalculating(false);
  };

  const prepareMassSOA = () => {
    if (filteredGroupedList.length === 0) { alert("No accounts displayed to print."); return; }
    
    const targetMonth = new Date().getMonth() + 1;
    const massData = filteredGroupedList.map(group => {
      const { detailedRows, displayRows, tAv, totalDisc } = formatSOARows(group.details, targetMonth);
      return {
        property: { id: group.property_id, td_number: group.properties?.td_number, property_index_no: group.properties?.property_index_no, barangay: group.properties?.barangay, taxpayer_id: group.taxpayer_id, taxpayers: group.taxpayers },
        start_year: group.minYear, end_year: group.maxYear, target_month: targetMonth, rows: detailedRows, displayRows: displayRows,
        totals: { av: rd(tAv), basic: rd(group.sum_basic), sef: rd(group.sum_sef), penalty: rd(group.sum_int), discount: totalDisc, total: rd(group.sum_total) }
      };
    });
    setMassSoaData(massData);
  };

  const preparedByName = profile?.full_name ? profile.full_name.toUpperCase() : "AUTHORIZED STAFF";
  const preparedByRole = profile?.position ? profile.position.toUpperCase() : (profile?.role ? profile.role.toUpperCase() : "MTO PERSONNEL");

  const filteredProps = allProps.filter(p => {
    if (!propSearch) return true;
    // 🌟 Added .trim() to automatically delete accidental blank spaces
    const term = propSearch.toLowerCase().trim();
    return (
      (p.property_index_no || "").toLowerCase().includes(term) ||
      (p.td_number || "").toLowerCase().includes(term) ||
      (p.taxpayers?.lastname || "").toLowerCase().includes(term) ||
      (p.taxpayers?.firstname || "").toLowerCase().includes(term)
    );
  });
  return (
    <>
      <div className="topbar">
        <div className="topbar-left"><h1>Delinquency Monitor</h1><p>INTEREST = UNPAID × 2% × MONTHS (MAX 36)</p></div>
        <div className="topbar-right">
          <button className="btn btn-outline" onClick={()=>setShowCalc(!showCalc)}>🧮 Calculator</button>
          {["admin","treasurer","assessor"].includes(profile?.role) && <button className="btn btn-gold" onClick={()=>{setShowAdd(!showAdd);loadProps();}}>＋ Add Record</button>}
        </div>
      </div>

      <div className="stat-row" style={{gridTemplateColumns:"repeat(3,1fr)"}}>
        {[
          { label:"Filtered Accounts", value:filteredGroupedList.length, color:"red", icon:"⚠️", isCur:false },
          { label:"Total Penalties", value:totals.int, color:"gold", icon:"📊", isCur:true },
          { label:"Total Amount Due", value:totals.due, color:"blue", icon:"💸", isCur:true },
        ].map(s=>(
          <div className="stat-card" key={s.label}>
            <div className={`stat-accent ${s.color}`}/>
            <div className={`stat-icon-bg ${s.color}`}>{s.icon}</div>
            <div className="stat-label">{s.label}</div>
            <div className="stat-value"><Counter value={s.value} isCurrency={s.isCur}/></div>
          </div>
        ))}
      </div>

      <div className="page-body">
        {showCalc && (
          <div className="panel" style={{maxWidth:560,marginBottom:16}}>
            <div className="panel-title">Delinquency Interest Calculator</div>
            <div className="form-grid-3" style={{marginBottom:14}}>
              <div className="form-group"><label className="form-label">Unpaid Tax Amount (₱)</label><input type="number" value={calcTax} onChange={e=>setCalcTax(e.target.value)} placeholder="10000"/></div>
              <div className="form-group"><label className="form-label">Months Delinquent (max 36)</label><input type="number" max={36} value={calcMo} onChange={e=>setCalcMo(e.target.value)} placeholder="12"/></div>
              <div className="form-group"><label className="form-label">Interest Amount</label><div style={{background:"var(--bg3)",border:"1px solid var(--border2)",padding:"10px 14px",borderRadius:9,fontFamily:"var(--font-mono)",fontWeight:700,color:"var(--gold2)",fontSize:14}}>{calcTax&&calcMo ? fmt(rd(parseFloat(calcTax) * 0.02 * Math.min(parseInt(calcMo),36))) : "—"}</div></div>
            </div>
            {calcTax&&calcMo&&(<div className="banner banner-gold" style={{background:"var(--gold-dim)",border:"1px solid rgba(212,168,67,.2)",color:"var(--gold2)"}}><span className="banner-icon">🧮</span>Total Due: <strong>{fmt(rd(parseFloat(calcTax) + rd(parseFloat(calcTax) * 0.02 * Math.min(parseInt(calcMo),36))))}</strong></div>)}
          </div>
        )}

        {showAdd && (
          <div className="panel" style={{marginBottom:16}}>
            <div className="panel-title">Add Delinquency Record</div>
            <div className="form-grid" style={{marginBottom:14}}>
              
              <div className="form-group span2">
                <label className="form-label">Search & Select Delinquent Property</label>
                <input 
                  type="text" 
                  placeholder="🔍 Type PIN, TD No., or Owner Name to filter list..." 
                  value={propSearch} 
                  onChange={e => setPropSearch(e.target.value)} 
                  style={{ marginBottom: "6px", borderColor: "var(--blue)" }}
                />
                
                <select 
                  value={form.property_id} 
                  onChange={e => setForm(f => ({ ...f, property_id: e.target.value }))}
                  size={propSearch ? 5 : undefined} 
                  style={{ width: "100%" }}
                >
                  <option value="">— Select property —</option>
                  {filteredProps.map(p => (
                    <option key={p.id} value={p.id}>
                      PIN: {p.property_index_no || "—"} | Loc: {p.barangay || "—"} | Owner: {p.taxpayers?.lastname}, {p.taxpayers?.firstname}
                    </option>
                  ))}
                </select>
                {propSearch && filteredProps.length === 0 && (
                  <div style={{ fontSize: "11px", color: "var(--red)", marginTop: "4px" }}>No properties found matching "{propSearch}"</div>
                )}
              </div>

              <div className="form-group"><label className="form-label">From Year</label><input type="number" value={form.from_year} onChange={e=>setForm(f=>({...f,from_year:e.target.value}))}/></div>
              <div className="form-group"><label className="form-label">To Year</label><input type="number" value={form.to_year} onChange={e=>setForm(f=>({...f,to_year:e.target.value}))}/></div>
              <div className="form-group span2">
                <label className="form-label">Target Payment Month</label>
                <select value={form.target_month} onChange={e=>setForm(f=>({...f,target_month:e.target.value}))}>
                  {["January","February","March","April","May","June","July","August","September","October","November","December"].map((m, i) => <option key={i+1} value={i+1}>{m}</option>)}
                </select>
              </div>
            </div>
            <div className="gap-row">
              <button className="btn btn-primary" onClick={generateSOA}>🧮 Compute & View SOA</button>
              <button className="btn btn-outline" onClick={()=>setShowAdd(false)}>Cancel</button>
            </div>
          </div>
        )}

        {/* 🌟 SINGLE SOA MODAL - IMPROVED AGGREGATION & DISCOUNT */}
        {soaData && !massSoaData && (
          <>
            <style>{`
              @media print {
                @page { size: A4 portrait; margin: 15mm; }
                body * { visibility: hidden !important; }
                .soa-print-area, .soa-print-area * { visibility: visible !important; color: #000 !important; }
                .soa-print-area { position: absolute !important; left: 0 !important; top: 0 !important; width: 100% !important; background: #fff !important; box-shadow: none !important; border: none !important; margin: 0 !important; padding: 0 !important; max-height: none !important; overflow: visible !important; }
                .no-print { display: none !important; }
                table { page-break-inside: auto; width: 100% !important; margin: 0 auto; }
                tr { page-break-inside: avoid; page-break-after: auto; }
                thead { display: table-header-group; }
                .soa-print-area th, .soa-print-area td { font-size: 10pt !important; padding: 4px !important; }
              }
            `}</style>
            <div className="modal-backdrop" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.8)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
              <div className="card soa-print-area" style={{ width: "850px", maxWidth: "100%", maxHeight: "90vh", overflowY: "auto", background: "#fff", color: "#000", fontFamily: "Arial, sans-serif" }}>
                <div className="card-header no-print" style={{ borderBottom: "1px solid #ccc", background: "#f8f9fa" }}>
                  <div><div className="card-title">Statement of Account (SOA)</div></div>
                  <button className="btn btn-ghost btn-sm" onClick={() => setSoaData(null)}>✕ Close</button>
                </div>
                <div className="card-body" style={{ padding: "40px 50px" }}>
                  
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "25px", borderBottom: "2px solid #000", paddingBottom: "15px" }}>
                    <img src="https://i.postimg.cc/VktjPybt/macalelon-logo.png" alt="LGU Logo" style={{ width: "80px", height: "80px", objectFit: "contain" }} />
                    <div style={{ textAlign: "center", flex: 1 }}>
                      <div style={{ fontSize: "11pt" }}>Republic of the Philippines</div>
                      <div style={{ fontSize: "11pt" }}>Province of Quezon</div>
                      <div style={{ fontSize: "11pt", fontWeight: "bold" }}>MUNICIPALITY OF MACALELON</div>
                      <div style={{ fontSize: "11pt", fontWeight: "bold", marginTop: "10px" }}>OFFICE OF THE MUNICIPAL TREASURER</div>
                    </div>
                    <div style={{ width: "80px" }}></div>
                  </div>

                  <div style={{ textAlign: "left", marginBottom: "25px", fontSize: "10pt", lineHeight: "1.6" }}>
                    <div style={{ borderBottom: "1px solid #000", display: "inline-block", minWidth: "350px", fontWeight: "bold" }}>
                      {soaData.property.taxpayers?.firstname} {soaData.property.taxpayers?.lastname}
                    </div><br/>
                    <div style={{ borderBottom: "1px solid #000", display: "inline-block", minWidth: "350px" }}>
                      {soaData.property.taxpayers?.address || soaData.property.taxpayers?.barangay || "—"}
                    </div><br/>
                    <div style={{ borderBottom: "1px solid #000", display: "inline-block", minWidth: "350px" }}>MACALELON, QUEZON</div>
                  </div>

                  <div style={{ textAlign: "left", fontSize: "10pt", marginBottom: "15px" }}>Sir/Madam:</div>
                  <div style={{ textIndent: "40px", fontSize: "10pt", textAlign: "justify", marginBottom: "15px" }}>
                    This is to inform you that our records show that the Real Estate tax due on the Property/ies registered in your name listed remain unpaid as of follows;
                  </div>

                  {/* 🌟 NEW TABLE DESIGN WITH DISCOUNT COLUMN AND MERGED PENALTIES */}
                  <table style={{ width: "100%", margin: "0 auto", borderCollapse: "collapse", border: "2px solid #000", fontSize: "10pt", textAlign: "center", marginBottom: "10px" }}>
                    <thead>
                      <tr>
                        <th rowSpan="2" style={{ border: "1px solid #000", padding: "4px" }}>PIN No.</th>
                        <th rowSpan="2" style={{ border: "1px solid #000", padding: "4px" }}>BRGY.</th>
                        <th rowSpan="2" style={{ border: "1px solid #000", padding: "4px" }}>YEAR</th>
                        <th rowSpan="2" style={{ border: "1px solid #000", padding: "4px" }}>ASSESSED<br/>VALUE</th>
                        <th rowSpan="2" style={{ border: "1px solid #000", padding: "4px" }}>No. of<br/>Years</th>
                        <th rowSpan="2" style={{ border: "1px solid #000", padding: "4px" }}>% of<br/>Penalty</th>
                        <th colSpan="2" style={{ border: "1px solid #000", padding: "4px" }}>PRINCIPAL</th>
                        <th rowSpan="2" style={{ border: "1px solid #000", padding: "4px" }}>Penalties</th>
                        <th rowSpan="2" style={{ border: "1px solid #000", padding: "4px" }}>Discount</th>
                        <th rowSpan="2" style={{ border: "1px solid #000", padding: "4px" }}>Total Due</th>
                      </tr>
                      <tr>
                        <th style={{ border: "1px solid #000", padding: "4px" }}>BASIC</th>
                        <th style={{ border: "1px solid #000", padding: "4px" }}>SEF</th>
                      </tr>
                    </thead>
                    <tbody>
                      {/* 🌟 MAP OVER displayRows which groups identical years automatically */}
                      {soaData.displayRows.map((row, idx) => (
                        <tr key={idx}>
                          <td style={{ border: "1px solid #000", padding: "6px" }}>{soaData.property.property_index_no || "—"}</td>
                          <td style={{ border: "1px solid #000", padding: "6px" }}>{soaData.property.barangay || "—"}</td>
                          <td style={{ border: "1px solid #000", padding: "6px" }}>{row.startYear === row.endYear ? row.startYear : `${row.startYear} - ${row.endYear}`}</td>
                          <td style={{ border: "1px solid #000", padding: "6px", textAlign: "right" }}>{fmt(row.av)}</td>
                          <td style={{ border: "1px solid #000", padding: "6px" }}>{row.count}</td>
                          <td style={{ border: "1px solid #000", padding: "6px" }}>{typeof row.penalty_percent === "number" ? `${(row.penalty_percent * 100).toFixed(0)}%` : row.penalty_percent}</td>
                          <td style={{ border: "1px solid #000", padding: "6px", textAlign: "right" }}>{fmt(row.basic)}</td>
                          <td style={{ border: "1px solid #000", padding: "6px", textAlign: "right" }}>{fmt(row.sef)}</td>
                          <td style={{ border: "1px solid #000", padding: "6px", textAlign: "right" }}>{fmt(row.penalty)}</td>
                          <td style={{ border: "1px solid #000", padding: "6px", textAlign: "right", color: row.discount > 0 ? "var(--green2)" : "inherit" }}>{row.discount > 0 ? `-${fmt(row.discount)}` : "0.00"}</td>
                          <td style={{ border: "1px solid #000", padding: "6px", textAlign: "right", fontWeight: "bold" }}>{fmt(row.total)}</td>
                        </tr>
                      ))}
                      {/* 🌟 GRAND TOTAL ROW */}
                      <tr style={{ background: "rgba(0,0,0,0.05)" }}>
                        <td colSpan="6" style={{ border: "1px solid #000", padding: "6px", textAlign: "right", fontWeight: "bold" }}>GRAND TOTAL:</td>
                        <td style={{ border: "1px solid #000", padding: "6px", textAlign: "right", fontWeight: "bold" }}>{fmt(soaData.totals.basic)}</td>
                        <td style={{ border: "1px solid #000", padding: "6px", textAlign: "right", fontWeight: "bold" }}>{fmt(soaData.totals.sef)}</td>
                        <td style={{ border: "1px solid #000", padding: "6px", textAlign: "right", fontWeight: "bold" }}>{fmt(soaData.totals.penalty)}</td>
                        <td style={{ border: "1px solid #000", padding: "6px", textAlign: "right", fontWeight: "bold", color: "var(--green2)" }}>{soaData.totals.discount > 0 ? `-${fmt(soaData.totals.discount)}` : "0.00"}</td>
                        <td style={{ border: "1px solid #000", padding: "6px", textAlign: "right", fontWeight: "bold", fontSize: "11pt" }}>{fmt(soaData.totals.total)}</td>
                      </tr>
                    </tbody>
                  </table>

                  <div style={{ textAlign: "center", fontSize: "10pt", marginTop: "10px", marginBottom: "25px" }}>
                    Computed as of {["January","February","March","April","May","June","July","August","September","October","November","December"][soaData.target_month-1]}, {new Date().getFullYear()}
                  </div>

                  <div style={{ textIndent: "40px", fontSize: "10pt", textAlign: "justify", marginBottom: "15px", lineHeight: "1.6" }}>
                    To avoid the inconveniences of a legal action which we may be compelled to pursue to enforce collection, you are given a period of <strong>FIFTEEN (15) DAYS</strong> from receipt hereof to fully settle the total real property tax due.
                  </div>
                  <div style={{ textIndent: "40px", fontSize: "10pt", textAlign: "justify", marginBottom: "40px", lineHeight: "1.6" }}>
                    However, if the above-mentioned taxes have already been paid, <strong>PLEASE DISREGARD THIS NOTICE</strong> and please present to us all the official receipts as evidence of full-payment and a photo copy of the present receipts for the proper adjustments of the records.
                  </div>

                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "50px", pageBreakInside: "avoid" }}>
                    <div>
                      <span style={{ fontSize: "10pt" }}>Prepared by:</span><br/><br/><br/><br/>
                      <strong style={{ fontSize: "11pt" }}>{preparedByName}</strong><br/>
                      <div style={{ fontSize: "11pt" }}>{preparedByRole}</div>
                    </div>
                    <div style={{ textAlign: "center" }}>
                      <span style={{ fontSize: "10pt" }}>Noted by:</span><br/><br/><br/><br/>
                      <strong style={{ fontSize: "11pt" }}>DINIA A. TAÑEDO</strong><br/>
                      <div style={{ fontSize: "11pt" }}>Municipal Treasurer</div>
                    </div>
                  </div>

                  <div style={{ textAlign: "left", fontSize: "10pt", lineHeight: "2", pageBreakInside: "avoid" }}>
                    <div>Date received: <span style={{display: "inline-block", borderBottom: "1px solid #000", width: "300px"}}></span></div>
                    <div>Signature: <span style={{display: "inline-block", borderBottom: "1px solid #000", width: "322px"}}></span></div>
                    <div>Printed Name: <span style={{display: "inline-block", borderBottom: "1px solid #000", width: "300px"}}></span></div>
                    <div>Property Owner/Administrator: <span style={{display: "inline-block", borderBottom: "1px solid #000", width: "198px"}}></span></div>
                  </div>
                </div>
                
                <div className="card-header no-print" style={{justifyContent: "center", gap: 10, borderTop: "1px solid #ccc", background: "#f8f9fa"}}>
                  <button className="btn btn-outline" onClick={() => window.print()}>🖨️ Print Document</button>
                  {!soaData.isSavedRecord && <button className="btn btn-success" onClick={saveSOA} disabled={saving}>{saving ? "Saving..." : "💾 Save to Registry"}</button>}
                </div>
              </div>
            </div>
          </>
        )}

        {/* 🌟 MASS SOA MODAL - IMPROVED AGGREGATION & DISCOUNT */}
        {massSoaData && (
          <>
            <style>{`
              @media print {
                @page { size: A4 portrait; margin: 15mm; }
                
                /* 1. RESET THE MAIN WINDOW */
                html, body, #root { 
                  height: auto !important; 
                  width: 100% !important;
                  overflow: visible !important; 
                  display: block !important;
                  margin: 0 !important;
                  padding: 0 !important;
                }
                
                body * { visibility: hidden !important; }
                
                /* 2. FREE THE MODAL BACKDROP (Kill flexbox centering) */
                .modal-backdrop {
                  position: absolute !important;
                  top: 0 !important; 
                  left: 0 !important;
                  width: 100% !important;
                  height: auto !important;
                  display: block !important; 
                  background: none !important;
                  padding: 0 !important;
                }

                .mass-soa-print-area, .mass-soa-print-area * { 
                  visibility: visible !important; 
                  color: #000 !important; 
                }
                
                /* 3. THE MAGIC FIX: KILL THE SCROLLBAR AND MAX-HEIGHT */
                .mass-soa-print-area { 
                  position: absolute !important; 
                  top: 0 !important; 
                  left: 0 !important;
                  width: 100% !important; 
                  max-height: none !important; /* Overrides your 90vh */
                  overflow: visible !important; /* Overrides your scrollbar */
                  display: block !important;
                  background: #fff !important; 
                  border: none !important; 
                  box-shadow: none !important;
                  margin: 0 !important; 
                  padding: 0 !important; 
                }

                /* 4. FORCE THE PAGE BREAK (and hide the dashed line on paper) */
                .page-break { 
                  page-break-after: always !important; 
                  break-after: page !important; 
                  display: block !important;
                  border-bottom: none !important; /* Prevents dashed line from printing */
                  margin-bottom: 0 !important;
                }

                .no-print { display: none !important; }
                
                /* 5. MAKE THE TABLE FIT */
                table { 
                  width: 100% !important; 
                  table-layout: auto !important;
                  border-collapse: collapse !important;
                }
                tr { page-break-inside: avoid; page-break-after: auto; }
                thead { display: table-header-group; }
                
                .mass-soa-print-area th, .mass-soa-print-area td { 
                  font-size: 8pt !important; 
                  padding: 4px !important; 
                }
              }
            `}</style>
            <div className="modal-backdrop" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.8)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
              <div className="card mass-soa-print-area" style={{ width: "850px", maxWidth: "100%", maxHeight: "90vh", overflowY: "auto", background: "#fff", color: "#000", fontFamily: "Arial, sans-serif" }}>
                
                <div className="card-header no-print" style={{ borderBottom: "1px solid #ccc", background: "#f8f9fa", position: "sticky", top: 0, zIndex: 10 }}>
                  <div><div className="card-title">Mass Print: Statement of Accounts</div><div className="card-sub">{massSoaData.length} documents ready to print</div></div>
                  <div style={{ display: "flex", gap: "10px" }}>
                    <button className="btn btn-primary btn-sm" onClick={() => window.print()}>🖨️ Print All</button>
                    <button className="btn btn-ghost btn-sm" onClick={() => setMassSoaData(null)}>✕ Close</button>
                  </div>
                </div>

                {massSoaData.map((data, index) => (
                  <div key={index} className={index !== massSoaData.length - 1 ? "page-break" : ""} style={{ padding: "40px 50px", borderBottom: index !== massSoaData.length - 1 ? "2px dashed #ccc" : "none" }}>
                    
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "25px", borderBottom: "2px solid #000", paddingBottom: "15px" }}>
                      <img src="https://i.postimg.cc/VktjPybt/macalelon-logo.png" alt="LGU Logo" style={{ width: "80px", height: "80px", objectFit: "contain" }} />
                      <div style={{ textAlign: "center", flex: 1 }}>
                        <div style={{ fontSize: "11pt" }}>Republic of the Philippines</div>
                        <div style={{ fontSize: "11pt" }}>Province of Quezon</div>
                        <div style={{ fontSize: "11pt", fontWeight: "bold" }}>MUNICIPALITY OF MACALELON</div>
                        <div style={{ fontSize: "11pt", fontWeight: "bold", marginTop: "10px" }}>OFFICE OF THE MUNICIPAL TREASURER</div>
                      </div>
                      <div style={{ width: "80px" }}></div>
                    </div>

                    <div style={{ textAlign: "left", marginBottom: "25px", fontSize: "10pt", lineHeight: "1.6" }}>
                      <div style={{ borderBottom: "1px solid #000", display: "inline-block", minWidth: "350px", fontWeight: "bold" }}>
                        {data.property.taxpayers?.firstname} {data.property.taxpayers?.lastname}
                      </div><br/>
                      <div style={{ borderBottom: "1px solid #000", display: "inline-block", minWidth: "350px" }}>
                        {data.property.taxpayers?.address || data.property.taxpayers?.barangay || "—"}
                      </div><br/>
                      <div style={{ borderBottom: "1px solid #000", display: "inline-block", minWidth: "350px" }}>MACALELON, QUEZON</div>
                    </div>

                    <div style={{ textAlign: "left", fontSize: "10pt", marginBottom: "15px" }}>Sir/Madam:</div>
                    <div style={{ textIndent: "40px", fontSize: "10pt", textAlign: "justify", marginBottom: "15px" }}>
                      This is to inform you that our records show that the Real Estate tax due on the Property/ies registered in your name listed remain unpaid as of follows;
                    </div>

                    <table style={{ width: "100%", margin: "0 auto", borderCollapse: "collapse", border: "2px solid #000", fontSize: "10pt", textAlign: "center", marginBottom: "10px" }}>
                      <thead>
                        <tr>
                          <th rowSpan="2" style={{ border: "1px solid #000", padding: "4px" }}>PIN No.</th>
                          <th rowSpan="2" style={{ border: "1px solid #000", padding: "4px" }}>BRGY.</th>
                          <th rowSpan="2" style={{ border: "1px solid #000", padding: "4px" }}>YEAR</th>
                          <th rowSpan="2" style={{ border: "1px solid #000", padding: "4px" }}>ASSESSED<br/>VALUE</th>
                          <th rowSpan="2" style={{ border: "1px solid #000", padding: "4px" }}>No. of<br/>Years</th>
                          <th rowSpan="2" style={{ border: "1px solid #000", padding: "4px" }}>% of<br/>Penalty</th>
                          <th colSpan="2" style={{ border: "1px solid #000", padding: "4px" }}>PRINCIPAL</th>
                          <th rowSpan="2" style={{ border: "1px solid #000", padding: "4px" }}>Penalties</th>
                          <th rowSpan="2" style={{ border: "1px solid #000", padding: "4px" }}>Discount</th>
                          <th rowSpan="2" style={{ border: "1px solid #000", padding: "4px" }}>Total Due</th>
                        </tr>
                        <tr>
                          <th style={{ border: "1px solid #000", padding: "4px" }}>BASIC</th>
                          <th style={{ border: "1px solid #000", padding: "4px" }}>SEF</th>
                        </tr>
                      </thead>
                      <tbody>
                        {data.displayRows.map((row, idx) => (
                          <tr key={idx}>
                            <td style={{ border: "1px solid #000", padding: "6px" }}>{data.property.property_index_no || "—"}</td>
                            <td style={{ border: "1px solid #000", padding: "6px" }}>{data.property.barangay || "—"}</td>
                            <td style={{ border: "1px solid #000", padding: "6px" }}>{row.startYear === row.endYear ? row.startYear : `${row.startYear} - ${row.endYear}`}</td>
                            <td style={{ border: "1px solid #000", padding: "6px", textAlign: "right" }}>{fmt(row.av)}</td>
                            <td style={{ border: "1px solid #000", padding: "6px" }}>{row.count}</td>
                            <td style={{ border: "1px solid #000", padding: "6px" }}>{typeof row.penalty_percent === "number" ? `${(row.penalty_percent * 100).toFixed(0)}%` : row.penalty_percent}</td>
                            <td style={{ border: "1px solid #000", padding: "6px", textAlign: "right" }}>{fmt(row.basic)}</td>
                            <td style={{ border: "1px solid #000", padding: "6px", textAlign: "right" }}>{fmt(row.sef)}</td>
                            <td style={{ border: "1px solid #000", padding: "6px", textAlign: "right" }}>{fmt(row.penalty)}</td>
                            <td style={{ border: "1px solid #000", padding: "6px", textAlign: "right", color: row.discount > 0 ? "var(--green2)" : "inherit" }}>{row.discount > 0 ? `-${fmt(row.discount)}` : "0.00"}</td>
                            <td style={{ border: "1px solid #000", padding: "6px", textAlign: "right", fontWeight: "bold" }}>{fmt(row.total)}</td>
                          </tr>
                        ))}
                        {/* 🌟 GRAND TOTAL ROW */}
                        <tr style={{ background: "rgba(0,0,0,0.05)" }}>
                          <td colSpan="6" style={{ border: "1px solid #000", padding: "6px", textAlign: "right", fontWeight: "bold" }}>GRAND TOTAL:</td>
                          <td style={{ border: "1px solid #000", padding: "6px", textAlign: "right", fontWeight: "bold" }}>{fmt(data.totals.basic)}</td>
                          <td style={{ border: "1px solid #000", padding: "6px", textAlign: "right", fontWeight: "bold" }}>{fmt(data.totals.sef)}</td>
                          <td style={{ border: "1px solid #000", padding: "6px", textAlign: "right", fontWeight: "bold" }}>{fmt(data.totals.penalty)}</td>
                          <td style={{ border: "1px solid #000", padding: "6px", textAlign: "right", fontWeight: "bold", color: "var(--green2)" }}>{data.totals.discount > 0 ? `-${fmt(data.totals.discount)}` : "0.00"}</td>
                          <td style={{ border: "1px solid #000", padding: "6px", textAlign: "right", fontWeight: "bold", fontSize: "11pt" }}>{fmt(data.totals.total)}</td>
                        </tr>
                      </tbody>
                    </table>

                    <div style={{ textAlign: "center", fontSize: "10pt", marginTop: "10px", marginBottom: "25px" }}>
                      Computed as of {["January","February","March","April","May","June","July","August","September","October","November","December"][data.target_month-1]}, {new Date().getFullYear()}
                    </div>

                    <div style={{ textIndent: "40px", fontSize: "10pt", textAlign: "justify", marginBottom: "15px", lineHeight: "1.6" }}>
                      To avoid the inconveniences of a legal action which we may be compelled to pursue to enforce collection, you are given a period of <strong>FIFTEEN (15) DAYS</strong> from receipt hereof to fully settle the total real property tax due.
                    </div>
                    <div style={{ textIndent: "40px", fontSize: "10pt", textAlign: "justify", marginBottom: "40px", lineHeight: "1.6" }}>
                      However, if the above-mentioned taxes have already been paid, <strong>PLEASE DISREGARD THIS NOTICE</strong> and please present to us all the official receipts as evidence of full-payment and a photo copy of the present receipts for the proper adjustments of the records.
                    </div>

                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "50px", pageBreakInside: "avoid" }}>
                      <div>
                        <span style={{ fontSize: "10pt" }}>Prepared by:</span><br/><br/><br/><br/>
                        <strong style={{ fontSize: "11pt" }}>{preparedByName}</strong><br/>
                        <div style={{ fontSize: "11pt" }}>{preparedByRole}</div>
                      </div>
                      <div style={{ textAlign: "center" }}>
                        <span style={{ fontSize: "10pt" }}>Noted by:</span><br/><br/><br/><br/>
                        <strong style={{ fontSize: "11pt" }}>DINIA A. TAÑEDO</strong><br/>
                        <div style={{ fontSize: "11pt" }}>Municipal Treasurer</div>
                      </div>
                    </div>

                    <div style={{ textAlign: "left", fontSize: "10pt", lineHeight: "2", pageBreakInside: "avoid" }}>
                      <div>Date received: <span style={{display: "inline-block", borderBottom: "1px solid #000", width: "300px"}}></span></div>
                      <div>Signature: <span style={{display: "inline-block", borderBottom: "1px solid #000", width: "322px"}}></span></div>
                      <div>Printed Name: <span style={{display: "inline-block", borderBottom: "1px solid #000", width: "300px"}}></span></div>
                      <div>Property Owner/Administrator: <span style={{display: "inline-block", borderBottom: "1px solid #000", width: "198px"}}></span></div>
                    </div>
                  </div>
                ))}

              </div>
            </div>
          </>
        )}

        <div className="card">
          <div className="card-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div><div className="card-title">Delinquent Accounts</div><span className="chip">{filteredGroupedList.length} filtered accounts</span></div>
            <div style={{ display: "flex", gap: "10px" }}>
              <button className="btn btn-primary btn-sm" onClick={prepareMassSOA} disabled={filteredGroupedList.length === 0}>
                🖨️ Mass Print SOAs
              </button>
              {["admin", "treasurer"].includes(profile?.role) && (
                <>
                  <button className="btn btn-gold btn-sm" onClick={handleBatchRecalculate} disabled={recalculating || filteredGroupedList.length === 0}>
                    {recalculating ? "..." : "🔄 Batch Recalculate"}
                  </button>
                  
                  {/* 🌟 NEW: The Year-End Rollover Button */}
                  <button className="btn btn-danger btn-sm" onClick={handleGenerateReceivables} disabled={generating || recalculating}>
                    {generating ? "Generating..." : "📅 Generate Receivables"}
                  </button>
                </>
              )}
            </div>
          </div>
          
          <div className="searchbar" style={{ padding: "16px", borderBottom: "1px solid var(--border)", background: "var(--bg2)", display: "flex", gap: "10px" }}>
            <input 
              placeholder="Search by Taxpayer Name, Code, PIN, or TD No..." 
              value={q} 
              onChange={e => setQ(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') load(); }}
              style={{ flex: 2 }}
            />
            <select value={brgyFilter} onChange={(e) => setBrgyFilter(e.target.value)} style={{ flex: 1, fontWeight: "bold" }}>
              <option value="">— ALL BARANGAYS —</option>
              {barangays.map(b => <option key={b} value={b}>{b}</option>)}
            </select>
            <button className="btn btn-outline" onClick={load}>🔍 Search</button>
          </div>

          {loading
            ? <div className="loading-state"><span className="spin"/>Loading delinquency records…</div>
            : list.length===0
              ? <div className="empty"><div className="empty-icon">✅</div><div className="empty-text">No delinquent accounts matched your search.</div></div>
              : <div className="table-wrap"><table>
                  <thead><tr><th>PIN No.</th><th>Property Location</th><th>Owner & Address</th><th>Year(s)</th><th>Months</th><th>Basic + SEF</th><th>Interest</th><th>Total Due</th><th>Actions</th></tr></thead>
                  <tbody>
                    {filteredGroupedList.map(d=>(
                      <tr key={d.property_id}>
                        <td>
                          <span className="mono" style={{color: "var(--blue2)", fontWeight: "bold"}}>{d.properties?.property_index_no || "—"}</span>
                        </td>
                        <td>
                          <span style={{fontSize: "12px"}}>{d.properties?.barangay || "—"}</span>
                        </td>
                        <td>
                          <div style={{fontWeight:600}}>{d.taxpayers?`${d.taxpayers.lastname}, ${d.taxpayers.firstname}`:"—"}</div>
                          <div style={{fontSize: 10, color: "var(--text3)", marginTop: 2}}>
                            {d.taxpayers?.address || d.taxpayers?.barangay || "—"}
                          </div>
                        </td>
                        <td><span className="chip">{d.minYear === d.maxYear ? d.minYear : `${d.minYear} - ${d.maxYear}`}</span></td>
                        <td><span className="mono">{d.months_delinquent} mos.</span></td>
                        <td><span className="mono">{fmt(d.sum_basic + d.sum_sef)}</span></td>
                        <td><span className="mono" style={{color:"var(--red2)",fontWeight:600}}>{fmt(d.sum_int)}</span></td>
                        <td><span className="mono" style={{color:"var(--gold2)",fontWeight:700,fontSize:13}}>{fmt(d.sum_total)}</span></td>
                        <td>
                          <div style={{display: "flex", gap: "6px"}}>
                            <button className="btn btn-ghost btn-xs" style={{color: "var(--blue2)"}} onClick={() => viewSavedSOA(d)}>🖨️ SOA</button>
                            <button className="btn btn-ghost btn-xs" style={{color: "var(--gold)"}} onClick={() => handleRecalculate(d)} disabled={recalculating}>{recalculating ? "..." : "🔄 Recalc"}</button>
                            {["admin", "treasurer"].includes(profile?.role) && <button className="btn btn-ghost btn-xs" style={{color: "var(--red2)"}} onClick={() => handleDeleteGroup(d)} disabled={deleting}>✕ Delete</button>}
                          </div>
                        </td>
                      </tr>
                    ))}
                    <tr style={{background:"rgba(0,0,0,0.25)"}}>
                      <td colSpan={7} style={{fontWeight:700,fontSize:12,fontFamily:"var(--font-mono)",color:"var(--text3)"}}>GRAND TOTAL</td>
                      <td><span className="mono" style={{fontWeight:800,color:"var(--gold2)",fontSize:14}}>{fmt(totals.due)}</span></td>
                      <td/>
                    </tr>
                  </tbody>
                </table></div>
          }
        </div>
      </div>
    </>
  );
}
/* ═══════════════════════════════════════════════════════════
   RECEIPTS (WITH SMART FILTER SEARCH)
═══════════════════════════════════════════════════════════ */
function Receipts({ token, profile }) {
  const [list,setList]   = useState([]);
  const [loading,setLoading] = useState(true);
  const [page,setPage]   = useState(0);
  const [deleting,setDeleting] = useState(false);
  const [q, setQ]        = useState("");
  const PER = 25;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      let filterStr = "";
      
      if (q) {
        // 1. Search by PIN or TD No
        const props = await db.select("properties", { filter: `or=(property_index_no.ilike.*${q}*,td_number.ilike.*${q}*)`, select: "id" }, token);
        const propIds = props.map(p => p.id);
        
        // 2. Search by Owner Name
        const tps = await db.select("taxpayers", { filter: `or=(lastname.ilike.*${q}*,firstname.ilike.*${q}*)`, select: "id" }, token);
        const tpIds = tps.map(t => t.id);

        let orConditions = [`or_number.ilike.*${q}*`, `paid_by.ilike.*${q}*`];
        if (propIds.length > 0) orConditions.push(`property_id.in.(${propIds.join(',')})`);
        if (tpIds.length > 0) orConditions.push(`taxpayer_id.in.(${tpIds.join(',')})`);

        filterStr = `or=(${orConditions.join(',')})`;
      }

      const d = await db.select("collections",{
        select:"id,or_number,payment_date,total_paid,basic_tax,sef_tax,payment_method,tax_year,is_voided,paid_by,taxpayers(lastname,firstname),properties(property_index_no)",
        filter: filterStr,
        order:"created_at.desc", limit:PER, offset:page*PER,
      },token);
      setList(d || []);
    } catch(e){console.error(e);}
    setLoading(false);
  },[token,page,q]);

  useEffect(() => { load(); }, [load]);

  const handleDelete = async (rec) => {
    if (!window.confirm(`Permanently delete Receipt ${rec.or_number}? This cannot be undone.`)) return;
    setDeleting(true);
    try {
      try { await db.delete("official_receipts", { filter: `collection_id=eq.${rec.id}` }, token); } catch(e){}
      await db.delete("collections", { filter: `or_number=eq.${rec.or_number}` }, token); 
      load(); 
    } catch(e) { alert("Failed to delete receipt: " + e.message); }
    setDeleting(false);
  };
  
  const groupedList = Object.values(list.reduce((acc, c) => {
    if (!acc[c.or_number]) {
      acc[c.or_number] = { ...c, sum_total: 0, sum_basic: 0, sum_sef: 0, minYear: parseInt(c.tax_year), maxYear: parseInt(c.tax_year), rowIds: [] };
    }
    acc[c.or_number].sum_total += parseFloat(c.total_paid) || 0;
    acc[c.or_number].sum_basic += parseFloat(c.basic_tax) || 0;
    acc[c.or_number].sum_sef += parseFloat(c.sef_tax) || 0;
    acc[c.or_number].minYear = Math.min(acc[c.or_number].minYear, parseInt(c.tax_year));
    acc[c.or_number].maxYear = Math.max(acc[c.or_number].maxYear, parseInt(c.tax_year));
    acc[c.or_number].rowIds.push(c.id);
    return acc;
  }, {}));

  return (
    <>
      <div className="topbar"><div className="topbar-left"><h1>Official Receipts</h1><p>OR REGISTER & LEDGER</p></div></div>
      <div className="page-body">
        <div className="card">
          <div className="card-header"><div className="card-title">OR Register</div></div>
          
          {/* 🌟 SEARCH BAR */}
          <div className="searchbar" style={{ padding: "16px", borderBottom: "1px solid var(--border)", background: "var(--bg2)" }}>
            <input 
              placeholder="Search by OR Number, Name of Payor/Owner, PIN, or TD No..." 
              value={q} 
              onChange={e => setQ(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') { setPage(0); load(); } }}
              style={{ flex: 1 }}
            />
            <button className="btn btn-outline" onClick={() => { setPage(0); load(); }}>🔍 Search</button>
          </div>

          {loading
            ? <div className="loading-state"><span className="spin"/>Loading receipts…</div>
            : list.length===0
              ? <div className="empty"><div className="empty-icon">🧾</div><div className="empty-text">No receipts matched your search.</div></div>
              : <div className="table-wrap"><table>
                  <thead><tr><th>OR Number</th><th>Date</th><th>Taxpayer / Payor</th><th>PIN</th><th>Year(s)</th><th>Basic</th><th>SEF</th><th>Total</th><th>Method</th><th>Status</th><th></th></tr></thead>
                  <tbody>
                    {groupedList.map((c,i)=>(
                      <tr key={i}>
                        <td><span className="badge badge-blue">{c.or_number}</span></td>
                        <td><span className="mono-sm">{c.payment_date}</span></td>
                        <td style={{fontWeight:600,fontSize:13}}>
                          {c.taxpayers ? `${c.taxpayers.lastname}, ${c.taxpayers.firstname}` : "—"}
                          {c.paid_by && (<div style={{fontSize: 10, color: "var(--text3)", marginTop: 2, fontWeight: "normal"}}>Paid by: {c.paid_by}</div>)}
                        </td>
                        <td><span className="mono-sm" style={{color: "var(--blue2)", fontWeight: "bold"}}>{c.properties?.property_index_no || "—"}</span></td>
                        <td><span className="chip">{c.minYear === c.maxYear ? c.minYear : `${c.minYear}-${c.maxYear}`}</span></td>
                        <td><span className="mono">{fmt(c.sum_basic)}</span></td>
                        <td><span className="mono">{fmt(c.sum_sef)}</span></td>
                        <td><span className="mono" style={{color:"var(--green2)",fontWeight:700}}>{fmt(c.sum_total)}</span></td>
                        <td><span className="chip">{c.payment_method}</span></td>
                        <td><span className={`badge ${c.is_voided?"badge-red":"badge-green"}`}>{c.is_voided?"VOIDED":"VALID"}</span></td>
                        <td>
                          {["admin", "treasurer"].includes(profile?.role) && (
                            <button className="btn btn-ghost btn-xs" style={{color: "var(--red2)"}} onClick={() => handleDelete(c)} disabled={deleting}>✕</button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>                
                </table></div>
          }
          <div className="pagination">
            <span className="pg-info">Page {page+1} · {list.length} record(s)</span>
            <div className="pg-btns">
              <button className="pg-btn" onClick={()=>setPage(p=>Math.max(0,p-1))} disabled={page===0}>← Prev</button>
              <button className="pg-btn" onClick={()=>setPage(p=>p+1)} disabled={list.length<PER}>Next →</button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
/* ═══════════════════════════════════════════════════════════
   REPORTS (WITH EXCEL-STYLE SUMMARY & DETAILED LEDGERS)
═══════════════════════════════════════════════════════════ */
function Reports({ token, profile }) {
  const getToday = () => {
    try { return new Date().toISOString().split('T')[0]; } 
    catch(e) { return "2024-01-01"; }
  };

  const [tab, setTab] = useState("daily");
  const [date, setDate] = useState(getToday());
  const [data, setData] = useState([]);
  
  const [barangayData, setBarangayData] = useState([]); 
  const [classData, setClassData] = useState([]); 
  
  // New States for the Provincial Ledger
  const [selectedBrgy, setSelectedBrgy] = useState("ALL");
  const [ledgerView, setLedgerView] = useState("SUMMARY"); // "SUMMARY" or "DETAILED"
  const [yearFilter, setYearFilter] = useState("ALL"); // "ALL", "2001_BELOW", "2002_UP"

  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const fmt = (num) => {
    const n = parseFloat(num);
    return isNaN(n) ? "0.00" : n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const PIE_COLORS = ['var(--blue)', 'var(--green2)', 'var(--gold2)', 'var(--red2)', '#8b5cf6'];
  const barangays = [
    "AMONTAY", "ANOS", "BUYAO", "CALANTAS", "CANDANGAL", "LAHING", 
    "LUCTOB", "MABINI IBABA", "MABINI ILAYA", "MALABAHAY", "MAMBOG", 
    "OLONGTAO IBABA", "OLONGTAO ILAYA", "PADRE HERRERA", "PAJARILLO", 
    "PINAGBAYANAN", "SAN ISIDRO", "SAN JOSE", "SAN NICOLAS", "SAN VICENTE", 
    "TAGUIN", "TUBIGAN IBABA", "TUBIGAN ILAYA", "VISTA HERMOSA", 
    "CASTILLO (POB.)", "DAMAYAN (POB.)", "MASIPAG (POB.)", "PAG-ASA (POB.)", 
    "RIZAL (POB.)", "RODRIGUEZ (POB.)"
  ];

  useEffect(() => {
    let isMounted = true;

    const loadData = async () => {
      setLoading(true);
      try {
        if (tab === "analytics") {
          const p = await db.select("properties", { select: "barangay, classification", limit: 50000 }, token);
          const safeP = Array.isArray(p) ? p : [];
          
          const bCounts = {};
          const cCounts = {};

          safeP.forEach(curr => {
            const brgy = (curr && curr.barangay) ? String(curr.barangay).trim().toUpperCase() : "UNSPECIFIED";
            const cls = (curr && curr.classification) ? String(curr.classification).trim() : "Unclassified";
            bCounts[brgy] = (bCounts[brgy] || 0) + 1;
            cCounts[cls] = (cCounts[cls] || 0) + 1;
          });
          
          const bFormatted = Object.keys(bCounts).map(name => ({ name: name, count: bCounts[name] })).sort((a, b) => b.count - a.count);
          const cFormatted = Object.keys(cCounts).map(name => ({ name: name, count: cCounts[name] })).sort((a, b) => b.count - a.count);
            
          if (isMounted) {
            setBarangayData(bFormatted);
            setClassData(cFormatted);
            setLoading(false);
          }
          return;
        }

        if (tab === "provincial") {
          const propsData = await db.select("properties", { select: "*, taxpayers(*)" }, token);
          const delinqData = await db.select("delinquency", { filter: "status=eq.UNPAID", select: "*" }, token);
          const asmtData = await db.select("assessments", { select: "property_id, tax_year, assessed_value", order: "tax_year.desc" }, token);
          
          const safeProps = Array.isArray(propsData) ? propsData : [];
          const safeDelinqs = Array.isArray(delinqData) ? delinqData : [];
          const safeAsmts = Array.isArray(asmtData) ? asmtData : [];
          
          const enrichedProps = safeProps.map(p => {
             return { 
               ...p, 
               delinquency: safeDelinqs.filter(d => d.property_id === p.id),
               assessments: safeAsmts.filter(a => a.property_id === p.id) 
             };
          });

          if (isMounted) { setData(enrichedProps); setLoading(false); }
          return;
        }

        if (tab === "delinq") {
          const d = await db.select("delinquency",{filter:"status=eq.UNPAID",select:"property_id,*,properties(td_number,property_index_no),taxpayers(lastname,firstname)",order:"months_delinquent.desc"},token);
          if (isMounted) { setData(Array.isArray(d) ? d : []); setLoading(false); }
          return;
        }
        
        const safeDateStr = String(date || getToday());
        const filter = tab === "daily"
          ? `payment_date=eq.${safeDateStr}&is_voided=eq.false`
          : `payment_date=gte.${safeDateStr.slice(0,7)}-01&payment_date=lte.${safeDateStr.slice(0,7)}-31&is_voided=eq.false`;
        
        const d = await db.select("collections",{filter,select:"id,*,taxpayers(lastname,firstname)",order:"created_at.asc"},token);
        if (isMounted) { setData(Array.isArray(d) ? d : []); }

      } catch(e) { console.error("Report Load Error:", e); }
      if (isMounted) setLoading(false);
    };

    loadData();

    return () => { isMounted = false; };
  }, [tab, date, token]);

  const handleDelete = async (item, type) => {
    if (!window.confirm(`Permanently delete this ${type} record?`)) return;
    setDeleting(true);
    try {
      if (type === "collection") {
        try { await db.delete("official_receipts", { filter: `or_number=eq.${item.or_number}` }, token); } catch(e){}
        await db.delete("collections", { filter: `or_number=eq.${item.or_number}` }, token);
      } else {
        await db.delete("delinquency", { filter: `id=eq.${item.id}` }, token);
      }
      setTab(tab + " "); setTimeout(() => setTab(tab.trim()), 10);
    } catch(e) { alert("Delete failed: " + e.message); }
    setDeleting(false);
  };

  const safeData = Array.isArray(data) ? data : [];
  const safeClassData = Array.isArray(classData) ? classData : [];
  const safeBarangayData = Array.isArray(barangayData) ? barangayData : [];

  // Variables for Daily/Monthly
  let sumBasic = 0; let sumSef = 0; let sumPen = 0; let sumTot = 0;
  let groupedData = [];

  if (tab === "daily" || tab === "monthly") {
    safeData.forEach(c => {
      if (c) {
        sumBasic += parseFloat(c.basic_tax) || 0;
        sumSef += parseFloat(c.sef_tax) || 0;
        sumPen += parseFloat(c.penalty) || 0;
        sumTot += parseFloat(c.total_paid) || 0;
      }
    });

    const acc = {};
    safeData.forEach(c => {
      if (!c || !c.or_number) return;
      const or_no = String(c.or_number);
      if (!acc[or_no]) {
        acc[or_no] = { 
          ...c, 
          sum_total: 0, sum_basic: 0, sum_sef: 0, sum_penalty: 0,
          minYear: parseInt(c.tax_year) || new Date().getFullYear(), 
          maxYear: parseInt(c.tax_year) || new Date().getFullYear()
        };
      }
      acc[or_no].sum_total += parseFloat(c.total_paid) || 0;
      acc[or_no].sum_basic += parseFloat(c.basic_tax) || 0;
      acc[or_no].sum_sef += parseFloat(c.sef_tax) || 0;
      acc[or_no].sum_penalty += parseFloat(c.penalty) || 0;
      const yr = parseInt(c.tax_year);
      if (!isNaN(yr)) {
        if (yr < acc[or_no].minYear) acc[or_no].minYear = yr;
        if (yr > acc[or_no].maxYear) acc[or_no].maxYear = yr;
      }
    });
    groupedData = Object.values(acc);
  }

  // 🌟 DELINQUENCY AGING LOGIC 🌟
  let groupedAging = [];
  let delinqGrandTotal = 0;
  
  if (tab === "delinq") {
    groupedAging = Object.values(safeData.reduce((acc, d) => {
      const pid = d.property_id;
      if (!acc[pid]) {
        acc[pid] = { 
          ...d, 
          minYear: parseInt(d.tax_year), 
          maxYear: parseInt(d.tax_year), 
          sum_base: 0, 
          sum_int: 0, 
          sum_total: 0 
        };
      }
      acc[pid].minYear = Math.min(acc[pid].minYear, parseInt(d.tax_year));
      acc[pid].maxYear = Math.max(acc[pid].maxYear, parseInt(d.tax_year));
      
      const b = parseFloat(d.unpaid_basic) || 0;
      const s = parseFloat(d.unpaid_sef) || 0;
      
      acc[pid].sum_base += (b + s);
      acc[pid].sum_int += parseFloat(d.interest_amount) || 0;
      acc[pid].sum_total += parseFloat(d.total_due) || 0;
      acc[pid].months_delinquent = Math.max(acc[pid].months_delinquent || 0, d.months_delinquent || 0);
      
      delinqGrandTotal += parseFloat(d.total_due) || 0;
      
      return acc;
    }, {}));
  }

  // 🌟 PROVINCIAL LEDGER LOGIC 🌟
  let processedProvincial = [];
  let summaryByBarangay = {}; // For the SUMMARY view
  let provSummary = { av: 0, basic: 0, basicPen: 0, sef: 0, sefPen: 0, total: 0, count: 0 };

  if (tab === "provincial") {
    const targetBrgy = String(selectedBrgy || "ALL").replace("(POB.)", "").replace("POB.", "").trim().toUpperCase();

    safeData.forEach(p => {
      if (!p) return;
      
      const rawBrgyFull = String((p.properties && p.properties.barangay) || p.barangay || "UNASSIGNED").toUpperCase();
      const rawBrgy = rawBrgyFull.replace("(POB.)", "").replace("POB.", "").trim();
      
      if (selectedBrgy !== "ALL" && rawBrgy !== targetBrgy && !rawBrgy.includes(targetBrgy) && !targetBrgy.includes(rawBrgy)) return;

      const ln = (p.taxpayers && p.taxpayers.lastname) || '';
      const fn = (p.taxpayers && p.taxpayers.firstname) || '';
      const ownerName = ln || fn ? `${fn} ${ln}`.trim().toUpperCase() : "—";
      const pin = (p.properties && p.properties.property_index_no) || p.property_index_no || "—";
      const cls = (p.properties && p.properties.classification) || p.classification || "—";

      let hasMatchingDelinquency = false;

      if (Array.isArray(p.delinquency) && p.delinquency.length > 0) {
        
        let minYear = 9999;
        let maxYear = 0;
        let pBasic = 0;
        let pSef = 0;
        let pBasicPen = 0;
        let pSefPen = 0;
        let pTotal = 0;

        p.delinquency.forEach(del => {
            const y = parseInt(del.tax_year);
            if (yearFilter === "2001_BELOW" && y > 2001) return;
            if (yearFilter === "2002_UP" && y <= 2001) return;

            hasMatchingDelinquency = true;
            if (y < minYear) minYear = y;
            if (y > maxYear) maxYear = y;

            const b = parseFloat(del.unpaid_basic) || 0;
            const s = parseFloat(del.unpaid_sef) || 0;
            const totalPen = parseFloat(del.interest_amount) || 0;
            
            pBasic += b;
            pSef += s;
            pBasicPen += (totalPen / 2);
            pSefPen += (totalPen / 2);
            pTotal += parseFloat(del.total_due) || 0;
        });

        if (hasMatchingDelinquency) {
            let historicalAv = parseFloat((p.properties && p.properties.assessed_value) || p.assessed_value) || 0;
            
            if (Array.isArray(p.assessments) && p.assessments.length > 0) {
               const sortedAsmts = [...p.assessments].sort((a,b) => parseInt(b.tax_year) - parseInt(a.tax_year));
               
               if (yearFilter === "2001_BELOW") {
                   const activeAsmt = sortedAsmts.find(a => parseInt(a.tax_year) <= 2001);
                   if (activeAsmt && activeAsmt.assessed_value) {
                       historicalAv = parseFloat(activeAsmt.assessed_value);
                   } else {
                       historicalAv = parseFloat(sortedAsmts[sortedAsmts.length - 1].assessed_value) || historicalAv;
                   }
               }
            }

            processedProvincial.push({
                pin: pin, owner: ownerName, classification: cls, location: rawBrgyFull,
                av: historicalAv, from: minYear, to: maxYear,
                basic: pBasic, basicPen: pBasicPen, sef: pSef, sefPen: pSefPen, total: pTotal
            });

            if (!summaryByBarangay[rawBrgyFull]) {
                summaryByBarangay[rawBrgyFull] = { name: rawBrgyFull, basic: 0, basicPen: 0, sef: 0, sefPen: 0, total: 0 };
            }
            summaryByBarangay[rawBrgyFull].basic += pBasic;
            summaryByBarangay[rawBrgyFull].basicPen += pBasicPen;
            summaryByBarangay[rawBrgyFull].sef += pSef;
            summaryByBarangay[rawBrgyFull].sefPen += pSefPen;
            summaryByBarangay[rawBrgyFull].total += pTotal;
        }
      }
    });

    processedProvincial.sort((a, b) => a.location.localeCompare(b.location) || a.owner.localeCompare(b.owner));
    processedProvincial.forEach(row => {
      provSummary.av += row.av; provSummary.basic += row.basic; provSummary.basicPen += row.basicPen;
      provSummary.sef += row.sef; provSummary.sefPen += row.sefPen; provSummary.total += row.total;
    });
    provSummary.count = processedProvincial.length;
  }

  let totalRpus = 0;
  safeClassData.forEach(c => { totalRpus += (parseInt(c.count) || 0); });

  let maxBrgyCount = 1;
  safeBarangayData.forEach(b => {
    const count = parseInt(b.count) || 0;
    if (count > maxBrgyCount) maxBrgyCount = count;
  });

  return (
    <>
      <div className="topbar no-print">
        <div className="topbar-left"><h1>Reports & Analytics</h1><p>COA-COMPLIANT TREASURY REPORTS & DATA VISUALIZATION</p></div>
        <div className="topbar-right">
          {tab === "provincial" && <button className="btn btn-primary" onClick={() => window.print()}>🖨️ Print Report</button>}
          {(tab !== "analytics" && tab !== "provincial") && <input type="date" value={date} onChange={e=>setDate(String(e.target.value))} style={{width:168}}/>}
        </div>
      </div>
      <div className="page-body">
        <div className="tabs-bar no-print">
          {[["daily","Daily Collection"],["monthly","Monthly Summary"],["provincial","🏢 Provincial Query"],["delinq","Delinquency Aging"],["analytics","📊 Analytics (RPUs)"]].map(([id,label])=>(
            <button key={id} className={`tab-btn ${tab===id?"active":""}`} onClick={()=>setTab(id)}>{label}</button>
          ))}
        </div>

        {loading ? <div className="loading-state"><span className="spin"/>Loading data…</div> : <>
          
          {/* ═══════════════════════════════════════════════════════════
              TAB: ANALYTICS (RECHARTS IMPLEMENTATION)
          ═══════════════════════════════════════════════════════════ */}
          {tab === "analytics" && (
            <>
               <div className="banner" style={{ marginBottom: "20px", background: "var(--blue)", color: "white", borderRadius: "12px", padding: "16px 24px", display: "flex", alignItems: "center", gap: "12px", boxShadow: "0 4px 6px rgba(0,0,0,0.1)" }}>
                <span style={{ fontSize: "28px" }}>🏢</span>
                <div>
                  <div style={{ fontSize: "13px", opacity: 0.9, textTransform: "uppercase", letterSpacing: "1px", fontWeight: "bold" }}>Total Registered Property Units</div>
                  <div style={{ fontSize: "24px", fontWeight: "800" }}>{totalRpus.toLocaleString()} RPUs in Database</div>
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>
                
                {/* 🌟 1. RECHARTS: PIE CHART FOR CLASSIFICATIONS */}
                <div className="card">
                  <div className="card-header">
                    <div>
                      <div className="card-title">Property Classifications</div>
                      <div className="card-sub">Distribution of Land Use</div>
                    </div>
                  </div>
                  <div className="card-body" style={{ padding: "20px 0" }}>
                    {safeClassData.length === 0 ? (
                      <div className="empty" style={{ padding: "40px 0" }}><div className="empty-icon">📊</div><div className="empty-text">No data available</div></div>
                    ) : (
                      <div style={{ height: "400px", width: "100%" }}>
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={safeClassData}
                              cx="50%"
                              cy="50%"
                              innerRadius={80}
                              outerRadius={120}
                              paddingAngle={5}
                              dataKey="count"
                              nameKey="name"
                              label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                            >
                              {safeClassData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                              ))}
                            </Pie>
                            <Tooltip formatter={(value) => [value, "RPUs"]} />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>
                    )}
                  </div>
                </div>

                {/* 🌟 2. RECHARTS: HORIZONTAL BAR CHART FOR BARANGAYS */}
                <div className="card">
                  <div className="card-header">
                    <div>
                      <div className="card-title">RPUs per Barangay</div>
                      <div className="card-sub">Density of registered properties</div>
                    </div>
                  </div>
                  <div className="card-body" style={{ padding: "20px 24px 24px 0", maxHeight: "500px", overflowY: "auto" }}>
                    {safeBarangayData.length === 0 ? (
                      <div className="empty"><div className="empty-icon">🗺️</div><div className="empty-text">No data available</div></div>
                    ) : (
                      <div style={{ width: "100%", height: Math.max(400, safeBarangayData.length * 35) }}>
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart
                            layout="vertical"
                            data={safeBarangayData}
                            margin={{ top: 5, right: 30, left: 40, bottom: 5 }}
                          >
                            <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="var(--border)" />
                            <XAxis type="number" stroke="var(--text3)" fontSize={12} />
                            <YAxis 
                              dataKey="name" 
                              type="category" 
                              width={100} 
                              stroke="var(--text2)" 
                              fontSize={11} 
                              fontWeight="bold"
                              tick={{fill: 'var(--text2)'}} 
                            />
                            <Tooltip 
                              cursor={{fill: 'var(--bg3)'}} 
                              contentStyle={{backgroundColor: 'var(--bg2)', borderColor: 'var(--border)', color: 'var(--text)', borderRadius: '8px'}}
                              formatter={(value) => [value, "Registered Properties"]}
                            />
                            <Bar dataKey="count" fill="var(--blue)" radius={[0, 4, 4, 0]}>
                              {safeBarangayData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.count === maxBrgyCount ? "var(--gold)" : "var(--blue)"} />
                              ))}
                            </Bar>
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    )}
                  </div>
                </div>

              </div>
            </>
          )}

          {/* ═══════════════════════════════════════════════════════════
              TAB: PROVINCIAL REPORT QUERY (EXCEL STYLE)
          ═══════════════════════════════════════════════════════════ */}
          {tab === "provincial" && (
            <>
              <style>{`
                @media print {
                  @page { size: 13in 8.5in; margin: 15mm; }
                  body * { visibility: hidden !important; }
                  .provincial-print-area, .provincial-print-area * { visibility: visible !important; color: #000 !important; }
                  .provincial-print-area { position: absolute !important; left: 0 !important; top: 0 !important; width: 100% !important; background: #fff !important; box-shadow: none !important; border: none !important; margin: 0 !important; padding: 0 !important; min-height: 100vh !important; }
                  .no-print { display: none !important; }
                  table { width: 100% !important; border-collapse: collapse; margin-bottom: 20px; page-break-inside: auto; }
                  tr { page-break-inside: avoid; page-break-after: auto; }
                  thead { display: table-header-group; }
                  th, td { border: 1px solid #000 !important; padding: 5px 6px !important; font-size: 8pt !important; color: #000 !important; }
                  th { background-color: transparent !important; font-weight: bold; text-align: center; }
                  .print-only { display: block !important; }
                  .print-only-flex { display: flex !important; }
                }
                @media screen {
                  .print-only, .print-only-flex { display: none !important; }
                }
              `}</style>

              <div className="panel no-print" style={{ marginBottom: "20px", borderTop: "4px solid var(--gold)" }}>
                <div style={{ display: "flex", gap: "20px", alignItems: "flex-end" }}>
                  <div className="form-group" style={{ flex: 1 }}>
                    <label className="form-label">Report View</label>
                    <select value={ledgerView} onChange={(e) => setLedgerView(e.target.value)} style={{ padding: "8px 12px", fontWeight: "bold" }}>
                      <option value="SUMMARY">Barangay Summary (Totals)</option>
                      <option value="DETAILED">Detailed Taxpayer Ledger</option>
                    </select>
                  </div>
                  <div className="form-group" style={{ flex: 1 }}>
                    <label className="form-label">Location / Barangay</label>
                    <select value={selectedBrgy} onChange={(e) => setSelectedBrgy(e.target.value)} style={{ padding: "8px 12px", fontWeight: "bold" }}>
                      <option value="ALL">ALL BARANGAYS</option>
                      {barangays.map(b => <option key={b} value={b}>{b}</option>)}
                    </select>
                  </div>
                  <div className="form-group" style={{ flex: 1 }}>
                    <label className="form-label">Target Delinquency Year</label>
                    <select value={yearFilter} onChange={(e) => setYearFilter(e.target.value)} style={{ padding: "8px 12px", fontWeight: "bold" }}>
                      <option value="ALL">All Years</option>
                      <option value="2001_BELOW">2001 and Below Only</option>
                      <option value="2002_UP">2002 to Present</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="card provincial-print-area">
                <div className="card-header no-print">
                  <div className="card-title">
                    {ledgerView === "SUMMARY" ? "Summary of Taxpayers with Delinquencies" : "List of Taxpayers with Delinquencies"}
                  </div>
                </div>
                
                <div className="card-body" style={{ padding: 0 }}>
                  
                  <div className="print-only" style={{ padding: "20px 20px 0" }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: "2px solid #000", paddingBottom: "15px", marginBottom: "20px" }}>
                      <img src="https://i.postimg.cc/VktjPybt/macalelon-logo.png" alt="LGU Logo" style={{ width: "80px", height: "80px", objectFit: "contain" }} />
                      <div style={{ textAlign: "center", flex: 1 }}>
                        <div style={{ fontSize: "11pt" }}>Republic of the Philippines</div>
                        <div style={{ fontSize: "11pt" }}>Province of Quezon</div>
                        <div style={{ fontSize: "12pt", fontWeight: "bold" }}>MUNICIPALITY OF MACALELON</div>
                        <div style={{ fontSize: "11pt", fontWeight: "bold", marginTop: "5px" }}>OFFICE OF THE MUNICIPAL TREASURER</div>
                      </div>
                      <div style={{ width: "80px" }}></div>
                    </div>
                    
                    <h3 style={{ textAlign: "center", fontSize: "12pt", margin: "10px 0 5px", fontWeight: "bold" }}>
                      {ledgerView === "SUMMARY" ? "SUMMARY OF TAXPAYERS WITH DELINQUENCIES PER BARANGAY" : "LIST OF TAXPAYERS WITH DELINQUENCIES PER BARANGAY"}
                    </h3>
                    <h3 style={{ textAlign: "center", fontSize: "11pt", margin: "0 0 20px", fontWeight: "normal" }}>
                      {yearFilter === "ALL" ? "FOR ALL YEARS" : yearFilter === "2001_BELOW" ? "FOR CY 2001 AND BELOW" : "FOR CY 2002 AND UP"}
                    </h3>
                    
                    {selectedBrgy !== "ALL" && (
                      <h3 style={{ textAlign: "left", fontSize: "11pt", margin: "0 0 10px", fontWeight: "bold" }}>BARANGAY: {selectedBrgy}</h3>
                    )}
                  </div>

                  {processedProvincial.length === 0 ? (
                    <div className="empty no-print" style={{ padding: "40px" }}><div className="empty-icon">📊</div><div className="empty-text">No records found matching filters.</div></div>
                  ) : (
                    <div className="table-wrap" style={{ padding: "0 20px" }}>
                      
                      {ledgerView === "SUMMARY" ? (
                        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12px" }}>
                          <thead>
                            <tr style={{ background: "rgba(0,0,0,0.1)" }}>
                              <th style={{ border: "1px solid var(--border)", padding: "8px", textAlign: "left" }}>BARANGAY</th>
                              <th style={{ border: "1px solid var(--border)", padding: "8px", textAlign: "right" }}>BASIC</th>
                              <th style={{ border: "1px solid var(--border)", padding: "8px", textAlign: "right" }}>BASIC PENALTY</th>
                              <th style={{ border: "1px solid var(--border)", padding: "8px", textAlign: "right" }}>SEF</th>
                              <th style={{ border: "1px solid var(--border)", padding: "8px", textAlign: "right" }}>SEF PENALTY</th>
                              <th style={{ border: "1px solid var(--border)", padding: "8px", textAlign: "right" }}>TOTAL</th>
                            </tr>
                          </thead>
                          <tbody>
                            {Object.values(summaryByBarangay).sort((a,b) => a.name.localeCompare(b.name)).map((row, i) => (
                              <tr key={i}>
                                <td style={{ border: "1px solid var(--border)", padding: "6px" }}>{row.name}</td>
                                <td style={{ border: "1px solid var(--border)", padding: "6px", textAlign: "right" }}>{row.basic > 0 ? fmt(row.basic) : ""}</td>
                                <td style={{ border: "1px solid var(--border)", padding: "6px", textAlign: "right" }}>{row.basicPen > 0 ? fmt(row.basicPen) : ""}</td>
                                <td style={{ border: "1px solid var(--border)", padding: "6px", textAlign: "right" }}>{row.sef > 0 ? fmt(row.sef) : ""}</td>
                                <td style={{ border: "1px solid var(--border)", padding: "6px", textAlign: "right" }}>{row.sefPen > 0 ? fmt(row.sefPen) : ""}</td>
                                <td style={{ border: "1px solid var(--border)", padding: "6px", textAlign: "right", fontWeight: "bold" }}>{fmt(row.total)}</td>
                              </tr>
                            ))}
                            <tr style={{ fontWeight: "bold", background: "rgba(0,0,0,0.2)" }}>
                              <td style={{ border: "1px solid var(--border)", padding: "8px", textAlign: "left" }}>GRAND TOTAL</td>
                              <td style={{ border: "1px solid var(--border)", padding: "8px", textAlign: "right" }}>{fmt(provSummary.basic)}</td>
                              <td style={{ border: "1px solid var(--border)", padding: "8px", textAlign: "right" }}>{fmt(provSummary.basicPen)}</td>
                              <td style={{ border: "1px solid var(--border)", padding: "8px", textAlign: "right" }}>{fmt(provSummary.sef)}</td>
                              <td style={{ border: "1px solid var(--border)", padding: "8px", textAlign: "right" }}>{fmt(provSummary.sefPen)}</td>
                              <td style={{ border: "1px solid var(--border)", padding: "8px", textAlign: "right", fontSize: "14px" }}>{fmt(provSummary.total)}</td>
                            </tr>
                          </tbody>
                        </table>
                      ) : (
                        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "11px" }}>
                          <thead>
                            <tr style={{ background: "rgba(0,0,0,0.1)" }}>
                              <th style={{ border: "1px solid var(--border)", padding: "6px", textAlign: "center" }}>No.</th>
                              <th style={{ border: "1px solid var(--border)", padding: "6px", textAlign: "center" }}>Pro Index No</th>
                              <th style={{ border: "1px solid var(--border)", padding: "6px", textAlign: "center" }}>Property Owner</th>
                              <th style={{ border: "1px solid var(--border)", padding: "6px", textAlign: "center" }}>Classification</th>
                              <th style={{ border: "1px solid var(--border)", padding: "6px", textAlign: "center" }}>Location</th>
                              <th style={{ border: "1px solid var(--border)", padding: "6px", textAlign: "center" }}>Assessed Value</th>
                              <th style={{ border: "1px solid var(--border)", padding: "6px", textAlign: "center" }}>From</th>
                              <th style={{ border: "1px solid var(--border)", padding: "6px", textAlign: "center" }}>To</th>
                              <th style={{ border: "1px solid var(--border)", padding: "6px", textAlign: "center" }}>Basic</th>
                              <th style={{ border: "1px solid var(--border)", padding: "6px", textAlign: "center" }}>Penalty</th>
                              <th style={{ border: "1px solid var(--border)", padding: "6px", textAlign: "center" }}>SEF</th>
                              <th style={{ border: "1px solid var(--border)", padding: "6px", textAlign: "center" }}>Sef Penalty</th>
                              <th style={{ border: "1px solid var(--border)", padding: "6px", textAlign: "center" }}>Total Collectible</th>
                            </tr>
                          </thead>
                          <tbody>
                            {processedProvincial.map((row, i) => (
                              <tr key={i}>
                                <td style={{ border: "1px solid var(--border)", padding: "4px", textAlign: "center" }}>{i + 1}</td>
                                <td style={{ border: "1px solid var(--border)", padding: "4px" }}>{row.pin}</td>
                                <td style={{ border: "1px solid var(--border)", padding: "4px" }}>{row.owner}</td>
                                <td style={{ border: "1px solid var(--border)", padding: "4px", textAlign: "center" }}>{row.classification.substring(0,3).toUpperCase()}</td>
                                <td style={{ border: "1px solid var(--border)", padding: "4px" }}>{row.location.replace(" (POB.)", "")}</td>
                                <td style={{ border: "1px solid var(--border)", padding: "4px", textAlign: "right" }}>{fmt(row.av)}</td>
                                <td style={{ border: "1px solid var(--border)", padding: "4px", textAlign: "center" }}>{row.from}</td>
                                <td style={{ border: "1px solid var(--border)", padding: "4px", textAlign: "center" }}>{row.to}</td>
                                
                                <td style={{ border: "1px solid var(--border)", padding: "4px", textAlign: "right" }}>{row.basic > 0 ? fmt(row.basic) : ""}</td>
                                <td style={{ border: "1px solid var(--border)", padding: "4px", textAlign: "right" }}>{row.basicPen > 0 ? fmt(row.basicPen) : ""}</td>
                                <td style={{ border: "1px solid var(--border)", padding: "4px", textAlign: "right" }}>{row.sef > 0 ? fmt(row.sef) : ""}</td>
                                <td style={{ border: "1px solid var(--border)", padding: "4px", textAlign: "right" }}>{row.sefPen > 0 ? fmt(row.sefPen) : ""}</td>
                                <td style={{ border: "1px solid var(--border)", padding: "4px", textAlign: "right", fontWeight: "bold" }}>{fmt(row.total)}</td>
                              </tr>
                            ))}
                            <tr style={{ fontWeight: "bold", background: "rgba(0,0,0,0.2)" }}>
                              <td colSpan="8" style={{ border: "1px solid var(--border)", padding: "8px", textAlign: "right" }}>GRAND TOTAL</td>
                              <td style={{ border: "1px solid var(--border)", padding: "8px", textAlign: "right" }}>{fmt(provSummary.basic)}</td>
                              <td style={{ border: "1px solid var(--border)", padding: "8px", textAlign: "right" }}>{fmt(provSummary.basicPen)}</td>
                              <td style={{ border: "1px solid var(--border)", padding: "8px", textAlign: "right" }}>{fmt(provSummary.sef)}</td>
                              <td style={{ border: "1px solid var(--border)", padding: "8px", textAlign: "right" }}>{fmt(provSummary.sefPen)}</td>
                              <td style={{ border: "1px solid var(--border)", padding: "8px", textAlign: "right", fontSize: "13px" }}>{fmt(provSummary.total)}</td>
                            </tr>
                          </tbody>
                        </table>
                      )}

                    </div>
                  )}
                  
                  {processedProvincial.length > 0 && (
                    <div className="print-only-flex" style={{ justifyContent: "space-around", marginTop: "40px", marginBottom: "40px", pageBreakInside: "avoid", color: "#000" }}>
                      <div style={{ textAlign: "center" }}>
                        <span style={{ fontSize: "10pt" }}>Prepared by:</span><br/><br/><br/>
                        <strong style={{ fontSize: "11pt", textTransform: "uppercase", textDecoration: "underline" }}>{(profile && profile.full_name) || "AUTHORIZED STAFF"}</strong><br/>
                        <div style={{ fontSize: "11pt", textTransform: "uppercase" }}>{(profile && profile.position) || (profile && profile.role) || "MTO PERSONNEL"}</div>
                      </div>
                      <div style={{ textAlign: "center" }}>
                        <span style={{ fontSize: "10pt" }}>Certified Correct:</span><br/><br/><br/>
                        <strong style={{ fontSize: "11pt", textDecoration: "underline" }}>DINIA A. TAÑEDO</strong><br/>
                        <div style={{ fontSize: "11pt" }}>Municipal Treasurer</div>
                      </div>
                    </div>
                  )}

                </div>
              </div>
            </>
          )}

          {/* ... (DAILY/MONTHLY TAB) ... */}
          {(tab==="daily"||tab==="monthly") && (
            <>
              <div className="stat-row" style={{gridTemplateColumns:"repeat(4,1fr)",padding:0,marginBottom:20}}>
                {[
                  {label:"Basic RPT",value:sumBasic,color:"blue"},
                  {label:"SEF",      value:sumSef,  color:"green"},
                  {label:"Penalties",value:sumPen,  color:"gold"},
                  {label:"Total",    value:sumTot,  color:"red"},
                ].map(s=>(
                  <div className="stat-card" key={s.label}>
                    <div className={`stat-accent ${s.color}`}/>
                    <div className="stat-label">{s.label}</div>
                    <div className="stat-value big-num"><span style={{fontFamily:"monospace"}}>{fmt(s.value)}</span></div>
                  </div>
                ))}
              </div>
              <div className="card">
                <div className="card-header">
                  <div>
                    <div className="card-title">{tab==="daily"?"Daily":"Monthly"} Collection Report</div>
                    <div className="card-sub">{String(date).slice(0,tab==="monthly"?7:10)} · {groupedData.length} receipt(s)</div>
                  </div>
                  <button className="btn btn-outline btn-sm">Export PDF</button>
                </div>
                {groupedData.length===0
                  ? <div className="empty"><div className="empty-icon">📋</div><div className="empty-text">No collections for this period</div></div>
                  : <div className="table-wrap"><table>
                      <thead><tr><th>OR No.</th><th>Date</th><th>Taxpayer</th><th>Year(s)</th><th>Basic</th><th>SEF</th><th>Penalty</th><th>Total</th><th>Method</th><th></th></tr></thead>
                      <tbody>
                        {groupedData.map((c,i)=>(
                          <tr key={i}>
                            <td><span className="badge badge-blue">{c.or_number}</span></td>
                            <td><span className="mono-sm">{c.payment_date}</span></td>
                            <td style={{fontWeight:600,fontSize:13}}>{(c.taxpayers && c.taxpayers.lastname) ? `${c.taxpayers.lastname}, ${c.taxpayers.firstname || ''}`:"—"}</td>
                            <td><span className="chip">{c.minYear === c.maxYear ? c.minYear : `${c.minYear}-${c.maxYear}`}</span></td>
                            <td><span className="mono">{fmt(c.sum_basic)}</span></td>
                            <td><span className="mono">{fmt(c.sum_sef)}</span></td>
                            <td><span className="mono">{fmt(c.sum_penalty)}</span></td>
                            <td><span className="mono" style={{color:"var(--green2)",fontWeight:700}}>{fmt(c.sum_total)}</span></td>
                            <td><span className="chip">{c.payment_method}</span></td>
                            <td>
                                {(profile && ["admin", "treasurer"].includes(profile.role)) && (
                                  <button className="btn btn-ghost btn-xs" style={{color: "var(--red2)"}} onClick={() => handleDelete(c, "collection")} disabled={deleting}>✕</button>
                                )}
                            </td>
                          </tr>
                        ))}
                        <tr style={{background:"rgba(0,0,0,0.25)"}}>
                          <td colSpan={4} style={{fontWeight:700,fontSize:12,fontFamily:"var(--font-mono)",letterSpacing:"0.05em",color:"var(--text3)"}}>TOTAL</td>
                          <td><span className="mono" style={{fontWeight:700}}>{fmt(sumBasic)}</span></td>
                          <td><span className="mono" style={{fontWeight:700}}>{fmt(sumSef)}</span></td>
                          <td><span className="mono" style={{fontWeight:700}}>{fmt(sumPen)}</span></td>
                          <td><span className="mono" style={{fontWeight:800,color:"var(--green2)",fontSize:14}}>{fmt(sumTot)}</span></td>
                          <td colSpan={2}/>
                        </tr>
                      </tbody>
                    </table></div>
                }
              </div>
            </>
          )}

          {/* ═══════════════════════════════════════════════════════════
              TAB: DELINQUENCY AGING
          ═══════════════════════════════════════════════════════════ */}
          {tab==="delinq" && (
            <div className="card">
              <div className="card-header">
                <div><div className="card-title">Delinquency Aging Report</div><div className="card-sub">As of {getToday()} · {groupedAging.length} accounts</div></div>
                <button className="btn btn-outline btn-sm">Export PDF</button>
              </div>
              {groupedAging.length===0
                ? <div className="empty"><div className="empty-icon">✅</div><div className="empty-text">No delinquent accounts</div></div>
                : <div className="table-wrap"><table>
                    <thead><tr><th>TD No. / PIN</th><th>Taxpayer</th><th>Year(s)</th><th>Months</th><th>Basic + SEF</th><th>Interest</th><th>Total Due</th><th></th></tr></thead>
                    <tbody>
                      {groupedAging.map((row) => (
                        <tr key={row.property_id}>
                          <td>
                            <div style={{fontWeight: 600}}>{row.properties?.td_number || "—"}</div>
                            <div style={{fontSize: 10, color: "var(--text3)"}}>{row.properties?.property_index_no || ""}</div>
                          </td>
                          <td style={{fontWeight: "bold"}}>
                            {(row.taxpayers && row.taxpayers.lastname) ? `${row.taxpayers.lastname}, ${row.taxpayers.firstname || ''}` : "—"}
                          </td>
                          
                          <td>
                            <span className="chip" style={{background: "var(--bg3)"}}>
                              {row.minYear === row.maxYear ? row.minYear : `${row.minYear} - ${row.maxYear}`}
                            </span>
                          </td>
                          
                          <td><span className="mono">{row.months_delinquent} mos.</span></td>
                          
                          <td><span className="mono">{fmt(row.sum_base)}</span></td>
                          <td><span className="mono" style={{color: "var(--red2)"}}>{fmt(row.sum_int)}</span></td>
                          <td><span className="mono" style={{color: "var(--gold2)", fontWeight: "bold"}}>{fmt(row.sum_total)}</span></td>
                          
                          <td style={{textAlign: "center"}}>
                              {(profile && ["admin", "treasurer"].includes(profile.role)) && (
                                <button className="btn btn-ghost btn-xs" style={{color: "var(--red2)"}} onClick={() => handleDelete(row, "delinquency")} disabled={deleting}>✕</button>
                              )}
                          </td>
                        </tr>
                      ))}
                      <tr style={{background:"rgba(0,0,0,0.25)"}}>
                        <td colSpan={6} style={{fontWeight:700,fontSize:12,fontFamily:"var(--font-mono)",color:"var(--text3)"}}>GRAND TOTAL</td>
                        <td><span className="mono" style={{fontWeight:800,color:"var(--gold2)",fontSize:14}}>
                          {fmt(delinqGrandTotal)}
                        </span></td>
                        <td/>
                      </tr>
                    </tbody>
                  </table></div>
              }
            </div>
          )}
        </>}
      </div>
    </>
  );
}
/* ═══════════════════════════════════════════════════════════
   AUDIT LOGS (WITH AUTO-REFRESH & PHILIPPINE TIMEZONE FIX)
═══════════════════════════════════════════════════════════ */
function AuditLogs({ token }) {
  const [logs,setLogs]   = useState([]);
  const [loading,setLoading] = useState(true);
  const [page,setPage]   = useState(0);
  const PER = 30;

  // 🌟 NEW: Extracted the fetch logic so we can call it on a timer
  const fetchLogs = useCallback(async (isInitialLoad = false) => {
    if (isInitialLoad) setLoading(true);
    try {
      const d = await db.select("audit_logs",{
        order:"created_at.desc",
        limit:PER,
        offset:page*PER
      },token);
      setLogs(d || []);
    } catch(e) {
      console.error("Failed to fetch audit logs:", e);
    }
    if (isInitialLoad) setLoading(false);
  }, [token, page]);

  // 🌟 NEW: The Auto-Refresh Engine
  useEffect(() => {
    // Load immediately when the component mounts or the page changes
    fetchLogs(true);

    // Set up a background timer to check for new logs every 10 seconds
    const intervalId = setInterval(() => {
      // Only auto-refresh if we are on the first page to prevent jarring jumps while reading history
      if (page === 0) {
        fetchLogs(false); 
      }
    }, 10000); // 10000ms = 10 seconds

    // Cleanup the timer when the user leaves the Audit Logs page
    return () => clearInterval(intervalId);
  }, [fetchLogs, page]);

  return (
    <>
      <div className="topbar">
        <div className="topbar-left">
          <h1>Audit Logs</h1>
          <p>COA-COMPLIANT IMMUTABLE ACTIVITY TRAIL</p>
        </div>
        <div className="topbar-right">
          {/* 🌟 NEW: Added a manual refresh button just in case they don't want to wait 10 seconds */}
          <button className="btn btn-outline btn-sm" onClick={() => fetchLogs(true)}>
             🔄 Refresh Now
          </button>
        </div>
      </div>
      <div className="page-body">
        <div className="banner banner-info"><span className="banner-icon">🔒</span><span>All log entries are immutable — timestamped, user-attributed, and IP-logged per COA compliance requirements. Entries cannot be edited or deleted.</span></div>
        <div className="card">
          <div className="card-header"><div className="card-title">System Activity Log (Live)</div></div>
          {loading
            ? <div className="loading-state"><span className="spin"/>Loading audit trail…</div>
            : logs.length===0
              ? <div className="empty"><div className="empty-icon">🔍</div><div className="empty-text">No audit records yet</div></div>
              : <div className="card-body" style={{padding:0}}>
                  {logs.map((log,i)=>(
                    <div className="audit-entry" key={i} style={{padding:"12px 22px"}}>
                      
                      {/* 🌟 FIX: Explicitly forcing Philippine Standard Time (PST) */}
                      <span className="audit-time" style={{fontWeight: "bold", color: "var(--text2)"}}>
                        {new Date(log.created_at).toLocaleString("en-US", {
                          timeZone: "Asia/Manila",
                          year: "numeric",
                          month: "short",
                          day: "numeric",
                          hour: "numeric",
                          minute: "2-digit",
                          hour12: true
                        })}
                      </span>
                      
                      <span className="audit-user">{log.user_name||"SYSTEM"}</span>
                      <span className="audit-action">{log.action}</span>
                      <span className="badge badge-blue" style={{fontSize:9,justifySelf:"end"}}>{log.module}</span>
                    </div>
                  ))}
                </div>
          }
          <div className="pagination">
            <span className="pg-info">Page {page+1} · {logs.length} entries</span>
            <div className="pg-btns">
              <button className="pg-btn" onClick={()=>setPage(p=>Math.max(0,p-1))} disabled={page===0}>← Prev</button>
              <button className="pg-btn" onClick={()=>setPage(p=>p+1)} disabled={logs.length<PER}>Next →</button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

/* ═══════════════════════════════════════════════════════════
   APP ROOT (UPDATED WITH KIOSK)
═══════════════════════════════════════════════════════════ */
export default function App() {
  const [session, setSession]     = useState(null);
  const [page, setPage]           = useState("dashboard");
  const [delinqCount, setDC]      = useState(0);
  const [theme, setTheme]         = useState(localStorage.getItem("rpt_theme") || "dark");
  
  // 🌟 NEW: Track if the user wants to launch the Kiosk
  const [showKiosk, setShowKiosk] = useState(false);

  useEffect(() => {
    document.body.className = theme === "light" ? "light-theme" : "";
    localStorage.setItem("rpt_theme", theme);
  }, [theme]);

  useEffect(() => {
    if (!session) return;
    db.select("delinquency",{filter:"status=eq.UNPAID",select:"property_id"},session.token)
      .then(d => setDC(new Set(d.filter(x => x.property_id).map(x => x.property_id)).size))
      .catch(()=>{});
  },[session,page]);

  // 🌟 KIOSK INTERCEPTOR: If true, ONLY show the Kiosk
  if (showKiosk) {
    return <Kiosk onExit={() => setShowKiosk(false)} db={db} token={session?.token || null} />;
  }

  // If there's no session, render the Login screen (which now has the Kiosk button)
  if (!session) {
    return (
      <>
        <style>{G}</style>
        {/* Pass the function that sets showKiosk to true when clicked */}
        <Login onLogin={setSession} onOpenKiosk={() => setShowKiosk(true)} />
      </>
    );
  }

  const pages = {
    dashboard:   <Dashboard   token={session.token} profile={session.profile}/>,
    taxpayers:   <Taxpayers   token={session.token} profile={session.profile}/>,
    assessments: <Assessments token={session.token} profile={session.profile}/>,
    collection:  <Collection  token={session.token} profile={session.profile}/>,
    delinquency: <Delinquency token={session.token} profile={session.profile}/>,
    receipts:    <Receipts    token={session.token} profile={session.profile}/>,
    reports:     <Reports     token={session.token} profile={session.profile}/>,
    auditlogs:   <AuditLogs   token={session.token}/>,
    settings:    <Settings    theme={theme} setTheme={setTheme}/>,
  };

  return (
    <>
      <style>{G}</style>
      
      {/* 🌟 THE FIX: This wrapper forces the light/dark theme to extend infinitely, killing the black bars! */}
      <div style={{ width: "100vw", minHeight: "100vh", backgroundColor: "var(--bg)", margin: 0, padding: 0, overflowX: "hidden" }}>
        
        <div className="shell" style={{ backgroundColor: "var(--bg)" }}>
          <Sidebar
            active={page} setActive={setPage}
            profile={session.profile}
            delinqCount={delinqCount}
            onLogout={async()=>{ await db.authSignOut(session.token); setSession(null); }}
          />
          <div className="content print-expand" style={{ backgroundColor: "var(--bg)", minHeight: "100vh" }}>
            
            {/* Your existing pages slide right in perfectly safe */}
            {pages[page] || <Dashboard token={session.token} profile={session.profile}/>}
            
          </div>
        </div>
        
      </div>
    </>
  );
}