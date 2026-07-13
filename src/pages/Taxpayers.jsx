import { useState, useEffect, useCallback } from "react";
import { db } from "../utils/db";

console.log("Supabase URL:", import.meta.env.VITE_SUPABASE_URL);

export default function Taxpayers({ token, profile }) {
    const [list, setList] = useState([]);
    const [loading, setLoading] = useState(true);
    const [q, setQ] = useState("");
    const [page, setPage] = useState(0);
    const [sel, setSel] = useState(null);
    const [props, setProps] = useState([]);
    
    const [showForm, setShowForm] = useState(false);
    const [showViewModal, setShowViewModal] = useState(false); // 🌟 NEW: Controls the View Modal
    
    const [saving, setSaving] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const [editId, setEditId] = useState(null);
    const [form, setForm] = useState({ lastname: "", firstname: "", middlename: "", address: "", barangay: "", contact_no: "", email: "", tin: "" });
    const PER = 20;

    const [showPropForm, setShowPropForm] = useState(false);
    const [savingProp, setSavingProp] = useState(false);
    const [editPropId, setEditPropId] = useState(null);
    const [propForm, setPropForm] = useState({ 
        td_number: "", pin: "", classification: "Residential", barangay: "", 
        assessed_value: "", container_code: "", status: "ACTIVE", remarks: "" 
    });

    const [totals, setTotals] = useState({ taxpayers: 0, properties: 0 });

    const barangays = [
        "AMONTAY", "ANOS", "BUYAO", "CALANTAS", "CANDANGAL", "LAHING",
        "LUCTOB", "MABINI IBABA", "MABINI ILAYA", "MALABAHAY", "MAMBOG",
        "OLONGTAO IBABA", "OLONGTAO ILAYA", "PADRE HERRERA", "PAJARILLO",
        "PINAGBAYANAN", "SAN ISIDRO", "SAN JOSE", "SAN NICOLAS", "SAN VICENTE",
        "TAGUIN", "TUBIGAN IBABA", "TUBIGAN ILAYA", "VISTA HERMOSA",
        "CASTILLO (POB.)", "DAMAYAN (POB.)", "MASIPAG (POB.)", "PAG-ASA (POB.)",
        "RIZAL (POB.)", "RODRIGUEZ (POB.)"
    ];

    const loadTotals = useCallback(async () => {
        try {
            const tp = await db.select("taxpayers", { select: "id", limit: 50000 }, token);
            const pr = await db.select("properties", { select: "id", limit: 50000 }, token);
            setTotals({ taxpayers: tp?.length || 0, properties: pr?.length || 0 });
        } catch (e) { console.error("Error loading totals:", e); }
    }, [token]);

    const handleDelete = async () => {
        if (!sel) return;
        if (props.length > 0) {
            alert("Cannot delete this taxpayer because they have registered properties. Please delete their properties first.");
            return;
        }
        if (!window.confirm(`Are you sure you want to permanently delete ${sel.lastname}, ${sel.firstname}?`)) return;

        setDeleting(true);
        try {
            await db.delete("taxpayers", { filter: `id=eq.${sel.id}` }, token);
            setSel(null);
            setShowViewModal(false); // 🌟 Close modal after deletion
            load();
            loadTotals();
        } catch (e) { alert("Failed to delete: " + e.message); }
        setDeleting(false);
    };

    const load = useCallback(async () => {
        setLoading(true);
        try {
            let filterStr = "";
            if (q) {
                const matchedProps = await db.select("properties", {
                    filter: `or=(property_index_no.ilike.*${q}*,td_number.ilike.*${q}*)`,
                    select: "taxpayer_id"
                }, token);

                const tpIdsFromProps = matchedProps.map(p => p.taxpayer_id).filter(id => id);

                let orConditions = [
                    `lastname.ilike.*${q}*`,
                    `firstname.ilike.*${q}*`,
                    `taxpayer_code.ilike.*${q}*`
                ];

                if (tpIdsFromProps.length > 0) {
                    orConditions.push(`id.in.(${tpIdsFromProps.join(',')})`);
                }
                filterStr = `or=(${orConditions.join(',')})`;
            }

            const data = await db.select("taxpayers", {
                filter: filterStr,
                order: "lastname.asc", limit: PER, offset: page * PER
            }, token);
            setList(data || []);
        } catch (e) { console.error(e); }
        setLoading(false);
    }, [token, q, page]);

    useEffect(() => {
        const init = async () => {
            setLoading(true);
            await Promise.all([load(), loadTotals()]);
            setLoading(false);
        };
        init();
    }, [load, loadTotals]);

    // 🌟 NEW: Open View Modal Logic
    const openViewModal = async (t) => {
        setSel(t);
        setShowViewModal(true); // Open the modal
        const p = await db.select("properties", { filter: `taxpayer_id=eq.${t.id}` }, token);
        setProps(p);
    };

    const save = async () => {
        setSaving(true);
        try {
            const payload = { ...form, municipality: "MACALELON", province: "QUEZON" };

            if (editId) {
                await db.update("taxpayers", payload, { filter: `id=eq.${editId}` }, token);
            } else {
                const code = `TP-${new Date().getFullYear()}-${String(Date.now()).slice(-5)}`;
                await db.insert("taxpayers", { ...payload, taxpayer_code: code, created_by: profile?.id }, token);
            }
            setShowForm(false); setEditId(null);
            setForm({ lastname: "", firstname: "", middlename: "", address: "", barangay: "", contact_no: "", email: "", tin: "" });
            if (editId && sel && sel.id === editId) { setSel({ ...sel, ...payload }); }
            load();
            loadTotals();
        } catch (e) { alert(e.message); }
        setSaving(false);
    };

    const saveProperty = async () => {
        if (!propForm.td_number || !propForm.pin || !propForm.assessed_value) {
            alert("TD Number, PIN, and Assessed Value are required."); return;
        }
        setSavingProp(true);
        try {
            const av = parseFloat(propForm.assessed_value);
            const payload = {
                td_number: propForm.td_number, 
                property_index_no: propForm.pin,
                classification: propForm.classification, 
                barangay: propForm.barangay,
                assessed_value: av, 
                container_code: propForm.container_code,
                status: propForm.status,      // 🌟 NEW FIELD
                remarks: propForm.remarks     // 🌟 NEW FIELD
            };

            if (editPropId) {
                await db.update("properties", payload, { filter: `id=eq.${editPropId}` }, token);
            } else {
                payload.taxpayer_id = sel.id;
                await db.insert("properties", payload, token);
            
                const savedProp = await db.select("properties", { filter: `td_number=eq.${propForm.td_number}` }, token);

                if (savedProp && savedProp.length > 0) {
                    const newPropId = savedProp[0].id;
                    const tax = av * 0.01;
                    await db.insert("assessments", {
                        property_id: newPropId, tax_year: new Date().getFullYear(),
                        assessed_value: av, basic_tax: tax, sef_tax: tax
                    }, token);
                }
            }

          const p = await db.select("properties", { filter: `taxpayer_id=eq.${sel.id}` }, token);
            setProps(p);
            setShowPropForm(false);
            setEditPropId(null);
            setPropForm({ td_number: "", pin: "", classification: "Residential", barangay: "", assessed_value: "", container_code: "", status: "ACTIVE", remarks: "" });
            loadTotals();
        } catch (e) {
            alert(e.message.includes("duplicate key") ? "Wait! This TD Number or PIN is already registered." : "Failed to save: " + e.message);
        }
        setSavingProp(false);
    };

    const handleDeleteProperty = async (p) => {
        if (!window.confirm(`Permanently delete property TD ${p.td_number}?`)) return;
        try {
            try { await db.delete("assessments", { filter: `property_id=eq.${p.id}` }, token); } catch (err) { console.error(err); }
            await db.delete("properties", { filter: `id=eq.${p.id}` }, token);
            const refreshed = await db.select("properties", { filter: `taxpayer_id=eq.${sel.id}` }, token);
            setProps(refreshed);
            loadTotals();
        } catch (e) { alert("Cannot delete property. Error: " + e.message); }
    };

    const fmt = (num) => {
        const n = parseFloat(num);
        return isNaN(n) ? "0.00" : n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    };

    const canEdit = ["admin", "encoder", "assessor", "treasurer"].includes(profile?.role);

    return (
        <>
            <div className="topbar">
                <div className="topbar-left"><h1>Taxpayer & Property Registry</h1><p>PROPERTY OWNERS DATABASE</p></div>
                <div className="topbar-right">
                    {canEdit && <button className="btn btn-gold" onClick={() => setShowForm(true)}>＋ Register Taxpayer</button>}
                </div>
            </div>

            <div className="stat-row" style={{ gridTemplateColumns: "repeat(2, 1fr)", marginBottom: "20px" }}>
                <div className="stat-card">
                    <div className="stat-accent blue" />
                    <div className="stat-icon-bg blue">👥</div>
                    <div className="stat-label">Total Registered Taxpayers</div>
                    <div className="stat-value">{totals.taxpayers.toLocaleString()}</div>
                </div>
                <div className="stat-card">
                    <div className="stat-accent green" />
                    <div className="stat-icon-bg green">🏠</div>
                    <div className="stat-label">Total Encoded Properties</div>
                    <div className="stat-value">{totals.properties.toLocaleString()}</div>
                </div>
            </div>

            <div className="page-body">
                <div className="card" style={{ width: "100%" }}>
                    <div className="searchbar">
                        <input
                            placeholder="Search by Name, Code, PIN, or TD No..."
                            value={q}
                            onChange={e => setQ(e.target.value)}
                            onKeyDown={e => { if (e.key === 'Enter') { setPage(0); load(); } }}
                        />
                        <button className="btn btn-outline btn-sm" onClick={() => { setPage(0); load(); }}>Search</button>
                    </div>

                    {loading
                        ? <div className="loading-state"><span className="spin" />Loading records…</div>
                        : list.length === 0
                            ? <div className="empty"><div className="empty-icon">👥</div><div className="empty-text">No taxpayers matched your search.</div></div>
                            : <div className="table-wrap">
                                <table className="full-width-table" style={{ width: "100%" }}>
                                    <thead><tr><th>Code</th><th>Full Name</th><th>Barangay</th><th>Contact</th><th>Status</th><th style={{textAlign: "right"}}>Action</th></tr></thead>
                                    <tbody>
                                        {list.map(t => (
                                            <tr key={t.id} style={{ background: (showViewModal && sel?.id === t.id) ? "var(--bg3)" : "transparent" }}>
                                                <td><span className="mono-sm">{t.taxpayer_code}</span></td>
                                                <td style={{ fontWeight: 600 }}>{t.lastname}, {t.firstname}{t.middlename ? " " + t.middlename[0] + "." : ""}</td>
                                                <td style={{ color: "var(--text3)" }}>{t.barangay || "—"}</td>
                                                <td style={{ color: "var(--text3)" }}>{t.contact_no || "—"}</td>
                                                <td><span className="badge badge-green">Active</span></td>
                                                <td style={{textAlign: "right"}}>
                                                    <button 
                                                        className="btn btn-outline btn-sm" 
                                                        onClick={() => openViewModal(t)}
                                                    >
                                                        View Details
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                    }
                    <div className="pagination">
                        <span className="pg-info">Page {page + 1}</span>
                        <div className="pg-btns">
                            <button className="pg-btn" onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0}>← Prev</button>
                            <button className="pg-btn" onClick={() => setPage(p => p + 1)} disabled={list.length < PER}>Next →</button>
                        </div>
                    </div>
                </div>
            </div>

            {/* 🌟 NEW: THE TAXPAYER PROFILE & PROPERTIES MODAL */}
            {showViewModal && sel && (
                <div className="modal-overlay">
                    <div className="modal-content" style={{ maxWidth: "800px" }}> {/* Made slightly wider for the property grid */}
                        
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "20px", borderBottom: "1px solid var(--border)", paddingBottom: "16px" }}>
                            <div>
                                <h2 style={{ margin: 0 }}>{sel.lastname}, {sel.firstname} Details</h2>
                                <p style={{ margin: 0, color: "var(--text-muted)", fontSize: "13px", marginTop: "4px" }}>{sel.address} | TIN: {sel.tin || "N/A"}</p>
                            </div>
                            <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                                {canEdit && (
                                    <>
                                        <button className="btn btn-outline btn-sm" onClick={() => {
                                            setForm({
                                                lastname: sel.lastname || "", firstname: sel.firstname || "", middlename: sel.middlename || "",
                                                address: sel.address || "", barangay: sel.barangay || "",
                                                contact_no: sel.contact_no || "", email: sel.email || "", tin: sel.tin || ""
                                            });
                                            setEditId(sel.id);
                                            setShowForm(true); // Opens the Edit Modal directly on top!
                                        }}>✏️ Edit Profile</button>
                                        <button className="btn btn-danger btn-sm" onClick={handleDelete} disabled={deleting}>
                                            {deleting ? "..." : "🗑 Delete"}
                                        </button>
                                    </>
                                )}
                                <button className="btn btn-ghost btn-sm" onClick={() => { setShowViewModal(false); setSel(null); }}>✕ Close</button>
                            </div>
                        </div>

                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                            <div style={{ fontSize: 13, color: "var(--text-main)", fontWeight: "bold" }}>REGISTERED PROPERTIES ({props.length})</div>
                            {canEdit && (
                                <button className="btn btn-primary btn-sm" onClick={() => {
                                    setPropForm({ td_number: "", pin: "", classification: "Residential", barangay: "", assessed_value: "", container_code: "" });
                                    setEditPropId(null);
                                    setShowPropForm(true); // Opens the Add Property Modal directly on top!
                                }}>
                                    ＋ Add Property
                                </button>
                            )}
                        </div>

                        {props.length === 0
                            ? <div style={{ fontSize: 13, color: "var(--text-muted)", padding: "40px 20px", textAlign: "center", background: "var(--bg-main)", borderRadius: "8px" }}>No properties registered to this taxpayer.</div>
                            : <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: "16px" }}>
                                {props.map(p => (
                                    <div className="property-card" key={p.id}>
                                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                                            <div>
                                                <div style={{ fontWeight: "bold", fontSize: 14 }}>TD: {p.td_number}</div>
                                                <div style={{ fontSize: 12, color: "var(--blue)", fontFamily: "var(--font-mono)", marginTop: 4, fontWeight: "bold" }}>PIN: {p.property_index_no || "—"}</div>
                                                <div style={{ fontSize: 12, color: "var(--gold2)", fontFamily: "var(--font-mono)", marginTop: 4, fontWeight: "bold" }}>🗄️ LOCATOR: {p.container_code || "Unassigned"}</div>
                                                <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 4 }}>{p.classification} · {p.barangay || "—"}</div>
                                                {p.status !== 'ACTIVE' && (
                                                    <div style={{ marginTop: "8px" }}>
                                                        <span className={`badge ${p.status === 'CANCELLED' ? 'badge-red' : 'badge-gold'}`}>
                                                            {p.status}
                                                        </span>
                                                        <div style={{ fontSize: "10px", marginTop: "2px", fontStyle: "italic", color: "var(--text-muted)" }}>
                                                            {p.remarks}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                            <div style={{ textAlign: "right" }}>
                                                <div className="amount-lg" style={{ fontSize: 16 }}>{fmt(p.assessed_value)}</div>
                                                <div style={{ fontSize: 10, color: "var(--text-muted)", marginBottom: "12px" }}>ASSESSED VALUE</div>
                                                
                                                {canEdit && (
                                                    <div style={{ display: "flex", gap: "8px", justifyContent: "flex-end" }}>
                                                        <button className="btn btn-ghost btn-xs" style={{ color: "var(--blue)" }} onClick={() => {
                                                            setPropForm({
                                                                td_number: p.td_number || "", pin: p.property_index_no || "",
                                                                classification: p.classification || "Residential", barangay: p.barangay || "",
                                                                assessed_value: p.assessed_value || "", container_code: p.container_code || ""
                                                            });
                                                            setEditPropId(p.id);
                                                            setShowPropForm(true); // Opens Edit Property Modal directly on top!
                                                        }}>✏️ Edit</button>
                                                        <button className="btn btn-ghost btn-xs" style={{ color: "var(--red2)" }} onClick={() => handleDeleteProperty(p)}>✕ Del</button>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        }
                    </div>
                </div>
            )}

            {/* THE TAXPAYER ADD/EDIT MODAL (Stacks automatically) */}
            {showForm && (
                <div className="modal-overlay">
                    <div className="modal-content">
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "20px", borderBottom: "1px solid var(--border)", paddingBottom: "16px" }}>
                            <div>
                                <h2 style={{ margin: 0 }}>{editId ? "Edit Taxpayer Profile" : "New Taxpayer Registration"}</h2>
                                <p style={{ margin: 0, color: "var(--text-muted)", fontSize: "13px", marginTop: "4px" }}>Please fill in all the required fields below.</p>
                            </div>
                            <button className="btn btn-ghost btn-sm" onClick={() => { setShowForm(false); setEditId(null); setForm({ lastname: "", firstname: "", middlename: "", address: "", barangay: "", contact_no: "", email: "", tin: "" }); }}>✕ Close</button>
                        </div>
                        
                        <div className="form-grid" style={{ marginBottom: 16 }}>
                            {[["lastname", "Last Name"], ["firstname", "First Name"], ["middlename", "Middle Name"]].map(([k, l]) => (
                                <div className="form-group" key={k}>
                                    <label className="form-label">{l}</label>
                                    <input value={form[k]} onChange={e => setForm(f => ({ ...f, [k]: e.target.value }))} />
                                </div>
                            ))}

                            <div className="form-group">
                                <label className="form-label">Barangay</label>
                                <select value={form.barangay} onChange={e => setForm(f => ({ ...f, barangay: e.target.value }))}>
                                    <option value="">— Select Barangay —</option>
                                    {barangays.map(b => <option key={b} value={b}>{b}</option>)}
                                </select>
                            </div>

                            <div className="form-group" style={{ gridColumn: "span 2" }}>
                                <label className="form-label">Complete Address</label>
                                <input value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} />
                            </div>

                            {[["contact_no", "Contact Number"], ["email", "Email Address"], ["tin", "TIN"]].map(([k, l]) => (
                                <div className="form-group" key={k}>
                                    <label className="form-label">{l}</label>
                                    <input value={form[k]} onChange={e => setForm(f => ({ ...f, [k]: e.target.value }))} />
                                </div>
                            ))}
                        </div>
                        <div style={{ display: "flex", gap: "12px", justifyContent: "flex-end", borderTop: "1px solid var(--border)", paddingTop: "16px" }}>
                            <button className="btn btn-outline" onClick={() => { setShowForm(false); setEditId(null); setForm({ lastname: "", firstname: "", middlename: "", address: "", barangay: "", contact_no: "", email: "", tin: "" }); }}>Cancel</button>
                            <button className="btn btn-success" onClick={save} disabled={saving}>{saving ? "Saving..." : "💾 Save Taxpayer"}</button>
                        </div>
                    </div>
                </div>
            )}

            {/* THE PROPERTY ADD/EDIT MODAL (Stacks automatically) */}
            {showPropForm && (
                <div className="modal-overlay">
                    <div className="modal-content">
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "20px", borderBottom: "1px solid var(--border)", paddingBottom: "16px" }}>
                            <div>
                                <h2 style={{ margin: 0 }}>{editPropId ? "Edit Property Details" : "Register New Property"}</h2>
                                <p style={{ margin: 0, color: "var(--text-muted)", fontSize: "13px", marginTop: "4px" }}>Registering property for: <strong>{sel?.lastname}, {sel?.firstname}</strong></p>
                            </div>
                            <button className="btn btn-ghost btn-sm" onClick={() => { setShowPropForm(false); setEditPropId(null); }}>✕ Close</button>
                        </div>

                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: 16 }}>
                            <div className="form-group">
                                <label className="form-label">TD Number</label>
                                <input placeholder="e.g. 021-01-0001" value={propForm.td_number} onChange={e => setPropForm({ ...propForm, td_number: e.target.value })} />
                            </div>
                            <div className="form-group">
                                <label className="form-label">PIN</label>
                                <input placeholder="e.g. 021-01-0001-001" value={propForm.pin} onChange={e => setPropForm({ ...propForm, pin: e.target.value })} />
                            </div>
                        </div>

                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: 16 }}>
                            <div className="form-group">
                                <label className="form-label">Classification</label>
                                <select value={propForm.classification} onChange={e => setPropForm({ ...propForm, classification: e.target.value })}>
                                    <option>Residential</option>
                                    <option>Agricultural</option>
                                    <option>Commercial</option>
                                    <option>Industrial</option>
                                </select>
                            </div>
                            <div className="form-group">
                                <label className="form-label">RPTAR Box / Locator</label>
                                <input placeholder="e.g. BOX-42" value={propForm.container_code} onChange={e => setPropForm({ ...propForm, container_code: e.target.value })} />
                            </div>
                        </div>

                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: 24 }}>
                            <div className="form-group">
                                <label className="form-label">Property Barangay</label>
                                <select value={propForm.barangay} onChange={e => setPropForm({ ...propForm, barangay: e.target.value })}>
                                    <option value="">— Select Barangay —</option>
                                    {barangays.map(b => <option key={b} value={b}>{b}</option>)}
                                </select>
                            </div>
                            <div className="form-group">
                                <label className="form-label">Assessed Value (₱)</label>
                                <input type="number" placeholder="e.g. 150000" value={propForm.assessed_value} onChange={e => setPropForm({ ...propForm, assessed_value: e.target.value })} />
                            </div>
                        </div>

                        <div style={{ display: "flex", gap: "12px", justifyContent: "flex-end", borderTop: "1px solid var(--border)", paddingTop: "16px" }}>
                            <button className="btn btn-outline" onClick={() => { setShowPropForm(false); setEditPropId(null); }}>Cancel</button>
                            <button className="btn btn-success" onClick={saveProperty} disabled={savingProp}>{savingProp ? "Saving..." : "💾 Save Property"}</button>
                        </div>
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: 16 }}>
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: 16 }}>
                            <div className="form-group">
                                <label className="form-label">Status</label>
                                <select value={propForm.status} onChange={e => setPropForm({ ...propForm, status: e.target.value })}>
                                    <option value="ACTIVE">ACTIVE</option>
                                    <option value="CANCELLED">CANCELLED</option>
                                    <option value="SUBDIVIDED">SUBDIVIDED</option>
                                    <option value="RELOCATED">RELOCATED</option>
                                    <option value="PIN CHANGED">PIN CHANGED</option>
                                </select>
                            </div>
                            <div className="form-group">
                                <label className="form-label">Remarks</label>
                                <input placeholder="e.g. Cancelled due to subdivision..." value={propForm.remarks} onChange={e => setPropForm({ ...propForm, remarks: e.target.value })} />
                            </div>
                        </div>    
                                  
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}