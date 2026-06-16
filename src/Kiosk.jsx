import React, { useState, useEffect, useRef } from 'react';

/* ═══════════════════════════════════════════════════════════
   TAXPAYER SELF-SERVICE KIOSK (CLEAN SOA LAYOUT)
═══════════════════════════════════════════════════════════ */
function Kiosk({ db, token, onExit }) {
  const [searchMode, setSearchMode] = useState("SOA"); 
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  
  const [multiProps, setMultiProps] = useState(null); 
  const [multiOrs, setMultiOrs] = useState(null); 
  const [result, setResult] = useState(null); 
  const [timeLeft, setTimeLeft] = useState(60); 
  
  const timerRef = useRef(null);

  const rd = (num) => Math.floor((parseFloat(num) || 0) * 100 + 0.0001) / 100;

  const fmt = (num) => {
    const n = parseFloat(num);
    return isNaN(n) ? "0.00" : n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const resetKiosk = () => { 
    setQ(""); 
    setResult(null); 
    setMultiProps(null); 
    setMultiOrs(null);
    setError(""); 
    setTimeLeft(60); 
  };
  
  const resetTimer = () => { setTimeLeft(60); };

  useEffect(() => {
    if (result || multiProps || multiOrs) {
      timerRef.current = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) { clearInterval(timerRef.current); resetKiosk(); return 60; }
          return prev - 1;
        });
      }, 1000);
    } else { clearInterval(timerRef.current); }
    return () => clearInterval(timerRef.current);
  }, [result, multiProps, multiOrs]);

  useEffect(() => {
    const activityEvents = ['mousedown', 'mousemove', 'keydown', 'touchstart'];
    const handleActivity = () => { if (result || multiProps || multiOrs) resetTimer(); };
    activityEvents.forEach(e => window.addEventListener(e, handleActivity));
    return () => activityEvents.forEach(e => window.removeEventListener(e, handleActivity));
  }, [result, multiProps, multiOrs]);

  const formatSOARows = (details, targetMonth) => {
    const currentYear = new Date().getFullYear();
    const sortedDetails = details.sort((a, b) => parseInt(a.tax_year) - parseInt(b.tax_year));
    let tAv = 0;

    const detailedRows = sortedDetails.map(d => {
      const y = parseInt(d.tax_year);
      const basic = parseFloat(d.unpaid_basic) || 0; 
      const sef = parseFloat(d.unpaid_sef) || 0;
      const penalty = parseFloat(d.interest_amount) || 0; 
      const total = parseFloat(d.total_due) || 0;
      const av = basic / 0.01; 
      tAv += av;
      
     // 1. Calculate the actual discount money amount
      let calcDiscount = rd((basic + sef + penalty) - total);
      if (calcDiscount < 0.01) calcDiscount = 0; 

      // 2. Apply your date-strict 15% Advance rule
      let penaltyRate = 0;
      if (y < currentYear) {
          // LATE PENALTY (Past Years)
          const mosLate = ((currentYear - y) * 12) + targetMonth;
          penaltyRate = (y <= 1991) ? Math.min(mosLate * 0.02, 0.24) : Math.min(mosLate * 0.02, 0.72);
          
      } else if (y === currentYear) {
          // PROMPT PAYMENT (Current Year)
          penaltyRate = "10% DISC";
          
      } else if (y > currentYear) {
          // ADVANCE PAYMENT (Future Years)
          // 🌟 Must be paid on or before September (Months 1-9) to get 15%
          if (targetMonth <= 9) {
              penaltyRate = "15% DISC";
          } else {
              // Paid in Oct, Nov, or Dec
              penaltyRate = "10% DISC"; 
          }
      }
      
      return { year: y, av: av, penalty_percent: penaltyRate, basic: basic, sef: sef, penalty: penalty, discount: calcDiscount, total: total };
    });

    let displayRows = [];
    if (detailedRows.length > 0) {
      const sorted = [...detailedRows].sort((a,b) => a.year - b.year);
      let curr = { ...sorted[0], startYear: sorted[0].year, endYear: sorted[0].year, count: 1 };
      
      for (let i = 1; i < sorted.length; i++) {
        const row = sorted[i];
        if (row.av === curr.av && row.penalty_percent === curr.penalty_percent && row.year === curr.endYear + 1) {
          curr.endYear = row.year; curr.count++; curr.basic += row.basic; curr.sef += row.sef;
          curr.penalty += row.penalty; curr.discount += row.discount; curr.total += row.total;
        } else {
          displayRows.push(curr);
          curr = { ...row, startYear: row.year, endYear: row.year, count: 1 };
        }
      }
      displayRows.push(curr);
    }
    
    const totalDisc = rd(detailedRows.reduce((acc, row) => acc + row.discount, 0));
    return { displayRows, tAv, totalDisc };
  };

  const fetchSOA = async (property) => {
    setLoading(true); setError("");
    try {
      const delinq = await db.select("delinquency", {
        filter: `property_id=eq.${property.id}&status=eq.UNPAID`,
        order: "tax_year.asc"
      }, token);

      if (!delinq || delinq.length === 0) {
        setResult({
          type: "SOA",
          data: { property: property, taxpayer: property.taxpayers, delinquencies: [], displayRows: [], totals: null }
        });
      } else {
        const targetMonth = new Date().getMonth() + 1;
        const { displayRows, tAv, totalDisc } = formatSOARows(delinq, targetMonth);
        
        let gBasic = 0, gSef = 0, gPen = 0, gTot = 0;
        delinq.forEach(d => {
          gBasic += parseFloat(d.unpaid_basic) || 0;
          gSef += parseFloat(d.unpaid_sef) || 0;
          gPen += parseFloat(d.interest_amount) || 0;
          gTot += parseFloat(d.total_due) || 0;
        });

        setResult({
          type: "SOA",
          data: { 
            property: property, 
            taxpayer: property.taxpayers, 
            delinquencies: delinq,
            displayRows: displayRows,
            targetMonth: targetMonth,
            totals: { av: rd(tAv), basic: rd(gBasic), sef: rd(gSef), penalty: rd(gPen), discount: totalDisc, total: rd(gTot) }
          }
        });
      }
      setMultiProps(null); 
    } catch(e) { setError("System error while loading SOA."); }
    setLoading(false);
  };

  const fetchOR = (groupedData) => {
    // 🌟 NEW: Convert Sets to perfectly formatted strings
    const qStr = Array.from(groupedData.qSet || []).join(", ");
    const pinStr = Array.from(groupedData.pinSet || []).join(", ");

    setResult({
      type: "OR",
      data: {
        or_number: groupedData.or_number,
        payment_date: groupedData.payment_date,
        taxpayer: groupedData.taxpayer,
        paid_by: groupedData.paid_by,
        pins: pinStr,     // 🌟 NEW: Send PINs to the UI
        quarters: qStr,   // 🌟 NEW: Send Year-Quarters to the UI
        totals: { basic: groupedData.sum_basic, sef: groupedData.sum_sef, penalty: groupedData.sum_penalty, grand: groupedData.sum_total }
      }
    });
    setMultiOrs(null);
  };

  const handleSearch = async () => {
    if (!q.trim()) return;
    setLoading(true); setError(""); setMultiProps(null); setMultiOrs(null); setResult(null);
    
    try {
      const cleanQ = q.trim();

      if (searchMode === "SOA") {
        const tps = await db.select("taxpayers", { filter: `or=(lastname.ilike.*${cleanQ}*,firstname.ilike.*${cleanQ}*)`, select: "id" }, token);
        const tpIds = tps ? tps.map(t => t.id) : [];

        let filterStr = `or=(property_index_no.ilike.*${cleanQ}*,td_number.ilike.*${cleanQ}*`;
        if (tpIds.length > 0) filterStr += `,taxpayer_id.in.(${tpIds.join(',')})`;
        filterStr += `)`;

        const props = await db.select("properties", { filter: filterStr, select: "*, taxpayers(firstname, lastname, barangay, address)" }, token);

        if (!props || props.length === 0) {
          setError("Record not found. Please verify the name or numbers.");
          setLoading(false); return;
        }

        if (props.length > 1) {
          setMultiProps(props);
          setLoading(false);
          return;
        }

        await fetchSOA(props[0]);

    } else {
        const tps = await db.select("taxpayers", { filter: `or=(lastname.ilike.*${cleanQ}*,firstname.ilike.*${cleanQ}*)`, select: "id" }, token);
        const tpIds = tps ? tps.map(t => t.id) : [];

        const propsMatch = await db.select("properties", { filter: `property_index_no.ilike.*${cleanQ}*`, select: "id" }, token);
        const propIds = propsMatch ? propsMatch.map(p => p.id) : [];

        let filterStr = `or=(or_number.ilike.*${cleanQ}*,paid_by.ilike.*${cleanQ}*`;
        if (tpIds.length > 0) filterStr += `,taxpayer_id.in.(${tpIds.join(',')})`;
        if (propIds.length > 0) filterStr += `,property_id.in.(${propIds.join(',')})`;
        filterStr += `)`;

        // 🌟 NEW: Fetch the properties relation so we can get the PINs
        const collections = await db.select("collections", { filter: filterStr, select: "*, taxpayers(firstname, lastname), properties(property_index_no, td_number)" }, token);

        if (!collections || collections.length === 0) {
          setError("Official Receipt, Payor, or PIN not found in the system.");
          setLoading(false); return;
        }

        const groupedORs = Object.values(collections.reduce((acc, c) => {
          if (!acc[c.or_number]) {
            acc[c.or_number] = {
              or_number: c.or_number, payment_date: c.payment_date, taxpayer: c.taxpayers, paid_by: c.paid_by,
              sum_total: 0, sum_basic: 0, sum_sef: 0, sum_penalty: 0, 
              qSet: new Set(), pinSet: new Set() // 🌟 NEW: Track sets
            };
          }
          acc[c.or_number].sum_total += parseFloat(c.total_paid) || 0;
          acc[c.or_number].sum_basic += parseFloat(c.basic_tax) || 0;
          acc[c.or_number].sum_sef += parseFloat(c.sef_tax) || 0;
          acc[c.or_number].sum_penalty += parseFloat(c.penalty) || 0;
          
          // 🌟 NEW: Format Quarters exactly as requested (e.g., 2000-Q1 or 2002)
          if (c.tax_year) {
            const qTag = (!c.quarter || c.quarter === "FULL") ? c.tax_year : `${c.tax_year}-${c.quarter}`;
            acc[c.or_number].qSet.add(qTag);
          }
          
          // 🌟 NEW: Track PINs
          if (c.properties) {
            acc[c.or_number].pinSet.add(c.properties.property_index_no || c.properties.td_number || "—");
          }
          
          return acc;
        }, {}));

        // 🌟 NEW: Sort so the newest receipts are ALWAYS at the top!
        groupedORs.sort((a, b) => new Date(b.payment_date) - new Date(a.payment_date));

        if (groupedORs.length > 1) {
          setMultiOrs(groupedORs);
          setLoading(false);
          return;
        }

        fetchOR(groupedORs[0]);
      }
      
    } catch (e) { setError("System error. Please check database permissions or internet connection."); }
    setLoading(false);
  };

return (
   <div style={{ minHeight: "100vh", width: "100vw", position: "absolute", top: 0, left: 0, background: "var(--bg)", display: "flex", flexDirection: "column", fontFamily: "'Outfit', sans-serif" }}>
      <style>{`
        .k-box { background: white; padding: 40px; border-radius: 24px; box-shadow: 0 12px 40px rgba(0,0,0,0.08); width: 100%; max-width: 800px; text-align: center; border: 1px solid rgba(0,0,0,0.05); }
        .k-tabs { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 30px; }
        .k-tab { padding: 24px; border-radius: 16px; border: 2px solid #e2e8f0; background: #f8fafc; cursor: pointer; transition: 0.2s; display: flex; flex-direction: column; align-items: center; gap: 12px; }
        /* Navy & Gold Tab Active States */
        .k-tab.active { border-color: #1E3A5F; background: rgba(30,58,95,0.05); box-shadow: 0 4px 12px rgba(30,58,95,0.1); transform: translateY(-2px); }
        .k-input { width: 100%; padding: 20px; font-size: 24px; border: 2px solid #cbd5e1; border-radius: 12px; text-align: center; outline: none; transition: 0.2s; box-sizing: border-box; background: white; color: #0f172a; }
        .k-input:focus { border-color: #D4A017; box-shadow: 0 0 0 4px rgba(212,168,67,0.15); }
        /* Gold Primary Button */
        .k-btn { background: #D4A017; color: white; border: none; padding: 20px 40px; font-size: 20px; font-weight: bold; border-radius: 12px; cursor: pointer; width: 100%; transition: 0.2s; text-shadow: 0 1px 2px rgba(0,0,0,0.2); }
        .k-btn:hover:not(:disabled) { background: #B8860B; transform: translateY(-2px); box-shadow: 0 8px 20px rgba(212,168,67,0.3); }
        .k-btn:active:not(:disabled) { transform: translateY(0); }
        .k-btn:disabled { opacity: 0.7; cursor: not-allowed; }
        /* Navy Outline Button */
        .k-btn-outline { background: transparent; border: 2px solid #1E3A5F; color: #1E3A5F; text-shadow: none; }
        .k-btn-outline:hover:not(:disabled) { background: #1E3A5F; color: white; }
        .prop-list-btn:hover { background: rgba(30,58,95,0.05); border-color: #1E3A5F; }

        @media print {
          @page { size: A4 portrait; margin: 15mm; }
          body * { visibility: hidden !important; }
          .kiosk-print-area, .kiosk-print-area * { visibility: visible !important; color: #000 !important; }
          .kiosk-print-area { position: absolute !important; left: 0 !important; top: 0 !important; width: 100% !important; background: #fff !important; box-shadow: none !important; border: none !important; margin: 0 !important; padding: 0 !important; max-height: none !important; overflow: visible !important; }
          .no-print { display: none !important; }
          table { page-break-inside: auto; width: 100% !important; margin: 0 auto; }
          tr { page-break-inside: avoid; page-break-after: auto; }
          thead { display: table-header-group; }
          .kiosk-print-area th, .kiosk-print-area td { font-size: 10pt !important; padding: 4px !important; }
        }
      `}</style>

      {/* 🌟 KIOSK MUNICIPAL HEADER (Navy & Gold) */}
      <div className="no-print" style={{ backgroundColor: "#1E3A5F", color: "#FFFFFF", textAlign: "center", padding: "30px 20px", borderBottom: "5px solid #D4A017", boxShadow: "0 4px 10px rgba(0,0,0,0.2)", position: "relative" }}>
        <img src="https://i.postimg.cc/VktjPybt/macalelon-logo.png" alt="LGU Logo" style={{ width: "90px", height: "90px", backgroundColor: "#fff", borderRadius: "50%", padding: "2px", marginBottom: "12px" }} />
        <h2 style={{ fontWeight: "bold", margin: 0, letterSpacing: "1px", textTransform: "uppercase", fontSize: "28px" }}>Municipality of Macalelon</h2>
        <h5 style={{ fontWeight: 300, margin: "5px 0 0 0", color: "rgba(255,255,255,0.8)", fontSize: "16px", textTransform: "uppercase", letterSpacing: "2px" }}>Real Property Tax Self-Service Kiosk</h5>
        
        {onExit && (
          <button 
            onClick={onExit} 
            style={{ position: "absolute", top: "20px", left: "20px", background: "rgba(0,0,0,0.3)", border: "1px solid rgba(255,255,255,0.2)", color: "#fff", padding: "8px 15px", borderRadius: "8px", cursor: "pointer", fontSize: "14px" }}
          >
            ← Exit Kiosk
          </button>
        )}
      </div>

      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: "40px" }}>
        
        {!result && !multiProps && !multiOrs && (
          <div className="k-box">
            <div className="k-tabs">
              <div className={`k-tab ${searchMode === "SOA" ? "active" : ""}`} onClick={() => { setSearchMode("SOA"); setQ(""); setError(""); }}>
                <div style={{ fontSize: "40px" }}>📄</div>
                <div>
                  <div style={{ fontSize: "20px", fontWeight: "bold", color: "#0f172a" }}>Check SOA</div>
                  <div style={{ fontSize: "14px", color: "#64748b", marginTop: "4px" }}>View Tax Statement</div>
                </div>
              </div>
              <div className={`k-tab ${searchMode === "OR" ? "active" : ""}`} onClick={() => { setSearchMode("OR"); setQ(""); setError(""); }}>
                <div style={{ fontSize: "40px" }}>✅</div>
                <div>
                  <div style={{ fontSize: "20px", fontWeight: "bold", color: "#0f172a" }}>Verify Payment</div>
                  <div style={{ fontSize: "14px", color: "#64748b", marginTop: "4px" }}>Validate Official Receipt</div>
                </div>
              </div>
            </div>

            <div style={{ marginBottom: "30px" }}>
              <div style={{ fontSize: "18px", fontWeight: "bold", color: "#1E3A5F", marginBottom: "12px" }}>
                {searchMode === "SOA" ? "👉 Enter your Last Name, PIN, or TD Number:" : "👉 Enter OR Number, Payor, Taxpayer, or PIN:"}
              </div>
              <input 
                className="k-input" type="text" 
                placeholder={searchMode === "SOA" ? "Example: Dela Cruz or 015-18..." : "Example: OR-1234567, Dela Cruz, or 015-18..."} 
                value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              />
            </div>

            <button className="k-btn" onClick={handleSearch} disabled={loading}>
              {loading ? "Searching Database..." : "🔍 Search Records"}
            </button>

            {error && <div style={{ marginTop: "24px", color: "#ef4444", fontWeight: "bold", background: "#fef2f2", padding: "16px", borderRadius: "12px", border: "1px solid #fecaca" }}>{error}</div>}
          </div>
        )}

        {!result && multiProps && (
          <div className="k-box">
             <div className="no-print" style={{ background: "rgba(30, 58, 95, 0.1)", padding: "8px", color: "#1E3A5F", fontWeight: "bold", borderRadius: "8px", marginBottom: "20px" }}>
               Session expires in {timeLeft} seconds
             </div>
             
             <h2 style={{fontSize: "28px", color: "#1E3A5F", marginBottom: "10px"}}>Multiple Properties Found</h2>
             <p style={{fontSize: "18px", color: "#64748b", marginBottom: "30px"}}>Please select which property you want to view the SOA for:</p>
             
             <div style={{display: "flex", flexDirection: "column", gap: "12px", maxHeight: "400px", overflowY: "auto", paddingRight: "10px"}}>
                {multiProps.map(p => (
                   <button key={p.id} className="k-tab prop-list-btn" style={{flexDirection: "row", justifyContent: "space-between", textAlign: "left", padding: "20px"}} onClick={() => fetchSOA(p)}>
                      <div>
                        <div style={{fontWeight: "bold", fontSize: "18px", color: "#1E3A5F"}}>TD: {p.td_number}</div>
                        <div style={{fontSize: "14px", color: "#D4A017", fontWeight: "bold", marginTop: "4px"}}>PIN: {p.property_index_no || "—"}</div>
                        <div style={{fontSize: "14px", color: "#64748b", marginTop: "4px"}}>{p.taxpayers?.lastname}, {p.taxpayers?.firstname} · Brgy. {p.barangay}</div>
                      </div>
                      <div style={{fontSize: "24px", color: "#D4A017", fontWeight: "bold"}}>→</div>
                   </button>
                ))}
             </div>
             
             <button className="k-btn k-btn-outline" style={{marginTop: "30px", width: "auto"}} onClick={() => setMultiProps(null)}>← Search Again</button>
          </div>
        )}

        {!result && multiOrs && (
          <div className="k-box">
             <div className="no-print" style={{ background: "rgba(30, 58, 95, 0.1)", padding: "8px", color: "#1E3A5F", fontWeight: "bold", borderRadius: "8px", marginBottom: "20px" }}>
               Session expires in {timeLeft} seconds
             </div>
             
             <h2 style={{fontSize: "28px", color: "#1E3A5F", marginBottom: "10px"}}>Multiple Receipts Found</h2>
             <p style={{fontSize: "18px", color: "#64748b", marginBottom: "30px"}}>Please select which Official Receipt you want to verify:</p>
             
             <div style={{display: "flex", flexDirection: "column", gap: "12px", maxHeight: "400px", overflowY: "auto", paddingRight: "10px"}}>
                {multiOrs.map(or => (
                   <button key={or.or_number} className="k-tab prop-list-btn" style={{flexDirection: "row", justifyContent: "space-between", textAlign: "left", padding: "20px"}} onClick={() => fetchOR(or)}>
                      <div>
                        <div style={{fontWeight: "bold", fontSize: "18px", color: "#1E3A5F"}}>OR No: {or.or_number}</div>
                        <div style={{fontSize: "14px", color: "#D4A017", fontWeight: "bold", marginTop: "4px"}}>Date Paid: {or.payment_date}</div>
                        <div style={{fontSize: "14px", color: "#64748b", marginTop: "4px"}}>Taxpayer: {or.taxpayer?.lastname}, {or.taxpayer?.firstname}</div>
                        {/* 🌟 FIXED: Shows exactly what they searched instead of listing all properties */}
                        <div style={{fontSize: "13px", color: "#2563eb", marginTop: "4px", fontWeight: "bold"}}>Search Match: {q}</div>
                        <div style={{fontSize: "15px", color: "#16a34a", fontWeight: "bold", marginTop: "6px"}}>Total Paid: ₱{fmt(or.sum_total)}</div>
                      </div>
                      <div style={{fontSize: "24px", color: "#D4A017", fontWeight: "bold"}}>→</div>
                   </button>
                ))}
             </div>
             
             <button className="k-btn k-btn-outline" style={{marginTop: "30px", width: "auto"}} onClick={() => setMultiOrs(null)}>← Search Again</button>
          </div>
        )}

        {result && (
          <div className="k-box kiosk-print-area" style={{ width: "850px", maxWidth: "100%", padding: 0, overflow: "hidden", background: "#fff", color: "#000", fontFamily: "Arial, sans-serif" }}>
            <div className="no-print" style={{ background: "rgba(30, 58, 95, 0.1)", padding: "12px 20px", color: "#1E3A5F", fontWeight: "bold" }}>
              Session expires in {timeLeft} seconds
            </div>
            <div style={{ padding: "40px 50px" }}>
              
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "25px", borderBottom: "2px solid #000", paddingBottom: "15px" }}>
                <img src="https://i.postimg.cc/VktjPybt/macalelon-logo.png" alt="LGU Logo" style={{ width: "80px", height: "80px", objectFit: "contain" }} />
                <div style={{ textAlign: "center", flex: 1, color: "#000" }}>
                  <div style={{ fontSize: "11pt" }}>Republic of the Philippines</div>
                  <div style={{ fontSize: "11pt" }}>Province of Quezon</div>
                  <div style={{ fontSize: "11pt", fontWeight: "bold" }}>MUNICIPALITY OF MACALELON</div>
                  <div style={{ fontSize: "11pt", fontWeight: "bold", marginTop: "10px" }}>STATEMENT OF ACCOUNT</div>
                </div>
                <div style={{ width: "80px" }}></div>
              </div>

              {/* CLEAN SOA RESULT */}
              {result.type === "SOA" && (
                <>
                  {result.data.delinquencies.length === 0 ? (
                    <div style={{ textAlign: "center", padding: "40px", background: "#f0fdf4", border: "2px dashed #22c55e", borderRadius: "12px", color: "#15803d", margin: "20px 0" }}>
                      <div style={{ fontSize: "40px", marginBottom: "10px" }}>✅</div>
                      <h3 style={{ margin: 0, fontSize: "24px" }}>No Pending Taxes</h3>
                      <p style={{ marginTop: "10px" }}>Our records show no unpaid tax declarations for this property.</p>
                    </div>
                  ) : (
                    <>
                      <div style={{ textAlign: "left", marginBottom: "25px", fontSize: "10pt", lineHeight: "1.6", color: "#000" }}>
                        <div style={{ borderBottom: "1px solid #000", display: "inline-block", minWidth: "350px", fontWeight: "bold" }}>
                          {result.data.taxpayer?.firstname} {result.data.taxpayer?.lastname}
                        </div><br/>
                        <div style={{ borderBottom: "1px solid #000", display: "inline-block", minWidth: "350px" }}>
                          {result.data.taxpayer?.address || result.data.taxpayer?.barangay || "—"}
                        </div><br/>
                        <div style={{ borderBottom: "1px solid #000", display: "inline-block", minWidth: "350px" }}>MACALELON, QUEZON</div>
                      </div>

                      <table style={{ width: "100%", margin: "0 auto", borderCollapse: "collapse", border: "2px solid #000", fontSize: "10pt", textAlign: "center", marginBottom: "10px", color: "#000" }}>
                        <thead>
                          <tr>
                            <th rowSpan="2" style={{ border: "1px solid #000", padding: "4px" }}>PIN No.</th>
                            <th rowSpan="2" style={{ border: "1px solid #000", padding: "4px" }}>BRGY.</th>
                            <th rowSpan="2" style={{ border: "1px solid #000", padding: "4px" }}>YEAR</th>
                            <th rowSpan="2" style={{ border: "1px solid #000", padding: "4px" }}>ASSESSED<br/>VALUE</th>
                            <th rowSpan="2" style={{ border: "1px solid #000", padding: "4px" }}>No. of<br/>Years</th>
                            <th rowSpan="2" style={{ border: "1px solid #000", padding: "4px" }}>% of<br/>Penalty</th>
                            <th colSpan="2" style={{ border: "1px solid #000", padding: "4px" }}>PRINCIPAL</th>
                            <th rowSpan="2" style={{ border: "1px solid #000", padding: "4px" }}>Penalties</th>
                            <th rowSpan="2" style={{ border: "1px solid #000", padding: "4px" }}>Discount</th>
                            <th rowSpan="2" style={{ border: "1px solid #000", padding: "4px" }}>Total Due</th>
                          </tr>
                          <tr>
                            <th style={{ border: "1px solid #000", padding: "4px" }}>BASIC</th>
                            <th style={{ border: "1px solid #000", padding: "4px" }}>SEF</th>
                          </tr>
                        </thead>
                        <tbody>
                          {result.data.displayRows.map((row, idx) => (
                            <tr key={idx}>
                              <td style={{ border: "1px solid #000", padding: "6px" }}>{result.data.property.property_index_no || "—"}</td>
                              <td style={{ border: "1px solid #000", padding: "6px" }}>{result.data.property.barangay || "—"}</td>
                              <td style={{ border: "1px solid #000", padding: "6px" }}>{row.startYear === row.endYear ? row.startYear : `${row.startYear} - ${row.endYear}`}</td>
                              <td style={{ border: "1px solid #000", padding: "6px", textAlign: "right" }}>{fmt(row.av)}</td>
                              <td style={{ border: "1px solid #000", padding: "6px" }}>{row.count}</td>
                              <td style={{ border: "1px solid #000", padding: "6px" }}>{typeof row.penalty_percent === "number" ? `${(row.penalty_percent * 100).toFixed(0)}%` : row.penalty_percent}</td>
                              <td style={{ border: "1px solid #000", padding: "6px", textAlign: "right" }}>{fmt(row.basic)}</td>
                              <td style={{ border: "1px solid #000", padding: "6px", textAlign: "right" }}>{fmt(row.sef)}</td>
                              <td style={{ border: "1px solid #000", padding: "6px", textAlign: "right" }}>{fmt(row.penalty)}</td>
                              <td style={{ border: "1px solid #000", padding: "6px", textAlign: "right" }}>{row.discount > 0 ? `-${fmt(row.discount)}` : "0.00"}</td>
                              <td style={{ border: "1px solid #000", padding: "6px", textAlign: "right", fontWeight: "bold" }}>{fmt(row.total)}</td>
                            </tr>
                          ))}
                          <tr style={{ background: "rgba(0,0,0,0.05)" }}>
                            <td colSpan="6" style={{ border: "1px solid #000", padding: "6px", textAlign: "right", fontWeight: "bold" }}>GRAND TOTAL:</td>
                            <td style={{ border: "1px solid #000", padding: "6px", textAlign: "right", fontWeight: "bold" }}>{fmt(result.data.totals.basic)}</td>
                            <td style={{ border: "1px solid #000", padding: "6px", textAlign: "right", fontWeight: "bold" }}>{fmt(result.data.totals.sef)}</td>
                            <td style={{ border: "1px solid #000", padding: "6px", textAlign: "right", fontWeight: "bold" }}>{fmt(result.data.totals.penalty)}</td>
                            <td style={{ border: "1px solid #000", padding: "6px", textAlign: "right", fontWeight: "bold" }}>{result.data.totals.discount > 0 ? `-${fmt(result.data.totals.discount)}` : "0.00"}</td>
                            <td style={{ border: "1px solid #000", padding: "6px", textAlign: "right", fontWeight: "bold", fontSize: "11pt" }}>{fmt(result.data.totals.total)}</td>
                          </tr>
                        </tbody>
                      </table>

                      <div style={{ textAlign: "center", fontSize: "10pt", marginTop: "10px", marginBottom: "25px", color: "#000" }}>
                        Computed as of {["January","February","March","April","May","June","July","August","September","October","November","December"][result.data.targetMonth-1]}, {new Date().getFullYear()}
                      </div>
                    </>
                  )}
                </>
              )}

              {/* OR RESULT */}
              {result.type === "OR" && (
                <div style={{ textAlign: "center", color: "#0f172a", margin: "40px 0" }}>
                  <div style={{ fontSize: "60px", marginBottom: "10px" }}>✅</div>
                  <h2 style={{ color: "#16a34a", margin: "0 0 5px 0", fontSize: "28px" }}>Payment Verified</h2>
                  <p style={{ color: "#64748b", marginBottom: "30px", fontSize: "16px" }}>This Official Receipt is valid and recorded in the LGU database.</p>
                  
                  <div style={{ background: "#f8fafc", borderRadius: "16px", padding: "30px", maxWidth: "500px", margin: "0 auto", textAlign: "left", border: "1px solid #cbd5e1" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "15px", borderBottom: "1px dashed #cbd5e1", paddingBottom: "15px" }}>
                      <span style={{ color: "#64748b" }}>OR Number:</span>
                      <span style={{ fontWeight: "bold", fontSize: "18px" }}>{result.data.or_number}</span>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "15px" }}>
                      <span style={{ color: "#64748b" }}>Date Paid:</span>
                      <span style={{ fontWeight: "bold" }}>{result.data.payment_date}</span>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "15px" }}>
                      <span style={{ color: "#64748b" }}>Taxpayer:</span>
                      <span style={{ fontWeight: "bold", textAlign: "right" }}>{result.data.taxpayer?.firstname} {result.data.taxpayer?.lastname}</span>
                    </div>
                    {result.data.paid_by && (
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "15px" }}>
                        <span style={{ color: "#64748b" }}>Paid By:</span>
                        <span style={{ fontWeight: "bold", textAlign: "right" }}>{result.data.paid_by}</span>
                      </div>
                    )}
                    
                    {/* 🌟 FIXED: Shows the specific Name, PIN, or TD they searched for */}
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "15px" }}>
                      <span style={{ color: "#64748b" }}>Verified Match:</span>
                      <span style={{ fontWeight: "bold", color: "#1E3A5F", textAlign: "right", maxWidth: "60%" }}>{q}</span>
                    </div>

                    {/* 🌟 NEW: Formatted Quarters */}
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "15px", borderBottom: "1px dashed #cbd5e1", paddingBottom: "15px" }}>
                      <span style={{ color: "#64748b" }}>Year & Quarter(s):</span>
                      <span style={{ fontWeight: "bold", color: "#1E3A5F", textAlign: "right", maxWidth: "60%" }}>{result.data.quarters}</span>
                    </div>
                    
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "10px" }}>
                      <span style={{ color: "#64748b" }}>Basic + SEF:</span>
                      <span>₱{fmt(result.data.totals.basic + result.data.totals.sef)}</span>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "20px" }}>
                      <span style={{ color: "#64748b" }}>Penalties:</span>
                      <span style={{ color: "#ef4444" }}>₱{fmt(result.data.totals.penalty)}</span>
                    </div>
                    
                    <div style={{ display: "flex", justifyContent: "space-between", background: "#dcfce7", padding: "20px", borderRadius: "12px", color: "#16a34a" }}>
                      <span style={{ fontWeight: "bold", fontSize: "20px" }}>TOTAL PAID:</span>
                      <span style={{ fontWeight: "bold", fontSize: "20px" }}>₱{fmt(result.data.totals.grand)}</span>
                    </div>
                  </div>
                </div>
              )}

              <div className="no-print" style={{ display: "flex", gap: "16px", marginTop: "40px" }}>
                {result.type === "SOA" && result.data?.delinquencies?.length !== 0 && (
                  <button className="k-btn" style={{ flex: 2, background: "#1E3A5F" }} onClick={() => { window.print(); resetTimer(); }}>🖨️ Print Statement</button>
                )}
                <button className="k-btn k-btn-outline" style={{ flex: 1 }} onClick={resetKiosk}>Done</button>
              </div>

            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default Kiosk;