import { useState } from "react";
import { db, SUPA_URL, SUPA_KEY, supabase } from "../utils/db";

export default function Login({ onLogin, onOpenKiosk }) {
    const [email, setEmail] = useState("");
    const [pass, setPass] = useState("");
    const [loading, setLoading] = useState(false);
    const [err, setErr] = useState("");
    const [msg, setMsg] = useState("");
    const [mfaCode, setMfaCode] = useState("");
    const [mfaFactorId, setMfaFactorId] = useState("");

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

        setLoading(true);
        try {
            if (mode === "login") {
                const { data: authData, error: authErr } = await supabase.auth.signInWithPassword({
                    email: email,
                    password: pass
                });

                if (authErr) throw authErr;

                // 🌟 NEW: Check if this user requires an MFA code
                const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
                
                if (aal.currentLevel === 'aal1' && aal.nextLevel === 'aal2') {
                    // They have MFA enabled! Pause the login and get their ID
                    const factors = await supabase.auth.mfa.listFactors();
                    if (factors.data && factors.data.totp.length > 0) {
                        setMfaFactorId(factors.data.totp[0].id);
                        setMode("mfa"); // Change the screen to ask for the pin
                        setLoading(false);
                        return; // Stop here!
                    }
                }

                // If no MFA is required, log them in normally
                const user = authData.user;
                const token = authData.session.access_token;
                const profiles = await db.select("user_profiles", { filter: `id=eq.${user.id}` }, token);
                
                onLogin({ token, user, profile: profiles[0] || { full_name: email, role: "cashier" } });

            } else if (mode === "forgot") {
                const currentUrl = encodeURIComponent(window.location.origin + "/");
                await fetch(`${SUPA_URL}/auth/v1/recover?redirect_to=${currentUrl}`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json", "apikey": SUPA_KEY },
                    body: JSON.stringify({ email })
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
        } catch (e) {
            let errMsg = e.message;
            if (errMsg.toLowerCase().includes("user already registered")) errMsg = "An account with this Email Address already exists.";
            setErr(errMsg);
        }
        setLoading(false);
    };

    const submitMfa = async () => {
        setErr(""); setMsg(""); setLoading(true);
        try {
            // 1. Create the challenge
            const challenge = await supabase.auth.mfa.challenge({ factorId: mfaFactorId });
            if (challenge.error) throw challenge.error;

            // 2. Verify their 6-digit code
            const verify = await supabase.auth.mfa.verify({
                factorId: mfaFactorId,
                challengeId: challenge.data.id,
                code: mfaCode
            });

            if (verify.error) throw verify.error;

            // 3. Success! Grab the new, highly secure AAL2 token
            const { data: { session }, error: sessionErr } = await supabase.auth.getSession();
            if (sessionErr) throw sessionErr;

            const user = session.user;
            const token = session.access_token;
            
            // 4. Let them in!
            const profiles = await db.select("user_profiles", { filter: `id=eq.${user.id}` }, token);
            onLogin({ token, user, profile: profiles[0] || { full_name: email, role: "cashier" } });

        } catch (e) { console.log(e);
            setErr("Invalid 6-digit code. Please try again.");
        }
        setLoading(false);
    };

    return (
        <div className="login-shell">
            <div className="login-box">
                <div className="login-head">
                    <div className="login-emblem"><img src="https://i.postimg.cc/VktjPybt/macalelon-logo.png" alt="LGU Logo" style={{ width: "100%", height: "100%", borderRadius: "50%", objectFit: "cover" }} /></div>
                    <h1>Municipality of Macalelon</h1>
                    <p>Real Property Tax Management System</p>
                </div>

                {err && <div className="banner banner-err"><span className="banner-icon">⚠</span>{err}</div>}
                {msg && <div className="banner banner-success"><span className="banner-icon">✓</span>{msg}</div>}

                <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>

                    {mode !== "reset" && mode !== "mfa" && !showManual && (
                        <div className="form-group">
                            <label className="form-label">Email Address</label>
                            <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="user@lgu.gov.ph" />
                        </div>
                    )}

                    {showManual && (
                        <div className="form-group" style={{ padding: "16px", background: "var(--bg3)", borderRadius: "8px", border: "1px dashed var(--border2)" }}>
                            <label className="form-label" style={{ color: "var(--blue2)" }}>Paste the full link from your email here:</label>
                            <input value={manualLink} onChange={e => setManualLink(e.target.value)} placeholder="http://localhost:5173/#access_token=..." />
                            <div style={{ display: "flex", gap: "8px", marginTop: "8px" }}>
                                <button className="btn btn-primary btn-sm" style={{ flex: 1 }} onClick={handleManualPaste}>Submit Link</button>
                                <button className="btn btn-outline btn-sm" onClick={() => setShowManual(false)}>Cancel</button>
                            </div>
                        </div>
                    )}

                    {(mode === "login" || mode === "register" || mode === "reset") && !showManual && (
                        <div className="form-group">
                            <div style={{ display: "flex", justifyContent: "space-between" }}>
                                <label className="form-label">{mode === "reset" ? "Enter New Password" : "Password"}</label>
                                {mode === "login" && (
                                    <span style={{ fontSize: 11, cursor: "pointer", color: "var(--blue2)" }} onClick={() => { setMode("forgot"); setErr(""); setMsg(""); }}>Forgot Password?</span>
                                )}
                            </div>
                            <input type="password" value={pass} onChange={e => setPass(e.target.value)} onKeyDown={e => e.key === "Enter" && submit()} />
                        </div>
                    )}

                    {/* 🌟 NEW: The MFA Input Screen */}
                    {mode === "mfa" && (
                        <div className="form-group" style={{ textAlign: "center" }}>
                            <div style={{ fontSize: "30px", marginBottom: "10px" }}>📱</div>
                            <label className="form-label" style={{ color: "var(--gov-navy)", fontWeight: "bold" }}>Authenticator Code Required</label>
                            <p style={{ fontSize: "12px", color: "var(--text3)", marginBottom: "16px" }}>Open your authenticator app and enter the 6-digit code.</p>
                            
                            <input 
                                type="text" 
                                maxLength={6} 
                                value={mfaCode} 
                                onChange={e => setMfaCode(e.target.value.replace(/[^0-9]/g, ''))} 
                                placeholder="123456"
                                style={{ textAlign: "center", fontSize: "24px", letterSpacing: "8px", fontWeight: "bold" }}
                                onKeyDown={e => e.key === "Enter" && mfaCode.length === 6 && submitMfa()}
                            />
                            
                            <button className="btn btn-primary" style={{ marginTop: "16px", width: "100%", justifyContent: "center", padding: "12px" }} onClick={submitMfa} disabled={loading || mfaCode.length !== 6}>
                                {loading ? <><span className="spin" />&nbsp;Verifying…</> : "Verify & Login"}
                            </button>
                            
                            <button className="btn btn-ghost btn-sm" style={{ marginTop: "12px", width: "100%" }} onClick={() => { setMode("login"); setMfaCode(""); setErr(""); }}>
                                Cancel & Go Back
                            </button>
                        </div>
                    )}

                    {!showManual && (
                        <button className="btn btn-gold" style={{ marginTop: 4, width: "100%", justifyContent: "center", padding: "12px" }} onClick={submit} disabled={loading}>
                            {loading ? <><span className="spin" />&nbsp;Processing…</> : mode === "login" ? "Sign In →" : mode === "reset" ? "Save New Password" : "Send Reset Link ✉️"}
                        </button>
                    )}
                </div>

                {mode !== "login" && (
                    <>
                        <div className="login-divider">
                            <span>{mode === "forgot" ? "Remember your password?" : "Changed your mind?"}</span>
                        </div>
                        <div style={{ display: "flex", flexDirection: "column", gap: "8px", alignItems: "center", marginBottom: "16px" }}>
                            <button className="btn btn-ghost btn-sm" onClick={() => {
                                setMode("login");
                                setErr(""); setMsg(""); setShowManual(false);
                                window.location.hash = "";
                            }}>
                                Back to sign in
                            </button>
                        </div>
                    </>
                )}

                {mode === "login" && !showManual && (
                    <div style={{ display: "flex", justifyContent: "center", marginTop: "16px" }}>
                        <span style={{ fontSize: 11, color: "var(--text3)", cursor: "pointer", textDecoration: "underline" }} onClick={() => setShowManual(true)}>
                            Have a recovery link? Paste it here.
                        </span>
                    </div>
                )}

                {/* 🌟 NEW: KIOSK BUTTON FOR PUBLIC */}
                <div style={{ marginTop: "24px", borderTop: "1px solid var(--border)", paddingTop: "16px", textAlign: "center" }}>
                    <p style={{ color: "var(--text3)", fontSize: "12px", marginBottom: "8px" }}>For Public Inquiries</p>
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
