import { useState, useEffect, useCallback, useMemo } from "react";
import { db, fmt } from "../utils/db";

export default function Assessments({ token, profile }) {
    const [list, setList] = useState([]);
    const [properties, setProperties] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showAdd, setShowAdd] = useState(false);
    const [saving, setSaving] = useState(false);

    // 🌟 DYNAMIC SEARCH STATE (Replaces 'q')
    const [searchTerm, setSearchTerm] = useState("");

    const [propSearch, setPropSearch] = useState("");
    const [historyId, setHistoryId] = useState(null);
    const [editId, setEditId] = useState(null);
    const [editForm, setEditForm] = useState({ tax_year: "", assessed_value: "" });

    const [form, setForm] = useState({
        property_id: "", tax_year: String(new Date().getFullYear() + 1), assessed_value: ""
    });

    // 🌟 MODIFIED LOAD FUNCTION: Fetches all records once for instant client-side filtering
    const load = useCallback(async () => {
        setLoading(true);
        try {
            const d = await db.select("assessments", {
                select: "*,properties(td_number,property_index_no,classification,taxpayers(lastname,firstname))",
                order: "tax_year.desc"
            }, token);
            setList(d || []);
        } catch (e) { console.error(e); }
        setLoading(false);
    }, [token]);

    const loadProperties = async () => {
        try {
            const p = await db.select("properties", { select: "id,td_number,property_index_no,taxpayers(lastname,firstname)", order: "td_number.asc" }, token);
            setProperties(p || []);
        } catch (e) { console.error(e); }
    };

    useEffect(() => { 
    load();
    loadProperties();
}, [load]);

    const computedBasic = (parseFloat(form.assessed_value) || 0) * 0.01;
    const computedSef = (parseFloat(form.assessed_value) || 0) * 0.01;

    const handleSaveRevision = async (e) => {
        e.preventDefault();
        if (!form.property_id || !form.assessed_value || !form.tax_year) { alert("Please fill in all required fields."); return; }
        setSaving(true);
        try {
            const av = parseFloat(form.assessed_value);
            await db.insert("assessments", [{ property_id: parseInt(form.property_id), tax_year: parseInt(form.tax_year), assessed_value: av, basic_tax: computedBasic, sef_tax: computedSef, status: "ACTIVE" }], token);
            await db.update("properties", { assessed_value: av }, { filter: `id=eq.${form.property_id}` }, token);
            setForm({ property_id: "", tax_year: String(new Date().getFullYear() + 1), assessed_value: "" });
            setShowAdd(false); load();
        } catch (e) { alert("Error saving revision: " + e.message); }
        setSaving(false);
    };

    const handleDelete = async (id, td) => {
        if (!window.confirm(`Delete assessment for TD ${td}?`)) return;
        try {
            await db.delete("assessments", { filter: `id=eq.${id}` }, token);
            if (historyId && list.filter(a => a.property_id === historyId).length <= 1) setHistoryId(null);
        } catch (e) { alert(e.message); }
    };

    const saveInlineEdit = async (historyRecord) => {
        if (!editForm.tax_year || !editForm.assessed_value) { alert("Tax year and Assessed Value cannot be empty."); return; }
        setSaving(true);
        try {
            const av = parseFloat(editForm.assessed_value); const ty = parseInt(editForm.tax_year);
            const basic = av * 0.01; const sef = av * 0.01;
            await db.update("assessments", { tax_year: ty, assessed_value: av, basic_tax: basic, sef_tax: sef }, { filter: `id=eq.${historyRecord.id}` }, token);
            const isLatest = historyRecord.id === historyData[0].id || ty >= historyData[0].tax_year;
            if (isLatest) await db.update("properties", { assessed_value: av }, { filter: `id=eq.${historyRecord.property_id}` }, token);
            setEditId(null); load();
        } catch (e) { alert("Error updating assessment: " + e.message); }
        setSaving(false);
    };

    const historyData = historyId ? list.filter(a => a.property_id === historyId) : [];

    // 🌟 DYNAMIC FILTERING LOGIC

    const filteredList = useMemo(() => {
    const uniqueList = list.filter((item, index, self) => index === self.findIndex((t) => t.property_id === item.property_id));
    
    if (!searchTerm) return uniqueList;
    
    const term = searchTerm.toLowerCase();
    return uniqueList.filter(a => {
        const taxpayer = a.properties?.taxpayers ? `${a.properties.taxpayers.lastname} ${a.properties.taxpayers.firstname}`.toLowerCase() : "";
        return (
            (a.properties?.property_index_no || "").toLowerCase().includes(term) ||
            (a.properties?.td_number || "").toLowerCase().includes(term) ||
            taxpayer.includes(term)
        );
    });
}, [list, searchTerm]);

    const handlePropSearch = (val) => {
        setPropSearch(val);
        const cleanVal = val.trim().toLowerCase();
        if (cleanVal.length > 0) {
            const exactMatch = properties.find(p =>
                (p.property_index_no && p.property_index_no.toLowerCase() === cleanVal) ||
                (p.td_number && p.td_number.toLowerCase() === cleanVal)
            );
            if (exactMatch) {
                setForm(f => ({ ...f, property_id: exactMatch.id }));
            }
        }
    };

    const filteredProps = useMemo(() => {
    if (!propSearch) return properties;
    const term = propSearch.toLowerCase();
    return properties.filter(p => (
        (p.property_index_no || "").toLowerCase().includes(term) ||
        (p.td_number || "").toLowerCase().includes(term) ||
        (p.taxpayers?.lastname || "").toLowerCase().includes(term) ||
        (p.taxpayers?.firstname || "").toLowerCase().includes(term)
    ));
}, [properties, propSearch]);
    return (
        <>
            <div className="topbar">
                <div className="topbar-left"><h1>Assessment Roll</h1><p>Determine property values, handle revisions, and compute standard RPT dues.</p></div>
                <div className="topbar-right">
                    {["admin", "assessor"].includes(profile?.role) && <button className="btn btn-primary" onClick={() => { setShowAdd(!showAdd); loadProperties(); }}>{showAdd ? "Cancel" : "📝 Add Revision"}</button>}
                </div>
            </div>

            <div className="page-body">
                {showAdd && (
                    <div className="panel" style={{ marginBottom: 16, borderTop: "4px solid var(--blue)" }}>
                        <div className="panel-title">Add Assessment Revision</div>
                        <form onSubmit={handleSaveRevision}>
                            <div className="form-grid" style={{ marginBottom: 20 }}>
                                <div className="form-group span2">
                                    <label className="form-label">Search & Select Target Property</label>
                                    <input
                                        type="text"
                                        placeholder="🔍 Type Exact PIN or TD No. to auto-select..."
                                        value={propSearch}
                                        onChange={e => handlePropSearch(e.target.value)}
                                        style={{ marginBottom: "6px", borderColor: "var(--blue)", fontWeight: "bold" }}
                                    />
                                    <select
                                        value={form.property_id}
                                        onChange={e => setForm({ ...form, property_id: e.target.value })}
                                        size={propSearch && !form.property_id ? 5 : undefined}
                                        required
                                        style={{ width: "100%", background: form.property_id ? "var(--bg3)" : "inherit" }}
                                    >
                                        <option value="">— Select Registered Property —</option>
                                        {filteredProps.map(p => (
                                            <option key={p.id} value={p.id}>
                                                PIN: {p.property_index_no || "—"} | TD: {p.td_number} | Owner: {p.taxpayers?.lastname}, {p.taxpayers?.firstname}
                                            </option>
                                        ))}
                                    </select>
                                    {propSearch && filteredProps.length === 0 && (
                                        <div style={{ fontSize: "11px", color: "var(--red)", marginTop: "4px" }}>No properties found matching "{propSearch}"</div>
                                    )}
                                </div>

                                <div className="form-group"><label className="form-label">Tax Year</label><input type="number" value={form.tax_year} onChange={e => setForm({ ...form, tax_year: e.target.value })} required /></div>
                                <div className="form-group"><label className="form-label">Assessed Value (₱)</label><input type="number" step="0.01" value={form.assessed_value} onChange={e => setForm({ ...form, assessed_value: e.target.value })} required placeholder="e.g. 150000" /></div>
                            </div>
                            <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? "Saving..." : "💾 Save Revision"}</button>
                        </form>
                    </div>
                )}

                {historyId && historyData.length > 0 && (
                    <div className="card" style={{ marginBottom: 20, borderTop: "4px solid var(--gold)" }}>

                        {/* 🌟 UPDATED TIMELINE HEADER WITH ADD REVISION BUTTON */}
                        <div className="card-header" style={{ background: "var(--bg2)", display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                            <div>
                                <div className="card-title">Revision History Timeline</div>
                                <div className="card-sub" style={{ color: "var(--text2)", marginTop: 4 }}>
                                    <strong>TD No:</strong> {historyData[0]?.properties?.td_number} &nbsp;|&nbsp;
                                    <strong>Taxpayer:</strong> {historyData[0]?.properties?.taxpayers?.lastname}, {historyData[0]?.properties?.taxpayers?.firstname}
                                </div>
                            </div>
                            <div style={{ display: "flex", gap: "8px" }}>
                                {["admin", "assessor"].includes(profile?.role) && (
                                    <button
                                        className="btn btn-primary btn-sm"
                                        onClick={() => {
                                            setShowAdd(true);
                                            loadProperties();
                                            setForm(f => ({ ...f, property_id: historyId })); // Pre-selects the property
                                            window.scrollTo({ top: 0, behavior: 'smooth' });  // Scrolls up to the form
                                        }}
                                    >
                                        📝 Add Revision
                                    </button>
                                )}
                                <button className="btn btn-outline btn-sm" onClick={() => { setHistoryId(null); setEditId(null); }}>✕ Close</button>
                            </div>
                        </div>

                        <div className="table-wrap">
                            <table>
                                <thead><tr><th>Tax Year</th><th>Assessed Value</th><th>Basic Tax</th><th>SEF Tax</th><th style={{ textAlign: "right" }}>Actions</th></tr></thead>
                                <tbody>
                                    {historyData.map((h, index) => {
                                        const isEditing = editId === h.id;
                                        return isEditing ? (
                                            <tr key={h.id} style={{ background: "rgba(59, 130, 246, 0.1)" }}>
                                                <td><input type="number" value={editForm.tax_year} onChange={e => setEditForm({ ...editForm, tax_year: e.target.value })} style={{ width: "80px", padding: "6px" }} /></td>
                                                <td><input type="number" step="0.01" value={editForm.assessed_value} onChange={e => setEditForm({ ...editForm, assessed_value: e.target.value })} style={{ width: "120px", padding: "6px" }} /></td>
                                                <td colSpan="2" style={{ fontSize: 11, color: "var(--text3)", verticalAlign: "middle" }}><i>Will auto-compute.</i></td>
                                                <td style={{ textAlign: "right" }}>
                                                    <button className="btn btn-success btn-xs" style={{ marginRight: "6px" }} onClick={() => saveInlineEdit(h)} disabled={saving}>💾 Save</button>
                                                    <button className="btn btn-ghost btn-xs" onClick={() => setEditId(null)}>Cancel</button>
                                                </td>
                                            </tr>
                                        ) : (
                                            <tr key={h.id} style={{ background: index === 0 ? "rgba(59, 130, 246, 0.05)" : "transparent" }}>
                                                <td><span className="chip" style={index === 0 ? { background: "var(--blue)", color: "white", borderColor: "var(--blue)" } : {}}>{h.tax_year} {index === 0 && "(Latest)"}</span></td>
                                                <td><span className="mono" style={index === 0 ? { fontWeight: "bold" } : {}}>{fmt(h.assessed_value)}</span></td>
                                                <td><span className="mono" style={{ color: "var(--text2)" }}>{fmt(h.basic_tax)}</span></td>
                                                <td><span className="mono" style={{ color: "var(--text2)" }}>{fmt(h.sef_tax)}</span></td>
                                                <td style={{ textAlign: "right" }}>
                                                    {["admin", "assessor"].includes(profile?.role) && (
                                                        <>
                                                            <button className="btn btn-ghost btn-xs" style={{ color: "var(--blue2)", marginRight: "8px" }} onClick={() => { setEditId(h.id); setEditForm({ tax_year: h.tax_year, assessed_value: h.assessed_value }); }}>✏️ Edit</button>
                                                            <button className="btn btn-ghost btn-xs" style={{ color: "var(--red2)" }} onClick={() => handleDelete(h.id, h.properties?.td_number)}>✕ Delete</button>
                                                        </>
                                                    )}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                <div className="card">
                    {/* 🌟 Dynamic Account Count */}
                    <div className="card-header"><div className="card-title">Property Accounts Ledger</div><span className="chip">{filteredList.length} properties</span></div>

                    {/* 🌟 DYNAMIC SEARCH BAR */}
                    <div className="searchbar" style={{ padding: "16px", borderBottom: "1px solid var(--border)", background: "var(--bg2)", display: "flex", gap: "10px" }}>
                        <input
                            placeholder="Type Taxpayer Name, Code, PIN, or TD No..."
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)} // Filters instantly as you type
                            style={{ flex: 1 }}
                        />
                        {searchTerm && (
                            <button className="btn btn-outline" onClick={() => setSearchTerm("")}>✕ Clear</button>
                        )}
                    </div>

                    {loading ? (
                        <div className="loading-state"><span className="spin" />Loading accounts…</div>
                    ) : filteredList.length === 0 ? (
                        <div className="empty"><div className="empty-icon">⬡</div><div className="empty-text">No property accounts matched your search.</div></div>
                    ) : (
                        <div className="table-wrap">
                            <table>
                                <thead><tr><th>TD No. / PIN</th><th>Taxpayer</th><th>Latest Tax Year</th><th>Current Assessed Value</th><th>Current Total Tax</th><th style={{ textAlign: "right" }}>Actions</th></tr></thead>
                                <tbody>
                                    {/* 🌟 Maps through the live filtered list instead of uniqueList */}
                                    {filteredList.map(a => (
                                        <tr key={a.property_id} style={historyId === a.property_id ? { background: "var(--bg3)" } : {}}>
                                            <td>
                                                <span className="badge badge-blue">{a.properties?.td_number || "—"}</span>
                                                <div style={{ fontSize: 10, color: "var(--blue2)", marginTop: 4, fontWeight: "bold" }}>PIN: {a.properties?.property_index_no || "—"}</div>
                                            </td>
                                            <td style={{ fontWeight: 600 }}>{a.properties?.taxpayers ? `${a.properties.taxpayers.lastname}, ${a.properties.taxpayers.firstname}` : "—"}</td>
                                            <td><span className="chip">{a.tax_year}</span></td>
                                            <td><span className="mono">{fmt(a.assessed_value)}</span></td>
                                            <td><span className="mono" style={{ fontWeight: 700, color: "var(--green2)" }}>{fmt((parseFloat(a.basic_tax) || 0) + (parseFloat(a.sef_tax) || 0))}</span></td>
                                            <td style={{ textAlign: "right" }}>
                                                <button className="btn btn-ghost btn-xs" style={{ marginRight: "8px", color: "var(--blue2)", fontWeight: "bold" }} onClick={() => { setHistoryId(a.property_id); setEditId(null); window.scrollTo(0, 0); }}>🕒 Timeline History</button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>
        </>
    );
}