import { useState, useEffect, useCallback } from "react";
import { db, fmt } from "../utils/db";

function Counter({ value, isCurrency }) {
    return <span>{isCurrency ? fmt(value) : value}</span>;
}

export default function Delinquency({ token, profile }) {
    const [list, setList] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showCalc, setShowCalc] = useState(false);
    const [showAdd, setShowAdd] = useState(false);
    const [saving, setSaving] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const [recalculating, setRecalculating] = useState(false);
    const [generating, setGenerating] = useState(false);
    const [allProps, setAllProps] = useState([]);
    const [asmtHistory, setAsmtHistory] = useState([]);
    const [paidCollections, setPaidCollections] = useState([]);
    const [soaData, setSoaData] = useState(null);
    const [massSoaData, setMassSoaData] = useState(null);
    const [calcTax, setCalcTax] = useState("");
    const [calcMo, setCalcMo] = useState("");
    const [q, setQ] = useState("");
    const [brgyFilter, setBrgyFilter] = useState("");

    const [propSearch, setPropSearch] = useState("");

    const [waivePenalties, setWaivePenalties] = useState(false);
    const [shortTaxInput, setShortTaxInput] = useState(""); 

    const [form, setForm] = useState({
        property_id: "",
        from_year: String(new Date().getFullYear() - 5),
        to_year: String(new Date().getFullYear() - 1),
        target_month: String(new Date().getMonth() + 1)
    });

    const barangays = [
        "AMONTAY", "ANOS", "BUYAO", "CALANTAS", "CANDANGAL", "LAHING",
        "LUCTOB", "MABINI IBABA", "MABINI ILAYA", "MALABAHAY", "MAMBOG",
        "OLONGTAO IBABA", "OLONGTAO ILAYA", "PADRE HERRERA", "PAJARILLO",
        "PINAGBAYANAN", "SAN ISIDRO", "SAN JOSE", "SAN NICOLAS", "SAN VICENTE",
        "TAGUIN", "TUBIGAN IBABA", "TUBIGAN ILAYA", "VISTA HERMOSA",
        "CASTILLO (POB.)", "DAMAYAN (POB.)", "MASIPAG (POB.)", "PAG-ASA (POB.)",
        "RIZAL (POB.)", "RODRIGUEZ (POB.)"
    ];

    const rd = (num) => Math.floor((parseFloat(num) || 0) * 100 + 0.0001) / 100;

    const load = useCallback(async () => {
        try {
            let filterStr = "status=eq.UNPAID";

            if (q) {
                const props = await db.select("properties", { filter: `or=(property_index_no.ilike.*${q}*,td_number.ilike.*${q}*)`, select: "id" }, token);
                const propIds = props.map(p => p.id);
                const tps = await db.select("taxpayers", { filter: `or=(lastname.ilike.*${q}*,firstname.ilike.*${q}*,taxpayer_code.ilike.*${q}*)`, select: "id" }, token);
                const tpIds = tps.map(t => t.id);

                let orConditions = [];
                if (propIds.length > 0) orConditions.push(`property_id.in.(${propIds.join(',')})`);
                if (tpIds.length > 0) orConditions.push(`taxpayer_id.in.(${tpIds.join(',')})`);

                if (orConditions.length > 0) {
                    filterStr += `&or=(${orConditions.join(',')})`;
                } else {
                    setList([]); setLoading(false); return;
                }
            }

            const d = await db.select("delinquency", {
                filter: filterStr,
                select: "*,properties(td_number,classification,property_index_no,barangay),taxpayers(lastname,firstname,barangay,address)",
                order: "months_delinquent.desc"
            }, token);
            setList(d || []);
        } catch (e) { console.error(e); }
        setLoading(false);
    }, [token, q]);

    useEffect(() => { 
        // eslint-disable-next-line react-hooks/set-state-in-effect
        load(); 
    }, [load]);

    const handleGenerateReceivables = async () => {
        const suggestedYear = new Date().getFullYear();
        const inputYear = window.prompt("Enter the Tax Year you want to generate receivables for (e.g., 2026 or 2027):", suggestedYear);
        if (!inputYear) return;

        const targetYear = parseInt(inputYear);
        if (isNaN(targetYear) || targetYear < 2000 || targetYear > 2100) {
            alert("Please enter a valid year.");
            return;
        }

        if (!window.confirm(`⚠️ WARNING: Are you sure you want to mass-generate unpaid records for ALL active properties for the year ${targetYear}?`)) return;

        setGenerating(true);
        try {
            const props = await db.select("properties", { select: "id, taxpayer_id, assessed_value", limit: 50000 }, token);
            const existing = await db.select("delinquency", { filter: `tax_year=eq.${targetYear}`, select: "property_id", limit: 50000 }, token);
            const existingIds = new Set(existing.map(e => e.property_id));

            const payments = await db.select("collections", { 
                filter: `tax_year=eq.${targetYear}&is_voided=eq.false`, 
                select: "property_id, quarter", 
                limit: 50000 
            }, token);

            const paidIds = new Set(
                payments
                    .filter(p => p.quarter === "FULL" || String(p.quarter).includes("4"))
                    .map(p => p.property_id)
            );
            const toInsert = props.filter(p => !existingIds.has(p.id) && !paidIds.has(p.id));

            if (toInsert.length === 0) {
                alert(`All properties have already been billed for ${targetYear}!`);
                setGenerating(false);
                return;
            }

            const chunkSize = 500;
            let insertedCount = 0;

            for (let i = 0; i < toInsert.length; i += chunkSize) {
                const chunk = toInsert.slice(i, i + chunkSize).map(p => {
                    const av = parseFloat(p.assessed_value) || 0;
                    const tax = rd(av * 0.01);

                    return {
                        property_id: p.id,
                        taxpayer_id: p.taxpayer_id,
                        tax_year: targetYear,
                        unpaid_basic: tax,
                        unpaid_sef: tax,
                        months_delinquent: 0,
                        interest_amount: 0,
                        total_due: rd(tax + tax),
                        status: "UNPAID"
                    };
                });

                await db.insert("delinquency", chunk, token);
                insertedCount += chunk.length;
            }

            alert(`✅ Success! Generated new ${targetYear} receivables for ${insertedCount} properties.`);
            load(); 
        } catch (e) {
            alert("Failed to generate receivables: " + e.message);
        }
        setGenerating(false);
    };

    const loadProps = async () => {
        const d = await db.select("properties", { select: "id,td_number,property_index_no,taxpayer_id,assessed_value,barangay,taxpayers(lastname,firstname,barangay,address)", limit: 50000 }, token);
        setAllProps(d || []);
    };

    useEffect(() => {
        if (!form.property_id) { 
            // eslint-disable-next-line react-hooks/set-state-in-effect
            setAsmtHistory([]); 
            // eslint-disable-next-line react-hooks/set-state-in-effect
            setPaidCollections([]); 
            return; 
        }
        db.select("assessments", { filter: `property_id=eq.${form.property_id}`, order: "tax_year.desc" }, token)
            .then(d => setAsmtHistory(d || []));
        db.select("collections", { filter: `property_id=eq.${form.property_id}&is_voided=eq.false` }, token)
            .then(d => setPaidCollections(d || []));
    }, [form.property_id, token]);

    // 🌟 COMPUTATION GENERATOR (NEW RECORDS)
    const generateSOA = () => {
        const prop = allProps.find(p => p.id === parseInt(form.property_id));
        if (!prop) { alert("Please select a property first."); return; }

        const existingUnpaid = list.filter(d => d.property_id === prop.id);
        const currentYear = new Date().getFullYear();
        const payMonth = parseInt(form.target_month);
        let start = parseInt(form.from_year);
        let end = parseInt(form.to_year);
        if (start > end) { let temp = start; start = end; end = temp; }

        const shortYearsArray = shortTaxInput.split(",").map(s => parseInt(s.trim())).filter(n => !isNaN(n));

        let rows = [];
        let tBasic = 0, tSef = 0, tPen = 0, tDisc = 0, gTotal = 0, tAv = 0;
        let maxMos = 0, oldestAsmtId = null;

        for (let y = start; y <= end; y++) {
            if (existingUnpaid.some(d => parseInt(d.tax_year) === y)) continue;
            const isThisYearShort = shortYearsArray.includes(y);

            let activeAsmt = asmtHistory.find(a => parseInt(a.tax_year) <= y);
            let dbAsmt = activeAsmt || (asmtHistory.length > 0 ? asmtHistory[asmtHistory.length - 1] : null);
            if (y === start) oldestAsmtId = dbAsmt ? dbAsmt.id : null;

            const av = activeAsmt ? parseFloat(activeAsmt.assessed_value) : (prop?.assessed_value ? parseFloat(prop.assessed_value) : 0);
            const basic = activeAsmt ? parseFloat(activeAsmt.basic_tax) : (prop?.assessed_value ? rd(parseFloat(prop.assessed_value) * 0.01) : 0);
            const sef = activeAsmt ? parseFloat(activeAsmt.sef_tax) : (prop?.assessed_value ? rd(parseFloat(prop.assessed_value) * 0.01) : 0);

            const yearPayments = paidCollections.filter(c => parseInt(c.tax_year) === y);
            let paidQuarters = [];
            yearPayments.forEach(p => {
                const qTag = p.quarter;
                if (qTag === "FULL") paidQuarters.push(1, 2, 3, 4);
                else if (qTag && qTag.includes("-")) {
                    const parts = qTag.split("-");
                    for (let i = parseInt(parts[0].replace("Q", "")); i <= parseInt(parts[1].replace("Q", "")); i++) paidQuarters.push(i);
                } else if (qTag && qTag.startsWith("Q")) {
                    paidQuarters.push(parseInt(qTag.replace("Q", "")));
                }
            });

            if (paidQuarters.includes(1) && paidQuarters.includes(2) && paidQuarters.includes(3) && paidQuarters.includes(4)) continue;

            const qBaseBasic = rd(basic / 4);
            const qBaseSef = rd(sef / 4);
            const getQBasic = (q) => q === 4 ? rd(basic - (qBaseBasic * 3)) : qBaseBasic;
            const getQSef = (q) => q === 4 ? rd(sef - (qBaseSef * 3)) : qBaseSef;
            const getQDue = (q) => rd(getQBasic(q) + getQSef(q));
            const qDeadlines = [3, 6, 9, 12];

            // PUSH TO ROWS
            if (isThisYearShort) {
                let rBasic = 0, rSef = 0;
                [1, 2, 3, 4].forEach(q => { if (!paidQuarters.includes(q)) { rBasic += getQBasic(q); rSef += getQSef(q); } });
                rBasic = rd(rBasic); rSef = rd(rSef); const rTot = rd(rBasic + rSef);
                if (rTot > 0) {
                    rows.push({ year: y, customLabel: "(SHORT TAX)", av, penalty_percent: "SHORT TAX", basic: rBasic, sef: rSef, penalty: 0, discount: 0, total: rTot, is_short_tax: true, mos_late: 0, is_quarter_split: false });
                    tBasic += rBasic; tSef += rSef; gTotal += rTot; tAv += av;
                }
            } else if (y < currentYear) {
                const mosLate = ((currentYear - y) * 12) + payMonth;
                let calcRate = (y <= 1991) ? Math.min(mosLate * 0.02, 0.24) : Math.min(mosLate * 0.02, 0.72);
                let penLabel = waivePenalties ? "WAIVED" : `${(calcRate * 100).toFixed(0)}%`;

                let rBasic = 0, rSef = 0, rawPen = 0;
                [1, 2, 3, 4].forEach(q => {
                    if (!paidQuarters.includes(q)) {
                        rBasic += getQBasic(q); rSef += getQSef(q);
                        rawPen += waivePenalties ? 0 : (getQDue(q) * calcRate);
                    }
                });
                rBasic = rd(rBasic); rSef = rd(rSef); let rPen = rd(rawPen); const rTot = rd(rBasic + rSef + rPen);
                if (rTot > 0) {
                    rows.push({ year: y, customLabel: "", av, penalty_percent: penLabel, basic: rBasic, sef: rSef, penalty: rPen, discount: 0, total: rTot, is_short_tax: false, mos_late: mosLate, is_quarter_split: false });
                    tBasic += rBasic; tSef += rSef; tPen += rPen; gTotal += rTot; tAv += av;
                }
                if (mosLate > maxMos) maxMos = mosLate;

            } else if (y === currentYear) {
                let lateQs = [], promptQs = [];
                [1, 2, 3, 4].forEach(q => {
                    if (!paidQuarters.includes(q)) {
                        if (payMonth <= qDeadlines[q - 1]) promptQs.push(q);
                        else lateQs.push(q);
                    }
                });

                if (lateQs.length > 0) {
                    let rBasic = 0, rSef = 0, rawPen = 0;
                    let currRate = Math.min(payMonth * 0.02, 0.72);
                    lateQs.forEach(q => {
                        rBasic += getQBasic(q); rSef += getQSef(q);
                        rawPen += waivePenalties ? 0 : (getQDue(q) * currRate);
                    });
                    rBasic = rd(rBasic); rSef = rd(rSef); let rPen = rd(rawPen); const rTot = rd(rBasic + rSef + rPen);
                    const tag = lateQs.length === 1 ? `Q${lateQs[0]}` : `Q${lateQs[0]}-Q${lateQs[lateQs.length-1]}`;
                    const penLabel = waivePenalties ? "WAIVED" : `${(currRate * 100).toFixed(0)}%`;
                    rows.push({ year: y, customLabel: `(${tag})`, av, penalty_percent: penLabel, basic: rBasic, sef: rSef, penalty: rPen, discount: 0, total: rTot, is_short_tax: false, mos_late: payMonth, is_quarter_split: true });
                    tBasic += rBasic; tSef += rSef; tPen += rPen; gTotal += rTot; tAv += av;
                }
                if (promptQs.length > 0) {
                    let rBasic = 0, rSef = 0, rawDisc = 0;
                    promptQs.forEach(q => {
                        rBasic += getQBasic(q); rSef += getQSef(q);
                        rawDisc += getQDue(q) * 0.10;
                    });
                    rBasic = rd(rBasic); rSef = rd(rSef); let rDisc = rd(rawDisc); const rTot = rd(rBasic + rSef - rDisc);
                    const tag = promptQs.length === 1 ? `Q${promptQs[0]}` : `Q${promptQs[0]}-Q${promptQs[promptQs.length-1]}`;
                    rows.push({ year: y, customLabel: `(${tag})`, av, penalty_percent: "10% DISC", basic: rBasic, sef: rSef, penalty: 0, discount: rDisc, total: rTot, is_short_tax: false, mos_late: 0, is_quarter_split: true });
                    tBasic += rBasic; tSef += rSef; tDisc += rDisc; gTotal += rTot; tAv += av;
                }
            } else {
                let rBasic = 0, rSef = 0, rawDisc = 0;
                [1, 2, 3, 4].forEach(q => {
                    if (!paidQuarters.includes(q)) {
                        rBasic += getQBasic(q); rSef += getQSef(q);
                        rawDisc += getQDue(q) * (payMonth <= 9 ? 0.15 : 0.10);
                    }
                });
                rBasic = rd(rBasic); rSef = rd(rSef); let rDisc = rd(rawDisc); const rTot = rd(rBasic + rSef - rDisc);
                const discLabel = payMonth <= 9 ? "15% DISC" : "10% DISC";
                rows.push({ year: y, customLabel: "", av, penalty_percent: discLabel, basic: rBasic, sef: rSef, penalty: 0, discount: rDisc, total: rTot, is_short_tax: false, mos_late: 0, is_quarter_split: false });
                tBasic += rBasic; tSef += rSef; tDisc += rDisc; gTotal += rTot; tAv += av;
            }
        }

        if (rows.length === 0) { alert("This property is already fully paid for the selected years!"); return; }

        // 🌟 PERFECT GROUPING LOGIC (Preserves Past Years & Keeps Current Year Split)
        let displayRows = [];
        if (rows.length > 0) {
            let curr = { ...rows[0], startYear: rows[0].year, endYear: rows[0].year, count: 1 };
            for (let i = 1; i < rows.length; i++) {
                const row = rows[i];
                if (row.av === curr.av && 
                    row.penalty_percent === curr.penalty_percent && 
                    row.year === curr.endYear + 1 && 
                    !row.is_quarter_split && 
                    !curr.is_quarter_split &&
                    row.customLabel === curr.customLabel) {
                    
                    curr.endYear = row.year; curr.count++; curr.basic += row.basic; curr.sef += row.sef;
                    curr.penalty += row.penalty; curr.discount += row.discount; curr.total += row.total;
                } else {
                    displayRows.push(curr);
                    curr = { ...row, startYear: row.year, endYear: row.year, count: 1 };
                }
            }
            displayRows.push(curr);
        }

        setSoaData({
            property: prop, oldestAsmtId, start_year: start, end_year: end, target_month: payMonth, max_months: maxMos,
            rows, displayRows,
            totals: { av: rd(tAv), basic: rd(tBasic), sef: rd(tSef), penalty: rd(tPen), discount: rd(tDisc), total: rd(gTotal) }
        });
    };

    const saveSOA = async () => {
        setSaving(true);
        try {
            const rowsToInsert = soaData.rows.map(r => ({
                assessment_id: soaData.oldestAsmtId, property_id: soaData.property.id, taxpayer_id: soaData.property.taxpayer_id,
                tax_year: parseInt(r.year), unpaid_basic: r.basic, unpaid_sef: r.sef, 
                months_delinquent: r.is_short_tax ? -1 : Math.min(r.mos_late || 0, 36),
                interest_amount: r.penalty, total_due: r.total, status: "UNPAID"
            }));
            await db.insert("delinquency", rowsToInsert, token);
            setSoaData(null); setShowAdd(false); setShortTaxInput(""); load();
        } catch (e) { alert(e.message); }
        setSaving(false);
    };

    const handleDeleteGroup = async (group) => {
        if (!window.confirm(`Permanently delete ALL unpaid delinquency records for PIN ${group.properties?.property_index_no || "this property"}?`)) return;
        setDeleting(true);
        try {
            await db.delete("delinquency", { filter: `id=in.(${group.rowIds.join(',')})` }, token);
            load();
        } catch (e) { alert("Delete failed: " + e.message); }
        setDeleting(false);
    };

    // 🌟 FORMAT SOA ROWS (SAVED RECORDS)
    const formatSOARows = (details, targetMonth) => {
        const currentYear = new Date().getFullYear();
        
        // 🌟 THE FIX: Combine all fragmented DB records into ONE full year BEFORE calculating
        const yearMap = {};
        details.forEach(d => {
            const y = parseInt(d.tax_year);
            if (!yearMap[y]) {
                yearMap[y] = { 
                    year: y,
                    unpaid_basic: 0,
                    unpaid_sef: 0,
                    interest_amount: 0,
                    total_due: 0,
                    isSavedShortTax: parseInt(d.months_delinquent) === -1
                };
            }
            yearMap[y].unpaid_basic += parseFloat(d.unpaid_basic) || 0;
            yearMap[y].unpaid_sef += parseFloat(d.unpaid_sef) || 0;
            yearMap[y].interest_amount += parseFloat(d.interest_amount) || 0;
            yearMap[y].total_due += parseFloat(d.total_due) || 0;
            if (parseInt(d.months_delinquent) === -1) yearMap[y].isSavedShortTax = true;
        });

        // Now we loop through our perfectly combined years
        const sortedYears = Object.values(yearMap).sort((a, b) => a.year - b.year);
        let tAv = 0;
        let detailedRows = [];

        sortedYears.forEach(d => {
            const y = d.year;
            const basic = rd(d.unpaid_basic);
            const sef = rd(d.unpaid_sef);
            
            // 🌟 Because the basics are combined, this will correctly equal 1,561,000
            const av = rd(basic / 0.01); 
            tAv += av;

            let penalty = rd(d.interest_amount);
            let total = rd(d.total_due);

            if (d.isSavedShortTax) {
                detailedRows.push({ year: y, customLabel: "(SHORT TAX)", av, penalty_percent: "SHORT TAX", basic, sef, penalty: 0, discount: 0, total: rd(basic + sef), is_quarter_split: false });
            } else if (waivePenalties) {
                detailedRows.push({ year: y, customLabel: "", av, penalty_percent: "WAIVED", basic, sef, penalty: 0, discount: 0, total: rd(basic + sef), is_quarter_split: false });
            } else if (y === currentYear) {
                const qDeadlines = [3, 6, 9, 12];
                let lateCount = 0;
                [1, 2, 3, 4].forEach(q => { if (targetMonth > qDeadlines[q - 1]) lateCount++; });

                if (lateCount > 0 && lateCount < 4) {
                    const lateBasic = rd(basic * (lateCount / 4));
                    const lateSef = rd(sef * (lateCount / 4));
                    
                    // Recalculate exact penalty to ensure perfect balance
                    const currRate = Math.min(targetMonth * 0.02, 0.72);
                    const latePen = rd((lateBasic + lateSef) * currRate);

                    const promptBasic = rd(basic - lateBasic);
                    const promptSef = rd(sef - lateSef);
                    const promptDisc = rd((promptBasic + promptSef) * 0.10);

                    detailedRows.push({ year: y, customLabel: `(Q1-Q${lateCount})`, av, penalty_percent: `${(targetMonth * 2)}%`, basic: lateBasic, sef: lateSef, penalty: latePen, discount: 0, total: rd(lateBasic + lateSef + latePen), is_quarter_split: true });
                    detailedRows.push({ year: y, customLabel: `(Q${lateCount+1}-Q4)`, av, penalty_percent: "10% DISC", basic: promptBasic, sef: promptSef, penalty: 0, discount: promptDisc, total: rd(promptBasic + promptSef - promptDisc), is_quarter_split: true });
                } else if (lateCount === 4) {
                    detailedRows.push({ year: y, customLabel: "", av, penalty_percent: `${(targetMonth * 2)}%`, basic, sef, penalty, discount: 0, total, is_quarter_split: false });
                } else {
                    let disc = rd((basic + sef) * 0.10);
                    detailedRows.push({ year: y, customLabel: "", av, penalty_percent: "10% DISC", basic, sef, penalty: 0, discount: disc, total: rd(basic + sef - disc), is_quarter_split: false });
                }
            } else {
                let mosLate = ((currentYear - y) * 12) + targetMonth;
                let penRate = (y <= 1991) ? Math.min(mosLate * 0.02, 0.24) : Math.min(mosLate * 0.02, 0.72);
                detailedRows.push({ year: y, customLabel: "", av, penalty_percent: `${(penRate * 100).toFixed(0)}%`, basic, sef, penalty, discount: 0, total, is_quarter_split: false });
            }
        });

        // 🌟 PERFECT GROUPING LOGIC
        let displayRows = [];
        if (detailedRows.length > 0) {
            let curr = { ...detailedRows[0], startYear: detailedRows[0].year, endYear: detailedRows[0].year, count: 1 };
            for (let i = 1; i < detailedRows.length; i++) {
                const row = detailedRows[i];
                if (row.av === curr.av && 
                    row.penalty_percent === curr.penalty_percent && 
                    row.year === curr.endYear + 1 && 
                    !row.is_quarter_split && 
                    !curr.is_quarter_split &&
                    row.customLabel === curr.customLabel) {
                    
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
        return { detailedRows, displayRows, tAv, totalDisc };
    };

    const viewSavedSOA = (group) => {
        const inputMonth = window.prompt(`Enter target month (1-12) to compute SOA for ${group.taxpayers?.lastname || "this property"}:`, new Date().getMonth() + 1);
        if (inputMonth === null) return; 
        const targetMonth = parseInt(inputMonth);
        if (isNaN(targetMonth) || targetMonth < 1 || targetMonth > 12) { alert("Invalid month."); return; }

        const { detailedRows, displayRows, tAv, totalDisc } = formatSOARows(group.details, targetMonth);
        
        const finalBasic = rd(detailedRows.reduce((a, r) => a + r.basic, 0));
        const finalSef = rd(detailedRows.reduce((a, r) => a + r.sef, 0));
        const finalPenalty = rd(detailedRows.reduce((a, r) => a + r.penalty, 0));
        const finalTotal = rd(detailedRows.reduce((a, r) => a + r.total, 0));

        setSoaData({
            isSavedRecord: true, property: { id: group.property_id, td_number: group.properties?.td_number, property_index_no: group.properties?.property_index_no, barangay: group.properties?.barangay, taxpayer_id: group.taxpayer_id, taxpayers: group.taxpayers },
            start_year: group.minYear, end_year: group.maxYear, target_month: targetMonth, rows: detailedRows, displayRows: displayRows,
            totals: { av: rd(tAv), basic: finalBasic, sef: finalSef, penalty: finalPenalty, discount: totalDisc, total: finalTotal }
        });
    };

    const calcExactPenAndDisc = (y, basic, sef, targetMonth) => {
        if (waivePenalties) return { pen: 0, disc: 0 };

        const currentYear = new Date().getFullYear();
        const qBaseBasic = rd(basic / 4);
        const qBaseSef = rd(sef / 4);
        const getQBasic = (q) => q === 4 ? rd(basic - (qBaseBasic * 3)) : qBaseBasic;
        const getQSef = (q) => q === 4 ? rd(sef - (qBaseSef * 3)) : qBaseSef;
        const getQDue = (q) => rd(getQBasic(q) + getQSef(q));

        let rawPen = 0;  
        let rawDisc = 0; 

        if (y < currentYear) {
            const mosLate = ((currentYear - y) * 12) + targetMonth;
            const penaltyRate = (y <= 1991) ? Math.min(mosLate * 0.02, 0.24) : Math.min(mosLate * 0.02, 0.72);
            [1, 2, 3, 4].forEach(q => { rawPen += getQDue(q) * penaltyRate; });
        } else if (y === currentYear) {
            const qDeadlines = [3, 6, 9, 12];
            [1, 2, 3, 4].forEach(q => {
                const dueMo = qDeadlines[q - 1];
                if (targetMonth <= dueMo) {
                    rawDisc += getQDue(q) * 0.10;
                } else {
                    let currRate = Math.min(targetMonth * 0.02, 0.72);
                    rawPen += getQDue(q) * currRate;
                }
            });
        } else {
            [1, 2, 3, 4].forEach(q => {
                if (targetMonth <= 9) rawDisc += getQDue(q) * 0.15;
                else rawDisc += getQDue(q) * 0.10;
            });
        }

        return { pen: rd(rawPen), disc: rd(rawDisc) };
    };

    const handleRecalculate = async (group) => {
        const inputMonth = window.prompt(`Enter target month (1-12) to calculate penalties for ${group.taxpayers?.lastname}:`, new Date().getMonth() + 1);
        if (inputMonth === null) return;
        const targetMonth = parseInt(inputMonth);
        if (isNaN(targetMonth) || targetMonth < 1 || targetMonth > 12) { alert("Invalid month. Please enter a number between 1 and 12."); return; }

        setRecalculating(true);
        try {
            for (const row of group.details) {
                if (parseInt(row.months_delinquent) === -1) {
                    const newTot = rd(parseFloat(row.unpaid_basic) + parseFloat(row.unpaid_sef));
                    if (parseFloat(row.interest_amount) !== 0 || parseFloat(row.total_due) !== newTot) {
                        await db.update("delinquency", { interest_amount: 0, total_due: newTot }, { filter: `id=eq.${row.id}` }, token);
                    }
                    continue; 
                }

                const y = parseInt(row.tax_year);
                const basic = parseFloat(row.unpaid_basic) || 0;
                const sef = parseFloat(row.unpaid_sef) || 0;

                const { pen, disc } = calcExactPenAndDisc(y, basic, sef, targetMonth);
                const newTot = rd(rd(basic + sef) + pen - disc);

                if (pen !== parseFloat(row.interest_amount) || newTot !== parseFloat(row.total_due)) {
                    await db.update("delinquency", { interest_amount: pen, total_due: newTot }, { filter: `id=eq.${row.id}` }, token);
                }
            }
            load();
        } catch (e) { alert("Error recalculating: " + e.message); }
        setRecalculating(false);
    };

    const groupedList = Object.values(list.reduce((acc, d) => {
        const pid = d.property_id;
        if (!acc[pid]) {
            acc[pid] = { ...d, minYear: parseInt(d.tax_year), maxYear: parseInt(d.tax_year), sum_basic: 0, sum_sef: 0, sum_int: 0, sum_total: 0, rowIds: [], details: [] };
        }
        acc[pid].minYear = Math.min(acc[pid].minYear, parseInt(d.tax_year)); acc[pid].maxYear = Math.max(acc[pid].maxYear, parseInt(d.tax_year));
        acc[pid].sum_basic += parseFloat(d.unpaid_basic) || 0; acc[pid].sum_sef += parseFloat(d.unpaid_sef) || 0;
        acc[pid].sum_int += parseFloat(d.interest_amount) || 0; acc[pid].sum_total += parseFloat(d.total_due) || 0;
        acc[pid].rowIds.push(d.id); acc[pid].details.push(d);
        return acc;
    }, {}));

    const filteredGroupedList = groupedList.filter(g => brgyFilter === "" || (g.properties?.barangay && g.properties.barangay.toUpperCase() === brgyFilter.toUpperCase()));
    
    const totals = filteredGroupedList.reduce((a, d) => ({ 
        due: a.due + (waivePenalties ? (d.sum_basic + d.sum_sef) : d.sum_total), 
        int: a.int + (waivePenalties ? 0 : d.sum_int) 
    }), { due: 0, int: 0 });

    const handleBatchRecalculate = async () => {
        if (filteredGroupedList.length === 0) { alert("No accounts displayed to recalculate."); return; }
        const inputMonth = window.prompt(`Enter target month (1-12) to calculate penalties for ALL ${filteredGroupedList.length} displayed accounts:`, new Date().getMonth() + 1);
        if (inputMonth === null) return;
        const targetMonth = parseInt(inputMonth);
        if (isNaN(targetMonth) || targetMonth < 1 || targetMonth > 12) { alert("Invalid month."); return; }

        if (!window.confirm(`This will recalculate penalties for ${filteredGroupedList.length} properties to match Month ${targetMonth}, ${new Date().getFullYear()}. Proceed?`)) return;

        setRecalculating(true);
        try {
            let updateCount = 0;
            for (const group of filteredGroupedList) {
                for (const row of group.details) {
                    if (parseInt(row.months_delinquent) === -1) {
                        const newTot = rd(parseFloat(row.unpaid_basic) + parseFloat(row.unpaid_sef));
                        if (parseFloat(row.interest_amount) !== 0 || parseFloat(row.total_due) !== newTot) {
                            await db.update("delinquency", { interest_amount: 0, total_due: newTot }, { filter: `id=eq.${row.id}` }, token);
                            updateCount++;
                        }
                        continue; 
                    }

                    const y = parseInt(row.tax_year);
                    const basic = parseFloat(row.unpaid_basic) || 0;
                    const sef = parseFloat(row.unpaid_sef) || 0;

                    const { pen, disc } = calcExactPenAndDisc(y, basic, sef, targetMonth);
                    const newTot = rd(rd(basic + sef) + pen - disc);

                    if (pen !== parseFloat(row.interest_amount) || newTot !== parseFloat(row.total_due)) {
                        await db.update("delinquency", { interest_amount: pen, total_due: newTot }, { filter: `id=eq.${row.id}` }, token);
                        updateCount++;
                    }
                }
            }
            load();
            alert(`Batch recalculation complete! Updated ${updateCount} individual year records.`);
        } catch (e) { alert("Error recalculating: " + e.message); }
        setRecalculating(false);
    };

    const prepareMassSOA = () => {
        if (filteredGroupedList.length === 0) { alert("No accounts displayed to print."); return; }

        const inputMonth = window.prompt(`Enter target month (1-12) for Mass SOA computation:`, new Date().getMonth() + 1);
        if (inputMonth === null) return;
        const targetMonth = parseInt(inputMonth);
        if (isNaN(targetMonth) || targetMonth < 1 || targetMonth > 12) { alert("Invalid month."); return; }

        const massData = filteredGroupedList.map(group => {
            const { detailedRows, displayRows, tAv, totalDisc } = formatSOARows(group.details, targetMonth);
            
            const finalBasic = rd(detailedRows.reduce((a, r) => a + r.basic, 0));
            const finalSef = rd(detailedRows.reduce((a, r) => a + r.sef, 0));
            const finalPenalty = rd(detailedRows.reduce((a, r) => a + r.penalty, 0));
            const finalTotal = rd(detailedRows.reduce((a, r) => a + r.total, 0));

            return {
                property: { id: group.property_id, td_number: group.properties?.td_number, property_index_no: group.properties?.property_index_no, barangay: group.properties?.barangay, taxpayer_id: group.taxpayer_id, taxpayers: group.taxpayers },
                start_year: group.minYear, end_year: group.maxYear, target_month: targetMonth, rows: detailedRows, displayRows: displayRows,
                totals: { av: rd(tAv), basic: finalBasic, sef: finalSef, penalty: finalPenalty, discount: totalDisc, total: finalTotal }
            };
        });
        setMassSoaData(massData);
    };

    const preparedByName = profile?.full_name ? profile.full_name.toUpperCase() : "AUTHORIZED STAFF";
    const preparedByRole = profile?.position ? profile.position.toUpperCase() : (profile?.role ? profile.role.toUpperCase() : "MTO PERSONNEL");

    const filteredProps = allProps.filter(p => {
        if (!propSearch) return true;
        const term = propSearch.toLowerCase().trim();
        return (
            (p.property_index_no || "").toLowerCase().includes(term) ||
            (p.td_number || "").toLowerCase().includes(term) ||
            (p.taxpayers?.lastname || "").toLowerCase().includes(term) ||
            (p.taxpayers?.firstname || "").toLowerCase().includes(term)
        );
    });

    return (
        <>
            <div className="topbar">
                <div className="topbar-left"><h1>Delinquency Monitor</h1><p>INTEREST = UNPAID × 2% × MONTHS (MAX 36)</p></div>
                <div className="topbar-right">
                    <button className="btn btn-outline" onClick={() => setShowCalc(!showCalc)}>🧮 Calculator</button>
                    {["admin", "treasurer", "assessor"].includes(profile?.role) && <button className="btn btn-gold" onClick={() => { setShowAdd(!showAdd); loadProps(); setWaivePenalties(false); setShortTaxInput(""); }}>＋ Add Record</button>}
                </div>
            </div>

            <div className="stat-row" style={{ gridTemplateColumns: "repeat(3,1fr)" }}>
                {[
                    { label: "Filtered Accounts", value: filteredGroupedList.length, color: "red", icon: "⚠️", isCur: false },
                    { label: "Total Penalties", value: totals.int, color: "gold", icon: "📊", isCur: true },
                    { label: "Total Amount Due", value: totals.due, color: "blue", icon: "💸", isCur: true },
                ].map(s => (
                    <div className="stat-card" key={s.label}>
                        <div className={`stat-accent ${s.color}`} />
                        <div className={`stat-icon-bg ${s.color}`}>{s.icon}</div>
                        <div className="stat-label">{s.label}</div>
                        <div className="stat-value"><Counter value={s.value} isCurrency={s.isCur} /></div>
                    </div>
                ))}
            </div>

            <div className="page-body">
                {showCalc && (
                    <div className="panel" style={{ maxWidth: 560, marginBottom: 16 }}>
                        <div className="panel-title">Delinquency Interest Calculator</div>
                        <div className="form-grid-3" style={{ marginBottom: 14 }}>
                            <div className="form-group"><label className="form-label">Unpaid Tax Amount (₱)</label><input type="number" value={calcTax} onChange={e => setCalcTax(e.target.value)} placeholder="10000" /></div>
                            <div className="form-group"><label className="form-label">Months Delinquent (max 36)</label><input type="number" max={36} value={calcMo} onChange={e => setCalcMo(e.target.value)} placeholder="12" /></div>
                            <div className="form-group"><label className="form-label">Interest Amount</label><div style={{ background: "var(--bg3)", border: "1px solid var(--border2)", padding: "10px 14px", borderRadius: 9, fontFamily: "var(--font-mono)", fontWeight: 700, color: "var(--gold2)", fontSize: 14 }}>{calcTax && calcMo ? fmt(rd(parseFloat(calcTax) * 0.02 * Math.min(parseInt(calcMo), 36))) : "—"}</div></div>
                        </div>
                        {calcTax && calcMo && (<div className="banner banner-gold" style={{ background: "var(--gold-dim)", border: "1px solid rgba(212,168,67,.2)", color: "var(--gold2)" }}><span className="banner-icon">🧮</span>Total Due: <strong>{fmt(rd(parseFloat(calcTax) + rd(parseFloat(calcTax) * 0.02 * Math.min(parseInt(calcMo), 36))))}</strong></div>)}
                    </div>
                )}

                {showAdd && (
                    <div className="panel" style={{ marginBottom: 16 }}>
                        <div className="panel-title">Add Delinquency Record</div>
                        <div className="form-grid" style={{ marginBottom: 14 }}>

                            <div className="form-group span2">
                                <label className="form-label">Search & Select Delinquent Property</label>
                                <input
                                    type="text"
                                    placeholder="🔍 Type PIN, TD No., or Owner Name to filter list..."
                                    value={propSearch}
                                    onChange={e => setPropSearch(e.target.value)}
                                    style={{ marginBottom: "6px", borderColor: "var(--blue)" }}
                                />

                                <select
                                    value={form.property_id}
                                    onChange={e => setForm(f => ({ ...f, property_id: e.target.value }))}
                                    size={propSearch ? 5 : undefined}
                                    style={{ width: "100%" }}
                                >
                                    <option value="">— Select property —</option>
                                    {filteredProps.map(p => (
                                        <option key={p.id} value={p.id}>
                                            PIN: {p.property_index_no || "—"} | Loc: {p.barangay || "—"} | Owner: {p.taxpayers?.lastname}, {p.taxpayers?.firstname}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div className="form-group"><label className="form-label">From Year</label><input type="number" value={form.from_year} onChange={e => setForm(f => ({ ...f, from_year: e.target.value }))} /></div>
                            <div className="form-group"><label className="form-label">To Year</label><input type="number" value={form.to_year} onChange={e => setForm(f => ({ ...f, to_year: e.target.value }))} /></div>
                            <div className="form-group span2">
                                <label className="form-label">Target Payment Month</label>
                                <select value={form.target_month} onChange={e => setForm(f => ({ ...f, target_month: e.target.value }))}>
                                    {["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"].map((m, i) => <option key={i + 1} value={i + 1}>{m}</option>)}
                                </select>
                            </div>

                            <div className="form-group span2" style={{ marginTop: "10px", display: "flex", gap: "20px", alignItems: "flex-start" }}>
                                <label style={{ display: "flex", alignItems: "center", gap: "8px", fontWeight: "bold", color: "var(--gold2)", cursor: "pointer", marginTop: "8px" }}>
                                    <input type="checkbox" checked={waivePenalties} onChange={e => setWaivePenalties(e.target.checked)} style={{ width: "18px", height: "18px" }} />
                                    Waive All Penalties (Amnesty)
                                </label>
                                <div style={{ flex: 1 }}>
                                    <label className="form-label" style={{ color: "var(--blue2)" }}>Short Tax Year(s)</label>
                                    <input 
                                        type="text" 
                                        placeholder="e.g. 2020, 2021 (Separate multiple years with commas)" 
                                        value={shortTaxInput} 
                                        onChange={e => setShortTaxInput(e.target.value)} 
                                        style={{ borderColor: "var(--blue2)" }}
                                    />
                                    <div style={{ fontSize: "11px", color: "var(--text3)", marginTop: "4px" }}>Years entered here will be permanently billed with 0% penalty.</div>
                                </div>
                            </div>

                        </div>
                        <div className="gap-row">
                            <button className="btn btn-primary" onClick={generateSOA}>🧮 Compute & View SOA</button>
                            <button className="btn btn-outline" onClick={() => setShowAdd(false)}>Cancel</button>
                        </div>
                    </div>
                )}

                {/* SINGLE SOA PRINT MODAL */}
                {soaData && !massSoaData && (
                    <>
                        <style>{`
                          @media print {
                            @page { size: A4 portrait; margin: 15mm; }
                            body * { visibility: hidden !important; }
                            .soa-print-area, .soa-print-area * { visibility: visible !important; color: #000 !important; }
                            .soa-print-area { position: absolute !important; left: 0 !important; top: 0 !important; width: 100% !important; background: #fff !important; box-shadow: none !important; border: none !important; margin: 0 !important; padding: 0 !important; max-height: none !important; overflow: visible !important; }
                            .no-print { display: none !important; }
                            table { page-break-inside: auto; width: 100% !important; margin: 0 auto; }
                            tr { page-break-inside: avoid; page-break-after: auto; }
                            thead { display: table-header-group; }
                            .soa-print-area th { background-color: #fff !important; color: #000 !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
                            .soa-print-area th, .soa-print-area td { font-size: 10pt !important; padding: 4px !important; }
                          }
                        `}</style>
                        <div className="modal-backdrop" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.8)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
                            <div className="card soa-print-area" style={{ width: "850px", maxWidth: "100%", maxHeight: "90vh", overflowY: "auto", background: "#fff", color: "#000", fontFamily: "Arial, sans-serif" }}>
                                <div className="card-header no-print" style={{ borderBottom: "1px solid #ccc", background: "#f8f9fa" }}>
                                    <div><div className="card-title">Statement of Account (SOA)</div></div>
                                    <button className="btn btn-ghost btn-sm" onClick={() => setSoaData(null)}>✕ Close</button>
                                </div>
                                <div className="card-body" style={{ padding: "40px 50px" }}>

                                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "25px", borderBottom: "2px solid #000", paddingBottom: "15px" }}>
                                        <img src="https://i.postimg.cc/VktjPybt/macalelon-logo.png" alt="LGU Logo" style={{ width: "80px", height: "80px", objectFit: "contain" }} />
                                        <div style={{ textAlign: "center", flex: 1 }}>
                                            <div style={{ fontSize: "11pt" }}>Republic of the Philippines</div>
                                            <div style={{ fontSize: "11pt" }}>Province of Quezon</div>
                                            <div style={{ fontSize: "11pt", fontWeight: "bold" }}>MUNICIPALITY OF MACALELON</div>
                                            <div style={{ fontSize: "11pt", fontWeight: "bold", marginTop: "10px" }}>OFFICE OF THE MUNICIPAL TREASURER</div>
                                        </div>
                                        <div style={{ width: "80px" }}></div>
                                    </div>

                                    <div style={{ textAlign: "left", marginBottom: "25px", fontSize: "10pt", lineHeight: "1.6" }}>
                                        <div style={{ borderBottom: "1px solid #000", display: "inline-block", minWidth: "350px", fontWeight: "bold" }}>
                                            {soaData.property.taxpayers?.firstname} {soaData.property.taxpayers?.lastname}
                                        </div><br />
                                        <div style={{ borderBottom: "1px solid #000", display: "inline-block", minWidth: "350px" }}>
                                            {soaData.property.taxpayers?.address || soaData.property.taxpayers?.barangay || "—"}
                                        </div><br />
                                        <div style={{ borderBottom: "1px solid #000", display: "inline-block", minWidth: "350px" }}>MACALELON, QUEZON</div>
                                    </div>

                                    <div style={{ textAlign: "left", fontSize: "10pt", marginBottom: "15px" }}>Sir/Madam:</div>
                                    <div style={{ textIndent: "40px", fontSize: "10pt", textAlign: "justify", marginBottom: "15px" }}>
                                        This is to inform you that our records show that the Real Estate tax due on the Property/ies registered in your name listed remain unpaid as of follows;
                                    </div>

                                    <table style={{ width: "100%", margin: "0 auto", borderCollapse: "collapse", border: "2px solid #000", fontSize: "10pt", textAlign: "center", marginBottom: "10px" }}>
                                        <thead>
                                            <tr>
                                                <th rowSpan="2" style={{ border: "1px solid #000", padding: "4px" }}>PIN No.</th>
                                                <th rowSpan="2" style={{ border: "1px solid #000", padding: "4px" }}>BRGY.</th>
                                                <th rowSpan="2" style={{ border: "1px solid #000", padding: "4px" }}>YEAR</th>
                                                <th rowSpan="2" style={{ border: "1px solid #000", padding: "4px" }}>ASSESSED<br />VALUE</th>
                                                <th rowSpan="2" style={{ border: "1px solid #000", padding: "4px" }}>No. of<br />Years</th>
                                                <th rowSpan="2" style={{ border: "1px solid #000", padding: "4px" }}>% of<br />Penalty</th>
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
                                            {soaData.displayRows.map((row, idx) => (
                                                <tr key={idx}>
                                                    <td style={{ border: "1px solid #000", padding: "6px" }}>{soaData.property.property_index_no || "—"}</td>
                                                    <td style={{ border: "1px solid #000", padding: "6px" }}>{soaData.property.barangay || "—"}</td>
                                                    {/* 🌟 FIXED: RESTORES "2003 - 2019" GROUP LABEL! */}
                                                    <td style={{ border: "1px solid #000", padding: "6px" }}>
                                                        {row.startYear === row.endYear ? row.startYear : `${row.startYear} - ${row.endYear}`} {row.customLabel}
                                                    </td>
                                                    <td style={{ border: "1px solid #000", padding: "6px", textAlign: "right" }}>{fmt(row.av)}</td>
                                                    <td style={{ border: "1px solid #000", padding: "6px" }}>{row.count}</td>
                                                    <td style={{ border: "1px solid #000", padding: "6px", fontWeight: "bold" }}>{row.penalty_percent}</td>
                                                    <td style={{ border: "1px solid #000", padding: "6px", textAlign: "right" }}>{fmt(row.basic)}</td>
                                                    <td style={{ border: "1px solid #000", padding: "6px", textAlign: "right" }}>{fmt(row.sef)}</td>
                                                    <td style={{ border: "1px solid #000", padding: "6px", textAlign: "right", color: waivePenalties ? "gray" : "inherit" }}>{fmt(row.penalty)}</td>
                                                    <td style={{ border: "1px solid #000", padding: "6px", textAlign: "right", color: row.discount > 0 ? "var(--green2)" : "inherit" }}>{row.discount > 0 ? `-${fmt(row.discount)}` : "0.00"}</td>
                                                    <td style={{ border: "1px solid #000", padding: "6px", textAlign: "right", fontWeight: "bold" }}>{fmt(row.total)}</td>
                                                </tr>
                                            ))}
                                            <tr style={{ background: "rgba(0,0,0,0.05)" }}>
                                                <td colSpan="6" style={{ border: "1px solid #000", padding: "6px", textAlign: "right", fontWeight: "bold" }}>GRAND TOTAL:</td>
                                                <td style={{ border: "1px solid #000", padding: "6px", textAlign: "right", fontWeight: "bold" }}>{fmt(soaData.totals.basic)}</td>
                                                <td style={{ border: "1px solid #000", padding: "6px", textAlign: "right", fontWeight: "bold" }}>{fmt(soaData.totals.sef)}</td>
                                                <td style={{ border: "1px solid #000", padding: "6px", textAlign: "right", fontWeight: "bold", color: waivePenalties ? "gray" : "inherit" }}>{fmt(soaData.totals.penalty)}</td>
                                                <td style={{ border: "1px solid #000", padding: "6px", textAlign: "right", fontWeight: "bold", color: "var(--green2)" }}>{soaData.totals.discount > 0 ? `-${fmt(soaData.totals.discount)}` : "0.00"}</td>
                                                <td style={{ border: "1px solid #000", padding: "6px", textAlign: "right", fontWeight: "bold", fontSize: "11pt" }}>{fmt(soaData.totals.total)}</td>
                                            </tr>
                                        </tbody>
                                    </table>

                                    <div style={{ textAlign: "center", fontSize: "10pt", marginTop: "10px", marginBottom: "25px" }}>
                                        Computed as of {["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"][soaData.target_month - 1]}, {new Date().getFullYear()}
                                    </div>

                                    <div style={{ textIndent: "40px", fontSize: "10pt", textAlign: "justify", marginBottom: "15px", lineHeight: "1.6" }}>
                                        To avoid the inconveniences of a legal action which we may be compelled to pursue to enforce collection, you are given a period of <strong>FIFTEEN (15) DAYS</strong> from receipt hereof to fully settle the total real property tax due.
                                    </div>
                                    <div style={{ textIndent: "40px", fontSize: "10pt", textAlign: "justify", marginBottom: "40px", lineHeight: "1.6" }}>
                                        However, if the above-mentioned taxes have already been paid, <strong>PLEASE DISREGARD THIS NOTICE</strong> and please present to us all the official receipts as evidence of full-payment and a photo copy of the present receipts for the proper adjustments of the records.
                                    </div>

                                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "50px", pageBreakInside: "avoid" }}>
                                        <div>
                                            <span style={{ fontSize: "10pt" }}>Prepared by:</span><br /><br /><br /><br />
                                            <strong style={{ fontSize: "11pt" }}>{preparedByName}</strong><br />
                                            <div style={{ fontSize: "11pt" }}>{preparedByRole}</div>
                                        </div>
                                        <div style={{ textAlign: "center" }}>
                                            <span style={{ fontSize: "10pt" }}>Noted by:</span><br /><br /><br /><br />
                                            <strong style={{ fontSize: "11pt" }}>DINIA A. TAÑEDO</strong><br />
                                            <div style={{ fontSize: "11pt" }}>Municipal Treasurer</div>
                                        </div>
                                    </div>

                                    <div style={{ textAlign: "left", fontSize: "10pt", lineHeight: "2", pageBreakInside: "avoid" }}>
                                        <div>Date received: <span style={{ display: "inline-block", borderBottom: "1px solid #000", width: "300px" }}></span></div>
                                        <div>Signature: <span style={{ display: "inline-block", borderBottom: "1px solid #000", width: "322px" }}></span></div>
                                        <div>Printed Name: <span style={{ display: "inline-block", borderBottom: "1px solid #000", width: "300px" }}></span></div>
                                        <div>Property Owner/Administrator: <span style={{ display: "inline-block", borderBottom: "1px solid #000", width: "198px" }}></span></div>
                                    </div>
                                </div>

                                <div className="card-header no-print" style={{ justifyContent: "center", gap: 10, borderTop: "1px solid #ccc", background: "#f8f9fa" }}>
                                    <button className="btn btn-outline" onClick={() => window.print()}>🖨️ Print Document</button>
                                    {!soaData.isSavedRecord && <button className="btn btn-success" onClick={saveSOA} disabled={saving}>{saving ? "Saving..." : "💾 Save to Registry"}</button>}
                                </div>
                            </div>
                        </div>
                    </>
                )}

                {/* MASS SOA PRINT MODAL */}
                {massSoaData && (
                    <>
                        <style>{`
                          @media print {
                            @page { size: A4 portrait; margin: 15mm; }
                            html, body, #root { height: auto !important; width: 100% !important; overflow: visible !important; display: block !important; margin: 0 !important; padding: 0 !important; }
                            body * { visibility: hidden !important; }
                            .modal-backdrop { position: absolute !important; top: 0 !important; left: 0 !important; width: 100% !important; height: auto !important; display: block !important; background: none !important; padding: 0 !important; }
                            .mass-soa-print-area, .mass-soa-print-area * { visibility: visible !important; color: #000 !important; }
                            .mass-soa-print-area { position: absolute !important; top: 0 !important; left: 0 !important; width: 100% !important; max-height: none !important; overflow: visible !important; display: block !important; background: #fff !important; border: none !important; box-shadow: none !important; margin: 0 !important; padding: 0 !important; }
                            .page-break { page-break-after: always !important; break-after: page !important; display: block !important; border-bottom: none !important; margin-bottom: 0 !important; }
                            .no-print { display: none !important; }
                            table { width: 100% !important; table-layout: auto !important; border-collapse: collapse !important; }
                            tr { page-break-inside: avoid; page-break-after: auto; }
                            thead { display: table-header-group; }
                            .mass-soa-print-area th { background-color: #fff !important; color: #000 !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
                            .mass-soa-print-area th, .mass-soa-print-area td { font-size: 8pt !important; padding: 4px !important; }
                          }
                        `}</style>
                        <div className="modal-backdrop" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.8)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
                            <div className="card mass-soa-print-area" style={{ width: "850px", maxWidth: "100%", maxHeight: "90vh", overflowY: "auto", background: "#fff", color: "#000", fontFamily: "Arial, sans-serif" }}>

                                <div className="card-header no-print" style={{ borderBottom: "1px solid #ccc", background: "#f8f9fa", position: "sticky", top: 0, zIndex: 10 }}>
                                    <div><div className="card-title">Mass Print: Statement of Accounts</div><div className="card-sub">{massSoaData.length} documents ready to print</div></div>
                                    <div style={{ display: "flex", gap: "10px" }}>
                                        <button className="btn btn-primary btn-sm" onClick={() => window.print()}>🖨️ Print All</button>
                                        <button className="btn btn-ghost btn-sm" onClick={() => setMassSoaData(null)}>✕ Close</button>
                                    </div>
                                </div>

                                {massSoaData.map((data, index) => (
                                    <div key={index} className={index !== massSoaData.length - 1 ? "page-break" : ""} style={{ padding: "40px 50px", borderBottom: index !== massSoaData.length - 1 ? "2px dashed #ccc" : "none" }}>

                                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "25px", borderBottom: "2px solid #000", paddingBottom: "15px" }}>
                                            <img src="https://i.postimg.cc/VktjPybt/macalelon-logo.png" alt="LGU Logo" style={{ width: "80px", height: "80px", objectFit: "contain" }} />
                                            <div style={{ textAlign: "center", flex: 1 }}>
                                                <div style={{ fontSize: "11pt" }}>Republic of the Philippines</div>
                                                <div style={{ fontSize: "11pt" }}>Province of Quezon</div>
                                                <div style={{ fontSize: "11pt", fontWeight: "bold" }}>MUNICIPALITY OF MACALELON</div>
                                                <div style={{ fontSize: "11pt", fontWeight: "bold", marginTop: "10px" }}>OFFICE OF THE MUNICIPAL TREASURER</div>
                                            </div>
                                            <div style={{ width: "80px" }}></div>
                                        </div>

                                        <div style={{ textAlign: "left", marginBottom: "25px", fontSize: "10pt", lineHeight: "1.6" }}>
                                            <div style={{ borderBottom: "1px solid #000", display: "inline-block", minWidth: "350px", fontWeight: "bold" }}>
                                                {data.property.taxpayers?.firstname} {data.property.taxpayers?.lastname}
                                            </div><br />
                                            <div style={{ borderBottom: "1px solid #000", display: "inline-block", minWidth: "350px" }}>
                                                {data.property.taxpayers?.address || data.property.taxpayers?.barangay || "—"}
                                            </div><br />
                                            <div style={{ borderBottom: "1px solid #000", display: "inline-block", minWidth: "350px" }}>MACALELON, QUEZON</div>
                                        </div>

                                        <div style={{ textAlign: "left", fontSize: "10pt", marginBottom: "15px" }}>Sir/Madam:</div>
                                        <div style={{ textIndent: "40px", fontSize: "10pt", textAlign: "justify", marginBottom: "15px" }}>
                                            This is to inform you that our records show that the Real Estate tax due on the Property/ies registered in your name listed remain unpaid as of follows;
                                        </div>

                                        <table style={{ width: "100%", margin: "0 auto", borderCollapse: "collapse", border: "2px solid #000", fontSize: "10pt", textAlign: "center", marginBottom: "10px" }}>
                                            <thead>
                                                <tr>
                                                    <th rowSpan="2" style={{ border: "1px solid #000", padding: "4px" }}>PIN No.</th>
                                                    <th rowSpan="2" style={{ border: "1px solid #000", padding: "4px" }}>BRGY.</th>
                                                    <th rowSpan="2" style={{ border: "1px solid #000", padding: "4px" }}>YEAR</th>
                                                    <th rowSpan="2" style={{ border: "1px solid #000", padding: "4px" }}>ASSESSED<br />VALUE</th>
                                                    <th rowSpan="2" style={{ border: "1px solid #000", padding: "4px" }}>No. of<br />Years</th>
                                                    <th rowSpan="2" style={{ border: "1px solid #000", padding: "4px" }}>% of<br />Penalty</th>
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
                                                {data.displayRows.map((row, idx) => (
                                                    <tr key={idx}>
                                                        <td style={{ border: "1px solid #000", padding: "6px" }}>{data.property.property_index_no || "—"}</td>
                                                        <td style={{ border: "1px solid #000", padding: "6px" }}>{data.property.barangay || "—"}</td>
                                                        {/* 🌟 FIXED: RESTORES "2003 - 2019" GROUP LABEL! */}
                                                        <td style={{ border: "1px solid #000", padding: "6px" }}>
                                                            {row.startYear === row.endYear ? row.startYear : `${row.startYear} - ${row.endYear}`} {row.customLabel}
                                                        </td>
                                                        <td style={{ border: "1px solid #000", padding: "6px", textAlign: "right" }}>{fmt(row.av)}</td>
                                                        <td style={{ border: "1px solid #000", padding: "6px" }}>{row.count}</td>
                                                        <td style={{ border: "1px solid #000", padding: "6px", fontWeight: "bold" }}>{row.penalty_percent}</td>
                                                        <td style={{ border: "1px solid #000", padding: "6px", textAlign: "right" }}>{fmt(row.basic)}</td>
                                                        <td style={{ border: "1px solid #000", padding: "6px", textAlign: "right" }}>{fmt(row.sef)}</td>
                                                        <td style={{ border: "1px solid #000", padding: "6px", textAlign: "right", color: waivePenalties ? "gray" : "inherit" }}>{fmt(row.penalty)}</td>
                                                        <td style={{ border: "1px solid #000", padding: "6px", textAlign: "right", color: row.discount > 0 ? "var(--green2)" : "inherit" }}>{row.discount > 0 ? `-${fmt(row.discount)}` : "0.00"}</td>
                                                        <td style={{ border: "1px solid #000", padding: "6px", textAlign: "right", fontWeight: "bold" }}>{fmt(row.total)}</td>
                                                    </tr>
                                                ))}
                                                <tr style={{ background: "rgba(0,0,0,0.05)" }}>
                                                    <td colSpan="6" style={{ border: "1px solid #000", padding: "6px", textAlign: "right", fontWeight: "bold" }}>GRAND TOTAL:</td>
                                                    <td style={{ border: "1px solid #000", padding: "6px", textAlign: "right", fontWeight: "bold" }}>{fmt(data.totals.basic)}</td>
                                                    <td style={{ border: "1px solid #000", padding: "6px", textAlign: "right", fontWeight: "bold" }}>{fmt(data.totals.sef)}</td>
                                                    <td style={{ border: "1px solid #000", padding: "6px", textAlign: "right", fontWeight: "bold", color: waivePenalties ? "gray" : "inherit" }}>{fmt(data.totals.penalty)}</td>
                                                    <td style={{ border: "1px solid #000", padding: "6px", textAlign: "right", fontWeight: "bold", color: "var(--green2)" }}>{data.totals.discount > 0 ? `-${fmt(data.totals.discount)}` : "0.00"}</td>
                                                    <td style={{ border: "1px solid #000", padding: "6px", textAlign: "right", fontWeight: "bold", fontSize: "11pt" }}>{fmt(data.totals.total)}</td>
                                                </tr>
                                            </tbody>
                                        </table>

                                        <div style={{ textAlign: "center", fontSize: "10pt", marginTop: "10px", marginBottom: "25px" }}>
                                            Computed as of {["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"][data.target_month - 1]}, {new Date().getFullYear()}
                                        </div>

                                        <div style={{ textIndent: "40px", fontSize: "10pt", textAlign: "justify", marginBottom: "15px", lineHeight: "1.6" }}>
                                            To avoid the inconveniences of a legal action which we may be compelled to pursue to enforce collection, you are given a period of <strong>FIFTEEN (15) DAYS</strong> from receipt hereof to fully settle the total real property tax due.
                                        </div>
                                        <div style={{ textIndent: "40px", fontSize: "10pt", textAlign: "justify", marginBottom: "40px", lineHeight: "1.6" }}>
                                            However, if the above-mentioned taxes have already been paid, <strong>PLEASE DISREGARD THIS NOTICE</strong> and please present to us all the official receipts as evidence of full-payment and a photo copy of the present receipts for the proper adjustments of the records.
                                        </div>

                                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "50px", pageBreakInside: "avoid" }}>
                                            <div>
                                                <span style={{ fontSize: "10pt" }}>Prepared by:</span><br /><br /><br /><br />
                                                <strong style={{ fontSize: "11pt" }}>{preparedByName}</strong><br />
                                                <div style={{ fontSize: "11pt" }}>{preparedByRole}</div>
                                            </div>
                                            <div style={{ textAlign: "center" }}>
                                                <span style={{ fontSize: "10pt" }}>Noted by:</span><br /><br /><br /><br />
                                                <strong style={{ fontSize: "11pt" }}>DINIA A. TAÑEDO</strong><br />
                                                <div style={{ fontSize: "11pt" }}>Municipal Treasurer</div>
                                            </div>
                                        </div>

                                        <div style={{ textAlign: "left", fontSize: "10pt", lineHeight: "2", pageBreakInside: "avoid" }}>
                                            <div>Date received: <span style={{ display: "inline-block", borderBottom: "1px solid #000", width: "300px" }}></span></div>
                                            <div>Signature: <span style={{ display: "inline-block", borderBottom: "1px solid #000", width: "322px" }}></span></div>
                                            <div>Printed Name: <span style={{ display: "inline-block", borderBottom: "1px solid #000", width: "300px" }}></span></div>
                                            <div>Property Owner/Administrator: <span style={{ display: "inline-block", borderBottom: "1px solid #000", width: "198px" }}></span></div>
                                        </div>
                                    </div>
                                ))}

                            </div>
                        </div>
                    </>
                )}

                <div className="card">
                    <div className="card-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "10px" }}>
                        <div><div className="card-title">Delinquent Accounts</div><span className="chip">{filteredGroupedList.length} filtered accounts</span></div>
                        
                        <div style={{ display: "flex", gap: "10px", alignItems: "center", flexWrap: "wrap" }}>
                            <label style={{ display: "flex", alignItems: "center", gap: "8px", fontWeight: "bold", color: "var(--gold2)", cursor: "pointer", background: "var(--gold-dim)", padding: "6px 12px", borderRadius: "6px", border: "1px solid rgba(212,168,67,.3)" }}>
                                <input type="checkbox" checked={waivePenalties} onChange={e => setWaivePenalties(e.target.checked)} style={{ width: "16px", height: "16px" }} />
                                WAIVE PENALTIES
                            </label>

                            <button className="btn btn-primary btn-sm" onClick={prepareMassSOA} disabled={filteredGroupedList.length === 0}>
                                🖨️ Mass Print SOAs
                            </button>
                            {["admin", "treasurer"].includes(profile?.role) && (
                                <>
                                    <button className="btn btn-gold btn-sm" onClick={handleBatchRecalculate} disabled={recalculating || filteredGroupedList.length === 0}>
                                        {recalculating ? "..." : "🔄 Batch Recalculate"}
                                    </button>

                                    <button className="btn btn-danger btn-sm" onClick={handleGenerateReceivables} disabled={generating || recalculating}>
                                        {generating ? "Generating..." : "📅 Generate Receivables"}
                                    </button>
                                </>
                            )}
                        </div>
                    </div>

                    <div className="searchbar" style={{ padding: "16px", borderBottom: "1px solid var(--border)", background: "var(--bg2)", display: "flex", gap: "10px" }}>
                        <input
                            placeholder="Search by Taxpayer Name, Code, PIN, or TD No..."
                            value={q}
                            onChange={e => setQ(e.target.value)}
                            onKeyDown={e => { if (e.key === 'Enter') { setLoading(true); load(); } }}
                            style={{ flex: 2 }}
                        />
                        <select value={brgyFilter} onChange={(e) => setBrgyFilter(e.target.value)} style={{ flex: 1, fontWeight: "bold" }}>
                            <option value="">— ALL BARANGAYS —</option>
                            {barangays.map(b => <option key={b} value={b}>{b}</option>)}
                        </select>
                        <button className="btn btn-outline" onClick={() => { setLoading(true); load(); }}>🔍 Search</button>
                    </div>

                    {loading
                        ? <div className="loading-state"><span className="spin" />Loading delinquency records…</div>
                        : list.length === 0
                            ? <div className="empty"><div className="empty-icon">✅</div><div className="empty-text">No delinquent accounts matched your search.</div></div>
                            : <div className="table-wrap"><table>
                                <thead><tr><th>PIN No.</th><th>Property Location</th><th>Owner & Address</th><th>Year(s)</th><th>Months</th><th>Basic + SEF</th><th>Interest</th><th>Total Due</th><th>Actions</th></tr></thead>
                                <tbody>
                                    {filteredGroupedList.map(d => (
                                        <tr key={d.property_id}>
                                            <td>
                                                <span className="mono" style={{ color: "var(--blue2)", fontWeight: "bold" }}>{d.properties?.property_index_no || "—"}</span>
                                            </td>
                                            <td>
                                                <span style={{ fontSize: "12px" }}>{d.properties?.barangay || "—"}</span>
                                            </td>
                                            <td>
                                                <div style={{ fontWeight: 600 }}>{d.taxpayers ? `${d.taxpayers.lastname}, ${d.taxpayers.firstname}` : "—"}</div>
                                                <div style={{ fontSize: 10, color: "var(--text3)", marginTop: 2 }}>
                                                    {d.taxpayers?.address || d.taxpayers?.barangay || "—"}
                                                </div>
                                            </td>
                                            <td><span className="chip">{d.minYear === d.maxYear ? d.minYear : `${d.minYear} - ${d.maxYear}`}</span></td>
                                            <td>
                                                <span className="mono" style={{ color: parseInt(d.months_delinquent) === -1 ? "var(--blue2)" : "inherit" }}>
                                                    {parseInt(d.months_delinquent) === -1 ? "SHORT TAX" : `${d.months_delinquent} mos.`}
                                                </span>
                                            </td>
                                            <td><span className="mono">{fmt(d.sum_basic + d.sum_sef)}</span></td>
                                            <td>
                                                <span className="mono" style={{ color: waivePenalties ? "gray" : "var(--red2)", fontWeight: 600 }}>
                                                    {waivePenalties ? "0.00" : fmt(d.sum_int)}
                                                </span>
                                            </td>
                                            <td>
                                                <span className="mono" style={{ color: "var(--gold2)", fontWeight: 700, fontSize: 13 }}>
                                                    {fmt(waivePenalties ? (d.sum_basic + d.sum_sef) : d.sum_total)}
                                                </span>
                                            </td>
                                            <td>
                                                <div style={{ display: "flex", gap: "6px" }}>
                                                    <button className="btn btn-ghost btn-xs" style={{ color: "var(--blue2)" }} onClick={() => viewSavedSOA(d)}>🖨️ SOA</button>
                                                    <button className="btn btn-ghost btn-xs" style={{ color: "var(--gold)" }} onClick={() => handleRecalculate(d)} disabled={recalculating}>{recalculating ? "..." : "🔄 Recalc"}</button>
                                                    {["admin", "treasurer"].includes(profile?.role) && <button className="btn btn-ghost btn-xs" style={{ color: "var(--red2)" }} onClick={() => handleDeleteGroup(d)} disabled={deleting}>✕ Delete</button>}
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                    <tr style={{ background: "rgba(0,0,0,0.25)" }}>
                                        <td colSpan={7} style={{ fontWeight: 700, fontSize: 12, fontFamily: "var(--font-mono)", color: "var(--text3)" }}>GRAND TOTAL</td>
                                        <td><span className="mono" style={{ fontWeight: 800, color: "var(--gold2)", fontSize: 14 }}>{fmt(totals.due)}</span></td>
                                        <td />
                                    </tr>
                                </tbody>
                            </table></div>
                    }
                </div>
            </div>
        </>
    );
}