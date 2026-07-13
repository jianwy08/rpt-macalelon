import { useState, useEffect, useCallback } from "react";
import { db } from "../utils/db";

export default function AccountableForms({ token, profile }) {
  const [forms, setForms] = useState([]);
  const [cashierList, setCashierList] = useState([]); 
  const [loading, setLoading] = useState(true); // 🌟 Now correctly used!
  const [showAdd, setShowAdd] = useState(false);

  // Form State
  const [officerName, setOfficerName] = useState("");
  const [stubNo, setStubNo] = useState("");
  const [serialFrom, setSerialFrom] = useState("");
  const [qty, setQty] = useState(50);
  const [currentSerial, setCurrentSerial] = useState("");

  const isAdmin = profile?.role === "admin" || profile?.role === "superadmin" || profile?.role === "treasurer";

  const loadForms = useCallback(async () => {
    setLoading(true);
    try {
      // If Admin, see all forms. If Cashier, see only their forms.
      const filter = isAdmin ? null : `officer_name=eq.${profile.full_name}`;
      const data = await db.select("accountable_forms", { filter, order: "created_at.desc" }, token);
      setForms(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  },[token]);

  // Fetch all users from the user_profiles table
  const loadCashiers = useCallback(async () => {
    try {
      const users = await db.select("user_profiles", { order: "full_name.asc" }, token);
      setCashierList(Array.isArray(users) ? users : []);
    } catch (e) {
      console.error("Failed to load user profiles:", e);
    }
  },[token]);

  // 🌟 FIX: Wrapped the state-loading functions to prevent cascading renders
  useEffect(() => {
    const initializeData = async () => {
      await loadForms();
      if (isAdmin) {
        await loadCashiers();
      }
    };
    initializeData();
  }, [loadForms, loadCashiers, isAdmin]); // Ensure hooks dependencies are happy!

  const handleIssueForm = async (e) => {
    e.preventDefault();
    const startNum = parseInt(serialFrom);
    const quantity = parseInt(qty);
    const endNum = startNum + quantity - 1;
    
    // 🌟 If they leave "Next Serial" blank, assume it's a brand new booklet. 
    // Otherwise, use the number they typed!
    const startingPoint = currentSerial ? parseInt(currentSerial) : startNum;

    if (startingPoint < startNum || startingPoint > endNum + 1) {
        alert("The Next Available Serial must be within the booklet's range!");
        return;
    }

    try {
      await db.insert("accountable_forms", [{
        officer_name: officerName.toUpperCase(),
        form_type: "AF56",
        stub_no: stubNo,
        qty_received: quantity,
        serial_from: startNum,
        serial_to: endNum,
        current_serial: startingPoint, // 🌟 THIS IS THE FIX
        status: startingPoint > endNum ? "CONSUMED" : "ACTIVE"
      }], token);

      setShowAdd(false);
      setOfficerName(""); setStubNo(""); setSerialFrom(""); setCurrentSerial(""); // Clear it
      loadForms();
    } catch (e) {
      alert("Failed to issue form: " + e.message);
    }
  };

  return (
    <div style={{ padding: "30px", animation: "fadeIn 0.4s" }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "20px" }}>
        <div>
          <h2>Accountable Forms Inventory (AF56)</h2>
          <p style={{ color: "var(--text-muted)" }}>Manage and track official receipt booklets.</p>
        </div>
        {isAdmin && (
          <button className="btn btn-gold" onClick={() => setShowAdd(!showAdd)}>
            {showAdd ? "Cancel" : "+ Issue New Booklet"}
          </button>
        )}
      </div>

      {showAdd && isAdmin && (
        <div className="card" style={{ marginBottom: "20px", padding: "20px", background: "var(--bg2)", borderTop: "4px solid var(--gold)" }}>
          <form onSubmit={handleIssueForm} style={{ display: "flex", gap: "15px", alignItems: "flex-end" }}>
            
            <div className="form-group" style={{ flex: 1 }}>
              <label>Assign To (Cashier Name)</label>
              <select 
                required 
                value={officerName} 
                onChange={e => setOfficerName(e.target.value)} 
                className="input"
                style={{ padding: "8px", borderRadius: "6px", border: "1px solid var(--border)", background: "var(--bg2)", color: "var(--text)" }}
              >
                <option value="" disabled>-- Select a Staff Member --</option>
                {cashierList.map(user => (
                  <option key={user.id} value={(user.full_name || "UNKNOWN").toUpperCase()}>
                    {(user.full_name || "UNKNOWN").toUpperCase()} ({user.role || "Staff"})
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group" style={{ width: "150px" }}>
              <label>Stub No.</label>
              <input required type="text" value={stubNo} onChange={e => setStubNo(e.target.value)} className="input" />
            </div>
            <div className="form-group" style={{ width: "150px" }}>
              <label>Starting Serial No.</label>
              <input required type="number" value={serialFrom} onChange={e => setSerialFrom(e.target.value)} className="input" />
            </div>
            {/* 🌟 THE NEW FIELD */}
            <div className="form-group" style={{ width: "150px" }}>
              <label style={{ color: "var(--blue2)" }}>Next Available OR</label>
              <input 
                type="number" 
                value={currentSerial} 
                onChange={e => setCurrentSerial(e.target.value)} 
                className="input" 
                placeholder="Leave blank if new" 
                style={{ border: "1px dashed var(--blue2)" }}
              />
            </div>
            <div className="form-group" style={{ width: "100px" }}>
              <label>Quantity</label>
              <input required type="number" value={qty} onChange={e => setQty(e.target.value)} className="input" />
            </div>
            <button type="submit" className="btn btn-primary">Save AF56</button>
          </form>
        </div>
      )}

      {/* 🌟 THIS IS WHERE THE SPINNER AND TABLE CODE WAS PLACED 🌟 */}
      {loading ? (
        <div style={{ textAlign: "center", padding: "40px", color: "var(--text3)" }}>
          <span className="spin" style={{ marginRight: "10px", borderColor: "var(--gold)", borderTopColor: "transparent" }} />
          Loading inventory...
        </div>
      ) : forms.length === 0 ? (
        <div className="card" style={{ padding: "40px", textAlign: "center", color: "var(--text3)" }}>
          <div style={{ fontSize: "40px", marginBottom: "10px" }}>📚</div>
          <div>No accountable forms found.</div>
        </div>
      ) : (
        <div className="card">
          <table className="table" style={{ width: "100%" }}>
            <thead>
              <tr>
                <th>Date Issued</th>
                <th>Assigned Officer</th>
                <th>Form Type</th>
                <th>Stub No.</th>
                <th>Inclusive Serials</th>
                <th>Current OR No.</th>
                <th>Remaining</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {forms.map(f => {
                const remaining = f.serial_to - f.current_serial + 1;
                const isLow = remaining > 0 && remaining <= 10;
                return (
                  <tr key={f.id}>
                    <td>{f.date_issued}</td>
                    <td style={{ fontWeight: "bold" }}>{f.officer_name}</td>
                    <td><span className="badge">{f.form_type}</span></td>
                    <td>{f.stub_no}</td>
                    <td>{f.serial_from} - {f.serial_to}</td>
                    <td style={{ fontWeight: "bold", color: "var(--blue)" }}>{f.current_serial > f.serial_to ? "FINISHED" : f.current_serial}</td>
                    <td>
                      <span style={{ color: isLow ? "red" : "inherit", fontWeight: isLow ? "bold" : "normal" }}>
                        {f.current_serial > f.serial_to ? 0 : remaining} pcs
                      </span>
                    </td>
                    <td>
                      {f.current_serial > f.serial_to 
                        ? <span className="badge" style={{ background: "var(--red2)", color: "white" }}>CONSUMED</span>
                        : <span className="badge" style={{ background: "var(--green2)", color: "white" }}>ACTIVE</span>
                      }
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}