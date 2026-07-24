import { useState, useEffect } from "react";
import { db, today, fmt } from "../utils/db";
import PrintableReceipt from "../components/PrintableReceipt";

export default function Collection({ token, profile }) {
    const [step, setStep] = useState(1);
    const [q, setQ] = useState("");
    const [found, setFound] = useState(null);
    const [propList, setPropList] = useState([]);
    const [selectedProps, setSelectedProps] = useState([]);
    const [multiPropData, setMultiPropData] = useState([]);

    const [firstUnpaidYear, setFirstUnpaidYear] = useState(new Date().getFullYear());

    const [fromYear, setFromYear] = useState(String(new Date().getFullYear()));
    const [toYear, setToYear] = useState(String(new Date().getFullYear()));
    const [method, setMethod] = useState("CASH");
    
    // 🌟 RESTORED: QUARTER STATES
    const [fromQuarter, setFromQuarter] = useState("1");
    const [toQuarter, setToQuarter] = useState("4");

    const [allowPartial, setAllowPartial] = useState(false);
    const [partialRemarks, setPartialRemarks] = useState("");
    const [overrides, setOverrides] = useState({});

    const [orNumber, setOrNumber] = useState("");
    const [paidBy, setPaidBy] = useState("");
    const [checkNo, setCheckNo] = useState("");
    const [posting, setPosting] = useState(false);
    const [issued, setIssued] = useState(null);
    const [err, setErr] = useState("");
    const [paymentDate, setPaymentDate] = useState(today());
    const [cashierList, setCashierList] = useState([]);
    const [selectedCashier, setSelectedCashier] = useState("");
    const [activeBooklet, setActiveBooklet] = useState(null);
    const [nextOR, setNextOR] = useState("");
    const [remittanceDate, setRemittanceDate] = useState(today());
    const [addQ, setAddQ] = useState("");
    const [addingProp, setAddingProp] = useState(false);
    const rd = (num) => Math.floor((parseFloat(num) || 0) * 100 + 0.0001) / 100;

    useEffect(() => {
        const fetchCashiers = async () => {
            try {
                const users = await db.select("user_profiles", { order: "full_name.asc" }, token);
                setCashierList(Array.isArray(users) ? users : []);
                if (profile?.full_name) setSelectedCashier(profile.full_name.toUpperCase());
            } catch (e) { console.error(e); }
        };
        fetchCashiers();
    }, [profile, token]);

    useEffect(() => {
        const fetchBooklet = async () => {
            if (!selectedCashier) return;
            try {
                setNextOR("Loading...");
                const forms = await db.select("accountable_forms", {
                    filter: `officer_name=eq.${selectedCashier.toUpperCase()}&status=eq.ACTIVE`,
                    order: "date_issued.asc" 
                }, token);

                if (forms && forms.length > 0) {
                    setActiveBooklet(forms[0]);
                    setNextOR(String(forms[0].current_serial));
                    setOrNumber(String(forms[0].current_serial)); 
                } else {
                    setActiveBooklet(null);
                    setNextOR("NO ACTIVE BOOKLET");
                    setOrNumber("");
                }
            } catch (e) { console.error(e); }
        };
        fetchBooklet();
    }, [selectedCashier, token]);

    // 🌟 RESTORED: QUARTER PARSER
    const parseQuarters = (qStr) => {
        if (!qStr || qStr === "FULL") return [1, 2, 3, 4];
        if (qStr.includes("-")) {
            const m = qStr.match(/Q(\d)-Q(\d)/);
            if (m) {
                let qs = [];
                for (let i = parseInt(m[1]); i <= parseInt(m[2]); i++) qs.push(i);
                return qs;
            }
        }
        const m = qStr.match(/Q(\d)/);
        if (m) return [parseInt(m[1])];
        return [1, 2, 3, 4];
    };

    const search = async () => {
        setErr("");
        try {
            let tp = [];
            const cleanQ = q.trim();
            let matchedPropId = null; 

            const exactPin = await db.select("properties", { filter: `property_index_no=eq.${cleanQ}`, select: "id, taxpayer_id", limit: 1 }, token);
            if (exactPin.length) {
                matchedPropId = exactPin[0].id;
                tp = await db.select("taxpayers", { filter: `id=eq.${exactPin[0].taxpayer_id}`, limit: 1 }, token);
            }

            if (!tp.length) {
                const exactTd = await db.select("properties", { filter: `td_number=eq.${cleanQ}`, select: "id, taxpayer_id", limit: 1 }, token);
                if (exactTd.length) {
                    matchedPropId = exactTd[0].id;
                    tp = await db.select("taxpayers", { filter: `id=eq.${exactTd[0].taxpayer_id}`, limit: 1 }, token);
                }
            }

            if (!tp.length) {
                tp = await db.select("taxpayers", { filter: `or=(lastname.ilike.*${cleanQ}*,taxpayer_code.ilike.*${cleanQ}*)`, limit: 1 }, token);
            }

            if (!tp.length) {
                const propMatch = await db.select("properties", { filter: `or=(property_index_no.ilike.*${cleanQ}*,td_number.ilike.*${cleanQ}*)`, select: "id, taxpayer_id", limit: 1 }, token);
                if (propMatch.length) {
                    matchedPropId = propMatch[0].id;
                    tp = await db.select("taxpayers", { filter: `id=eq.${propMatch[0].taxpayer_id}`, limit: 1 }, token);
                }
            }

            if (!tp.length) { setErr("Taxpayer or Property not found."); return; }

            setFound(tp[0]);
            setPaidBy(`${tp[0].firstname} ${tp[0].lastname}`);
            const ps = await db.select("properties", { filter: `taxpayer_id=eq.${tp[0].id}` }, token);
            setPropList(ps); 
            
            if (matchedPropId) {
                const pToSelect = ps.find(p => p.id === matchedPropId);
                if (pToSelect) setSelectedProps([pToSelect]);
                else setSelectedProps([]);
            } else {
                setSelectedProps([]);
            }

            setStep(2);
        } catch (e) { setErr(e.message); }
    };

    const handleAddProperty = async () => {
        if (!addQ.trim()) return;
        setAddingProp(true); setErr("");
        try {
            const cleanQ = addQ.trim();
            const exactProp = await db.select("properties", { 
                filter: `or=(property_index_no.eq.${cleanQ},td_number.eq.${cleanQ})`, 
                limit: 1 
            }, token);
            
            if (exactProp.length) {
                const newProp = exactProp[0];
                if (!propList.find(p => p.id === newProp.id)) {
                    setPropList(prev => [...prev, newProp]);
                }
                if (!selectedProps.find(p => p.id === newProp.id)) {
                    setSelectedProps(prev => [...prev, newProp]);
                }
                setAddQ("");
            } else {
                setErr("Property not found. Please enter an EXACT PIN or TD Number.");
            }
        } catch(e) { setErr(e.message); }
        setAddingProp(false);
    };

    const toggleProp = (p) => {
        if (selectedProps.find(x => x.id === p.id)) {
            setSelectedProps(selectedProps.filter(x => x.id !== p.id));
        } else {
            setSelectedProps([...selectedProps, p]);
        }
    };

    const proceedWithSelected = async () => {
        if (selectedProps.length === 0) { setErr("Please select at least one property to proceed."); return; }
        setErr("");
        try {
            let globalMinYear = new Date().getFullYear();
            let enrichedProps = [];

            for (const p of selectedProps) {
                const history = await db.select("assessments", { filter: `property_id=eq.${p.id}`, order: "tax_year.desc" }, token);
                const payments = await db.select("collections", { filter: `property_id=eq.${p.id}&is_voided=eq.false` }, token);

                let paidAmounts = {}; 
                let paidQs = {}; 

                if (payments) {
                    payments.forEach(pay => {
                        const y = parseInt(pay.tax_year);
                        // Track total balance paid (For NIA override)
                        if (!paidAmounts[y]) paidAmounts[y] = { basic: 0, sef: 0 };
                        paidAmounts[y].basic += parseFloat(pay.basic_tax) || 0;
                        paidAmounts[y].sef += parseFloat(pay.sef_tax) || 0;
                        
                        // Track exact quarters paid (For Standard Quarters)
                        if (!paidQs[y]) paidQs[y] = [];
                        const qs = parseQuarters(pay.quarter);
                        qs.forEach(q => { if (!paidQs[y].includes(q)) paidQs[y].push(q); });
                    });
                }

                const delinqRecords = await db.select("delinquency", { filter: `property_id=eq.${p.id}&status=eq.UNPAID` }, token);
                let startingYear = new Date().getFullYear();
                if (delinqRecords && delinqRecords.length > 0) {
                    startingYear = Math.min(...delinqRecords.map(d => parseInt(d.tax_year)));
                }
                if (startingYear < globalMinYear) globalMinYear = startingYear;

                enrichedProps.push({ prop: p, history: history || [], paidAmounts, paidQs });
            }

            setMultiPropData(enrichedProps);
            setFirstUnpaidYear(globalMinYear);
            setFromYear(String(globalMinYear));
            setToYear(String(Math.max(globalMinYear, new Date().getFullYear())));
            setStep(3);
        } catch (e) {
            setErr("Failed to load property data: " + e.message);
        }
    };

    const handleOverrideChange = (year, field, value) => {
        setOverrides(prev => ({
            ...prev,
            [year]: { ...prev[year], [field]: value }
        }));
    };

    const payDateObj = new Date(paymentDate || today());
    const currentYear = payDateObj.getFullYear();
    const currentMonth = payDateObj.getMonth() + 1;

    let start = parseInt(fromYear) || currentYear;
    let end = parseInt(toYear) || currentYear;
    if (start > end) { let temp = start; start = end; end = temp; }

    let displayCart = [];
    let dbCart = [];
    let tBasic = 0, tSef = 0, tPen = 0, tDisc = 0, gTotal = 0;

    for (let y = start; y <= end; y++) {
        let yearBasic = 0, yearSef = 0, yearPen = 0, yearDisc = 0;
        let allPaidThisYear = true;
        let defaultRemainingBasic = 0;
        let defaultRemainingSef = 0;

        let startQ = (y === start) ? parseInt(fromQuarter) : 1;
        let endQ = (y === end) ? parseInt(toQuarter) : 4;
        if (y === start && y === end && startQ > endQ) { let temp = startQ; startQ = endQ; endQ = temp; }

        for (const mp of multiPropData) {
            const activeAsmt = mp.history.find(a => parseInt(a.tax_year) <= y);
            const fullBasic = activeAsmt ? parseFloat(activeAsmt.basic_tax) : rd(parseFloat(mp.prop.assessed_value) * 0.01);
            const fullSef = activeAsmt ? parseFloat(activeAsmt.sef_tax) : rd(parseFloat(mp.prop.assessed_value) * 0.01);

            const paidBasic = mp.paidAmounts?.[y]?.basic || 0;
            const paidSef = mp.paidAmounts?.[y]?.sef || 0;

            const remainingBasic = rd(fullBasic - paidBasic);
            const remainingSef = rd(fullSef - paidSef);

            if (remainingBasic <= 0 && remainingSef <= 0) continue; 
            
            let rowBasic = 0, rowSef = 0, rawDisc = 0, rawPen = 0;
            let qLabel;

            if (allowPartial) {
                // 🌟 MODE 1: NIA / PARTIAL OVERRIDE MODE (Ignores Quarters)
                allPaidThisYear = false;
                defaultRemainingBasic += remainingBasic;
                defaultRemainingSef += remainingSef;
                qLabel = "PARTIAL";

                rowBasic = overrides[y] && overrides[y].basic !== undefined ? parseFloat(overrides[y].basic) || 0 : remainingBasic;
                rowSef = overrides[y] && overrides[y].sef !== undefined ? parseFloat(overrides[y].sef) || 0 : remainingSef;

                let totalDueRow = rowBasic + rowSef;
                if (y > currentYear) {
                    rawDisc = totalDueRow * (currentMonth <= 9 ? 0.15 : 0.10);
                } else if (y < currentYear) {
                    const mosLate = ((currentYear - y) * 12) + currentMonth;
                    let penaltyRate = (y <= 1991) ? Math.min(mosLate * 0.02, 0.24) : Math.min(mosLate * 0.02, 0.72);
                    rawPen = totalDueRow * penaltyRate;
                } else {
                    if (currentMonth <= 3) rawDisc = totalDueRow * 0.10; 
                    else rawPen = totalDueRow * Math.min(currentMonth * 0.02, 0.72);
                }

            } else {
                // 🌟 MODE 2: STANDARD QUARTERLY MODE (Strict Q1-Q4)
                const alreadyPaidQs = mp.paidQs?.[y] || [];
                let quartersToPay = [];
                for (let q = startQ; q <= endQ; q++) {
                    if (!alreadyPaidQs.includes(q)) quartersToPay.push(q);
                }
                
                if (quartersToPay.length === 0) continue; // Skip if they already paid these specific quarters
                allPaidThisYear = false;

                const qCount = quartersToPay.length;
                qLabel = qCount === 4 ? "FULL" : (qCount === 1 ? `Q${quartersToPay[0]}` : `Q${quartersToPay[0]}-Q${quartersToPay[quartersToPay.length-1]}`);

                const qBaseBasic = rd(fullBasic / 4);
                const qBaseSef = rd(fullSef / 4);
                const getQBasic = (q) => q === 4 ? rd(fullBasic - (qBaseBasic * 3)) : qBaseBasic;
                const getQSef = (q) => q === 4 ? rd(fullSef - (qBaseSef * 3)) : qBaseSef;
                const getQDue = (q) => rd(getQBasic(q) + getQSef(q));

                quartersToPay.forEach(q => {
                    rowBasic += getQBasic(q); 
                    rowSef += getQSef(q);
                    if (y > currentYear) {
                        if (currentMonth <= 9) rawDisc += getQDue(q) * 0.15;
                        else rawDisc += getQDue(q) * 0.10;
                    } else if (y < currentYear) {
                        const mosLate = ((currentYear - y) * 12) + currentMonth;
                        let penaltyRate = (y <= 1991) ? Math.min(mosLate * 0.02, 0.24) : Math.min(mosLate * 0.02, 0.72);
                        rawPen += getQDue(q) * penaltyRate;
                    } else {
                        const dueMo = q * 3;
                        if (currentMonth <= dueMo) rawDisc += getQDue(q) * 0.10;
                        else rawPen += getQDue(q) * Math.min(currentMonth * 0.02, 0.72);
                    }
                });

                defaultRemainingBasic += rowBasic;
                defaultRemainingSef += rowSef;
            }

            rowBasic = rd(rowBasic); rowSef = rd(rowSef);
            let rowPen = rd(rawPen); let rowDisc = rd(rawDisc);
            const rowTot = rd(rowBasic + rowSef - rowDisc + rowPen);

            yearBasic += rowBasic; yearSef += rowSef; yearPen += rowPen; yearDisc += rowDisc;

            dbCart.push({ property_id: mp.prop.id, assessment_id: activeAsmt?.id, year: y, quarterTag: qLabel, basic: rowBasic, sef: rowSef, pen: rowPen, disc: rowDisc, total: rowTot });
        }

        const qLabelDisplay = allowPartial ? "Override" : (startQ === endQ ? `Q${startQ}` : `Q${startQ}-Q${endQ}`);
        const displayLabel = allowPartial ? `${y} (Override)` : (startQ === 1 && endQ === 4 ? y : `${y} (${qLabelDisplay})`);

        if (allPaidThisYear) {
            displayCart.push({ year: y, display: displayLabel, isPaid: true });
        } else {
            yearBasic = rd(yearBasic); yearSef = rd(yearSef); yearPen = rd(yearPen); yearDisc = rd(yearDisc);
            const yearTot = rd(yearBasic + yearSef - yearDisc + yearPen);
            
            displayCart.push({ 
                year: y, display: displayLabel, isPaid: false, 
                basic: yearBasic, sef: yearSef, pen: yearPen, disc: yearDisc, total: yearTot,
                defBasic: rd(defaultRemainingBasic), defSef: rd(defaultRemainingSef)
            });
            tBasic += yearBasic; tSef += yearSef; tPen += yearPen; tDisc += yearDisc; gTotal += yearTot;
        }
    }

    gTotal = rd(gTotal);

    const post = async () => {
        if (!activeBooklet) { setErr(`Cannot post payment. No active AF56 booklet.`); return; }
        if (!orNumber.trim()) { setErr("OR Number is required."); return; }
        if (allowPartial && !partialRemarks.trim()) { setErr("Remarks are required when overriding partial payments (e.g., 'Partial payment by NIA')."); return; }

        setPosting(true); setErr("");
        try {
            const mainOr = orNumber.trim();

            const rowsToInsert = dbCart.map((item) => ({
                or_number: mainOr,
                taxpayer_id: found.id,
                property_id: item.property_id,
                assessment_id: item.assessment_id || null,
                tax_year: item.year,
                payment_date: paymentDate,
                remittance_date: remittanceDate,
                payment_method: method,
                quarter: item.quarterTag,
                basic_tax: item.basic || 0,
                sef_tax: item.sef || 0,
                idle_tax: 0,
                penalty: item.pen || 0,
                discount: item.disc || 0,
                total_paid: item.total || 0,
                cashier_id: profile?.id || null,
                check_no: checkNo || null,
                paid_by: paidBy ? paidBy.toUpperCase() : "UNKNOWN",
                remarks: allowPartial ? partialRemarks : null 
            }));

            const insertedRows = await db.insert("collections", rowsToInsert, token);
            const col = insertedRows[0];

            await db.insert("official_receipts", { or_number: mainOr, collection_id: col.id, printed_by: profile?.id, print_count: 0 }, token);
            
            const nextSerialNum = activeBooklet.current_serial + 1;
            const isConsumed = nextSerialNum > activeBooklet.serial_to;
            await db.update("accountable_forms", 
                { current_serial: nextSerialNum, status: isConsumed ? "CONSUMED" : "ACTIVE" }, 
                { filter: `id=eq.${activeBooklet.id}` }, 
            token);
            
            // Only mark delinquency PAID if it's standard mode and includes Q4
            for (const item of dbCart) {
                if (!allowPartial && (item.quarterTag === "FULL" || item.quarterTag.includes("4"))) {
                    try {
                        await db.update("delinquency", { status: "PAID" }, { filter: `property_id=eq.${item.property_id}&tax_year=eq.${item.year}` }, token);
                    } catch (updateErr) {console.error(updateErr); }
                }
            }

            const allQTags = Array.from(new Set(dbCart.map(c => c.quarterTag))).join(", ");

            setIssued({ ...col, payment_date: paymentDate, or_number: mainOr, paid_by: paidBy.toUpperCase(), tax_year: `${start}-${end}`, quarter_str: allQTags, basic_tax: tBasic, sef_tax: tSef, penalty: tPen, discount: tDisc, total_paid: gTotal, taxpayer: found, properties: selectedProps, cashier: profile?.full_name, cart: dbCart, remarks: allowPartial ? partialRemarks : "" });
            setStep(4);
        } catch (e) { setErr(e.message); }
        setPosting(false);
    };

    const reset = () => { setStep(1); setFound(null); setPropList([]); setSelectedProps([]); setIssued(null); setQ(""); setErr(""); setOrNumber(""); setMultiPropData([]); setAllowPartial(false); setPartialRemarks(""); setOverrides({}); };

    if (step === 4 && issued) return (
        <div>
            <div className="topbar"><div className="topbar-left"><h1>Receipt Issued</h1></div></div>
            <div className="page-body">
                <div className="banner banner-success"><span className="banner-icon">✓</span><span>{issued.or_number} successfully posted — {fmt(issued.total_paid)}</span></div>
                <div className="two-col">
                    <div>
                        <div className="or-paper">
                            <div className="or-header">
                                <div className="or-seal"><img src="https://i.postimg.cc/VktjPybt/macalelon-logo.png" alt="LGU Logo" style={{ height: "56px", objectFit: "contain" }} /></div>
                                <h2>Republic of the Philippines · Province of Quezon</h2>
                                <h1>Municipality of Macalelon</h1>
                                <h2>Office of the Municipal Treasurer</h2>
                            </div>
                            <div className="or-number">OFFICIAL RECEIPT NO. {issued.or_number}</div>
                            <div className="or-divider" />
                            {[
                                ["Date:", issued.payment_date],
                                ["Taxpayer:", `${issued.taxpayer.lastname}, ${issued.taxpayer.firstname}`],
                                ["Paid By:", issued.paid_by],
                                ["Address:", issued.taxpayer.address || "—"],
                                ["TD Number:", issued.properties?.map(p => p.td_number).join(", ") || "—"],
                                ["Year & Qtr:", `${issued.tax_year} (${issued.quarter_str})`],
                                ["Remarks:", issued.remarks || "—"],
                                ["Payment:", issued.payment_method]
                            ].map(([k, v]) => (
                                <div className="or-line" key={k}><span className="k">{k}</span><span className="v">{v}</span></div>
                            ))}
                            <div className="or-breakdown" style={{ marginTop: "16px", marginBottom: "16px", borderTop: "1px dashed #ccc", borderBottom: "1px dashed #ccc", padding: "12px 0" }}>

                                {[
                                    ["Basic Tax", fmt(issued?.basic_tax)],
                                    ["SEF Tax", fmt(issued?.sef_tax)],
                                    ["Penalty (Late)", issued?.penalty > 0 ? fmt(issued?.penalty) : "0.00"],
                                    ["Discount", issued?.discount > 0 ? `-${fmt(issued?.discount)}` : "0.00"]
                                ].map(([label, amount], i) => (
                                    <div key={i} style={{ display: "flex", justifyContent: "space-between", fontSize: "13px", marginBottom: "4px" }}>
                                        <span>{label}</span>
                                        <span style={{
                                            fontFamily: "monospace",
                                            color: label === "Discount" && issued?.discount > 0 ? "var(--green2)" : "inherit"
                                        }}>
                                            {amount}
                                        </span>
                                    </div>
                                ))}

                            </div>

                            <div style={{ display: "flex", justifyContent: "space-between", fontWeight: "bold", fontSize: "16px" }}>
                                <span>TOTAL AMOUNT PAID</span>
                                <span style={{ fontFamily: "monospace" }}>{fmt(issued?.total_paid)}</span>
                            </div>
                            <div className="or-qr">
                                <div className="qr-placeholder">QR</div>
                                <div className="or-footer">Cashier: {issued.cashier} · Verify at lgu.gov.ph/verify</div>
                            </div>
                        </div>
                        <div className="no-print" style={{ display: "flex", gap: 10, justifyContent: "center", marginTop: 16 }}>
                            <button className="btn btn-primary" onClick={() => window.print()}>🖨 Print to Epson LX-310 (AF 56)</button>
                            <button className="btn btn-outline" onClick={reset}>New Transaction</button>
                        </div>
                        
                        <style>{`
                          @media screen {
                            .af56-print-area { display: none; }
                          }
                          @media print {
                            body * { visibility: hidden !important; }
                            .af56-print-area, .af56-print-area * { visibility: visible !important; color: #000 !important; }
                            .af56-print-area { position: absolute !important; left: 0 !important; top: 0 !important; width: 100% !important; margin: 0 !important; padding: 0 !important; }
                            .no-print { display: none !important; }
                          }
                        `}</style>
                        <div className="af56-print-area">
                            <PrintableReceipt data={issued} />
                        </div>
                    </div>
                    <div className="panel">
                        <div className="panel-title">Transaction Summary</div>
                        <div className="detail-grid">
                            {[["OR Number", issued.or_number], ["Taxpayer", `${issued.taxpayer.lastname}, ${issued.taxpayer.firstname}`], ["Paid By", issued.paid_by], ["TD No.", issued.properties?.map(p => p.td_number).join(", ") || "—"], ["Tax Year", issued.tax_year], ["Quarter(s)", issued.quarter_str], ["Basic RPT", fmt(issued.basic_tax)], ["SEF", fmt(issued.sef_tax)], ["Total", fmt(issued.total_paid)], ["Method", issued.payment_method], ["Cashier", issued.cashier || "—"]].map(([k, v]) => (
                                <div className="drow" key={k}><span className="dk">{k}</span><span className="dv">{v}</span></div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );

    return (
        <div>
            <div className="topbar">
                <div className="topbar-left"><h1>Collection</h1><p>REAL PROPERTY TAX PAYMENT PROCESSING</p></div>
            </div>
            <div className="page-body">

                <div className="steps">
                    {[["1", "Search Taxpayer"], ["2", "Select Property"], ["3", "Compute & Pay"], ["4", "Receipt"]].map(([n, l], i) => (
                        <div key={n} style={{ display: "flex", alignItems: "center" }}>
                            <div className={`step ${step === i + 1 ? "active" : step > i + 1 ? "done" : ""}`}>
                                <div className="step-num">{step > i + 1 ? "✓" : n}</div>
                                {l}
                            </div>
                            {i < 3 && <div className="step-sep" />}
                        </div>
                    ))}
                </div>

                {err && <div className="banner banner-err"><span className="banner-icon">⚠</span>{err}</div>}

                {step === 1 && (
                    <div className="panel" style={{ maxWidth: 520 }}>
                        <div className="panel-title">Search Property or Taxpayer</div>
                        <div className="form-group" style={{ marginBottom: 14 }}>
                            <label className="form-label">Property Index No. (PIN), TD Number, or Last Name</label>
                            <input value={q} onChange={e => setQ(e.target.value)} onKeyDown={e => e.key === "Enter" && search()} placeholder="e.g. 015-18-013-11-120" />
                        </div>
                        <button className="btn btn-gold" onClick={search}>Search →</button>
                    </div>
                )}

                {step === 2 && found && (
                    <div>
                        <div className="panel" style={{ maxWidth: 520, marginBottom: 16 }}>
                            <div className="panel-title">Taxpayer Verified</div>
                            <div className="detail-grid">
                                {[["Name", `${found.lastname}, ${found.firstname}`], ["Code", found.taxpayer_code], ["Address", found.address || "—"], ["Contact", found.contact_no || "—"]].map(([k, v]) => (
                                    <div className="drow" key={k}><span className="dk">{k}</span><span className="dv">{v}</span></div>
                                ))}
                            </div>
                        </div>
                        
                        <div className="panel" style={{ maxWidth: 520, marginBottom: 16, background: "var(--bg2)", border: "1px dashed var(--blue)" }}>
                            <div style={{ fontSize: 13, fontWeight: "bold", color: "var(--blue2)", marginBottom: 8 }}>✚ Add Another Property to this Receipt</div>
                            <div style={{ display: "flex", gap: "8px" }}>
                                <input 
                                    className="input"
                                    value={addQ} 
                                    onChange={e => setAddQ(e.target.value)} 
                                    onKeyDown={e => e.key === "Enter" && handleAddProperty()} 
                                    placeholder="Enter EXACT PIN or TD Number..." 
                                    style={{ flex: 1, padding: "8px" }}
                                />
                                <button className="btn btn-outline" onClick={handleAddProperty} disabled={addingProp}>
                                    {addingProp ? "..." : "Add Property"}
                                </button>
                            </div>
                        </div>
                        
                        <div className="panel-title" style={{ marginBottom: 12, paddingBottom: 0 }}>Select Property</div>
                        {propList.length === 0
                            ? <div className="empty"><div className="empty-icon">🏠</div><div className="empty-text">No properties on record</div></div>
                            : propList.map(p => (
                                <div className="prop-card" key={p.id} onClick={() => toggleProp(p)} style={{ border: selectedProps.find(x => x.id === p.id) ? "2px solid var(--blue2)" : "1px solid var(--border)" }}>
                                    <div className="prop-card-left">
                                        <h3>{p.td_number}  <span className="badge badge-blue">{p.classification}</span></h3>
                                        <p style={{ marginTop: "4px", fontWeight: "bold", color: "var(--blue2)" }}>PIN: {p.property_index_no || "—"}</p>
                                        <p>AV: {fmt(p.assessed_value)} · {p.barangay || "—"}</p>
                                    </div>
                                    <div><input type="checkbox" checked={!!selectedProps.find(x => x.id === p.id)} readOnly style={{ width: 22, height: 22, cursor: "pointer" }} /></div>
                                </div>
                            ))
                        }
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 16 }}>
                            <button className="btn btn-ghost btn-sm" onClick={() => setStep(1)}>← Back</button>
                            {propList.length > 0 && <button className="btn btn-primary" onClick={proceedWithSelected} disabled={selectedProps.length === 0}>Compute Selected ({selectedProps.length}) →</button>}
                        </div>
                    </div>
                )}

                {step === 3 && selectedProps.length > 0 && (
                    <div className="two-col">
                        <div>
                            {firstUnpaidYear < new Date().getFullYear() && (
                                <div className="banner banner-err" style={{ marginBottom: "16px" }}>
                                    <span className="banner-icon">⚖️</span>
                                    <span><strong>LGC Sec. 250 Enforced:</strong> Official delinquency detected starting <strong>{firstUnpaidYear}</strong>. By law, payments must first cover oldest delinquencies.</span>
                                </div>
                            )}

                            <div className="panel">
                                <div className="panel-title">Selected Properties ({selectedProps.length})</div>
                                <div className="table-wrap">
                                    <table>
                                        <thead><tr><th>TD No.</th><th>Classification</th><th style={{ textAlign: "right" }}>Assessed Value</th></tr></thead>
                                        <tbody>
                                            {selectedProps.map(p => (
                                                <tr key={p.id}>
                                                    <td style={{ fontWeight: "bold" }}>{p.td_number}</td>
                                                    <td>{p.classification}</td>
                                                    <td style={{ textAlign: "right", fontFamily: "monospace" }}>{fmt(p.assessed_value)}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                            <div className="panel">
                                <div className="panel-title">Payment Options</div>
                                <div className="form-grid" style={{ marginBottom: 14 }}>

                                    <div className="form-group span2" style={{ marginBottom: 8 }}>
                                        <label className="form-label">Accountable Officer (Cashier)</label>
                                        <select value={selectedCashier} onChange={e => setSelectedCashier(e.target.value)} className="input" style={{ width: "100%", padding: "10px" }}>
                                            <option value="" disabled>Select Cashier...</option>
                                            {cashierList.map(c => <option key={c.id} value={(c.full_name || "").toUpperCase()}>{(c.full_name || "").toUpperCase()}</option>)}
                                        </select>
                                    </div>

                                    <div className="form-group span2" style={{ marginBottom: 8, padding: "12px", background: "rgba(220, 38, 38, 0.05)", borderRadius: "8px", border: "1px dashed var(--red2)" }}>
                                        <label className="form-label" style={{ color: "var(--red2)", fontWeight: "bold" }}>Official Receipt (OR) Number *</label>
                                        <input
                                            readOnly
                                            value={nextOR}
                                            placeholder="Select a cashier to load OR..."
                                            style={{ border: "2px solid var(--red2)", fontWeight: "bold", background: "var(--bg2)", color: activeBooklet ? "inherit" : "var(--red2)" }}
                                        />
                                        {!activeBooklet && selectedCashier && <div style={{color: "var(--red2)", fontSize: "11px", marginTop: "4px"}}>This cashier has no active AF56 booklets. Assign one in Accountable Forms.</div>}
                                    </div>

                                    <div className="form-group">
                                        <label className="form-label">From</label>
                                        <div style={{ display: "flex", gap: "8px" }}>
                                            <input
                                                type="number"
                                                value={fromYear}
                                                onChange={(e) => setFromYear(e.target.value)}
                                                disabled={firstUnpaidYear < new Date().getFullYear()}
                                                title={firstUnpaidYear < new Date().getFullYear() ? "Locked by LGC Sec. 250" : ""}
                                                style={{
                                                    width: "80px", padding: "10px 8px", textAlign: "center",
                                                    background: firstUnpaidYear < new Date().getFullYear() ? "var(--bg3)" : "inherit",
                                                    color: firstUnpaidYear < new Date().getFullYear() ? "var(--text3)" : "inherit",
                                                    cursor: firstUnpaidYear < new Date().getFullYear() ? "not-allowed" : "text"
                                                }}
                                            />
                                            {/* 🌟 RESTORED: From Quarter Dropdown! */}
                                            <select value={fromQuarter} onChange={e => setFromQuarter(e.target.value)} style={{ flex: 1 }} disabled={allowPartial}>
                                                <option value="1">Q1 (Jan-Mar)</option>
                                                <option value="2">Q2 (Apr-Jun)</option>
                                                <option value="3">Q3 (Jul-Sep)</option>
                                                <option value="4">Q4 (Oct-Dec)</option>
                                            </select>
                                        </div>
                                    </div>

                                    <div className="form-group">
                                        <label className="form-label">To</label>
                                        <div style={{ display: "flex", gap: "8px" }}>
                                            <input type="number" value={toYear} onChange={(e) => setToYear(e.target.value)} min={fromYear} max={new Date().getFullYear() + 5} style={{ width: "80px", padding: "10px 8px", textAlign: "center" }} />
                                            {/* 🌟 RESTORED: To Quarter Dropdown! */}
                                            <select value={toQuarter} onChange={e => setToQuarter(e.target.value)} style={{ flex: 1 }} disabled={allowPartial}>
                                                <option value="1">Q1 (Jan-Mar)</option>
                                                <option value="2">Q2 (Apr-Jun)</option>
                                                <option value="3">Q3 (Jul-Sep)</option>
                                                <option value="4">Q4 (Oct-Dec)</option>
                                            </select>
                                        </div>
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label">Payment Method</label>
                                        <select value={method} onChange={e => setMethod(e.target.value)}>
                                            {["CASH", "CHECK", "GCASH", "MAYA", "LANDBANK", "DBP", "OTHER"].map(m => <option key={m}>{m}</option>)}
                                        </select>
                                    </div>
                                    {method === "CHECK" && (
                                        <div className="form-group">
                                            <label className="form-label">Check Number</label>
                                            <input value={checkNo} onChange={e => setCheckNo(e.target.value)} />
                                        </div>
                                    )}
                                    <div className="form-group">
                                        <label className="form-label" style={{ color: "var(--blue2)", fontWeight: "bold" }}>Actual Date Paid</label>
                                        <input
                                            type="date"
                                            value={paymentDate}
                                            onChange={e => setPaymentDate(e.target.value)}
                                            max={today()}
                                            style={{ border: "2px solid var(--blue2)" }}
                                        />
                                    </div>

                                    <div className="form-group">
                                        <label className="form-label" style={{ color: "var(--gold2)", fontWeight: "bold" }}>Remittance / RCD Date</label>
                                        <input
                                            type="date"
                                            value={remittanceDate}
                                            onChange={e => setRemittanceDate(e.target.value)}
                                            style={{ border: "2px solid var(--gold2)" }}
                                        />
                                        <div style={{ fontSize: "10px", color: "var(--text-muted)", marginTop: "4px" }}>
                                            Change this to tomorrow for after-cutoff payments!
                                        </div>
                                    </div>

                                    <div className="form-group span2" style={{ marginTop: "8px" }}>
                                        <label className="form-label">Paid By (Actual person paying)</label>
                                        <input
                                            value={paidBy}
                                            onChange={e => setPaidBy(e.target.value)}
                                            placeholder="e.g. Maria Santos (Sister) or Juan Dela Cruz (Son)"
                                        />
                                    </div>
                                </div>

                                <div style={{ marginTop: "24px", padding: "16px", background: "rgba(220, 38, 38, 0.05)", borderRadius: "8px", border: "1px dashed var(--red2)" }}>
                                    <label style={{ display: "flex", alignItems: "center", gap: "10px", fontWeight: "bold", cursor: "pointer", color: "var(--red2)" }}>
                                        <input type="checkbox" checked={allowPartial} onChange={e => setAllowPartial(e.target.checked)} style={{ width: "20px", height: "20px" }} />
                                        ENABLE PARTIAL PAYMENT OVERRIDE (e.g., For NIA / Subdivisions)
                                    </label>
                                    
                                    {allowPartial && (
                                        <div className="form-group" style={{ marginTop: "12px" }}>
                                            <label className="form-label">Required Remarks for Partial Payment (Prints on OR)</label>
                                            <input className="input" value={partialRemarks} onChange={e => setPartialRemarks(e.target.value)} placeholder="e.g. Partial payment for 2,000 sqm acquired by NIA..." style={{ border: "2px solid var(--red2)" }} />
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                        <div>
                            <div className="panel">
                                <div className="panel-title">Tax Computation</div>

                                <div className="table-wrap" style={{ marginBottom: 16 }}>
                                    <table style={{ fontSize: 11 }}>
                                        <thead><tr><th>Year</th><th>Basic</th><th>SEF</th><th>Pen/Disc</th><th>Total</th></tr></thead>
                                        <tbody>
                                            {displayCart.map(c => (
                                                <tr key={c.year} style={c.isPaid ? { backgroundColor: "var(--bg2)", opacity: 0.7 } : {}}>
                                                    <td><span className="chip">{c.display}</span></td>

                                                    {c.isPaid ? (
                                                        <td colSpan="4" style={{ textAlign: "center", fontSize: "12px", color: "var(--green2)", fontWeight: 700, letterSpacing: "1px" }}>
                                                            ALREADY FULLY PAID
                                                        </td>
                                                    ) : (
                                                        <>
                                                            <td>
                                                                {allowPartial ? (
                                                                    <input type="number" value={overrides[c.year]?.basic ?? c.defBasic} onChange={e => handleOverrideChange(c.year, 'basic', e.target.value)} style={{ width: "70px", padding: "4px", border: "1px solid var(--red2)", fontWeight: "bold" }} />
                                                                ) : fmt(c.basic)}
                                                            </td>
                                                            <td>
                                                                {allowPartial ? (
                                                                    <input type="number" value={overrides[c.year]?.sef ?? c.defSef} onChange={e => handleOverrideChange(c.year, 'sef', e.target.value)} style={{ width: "70px", padding: "4px", border: "1px solid var(--red2)", fontWeight: "bold" }} />
                                                                ) : fmt(c.sef)}
                                                            </td>
                                                            <td style={{ color: c.disc > 0 ? 'var(--green2)' : c.pen > 0 ? 'var(--red2)' : 'inherit' }}>
                                                                {c.disc > 0 ? `-${fmt(c.disc)}` : c.pen > 0 ? `+${fmt(c.pen)}` : "—"}
                                                            </td>
                                                            <td style={{ fontWeight: 700 }}>{fmt(c.total)}</td>
                                                        </>
                                                    )}

                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>

                                <div className="comp-row total">
                                    <span style={{ fontWeight: 700, fontSize: 14 }}>GRAND TOTAL DUE</span>
                                    <span className="cv" style={{ fontSize: 18 }}>{fmt(gTotal)}</span>
                                </div>
                                <div style={{ marginTop: 16, display: "flex", gap: 10 }}>
                                    <button className="btn btn-success" onClick={post} disabled={posting}>{posting ? <><span className="spin" />&nbsp;Posting…</> : "✓ Post Payment & Issue OR"}</button>
                                    <button className="btn btn-ghost" onClick={() => setStep(2)}>← Back</button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}