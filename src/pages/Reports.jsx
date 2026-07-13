import { useState, useEffect } from "react";
import { db } from "../utils/db";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, BarChart, CartesianGrid, Bar, XAxis, YAxis } from "recharts";
import RCDForm from "../components/RCDForm";

export default function Reports({ token, profile }) {
  const getToday = () => {
    try { return new Date().toISOString().split('T')[0]; }
    catch (e) { console.error(e); return "2024-01-01"; }
  };

  const [tab, setTab] = useState("daily");
  const [date, setDate] = useState(getToday());
  const [data, setData] = useState([]);

  const [barangayData, setBarangayData] = useState([]);
  const [classData, setClassData] = useState([]);

  // States for the Provincial Ledger
  const [selectedBrgy, setSelectedBrgy] = useState("ALL");
  const [ledgerView, setLedgerView] = useState("SUMMARY"); 
  const [yearFilter, setYearFilter] = useState("ALL"); 

  // 🌟 States for RCD Form
  const [selectedFund, setSelectedFund] = useState("General Fund"); 
  const [reportNo, setReportNo] = useState("");
  const [afList, setAfList] = useState([]); 
  const [cashierList, setCashierList] = useState([]); 
  const [selectedRcdCashier, setSelectedRcdCashier] = useState("ALL");

  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const fmt = (num) => {
    const n = parseFloat(num);
    return isNaN(n) ? "0.00" : n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const PIE_COLORS = ['var(--blue)', 'var(--green2)', 'var(--gold2)', 'var(--red2)', '#8b5cf6'];
  const barangays = [
    "AMONTAY", "ANOS", "BUYAO", "CALANTAS", "CANDANGAL", "LAHING",
    "LUCTOB", "MABINI IBABA", "MABINI ILAYA", "MALABAHAY", "MAMBOG",
    "OLONGTAO IBABA", "OLONGTAO ILAYA", "PADRE HERRERA", "PAJARILLO",
    "PINAGBAYANAN", "SAN ISIDRO", "SAN JOSE", "SAN NICOLAS", "SAN VICENTE",
    "TAGUIN", "TUBIGAN IBABA", "TUBIGAN ILAYA", "VISTA HERMOSA",
    "CASTILLO (POB.)", "DAMAYAN (POB.)", "MASIPAG (POB.)", "PAG-ASA (POB.)",
    "RIZAL (POB.)", "RODRIGUEZ (POB.)"
  ];

  useEffect(() => {
    let isMounted = true;

    const loadData = async () => {
      setLoading(true);
      try {
        if (tab === "analytics") {
          const p = await db.select("properties", { select: "barangay, classification", limit: 50000 }, token);
          const safeP = Array.isArray(p) ? p : [];

          const bCounts = {};
          const cCounts = {};

          safeP.forEach(curr => {
            const brgy = (curr && curr.barangay) ? String(curr.barangay).trim().toUpperCase() : "UNSPECIFIED";
            const cls = (curr && curr.classification) ? String(curr.classification).trim() : "Unclassified";
            bCounts[brgy] = (bCounts[brgy] || 0) + 1;
            cCounts[cls] = (cCounts[cls] || 0) + 1;
          });

          const bFormatted = Object.keys(bCounts).map(name => ({ name: name, count: bCounts[name] })).sort((a, b) => b.count - a.count);
          const cFormatted = Object.keys(cCounts).map(name => ({ name: name, count: cCounts[name] })).sort((a, b) => b.count - a.count);

          if (isMounted) {
            setBarangayData(bFormatted);
            setClassData(cFormatted);
            setLoading(false);
          }
          return;
        }

        if (tab === "provincial") {
          const propsData = await db.select("properties", { select: "*, taxpayers(*)" }, token);
          const delinqData = await db.select("delinquency", { filter: "status=eq.UNPAID", select: "*" }, token);
          const asmtData = await db.select("assessments", { select: "property_id, tax_year, assessed_value", order: "tax_year.desc" }, token);

          const safeProps = Array.isArray(propsData) ? propsData : [];
          const safeDelinqs = Array.isArray(delinqData) ? delinqData : [];
          const safeAsmts = Array.isArray(asmtData) ? asmtData : [];

          const enrichedProps = safeProps.map(p => {
            return {
              ...p,
              delinquency: safeDelinqs.filter(d => d.property_id === p.id),
              assessments: safeAsmts.filter(a => a.property_id === p.id)
            };
          });

          if (isMounted) { setData(enrichedProps); setLoading(false); }
          return;
        }

        if (tab === "delinq") {
          const d = await db.select("delinquency", { filter: "status=eq.UNPAID", select: "property_id,*,properties(td_number,property_index_no),taxpayers(lastname,firstname)", order: "months_delinquent.desc" }, token);
          if (isMounted) { setData(Array.isArray(d) ? d : []); setLoading(false); }
          return;
        }

        // 🌟 NEW: FETCH ALL CASHIERS FOR THE DROPDOWN
        const usersData = await db.select("user_profiles", { order: "full_name.asc" }, token);
        if (isMounted) setCashierList(Array.isArray(usersData) ? usersData : []);

        // 🌟 DETERMINE WHOSE RCD WE ARE PRINTING
        const activeCashier = usersData?.find(c => c.id === selectedRcdCashier);
        const officerNameStr = activeCashier ? activeCashier.full_name.toUpperCase() : (profile?.full_name || "").toUpperCase();

        // 🌟 FETCH AF56 BOOKLETS ONLY FOR THE SELECTED CASHIER
        if (tab === "rcd") {
          let afFilter = `officer_name=eq.${officerNameStr}`;
          if (selectedRcdCashier === "ALL") afFilter = ""; // Fetch all if generating a master report
          const afData = await db.select("accountable_forms", { filter: afFilter }, token);
          if (isMounted) setAfList(Array.isArray(afData) ? afData : []);
        }

        // 🌟 FETCH COLLECTIONS & FILTER BY SELECTED CASHIER
        const safeDateStr = String(date || getToday());
        let filter = (tab === "daily" || tab === "rcd")
          ? `payment_date=eq.${safeDateStr}`
          : `payment_date=gte.${safeDateStr.slice(0, 7)}-01&payment_date=lte.${safeDateStr.slice(0, 7)}-31&is_voided=eq.false`;

        // Apply the specific cashier filter to the database query!
        if (tab === "rcd" && selectedRcdCashier !== "ALL") {
            filter += `&cashier_id=eq.${selectedRcdCashier}`;
        }

        const d = await db.select("collections", { filter, select: "id,*,taxpayers(lastname,firstname)", order: "created_at.asc" }, token);
        if (isMounted) { setData(Array.isArray(d) ? d : []); setLoading(false); }
        return;
      } catch (error) {
        console.error("Error loading reports:", error);
        if (isMounted) setLoading(false);
      }
    };

    // 🌟 FIXED: Load data for all tabs including RCD
    loadData();

    return () => { isMounted = false; };
  }, [tab, date, token, profile]);

  const handleDelete = async (item, type) => {
    if (!window.confirm(`Permanently delete this ${type} record?`)) return;
    setDeleting(true);
    try {
      if (type === "collection") {
        try { await db.delete("official_receipts", { filter: `or_number=eq.${item.or_number}` }, token); } catch (e) { console.error("Error deleting official receipt:", e); }
        await db.delete("collections", { filter: `or_number=eq.${item.or_number}` }, token);
      } else {
        await db.delete("delinquency", { filter: `id=eq.${item.id}` }, token);
      }
      setTab(tab + " "); setTimeout(() => setTab(tab.trim()), 10);
    } catch (e) { alert("Delete failed: " + e.message); }
    setDeleting(false);
  };

  const safeData = Array.isArray(data) ? data : [];
  const safeClassData = Array.isArray(classData) ? classData : [];
  const safeBarangayData = Array.isArray(barangayData) ? barangayData : [];

  let sumBasic = 0; let sumSef = 0; let sumPen = 0; let sumTot = 0;
  let groupedData = [];

  // 🌟 FIXED: Apply collection grouping to RCD tab as well
  if (tab === "daily" || tab === "monthly" || tab === "rcd") {
    safeData.forEach(c => {
      // 🌟 Only add money if it is NOT voided
      if (c && !c.is_voided) {
        sumBasic += parseFloat(c.basic_tax) || 0;
        sumSef += parseFloat(c.sef_tax) || 0;
        sumPen += parseFloat(c.penalty) || 0;
        sumTot += parseFloat(c.total_paid) || 0;
      }
    });

    const acc = {};
    safeData.forEach(c => {
      if (!c || !c.or_number) return;
      const or_no = String(c.or_number);
      if (!acc[or_no]) {
        acc[or_no] = {
          ...c,
          sum_total: 0, sum_basic: 0, sum_sef: 0, sum_penalty: 0,
          minYear: parseInt(c.tax_year) || new Date().getFullYear(),
          maxYear: parseInt(c.tax_year) || new Date().getFullYear()
        };
      }
      // Add money to the group ONLY if not voided
      if (!c.is_voided) {
          acc[or_no].sum_total += parseFloat(c.total_paid) || 0;
          acc[or_no].sum_basic += parseFloat(c.basic_tax) || 0;
          acc[or_no].sum_sef += parseFloat(c.sef_tax) || 0;
          acc[or_no].sum_penalty += parseFloat(c.penalty) || 0;
      }
      const yr = parseInt(c.tax_year);
      if (!isNaN(yr)) {
        if (yr < acc[or_no].minYear) acc[or_no].minYear = yr;
        if (yr > acc[or_no].maxYear) acc[or_no].maxYear = yr;
      }
    });
    groupedData = Object.values(acc);
  }

  let groupedAging = [];
  let delinqGrandTotal = 0;
  if (tab === "delinq") {
    groupedAging = Object.values(safeData.reduce((acc, d) => {
      const pid = d.property_id;
      if (!acc[pid]) {
        acc[pid] = { ...d, minYear: parseInt(d.tax_year), maxYear: parseInt(d.tax_year), sum_base: 0, sum_int: 0, sum_total: 0 };
      }
      acc[pid].minYear = Math.min(acc[pid].minYear, parseInt(d.tax_year));
      acc[pid].maxYear = Math.max(acc[pid].maxYear, parseInt(d.tax_year));
      const b = parseFloat(d.unpaid_basic) || 0;
      const s = parseFloat(d.unpaid_sef) || 0;
      acc[pid].sum_base += (b + s);
      acc[pid].sum_int += parseFloat(d.interest_amount) || 0;
      acc[pid].sum_total += parseFloat(d.total_due) || 0;
      acc[pid].months_delinquent = Math.max(acc[pid].months_delinquent || 0, d.months_delinquent || 0);
      delinqGrandTotal += parseFloat(d.total_due) || 0;
      return acc;
    }, {}));
  }

  let processedProvincial = [];
  let summaryByBarangay = {}; 
  let provSummary = { av: 0, basic: 0, basicPen: 0, sef: 0, sefPen: 0, total: 0, count: 0 };
  if (tab === "provincial") {
    const targetBrgy = String(selectedBrgy || "ALL").replace("(POB.)", "").replace("POB.", "").trim().toUpperCase();
    safeData.forEach(p => {
      if (!p) return;
      const rawBrgyFull = String((p.properties && p.properties.barangay) || p.barangay || "UNASSIGNED").toUpperCase();
      const rawBrgy = rawBrgyFull.replace("(POB.)", "").replace("POB.", "").trim();
      if (selectedBrgy !== "ALL" && rawBrgy !== targetBrgy && !rawBrgy.includes(targetBrgy) && !targetBrgy.includes(rawBrgy)) return;
      const ln = (p.taxpayers && p.taxpayers.lastname) || '';
      const fn = (p.taxpayers && p.taxpayers.firstname) || '';
      const ownerName = ln || fn ? `${fn} ${ln}`.trim().toUpperCase() : "—";
      const pin = (p.properties && p.properties.property_index_no) || p.property_index_no || "—";
      const cls = (p.properties && p.properties.classification) || p.classification || "—";
      let hasMatchingDelinquency = false;

      if (Array.isArray(p.delinquency) && p.delinquency.length > 0) {
        let minYear = 9999; let maxYear = 0; let pBasic = 0; let pSef = 0; let pBasicPen = 0; let pSefPen = 0; let pTotal = 0;
        p.delinquency.forEach(del => {
          const y = parseInt(del.tax_year);
          if (yearFilter === "2001_BELOW" && y > 2001) return;
          if (yearFilter === "2002_UP" && y <= 2001) return;
          hasMatchingDelinquency = true;
          if (y < minYear) minYear = y;
          if (y > maxYear) maxYear = y;
          const b = parseFloat(del.unpaid_basic) || 0;
          const s = parseFloat(del.unpaid_sef) || 0;
          const totalPen = parseFloat(del.interest_amount) || 0;
          pBasic += b; pSef += s; pBasicPen += (totalPen / 2); pSefPen += (totalPen / 2); pTotal += parseFloat(del.total_due) || 0;
        });

        if (hasMatchingDelinquency) {
          let historicalAv = parseFloat((p.properties && p.properties.assessed_value) || p.assessed_value) || 0;
          if (Array.isArray(p.assessments) && p.assessments.length > 0) {
            const sortedAsmts = [...p.assessments].sort((a, b) => parseInt(b.tax_year) - parseInt(a.tax_year));
            if (yearFilter === "2001_BELOW") {
              const activeAsmt = sortedAsmts.find(a => parseInt(a.tax_year) <= 2001);
              if (activeAsmt && activeAsmt.assessed_value) { historicalAv = parseFloat(activeAsmt.assessed_value); } 
              else { historicalAv = parseFloat(sortedAsmts[sortedAsmts.length - 1].assessed_value) || historicalAv; }
            }
          }
          processedProvincial.push({ pin: pin, owner: ownerName, classification: cls, location: rawBrgyFull, av: historicalAv, from: minYear, to: maxYear, basic: pBasic, basicPen: pBasicPen, sef: pSef, sefPen: pSefPen, total: pTotal });
          if (!summaryByBarangay[rawBrgyFull]) { summaryByBarangay[rawBrgyFull] = { name: rawBrgyFull, basic: 0, basicPen: 0, sef: 0, sefPen: 0, total: 0 }; }
          summaryByBarangay[rawBrgyFull].basic += pBasic; summaryByBarangay[rawBrgyFull].basicPen += pBasicPen; summaryByBarangay[rawBrgyFull].sef += pSef; summaryByBarangay[rawBrgyFull].sefPen += pSefPen; summaryByBarangay[rawBrgyFull].total += pTotal;
        }
      }
    });
    processedProvincial.sort((a, b) => a.location.localeCompare(b.location) || a.owner.localeCompare(b.owner));
    processedProvincial.forEach(row => { provSummary.av += row.av; provSummary.basic += row.basic; provSummary.basicPen += row.basicPen; provSummary.sef += row.sef; provSummary.sefPen += row.sefPen; provSummary.total += row.total; });
    provSummary.count = processedProvincial.length;
  }

  let totalRpus = 0;
  safeClassData.forEach(c => { totalRpus += (parseInt(c.count) || 0); });

  let maxBrgyCount = 1;
  safeBarangayData.forEach(b => {
    const count = parseInt(b.count) || 0;
    if (count > maxBrgyCount) maxBrgyCount = count;
  });

// 🌟 SMART RCD SYSTEM LOGIC 🌟
  let rcdFormsData = [];
  let rcdCollectionsData = [];
  
  // 🌟 DIVIDE THE TOTAL BY 2 FOR RPT (50% GF / 50% SEF)
  const fundAmount = sumTot / 2;

  if (tab === "rcd") {
    let lowestOR = 999999999999;
    let highestOR = 0;
    let totalIssued = 0;

    groupedData.forEach(payment => {
      const orNum = parseInt(payment.or_number);
      if (!isNaN(orNum)) {
        if (orNum < lowestOR) lowestOR = orNum;
        if (orNum > highestOR) highestOR = orNum;
        totalIssued++;
      }
    });

    if (totalIssued > 0) {
      // 1. Collections Data (Section A) - 🌟 Uses the divided fundAmount!
      rcdCollectionsData = [{
        type: "Accountable Form No. 56",
        from: lowestOR,
        to: highestOR,
        amount: fundAmount.toFixed(2)
      }];

      // 2. Accountable Forms Data (Section C)
      const booklet = afList.find(b => lowestOR >= parseInt(b.serial_from) && lowestOR <= parseInt(b.serial_to));

     if (booklet) {
          const bEnd = parseInt(booklet.serial_to);
          const endQty = bEnd - highestOR; 
          const begQty = endQty + totalIssued; 

          rcdFormsData = [{
              formName: "AF 56", // 🌟 Changed from "Accountable Form No. 56"
              begQty: begQty,
              begFrom: lowestOR, 
              begTo: bEnd,
              recQty: "", recFrom: "", recTo: "",
              issQty: totalIssued,
              issFrom: lowestOR,
              issTo: highestOR,
              endQty: endQty > 0 ? endQty : "",
              endFrom: endQty > 0 ? highestOR + 1 : "",
              endTo: endQty > 0 ? bEnd : ""
          }];
      } else {
          rcdFormsData = [{
              formName: "AF 56", // 🌟 Changed from "Accountable Form No. 56"
              begQty: 50,
              begFrom: lowestOR,
              begTo: lowestOR + 49,
              recQty: "", recFrom: "", recTo: "",
              issQty: totalIssued,
              issFrom: lowestOR,
              issTo: highestOR,
              endQty: 50 - totalIssued,
              endFrom: highestOR + 1,
              endTo: lowestOR + 49
          }];
      }
    }
  }

  return (
    <>
      <div className="topbar no-print">
        <div className="topbar-left">
          <h1>Reports & Analytics</h1>
          <p>COA-COMPLIANT TREASURY REPORTS & DATA VISUALIZATION</p>
        </div>
        <div className="topbar-right">
          {tab === "provincial" && <button className="btn btn-primary" onClick={() => window.print()}>🖨️ Print Report</button>}
          {(tab !== "analytics" && tab !== "provincial" && tab !== "rcd") && <input type="date" value={date} onChange={e => setDate(String(e.target.value))} style={{ width: 168 }} />}
        </div>
      </div>

      <style>{`
        @media print {
          /* 🌟 FORCES LONG/LEGAL PORTRAIT PAPER */
          @page { size: 8.27in 11.69in portrait; margin: 0.5in; } 
          body * { visibility: hidden !important; }
          .provincial-print-area, .provincial-print-area *,
          .rcd-print-area, .rcd-print-area * { visibility: visible !important; color: #000 !important; }
          .provincial-print-area, .rcd-print-area { position: absolute !important; left: 0 !important; top: 0 !important; width: 100% !important; background: #fff !important; box-shadow: none !important; border: none !important; margin: 0 !important; padding: 0 !important; min-height: 100vh !important; }
          .no-print { display: none !important; }
          table { width: 100% !important; border-collapse: collapse; margin-bottom: 20px; page-break-inside: auto; }
          tr { page-break-inside: avoid; page-break-after: auto; }
          thead { display: table-header-group; }
          th, td { border: 1px solid #000 !important; padding: 5px 6px !important; font-size: 8pt !important; color: #000 !important; }
          th { background-color: transparent !important; font-weight: bold; text-align: center; }
          .print-only { display: block !important; }
          .print-only-flex { display: flex !important; }
        }
        @media screen {
          .print-only, .print-only-flex { display: none !important; }
        }
      `}</style>

      <div className="page-body">
        <div className="tabs-bar no-print">
          {[
            ["daily", "Daily Collection"], 
            ["monthly", "Monthly Summary"], 
            ["provincial", "🏢 Provincial Query"], 
            ["delinq", "Delinquency Aging"], 
            ["analytics", "📊 Analytics (RPUs)"], 
            ["rcd", "📜 COA RCD"]
          ].map(([id, label]) => (
            <button key={id} className={`tab-btn ${tab === id ? "active" : ""}`} onClick={() => setTab(id)}>{label}</button>
          ))}
        </div>

        {loading ? <div className="loading-state"><span className="spin" />Loading data…</div> : <>

          {tab === "analytics" && (
            <>
              <div className="banner" style={{ marginBottom: "20px", background: "var(--blue)", color: "white", borderRadius: "12px", padding: "16px 24px", display: "flex", alignItems: "center", gap: "12px", boxShadow: "0 4px 6px rgba(0,0,0,0.1)" }}>
                <span style={{ fontSize: "28px" }}>🏢</span>
                <div>
                  <div style={{ fontSize: "13px", opacity: 0.9, textTransform: "uppercase", letterSpacing: "1px", fontWeight: "bold" }}>Total Registered Property Units</div>
                  <div style={{ fontSize: "24px", fontWeight: "800" }}>{totalRpus.toLocaleString()} RPUs in Database</div>
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>
                <div className="card">
                  <div className="card-header">
                    <div>
                      <div className="card-title">Property Classifications</div>
                      <div className="card-sub">Distribution of Land Use</div>
                    </div>
                  </div>
                  <div className="card-body" style={{ padding: "20px 0" }}>
                    {safeClassData.length === 0 ? (
                      <div className="empty" style={{ padding: "40px 0" }}><div className="empty-icon">📊</div><div className="empty-text">No data available</div></div>
                    ) : (
                      <div style={{ height: "400px", width: "100%" }}>
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie data={safeClassData} cx="50%" cy="50%" innerRadius={80} outerRadius={120} paddingAngle={5} dataKey="count" nameKey="name" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                              {safeClassData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                              ))}
                            </Pie>
                            <Tooltip formatter={(value) => [value, "RPUs"]} />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>
                    )}
                  </div>
                </div>

                <div className="card">
                  <div className="card-header">
                    <div>
                      <div className="card-title">RPUs per Barangay</div>
                      <div className="card-sub">Density of registered properties</div>
                    </div>
                  </div>
                  <div className="card-body" style={{ padding: "20px 24px 24px 0", maxHeight: "500px", overflowY: "auto" }}>
                    {safeBarangayData.length === 0 ? (
                      <div className="empty"><div className="empty-icon">🗺️</div><div className="empty-text">No data available</div></div>
                    ) : (
                      <div style={{ width: "100%", height: Math.max(400, safeBarangayData.length * 35) }}>
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart layout="vertical" data={safeBarangayData} margin={{ top: 5, right: 30, left: 40, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="var(--border)" />
                            <XAxis type="number" stroke="var(--text3)" fontSize={12} />
                            <YAxis dataKey="name" type="category" width={100} stroke="var(--text2)" fontSize={11} fontWeight="bold" tick={{ fill: 'var(--text2)' }} />
                            <Tooltip cursor={{ fill: 'var(--bg3)' }} contentStyle={{ backgroundColor: 'var(--bg2)', borderColor: 'var(--border)', color: 'var(--text)', borderRadius: '8px' }} formatter={(value) => [value, "Registered Properties"]} />
                            <Bar dataKey="count" fill="var(--blue)" radius={[0, 4, 4, 0]}>
                              {safeBarangayData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.count === maxBrgyCount ? "var(--gold)" : "var(--blue)"} />
                              ))}
                            </Bar>
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </>
          )}

          {tab === "provincial" && (
            <>
              <div className="panel no-print" style={{ marginBottom: "20px", borderTop: "4px solid var(--gold)" }}>
                <div style={{ display: "flex", gap: "20px", alignItems: "flex-end" }}>
                  <div className="form-group" style={{ flex: 1 }}>
                    <label className="form-label">Report View</label>
                    <select value={ledgerView} onChange={(e) => setLedgerView(e.target.value)} style={{ padding: "8px 12px", fontWeight: "bold" }}>
                      <option value="SUMMARY">Barangay Summary (Totals)</option>
                      <option value="DETAILED">Detailed Taxpayer Ledger</option>
                    </select>
                  </div>
                  <div className="form-group" style={{ flex: 1 }}>
                    <label className="form-label">Location / Barangay</label>
                    <select value={selectedBrgy} onChange={(e) => setSelectedBrgy(e.target.value)} style={{ padding: "8px 12px", fontWeight: "bold" }}>
                      <option value="ALL">ALL BARANGAYS</option>
                      {barangays.map(b => <option key={b} value={b}>{b}</option>)}
                    </select>
                  </div>
                  <div className="form-group" style={{ flex: 1 }}>
                    <label className="form-label">Target Delinquency Year</label>
                    <select value={yearFilter} onChange={(e) => setYearFilter(e.target.value)} style={{ padding: "8px 12px", fontWeight: "bold" }}>
                      <option value="ALL">All Years</option>
                      <option value="2001_BELOW">2001 and Below Only</option>
                      <option value="2002_UP">2002 to Present</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="card provincial-print-area">
                <div className="card-header no-print">
                  <div className="card-title">
                    {ledgerView === "SUMMARY" ? "Summary of Taxpayers with Delinquencies" : "List of Taxpayers with Delinquencies"}
                  </div>
                </div>

                <div className="card-body" style={{ padding: 0 }}>
                  <div className="print-only" style={{ padding: "20px 20px 0" }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: "2px solid #000", paddingBottom: "15px", marginBottom: "20px" }}>
                      <img src="https://i.postimg.cc/VktjPybt/macalelon-logo.png" alt="LGU Logo" style={{ width: "80px", height: "80px", objectFit: "contain" }} />
                      <div style={{ textAlign: "center", flex: 1 }}>
                        <div style={{ fontSize: "11pt" }}>Republic of the Philippines</div>
                        <div style={{ fontSize: "11pt" }}>Province of Quezon</div>
                        <div style={{ fontSize: "12pt", fontWeight: "bold" }}>MUNICIPALITY OF MACALELON</div>
                        <div style={{ fontSize: "11pt", fontWeight: "bold", marginTop: "5px" }}>OFFICE OF THE MUNICIPAL TREASURER</div>
                      </div>
                      <div style={{ width: "80px" }}></div>
                    </div>

                    <h3 style={{ textAlign: "center", fontSize: "12pt", margin: "10px 0 5px", fontWeight: "bold" }}>
                      {ledgerView === "SUMMARY" ? "SUMMARY OF TAXPAYERS WITH DELINQUENCIES PER BARANGAY" : "LIST OF TAXPAYERS WITH DELINQUENCIES PER BARANGAY"}
                    </h3>
                    <h3 style={{ textAlign: "center", fontSize: "11pt", margin: "0 0 20px", fontWeight: "normal" }}>
                      {yearFilter === "ALL" ? "FOR ALL YEARS" : yearFilter === "2001_BELOW" ? "FOR CY 2001 AND BELOW" : "FOR CY 2002 AND UP"}
                    </h3>

                    {selectedBrgy !== "ALL" && (
                      <h3 style={{ textAlign: "left", fontSize: "11pt", margin: "0 0 10px", fontWeight: "bold" }}>BARANGAY: {selectedBrgy}</h3>
                    )}
                  </div>

                  {processedProvincial.length === 0 ? (
                    <div className="empty no-print" style={{ padding: "40px" }}><div className="empty-icon">📊</div><div className="empty-text">No records found matching filters.</div></div>
                  ) : (
                    <div className="table-wrap" style={{ padding: "0 20px" }}>
                      {ledgerView === "SUMMARY" ? (
                        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12px" }}>
                          <thead>
                            <tr style={{ background: "rgba(0,0,0,0.1)" }}>
                              <th style={{ border: "1px solid var(--border)", padding: "8px", textAlign: "left" }}>BARANGAY</th>
                              <th style={{ border: "1px solid var(--border)", padding: "8px", textAlign: "right" }}>BASIC</th>
                              <th style={{ border: "1px solid var(--border)", padding: "8px", textAlign: "right" }}>BASIC PENALTY</th>
                              <th style={{ border: "1px solid var(--border)", padding: "8px", textAlign: "right" }}>SEF</th>
                              <th style={{ border: "1px solid var(--border)", padding: "8px", textAlign: "right" }}>SEF PENALTY</th>
                              <th style={{ border: "1px solid var(--border)", padding: "8px", textAlign: "right" }}>TOTAL</th>
                            </tr>
                          </thead>
                          <tbody>
                            {Object.values(summaryByBarangay).sort((a, b) => a.name.localeCompare(b.name)).map((row, i) => (
                              <tr key={i}>
                                <td style={{ border: "1px solid var(--border)", padding: "6px" }}>{row.name}</td>
                                <td style={{ border: "1px solid var(--border)", padding: "6px", textAlign: "right" }}>{row.basic > 0 ? fmt(row.basic) : ""}</td>
                                <td style={{ border: "1px solid var(--border)", padding: "6px", textAlign: "right" }}>{row.basicPen > 0 ? fmt(row.basicPen) : ""}</td>
                                <td style={{ border: "1px solid var(--border)", padding: "6px", textAlign: "right" }}>{row.sef > 0 ? fmt(row.sef) : ""}</td>
                                <td style={{ border: "1px solid var(--border)", padding: "6px", textAlign: "right" }}>{row.sefPen > 0 ? fmt(row.sefPen) : ""}</td>
                                <td style={{ border: "1px solid var(--border)", padding: "6px", textAlign: "right", fontWeight: "bold" }}>{fmt(row.total)}</td>
                              </tr>
                            ))}
                            <tr style={{ fontWeight: "bold", background: "rgba(0,0,0,0.2)" }}>
                              <td style={{ border: "1px solid var(--border)", padding: "8px", textAlign: "left" }}>GRAND TOTAL</td>
                              <td style={{ border: "1px solid var(--border)", padding: "8px", textAlign: "right" }}>{fmt(provSummary.basic)}</td>
                              <td style={{ border: "1px solid var(--border)", padding: "8px", textAlign: "right" }}>{fmt(provSummary.basicPen)}</td>
                              <td style={{ border: "1px solid var(--border)", padding: "8px", textAlign: "right" }}>{fmt(provSummary.sef)}</td>
                              <td style={{ border: "1px solid var(--border)", padding: "8px", textAlign: "right" }}>{fmt(provSummary.sefPen)}</td>
                              <td style={{ border: "1px solid var(--border)", padding: "8px", textAlign: "right", fontSize: "14px" }}>{fmt(provSummary.total)}</td>
                            </tr>
                          </tbody>
                        </table>
                      ) : (
                        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "11px" }}>
                          <thead>
                            <tr style={{ background: "rgba(0,0,0,0.1)" }}>
                              <th style={{ border: "1px solid var(--border)", padding: "6px", textAlign: "center" }}>No.</th>
                              <th style={{ border: "1px solid var(--border)", padding: "6px", textAlign: "center" }}>Pro Index No</th>
                              <th style={{ border: "1px solid var(--border)", padding: "6px", textAlign: "center" }}>Property Owner</th>
                              <th style={{ border: "1px solid var(--border)", padding: "6px", textAlign: "center" }}>Classification</th>
                              <th style={{ border: "1px solid var(--border)", padding: "6px", textAlign: "center" }}>Location</th>
                              <th style={{ border: "1px solid var(--border)", padding: "6px", textAlign: "center" }}>Assessed Value</th>
                              <th style={{ border: "1px solid var(--border)", padding: "6px", textAlign: "center" }}>From</th>
                              <th style={{ border: "1px solid var(--border)", padding: "6px", textAlign: "center" }}>To</th>
                              <th style={{ border: "1px solid var(--border)", padding: "6px", textAlign: "center" }}>Basic</th>
                              <th style={{ border: "1px solid var(--border)", padding: "6px", textAlign: "center" }}>Penalty</th>
                              <th style={{ border: "1px solid var(--border)", padding: "6px", textAlign: "center" }}>SEF</th>
                              <th style={{ border: "1px solid var(--border)", padding: "6px", textAlign: "center" }}>Sef Penalty</th>
                              <th style={{ border: "1px solid var(--border)", padding: "6px", textAlign: "center" }}>Total Collectible</th>
                            </tr>
                          </thead>
                          <tbody>
                            {processedProvincial.map((row, i) => (
                              <tr key={i}>
                                <td style={{ border: "1px solid var(--border)", padding: "4px", textAlign: "center" }}>{i + 1}</td>
                                <td style={{ border: "1px solid var(--border)", padding: "4px" }}>{row.pin}</td>
                                <td style={{ border: "1px solid var(--border)", padding: "4px" }}>{row.owner}</td>
                                <td style={{ border: "1px solid var(--border)", padding: "4px", textAlign: "center" }}>{row.classification.substring(0, 3).toUpperCase()}</td>
                                <td style={{ border: "1px solid var(--border)", padding: "4px" }}>{row.location.replace(" (POB.)", "")}</td>
                                <td style={{ border: "1px solid var(--border)", padding: "4px", textAlign: "right" }}>{fmt(row.av)}</td>
                                <td style={{ border: "1px solid var(--border)", padding: "4px", textAlign: "center" }}>{row.from}</td>
                                <td style={{ border: "1px solid var(--border)", padding: "4px", textAlign: "center" }}>{row.to}</td>
                                <td style={{ border: "1px solid var(--border)", padding: "4px", textAlign: "right" }}>{row.basic > 0 ? fmt(row.basic) : ""}</td>
                                <td style={{ border: "1px solid var(--border)", padding: "4px", textAlign: "right" }}>{row.basicPen > 0 ? fmt(row.basicPen) : ""}</td>
                                <td style={{ border: "1px solid var(--border)", padding: "4px", textAlign: "right" }}>{row.sef > 0 ? fmt(row.sef) : ""}</td>
                                <td style={{ border: "1px solid var(--border)", padding: "4px", textAlign: "right" }}>{row.sefPen > 0 ? fmt(row.sefPen) : ""}</td>
                                <td style={{ border: "1px solid var(--border)", padding: "4px", textAlign: "right", fontWeight: "bold" }}>{fmt(row.total)}</td>
                              </tr>
                            ))}
                            <tr style={{ fontWeight: "bold", background: "rgba(0,0,0,0.2)" }}>
                              <td colSpan="8" style={{ border: "1px solid var(--border)", padding: "8px", textAlign: "right" }}>GRAND TOTAL</td>
                              <td style={{ border: "1px solid var(--border)", padding: "8px", textAlign: "right" }}>{fmt(provSummary.basic)}</td>
                              <td style={{ border: "1px solid var(--border)", padding: "8px", textAlign: "right" }}>{fmt(provSummary.basicPen)}</td>
                              <td style={{ border: "1px solid var(--border)", padding: "8px", textAlign: "right" }}>{fmt(provSummary.sef)}</td>
                              <td style={{ border: "1px solid var(--border)", padding: "8px", textAlign: "right" }}>{fmt(provSummary.sefPen)}</td>
                              <td style={{ border: "1px solid var(--border)", padding: "8px", textAlign: "right", fontSize: "13px" }}>{fmt(provSummary.total)}</td>
                            </tr>
                          </tbody>
                        </table>
                      )}
                    </div>
                  )}

                  {processedProvincial.length > 0 && (
                    <div className="print-only-flex" style={{ justifyContent: "space-around", marginTop: "40px", marginBottom: "40px", pageBreakInside: "avoid", color: "#000" }}>
                      <div style={{ textAlign: "center" }}>
                        <span style={{ fontSize: "10pt" }}>Prepared by:</span><br /><br /><br />
                        <strong style={{ fontSize: "11pt", textTransform: "uppercase", textDecoration: "underline" }}>{(profile && profile.full_name) || "AUTHORIZED STAFF"}</strong><br />
                        <div style={{ fontSize: "11pt", textTransform: "uppercase" }}>{(profile && profile.position) || (profile && profile.role) || "MTO PERSONNEL"}</div>
                      </div>
                      <div style={{ textAlign: "center" }}>
                        <span style={{ fontSize: "10pt" }}>Certified Correct:</span><br /><br /><br />
                        <strong style={{ fontSize: "11pt", textDecoration: "underline" }}>DINIA A. TAÑEDO</strong><br />
                        <div style={{ fontSize: "11pt" }}>Municipal Treasurer</div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </>
          )}

          {(tab === "daily" || tab === "monthly") && (
            <>
              <div className="stat-row" style={{ gridTemplateColumns: "repeat(4,1fr)", padding: 0, marginBottom: 20 }}>
                {[
                  { label: "Basic RPT", value: sumBasic, color: "blue" },
                  { label: "SEF", value: sumSef, color: "green" },
                  { label: "Penalties", value: sumPen, color: "gold" },
                  { label: "Total", value: sumTot, color: "red" },
                ].map(s => (
                  <div className="stat-card" key={s.label}>
                    <div className={`stat-accent ${s.color}`} />
                    <div className="stat-label">{s.label}</div>
                    <div className="stat-value big-num"><span style={{ fontFamily: "monospace" }}>{fmt(s.value)}</span></div>
                  </div>
                ))}
              </div>
              <div className="card">
                <div className="card-header">
                  <div>
                    <div className="card-title">{tab === "daily" ? "Daily" : "Monthly"} Collection Report</div>
                    <div className="card-sub">{String(date).slice(0, tab === "monthly" ? 7 : 10)} · {groupedData.length} receipt(s)</div>
                  </div>
                  <button className="btn btn-outline btn-sm">Export PDF</button>
                </div>
                {groupedData.length === 0
                  ? <div className="empty"><div className="empty-icon">📋</div><div className="empty-text">No collections for this period</div></div>
                  : <div className="table-wrap"><table>
                    <thead><tr><th>OR No.</th><th>Date</th><th>Taxpayer</th><th>Year(s)</th><th>Basic</th><th>SEF</th><th>Penalty</th><th>Total</th><th>Method</th><th></th></tr></thead>
                    <tbody>
                      {groupedData.map((c, i) => (
                        <tr key={i}>
                          <td><span className="badge badge-blue">{c.or_number}</span></td>
                          <td><span className="mono-sm">{c.payment_date}</span></td>
                          <td style={{ fontWeight: 600, fontSize: 13 }}>{(c.taxpayers && c.taxpayers.lastname) ? `${c.taxpayers.lastname}, ${c.taxpayers.firstname || ''}` : "—"}</td>
                          <td><span className="chip">{c.minYear === c.maxYear ? c.minYear : `${c.minYear}-${c.maxYear}`}</span></td>
                          <td><span className="mono">{fmt(c.sum_basic)}</span></td>
                          <td><span className="mono">{fmt(c.sum_sef)}</span></td>
                          <td><span className="mono">{fmt(c.sum_penalty)}</span></td>
                          <td><span className="mono" style={{ color: "var(--green2)", fontWeight: 700 }}>{fmt(c.sum_total)}</span></td>
                          <td><span className="chip">{c.payment_method}</span></td>
                          <td>
                            {(profile && ["admin", "treasurer"].includes(profile.role)) && (
                              <button className="btn btn-ghost btn-xs" style={{ color: "var(--red2)" }} onClick={() => handleDelete(c, "collection")} disabled={deleting}>✕</button>
                            )}
                          </td>
                        </tr>
                      ))}
                      <tr style={{ background: "rgba(0,0,0,0.25)" }}>
                        <td colSpan={4} style={{ fontWeight: 700, fontSize: 12, fontFamily: "var(--font-mono)", letterSpacing: "0.05em", color: "var(--text3)" }}>TOTAL</td>
                        <td><span className="mono" style={{ fontWeight: 700 }}>{fmt(sumBasic)}</span></td>
                        <td><span className="mono" style={{ fontWeight: 700 }}>{fmt(sumSef)}</span></td>
                        <td><span className="mono" style={{ fontWeight: 700 }}>{fmt(sumPen)}</span></td>
                        <td><span className="mono" style={{ fontWeight: 800, color: "var(--green2)", fontSize: 14 }}>{fmt(sumTot)}</span></td>
                        <td colSpan={2} />
                      </tr>
                    </tbody>
                  </table></div>
                }
              </div>
            </>
          )}

          {tab === "delinq" && (
            <div className="card">
              <div className="card-header">
                <div><div className="card-title">Delinquency Aging Report</div><div className="card-sub">As of {getToday()} · {groupedAging.length} accounts</div></div>
                <button className="btn btn-outline btn-sm">Export PDF</button>
              </div>
              {groupedAging.length === 0
                ? <div className="empty"><div className="empty-icon">✅</div><div className="empty-text">No delinquent accounts</div></div>
                : <div className="table-wrap"><table>
                  <thead><tr><th>TD No. / PIN</th><th>Taxpayer</th><th>Year(s)</th><th>Months</th><th>Basic + SEF</th><th>Interest</th><th>Total Due</th><th></th></tr></thead>
                  <tbody>
                    {groupedAging.map((row) => (
                      <tr key={row.property_id}>
                        <td>
                          <div style={{ fontWeight: 600 }}>{row.properties?.td_number || "—"}</div>
                          <div style={{ fontSize: 10, color: "var(--text3)" }}>{row.properties?.property_index_no || ""}</div>
                        </td>
                        <td style={{ fontWeight: "bold" }}>
                          {(row.taxpayers && row.taxpayers.lastname) ? `${row.taxpayers.lastname}, ${row.taxpayers.firstname || ''}` : "—"}
                        </td>
                        <td>
                          <span className="chip" style={{ background: "var(--bg3)" }}>
                            {row.minYear === row.maxYear ? row.minYear : `${row.minYear} - ${row.maxYear}`}
                          </span>
                        </td>
                        <td><span className="mono">{row.months_delinquent} mos.</span></td>
                        <td><span className="mono">{fmt(row.sum_base)}</span></td>
                        <td><span className="mono" style={{ color: "var(--red2)" }}>{fmt(row.sum_int)}</span></td>
                        <td><span className="mono" style={{ color: "var(--gold2)", fontWeight: "bold" }}>{fmt(row.sum_total)}</span></td>
                        <td style={{ textAlign: "center" }}>
                          {(profile && ["admin", "treasurer"].includes(profile.role)) && (
                            <button className="btn btn-ghost btn-xs" style={{ color: "var(--red2)" }} onClick={() => handleDelete(row, "delinquency")} disabled={deleting}>✕</button>
                          )}
                        </td>
                      </tr>
                    ))}
                    <tr style={{ background: "rgba(0,0,0,0.25)" }}>
                      <td colSpan={6} style={{ fontWeight: 700, fontSize: 12, fontFamily: "var(--font-mono)", color: "var(--text3)" }}>GRAND TOTAL</td>
                      <td><span className="mono" style={{ fontWeight: 800, color: "var(--gold2)", fontSize: 14 }}>
                        {fmt(delinqGrandTotal)}
                      </span></td>
                      <td />
                    </tr>
                  </tbody>
                </table></div>
              }
            </div>
          )}

          {tab === "rcd" && (
            <div className="card">
              <div className="card-header no-print">
                <div>
                  <div className="card-title">Report of Collections and Deposits</div>
                  <div className="card-sub">Generate official COA-format RCD for {date}</div>
                </div>
                <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                  
                  {/* 🌟 NEW: Cashier / Officer Selector */}
                  <select 
                    className="input" 
                    value={selectedRcdCashier} 
                    onChange={(e) => setSelectedRcdCashier(e.target.value)}
                    style={{ padding: "8px", borderRadius: "6px", border: "1px solid var(--border)", background: "var(--bg2)", color: "var(--text)" }}
                  >
                    <option value="ALL">All Officers (Master RCD)</option>
                    {cashierList.map(c => <option key={c.id} value={c.id}>{c.full_name}</option>)}
                  </select>

                  <select 
                    className="input" 
                    value={selectedFund} 
                    onChange={(e) => setSelectedFund(e.target.value)}
                    style={{ padding: "8px", borderRadius: "6px", border: "1px solid var(--border)", background: "var(--bg2)", color: "var(--text)" }}
                  >
                    <option value="General Fund">General Fund</option>
                    <option value="Special Education Fund">Special Education Fund</option>
                  </select>

                  <input 
                    type="text" 
                    value={reportNo} 
                    onChange={e => setReportNo(e.target.value)} 
                    placeholder="Report No (e.g. 2026-001)"
                    className="input"
                    style={{ padding: "8px", borderRadius: "6px", border: "1px solid var(--border)", background: "var(--bg2)", color: "var(--text)", width: "160px" }} 
                  />
                  
                  <input 
                    type="date" 
                    value={date} 
                    onChange={e => setDate(String(e.target.value))} 
                    className="input"
                    style={{ padding: "8px", borderRadius: "6px", border: "1px solid var(--border)", background: "var(--bg2)", color: "var(--text)" }} 
                  />

                  <button className="btn btn-gold" onClick={() => window.print()} style={{ whiteSpace: "nowrap" }}>
                    🖨️ Print RCD
                  </button>

                </div>
              </div>

              <div className="card-body rcd-print-area" style={{ padding: "20px", overflowX: "auto", background: "white" }}>
                <RCDForm 
                  fund={selectedFund}
                  date={date}
                  reportNo={reportNo || "________________"}
                  
                  /* 🌟 PASS THE DYNAMIC OFFICER NAME */
                  officerName={selectedRcdCashier === "ALL" 
                      ? "ALL ACCOUNTABLE OFFICERS" 
                      : (cashierList.find(c => c.id === selectedRcdCashier)?.full_name || "").toUpperCase()
                  }
                  
                  officerTitle={selectedRcdCashier === "ALL" ? "Treasury Dept" : (cashierList.find(c => c.id === selectedRcdCashier)?.position || "MTO Personnel")}
                  
                  collections={rcdCollectionsData}
                  accountableForms={rcdFormsData}
                  summary={{ cash: fundAmount, checks: 0, remittance: 0 }} 
                />
              </div>
            </div>
          )}

        </>}
      </div>
    </>
  );
}