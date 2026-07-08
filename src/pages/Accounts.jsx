import { useState, useEffect, useCallback } from "react";
import { db, SUPA_URL } from "../utils/db";

export default function Accounts({ token }) {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ email: "", pass: "", full_name: "", role: "cashier", position: "" });
  const [err, setErr] = useState("");
  const [msg, setMsg] = useState("");

  // 🌟 NEW: States for the Change Password modal interface
  const [selectedUser, setSelectedUser] = useState(null);
  const [newPassword, setNewPassword] = useState("");
  const [passwordLoading, setPasswordLoading] = useState(false);

  const loadUsers = useCallback(async () => {
    setLoading(true);
    try {
      const data = await db.select("user_profiles", { select: "*" }, token);
      setUsers(data || []);
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  }, [token]);

  useEffect(() => {
    // eslint-disable-next-line
    loadUsers();
  }, [loadUsers]);

  const handleAdd = async (e) => {
    e.preventDefault();
    setErr(""); setMsg("");
    try {
      const response = await fetch(`${SUPA_URL}/functions/v1/create-admin`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
          email: form.email,
          password: form.pass,
          fullName: form.full_name,
          role: form.role
        })
      });

      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Failed to create account.");

      if (form.position && result.success) {
        const newUsers = await db.select("user_profiles", { filter: `full_name=eq.${form.full_name}` }, token);
        if (newUsers && newUsers.length > 0) {
          await db.update("user_profiles", { position: form.position }, { filter: `id=eq.${newUsers[0].id}` }, token);
        }
      }

      setMsg("Account created successfully!");
      setForm({ email: "", pass: "", full_name: "", role: "cashier", position: "" });
      setShowAdd(false);
      loadUsers();
    } catch (e) {
      setErr(e.message || "Failed to create account.");
    }
  };

const handleChangePassword = async (e) => {
  e.preventDefault();
  setErr(""); setMsg("");
  
  if (newPassword.length < 6) { 
    setErr("Password must be at least 6 characters."); 
    return; 
  }

  setPasswordLoading(true);
  try {
    // We use your environment variable here
    const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY; 

    // We use standard fetch, NOT db.functions.invoke
    const response = await fetch(`${SUPA_URL}/functions/v1/create-admin`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${anonKey}`, 
        "apikey": anonKey                     
      },
      body: JSON.stringify({
        userId: selectedUser.id,   
        password: newPassword.trim(), 
        action: "update_password"  
      })
    });

    const result = await response.json();
    
    if (!response.ok) {
      throw new Error(result.error || "Failed to update password.");
    }

    setMsg(`Password for ${selectedUser.full_name} has been securely updated!`);
    
    if (typeof loadUsers === "function") loadUsers();
    
    setSelectedUser(null);
    setNewPassword("");
  } catch (e) {
    setErr(e.message || "Failed to update password.");
  } finally {
    setPasswordLoading(false);
  }
};

  return (
    <div style={{ padding: "30px", maxWidth: "1000px", margin: "0 auto", animation: "fadeIn 0.4s" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "30px" }}>
        <div>
          <h2 style={{ fontSize: "28px", fontWeight: "bold", margin: 0, color: "var(--gold)" }}>User Accounts</h2>
          <p style={{ color: "var(--text-muted)", margin: "5px 0 0" }}>Manage LGU user accounts</p>
        </div>
        <button className="btn btn-gold" onClick={() => setShowAdd(!showAdd)}>
          {showAdd ? "Cancel" : "+ Add Account"}
        </button>
      </div>

      {err && <div style={{ background: "rgba(220, 38, 38, 0.1)", color: "#ef4444", padding: "10px", borderRadius: "8px", marginBottom: "20px" }}>{err}</div>}
      {msg && <div style={{ background: "rgba(16, 185, 129, 0.1)", color: "#10b981", padding: "10px", borderRadius: "8px", marginBottom: "20px" }}>{msg}</div>}

      {showAdd && (
        <div style={{ background: "var(--card-bg)", padding: "20px", borderRadius: "12px", marginBottom: "30px", border: "1px solid rgba(255,255,255,0.1)" }}>
          <form onSubmit={handleAdd} style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "15px" }}>
            <div>
              <label style={{ display: "block", fontSize: "12px", marginBottom: "5px", color: "var(--text-muted)" }}>Email</label>
              <input required type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} className="input" placeholder="user@lgu.gov.ph" />
            </div>
            <div>
              <label style={{ display: "block", fontSize: "12px", marginBottom: "5px", color: "var(--text-muted)" }}>Password</label>
              <input required type="password" value={form.pass} onChange={e => setForm({ ...form, pass: e.target.value })} className="input" placeholder="Minimum 6 characters" minLength="6" />
            </div>
            <div>
              <label style={{ display: "block", fontSize: "12px", marginBottom: "5px", color: "var(--text-muted)" }}>Full Name</label>
              <input required type="text" value={form.full_name} onChange={e => setForm({ ...form, full_name: e.target.value })} className="input" placeholder="Juan Dela Cruz" />
            </div>
            <div>
              <label style={{ display: "block", fontSize: "12px", marginBottom: "5px", color: "var(--text-muted)" }}>Role</label>
              <select required value={form.role} onChange={e => setForm({ ...form, role: e.target.value })} className="input">
                <option value="admin">Admin</option>
                <option value="assessor">Assessor</option>
                <option value="treasurer">Treasurer</option>
                <option value="cashier">Cashier</option>
                <option value="encoder">Encoder</option>
              </select>
            </div>
            <div style={{ gridColumn: "span 2" }}>
              <label style={{ display: "block", fontSize: "12px", marginBottom: "5px", color: "var(--text-muted)" }}>Position Title</label>
              <input type="text" value={form.position} onChange={e => setForm({ ...form, position: e.target.value })} className="input" placeholder="e.g. Municipal Treasurer" />
            </div>
            <div style={{ gridColumn: "span 2", display: "flex", justifyContent: "flex-end" }}>
              <button type="submit" className="btn btn-primary" disabled={!form.email || !form.pass || !form.full_name}>Create Account</button>
            </div>
          </form>
        </div>
      )}

      {/* 🌟 NEW: Change Password Modal / Section */}
      {selectedUser && (
        <div style={{ background: "var(--card-bg)", padding: "20px", borderRadius: "12px", marginBottom: "30px", border: "2px solid var(--gold)" }}>
          <h3 style={{ margin: "0 0 15px 0", fontSize: "18px", color: "white" }}>Change Password for: <span style={{ color: "var(--gold)" }}>{selectedUser.full_name}</span></h3>
          <form onSubmit={handleChangePassword} style={{ display: "flex", gap: "15px", alignItems: "flex-end" }}>
            <div style={{ flex: 1 }}>
              <label style={{ display: "block", fontSize: "12px", marginBottom: "5px", color: "var(--text-muted)" }}>New Secure Password</label>
              <input required type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} className="input" placeholder="Minimum 6 characters" minLength="6" />
            </div>
            <div style={{ display: "flex", gap: "10px" }}>
              <button type="submit" className="btn btn-primary" disabled={passwordLoading || !newPassword}>Update Password</button>
              <button type="button" className="btn btn-outline" onClick={() => { setSelectedUser(null); setNewPassword(""); }}>Cancel</button>
            </div>
          </form>
        </div>
      )}

      {loading ? (
        <div style={{ textAlign: "center", padding: "50px", opacity: 0.5 }}>Loading accounts...</div>
      ) : (
        <div style={{ overflowX: "auto", background: "var(--card-bg)", borderRadius: "12px", border: "1px solid rgba(255,255,255,0.05)" }}>
          <table className="table" style={{ width: "100%" }}>
            <thead>
              <tr style={{ background: "rgba(0,0,0,0.2)" }}>
                <th style={{ padding: "12px" }}>Name</th>
                <th style={{ padding: "12px" }}>Role</th>
                <th style={{ padding: "12px" }}>Position</th>
                <th style={{ padding: "12px", textAlign: "right" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map(u => (
                <tr key={u.id} style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                  <td style={{ padding: "12px", fontWeight: "bold" }}>{u.full_name}</td>
                  <td style={{ padding: "12px" }}>
                    <span style={{ fontSize: "10px", background: "rgba(255,255,255,0.1)", padding: "4px 8px", borderRadius: "12px", textTransform: "uppercase" }}>{u.role}</span>
                  </td>
                  <td style={{ padding: "12px", color: "var(--text-muted)" }}>{u.position || "—"}</td>
                  {/* 🌟 NEW: Action interactive cell linking password modifications */}
                  <td style={{ padding: "12px", textAlign: "right" }}>
                    <button 
                      className="btn btn-sm btn-outline" 
                      style={{ fontSize: "11px", padding: "4px 10px" }}
                      onClick={() => { setSelectedUser(u); setErr(""); setMsg(""); }}
                    >
                      🔑 Change Password
                    </button>
                  </td>
                </tr>
              ))}
              {users.length === 0 && <tr><td colSpan="4" style={{ textAlign: "center", padding: "30px", opacity: 0.5 }}>No profiles found.</td></tr>}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}