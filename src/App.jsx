import { useState, useEffect, useRef } from "react";
import Kiosk from "./components/Kiosk";
import { db, fmtK} from "./utils/db";
import Settings from "./pages/Settings";
import Sidebar from "./components/Sidebar";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Taxpayers from "./pages/Taxpayers";
import Assessments from "./pages/Assessments";
import Collection from "./pages/Collections";
import Delinquency from "./pages/Delinquency";
import Receipts from "./pages/Receipts";
import Reports from "./pages/Reports";
import AuditLogs from "./pages/AuditLogs";
import Accounts from "./pages/Accounts";
import "./index.css";

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




/* ═══════════════════════════════════════════════════════════
   APP ROOT (UPDATED WITH KIOSK)
═══════════════════════════════════════════════════════════ */
export default function App() {
  const [session, setSession] = useState(null);
  const [page, setPage] = useState("dashboard");
  const [delinqCount, setDC] = useState(0);
  const [theme, setTheme] = useState(localStorage.getItem("rpt_theme") || "dark");

  // 🌟 NEW: Track if the user wants to launch the Kiosk
  const [showKiosk, setShowKiosk] = useState(false);

  useEffect(() => {
    document.body.className = theme === "light" ? "light-theme" : "";
    localStorage.setItem("rpt_theme", theme);
  }, [theme]);

  useEffect(() => {
    if (!session) return;
    db.select("delinquency", { filter: "status=eq.UNPAID", select: "property_id" }, session.token)
      .then(d => setDC(new Set(d.filter(x => x.property_id).map(x => x.property_id)).size))
      .catch(() => { });
  }, [session, page]);

  useEffect(() => {
    if (session?.profile?.role === "superadmin" && page !== "accounts" && page !== "settings") {
      setPage("accounts");
    }
  }, [session, page]);

  // 🌟 KIOSK INTERCEPTOR: If true, ONLY show the Kiosk
  if (showKiosk) {
    return <Kiosk onExit={() => setShowKiosk(false)} db={db} token={session?.token || null} />;
  }

  // If there's no session, render the Login screen (which now has the Kiosk button)
  if (!session) {
    return (
      <>
        {/* Pass the function that sets showKiosk to true when clicked */}
        <Login onLogin={setSession} onOpenKiosk={() => setShowKiosk(true)} />
      </>
    );
  }

  const pages = {
    dashboard: <Dashboard token={session.token} profile={session.profile} />,
    taxpayers: <Taxpayers token={session.token} profile={session.profile} />,
    assessments: <Assessments token={session.token} profile={session.profile} />,
    collection: <Collection token={session.token} profile={session.profile} />,
    delinquency: <Delinquency token={session.token} profile={session.profile} />,
    receipts: <Receipts token={session.token} profile={session.profile} />,
    reports: <Reports token={session.token} profile={session.profile} />,
    auditlogs: <AuditLogs token={session.token} />,
    settings: <Settings theme={theme} setTheme={setTheme} />,
    accounts: <Accounts token={session.token} profile={session.profile} />,
  };

  const isSuper = session?.profile?.role === "superadmin";
  const renderPage = () => {
    if (isSuper) {
      if (page === "accounts") return pages.accounts;
      if (page === "settings") return pages.settings;
      return pages.accounts;
    }
    return pages[page] || <Dashboard token={session.token} profile={session.profile} />;
  };

  return (
    <>

      {/* 🌟 THE FIX: This wrapper forces the light/dark theme to extend infinitely, killing the black bars! */}
      <div style={{ width: "100vw", minHeight: "100vh", backgroundColor: "var(--bg)", margin: 0, padding: 0, overflowX: "hidden" }}>

        <div className="shell" style={{ backgroundColor: "var(--bg)" }}>
          <Sidebar
            active={page} setActive={setPage}
            profile={session.profile}
            delinqCount={delinqCount}
            onLogout={async () => { await db.authSignOut(session.token); setSession(null); }}
          />
          <div className="content print-expand" style={{ backgroundColor: "var(--bg)", minHeight: "100vh" }}>

            {/* Your existing pages slide right in perfectly safe */}
            {renderPage()}

          </div>
        </div>

      </div>
    </>
  );
}