import { useState, useEffect, useRef } from "react";
import Kiosk from "./components/Kiosk";
import { db, fmtK, supabase} from "./utils/db";
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
  
  // 🌟 CHANGE 1: Read the last visited page from browser memory!
  const [page, setPage] = useState(localStorage.getItem("rpt_active_page") || "dashboard");
  
  // 🌟 CHANGE 2: Add a loading state to pause the app while checking Supabase
  const [isInitializing, setIsInitializing] = useState(true); 

  const [delinqCount, setDC] = useState(0);
  const [theme, setTheme] = useState(localStorage.getItem("rpt_theme") || "dark");

  // 🌟 NEW: Track if the user wants to launch the Kiosk
  const [showKiosk, setShowKiosk] = useState(false);

  // 🌟 CHANGE 3: Autosave the current page to the browser's memory
  useEffect(() => {
      if (session) {
          localStorage.setItem("rpt_active_page", page);
      }
  }, [page, session]);

  // 🌟 CHANGE 4: The Session Restorer Engine
  useEffect(() => {
      const restoreSession = async () => {
          // Ask Supabase for a saved session token
          const { data: { session: savedSession } } = await supabase.auth.getSession();

          if (savedSession) {
              try {
                  const user = savedSession.user;
                  const token = savedSession.access_token;
                  
                  // We need their profile to know if they are admin/cashier etc.
                  const profiles = await db.select("user_profiles", { filter: `id=eq.${user.id}` }, token);

                  // Restore them!
                  setSession({
                      token,
                      user,
                      profile: profiles[0] || { full_name: user.email, role: "cashier" }
                  });
              } catch (error) {
                  console.error("Failed to restore profile", error);
              }
          }
          // Turn off the loading screen
          setIsInitializing(false);
      };

      restoreSession();

      // Listen closely: If Supabase says they logged out, wipe the memory
      const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, newSession) => {
          if (!newSession) {
              setSession(null);
              setIsInitializing(false);
          }
      });

      return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    // 🌟 FIX: Use classList to match our new CSS variables
    if (theme === "dark") {
        document.body.classList.add("dark-theme");
    } else {
        document.body.classList.remove("dark-theme");
    }
    localStorage.setItem("rpt_theme", theme);
  }, [theme]);

  useEffect(() => {
    if (!session) return;
    db.select("delinquency", { filter: "status=eq.UNPAID", select: "property_id" }, session.token)
      .then(d => setDC(new Set(d.filter(x => x.property_id).map(x => x.property_id)).size))
      .catch(() => { });
  }, [session, page]);

  // 🌟 CHANGE 5: The Loading Screen
  if (isInitializing) {
      return (
          <div style={{ display: "flex", height: "100vh", alignItems: "center", justifyContent: "center", background: "var(--bg-main)", color: "var(--text-main)" }}>
              <span className="spin" style={{ marginRight: "10px", borderColor: "var(--blue)", borderTopColor: "transparent" }}/> Restoring your session...
          </div>
      );
  }
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
    settings: <Settings theme={theme} setTheme={setTheme} user={session.user} profile={session.profile} />,
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
                onLogout={async () => { 
                    // 1. Tell Supabase to securely wipe the browser session! (Crucial)
                    await supabase.auth.signOut(); 

                    // 2. Run your custom database logout if you have one
                    if (db.authSignOut) {
                        await db.authSignOut(session.token); 
                    }

                    // 3. Wipe the local memory 
                    localStorage.removeItem("rpt_active_page");
                    
                    // 4. Reset React's state
                    setPage("dashboard");
                    setSession(null); 
                }}
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