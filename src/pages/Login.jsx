import { useState } from "react";
import { db, supabase } from "../utils/db";

export default function Login({ onLogin, onOpenKiosk }) {
    const [email, setEmail] = useState("");
    const [pass, setPass] = useState("");
    const [loading, setLoading] = useState(false);
    const [err, setErr] = useState("");
    const [msg, setMsg] = useState("");
    const [mfaCode, setMfaCode] = useState("");
    const [mfaFactorId, setMfaFactorId] = useState("");

    const [mode, setMode] = useState("login");

    const submit = async () => {
        setErr(""); setMsg("");

        if (!email) { setErr("Email is required."); return; }
        if (!pass) { setErr("Password is required."); return; }

        setLoading(true);
        try {
            if (mode === "login") {
                const { data: authData, error: authErr } = await supabase.auth.signInWithPassword({
                    email: email,
                    password: pass
                });

                if (authErr) throw authErr;

                // Check if this user requires an MFA code
                const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
                
                if (aal.currentLevel === 'aal1' && aal.nextLevel === 'aal2') {
                    const factors = await supabase.auth.mfa.listFactors();
                    if (factors.data && factors.data.totp.length > 0) {
                        setMfaFactorId(factors.data.totp[0].id);
                        setMode("mfa"); // Switch screen layout to MFA pin setup
                        setLoading(false);
                        return;
                    }
                }

                // Normal secure login flow
                const user = authData.user;
                const token = authData.session.access_token;
                const profiles = await db.select("user_profiles", { filter: `id=eq.${user.id}` }, token);
                
                onLogin({ token, user, profile: profiles[0] || { full_name: email, role: "cashier" } });
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
            const challenge = await supabase.auth.mfa.challenge({ factorId: mfaFactorId });
            if (challenge.error) throw challenge.error;

            const verify = await supabase.auth.mfa.verify({
                factorId: mfaFactorId,
                challengeId: challenge.data.id,
                code: mfaCode
            });

            if (verify.error) throw verify.error;

            const { data: { session }, error: sessionErr } = await supabase.auth.getSession();
            if (sessionErr) throw sessionErr;

            const user = session.user;
            const token = session.access_token;
            
            const profiles = await db.select("user_profiles", { filter: `id=eq.${user.id}` }, token);
            onLogin({ token, user, profile: profiles[0] || { full_name: email, role: "cashier" } });

        } catch (e) {
            console.log(e);
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

                    {mode !== "mfa" && (
                        <div className="form-group">
                            <label className="form-label">Email Address</label>
                            <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="user@lgu.gov.ph" />
                        </div>
                    )}

                    {mode === "login" && (
                        <div className="form-group">
                            <label className="form-label">Password</label>
                            <input type="password" value={pass} onChange={e => setPass(e.target.value)} onKeyDown={e => e.key === "Enter" && submit()} />
                        </div>
                    )}

                    {/* The MFA Input Screen */}
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

                    {mode === "login" && (
                        <button className="btn btn-gold" style={{ marginTop: 4, width: "100%", justifyContent: "center", padding: "12px" }} onClick={submit} disabled={loading}>
                            {loading ? <><span className="spin" />&nbsp;Processing…</> : "Sign In →"}
                        </button>
                    )}
                </div>

                {/* KIOSK BUTTON FOR PUBLIC */}
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