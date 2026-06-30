import { useState, useEffect } from "react";
import MFAEnrollment from "../components/MFAEnrollment";
import { supabase } from "../utils/db";

// 🌟 Make sure App.jsx passes down user and profile!
export default function Settings({ theme, setTheme, user, profile }) {
    const [activeTab, setActiveTab] = useState("account");

    // --- State for Notifications ---
    const [msg, setMsg] = useState("");
    const [err, setErr] = useState("");

    // --- State for Account Tab ---
    const [fullName, setFullName] = useState(profile?.full_name || "");
    const [phone, setPhone] = useState(profile?.phone || "");
    const [updatingProfile, setUpdatingProfile] = useState(false);

    // --- State for Security Tab ---
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [updatingPassword, setUpdatingPassword] = useState(false);

    // 🌟 THE THEME FIX: This watches the theme variable and actually changes the screen!
    useEffect(() => {
        if (theme === 'dark') {
            document.body.classList.add('dark-theme');
        } else {
            document.body.classList.remove('dark-theme');
        }
    }, [theme]);
    const handleTabSwitch = (tabName) => {
        setActiveTab(tabName);
        setMsg("");
        setErr("");
    };
    

    // --- Action: Update Profile ---
    const handleUpdateProfile = async () => {
        setErr(""); setMsg(""); setUpdatingProfile(true);
        try {
            // Update the user_profiles table in Supabase
            const { error } = await supabase
                .from('user_profiles')
                .update({ full_name: fullName, phone: phone })
                .eq('id', user.id);

            if (error) throw error;
            setMsg("Profile updated successfully!");
        } catch (error) {
            setErr("Failed to update profile: " + error.message);
        }
        setUpdatingProfile(false);
    };

    // --- Action: Update Password ---
    const handleUpdatePassword = async () => {
        setErr(""); setMsg("");
        
        if (newPassword !== confirmPassword) {
            setErr("Passwords do not match!");
            return;
        }
        if (newPassword.length < 6) {
            setErr("Password must be at least 6 characters long.");
            return;
        }

        setUpdatingPassword(true);
        try {
            // Securely update the password using Supabase Auth
            const { error } = await supabase.auth.updateUser({ password: newPassword });
            if (error) throw error;
            
            setMsg("Password changed successfully!");
            setNewPassword("");
            setConfirmPassword("");
        } catch (error) {
            setErr("Failed to change password: " + error.message);
        }
        setUpdatingPassword(false);
    };

    return (
        <div className="page-body">
            <div className="topbar">
                <div className="topbar-left">
                    <h1>System Settings</h1>
                    <p className="text-muted">Manage your preferences and security</p>
                </div>
            </div>

            {msg && <div className="banner banner-success" style={{ marginBottom: "20px" }}>✓ {msg}</div>}
            {err && <div className="banner banner-err" style={{ marginBottom: "20px" }}>⚠ {err}</div>}

            <div style={{ display: "flex", gap: "24px", marginTop: "20px" }}>
                
                {/* --- SIDEBAR NAVIGATION --- */}
                <div style={{ width: "250px", display: "flex", flexDirection: "column", gap: "8px" }}>
                    <button 
                            className={`btn ${activeTab === "account" ? "btn-primary" : "btn-ghost"}`} 
                            onClick={() => handleTabSwitch("account")}
                            style={{ justifyContent: "flex-start" }}
                        >
                        👤 Account Profile
                    </button>
                    <button 
                            className={`btn ${activeTab === "security" ? "btn-primary" : "btn-ghost"}`} 
                            onClick={() => handleTabSwitch("security")}
                            style={{ justifyContent: "flex-start" }}
                        >
                        🛡️ Security & Sign-in
                    </button>
                    <button 
                            className={`btn ${activeTab === "appearance" ? "btn-primary" : "btn-ghost"}`} 
                            onClick={() => handleTabSwitch("appearance")}
                            style={{ justifyContent: "flex-start" }}
                        >
                        🎨 Appearance
                    </button>
                </div>

                {/* --- MAIN CONTENT AREA --- */}
                <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "20px" }}>
                    
                    {/* --- ACCOUNT TAB --- */}
                    {activeTab === "account" && (
                        <div className="panel">
                            <div className="panel-title">Account Details</div>
                            <p className="text-muted" style={{ fontSize: "13px", marginBottom: "20px" }}>
                                Update your personal information and contact details.
                            </p>
                            
                            <div className="form-group">
                                <label className="form-label">Email Address (Cannot be changed)</label>
                                <input type="email" value={user?.email || ""} disabled style={{ background: "var(--bg3)" }} />
                            </div>

                            <div className="form-group">
                                <label className="form-label">Full Name</label>
                                <input 
                                    type="text" 
                                    value={fullName} 
                                    onChange={(e) => setFullName(e.target.value)} 
                                    placeholder="Juan Dela Cruz" 
                                />
                            </div>

                            <div className="form-group">
                                <label className="form-label">Contact Number</label>
                                <input 
                                    type="text" 
                                    value={phone} 
                                    onChange={(e) => setPhone(e.target.value)} 
                                    placeholder="09123456789" 
                                />
                            </div>

                            <button 
                                className="btn btn-primary" 
                                onClick={handleUpdateProfile} 
                                disabled={updatingProfile}
                                style={{ marginTop: "10px" }}
                            >
                                {updatingProfile ? "Saving..." : "Save Profile Changes"}
                            </button>
                        </div>
                    )}

                    {/* --- SECURITY TAB --- */}
                    {activeTab === "security" && (
                        <>
                            <div className="panel">
                                <div className="panel-title">Change Password</div>
                                <p className="text-muted" style={{ fontSize: "13px", marginBottom: "20px" }}>
                                    Ensure your account is using a long, random password to stay secure.
                                </p>
                                
                                <div className="form-group">
                                    <label className="form-label">New Password</label>
                                    <input 
                                        type="password" 
                                        value={newPassword} 
                                        onChange={(e) => setNewPassword(e.target.value)} 
                                        placeholder="Enter new password" 
                                    />
                                </div>

                                <div className="form-group">
                                    <label className="form-label">Confirm New Password</label>
                                    <input 
                                        type="password" 
                                        value={confirmPassword} 
                                        onChange={(e) => setConfirmPassword(e.target.value)} 
                                        placeholder="Re-type new password" 
                                    />
                                </div>

                                <button 
                                    className="btn btn-outline" 
                                    onClick={handleUpdatePassword} 
                                    disabled={updatingPassword || !newPassword}
                                    style={{ marginTop: "10px" }}
                                >
                                    {updatingPassword ? "Updating..." : "Update Password"}
                                </button>
                            </div>

                            <MFAEnrollment /> 
                        </>
                    )}

                    {/* --- APPEARANCE TAB --- */}
                    {activeTab === "appearance" && (
                        <div className="panel">
                            <div className="panel-title">Theme Preferences</div>
                            <p className="text-muted" style={{ fontSize: "13px", marginBottom: "20px" }}>
                                Customize how the system looks on your device.
                            </p>
                            
                            <div style={{ display: "flex", gap: "12px" }}>
                                <button 
                                    className={`btn ${theme === 'light' ? 'btn-primary' : 'btn-outline'}`}
                                    onClick={() => setTheme('light')}
                                >
                                    ☀️ Light Mode
                                </button>
                                
                                <button 
                                    className={`btn ${theme === 'dark' ? 'btn-primary' : 'btn-outline'}`}
                                    onClick={() => setTheme('dark')}
                                >
                                    🌙 Dark Mode
                                </button>
                            </div>
                        </div>
                    )}

                </div>
            </div>
        </div>
    );
}