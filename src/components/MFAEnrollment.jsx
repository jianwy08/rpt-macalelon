import { useState, useEffect } from "react";
import { supabase } from "../utils/db";

export default function MFAEnrollment() {
    const [qrCode, setQrCode] = useState(null);
    const [factorId, setFactorId] = useState("");
    const [verifyCode, setVerifyCode] = useState("");
    const [error, setError] = useState("");
    // 🌟 Loading starts as false now!
    const [loading, setLoading] = useState(false); 
    const [success, setSuccess] = useState(false);

    // Only run this once to check if they ALREADY setup MFA in the past
    useEffect(() => {
        const checkStatus = async () => {
            const { data } = await supabase.auth.mfa.listFactors();
            if (data?.totp?.some(f => f.status === 'verified')) {
                setSuccess(true);
            }
        };
        checkStatus();
    }, []);

    // 🌟 Triggered manually by the user clicking a button!
    const generateQRCode = async () => {
        setLoading(true);
        setError("");
        
        try {
            // 1. Wipe out any stuck ghost attempts
            const { data: existingFactors } = await supabase.auth.mfa.listFactors();
            if (existingFactors?.totp) {
                for (const factor of existingFactors.totp) {
                    if (factor.status === 'unverified') {
                        await supabase.auth.mfa.unenroll({ factorId: factor.id });
                    }
                }
            }

            // 2. Generate the fresh QR code safely
            const { data, error: enrollError } = await supabase.auth.mfa.enroll({
                factorType: 'totp',
                friendlyName: `LGU-Macalelon-${Date.now()}`
            });

            if (enrollError) throw enrollError;

            setFactorId(data.id);
            setQrCode(data.totp.qr_code);

        } catch (err) {
            console.error("MFA Error:", err);
            setError("Failed to generate QR code: " + err.message);
        }
        
        setLoading(false);
    };

    const handleVerify = async () => {
        setLoading(true);
        setError("");
        try {
            const challenge = await supabase.auth.mfa.challenge({ factorId });
            if (challenge.error) throw challenge.error;

            const verify = await supabase.auth.mfa.verify({
                factorId,
                challengeId: challenge.data.id,
                code: verifyCode
            });

            if (verify.error) throw verify.error;

            setSuccess(true);
        } catch (err) {
            setError("Invalid code. Please try again. (" + err.message + ")");
        }
        setLoading(false);
    };

    if (success) {
        return (
            <div className="panel" style={{ maxWidth: 400, margin: "0 auto", textAlign: "center" }}>
                <div style={{ fontSize: "40px", marginBottom: "10px" }}>🛡️</div>
                <h2 style={{ color: "var(--gov-navy)", marginBottom: "10px" }}>MFA Enabled!</h2>
                <p className="text-muted">Your account is now highly secure and protected by Two-Factor Authentication.</p>
            </div>
        );
    }

    return (
        <div className="panel" style={{ maxWidth: 450, margin: "0 auto" }}>
            <div className="panel-title">🛡️ Setup Two-Factor Authentication</div>
            
            <div style={{ marginBottom: "20px", fontSize: "13px", lineHeight: "1.6" }}>
                To secure your account, please set up Multi-Factor Authentication (MFA). 
                Scan the QR code below using an authenticator app like <strong>Google Authenticator</strong> or <strong>Authy</strong>.
            </div>

            {error && <div className="banner banner-err">{error}</div>}

            {!qrCode ? (
                // 🌟 THE NEW BUTTON! 
                <button 
                    className="btn btn-primary" 
                    style={{ width: "100%", justifyContent: "center", padding: "12px" }}
                    onClick={generateQRCode}
                    disabled={loading}
                >
                    {loading ? <><span className="spin"/> Generating...</> : "Start MFA Setup"}
                </button>
            ) : (
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "20px" }}>
                    
                    <div 
                        style={{ background: "#fff", padding: "16px", borderRadius: "12px", border: "1px solid var(--border)", display: "inline-block" }}
                        dangerouslySetInnerHTML={{ __html: qrCode }} 
                    />

                    <div className="form-group" style={{ width: "100%" }}>
                        <label className="form-label" style={{ textAlign: "center", display: "block" }}>Enter 6-Digit Code</label>
                        <input 
                            type="text" 
                            maxLength={6} 
                            placeholder="123456"
                            value={verifyCode}
                            onChange={(e) => setVerifyCode(e.target.value.replace(/[^0-9]/g, ''))}
                            style={{ textAlign: "center", fontSize: "20px", letterSpacing: "4px", fontWeight: "bold" }}
                        />
                    </div>

                    <button 
                        className="btn btn-primary" 
                        style={{ width: "100%", justifyContent: "center" }}
                        onClick={handleVerify}
                        disabled={loading || verifyCode.length !== 6}
                    >
                        {loading ? "Verifying..." : "Verify & Enable MFA"}
                    </button>
                </div>
            )}
        </div>
    );
}