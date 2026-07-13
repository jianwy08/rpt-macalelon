export default function Sidebar({ active, setActive, profile, onLogout, delinqCount }) {
    const sections = profile?.role === "superadmin" ? [
        {
            label: "System", items: [
                { id: "accounts", icon: "👥", label: "Accounts" },
                { id: "settings", icon: "⚙️", label: "Settings" },
            ]
        }
    ] : [
        {
            label: "Overview", items: [
                { id: "dashboard", icon: "📊", label: "Dashboard" },
            ]
        },
        {
            label: "Records", items: [
                { id: "taxpayers", icon: "👥", label: "Taxpayers" },
                { id: "assessments", icon: "📋", label: "Assessments" },
            ]
        },
        {
            label: "Treasury", items: [
                { id: "collection", icon: "💰", label: "Collection" },
                { id: "delinquency", icon: "⚠️", label: "Delinquency", badge: delinqCount || null },
                { id: "receipts", icon: "🧾", label: "Official Receipts" },
                { id: "forms", icon: "📚", label: "Accountable Forms" },
            ]
        },
        {
            label: "Compliance", items: [
                { id: "reports", icon: "📈", label: "Reports" },
                { id: "auditlogs", icon: "🔒", label: "Audit Logs" },
            ]
        },
        {
            label: "System", items: [
                { id: "settings", icon: "⚙️", label: "Settings" },
            ]
        },
    ];

    const initials = (profile?.full_name || "U").split(",").map(s => s.trim()[0]).join("").slice(0, 2).toUpperCase();

    return (
        <div className="no-print-sidebar" style={{ width: "260px", height: "100vh", backgroundColor: "#1E3A5F", display: "flex", flexDirection: "column", position: "fixed", top: 0, left: 0, zIndex: 200, boxShadow: "2px 0 10px rgba(0,0,0,0.2)" }}>

            {/* 🌟 LGU BRANDING HEADER */}
            <div style={{ padding: "25px 20px 20px", borderBottom: "1px solid rgba(255,255,255,0.1)", textAlign: "center" }}>
                <img src="https://i.postimg.cc/VktjPybt/macalelon-logo.png" alt="LGU Logo" style={{ width: "70px", height: "70px", borderRadius: "50%", objectFit: "cover", margin: "0 auto 10px", backgroundColor: "#fff", border: "2px solid #D4A017" }} />
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
                                <button key={item.id} onClick={() => setActive(item.id)} style={{
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
                <div onClick={() => { if (window.confirm("Are you sure you want to sign out?")) onLogout(); }} style={{ display: "flex", alignItems: "center", gap: "10px", padding: "10px", borderRadius: "8px", background: "rgba(0,0,0,0.2)", cursor: "pointer", border: "1px solid rgba(255,255,255,0.05)", transition: "all 0.2s" }}>
                    <div style={{ width: "32px", height: "32px", borderRadius: "50%", background: "#D4A017", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "12px", fontWeight: "bold", color: "#1E3A5F", flexShrink: 0 }}>{initials}</div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: "12px", fontWeight: "bold", color: "#fff", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{profile?.full_name || "User"}</div>
                        <div style={{ fontSize: "10px", color: "#D4A017", textTransform: "uppercase" }}>{profile?.role || "user"}</div>
                    </div>
                    <span style={{ color: "rgba(255,255,255,0.5)", fontSize: "14px" }}>⏻</span>
                </div>
            </div>

        </div>
    );
}