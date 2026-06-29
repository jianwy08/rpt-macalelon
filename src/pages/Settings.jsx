import MFAEnrollment from "../components/MFAEnrollment";


export default function Settings({ theme, setTheme,}) {
    return (
        <>
            <div className="topbar">
                <div className="topbar-left">
                    <h1>System Settings</h1>
                    <p>APPLICATION PREFERENCES</p>
                </div>
            </div>
            <div className="page-body">
                <div className="panel" style={{ maxWidth: 600 }}>
                    <div className="panel-title">Appearance</div>
                    <div className="form-group" style={{ marginBottom: 20 }}>
                        <label className="form-label">Interface Theme</label>
                        <div style={{ display: "flex", gap: "10px", marginTop: "8px" }}>
                            <div
                                onClick={() => setTheme("dark")}
                                style={{
                                    flex: 1, padding: "20px",
                                    border: `2px solid ${theme === "dark" ? "var(--blue2)" : "var(--border)"}`,
                                    borderRadius: "12px", cursor: "pointer",
                                    background: "#0D1117", color: "#E6EDF3", textAlign: "center",
                                    transition: "all 0.2s"
                                }}>
                                <div style={{ fontSize: "24px", marginBottom: "8px" }}>🌙</div>
                                <div style={{ fontWeight: "bold" }}>Dark Mode</div>
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
                                <div style={{ fontSize: "24px", marginBottom: "8px" }}>☀️</div>
                                <div style={{ fontWeight: "bold" }}>Light Mode</div>
                            </div>
                        </div>
                    </div>
                </div>
                <MFAEnrollment/>
            </div>  
        </>
    );
}