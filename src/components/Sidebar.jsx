import { useState } from "react";

export default function Sidebar({ active, setActive, profile, onLogout, delinqCount }) {
    // 🌟 Controls the main Sidebar width
    const [collapsed, setCollapsed] = useState(false);
    
    // 🌟 Controls the accordion (collapsible sections). If true, the section is hidden.
    const [collapsedSections, setCollapsedSections] = useState({});

    const toggleSection = (label) => {
        setCollapsedSections(prev => ({ ...prev, [label]: !prev[label] }));
    };

    // 🌟 Category icons to represent the sections when collapsed
    const sections = profile?.role === "superadmin" ? [
        {
            label: "System", icon: "⚙️", items: [
                { id: "accounts", icon: "👥", label: "Accounts" },
                { id: "settings", icon: "⚙️", label: "Settings" },
            ]
        }
    ] : [
        {
            label: "Overview", icon: "📌", items: [
                { id: "dashboard", icon: "📊", label: "Dashboard" },
            ]
        },
        {
            label: "Records", icon: "📁", items: [
                { id: "taxpayers", icon: "👥", label: "Taxpayers" },
                { id: "assessments", icon: "📋", label: "Assessments" },
            ]
        },
        {
            label: "Treasury", icon: "🏦", items: [
                { id: "collection", icon: "💰", label: "Collection" },
                { id: "delinquency", icon: "⚠️", label: "Delinquency", badge: delinqCount || null },
                { id: "receipts", icon: "🧾", label: "Official Receipts" },
                { id: "forms", icon: "📚", label: "Accountable Forms" },
            ]
        },
        {
            label: "Compliance", icon: "🛡️", items: [
                { id: "reports", icon: "📈", label: "Reports" },
                { id: "auditlogs", icon: "🔒", label: "Audit Logs" },
            ]
        },
        {
            label: "System", icon: "⚙️", items: [
                { id: "settings", icon: "⚙️", label: "Settings" },
            ]
        },
    ];

    const initials = (profile?.full_name || "U").split(",").map(s => s.trim()[0]).join("").slice(0, 2).toUpperCase();

    return (
        <>
            <style>{`
                body { padding-left: ${collapsed ? "70px" : "260px"}; transition: padding-left 0.3s ease; }
                .topbar { left: ${collapsed ? "70px" : "260px"} !important; transition: left 0.3s ease; width: calc(100% - ${collapsed ? "70px" : "260px"}) !important; }
            `}</style>

            <div className="no-print-sidebar" style={{ 
                width: collapsed ? "70px" : "260px", 
                height: "100vh", backgroundColor: "#1E3A5F", display: "flex", flexDirection: "column", 
                position: "fixed", top: 0, left: 0, zIndex: 200, 
                boxShadow: "2px 0 10px rgba(0,0,0,0.2)",
                transition: "width 0.3s ease" 
            }}>

                {/* 🌟 LGU BRANDING HEADER */}
                <div style={{ padding: collapsed ? "16px 8px" : "25px 20px 15px", borderBottom: "1px solid rgba(255,255,255,0.05)", textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center", position: "relative" }}>
                    
                    {/* 🌟 SLEEK VS-CODE STYLE ICON TOGGLE */}
                    <button 
                        onClick={() => setCollapsed(!collapsed)}
                        style={{ 
                            position: collapsed ? "static" : "absolute", 
                            top: "16px", right: "16px",
                            background: "transparent", border: "none", 
                            color: "rgba(255,255,255,0.5)", cursor: "pointer", 
                            fontSize: "22px", transition: "color 0.2s", zIndex: 10,
                            padding: "4px", display: "flex", justifyContent: "center", alignItems: "center"
                        }}
                        onMouseEnter={e => e.target.style.color = "#fff"}
                        onMouseLeave={e => e.target.style.color = "rgba(255,255,255,0.5)"}
                        title={collapsed ? "Expand Sidebar" : "Collapse Sidebar"}
                    >
                        ☰
                    </button>

                    <img src="https://i.postimg.cc/VktjPybt/macalelon-logo.png" alt="LGU Logo" style={{ 
                        width: collapsed ? "36px" : "64px", 
                        height: collapsed ? "36px" : "64px", 
                        marginTop: collapsed ? "16px" : "8px", 
                        borderRadius: "50%", objectFit: "cover", 
                        backgroundColor: "#fff", border: "2px solid #D4A017",
                        transition: "all 0.3s ease"
                    }} />
                    
                    {!collapsed && (
                        <div style={{ animation: "fadeIn 0.3s", marginTop: "12px" }}>
                            <h1 style={{ fontSize: "14px", fontWeight: "bold", color: "#D4A017", textTransform: "uppercase", margin: 0, letterSpacing: "0.5px", whiteSpace: "nowrap" }}>Macalelon RPT</h1>
                            <p style={{ fontSize: "11px", color: "rgba(255,255,255,0.5)", margin: "4px 0 0 0", whiteSpace: "nowrap" }}>Treasury Operations</p>
                        </div>
                    )}
                </div>

                {/* 🌟 NAVIGATION LINKS */}
                <div style={{ padding: collapsed ? "16px 8px" : "16px 12px", flex: 1, overflowY: "auto", overflowX: "hidden" }}>
                    {sections.map(sec => {
                        const isSectionHidden = collapsedSections[sec.label];

                        return (
                            <div key={sec.label} style={{ marginBottom: collapsed ? "8px" : "16px" }}>
                                
                                {/* Accordion Header */}
                                {!collapsed ? (
                                    <div 
                                        onClick={() => toggleSection(sec.label)}
                                        style={{ 
                                            fontSize: "10px", letterSpacing: "0.1em", textTransform: "uppercase", 
                                            color: "rgba(255,255,255,0.4)", padding: "4px 12px", marginBottom: "4px", 
                                            fontWeight: "bold", whiteSpace: "nowrap", cursor: "pointer",
                                            display: "flex", justifyContent: "space-between", alignItems: "center",
                                            transition: "color 0.2s"
                                        }}
                                        onMouseEnter={(e) => e.target.style.color = "#D4A017"}
                                        onMouseLeave={(e) => e.target.style.color = "rgba(255,255,255,0.4)"}
                                    >
                                        <span>{sec.label}</span>
                                        <span style={{ fontSize: "9px", transform: isSectionHidden ? "rotate(-90deg)" : "rotate(0)", transition: "transform 0.2s" }}>▼</span>
                                    </div>
                                ) : (
                                    /* 🌟 CATEGORY ICON WHEN COLLAPSED */
                                    <div 
                                        title={`Expand ${sec.label}`}
                                        onClick={() => {
                                            setCollapsed(false);
                                            setCollapsedSections(prev => ({ ...prev, [sec.label]: false }));
                                        }}
                                        style={{ 
                                            display: "flex", justifyContent: "center", alignItems: "center",
                                            color: "rgba(255,255,255,0.5)", fontSize: "20px", 
                                            padding: "12px 0", cursor: "pointer", borderRadius: "8px",
                                            transition: "all 0.2s"
                                        }}
                                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = "rgba(255,255,255,0.05)"}
                                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = "transparent"}
                                    >
                                        {sec.icon}
                                    </div>
                                )}

                                {/* 🌟 FIXED: Nav Items ONLY render when NOT collapsed AND NOT hidden */}
                                {!collapsed && !isSectionHidden && sec.items.map(item => {
                                    const isActive = active === item.id;
                                    return (
                                        <button 
                                            key={item.id} 
                                            onClick={() => setActive(item.id)} 
                                            title={item.label} 
                                            style={{
                                                display: "flex", alignItems: "center", gap: "10px", width: "100%", 
                                                padding: "10px 12px", 
                                                justifyContent: "flex-start",
                                                borderRadius: "6px", border: "none", cursor: "pointer", fontSize: "13px", fontWeight: 600, marginBottom: "2px", transition: "all 0.2s",
                                                backgroundColor: isActive ? "rgba(212,160,23,0.15)" : "transparent",
                                                color: isActive ? "#D4A017" : "rgba(255,255,255,0.7)",
                                                position: "relative"
                                            }}
                                            onMouseEnter={e => { if(!isActive) e.currentTarget.style.backgroundColor = "rgba(255,255,255,0.05)"; }}
                                            onMouseLeave={e => { if(!isActive) e.currentTarget.style.backgroundColor = "transparent"; }}
                                            >
                                            
                                            <span style={{ fontSize: "18px", width: "22px", textAlign: "center", opacity: isActive ? 1 : 0.6 }}>{item.icon}</span>
                                            
                                            <span style={{ whiteSpace: "nowrap" }}>{item.label}</span>
                                            
                                            {item.badge && (
                                                <span style={{ marginLeft: "auto", background: "#DC2626", color: "#fff", fontSize: "10px", fontWeight: "bold", padding: "2px 7px", borderRadius: "20px" }}>{item.badge}</span>
                                            )}
                                        </button>
                                    );
                                })}
                            </div>
                        );
                    })}
                </div>

                {/* 🌟 FOOTER & LOGOUT */}
                <div style={{ padding: collapsed ? "16px 8px" : "16px", borderTop: "1px solid rgba(255,255,255,0.05)", display: "flex", justifyContent: "center" }}>
                    <div 
                        title={collapsed ? "Sign Out" : ""}
                        onClick={() => { if (window.confirm("Are you sure you want to sign out?")) onLogout(); }} 
                        style={{ display: "flex", alignItems: "center", gap: "10px", padding: collapsed ? "8px" : "10px", borderRadius: "8px", background: "rgba(0,0,0,0.15)", cursor: "pointer", border: "1px solid rgba(255,255,255,0.02)", transition: "all 0.2s", width: "100%", justifyContent: collapsed ? "center" : "flex-start" }}
                        onMouseEnter={e => e.currentTarget.style.background = "rgba(0,0,0,0.3)"}
                        onMouseLeave={e => e.currentTarget.style.background = "rgba(0,0,0,0.15)"}
                    >
                        <div style={{ width: "32px", height: "32px", borderRadius: "50%", background: "#D4A017", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "12px", fontWeight: "bold", color: "#1E3A5F", flexShrink: 0 }}>{initials}</div>
                        
                        {!collapsed && (
                            <>
                                <div style={{ flex: 1, minWidth: 0 }}>
                                    <div style={{ fontSize: "12px", fontWeight: "bold", color: "#fff", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{profile?.full_name || "User"}</div>
                                    <div style={{ fontSize: "10px", color: "rgba(212,160,23,0.8)", textTransform: "uppercase" }}>{profile?.role || "user"}</div>
                                </div>
                                <span style={{ color: "rgba(255,255,255,0.3)", fontSize: "14px" }}>⏻</span>
                            </>
                        )}
                    </div>
                </div>

            </div>
        </>
    );
}