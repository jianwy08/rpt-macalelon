import { useState, useEffect, useCallback } from "react";
import { db, fmt } from "../utils/db";
import PrintableReceipt from "../components/PrintableReceipt";

export default function Receipts({ token, profile }) {
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [deleting, setDeleting] = useState(false);
  const [q, setQ] = useState("");
  const PER = 25;
  const [printData, setPrintData] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      let filterStr = "";

      if (q) {
        // 1. Search by PIN or TD No
        const props = await db.select("properties", { filter: `or=(property_index_no.ilike.*${q}*,td_number.ilike.*${q}*)`, select: "id" }, token);
        const propIds = props.map(p => p.id);

        // 2. Search by Owner Name
        const tps = await db.select("taxpayers", { filter: `or=(lastname.ilike.*${q}*,firstname.ilike.*${q}*)`, select: "id" }, token);
        const tpIds = tps.map(t => t.id);

        let orConditions = [`or_number.ilike.*${q}*`, `paid_by.ilike.*${q}*`];
        if (propIds.length > 0) orConditions.push(`property_id.in.(${propIds.join(',')})`);
        if (tpIds.length > 0) orConditions.push(`taxpayer_id.in.(${tpIds.join(',')})`);

        filterStr = `or=(${orConditions.join(',')})`;
      }

      const d = await db.select("collections", {
        select: "id,or_number,payment_date,total_paid,basic_tax,sef_tax,penalty,discount,quarter,payment_method,tax_year,is_voided,paid_by,taxpayers(lastname,firstname),properties(property_index_no,td_number,barangay,assessed_value)",
        filter: filterStr,
        order: "created_at.desc", limit: PER, offset: page * PER,
      }, token);
      setList(d || []);
    } catch (e) { console.error(e); }
    setLoading(false);
  }, [token, page, q]);

  // ✅ New code (Tells the linter to ignore this specific line)
useEffect(() => { 
    // eslint-disable-next-line
    load(); 
}, [load]);

  const handleDelete = async (rec) => {
    if (!window.confirm(`Permanently delete Receipt ${rec.or_number}? This cannot be undone.`)) return;
    setDeleting(true);
    try {
      try { await db.delete("official_receipts", { filter: `collection_id=eq.${rec.id}` }, token); } catch (e) {console.error(e) }
      await db.delete("collections", { filter: `or_number=eq.${rec.or_number}` }, token);
      load();
    } catch (e) { alert("Failed to delete receipt: " + e.message); }
    setDeleting(false);
  };
  // ✅ REPLACED GROUPING LOGIC & NEW PRINT FUNCTION
  const groupedList = Object.values(list.reduce((acc, c) => {
    if (!acc[c.or_number]) {
      acc[c.or_number] = { 
        ...c, sum_total: 0, sum_basic: 0, sum_sef: 0, sum_pen: 0, sum_disc: 0, 
        minYear: parseInt(c.tax_year), maxYear: parseInt(c.tax_year), cart: [] 
      };
    }
    acc[c.or_number].sum_total += parseFloat(c.total_paid) || 0;
    acc[c.or_number].sum_basic += parseFloat(c.basic_tax) || 0;
    acc[c.or_number].sum_sef += parseFloat(c.sef_tax) || 0;
    acc[c.or_number].sum_pen += parseFloat(c.penalty) || 0;
    acc[c.or_number].sum_disc += parseFloat(c.discount) || 0;
    acc[c.or_number].minYear = Math.min(acc[c.or_number].minYear, parseInt(c.tax_year));
    acc[c.or_number].maxYear = Math.max(acc[c.or_number].maxYear, parseInt(c.tax_year));
    
    // Add each quarter row to the cart for the printer
    acc[c.or_number].cart.push({
        year: c.tax_year,
        quarterTag: c.quarter || "FULL",
        basic: parseFloat(c.basic_tax) || 0,
        sef: parseFloat(c.sef_tax) || 0,
        pen: parseFloat(c.penalty) || 0,
        disc: parseFloat(c.discount) || 0
    });
    return acc;
  }, {}));

  // ✅ NEW FUNCTION: Prepares the data and opens the print window
  const handleReprint = (rec) => {
    setPrintData({
      or_number: rec.or_number,
      payment_date: rec.payment_date,
      paid_by: rec.paid_by || "UNKNOWN",
      total_paid: rec.sum_total,
      basic_tax: rec.sum_basic,
      sef_tax: rec.sum_sef,
      penalty: rec.sum_pen,
      discount: rec.sum_disc,
      taxpayer: rec.taxpayers || {},
      properties: [rec.properties || {}],
      cart: rec.cart
    });
    
    // Wait a millisecond for React to update the state, then print!
    setTimeout(() => { window.print(); }, 100);
  };
  

  return (
    <>
      <div className="topbar"><div className="topbar-left"><h1>Official Receipts</h1><p>OR REGISTER & LEDGER</p></div></div>
      <div className="page-body">
        <div className="card">
          <div className="card-header"><div className="card-title">OR Register</div></div>

          {/* 🌟 SEARCH BAR */}
          <div className="searchbar" style={{ padding: "16px", borderBottom: "1px solid var(--border)", background: "var(--bg2)" }}>
            <input
              placeholder="Search by OR Number, Name of Payor/Owner, PIN, or TD No..."
              value={q}
              onChange={e => setQ(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') { setPage(0); load(); } }}
              style={{ flex: 1 }}
            />
            <button className="btn btn-outline" onClick={() => { setPage(0); load(); }}>🔍 Search</button>
          </div>

          {loading
            ? <div className="loading-state"><span className="spin" />Loading receipts…</div>
            : list.length === 0
              ? <div className="empty"><div className="empty-icon">🧾</div><div className="empty-text">No receipts matched your search.</div></div>
              : <div className="table-wrap">
                    <table>
                        <thead>
                        <tr>
                            <th>OR Number</th>
                            <th>Date</th>
                            <th>Taxpayer / Payor</th>
                            <th>PIN</th>
                            <th>Year(s)</th>
                            <th>Basic</th>
                            <th>SEF</th>
                            <th>Total</th>
                            <th>Method</th>
                            <th>Status</th> {/* 👈 Restored Status Header */}
                            <th style={{ minWidth: "90px", textAlign: "right" }}>Actions</th>
                        </tr>
                        </thead>
                        <tbody>
                        {groupedList.map((c, i) => (
                            <tr key={i}>
                            <td><span className="badge badge-blue">{c.or_number}</span></td>
                            <td><span className="mono-sm">{c.payment_date}</span></td>
                            <td style={{ fontWeight: 600, fontSize: 13 }}>
                                {c.taxpayers ? `${c.taxpayers.lastname}, ${c.taxpayers.firstname}` : "—"}
                                {c.paid_by && (<div style={{ fontSize: 10, color: "var(--text3)", marginTop: 2, fontWeight: "normal" }}>Paid by: {c.paid_by}</div>)}
                            </td>
                            <td><span className="mono-sm" style={{ color: "var(--blue2)", fontWeight: "bold" }}>{c.properties?.property_index_no || "—"}</span></td>
                            <td><span className="chip">{c.minYear === c.maxYear ? c.minYear : `${c.minYear}-${c.maxYear}`}</span></td>
                            <td><span className="mono">{fmt(c.sum_basic)}</span></td>
                            <td><span className="mono">{fmt(c.sum_sef)}</span></td>
                            <td><span className="mono" style={{ color: "var(--green2)", fontWeight: 700 }}>{fmt(c.sum_total)}</span></td>
                            <td><span className="chip">{c.payment_method}</span></td>
                            
                            {/* 👈 Restored Status Column! */}
                            <td><span className={`badge ${c.is_voided ? "badge-red" : "badge-green"}`}>{c.is_voided ? "VOIDED" : "VALID"}</span></td>
                            
                            {/* 🖨️ The Actions Column */}
                            <td style={{ textAlign: "right" }}>
                                <button 
                                    className="btn btn-ghost btn-xs" 
                                    style={{ fontSize: "16px", cursor: "pointer", marginRight: "10px" }} 
                                    onClick={() => handleReprint(c)}
                                    title="Reprint AF 56"
                                >
                                    🖨️
                                </button>
                                
                                {["admin", "treasurer"].includes(profile?.role) && (
                                    <button className="btn btn-ghost btn-xs" style={{ color: "var(--red2)", fontSize: "14px" }} onClick={() => handleDelete(c)} disabled={deleting}>✕</button>
                                )}
                            </td>
                            </tr>
                        ))}
                        </tbody>
                    </table>
                    </div>
          }
          <div className="pagination">
            <span className="pg-info">Page {page + 1} · {list.length} record(s)</span>
            <div className="pg-btns">
              <button className="pg-btn" onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0}>← Prev</button>
              <button className="pg-btn" onClick={() => setPage(p => p + 1)} disabled={list.length < PER}>Next →</button>
            </div>
          </div>
        </div>
      </div>
      <div className="print-only">
        <PrintableReceipt data={printData} />
      </div>
    </>
  );
}