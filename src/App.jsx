import { useState, useEffect, useCallback, useRef } from "react";

const SUPA_URL = "https://jxostgcbwpslystyhyvd.supabase.co";
const SUPA_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp4b3N0Z2Nid3BzbHlzdHloeXZkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk3MjQzMjYsImV4cCI6MjA5NTMwMDMyNn0.GbhtWRh9JWn_PwjqY7JxLj9YMrN0ZCjTNnh9qGTWzbg";

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

html, body { height: 100%; }
body { background: var(--bg); color: var(--text); font-family: var(--font-body); font-size: 14px; line-height: 1.6; }

/* ── Layout ── */
.shell   { display: flex; min-height: 100vh; }
.sidebar { width: 260px; min-height: 100vh; background: var(--bg2); border-right: 1px solid var(--border); display: flex; flex-direction: column; position: fixed; top: 0; left: 0; z-index: 200; }
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
  min-height: 100vh; display: flex; align-items: center; justify-content: center;
  background: var(--bg);
  background-image: radial-gradient(ellipse 80% 50% at 50% -20%, rgba(212,168,67,0.08) 0%, transparent 60%);
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
   LOGIN
═══════════════════════════════════════════════════════════ */
function Login({ onLogin }) {
  const [email, setEmail] = useState("");
  const [pass,  setPass]  = useState("");
  const [name,  setName]  = useState("");
  const [role,  setRole]  = useState("cashier");
  const [mode,  setMode]  = useState("login");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  const submit = async () => {
    if (!email || !pass) { setErr("Email and password are required."); return; }
    setLoading(true); setErr("");
    try {
      if (mode === "login") {
        const data = await db.authSignIn(email, pass);
        const profiles = await db.select("user_profiles", { filter:`id=eq.${data.user.id}` }, data.access_token);
        onLogin({ token: data.access_token, user: data.user, profile: profiles[0] || { full_name: email, role: "cashier" } });
      } else {
        const data = await db.authSignUp(email, pass);
        if (data.user) {
          await db.insert("user_profiles", { id: data.user.id, full_name: name, role }, data.access_token || SUPA_KEY);
          setMode("login"); alert("Account created! Please sign in.");
        }
      }
    } catch(e) { setErr(e.message); }
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
          <div className="form-group">
            <label className="form-label">Email Address</label>
            <input type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="user@lgu.gov.ph"/>
          </div>
          <div className="form-group">
            <label className="form-label">Password</label>
            <input type="password" value={pass} onChange={e=>setPass(e.target.value)} onKeyDown={e=>e.key==="Enter"&&submit()}/>
          </div>
          <button className="btn btn-gold" style={{marginTop:4,width:"100%",justifyContent:"center",padding:"12px"}} onClick={submit} disabled={loading}>
            {loading ? <><span className="spin"/>&nbsp;Signing in…</> : mode==="login"?"Sign In →":"Create Account →"}
          </button>
        </div>

        <div className="login-divider"><span>{mode==="login"?"New to the system?":"Already registered?"}</span></div>
        <div style={{textAlign:"center"}}>
          <button className="btn btn-ghost btn-sm" onClick={()=>setMode(mode==="login"?"register":"login")}>
            {mode==="login"?"Create an account":"Back to sign in"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   SIDEBAR
═══════════════════════════════════════════════════════════ */
function Sidebar({ active, setActive, profile, onLogout, delinqCount }) {
  const sections = [
    { label:"Overview", items:[
      { id:"dashboard",   icon:"◼",  label:"Dashboard" },
    ]},
    { label:"Records", items:[
      { id:"taxpayers",   icon:"◈",  label:"Taxpayers" },
      { id:"assessments", icon:"⬡",  label:"Assessments" },
    ]},
    { label:"Treasury", items:[
      { id:"collection",  icon:"◎",  label:"Collection" },
      { id:"delinquency", icon:"△",  label:"Delinquency", badge: delinqCount||null },
      { id:"receipts",    icon:"▣",  label:"Official Receipts" },
    ]},
    { label:"Compliance", items:[
      { id:"reports",     icon:"▤",  label:"Reports" },
      { id:"auditlogs",   icon:"◉",  label:"Audit Logs" },
    ]},
  ];
  const initials = (profile?.full_name||"U").split(",").map(s=>s.trim()[0]).join("").slice(0,2).toUpperCase();
  return (
    <div className="sidebar">
      <div className="sb-brand">
        <div className="sb-emblem"><img src="https://i.postimg.cc/VktjPybt/macalelon-logo.png" alt="LGU Logo" style={{width: "100%", height: "100%", borderRadius: "50%", objectFit: "cover"}} /></div>
        <h1>Municipality of Macalelon</h1>
        <p>RPT System · FY {new Date().getFullYear()}</p>
      </div>
      <div className="sb-nav">
        {sections.map(sec => (
          <div className="sb-section" key={sec.label}>
            <div className="sb-section-label">{sec.label}</div>
            {sec.items.map(item => (
              <button key={item.id} className={`nav-btn ${active===item.id?"active":""}`} onClick={()=>setActive(item.id)}>
                <span className="nav-icon">{item.icon}</span>
                {item.label}
                {item.badge && <span className="nav-pill">{item.badge}</span>}
              </button>
            ))}
          </div>
        ))}
      </div>
      <div className="sb-footer">
        <div className="sb-user" onClick={onLogout} title="Sign out">
          <div className="sb-avatar">{initials}</div>
          <div style={{flex:1,minWidth:0}}>
            <div className="sb-user-name" style={{overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{profile?.full_name||"User"}</div>
            <div className="sb-user-role">{profile?.role||"user"}</div>
          </div>
          <span className="sb-logout">⏻</span>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   DASHBOARD
═══════════════════════════════════════════════════════════ */
function Dashboard({ token }) {
  const [stats, setStats] = useState({ today:0, month:0, delinq:0, ytd:0, recent:[] });
  const [loading, setLoading] = useState(true);
  const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const d = today(), ms = d.slice(0,7)+"-01", ys = d.slice(0,4)+"-01-01";
        const [tc,mc,yc,dq,rc] = await Promise.all([
          db.select("collections",{filter:`payment_date=eq.${d}&is_voided=eq.false`,select:"total_paid"},token),
          db.select("collections",{filter:`payment_date=gte.${ms}&is_voided=eq.false`,select:"total_paid"},token),
          db.select("collections",{filter:`payment_date=gte.${ys}&is_voided=eq.false`,select:"total_paid"},token),
          db.select("delinquency",{filter:"status=eq.UNPAID",select:"id"},token),
          db.select("collections",{select:"or_number,payment_date,total_paid,basic_tax,sef_tax,payment_method,taxpayers(lastname,firstname)",order:"created_at.desc",limit:8,filter:"is_voided=eq.false"},token),
        ]);
        const sum = a => a.reduce((s,c)=>s+(+c.total_paid||0),0);
        setStats({ today:sum(tc), month:sum(mc), ytd:sum(yc), delinq:dq.length, recent:rc });
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
          <div className="card">
            <div className="card-header">
              <div>
                <div className="card-title">Recent Collections</div>
                <div className="card-sub">Last 8 transactions</div>
              </div>
            </div>
            {stats.recent.length === 0
              ? <div className="empty"><div className="empty-icon">💳</div><div className="empty-text">No collections recorded yet</div></div>
              : <div className="table-wrap">
                  <table>
                    <thead><tr>
                      <th>OR Number</th><th>Date</th><th>Taxpayer</th><th>Basic</th><th>SEF</th><th>Total</th><th>Method</th>
                    </tr></thead>
                    <tbody>
                      {stats.recent.map((c,i) => (
                        <tr key={i}>
                          <td><span className="badge badge-blue">{c.or_number}</span></td>
                          <td><span className="mono-sm">{c.payment_date}</span></td>
                          <td style={{fontWeight:600}}>{c.taxpayers?`${c.taxpayers.lastname}, ${c.taxpayers.firstname}`:"—"}</td>
                          <td><span className="mono">{fmt(c.basic_tax)}</span></td>
                          <td><span className="mono">{fmt(c.sef_tax)}</span></td>
                          <td><span className="mono" style={{color:"var(--green2)",fontWeight:700}}>{fmt(c.total_paid)}</span></td>
                          <td><span className="chip">{c.payment_method}</span></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
            }
          </div>

          <div style={{display:"flex",flexDirection:"column",gap:16}}>
            <div className="card">
              <div className="card-header"><div className="card-title">Collection Trend</div></div>
              <div className="card-body">
                <div className="bar-chart">
                  {MONTHS.map((m,i) => {
                    const h = i < new Date().getMonth()+1 ? Math.floor(20+Math.random()*55) : 3;
                    return (
                      <div className="bar-wrap" key={m}>
                        <div className="bar-fill" style={{height:`${h}px`, opacity: i < new Date().getMonth()+1 ? 1 : 0.15}}/>
                        <div className="bar-lbl">{m}</div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
            <div className="card">
              <div className="card-header"><div className="card-title">Quick Actions</div></div>
              <div className="card-body" style={{display:"flex",flexDirection:"column",gap:8}}>
                {[["💳","Post Payment","collection"],["👥","Add Taxpayer","taxpayers"],["📋","Daily Report","reports"]].map(([ic,label,_]) => (
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
   TAXPAYERS
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

  const handleDelete = async () => {
    if (!sel) return;
    
    // Prevent deletion if they have registered properties (to protect database integrity)
    if (props.length > 0) {
      alert("Cannot delete this taxpayer because they have registered properties. Please delete their properties first.");
      return;
    }

    if (!window.confirm(`Are you sure you want to permanently delete ${sel.lastname}, ${sel.firstname}?`)) return;

    setDeleting(true);
    try {
      await db.delete("taxpayers", { filter: `id=eq.${sel.id}` }, token);
      await logAudit(token, profile?.id, profile?.full_name, `Deleted taxpayer: ${sel.lastname}, ${sel.firstname}`, "TAXPAYERS");
      setSel(null); // Clear selection
      load();       // Refresh the list
    } catch (e) {
      alert("Failed to delete: " + e.message);
    }
    setDeleting(false);
  };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await db.select("taxpayers",{
        filter: q ? `or=(lastname.ilike.*${q}*,firstname.ilike.*${q}*,taxpayer_code.ilike.*${q}*)` : "",
        order:"lastname.asc", limit:PER, offset:page*PER
      }, token);
      setList(data);
    } catch(e){console.error(e);}
    setLoading(false);
  },[token,q,page]);

  useEffect(()=>{ load(); },[load]);

  const selectTaxpayer = async t => {
    setSel(t);
    const p = await db.select("properties",{filter:`taxpayer_id=eq.${t.id}`},token);
    setProps(p);
  };

  const save = async () => {
    setSaving(true);
    try {
      if (editId) {
        // UPDATE EXISTING
        await db.update("taxpayers", form, { filter: `id=eq.${editId}` }, token);
        await logAudit(token, profile?.id, profile?.full_name, `Updated taxpayer: ${form.lastname}, ${form.firstname}`, "TAXPAYERS");
      } else {
        // INSERT NEW
        const code = `TP-${new Date().getFullYear()}-${String(Date.now()).slice(-5)}`;
        await db.insert("taxpayers", { ...form, taxpayer_code: code, created_by: profile?.id }, token);
        await logAudit(token, profile?.id, profile?.full_name, `New taxpayer: ${form.lastname}, ${form.firstname}`, "TAXPAYERS");
      }
      
      setShowForm(false);
      setEditId(null);
      setForm({lastname:"",firstname:"",middlename:"",address:"",barangay:"",contact_no:"",email:"",tin:""});
      
      // Update the selected view if we were editing the currently viewed taxpayer
      if (editId && sel && sel.id === editId) {
        setSel({ ...sel, ...form });
      }
      load();
    } catch(e) { alert(e.message); }
    setSaving(false);
  };
  const canEdit = ["admin","encoder","assessor","treasurer"].includes(profile?.role);

  return (
    <>
      <div className="topbar">
        <div className="topbar-left"><h1>Taxpayer Registry</h1><p>PROPERTY OWNERS DATABASE</p></div>
        <div className="topbar-right">
          {canEdit && <button className="btn btn-gold" onClick={()=>setShowForm(!showForm)}>＋ Register Taxpayer</button>}
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
                {[["lastname","Last Name"],["firstname","First Name"],["middlename","Middle Name"],["barangay","Barangay"],["address","Complete Address"],["contact_no","Contact Number"],["email","Email Address"],["tin","TIN"]].map(([k,l]) => (
                  <div className="form-group" key={k} style={k==="address"?{gridColumn:"span 2"}:{}}>
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
              <input placeholder="Search by name, code, or barangay…" value={q} onChange={e=>{setQ(e.target.value);setPage(0);}}/>
              <button className="btn btn-outline btn-sm" onClick={load}>Search</button>
            </div>
            {loading
              ? <div className="loading-state"><span className="spin"/>Loading records…</div>
              : list.length===0
                ? <div className="empty"><div className="empty-icon">👥</div><div className="empty-text">No taxpayers found</div></div>
                : <div className="table-wrap"><table>
                    <thead><tr><th>Code</th><th>Full Name</th><th>Barangay</th><th>Contact</th><th>Status</th><th></th></tr></thead>
                    <tbody>
                      {list.map(t => (
                        <tr key={t.id} style={{cursor:"pointer"}} onClick={()=>selectTaxpayer(t)}>
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
              <span className="pg-info">Page {page+1} · {list.length} record(s)</span>
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
                  {/* Add the delete button here, visible only to authorized roles */}
                  {canEdit && (
                    <button className="btn btn-danger btn-sm" onClick={handleDelete} disabled={deleting}>
                      {deleting ? "Deleting..." : "🗑 Delete"}
                    </button>
                  )}
                </div>
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
                  <div style={{fontSize:12,color:"var(--text3)",marginBottom:10}}>PROPERTIES ({props.length})</div>
                  {props.length===0
                    ? <div style={{fontSize:12,color:"var(--text3)"}}>No properties registered.</div>
                    : props.map(p=>(
                        <div key={p.id} style={{background:"var(--bg3)",borderRadius:9,padding:"10px 14px",marginBottom:8,border:"1px solid var(--border)"}}>
                          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                            <div>
                              <div style={{fontWeight:600,fontSize:13}}>{p.td_number}</div>
                              <div style={{fontSize:11,color:"var(--text3)",fontFamily:"var(--font-mono)",marginTop:2}}>{p.classification} · {p.barangay||"—"}</div>
                            </div>
                            <div style={{textAlign:"right"}}>
                              <div className="amount-lg" style={{fontSize:14}}>{fmt(p.assessed_value)}</div>
                              <div style={{fontSize:10,color:"var(--text3)",fontFamily:"var(--font-mono)"}}>ASSESSED VALUE</div>
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
   ASSESSMENTS
═══════════════════════════════════════════════════════════ */
function Assessments({ token, profile }) {
  const [historyProp, setHistoryProp] = useState(null);
  const [historyData, setHistoryData] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [props,setProps] = useState([]);
  const [loading,setLoading] = useState(true);
  const [q,setQ]   = useState("");
  const [page,setPage] = useState(0);
  const [showForm,setShowForm] = useState(false);
  const [saving,setSaving]     = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [editId, setEditId]    = useState(null);
  const [taxpayers,setTaxpayers] = useState([]);
  const [form,setForm] = useState({ taxpayer_id:"",td_number:"",property_index_no:"",barangay:"",classification:"Residential",actual_use:"",land_area:"",market_value:"",assessment_level:"0.20",is_idle:false });
  const PER = 20;
  const AL = { Residential:0.20,Commercial:0.50,Industrial:0.50,Agricultural:0.25,Mineral:0.50,Timberland:0.25,Special:0.15 };
  const handleViewHistory = async (p) => {
    setHistoryProp(p);
    setLoadingHistory(true);
    try {
      const data = await db.select("assessments", {
        filter: `property_id=eq.${p.id}`,
        order: "tax_year.desc"
      }, token);
      setHistoryData(data || []);
    } catch(e) { 
      alert("Failed to load history: " + e.message); 
    }
    setLoadingHistory(false);
  };


  const handleDeleteProperty = async (prop) => {
    if (!window.confirm(`Are you sure you want to delete property ${prop.td_number}? This will also delete its assessments.`)) return;
    
    setDeleting(true);
    try {
      // 1. Delete assessments tied to the property first (prevents database errors)
      await db.delete("assessments", { filter: `property_id=eq.${prop.id}` }, token);
      
      // 2. Delete the property itself
      await db.delete("properties", { filter: `id=eq.${prop.id}` }, token);
      
      await logAudit(token, profile?.id, profile?.full_name, `Deleted property: ${prop.td_number}`, "ASSESSMENT");
      load(); // Refresh the table
    } catch (e) {
      alert("Failed to delete property. It may have existing collection records tied to it.");
    }
    setDeleting(false);
  };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await db.select("properties",{
        filter: q ? `or=(td_number.ilike.*${q}*,property_index_no.ilike.*${q}*)` : "",
        select:"*,taxpayers(lastname,firstname,taxpayer_code)",
        order:"created_at.desc", limit:PER, offset:page*PER
      },token);
      setProps(data);
    } catch(e){console.error(e);}
    setLoading(false);
  },[token,q,page]);

  useEffect(()=>{ load(); },[load]);

  const loadTP = async () => {
    const d = await db.select("taxpayers",{order:"lastname.asc",limit:500},token);
    setTaxpayers(d);
  };

  const mv = parseFloat(form.market_value)||0;
  const al = parseFloat(form.assessment_level)||0;
  const av = mv * al;

  const save = async () => {
    setSaving(true);
    try {
      const propData = {
        taxpayer_id: parseInt(form.taxpayer_id), td_number: form.td_number,
        property_index_no: form.property_index_no, barangay: form.barangay,
        classification: form.classification, actual_use: form.actual_use,
        land_area: parseFloat(form.land_area)||0, market_value: mv,
        assessment_level: al, is_idle: form.is_idle
      };

      if (editId) {
        // UPDATE EXISTING PROPERTY
        await db.update("properties", propData, { filter: `id=eq.${editId}` }, token);
        await logAudit(token, profile?.id, profile?.full_name, `Updated property ${form.td_number}`, "ASSESSMENT");
      } else {
        // INSERT NEW PROPERTY & ASSESSMENT
        const [prop] = await db.insert("properties", { ...propData, created_by: profile?.id }, token);
        await db.insert("assessments",{
          property_id: prop.id, tax_year: parseInt(form.tax_year) || new Date().getFullYear(),
          basic_tax: av*0.01, sef_tax: av*0.01,
          idle_tax: form.is_idle ? av*0.05 : 0, created_by: profile?.id,
        }, token);
        await logAudit(token, profile?.id, profile?.full_name, `Property ${form.td_number} assessed · AV: ${fmt(av)}`, "ASSESSMENT");
      }
      setShowForm(false); 
      setEditId(null);
      setForm({ taxpayer_id:"",td_number:"",property_index_no:"",barangay:"",classification:"Residential",actual_use:"",land_area:"",market_value:"",assessment_level:"0.20",is_idle:false });
      load();
    } catch(e) { alert(e.message); }
    setSaving(false);
  };
  const handleAddRevision = async (p) => {
    const year = window.prompt(`Enter the Effectivity Year for ${p.td_number}'s new revision (e.g., 2018):`);
    if (!year || isNaN(year)) return;

    const mvStr = window.prompt(`Enter the new Fair Market Value for year ${year}:`);
    if (!mvStr || isNaN(mvStr)) return;

    const mv = parseFloat(mvStr);
    const al = parseFloat(p.assessment_level) || 0.20;
    const av = mv * al;

    try {
      await db.insert("assessments", {
        property_id: p.id,
        tax_year: parseInt(year),
        basic_tax: av * 0.01,
        sef_tax: av * 0.01,
        idle_tax: p.is_idle ? av * 0.05 : 0,
        created_by: profile?.id
      }, token);
      await logAudit(token, profile?.id, profile?.full_name, `Added ${year} revision to ${p.td_number}`, "ASSESSMENT");
      alert(`Successfully added ${year} assessment revision!`);
    } catch (e) {
      alert("Failed to add revision: " + e.message);
    }
  };
  return (
    <>
      <div className="topbar">
        <div className="topbar-left">
           <h1>Assessments</h1>
           <p>MANAGE PROPERTY ASSESSMENTS</p>
        </div>
        <div className="topbar-right">
          <button className="btn btn-primary" onClick={() => {
            setForm({ taxpayer_id:"",td_number:"",property_index_no:"",barangay:"",classification:"Residential",actual_use:"",land_area:"",market_value:"",assessment_level:"0.20",is_idle:false, tax_year: new Date().getFullYear() }); 
            setEditId(null);
            loadTP();
            setShowForm(true); 
          }}>
            + Register Property
          </button>
        </div>
      </div>

      {showForm && (
        <div className="page-body" style={{paddingBottom:0}}>
          <div className="card">
            <div className="card-header">
              <div><div className="card-title">Register Property & Assessment</div></div>
              <button className="btn btn-ghost btn-sm" onClick={()=>setShowForm(false)}>✕</button>
            </div>
            <div className="card-body">
              <div className="form-grid" style={{marginBottom:16}}>
                <div className="form-group">
                  <label className="form-label">Taxpayer</label>
                  <select value={form.taxpayer_id} onChange={e=>setForm(f=>({...f,taxpayer_id:e.target.value}))}>
                    <option value="">— Select taxpayer —</option>
                    {taxpayers.map(t=><option key={t.id} value={t.id}>{t.lastname}, {t.firstname} ({t.taxpayer_code})</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">TD Number</label>
                  <input value={form.td_number} onChange={e=>setForm(f=>({...f,td_number:e.target.value}))} placeholder="TD-10001"/>
                </div>
                <div className="form-group">
                  <label className="form-label">Property Index No. (PIN)</label>
                  <input value={form.property_index_no} onChange={e=>setForm(f=>({...f,property_index_no:e.target.value}))}/>
                </div>
                <div className="form-group">
                  <label className="form-label">Barangay</label>
                  <input value={form.barangay} onChange={e=>setForm(f=>({...f,barangay:e.target.value}))}/>
                </div>
                <div className="form-group">
                  <label className="form-label">Classification</label>
                  <select value={form.classification} onChange={e=>setForm(f=>({...f,classification:e.target.value,assessment_level:String(AL[e.target.value]||0.20)}))}>
                    {Object.keys(AL).map(c=><option key={c}>{c}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Actual Use</label>
                  <input value={form.actual_use} onChange={e=>setForm(f=>({...f,actual_use:e.target.value}))}/>
                </div>
                <div className="form-group">
                  <label className="form-label">Land Area (sqm)</label>
                  <input type="number" value={form.land_area} onChange={e=>setForm(f=>({...f,land_area:e.target.value}))}/>
                </div>
                <div className="form-group">
                  <label className="form-label">Fair Market Value (₱)</label>
                  <input type="number" value={form.market_value} onChange={e=>setForm(f=>({...f,market_value:e.target.value}))}/>
                </div>
                <div className="form-group">
                  <label className="form-label">Assessment Level</label>
                  <input type="number" step="0.01" value={form.assessment_level} onChange={e=>setForm(f=>({...f,assessment_level:e.target.value}))}/>
                </div>
                <div className="form-group" style={{justifyContent:"flex-end"}}>
                  <label style={{display:"flex",alignItems:"center",gap:8,fontFamily:"var(--font-body)",fontSize:13,color:"var(--text2)",cursor:"pointer",textTransform:"none",letterSpacing:"normal"}}>
                    <input type="checkbox" checked={form.is_idle} onChange={e=>setForm(f=>({...f,is_idle:e.target.checked}))} style={{width:"auto",accentColor:"var(--gold)"}}/>
                    Mark as Idle Land (+5% tax)
                  </label>
                </div>
                <div className="form-group">
                  <label className="form-label">Effectivity Year (General Revision)</label>
                    <input 
                    type="number" 
                    className="form-control" 
                    value={form.tax_year} 
                    onChange={e => setForm({...form, tax_year: e.target.value})}
                    placeholder="e.g., 2018"
                    required/>
                </div>
              </div>

              {mv > 0 && (
                <div className="banner banner-info" style={{marginBottom:16}}>
                  <span className="banner-icon">🧮</span>
                  <span>Assessed Value: <strong>{fmt(av)}</strong> · Basic RPT/yr: <strong>{fmt(av*0.01)}</strong> · SEF/yr: <strong>{fmt(av*0.01)}</strong>{form.is_idle?` · Idle Tax: ${fmt(av*0.05)}`:""}
                  </span>
                </div>
              )}
              <div className="gap-row">
                <button className="btn btn-success" onClick={save} disabled={saving}>{saving&&<><span className="spin"/>&nbsp;</>}Save & Assess</button>
                <button className="btn btn-outline" onClick={()=>setShowForm(false)}>Cancel</button>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* --- HISTORY MODAL --- */}
      {historyProp && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.6)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div className="card" style={{ width: "600px", maxWidth: "90%", maxHeight: "80vh", overflowY: "auto" }}>
            <div className="card-header">
              <div>
                <div className="card-title">Assessment History</div>
                <div className="card-sub">{historyProp.td_number}</div>
              </div>
              <button className="btn btn-ghost btn-sm" onClick={() => setHistoryProp(null)}>✕</button>
            </div>
            <div className="card-body">
              {loadingHistory ? (
                <div className="loading-state"><span className="spin"/>Loading records...</div>
              ) : historyData.length === 0 ? (
                <div className="empty" style={{ padding: "24px" }}>No historical revisions found.</div>
              ) : (
                <div className="table-wrap">
                  <table style={{ fontSize: "13px" }}>
                    <thead>
                      <tr>
                        <th>Effectivity Year</th>
                        <th>Assessed Value</th>
                        <th>Basic Tax</th>
                        <th>SEF Tax</th>
                      </tr>
                    </thead>
                    <tbody>
                      {historyData.map(h => (
                        <tr key={h.id}>
                          <td><span className="chip">{h.tax_year}</span></td>
                          {/* We reverse-calculate the Assessed Value since Basic is 1% of AV */}
                          <td><span className="mono" style={{fontWeight: 700}}>{fmt(parseFloat(h.basic_tax) * 100)}</span></td>
                          <td><span className="mono">{fmt(h.basic_tax)}</span></td>
                          <td><span className="mono">{fmt(h.sef_tax)}</span></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
      <div className="page-body">
        <div className="card">
          <div className="searchbar">
            <input placeholder="Search by TD Number or PIN…" value={q} onChange={e=>{setQ(e.target.value);setPage(0);}}/>
            <button className="btn btn-outline btn-sm" onClick={load}>Search</button>
          </div>
          {loading
            ? <div className="loading-state"><span className="spin"/>Loading assessments…</div>
            : props.length===0
              ? <div className="empty"><div className="empty-icon">🏠</div><div className="empty-text">No properties found</div></div>
              : <div className="table-wrap"><table>
                  <thead><tr><th>TD No.</th><th>Owner</th><th>Barangay</th><th>Class</th><th>Market Value</th><th>Asmt. Level</th><th>Assessed Value</th><th>Basic RPT / yr</th><th>SEF / yr</th><th></th></tr></thead>
                  <tbody>
                    {props.map(p=>(
                      <tr key={p.id}>
                        <td><span className="mono">{p.td_number}</span></td>
                        <td style={{fontWeight:600,fontSize:13}}>{p.taxpayers?`${p.taxpayers.lastname}, ${p.taxpayers.firstname}`:"—"}</td>
                        <td style={{color:"var(--text3)"}}>{p.barangay||"—"}</td>
                        <td><span className="badge badge-blue">{p.classification}</span></td>
                        <td><span className="mono">{fmt(p.market_value)}</span></td>
                        <td><span className="mono">{(parseFloat(p.assessment_level)*100).toFixed(0)}%</span></td>
                        <td><span className="mono" style={{fontWeight:700,color:"var(--gold2)"}}>{fmt(p.assessed_value)}</span></td>
                        <td><span className="mono" style={{color:"var(--blue2)"}}>{fmt(p.assessed_value*0.01)}</span></td>
                        <td><span className="mono" style={{color:"var(--blue2)"}}>{fmt(p.assessed_value*0.01)}</span></td>
                        
                        {/* ADD THIS ENTIRE TD BLOCK */}
                        <td>
                          {["admin", "assessor"].includes(profile?.role) && (
                            <div style={{display: "flex", gap: "6px"}}>
                              {/* Edit Button */}
                              <button className="btn btn-ghost btn-xs" onClick={() => {
                                setForm({
                                  taxpayer_id: p.taxpayer_id || "", td_number: p.td_number || "", 
                                  property_index_no: p.property_index_no || "", barangay: p.barangay || "", 
                                  classification: p.classification || "Residential", actual_use: p.actual_use || "", 
                                  land_area: p.land_area || "", market_value: p.market_value || "", 
                                  assessment_level: p.assessment_level || "0.20", is_idle: p.is_idle || false
                                });
                                setEditId(p.id);
                                loadTP();
                                setShowForm(true);
                              }}>✏️</button>
                              
                              {/* Delete Button */}
                              <button className="btn btn-ghost btn-xs" style={{color: "var(--red2)"}} onClick={() => handleDeleteProperty(p)} disabled={deleting}>
                                ✕
                              </button>
                              <button className="btn btn-ghost btn-xs" style={{color: "var(--blue2)"}} onClick={() => handleViewHistory(p)} title="View Assessment History">
                                🕒 History
                              </button>
                              <button className="btn btn-ghost btn-xs" style={{color: "var(--gold2)"}} onClick={() => handleAddRevision(p)} title="Add Historical Revision">
                                ➕ Revise
                              </button>
                            </div>
                            
                          )}
                        </td>
                        {/* END ADDITION */}

                      </tr>
                    ))}
                  </tbody>
                </table></div>
          }
          <div className="pagination">
            <span className="pg-info">Page {page+1}</span>
            <div className="pg-btns">
              <button className="pg-btn" onClick={()=>setPage(p=>Math.max(0,p-1))} disabled={page===0}>← Prev</button>
              <button className="pg-btn" onClick={()=>setPage(p=>p+1)} disabled={props.length<PER}>Next →</button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

/* ═══════════════════════════════════════════════════════════
   COLLECTION
═══════════════════════════════════════════════════════════ */
function Collection({ token, profile }) {
  const [step,setStep]       = useState(1);
  const [q,setQ]             = useState("");
  const [found,setFound]     = useState(null);
  const [propList,setPropList] = useState([]);
  const [selProp,setSelProp] = useState(null);
  const [asmt,setAsmt]       = useState(null);
  const [asmtHistory, setAsmtHistory] = useState([]); // ADD THIS LINE
  const [paidYears, setPaidYears] = useState([]);
  const [fromYear,setFromYear] = useState(String(new Date().getFullYear()));
  const [toYear,setToYear]     = useState(String(new Date().getFullYear()));
  const [method,setMethod]   = useState("CASH");
  const [fromQuarter, setFromQuarter] = useState("1");
  const [toQuarter, setToQuarter] = useState("4");
  const [checkNo,setCheckNo] = useState("");
  const [posting,setPosting] = useState(false);
  const [issued,setIssued]   = useState(null);
  const [err,setErr]         = useState("");

  const search = async () => {
    setErr("");
    try {
      const d = await db.select("taxpayers",{filter:`or=(lastname.ilike.*${q}*,taxpayer_code.ilike.*${q}*)`,limit:1},token);
      if (!d.length) { setErr("Taxpayer not found. Try last name or taxpayer code."); return; }
      setFound(d[0]);
      const ps = await db.select("properties",{filter:`taxpayer_id=eq.${d[0].id}`},token);
      setPropList(ps); setStep(2);
    } catch(e){ setErr(e.message); }
  };

  const pickProp = async p => {
    setErr(""); 
    try {
      setSelProp(p);
      
      // 1. Fetch ALL historical assessments for this property
      const history = await db.select("assessments", { filter: `property_id=eq.${p.id}`, order: "tax_year.desc" }, token);
      setAsmtHistory(history || []); 
      
      // 2. Fetch Payment History (Only valid, non-voided collections)
      const payments = await db.select("collections", { filter: `property_id=eq.${p.id}&is_voided=eq.false` }, token);
      
      // Extract just the paid years into an array (e.g., [2021, 2022])
      const yearsPaid = payments ? payments.map(pay => parseInt(pay.tax_year)) : [];
      setPaidYears(yearsPaid);

      setStep(3);
    } catch(e) {
      setErr("Failed to load property: " + e.message);
    }
  };


// --- MULTI-YEAR & QUARTER-SPLIT COMPUTATION ---
const currentYear = new Date().getFullYear();
const currentMonth = new Date().getMonth() + 1; // 1 to 12

// Safely parse the years, default to current year if blank/invalid
let start = parseInt(fromYear) || currentYear;
let end = parseInt(toYear) || currentYear;
if (start > end) { let temp = start; start = end; end = temp; }

let cart = [];
let tBasic = 0, tSef = 0, tPen = 0, tDisc = 0, gTotal = 0;
const isSingle = (start === end);

for (let y = start; y <= end; y++) {
  if (paidYears.includes(y)) {
    cart.push({ year: y, display: y, quarterTag: "FULL", isPaid: true, basic: 0, sef: 0, pen: 0, disc: 0, total: 0 });
    continue; 
  }

  const activeAsmt = asmtHistory.find(a => parseInt(a.tax_year) <= y);
  const basicTax = activeAsmt ? parseFloat(activeAsmt.basic_tax) : (selProp ? parseFloat(selProp.assessed_value) * 0.01 : 0);
  const sefTax   = activeAsmt ? parseFloat(activeAsmt.sef_tax)   : (selProp ? parseFloat(selProp.assessed_value) * 0.01 : 0);
  
  let rowBasic = 0, rowSef = 0, rowPen = 0, rowDisc = 0;

  // Determine starting and ending quarters for this specific year in the loop
  let startQ = (y === start) ? parseInt(fromQuarter) : 1;
  let endQ = (y === end) ? parseInt(toQuarter) : 4;
  
  // Safety check: if paying only 1 year, and cashier accidentally puts Q4 to Q1, flip it for them
  if (y === start && y === end && startQ > endQ) { let temp = startQ; startQ = endQ; endQ = temp; }

  const qCount = (endQ - startQ) + 1;
  const qBaseDue = (basicTax + sefTax) / 4;
  
  rowBasic = (basicTax / 4) * qCount;
  rowSef = (sefTax / 4) * qCount;

  let quartersToPay = [];
  for (let q = startQ; q <= endQ; q++) quartersToPay.push(q);

  if (y > currentYear) {
    // ADVANCE PAYMENT (15% discount)
    rowDisc = (rowBasic + rowSef) * 0.15; 
    
  } else if (y < currentYear) {
    // DELINQUENT PAST YEARS (Penalty counts from Jan 1 of that year, capped at 72%)
    const mosLate = ((currentYear - y) * 12) + currentMonth;
    rowPen = (rowBasic + rowSef) * Math.min(mosLate * 0.02, 0.72);
    
  } else {
    // CURRENT YEAR (Evaluate each quarter being paid to see if it is prompt or late)
    quartersToPay.forEach(q => {
      const dueMo = q * 3; // Q1=3, Q2=6, Q3=9, Q4=12
      if (currentMonth <= dueMo) {
        rowDisc += qBaseDue * 0.10; // Prompt Discount
      } else {
        rowPen += qBaseDue * Math.min(currentMonth * 0.02, 0.72); // Late Penalty
      }
    });
  }

  const rowTot = rowBasic + rowSef - rowDisc + rowPen;
  
  // Create a clean label for the UI and the Database (e.g., "Q1-Q3" or "FULL")
  const qLabel = qCount === 4 ? "FULL" : (startQ === endQ ? `Q${startQ}` : `Q${startQ}-Q${endQ}`);
  const displayLabel = qCount === 4 ? y : `${y} (${qLabel})`;

  cart.push({ 
    year: y, display: displayLabel, quarterTag: qLabel, 
    isPaid: false, basic: rowBasic, sef: rowSef, pen: rowPen, disc: rowDisc, total: rowTot 
  });
  
  tBasic += rowBasic; tSef += rowSef; tPen += rowPen; tDisc += rowDisc; gTotal += rowTot;
}


const post = async () => {
  setPosting(true); setErr("");
  try {
    const currentYear = new Date().getFullYear();
    const baseNum = parseInt(String(Date.now()).slice(-5));
    
    // Map the cart into an array of database rows
    const rowsToInsert = cart.map((item, index) => ({
      or_number: `OR-${currentYear}-${baseNum + index}`, 
      taxpayer_id: found.id, property_id: selProp?.id,
      assessment_id: asmt?.id, tax_year: item.year,
      payment_date: today(), payment_method: method, 
      quarter: item.quarterTag,
      basic_tax: item.basic, sef_tax: item.sef, idle_tax: 0,
      penalty: item.pen, discount: item.disc, total_paid: item.total,
      cashier_id: profile?.id, check_no: checkNo || null,
    }));

    // 1. Insert all collections at once
    const insertedRows = await db.insert("collections", rowsToInsert, token);
    const col = insertedRows[0]; 
    const mainOr = col.or_number;
    
    // 2. Issue Official Receipt
    await db.insert("official_receipts",{or_number:mainOr, collection_id:col.id, printed_by:profile?.id, print_count:0},token);
    await logAudit(token,profile?.id,profile?.full_name,`${mainOr} — ${fmt(gTotal)} — ${found.lastname}`,"COLLECTION");
    
    // 3. NEW: AUTOMATICALLY CLEAR DELINQUENCIES!
    // We loop through the cart. If the year wasn't already paid previously, we update the delinquency ledger.
    for (const item of cart) {
      if (!item.isPaid) {
        try {
          await db.update(
            "delinquency", 
            { status: "PAID" }, // Change status to PAID
            { filter: `property_id=eq.${selProp.id}&tax_year=eq.${item.year}` }, 
            token
          );
        } catch (updateErr) {
          console.warn(`Could not update delinquency for ${item.year}:`, updateErr);
        }
      }
    }
    
    const displayOr = isSingle ? mainOr : `${mainOr} to OR-${currentYear}-${baseNum + cart.length - 1}`;
    setIssued({...col, or_number: displayOr, tax_year: `${start}-${end}`, basic_tax: tBasic, sef_tax: tSef, penalty: tPen, discount: tDisc, total_paid: gTotal, taxpayer:found, property:selProp, cashier:profile?.full_name});
    setStep(4);
  } catch(e){ setErr(e.message); }
  setPosting(false);
};

  const reset = () => { setStep(1);setFound(null);setPropList([]);setSelProp(null);setAsmt(null);setIssued(null);setQ("");setErr(""); };

  if (step===4 && issued) return (
    <>
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
              {[["Date:",today()],["Taxpayer:",`${issued.taxpayer.lastname}, ${issued.taxpayer.firstname}`],["Address:",issued.taxpayer.address||"—"],["TD Number:",issued.property?.td_number||"—"],["Tax Year:",issued.tax_year],["Payment:",issued.payment_method]].map(([k,v])=>(
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
              {[["OR Number",issued.or_number],["Taxpayer",`${issued.taxpayer.lastname}, ${issued.taxpayer.firstname}`],["TD No.",issued.property?.td_number||"—"],["Tax Year",issued.tax_year],["Quarter",issued.quarter],["Basic RPT",fmt(issued.basic_tax)],["SEF",fmt(issued.sef_tax)],["Total",fmt(issued.total_paid)],["Method",issued.payment_method],["Cashier",issued.cashier||"—"]].map(([k,v])=>(
                <div className="drow" key={k}><span className="dk">{k}</span><span className="dv">{v}</span></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </>
  );

  return (
    <>
      <div className="topbar">
        <div className="topbar-left"><h1>Collection</h1><p>REAL PROPERTY TAX PAYMENT PROCESSING</p></div>
      </div>
      <div className="page-body">
        <div className="steps">
          {[["1","Search Taxpayer"],["2","Select Property"],["3","Compute & Pay"],["4","Receipt"]].map(([n,l],i)=>(
            <>
              <div key={n} className={`step ${step===i+1?"active":step>i+1?"done":""}`}>
                <div className="step-num">{step>i+1?"✓":n}</div>
                {l}
              </div>
              {i<3 && <div key={`sep-${n}`} className="step-sep"/>}
            </>
          ))}
        </div>

        {err && <div className="banner banner-err"><span className="banner-icon">⚠</span>{err}</div>}

        {step===1 && (
          <div className="panel" style={{maxWidth:520}}>
            <div className="panel-title">Search Taxpayer</div>
            <div className="form-group" style={{marginBottom:14}}>
              <label className="form-label">Last Name or Taxpayer Code</label>
              <input value={q} onChange={e=>setQ(e.target.value)} onKeyDown={e=>e.key==="Enter"&&search()} placeholder="e.g. DELA CRUZ or TP-2025-001"/>
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
              ? <div className="empty"><div className="empty-icon">🏠</div><div className="empty-text">No properties on record for this taxpayer</div></div>
              : propList.map(p=>(
                  <div className="prop-card" key={p.id} onClick={()=>pickProp(p)}>
                    <div className="prop-card-left">
                      <h3>{p.td_number} &nbsp;<span className="badge badge-blue">{p.classification}</span></h3>
                      <p>AV: {fmt(p.assessed_value)} · {p.barangay||"—"}</p>
                    </div>
                    <button className="btn btn-primary btn-sm">Select →</button>
                  </div>
                ))
            }
            <button className="btn btn-ghost btn-sm" style={{marginTop:8}} onClick={()=>setStep(1)}>← Back</button>
          </div>
        )}

        {step===3 && selProp && (
          <div className="two-col">
            <div>
              <div className="panel">
                <div className="panel-title">Property Details</div>
                <div className="detail-grid">
                  {[["TD No.",selProp.td_number],["Classification",selProp.classification],["Market Value",fmt(selProp.market_value)],["Asmt. Level",(parseFloat(selProp.assessment_level)*100).toFixed(0)+"%"],["Assessed Value",fmt(selProp.assessed_value)]].map(([k,v])=>(
                    <div className="drow" key={k}><span className="dk">{k}</span><span className="dv">{v}</span></div>
                  ))}
                </div>
              </div>
              <div className="panel">
                <div className="panel-title">Payment Options</div>
                <div className="form-grid" style={{marginBottom:14}}>
                <div className="form-group">
                    <label className="form-label">From</label>
                    <div style={{display: "flex", gap: "8px"}}>
                      {/* Fixed width of 80px and reduced padding for the year */}
                      <input type="number" value={fromYear} onChange={(e) => setFromYear(e.target.value)} min="1950" max={new Date().getFullYear() + 5} style={{width: "80px", padding: "10px 8px", textAlign: "center"}} />
                      {/* flex: 1 makes the select take up the remaining space */}
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
                      <input type="number" value={toYear} onChange={(e) => setToYear(e.target.value)} min="1950" max={new Date().getFullYear() + 5} style={{width: "80px", padding: "10px 8px", textAlign: "center"}} />
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
                      {cart.map(c => (
                        <tr key={c.year} style={c.isPaid ? { backgroundColor: "var(--bg2)", opacity: 0.7 } : {}}>
                        <td><span className="chip">{c.display}</span></td>
                          
                          {/* If the year is paid, merge the columns and show a green badge */}
                          {c.isPaid ? (
                            <td colSpan="4" style={{ textAlign: "center", fontSize: "12px", color: "var(--green2)", fontWeight: 700, letterSpacing: "1px" }}>
                              ALREADY PAID
                            </td>
                          ) : (
                            /* If not paid, show the normal math */
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
              <div className="banner banner-warn">
                <span className="banner-icon">⚠</span>
                <span>Verify taxpayer identity before posting. ORs cannot be voided without Treasurer authorization.</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}

/* ═══════════════════════════════════════════════════════════
   DELINQUENCY
═══════════════════════════════════════════════════════════ */
function Delinquency({ token, profile }) {
  const [list,setList] = useState([]);
  const [loading,setLoading] = useState(true);
  const [showCalc,setShowCalc] = useState(false);
  const [showAdd,setShowAdd]   = useState(false);
  const [saving,setSaving]     = useState(false);
  const [deleting,setDeleting] = useState(false); // ADDED
  const [allProps,setAllProps] = useState([]);
  const [asmtHistory, setAsmtHistory] = useState([]); 
  const [paidCollections, setPaidCollections] = useState([]); // ADD THIS LINE
  const [soaData, setSoaData]  = useState(null); // ADDED
  const [calcTax,setCalcTax]   = useState("");
  const [calcMo,setCalcMo]     = useState("");
  
  // UPDATED to include target_month
  const [form, setForm] = useState({ 
    property_id: "", 
    from_year: String(new Date().getFullYear() - 5), 
    to_year: String(new Date().getFullYear() - 1),
    target_month: String(new Date().getMonth() + 1)
  });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const d = await db.select("delinquency",{
        filter:"status=eq.UNPAID",
        select:"*,properties(td_number,classification),taxpayers(lastname,firstname)",
        order:"months_delinquent.desc"
      },token);
      setList(d);
    } catch(e){console.error(e);}
    setLoading(false);
  },[token]);

  useEffect(()=>{ load(); },[load]);

  const loadProps = async () => {
    // Added assessed_value to the select query
    const d = await db.select("properties",{select:"id,td_number,taxpayer_id,assessed_value,taxpayers(lastname,firstname)",limit:500},token);
    setAllProps(d);
  };
// 1. Fetch history instantly when property changes
useEffect(() => {
  if (!form.property_id) { 
    setAsmtHistory([]); 
    setPaidCollections([]); 
    return; 
  }
  
  // Fetch Assessment History
  db.select("assessments", { filter: `property_id=eq.${form.property_id}`, order: "tax_year.desc" }, token)
    .then(d => setAsmtHistory(d || []));

  // Fetch Collection History (to deduct already paid quarters!)
  db.select("collections", { filter: `property_id=eq.${form.property_id}&is_voided=eq.false` }, token)
    .then(d => setPaidCollections(d || []));
}, [form.property_id, token]);
// 2. Generate the Detailed Computation (SOA)
const generateSOA = () => {
  const prop = allProps.find(p => p.id === parseInt(form.property_id));
  if (!prop) { alert("Please select a property first."); return; }
  
  const currentYear = new Date().getFullYear();
  const payMonth = parseInt(form.target_month);
  
  let start = parseInt(form.from_year);
  let end = parseInt(form.to_year);
  if (start > end) { let temp = start; start = end; end = temp; }

  let rows = [];
  let tBasic = 0, tSef = 0, tPen = 0, tDisc = 0, gTotal = 0;
  let maxMos = 0, oldestAsmtId = null;

  for (let y = start; y <= end; y++) {
    let activeAsmt = asmtHistory.find(a => parseInt(a.tax_year) <= y);
    let dbAsmt = activeAsmt;
    if (!dbAsmt && asmtHistory.length > 0) dbAsmt = asmtHistory[asmtHistory.length - 1];
    if (y === start) oldestAsmtId = dbAsmt ? dbAsmt.id : null;

    const basic = activeAsmt ? parseFloat(activeAsmt.basic_tax) : (prop?.assessed_value ? parseFloat(prop.assessed_value) * 0.01 : 0);
    const sef = activeAsmt ? parseFloat(activeAsmt.sef_tax) : (prop?.assessed_value ? parseFloat(prop.assessed_value) * 0.01 : 0);
    
    // --- CHECK PREVIOUS PAYMENTS ---
    const yearPayments = paidCollections.filter(c => parseInt(c.tax_year) === y);
    let paidQuarters = [];
    yearPayments.forEach(p => {
      const qTag = p.quarter;
      if (qTag === "FULL") paidQuarters.push(1, 2, 3, 4);
      else if (qTag && qTag.includes("-")) {
        const parts = qTag.split("-");
        const startQ = parseInt(parts[0].replace("Q",""));
        const endQ = parseInt(parts[1].replace("Q",""));
        for(let i=startQ; i<=endQ; i++) paidQuarters.push(i);
      } else if (qTag && qTag.startsWith("Q")) {
        paidQuarters.push(parseInt(qTag.replace("Q","")));
      }
    });

    // Skip this year completely if all 4 quarters are already paid
    if (paidQuarters.includes(1) && paidQuarters.includes(2) && paidQuarters.includes(3) && paidQuarters.includes(4)) {
        continue; 
    }

    let rowBasic = 0, rowSef = 0, rowPen = 0, rowDisc = 0;
    let mosLate = 0;

    const qBaseBasic = basic / 4;
    const qBaseSef = sef / 4;
    const qDeadlines = [3, 6, 9, 12];

    // --- APPLY QUARTERLY MATH EXACTLY LIKE COLLECTION ---
    if (y < currentYear) {
      // Delinquent Past Years
      mosLate = ((currentYear - y) * 12) + payMonth;
      const penaltyRate = Math.min(mosLate * 0.02, 0.72);
      
      [1, 2, 3, 4].forEach(q => {
        if (!paidQuarters.includes(q)) {
          rowBasic += qBaseBasic;
          rowSef += qBaseSef;
          rowPen += (qBaseBasic + qBaseSef) * penaltyRate;
        }
      });
    } else if (y === currentYear) {
      // Current Year - Split into Quarters!
      [1, 2, 3, 4].forEach(q => {
        if (!paidQuarters.includes(q)) {
          rowBasic += qBaseBasic;
          rowSef += qBaseSef;
          const dueMo = qDeadlines[q - 1]; // Mar, Jun, Sep, Dec
          
          if (payMonth <= dueMo) {
            rowDisc += (qBaseBasic + qBaseSef) * 0.10; // Prompt
          } else {
            rowPen += (qBaseBasic + qBaseSef) * Math.min(payMonth * 0.02, 0.72); // Late
          }
        }
      });
    } else {
      // Advance Payment (Future Years)
      [1, 2, 3, 4].forEach(q => {
        if (!paidQuarters.includes(q)) {
          rowBasic += qBaseBasic;
          rowSef += qBaseSef;
          rowDisc += (qBaseBasic + qBaseSef) * 0.15; 
        }
      });
    }

    if (mosLate > maxMos) maxMos = mosLate;
    const rowTotal = rowBasic + rowSef + rowPen - rowDisc;

    // Only add row if there is a remaining unpaid balance
    if (rowTotal > 0) {
        rows.push({ year: y, basic: rowBasic, sef: rowSef, penalty: rowPen, discount: rowDisc, total: rowTotal });
        tBasic += rowBasic; tSef += rowSef; tPen += rowPen; tDisc += rowDisc; gTotal += rowTotal;
    }
  }

  if (rows.length === 0) {
      alert("This property is already fully paid for the selected years!");
      return;
  }

  setSoaData({ property: prop, oldestAsmtId, start_year: start, end_year: end, target_month: payMonth, max_months: maxMos, rows, totals: { basic: tBasic, sef: tSef, penalty: tPen, discount: tDisc, total: gTotal } });
};

// 3. Save the computed SOA to the Database
const saveSOA = async () => {
  setSaving(true);
  try {
    // FIX: Map every year into its own row so they can be individually paid later!
    const rowsToInsert = soaData.rows.map(r => ({
      assessment_id: soaData.oldestAsmtId, 
      property_id: soaData.property.id, 
      taxpayer_id: soaData.property.taxpayer_id, 
      tax_year: parseInt(r.year), 
      unpaid_basic: r.basic, 
      unpaid_sef: r.sef, 
      months_delinquent: Math.min(soaData.max_months, 36), 
      interest_amount: r.penalty, 
      total_due: r.total, 
      status: "UNPAID"
    }));

    await db.insert("delinquency", rowsToInsert, token);
    await logAudit(token, profile?.id, profile?.full_name, `Delinquency SOA logged: ${soaData.property.td_number} (${soaData.start_year}-${soaData.end_year})`, "DELINQUENCY");
    
    setSoaData(null); setShowAdd(false); load();
  } catch(e) { alert(e.message); }
  setSaving(false);
};

// 4. Delete Record (Updated to delete all years in the group)
const handleDeleteGroup = async (group) => {
  if (!window.confirm(`Permanently delete ALL unpaid delinquency records for TD ${group.properties?.td_number}?`)) return;
  setDeleting(true);
  try {
    await db.delete("delinquency", { filter: `id=in.(${group.rowIds.join(',')})` }, token);
    await logAudit(token, profile?.id, profile?.full_name, `Deleted delinquency records for ${group.properties?.td_number}`, "DELINQUENCY");
    load();
  } catch(e) { alert("Delete failed: " + e.message); }
  setDeleting(false);
};

// 5. View an already saved SOA (Updated to show individual years)
const viewSavedSOA = (group) => {
  // Sort the individual years so they appear in order (e.g., 2021, 2022, 2023)
  const sortedDetails = group.details.sort((a, b) => parseInt(a.tax_year) - parseInt(b.tax_year));

  // Map the saved database rows into the format the SOA table expects
  const detailedRows = sortedDetails.map(d => ({
    year: d.tax_year,
    basic: parseFloat(d.unpaid_basic) || 0,
    sef: parseFloat(d.unpaid_sef) || 0,
    penalty: parseFloat(d.interest_amount) || 0,
    discount: 0,
    total: parseFloat(d.total_due) || 0
  }));

  setSoaData({
    isSavedRecord: true, 
    property: { 
      id: group.property_id, 
      td_number: group.properties?.td_number, 
      taxpayer_id: group.taxpayer_id, 
      taxpayers: group.taxpayers 
    },
    start_year: group.minYear, 
    end_year: group.maxYear, 
    target_month: new Date().getMonth() + 1, 
    rows: detailedRows, // THE FIX: Feed the individual rows to the table!
    totals: { 
      basic: group.sum_basic, 
      sef: group.sum_sef, 
      penalty: group.sum_int, 
      discount: 0, 
      total: group.sum_total 
    }
  });
};

 // Group the list visually so we only see 1 row per property in the table!
 const groupedList = Object.values(list.reduce((acc, d) => {
  const pid = d.property_id;
  if (!acc[pid]) {
    acc[pid] = { 
      ...d, 
      minYear: parseInt(d.tax_year), 
      maxYear: parseInt(d.tax_year), 
      sum_basic: 0, sum_sef: 0, sum_int: 0, sum_total: 0, rowIds: [],
      details: [] // THE FIX: Add an array to hold the individual years
    };
  }
  acc[pid].minYear = Math.min(acc[pid].minYear, parseInt(d.tax_year));
  acc[pid].maxYear = Math.max(acc[pid].maxYear, parseInt(d.tax_year));
  acc[pid].sum_basic += parseFloat(d.unpaid_basic) || 0;
  acc[pid].sum_sef += parseFloat(d.unpaid_sef) || 0;
  acc[pid].sum_int += parseFloat(d.interest_amount) || 0;
  acc[pid].sum_total += parseFloat(d.total_due) || 0;
  acc[pid].rowIds.push(d.id); 
  acc[pid].details.push(d); // THE FIX: Push the actual row data into the details array
  return acc;
}, {}));

  const totals = groupedList.reduce((a,d)=>({due:a.due+d.sum_total, int:a.int+d.sum_int}), {due:0, int:0});

  return (
    <>
      <div className="topbar">
        <div className="topbar-left"><h1>Delinquency Monitor</h1><p>INTEREST = UNPAID × 2% × MONTHS (MAX 36)</p></div>
        <div className="topbar-right">
          <button className="btn btn-outline" onClick={()=>setShowCalc(!showCalc)}>🧮 Calculator</button>
          {["admin","treasurer","assessor"].includes(profile?.role) &&
            <button className="btn btn-gold" onClick={()=>{setShowAdd(!showAdd);loadProps();}}>＋ Add Record</button>}
        </div>
      </div>

      <div className="stat-row" style={{gridTemplateColumns:"repeat(3,1fr)"}}>
        {[
          { label:"Delinquent Accounts", value:list.length, color:"red",   icon:"⚠️", isCur:false },
          { label:"Total Penalties",     value:totals.int,  color:"gold",  icon:"📊", isCur:true },
          { label:"Total Amount Due",    value:totals.due,  color:"blue",  icon:"💸", isCur:true },
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
              <div className="form-group">
                <label className="form-label">Unpaid Tax Amount (₱)</label>
                <input type="number" value={calcTax} onChange={e=>setCalcTax(e.target.value)} placeholder="10000"/>
              </div>
              <div className="form-group">
                <label className="form-label">Months Delinquent (max 36)</label>
                <input type="number" max={36} value={calcMo} onChange={e=>setCalcMo(e.target.value)} placeholder="12"/>
              </div>
              <div className="form-group">
                <label className="form-label">Interest Amount</label>
                <div style={{background:"var(--bg3)",border:"1px solid var(--border2)",padding:"10px 14px",borderRadius:9,fontFamily:"var(--font-mono)",fontWeight:700,color:"var(--gold2)",fontSize:14}}>
                  {calcTax&&calcMo ? fmt(calcInt(calcTax,calcMo)) : "—"}
                </div>
              </div>
            </div>
            {calcTax&&calcMo&&(
              <div className="banner banner-gold" style={{background:"var(--gold-dim)",border:"1px solid rgba(212,168,67,.2)",color:"var(--gold2)"}}>
                <span className="banner-icon">🧮</span>
                Total Due: <strong>{fmt((parseFloat(calcTax)||0)+calcInt(calcTax,calcMo))}</strong> · Formula: {fmt(calcTax)} × 2% × {Math.min(parseInt(calcMo),36)} months
              </div>
            )}
          </div>
        )}

{showAdd && (
          <div className="panel" style={{marginBottom:16}}>
            <div className="panel-title">Add Delinquency Record</div>
            
            <div className="form-grid" style={{marginBottom:14}}>
              <div className="form-group span2">
                <label className="form-label">Select Delinquent Property</label>
                <select value={form.property_id} onChange={e=>setForm(f=>({...f,property_id:e.target.value}))}>
                  <option value="">— Select property —</option>
                  {allProps.map(p=><option key={p.id} value={p.id}>{p.td_number} — {p.taxpayers?.lastname}, {p.taxpayers?.firstname}</option>)}
                </select>
              </div>
              
              <div className="form-group">
                <label className="form-label">From Year</label>
                <input type="number" value={form.from_year} onChange={e=>setForm(f=>({...f,from_year:e.target.value}))}/>
              </div>
              
              <div className="form-group">
                <label className="form-label">To Year</label>
                <input type="number" value={form.to_year} onChange={e=>setForm(f=>({...f,to_year:e.target.value}))}/>
              </div>

              <div className="form-group span2">
                <label className="form-label">Target Payment Month (Projection)</label>
                <select value={form.target_month} onChange={e=>setForm(f=>({...f,target_month:e.target.value}))}>
                  {["January","February","March","April","May","June","July","August","September","October","November","December"].map((m, i) => (
                    <option key={i+1} value={i+1}>{m}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="gap-row">
              <button className="btn btn-primary" onClick={generateSOA}>🧮 Compute & View SOA</button>
              <button className="btn btn-outline" onClick={()=>setShowAdd(false)}>Cancel</button>
            </div>
          </div>
        )}

        {/* --- SOA COMPUTATION POP-UP MODAL --- */}
        {soaData && (
          <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.8)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div className="card soa-print-area" style={{ width: "700px", maxWidth: "95%", maxHeight: "90vh", overflowY: "auto", background: "var(--bg)", border: "1px solid var(--border)" }}>
              <div className="card-header no-print">
                <div><div className="card-title">Statement of Account (SOA)</div></div>
                <button className="btn btn-ghost btn-sm" onClick={() => setSoaData(null)}>✕ Close</button>
              </div>
              <div className="card-body" style={{background: "#fff", color: "#000"}}>
                
                {/* Printable Header */}
                <div style={{textAlign: "center", marginBottom: 20}}>
                  <h2 style={{fontFamily: "var(--font-display)", margin: 0, color: "#000"}}>Municipality of Macalelon</h2>
                  <h3 style={{fontWeight: 400, fontSize: 14, margin: "4px 0", color: "#444"}}>Office of the Municipal Treasurer</h3>
                  <h2 style={{marginTop: 12, color: "#000"}}>STATEMENT OF DELINQUENCY</h2>
                </div>

                {/* Taxpayer Details */}
                <div style={{display: "flex", justifyContent: "space-between", marginBottom: 20, fontSize: 13, color: "#000"}}>
                   <div>
                      <strong>Taxpayer:</strong> {soaData.property.taxpayers?.lastname}, {soaData.property.taxpayers?.firstname}<br/>
                      <strong>TD Number:</strong> {soaData.property.td_number}
                   </div>
                   <div style={{textAlign: "right"}}>
                      <strong>Date Generated:</strong> {new Date().toLocaleDateString()}<br/>
                      <strong>Valid Until:</strong> End of {["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"][soaData.target_month-1]} {new Date().getFullYear()}
                   </div>
                </div>

                {/* Computation Table */}
                <table style={{width: "100%", fontSize: 12, borderCollapse: "collapse", color: "#000"}} border="1">
                  <thead>
                    <tr style={{background: "#eee"}}>
                      <th style={{padding: 8, color: "#000"}}>Year</th>
                      <th style={{padding: 8, color: "#000"}}>Basic</th>
                      <th style={{padding: 8, color: "#000"}}>SEF</th>
                      <th style={{padding: 8, color: "#000"}}>Penalty</th>
                      <th style={{padding: 8, color: "#000"}}>Discount</th>
                      <th style={{padding: 8, color: "#000"}}>Total Due</th>
                    </tr>
                  </thead>
                  <tbody>
                    {soaData.rows.map(r => (
                      <tr key={r.year} style={{textAlign: "right"}}>
                        <td style={{padding: 8, textAlign: "center", color: "#000"}}>{r.year}</td>
                        <td style={{padding: 8, color: "#000"}}>{fmt(r.basic)}</td>
                        <td style={{padding: 8, color: "#000"}}>{fmt(r.sef)}</td>
                        <td style={{padding: 8, color: r.penalty > 0 ? "red" : "#000"}}>{r.penalty > 0 ? `+${fmt(r.penalty)}` : "—"}</td>
                        <td style={{padding: 8, color: r.discount > 0 ? "green" : "#000"}}>{r.discount > 0 ? `-${fmt(r.discount)}` : "—"}</td>
                        <td style={{padding: 8, fontWeight: "bold", color: "#000"}}>{fmt(r.total)}</td>
                      </tr>
                    ))}
                    <tr style={{background: "#eee", fontWeight: "bold", textAlign: "right"}}>
                      <td style={{padding: 8, textAlign: "center", color: "#000"}}>GRAND TOTAL</td>
                      <td style={{padding: 8, color: "#000"}}>{fmt(soaData.totals.basic)}</td>
                      <td style={{padding: 8, color: "#000"}}>{fmt(soaData.totals.sef)}</td>
                      <td style={{padding: 8, color: "red"}}>{fmt(soaData.totals.penalty)}</td>
                      <td style={{padding: 8, color: "green"}}>{soaData.totals.discount > 0 ? `-${fmt(soaData.totals.discount)}` : "—"}</td>
                      <td style={{padding: 8, fontSize: 14, color: "#000"}}>{fmt(soaData.totals.total)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
              
              <div className="card-header no-print" style={{justifyContent: "center", gap: 10, borderTop: "1px solid var(--border)", borderBottom: "none"}}>
                <button className="btn btn-outline" onClick={() => window.print()} style={{color: "var(--text)", borderColor: "var(--border2)"}}>🖨️ Print SOA</button>
                
                {/* Only show the Save button if this is a NEW computation, not an already saved record */}
                {!soaData.isSavedRecord && (
                  <button className="btn btn-success" onClick={saveSOA} disabled={saving}>{saving ? "Saving..." : "💾 Save to Registry"}</button>
                )}
              </div>
            </div>
          </div>
        )}

        <div className="card">
          <div className="card-header"><div className="card-title">Delinquent Accounts</div><span className="chip">{list.length} accounts</span></div>
          {loading
            ? <div className="loading-state"><span className="spin"/>Loading delinquency records…</div>
            : list.length===0
              ? <div className="empty"><div className="empty-icon">✅</div><div className="empty-text">No delinquent accounts on record</div></div>
              : <div className="table-wrap"><table>
                  <thead><tr><th>TD No.</th><th>Taxpayer</th><th>Year</th><th>Months</th><th>Basic + SEF</th><th>Interest</th><th>Total Due</th><th>Status</th></tr></thead>
                  <tbody>
                    {groupedList.map(d=>(
                      <tr key={d.property_id}>
                        <td><span className="mono">{d.properties?.td_number||"—"}</span></td>
                        <td style={{fontWeight:600}}>{d.taxpayers?`${d.taxpayers.lastname}, ${d.taxpayers.firstname}`:"—"}</td>
                        <td><span className="chip">{d.minYear === d.maxYear ? d.minYear : `${d.minYear} - ${d.maxYear}`}</span></td>
                        <td><span className="mono">{d.months_delinquent} mos.</span></td>
                        <td><span className="mono">{fmt(d.sum_basic + d.sum_sef)}</span></td>
                        <td><span className="mono" style={{color:"var(--red2)",fontWeight:600}}>{fmt(d.sum_int)}</span></td>
                        <td><span className="mono" style={{color:"var(--gold2)",fontWeight:700,fontSize:13}}>{fmt(d.sum_total)}</span></td>
                        <td><span className="badge badge-red">{d.status}</span></td>
                        <td>
                          <div style={{display: "flex", gap: "6px"}}>
                            <button className="btn btn-ghost btn-xs" style={{color: "var(--blue2)"}} onClick={() => viewSavedSOA(d)}>🖨️ SOA</button>
                            {["admin", "treasurer"].includes(profile?.role) && (
                              <button className="btn btn-ghost btn-xs" style={{color: "var(--red2)"}} onClick={() => handleDeleteGroup(d)} disabled={deleting}>✕ Delete</button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                    <tr style={{background:"rgba(0,0,0,0.25)"}}>
                      <td colSpan={6} style={{fontWeight:700,fontSize:12,fontFamily:"var(--font-mono)",color:"var(--text3)"}}>GRAND TOTAL</td>
                      <td><span className="mono" style={{fontWeight:800,color:"var(--gold2)",fontSize:14}}>{fmt(totals.due)}</span></td>
                      <td colSpan={2}/>
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
   RECEIPTS
═══════════════════════════════════════════════════════════ */
function Receipts({ token, profile }) {
  const [list,setList]   = useState([]);
  const [loading,setLoading] = useState(true);
  const [page,setPage]   = useState(0);
  const [deleting,setDeleting] = useState(false);
  const PER = 25;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const d = await db.select("collections",{
        // NOTICE the "id," added right here:
        select:"id,or_number,payment_date,total_paid,basic_tax,sef_tax,payment_method,tax_year,is_voided,taxpayers(lastname,firstname)",
        order:"created_at.desc", limit:PER, offset:page*PER,
      },token);
      setList(d);
    } catch(e){console.error(e);}
    setLoading(false);
  },[token,page]);

  useEffect(() => { load(); }, [load]);

  const handleDelete = async (rec) => {
    if (!window.confirm(`Permanently delete Receipt ${rec.or_number}? This cannot be undone.`)) return;
    setDeleting(true);
    try {
      try { await db.delete("official_receipts", { filter: `collection_id=eq.${rec.id}` }, token); } catch(e){}
      await db.delete("collections", { filter: `id=eq.${rec.id}` }, token);
      await logAudit(token, profile?.id, profile?.full_name, `Deleted OR: ${rec.or_number}`, "RECEIPTS");
      load(); 
    } catch(e) {
      alert("Failed to delete receipt: " + e.message);
    }
    setDeleting(false);
  };

  return (
    <>
      <div className="topbar"><div className="topbar-left"><h1>Official Receipts</h1><p>OR REGISTER & LEDGER</p></div></div>
      <div className="page-body">
        <div className="card">
          <div className="card-header"><div className="card-title">OR Register</div></div>
          {loading
            ? <div className="loading-state"><span className="spin"/>Loading receipts…</div>
            : list.length===0
              ? <div className="empty"><div className="empty-icon">🧾</div><div className="empty-text">No receipts issued yet</div></div>
              : <div className="table-wrap"><table>
                  <thead><tr><th>OR Number</th><th>Date</th><th>Taxpayer</th><th>Year</th><th>Basic</th><th>SEF</th><th>Total</th><th>Method</th><th>Status</th><th></th></tr></thead>
                  <tbody>
                    {list.map((c,i)=>(
                      <tr key={i}>
                        <td><span className="badge badge-blue">{c.or_number}</span></td>
                        <td><span className="mono-sm">{c.payment_date}</span></td>
                        <td style={{fontWeight:600,fontSize:13}}>{c.taxpayers?`${c.taxpayers.lastname}, ${c.taxpayers.firstname}`:"—"}</td>
                        <td><span className="chip">{c.tax_year}</span></td>
                        <td><span className="mono">{fmt(c.basic_tax)}</span></td>
                        <td><span className="mono">{fmt(c.sef_tax)}</span></td>
                        <td><span className="mono" style={{color:"var(--green2)",fontWeight:700}}>{fmt(c.total_paid)}</span></td>
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
   REPORTS
═══════════════════════════════════════════════════════════ */
function Reports({ token, profile }) {
  const [tab,setTab]   = useState("daily");
  const [date,setDate] = useState(today());
  const [data,setData] = useState([]);
  const [loading,setLoading] = useState(false);
  const [deleting,setDeleting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      if (tab==="delinq") {
        // Added 'id'
        const d = await db.select("delinquency",{filter:"status=eq.UNPAID",select:"id,*,properties(td_number),taxpayers(lastname,firstname)",order:"months_delinquent.desc"},token);
        setData(d); setLoading(false); return;
      }
      const filter = tab==="daily"
        ? `payment_date=eq.${date}&is_voided=eq.false`
        : `payment_date=gte.${date.slice(0,7)}-01&payment_date=lte.${date.slice(0,7)}-31&is_voided=eq.false`;
      
      // Added 'id'
      const d = await db.select("collections",{filter,select:"id,*,taxpayers(lastname,firstname)",order:"created_at.asc"},token);
      setData(d);
    } catch(e){console.error(e);}
    setLoading(false);
  },[tab,date,token]);

  useEffect(()=>{ load(); },[load]);

  // Add Delete Function
  const handleDelete = async (item, type) => {
    if (!window.confirm(`Permanently delete this ${type} record?`)) return;
    setDeleting(true);
    try {
      if (type === "collection") {
        try { await db.delete("official_receipts", { filter: `collection_id=eq.${item.id}` }, token); } catch(e){}
        await db.delete("collections", { filter: `id=eq.${item.id}` }, token);
        await logAudit(token, profile?.id, profile?.full_name, `Deleted collection OR: ${item.or_number}`, "REPORTS");
      } else {
        await db.delete("delinquency", { filter: `id=eq.${item.id}` }, token);
        await logAudit(token, profile?.id, profile?.full_name, `Deleted delinquency record`, "REPORTS");
      }
      load();
    } catch(e) { alert("Delete failed: " + e.message); }
    setDeleting(false);
  };

  useEffect(()=>{ load(); },[load]);
  const sum = f => data.reduce((a,c)=>a+(+c[f]||0),0);

  return (
    <>
      <div className="topbar">
        <div className="topbar-left"><h1>Reports</h1><p>COA-COMPLIANT TREASURY REPORTS</p></div>
        <div className="topbar-right">
          <input type="date" value={date} onChange={e=>setDate(e.target.value)} style={{width:168}}/>
        </div>
      </div>
      <div className="page-body">
        <div className="tabs-bar">
          {[["daily","Daily Collection"],["monthly","Monthly Summary"],["delinq","Delinquency Aging"]].map(([id,label])=>(
            <button key={id} className={`tab-btn ${tab===id?"active":""}`} onClick={()=>setTab(id)}>{label}</button>
          ))}
        </div>

        {loading ? <div className="loading-state"><span className="spin"/>Generating report…</div> : <>
          {(tab==="daily"||tab==="monthly") && (
            <>
              <div className="stat-row" style={{gridTemplateColumns:"repeat(4,1fr)",padding:0,marginBottom:20}}>
                {[
                  {label:"Basic RPT",value:sum("basic_tax"),color:"blue"},
                  {label:"SEF",      value:sum("sef_tax"),  color:"green"},
                  {label:"Penalties",value:sum("penalty"),  color:"gold"},
                  {label:"Total",    value:sum("total_paid"),color:"red"},
                ].map(s=>(
                  <div className="stat-card" key={s.label}>
                    <div className={`stat-accent ${s.color}`}/>
                    <div className="stat-label">{s.label}</div>
                    <div className="stat-value big-num"><Counter value={s.value} isCurrency={true}/></div>
                  </div>
                ))}
              </div>
              <div className="card">
                <div className="card-header">
                  <div>
                    <div className="card-title">{tab==="daily"?"Daily":"Monthly"} Collection Report</div>
                    <div className="card-sub">{date.slice(0,tab==="monthly"?7:10)} · {data.length} transaction(s)</div>
                  </div>
                  <button className="btn btn-outline btn-sm">Export PDF</button>
                </div>
                {data.length===0
                  ? <div className="empty"><div className="empty-icon">📋</div><div className="empty-text">No collections for this period</div></div>
                  : <div className="table-wrap"><table>
                      <thead><tr><th>OR No.</th><th>Date</th><th>Taxpayer</th><th>Basic</th><th>SEF</th><th>Penalty</th><th>Total</th><th>Method</th></tr></thead>
                      <tbody>
                        {data.map((c,i)=>(
                          <tr key={i}>
                            <td><span className="badge badge-blue">{c.or_number}</span></td>
                            <td><span className="mono-sm">{c.payment_date}</span></td>
                            <td style={{fontWeight:600,fontSize:13}}>{c.taxpayers?`${c.taxpayers.lastname}, ${c.taxpayers.firstname}`:"—"}</td>
                            <td><span className="mono">{fmt(c.basic_tax)}</span></td>
                            <td><span className="mono">{fmt(c.sef_tax)}</span></td>
                            <td><span className="mono">{fmt(c.penalty)}</span></td>
                            <td><span className="mono" style={{color:"var(--green2)",fontWeight:700}}>{fmt(c.total_paid)}</span></td>
                            <td><span className="chip">{c.payment_method}</span></td>
                            <td>
                                {["admin", "treasurer"].includes(profile?.role) && (
                                  <button className="btn btn-ghost btn-xs" style={{color: "var(--red2)"}} onClick={() => handleDelete(c, "collection")} disabled={deleting}>✕</button>
                                )}
                            </td>
                          </tr>
                        ))}
                        <tr style={{background:"rgba(0,0,0,0.25)"}}>
                          <td colSpan={3} style={{fontWeight:700,fontSize:12,fontFamily:"var(--font-mono)",letterSpacing:"0.05em",color:"var(--text3)"}}>TOTAL</td>
                          <td><span className="mono" style={{fontWeight:700}}>{fmt(sum("basic_tax"))}</span></td>
                          <td><span className="mono" style={{fontWeight:700}}>{fmt(sum("sef_tax"))}</span></td>
                          <td><span className="mono" style={{fontWeight:700}}>{fmt(sum("penalty"))}</span></td>
                          <td><span className="mono" style={{fontWeight:800,color:"var(--green2)",fontSize:14}}>{fmt(sum("total_paid"))}</span></td>
                          <td/>
                        </tr>
                      </tbody>
                    </table></div>
                }
              </div>
            </>
          )}
          {tab==="delinq" && (
            <div className="card">
              <div className="card-header">
                <div><div className="card-title">Delinquency Aging Report</div><div className="card-sub">As of {today()} · {data.length} accounts</div></div>
                <button className="btn btn-outline btn-sm">Export PDF</button>
              </div>
              {data.length===0
                ? <div className="empty"><div className="empty-icon">✅</div><div className="empty-text">No delinquent accounts</div></div>
                : <div className="table-wrap"><table>
                    <thead><tr><th>TD No.</th><th>Taxpayer</th><th>Year</th><th>Months</th><th>Basic + SEF</th><th>Interest</th><th>Total Due</th></tr></thead>
                    <tbody>
                      {data.map((d,i)=>(
                        <tr key={i}>
                          <td><span className="mono">{d.properties?.td_number||"—"}</span></td>
                          <td style={{fontWeight:600}}>{d.taxpayers?`${d.taxpayers.lastname}, ${d.taxpayers.firstname}`:"—"}</td>
                          <td><span className="chip">{d.tax_year}</span></td>
                          <td><span className="mono">{d.months_delinquent} mos.</span></td>
                          <td><span className="mono">{fmt((+d.unpaid_basic||0)+(+d.unpaid_sef||0))}</span></td>
                          <td><span className="mono" style={{color:"var(--red2)"}}>{fmt(d.interest_amount)}</span></td>
                          <td><span className="mono" style={{fontWeight:700,color:"var(--gold2)"}}>{fmt(d.total_due)}</span></td>
                          <td>
                              {["admin", "treasurer"].includes(profile?.role) && (
                                <button className="btn btn-ghost btn-xs" style={{color: "var(--red2)"}} onClick={() => handleDelete(d, "delinquency")} disabled={deleting}>✕</button>
                              )}
                          </td>
                        </tr>
                      ))}
                      <tr style={{background:"rgba(0,0,0,0.25)"}}>
                        <td colSpan={6} style={{fontWeight:700,fontSize:12,fontFamily:"var(--font-mono)",color:"var(--text3)"}}>GRAND TOTAL</td>
                        <td><span className="mono" style={{fontWeight:800,color:"var(--gold2)",fontSize:14}}>{fmt(data.reduce((a,d)=>a+(+d.total_due||0),0))}</span></td>
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
   AUDIT LOGS
═══════════════════════════════════════════════════════════ */
function AuditLogs({ token }) {
  const [logs,setLogs]   = useState([]);
  const [loading,setLoading] = useState(true);
  const [page,setPage]   = useState(0);
  const PER = 30;

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const d = await db.select("audit_logs",{order:"created_at.desc",limit:PER,offset:page*PER},token);
        setLogs(d);
      } catch(e){console.error(e);}
      setLoading(false);
    })();
  },[token,page]);

  return (
    <>
      <div className="topbar"><div className="topbar-left"><h1>Audit Logs</h1><p>COA-COMPLIANT IMMUTABLE ACTIVITY TRAIL</p></div></div>
      <div className="page-body">
        <div className="banner banner-info"><span className="banner-icon">🔒</span><span>All log entries are immutable — timestamped, user-attributed, and IP-logged per COA compliance requirements. Entries cannot be edited or deleted.</span></div>
        <div className="card">
          <div className="card-header"><div className="card-title">System Activity Log</div></div>
          {loading
            ? <div className="loading-state"><span className="spin"/>Loading audit trail…</div>
            : logs.length===0
              ? <div className="empty"><div className="empty-icon">🔍</div><div className="empty-text">No audit records yet</div></div>
              : <div className="card-body" style={{padding:0}}>
                  {logs.map((log,i)=>(
                    <div className="audit-entry" key={i} style={{padding:"12px 22px"}}>
                      <span className="audit-time">{new Date(log.created_at).toLocaleString("en-PH",{dateStyle:"short",timeStyle:"short"})}</span>
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
   APP ROOT
═══════════════════════════════════════════════════════════ */
export default function App() {
  const [session, setSession]     = useState(null);
  const [page, setPage]           = useState("dashboard");
  const [delinqCount, setDC]      = useState(0);

  useEffect(() => {
    if (!session) return;
    db.select("delinquency",{filter:"status=eq.UNPAID",select:"id"},session.token)
      .then(d=>setDC(d.length)).catch(()=>{});
  },[session,page]);

  if (!session) return <><style>{G}</style><Login onLogin={setSession}/></>;

  const pages = {
    dashboard:   <Dashboard   token={session.token} profile={session.profile}/>,
    taxpayers:   <Taxpayers   token={session.token} profile={session.profile}/>,
    assessments: <Assessments token={session.token} profile={session.profile}/>,
    collection:  <Collection  token={session.token} profile={session.profile}/>,
    delinquency: <Delinquency token={session.token} profile={session.profile}/>,
    receipts:    <Receipts    token={session.token} profile={session.profile}/>,
    reports:     <Reports     token={session.token} profile={session.profile}/>,
    auditlogs:   <AuditLogs   token={session.token}/>,
  };

  return (
    <>
      <style>{G}</style>
      <div className="shell">
        <Sidebar
          active={page} setActive={setPage}
          profile={session.profile}
          delinqCount={delinqCount}
          onLogout={async()=>{ await db.authSignOut(session.token); setSession(null); }}
        />
        <div className="content">
          {pages[page] || <Dashboard token={session.token} profile={session.profile}/>}
        </div>
      </div>
    </>
  );
}