import { useState, useEffect, useCallback } from "react";
import { db } from "../utils/db";

export default function AuditLogs({ token }) {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const PER = 30;

  // 🌟 NEW: Extracted the fetch logic so we can call it on a timer
  const fetchLogs = useCallback(async (isInitialLoad = false) => {
    if (isInitialLoad) setLoading(true);
    try {
      const d = await db.select("audit_logs", {
        order: "created_at.desc",
        limit: PER,
        offset: page * PER
      }, token);
      setLogs(d || []);
    } catch (e) {
      console.error("Failed to fetch audit logs:", e);
    }
    if (isInitialLoad) setLoading(false);
  }, [token, page]);

  // 🌟 NEW: The Auto-Refresh Engine
  useEffect(() => {
    // Load immediately when the component mounts or the page changes
    const loadLogs = async () => {
      await fetchLogs(true);
    };
    loadLogs();

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
            ? <div className="loading-state"><span className="spin" />Loading audit trail…</div>
            : logs.length === 0
              ? <div className="empty"><div className="empty-icon">🔍</div><div className="empty-text">No audit records yet</div></div>
              : <div className="card-body" style={{ padding: 0 }}>
                {logs.map((log, i) => (
                  <div className="audit-entry" key={i} style={{ padding: "12px 22px" }}>

                    {/* 🌟 FIX: Explicitly forcing Philippine Standard Time (PST) */}
                    <span className="audit-time" style={{ fontWeight: "bold", color: "var(--text2)" }}>
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

                    <span className="audit-user">{log.user_name || "SYSTEM"}</span>
                    <span className="audit-action">{log.action}</span>
                    <span className="badge badge-blue" style={{ fontSize: 9, justifySelf: "end" }}>{log.module}</span>
                  </div>
                ))}
              </div>
          }
          <div className="pagination">
            <span className="pg-info">Page {page + 1} · {logs.length} entries</span>
            <div className="pg-btns">
              <button className="pg-btn" onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0}>← Prev</button>
              <button className="pg-btn" onClick={() => setPage(p => p + 1)} disabled={logs.length < PER}>Next →</button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}