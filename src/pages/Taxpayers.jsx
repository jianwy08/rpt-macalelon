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
    const [saving, setSaving] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const [editId, setEditId] = useState(null);
    const [form, setForm] = useState({ lastname: "", firstname: "", middlename: "", address: "", barangay: "", contact_no: "", email: "", tin: "" });
    const PER = 20;

    const [showPropForm, setShowPropForm] = useState(false);
    const [savingProp, setSavingProp] = useState(false);
    const [editPropId, setEditPropId] = useState(null);
    const [propForm, setPropForm] = useState({ td_number: "", pin: "", classification: "Residential", barangay: "", assessed_value: "", container_code: "" });

    // 🌟 NEW: States to hold the live counts for the KPI Dashboard
    const [totals, setTotals] = useState({ taxpayers: 0, properties: 0 });

    // 🌟 THE OFFICIAL MACALELON BARANGAY LIST
    const barangays = [
        "AMONTAY", "ANOS", "BUYAO", "CALANTAS", "CANDANGAL", "LAHING",
        "LUCTOB", "MABINI IBABA", "MABINI ILAYA", "MALABAHAY", "MAMBOG",
        "OLONGTAO IBABA", "OLONGTAO ILAYA", "PADRE HERRERA", "PAJARILLO",
        "PINAGBAYANAN", "SAN ISIDRO", "SAN JOSE", "SAN NICOLAS", "SAN VICENTE",
        "TAGUIN", "TUBIGAN IBABA", "TUBIGAN ILAYA", "VISTA HERMOSA",
        "CASTILLO (POB.)", "DAMAYAN (POB.)", "MASIPAG (POB.)", "PAG-ASA (POB.)",
        "RIZAL (POB.)", "RODRIGUEZ (POB.)"
    ];

    // 🌟 FIXED: Added limit: 50000 to bypass the 1,000 row Supabase cap
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
            load();
            loadTotals(); // 🌟 Update counters
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
    

    const selectTaxpayer = async t => {
        setSel(t);
        setShowPropForm(false);
        setEditPropId(null);
        const p = await db.select("properties", { filter: `taxpayer_id=eq.${t.id}` }, token);
        setProps(p);
    };

    const save = async () => {
        setSaving(true);
        try {
            const payload = {
                ...form,
                municipality: "MACALELON",
                province: "QUEZON"
            };

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
            loadTotals(); // 🌟 Update counters
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
                container_code: propForm.container_code
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
                    const currentYear = new Date().getFullYear();

                    await db.insert("assessments", {
                        property_id: newPropId,
                        tax_year: currentYear,
                        assessed_value: av,
                        basic_tax: tax,
                        sef_tax: tax
                    }, token);
                }
            }

            const p = await db.select("properties", { filter: `taxpayer_id=eq.${sel.id}` }, token);
            setProps(p);

            setShowPropForm(false);
            setEditPropId(null);
            setPropForm({ td_number: "", pin: "", classification: "Residential", barangay: "", assessed_value: "", container_code: "" });
            loadTotals(); // 🌟 Update counters
        } catch (e) {
            if (e.message && e.message.includes("duplicate key")) {
                alert("Wait! This TD Number or PIN is already registered in the system. Please check the numbers and try again.");
            } else {
                alert("Failed to save property: " + e.message);
            }
        }
        setSavingProp(false);
    };

    const handleDeleteProperty = async (p) => {
        if (!window.confirm(`Permanently delete property TD ${p.td_number}? Note: If this property has existing payment receipts, the database will block the deletion.`)) return;
        try {
            try { await db.delete("assessments", { filter: `property_id=eq.${p.id}` }, token); } catch (err) {console.error(err);}

            await db.delete("properties", { filter: `id=eq.${p.id}` }, token);
            const refreshed = await db.select("properties", { filter: `taxpayer_id=eq.${sel.id}` }, token);
            setProps(refreshed);
            loadTotals(); // 🌟 Update counters
        } catch (e) {
            alert("Cannot delete property. It likely has collections or delinquency records attached to it. Error: " + e.message);
        }
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
                    {canEdit && <button className="btn btn-gold" onClick={() => setShowForm(!showForm)}>＋ Register Taxpayer</button>}
                </div>
            </div>

            {/* 🌟 NEW: LIVE KPI COUNTERS */}
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

            {showForm && (
                <div className="page-body" style={{ paddingBottom: 0 }}>
                    <div className="card">
                        <div className="card-header">
                            <div><div className="card-title">New Taxpayer Registration</div><div className="card-sub">All fields will be saved to the Supabase database</div></div>
                            <button className="btn btn-ghost btn-sm" onClick={() => setShowForm(false)}>✕ Close</button>
                        </div>
                        <div className="card-body">
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
                            <div className="gap-row">
                                <button className="btn btn-success" onClick={save} disabled={saving}>{saving && <><span className="spin" />&nbsp;</>}Save Taxpayer</button>
                                <button className="btn btn-outline" onClick={() => { setShowForm(false); setEditId(null); setForm({ lastname: "", firstname: "", middlename: "", address: "", barangay: "", contact_no: "", email: "", tin: "" }); }}>Cancel</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <div className="page-body">
                <div className="col-8-4">
                    <div className="card">

                        <div className="searchbar">
                            <input
                                placeholder="Search by Name, Code, PIN, or TD No..."
                                value={q}
                                onChange={e => setQ(e.target.value)}
                                onKeyDown={e => {
                                    if (e.key === 'Enter') {
                                        setPage(0);
                                        load();
                                    }
                                }}
                            />
                            <button className="btn btn-outline btn-sm" onClick={() => { setPage(0); load(); }}>Search</button>
                        </div>

                        {loading
                            ? <div className="loading-state"><span className="spin" />Loading records…</div>
                            : list.length === 0
                                ? <div className="empty"><div className="empty-icon">👥</div><div className="empty-text">No taxpayers matched your search.</div></div>
                                : <div className="table-wrap"><table>
                                    <thead><tr><th>Code</th><th>Full Name</th><th>Barangay</th><th>Contact</th><th>Status</th><th></th></tr></thead>
                                    <tbody>
                                        {list.map(t => (
                                            <tr key={t.id} style={{ cursor: "pointer", background: sel?.id === t.id ? "var(--bg3)" : "transparent" }} onClick={() => selectTaxpayer(t)}>
                                                <td><span className="mono-sm">{t.taxpayer_code}</span></td>
                                                <td style={{ fontWeight: 600 }}>{t.lastname}, {t.firstname}{t.middlename ? " " + t.middlename[0] + "." : ""}</td>
                                                <td style={{ color: "var(--text3)" }}>{t.barangay || "—"}</td>
                                                <td style={{ color: "var(--text3)" }}>{t.contact_no || "—"}</td>
                                                <td><span className="badge badge-green">Active</span></td>
                                                <td><button className="btn btn-ghost btn-xs">View →</button></td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table></div>
                        }
                        <div className="pagination">
                            <span className="pg-info">Page {page + 1}</span>
                            <div className="pg-btns">
                                <button className="pg-btn" onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0}>← Prev</button>
                                <button className="pg-btn" onClick={() => setPage(p => p + 1)} disabled={list.length < PER}>Next →</button>
                            </div>
                        </div>
                    </div>

                    <div>
                        {sel ? (
                            <div className="card">
                                <div className="card-header">
                                    <div><div className="card-title">{sel.lastname}, {sel.firstname}</div><div className="card-sub">{sel.taxpayer_code}</div></div>
                                    <div style={{ display: "flex", gap: "8px" }}>
                                        {canEdit && (
                                            <button className="btn btn-outline btn-sm" onClick={() => {
                                                setForm({
                                                    lastname: sel.lastname || "", firstname: sel.firstname || "", middlename: sel.middlename || "",
                                                    address: sel.address || "", barangay: sel.barangay || "",
                                                    contact_no: sel.contact_no || "", email: sel.email || "", tin: sel.tin || ""
                                                });
                                                setEditId(sel.id);
                                                setShowForm(true);
                                            }}>✏️ Edit</button>
                                        )}
                                        {canEdit && (
                                            <button className="btn btn-danger btn-sm" onClick={handleDelete} disabled={deleting}>
                                                {deleting ? "Deleting..." : "🗑 Delete"}
                                            </button>
                                        )}
                                    </div>
                                </div>

                                <div className="card-body">
                                    <div className="detail-grid">
                                        {[["Barangay", sel.barangay || "—"], ["Address", sel.address || "—"], ["Contact", sel.contact_no || "—"], ["Email", sel.email || "—"], ["TIN", sel.tin || "—"]].map(([k, v]) => (
                                            <div className="drow" key={k}><span className="dk">{k}</span><span className="dv">{v}</span></div>
                                        ))}
                                    </div>
                                    <div className="divider" />

                                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                                        <div style={{ fontSize: 12, color: "var(--text3)", fontWeight: "bold" }}>PROPERTIES ({props.length})</div>
                                        {canEdit && (
                                            <button className="btn btn-primary btn-xs" onClick={() => {
                                                if (showPropForm && !editPropId) {
                                                    setShowPropForm(false);
                                                } else {
                                                    setPropForm({ td_number: "", pin: "", classification: "Residential", barangay: "", assessed_value: "", container_code: "" });
                                                    setEditPropId(null);
                                                    setShowPropForm(true);
                                                }
                                            }}>
                                                {showPropForm && !editPropId ? "Cancel" : "＋ Add Property"}
                                            </button>
                                        )}
                                    </div>

                                    {showPropForm && (
                                        <div style={{ background: "var(--bg3)", borderRadius: 9, padding: "14px", marginBottom: 12, border: "1px solid var(--blue)", borderLeft: "4px solid var(--blue)" }}>
                                            <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 10 }}>
                                                {editPropId ? "Edit Property Details" : "Register New Property"}
                                            </div>

                                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginBottom: 8 }}>
                                                <div className="form-group">
                                                    <label className="form-label" style={{ fontSize: 10 }}>TD Number</label>
                                                    <input placeholder="e.g. 021-01-0001" value={propForm.td_number} onChange={e => setPropForm({ ...propForm, td_number: e.target.value })} />
                                                </div>
                                                <div className="form-group">
                                                    <label className="form-label" style={{ fontSize: 10 }}>PIN</label>
                                                    <input placeholder="e.g. 021-01-0001-001" value={propForm.pin} onChange={e => setPropForm({ ...propForm, pin: e.target.value })} />
                                                </div>
                                            </div>

                                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginBottom: 8 }}>
                                                <div className="form-group">
                                                    <label className="form-label" style={{ fontSize: 10 }}>Classification</label>
                                                    <select value={propForm.classification} onChange={e => setPropForm({ ...propForm, classification: e.target.value })}>
                                                        <option>Residential</option>
                                                        <option>Agricultural</option>
                                                        <option>Commercial</option>
                                                        <option>Industrial</option>
                                                    </select>
                                                </div>
                                                <div className="form-group">
                                                    <label className="form-label" style={{ fontSize: 10 }}>RPTAR Box / Locator</label>
                                                    <input placeholder="e.g. BOX-42" value={propForm.container_code} onChange={e => setPropForm({ ...propForm, container_code: e.target.value })} />
                                                </div>
                                            </div>

                                            <div className="form-group" style={{ marginBottom: 8 }}>
                                                <label className="form-label" style={{ fontSize: 10 }}>Property Barangay</label>
                                                <select value={propForm.barangay} onChange={e => setPropForm({ ...propForm, barangay: e.target.value })}>
                                                    <option value="">— Select Barangay —</option>
                                                    {barangays.map(b => <option key={b} value={b}>{b}</option>)}
                                                </select>
                                            </div>

                                            <div className="form-group" style={{ marginBottom: 12 }}>
                                                <label className="form-label" style={{ fontSize: 10 }}>Assessed Value (₱)</label>
                                                <input type="number" placeholder="e.g. 150000" value={propForm.assessed_value} onChange={e => setPropForm({ ...propForm, assessed_value: e.target.value })} />
                                            </div>

                                            <div style={{ display: "flex", gap: "8px" }}>
                                                <button className="btn btn-success btn-sm" style={{ flex: 1 }} onClick={saveProperty} disabled={savingProp}>
                                                    {savingProp ? "Saving..." : "💾 Save"}
                                                </button>
                                                <button className="btn btn-outline btn-sm" onClick={() => { setShowPropForm(false); setEditPropId(null); }}>
                                                    Cancel
                                                </button>
                                            </div>
                                        </div>
                                    )}

                                    {props.length === 0 && !showPropForm
                                        ? <div style={{ fontSize: 12, color: "var(--text3)" }}>No properties registered.</div>
                                        : props.map(p => (
                                            <div key={p.id} style={{ background: "var(--bg3)", borderRadius: 9, padding: "10px 14px", marginBottom: 8, border: "1px solid var(--border)" }}>
                                                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                                                    <div>
                                                        <div style={{ fontWeight: 600, fontSize: 13 }}>TD: {p.td_number}</div>
                                                        <div style={{ fontSize: 11, color: "var(--blue2)", fontFamily: "var(--font-mono)", marginTop: 2, fontWeight: "bold" }}>PIN: {p.property_index_no || "—"}</div>
                                                        <div style={{ fontSize: 11, color: "var(--gold2)", fontFamily: "var(--font-mono)", marginTop: 2, fontWeight: "bold" }}>🗄️ LOCATOR: {p.container_code || "Unassigned"}</div>
                                                        <div style={{ fontSize: 11, color: "var(--text3)", fontFamily: "var(--font-mono)", marginTop: 2 }}>{p.classification} · {p.barangay || "—"}</div>
                                                    </div>
                                                    <div style={{ textAlign: "right" }}>
                                                        <div className="amount-lg" style={{ fontSize: 14 }}>{fmt(p.assessed_value)}</div>
                                                        <div style={{ fontSize: 10, color: "var(--text3)", fontFamily: "var(--font-mono)", marginBottom: "8px" }}>ASSESSED VALUE</div>

                                                        {canEdit && (
                                                            <div style={{ display: "flex", gap: "4px", justifyContent: "flex-end" }}>
                                                                <button className="btn btn-ghost btn-xs" style={{ color: "var(--blue)" }} onClick={() => {
                                                                    setPropForm({
                                                                        td_number: p.td_number || "",
                                                                        pin: p.property_index_no || "",
                                                                        classification: p.classification || "Residential",
                                                                        barangay: p.barangay || "",
                                                                        assessed_value: p.assessed_value || "",
                                                                        container_code: p.container_code || ""
                                                                    });
                                                                    setEditPropId(p.id);
                                                                    setShowPropForm(true);
                                                                }}>✏️ Edit</button>

                                                                <button className="btn btn-ghost btn-xs" style={{ color: "var(--red2)" }} onClick={() => handleDeleteProperty(p)}>✕ Del</button>
                                                            </div>
                                                        )}

                                                    </div>
                                                </div>
                                            </div>
                                        ))
                                    }
                                </div>
                            </div>
                        ) : (
                            <div className="card" style={{ height: "100%", minHeight: 200 }}>
                                <div className="empty"><div className="empty-icon">👆</div><div className="empty-text">Select a taxpayer to view details</div></div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </>
    );
}