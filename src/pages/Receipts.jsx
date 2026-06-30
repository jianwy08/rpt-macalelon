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
    
    // Holds the data for the AF-56 form
    const [printData, setPrintData] = useState(null);

    const load = useCallback(async () => {
        setLoading(true);
        try {
            let filterStr = "";

            if (q) {
                const props = await db.select("properties", { filter: `or=(property_index_no.ilike.*${q}*,td_number.ilike.*${q}*)`, select: "id" }, token);
                const propIds = props.map(p => p.id);

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

    // 🌟 FIX 1: RESTORED THE MISSING LOADER
    // This stops the infinite spinning!
    useEffect(() => { 
        load(); 
        // eslint-disable-next-line
    }, [load]);

    // 🌟 THE PRINTER ENGINE
    useEffect(() => {
        if (printData) {
            const timer = setTimeout(() => {
                window.print();
                // Let the receipt stay on the hidden screen so the printer can actually read it.
            }, 500);
            return () => clearTimeout(timer);
        }
    }, [printData]);

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

    // Safely group the data
    const safeList = Array.isArray(list) ? list : [];
    const groupedList = Object.values(safeList.reduce((acc, c) => {
        if (!acc[c.or_number]) {
            acc[c.or_number] = { 
                ...c, sum_total: 0, sum_basic: 0, sum_sef: 0, sum_pen: 0, sum_disc: 0, 
                minYear: parseInt(c.tax_year), maxYear: parseInt(c.tax_year), rawItems: [] 
            };
        }
        acc[c.or_number].sum_total += parseFloat(c.total_paid) || 0;
        acc[c.or_number].sum_basic += parseFloat(c.basic_tax) || 0;
        acc[c.or_number].sum_sef += parseFloat(c.sef_tax) || 0;
        acc[c.or_number].sum_pen += parseFloat(c.penalty) || 0;
        acc[c.or_number].sum_disc += parseFloat(c.discount) || 0;
        acc[c.or_number].minYear = Math.min(acc[c.or_number].minYear, parseInt(c.tax_year));
        acc[c.or_number].maxYear = Math.max(acc[c.or_number].maxYear, parseInt(c.tax_year));
        
        acc[c.or_number].rawItems.push(c);
        return acc;
    }, {}));

    const handleReprint = (rec) => {
        const finalCart = [];
        const bucketAbove2002 = { years: [], basic: 0, sef: 0, pen: 0, disc: 0 };

        rec.rawItems.forEach(item => {
            const year = parseInt(item.tax_year);
            if (year >= 2002) {
                bucketAbove2002.years.push(year);
                bucketAbove2002.basic += parseFloat(item.basic_tax) || 0;
                bucketAbove2002.sef += parseFloat(item.sef_tax) || 0;
                bucketAbove2002.pen += parseFloat(item.penalty) || 0;
                bucketAbove2002.disc += parseFloat(item.discount) || 0;
            }
        });

        // 🌟 DIVIDED PENALTY AND DISCOUNT LOGIC
        const addRow = (year, quarter, basic, sef, totalPen, totalDisc) => {
            const totalTax = basic + sef;
            
            // Calculate what percentage of the total tax is Basic vs SEF
            // (Defaults to 50/50 if taxes are somehow 0)
            const basicRatio = totalTax > 0 ? (basic / totalTax) : 0.5;

            // Split the penalty
            const penBasic = totalPen * basicRatio;
            const penSef = totalPen - penBasic; // Subtraction prevents decimal rounding errors

            // Split the discount
            const discBasic = totalDisc * basicRatio;
            const discSef = totalDisc - discBasic; 

            finalCart.push({ year, quarterTag: quarter, type: 'BASIC', val: basic, pen: penBasic, disc: discBasic });
            finalCart.push({ year, quarterTag: quarter, type: 'SEF', val: sef, pen: penSef, disc: discSef });
        };

        rec.rawItems.forEach(item => {
            if (parseInt(item.tax_year) <= 2001) {
                addRow(`${item.tax_year}`, item.quarter || "FULL", parseFloat(item.basic_tax), parseFloat(item.sef_tax), parseFloat(item.penalty), parseFloat(item.discount));
            }
        });

        if (bucketAbove2002.years.length > 0) {
            let min = Math.min(...bucketAbove2002.years);
            let max = Math.max(...bucketAbove2002.years);
            let label = min === max ? `${min}` : `${min}-${max}`;
            addRow(label, "FULL", bucketAbove2002.basic, bucketAbove2002.sef, bucketAbove2002.pen, bucketAbove2002.disc);
        }

        finalCart.sort((a, b) => parseInt(a.year.substring(0,4)) - parseInt(b.year.substring(0,4)));

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
            cart: finalCart
        });
    };
    
    return (
        <>
            {/* The Main Application UI */}
            <div className="no-print">
                <div className="topbar">
                    <div className="topbar-left">
                        <h1>Official Receipts</h1>
                        <p>OR REGISTER & LEDGER</p>
                    </div>
                </div>
                
                <div className="page-body">
                    <div className="card">
                        <div className="card-header"><div className="card-title">OR Register</div></div>

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
                            : groupedList.length === 0
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
                                            <th>Status</th>
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
                                            <td><span className={`badge ${c.is_voided ? "badge-red" : "badge-green"}`}>{c.is_voided ? "VOIDED" : "VALID"}</span></td>
                                            
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
                            <span className="pg-info">Page {page + 1} · {groupedList.length} record(s)</span>
                            <div className="pg-btns">
                                <button className="pg-btn" onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0}>← Prev</button>
                                <button className="pg-btn" onClick={() => setPage(p => p + 1)} disabled={list.length < PER}>Next →</button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* The Invisible Print Template */}
            {printData && (
                <div id="printable-receipt" className="print-only">
                    <PrintableReceipt data={printData} />
                </div>
            )}
        </>
    );
}