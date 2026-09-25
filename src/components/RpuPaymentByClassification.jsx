import { useState, useEffect, useMemo } from "react";
import { db, fmt, today } from "../utils/db";

export default function RpuPaymentByClassification({ token }) {
    const [loading, setLoading] = useState(false);
    const [collections, setCollections] = useState([]);
    const [properties, setProperties] = useState([]);
    const [taxpayers, setTaxpayers] = useState([]);
    
    // Date filters (defaults to current year)
    const currentYear = new Date().getFullYear();
    const [startDate, setStartDate] = useState(`${currentYear}-01-01`);
    const [endDate, setEndDate] = useState(today());
    const [selectedClassification, setSelectedClassification] = useState("ALL");
    const [viewMode, setViewMode] = useState("summary"); // 'summary' or 'detailed'

    const fetchReportData = async () => {
        setLoading(true);
        try {
            // 1. Fetch non-voided collections within the date range
            const colData = await db.select("collections", {
                filter: `is_voided=eq.false&payment_date=gte.${startDate}&payment_date=lte.${endDate}`,
                order: "payment_date.desc"
            }, token);

            // 2. Fetch all properties and taxpayers to match metadata
            const propData = await db.select("properties", {}, token);
            const tpData = await db.select("taxpayers", {}, token);

            setCollections(Array.isArray(colData) ? colData : []);
            setProperties(Array.isArray(propData) ? propData : []);
            setTaxpayers(Array.isArray(tpData) ? tpData : []);
        } catch (err) {
            console.error("Failed to load report data:", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchReportData();
    }, [startDate, endDate]);

    // Merge collections with property and taxpayer info
    const enrichedRecords = useMemo(() => {
        const propMap = new Map(properties.map(p => [p.id, p]));
        const tpMap = new Map(taxpayers.map(t => [t.id, t]));

        return collections.map(col => {
            const prop = propMap.get(col.property_id) || {};
            const tp = tpMap.get(col.taxpayer_id) || {};
            return {
                ...col,
                td_number: prop.td_number || "—",
                pin: prop.property_index_no || "—",
                classification: (prop.classification || "UNCLASSIFIED").toUpperCase(),
                barangay: prop.barangay || "—",
                assessed_value: parseFloat(prop.assessed_value) || 0,
                owner_name: tp.lastname ? `${tp.lastname}, ${tp.firstname}` : (col.paid_by || "—")
            };
        });
    }, [collections, properties, taxpayers]);

    // Grouping by Classification for Summary Table
    const classificationSummary = useMemo(() => {
        const summary = {};

        enrichedRecords.forEach(rec => {
            const cls = rec.classification;
            if (!summary[cls]) {
                summary[cls] = {
                    classification: cls,
                    uniqueProperties: new Set(),
                    totalTransactions: 0,
                    basic: 0,
                    sef: 0,
                    penalty: 0,
                    discount: 0,
                    total: 0
                };
            }
            summary[cls].uniqueProperties.add(rec.property_id);
            summary[cls].totalTransactions += 1;
            summary[cls].basic += parseFloat(rec.basic_tax) || 0;
            summary[cls].sef += parseFloat(rec.sef_tax) || 0;
            summary[cls].penalty += parseFloat(rec.penalty) || 0;
            summary[cls].discount += parseFloat(rec.discount) || 0;
            summary[cls].total += parseFloat(rec.total_paid) || 0;
        });

        return Object.values(summary).sort((a, b) => b.total - a.total);
    }, [enrichedRecords]);

    // Grand totals
    const grandTotals = useMemo(() => {
        const uniqueProps = new Set(enrichedRecords.map(r => r.property_id));
        return {
            rpuCount: uniqueProps.size,
            transactions: enrichedRecords.length,
            basic: enrichedRecords.reduce((acc, r) => acc + (parseFloat(r.basic_tax) || 0), 0),
            sef: enrichedRecords.reduce((acc, r) => acc + (parseFloat(r.sef_tax) || 0), 0),
            penalty: enrichedRecords.reduce((acc, r) => acc + (parseFloat(r.penalty) || 0), 0),
            discount: enrichedRecords.reduce((acc, r) => acc + (parseFloat(r.discount) || 0), 0),
            total: enrichedRecords.reduce((acc, r) => acc + (parseFloat(r.total_paid) || 0), 0)
        };
    }, [enrichedRecords]);

    // Filtered detailed records
    const filteredDetailedRecords = useMemo(() => {
        if (selectedClassification === "ALL") return enrichedRecords;
        return enrichedRecords.filter(r => r.classification === selectedClassification);
    }, [enrichedRecords, selectedClassification]);

    return (
        <div className="panel" style={{ marginTop: "16px" }}>
            <div className="no-print" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "10px", marginBottom: "16px" }}>
                <div>
                    <h2 style={{ fontSize: "18px", fontWeight: "bold", margin: 0 }}>RPU Collections by Classification</h2>
                    <p style={{ fontSize: "12px", color: "var(--text3)", margin: "4px 0 0" }}>Breakdown of collected Real Property Units categorized by land and building use</p>
                </div>
                <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                    <button className={`btn btn-sm ${viewMode === "summary" ? "btn-primary" : "btn-outline"}`} onClick={() => setViewMode("summary")}>Summary</button>
                    <button className={`btn btn-sm ${viewMode === "detailed" ? "btn-primary" : "btn-outline"}`} onClick={() => setViewMode("detailed")}>Detailed RPUs</button>
                    <button className="btn btn-outline btn-sm" onClick={() => window.print()}>🖨 Print Report</button>
                </div>
            </div>

            {/* Filter Bar */}
            <div className="no-print" style={{ display: "flex", gap: "12px", background: "var(--bg2)", padding: "12px", borderRadius: "8px", marginBottom: "16px", flexWrap: "wrap" }}>
                <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                    <label style={{ fontSize: "11px", fontWeight: "bold" }}>From Date</label>
                    <input type="date" className="input" value={startDate} onChange={e => setStartDate(e.target.value)} style={{ padding: "6px" }} />
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                    <label style={{ fontSize: "11px", fontWeight: "bold" }}>To Date</label>
                    <input type="date" className="input" value={endDate} onChange={e => setEndDate(e.target.value)} max={today()} style={{ padding: "6px" }} />
                </div>
                {viewMode === "detailed" && (
                    <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                        <label style={{ fontSize: "11px", fontWeight: "bold" }}>Filter Classification</label>
                        <select className="input" value={selectedClassification} onChange={e => setSelectedClassification(e.target.value)} style={{ padding: "6px" }}>
                            <option value="ALL">All Classifications</option>
                            {classificationSummary.map(c => (
                                <option key={c.classification} value={c.classification}>{c.classification}</option>
                            ))}
                        </select>
                    </div>
                )}
            </div>

            {/* Print Header */}
            <div className="print-only" style={{ textAlign: "center", marginBottom: "20px", display: "none" }}>
                <h3 style={{ margin: 0 }}>MUNICIPALITY OF MACALELON</h3>
                <h4 style={{ margin: "4px 0" }}>Office of the Municipal Treasurer</h4>
                <h2 style={{ margin: "8px 0" }}>RPU COLLECTIONS REPORT BY CLASSIFICATION</h2>
                <p style={{ fontSize: "12px", margin: 0 }}>Period Covered: {startDate} to {endDate}</p>
            </div>

            {loading ? (
                <div style={{ textAlign: "center", padding: "30px", color: "var(--text3)" }}>Loading classification report...</div>
            ) : viewMode === "summary" ? (
                /* SUMMARY TABLE */
                <div className="table-wrap">
                    <table style={{ width: "100%", fontSize: "12px" }}>
                        <thead>
                            <tr style={{ background: "var(--bg3)", textAlign: "right" }}>
                                <th style={{ textAlign: "left" }}>Classification</th>
                                <th>RPU Count (Properties)</th>
                                <th>ORs Issued</th>
                                <th>Basic Tax</th>
                                <th>SEF</th>
                                <th>Penalties</th>
                                <th>Discounts</th>
                                <th>Total Collected</th>
                            </tr>
                        </thead>
                        <tbody>
                            {classificationSummary.length === 0 ? (
                                <tr><td colSpan="8" style={{ textAlign: "center", padding: "16px" }}>No paid collections recorded in this period.</td></tr>
                            ) : (
                                classificationSummary.map(row => (
                                    <tr key={row.classification} style={{ textAlign: "right", borderBottom: "1px solid var(--border)" }}>
                                        <td style={{ textAlign: "left", fontWeight: "bold" }}>
                                            <span className="badge badge-blue">{row.classification}</span>
                                        </td>
                                        <td style={{ fontWeight: 600 }}>{row.uniqueProperties.size}</td>
                                        <td>{row.totalTransactions}</td>
                                        <td style={{ fontFamily: "monospace" }}>{fmt(row.basic)}</td>
                                        <td style={{ fontFamily: "monospace" }}>{fmt(row.sef)}</td>
                                        <td style={{ fontFamily: "monospace", color: row.penalty > 0 ? "var(--red2)" : "inherit" }}>
                                            {row.penalty > 0 ? `+${fmt(row.penalty)}` : "0.00"}
                                        </td>
                                        <td style={{ fontFamily: "monospace", color: row.discount > 0 ? "var(--green2)" : "inherit" }}>
                                            {row.discount > 0 ? `-${fmt(row.discount)}` : "0.00"}
                                        </td>
                                        <td style={{ fontFamily: "monospace", fontWeight: "bold" }}>{fmt(row.total)}</td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                        {classificationSummary.length > 0 && (
                            <tfoot>
                                <tr style={{ background: "var(--bg2)", fontWeight: "bold", textAlign: "right" }}>
                                    <td style={{ textAlign: "left" }}>TOTAL</td>
                                    <td>{grandTotals.rpuCount} RPUs</td>
                                    <td>{grandTotals.transactions}</td>
                                    <td style={{ fontFamily: "monospace" }}>{fmt(grandTotals.basic)}</td>
                                    <td style={{ fontFamily: "monospace" }}>{fmt(grandTotals.sef)}</td>
                                    <td style={{ fontFamily: "monospace", color: "var(--red2)" }}>+{fmt(grandTotals.penalty)}</td>
                                    <td style={{ fontFamily: "monospace", color: "var(--green2)" }}>-{fmt(grandTotals.discount)}</td>
                                    <td style={{ fontFamily: "monospace", fontSize: "14px", color: "var(--blue2)" }}>{fmt(grandTotals.total)}</td>
                                </tr>
                            </tfoot>
                        )}
                    </table>
                </div>
            ) : (
                /* DETAILED RPU VIEW */
                <div className="table-wrap">
                    <table style={{ width: "100%", fontSize: "11px" }}>
                        <thead>
                            <tr style={{ background: "var(--bg3)" }}>
                                <th>Date</th>
                                <th>OR No.</th>
                                <th>TD Number</th>
                                <th>PIN</th>
                                <th>Owner / Payor</th>
                                <th>Class</th>
                                <th>Year/Qtr</th>
                                <th style={{ textAlign: "right" }}>Total Paid</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredDetailedRecords.length === 0 ? (
                                <tr><td colSpan="8" style={{ textAlign: "center", padding: "16px" }}>No matching RPUs found.</td></tr>
                            ) : (
                                filteredDetailedRecords.map(item => (
                                    <tr key={item.id} style={{ borderBottom: "1px solid var(--border)" }}>
                                        <td>{item.payment_date}</td>
                                        <td style={{ fontWeight: "bold" }}>{item.or_number}</td>
                                        <td>{item.td_number}</td>
                                        <td style={{ fontFamily: "monospace" }}>{item.pin}</td>
                                        <td>{item.owner_name}</td>
                                        <td><span className="badge badge-blue">{item.classification}</span></td>
                                        <td>{item.tax_year} ({item.quarter || "FULL"})</td>
                                        <td style={{ textAlign: "right", fontFamily: "monospace", fontWeight: "bold" }}>{fmt(item.total_paid)}</td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}