import { useState, useEffect, useRef } from 'react';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { db, fmt, today } from "../utils/db"

function Counter({ value, isCurrency = true }) {
    const [display, setDisplay] = useState(0);
    const ref = useRef(null);
    useEffect(() => {
        const target = parseFloat(value) || 0;
        const dur = 900, steps = 40, step = target / steps;
        let cur = 0, i = 0;
        clearInterval(ref.current);
        ref.current = setInterval(() => {
            i++; cur = Math.min(cur + step, target);
            setDisplay(cur);
            if (i >= steps) clearInterval(ref.current);
        }, dur / steps);
        return () => clearInterval(ref.current);
    }, [value]);
    if (isCurrency) return <span>{Math.round(display / 1000) + "k"}</span>;
    return <span>{Math.round(display)}</span>;
}

export default function Dashboard({ token }) {
    const [stats, setStats] = useState({ today: 0, month: 0, delinq: 0, ytd: 0, recent: [], chartData: [], methodData: [], barangayChartData: [] });
    const [loading, setLoading] = useState(true);
    const PIE_COLORS = ['#3B82F6', '#10B981', '#F0C040', '#EF4444', '#8B949E', '#A855F7'];

    useEffect(() => {
        (async () => {
            const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
            setLoading(true);
            try {
                const d = today(), ms = d.slice(0, 7) + "-01", ys = d.slice(0, 4) + "-01-01";
                const [tc, mc, yc, dq, rc] = await Promise.all([
                    db.select("collections", { filter: `payment_date=eq.${d}&is_voided=eq.false`, select: "total_paid" }, token),
                    db.select("collections", { filter: `payment_date=gte.${ms}&is_voided=eq.false`, select: "total_paid" }, token),
                    // Fetch YTD collections with barangay & method details
                    db.select("collections", { filter: `payment_date=gte.${ys}&is_voided=eq.false`, select: "total_paid,payment_date,payment_method,properties(barangay)" }, token),
                    // Fetch unpaid delinquencies with barangay details
                    db.select("delinquency", { filter: "status=eq.UNPAID", select: "property_id,total_due,properties(barangay)" }, token),
                    // Fetch recent transactions (limit 50 to allow grouping by OR)
                    db.select("collections", { select: "or_number,payment_date,total_paid,basic_tax,sef_tax,payment_method,taxpayers(lastname,firstname)", order: "created_at.desc", limit: 50, filter: "is_voided=eq.false" }, token),
                ]);

                const sum = a => a.reduce((s, c) => s + (+c.total_paid || 0), 0);

                // --- CHART DATA AGGREGATION ---
                const monthlyTotals = Array(12).fill(0);
                const methodTotals = {};
                const barangayMap = {};

                // Process Collections
                (yc || []).forEach(c => {
                    const amt = parseFloat(c.total_paid) || 0;

                    // 1. Group by Month
                    const monthIdx = new Date(c.payment_date).getMonth();
                    if (!isNaN(monthIdx)) monthlyTotals[monthIdx] += amt;

                    // 2. Group by Method
                    const meth = c.payment_method || "OTHER";
                    methodTotals[meth] = (methodTotals[meth] || 0) + amt;

                    // 3. Group by Barangay (Collections)
                    const bName = c.properties?.barangay?.toUpperCase() || "UNSPECIFIED";
                    if (!barangayMap[bName]) barangayMap[bName] = { name: bName, Collections: 0, Delinquencies: 0 };
                    barangayMap[bName].Collections += amt;
                });

                // Process Delinquencies
                (dq || []).forEach(d => {
                    const amt = parseFloat(d.total_due) || 0;
                    const bName = d.properties?.barangay?.toUpperCase() || "UNSPECIFIED";
                    if (!barangayMap[bName]) barangayMap[bName] = { name: bName, Collections: 0, Delinquencies: 0 };
                    barangayMap[bName].Delinquencies += amt;
                });

                // Format data for Recharts
                const chartData = MONTHS.map((m, i) => ({ name: m, Total: monthlyTotals[i] }));
                const methodData = Object.keys(methodTotals).map(k => ({ name: k, value: methodTotals[k] }));
                const barangayChartData = Object.values(barangayMap)
                    .sort((a, b) => (b.Collections + b.Delinquencies) - (a.Collections + a.Delinquencies))
                    .slice(0, 6); // Keep only the top 6 most active barangays

                // Process Recent Collections (Group by OR Number)
                const groupedRecent = Object.values((rc || []).reduce((acc, c) => {
                    if (!acc[c.or_number]) { acc[c.or_number] = { ...c, total_paid: 0, basic_tax: 0, sef_tax: 0 }; }
                    acc[c.or_number].total_paid += parseFloat(c.total_paid) || 0;
                    acc[c.or_number].basic_tax += parseFloat(c.basic_tax) || 0;
                    acc[c.or_number].sef_tax += parseFloat(c.sef_tax) || 0;
                    return acc;
                }, {})).slice(0, 6); // Keep top 6 recent receipts

                setStats({
                    today: sum(tc),
                    month: sum(mc),
                    ytd: sum(yc),
                    delinq: new Set((dq || []).filter(d => d.property_id).map(d => d.property_id)).size,
                    recent: groupedRecent,
                    chartData,
                    methodData,
                    barangayChartData
                });
            } catch (e) { console.error(e); }
            setLoading(false);
        })();
    }, [token]);

    if (loading) return <div className="loading-state"><span className="spin" />Loading dashboard…</div>;

    return (
        <>
            <div className="topbar">
                <div className="topbar-left">
                    <h1>Dashboard</h1>
                    <p>MUNICIPALITY OF MACALELON · {new Date().toLocaleDateString("en-PH", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}</p>
                </div>
            </div>

            {/* TOP STAT CARDS */}
            <div className="stat-row">
                {[
                    { label: "Today's Collections", value: stats.today, color: "gold", icon: "💰", isCur: true, delta: "Real-time" },
                    { label: "Month to Date", value: stats.month, color: "blue", icon: "📈", isCur: true, delta: "Current month" },
                    { label: "YTD Collections", value: stats.ytd, color: "green", icon: "🏦", isCur: true, delta: "Jan 1 – today" },
                    { label: "Delinquent Accounts", value: stats.delinq, color: "red", icon: "⚠️", isCur: false, delta: "Unpaid accounts" },
                ].map(s => (
                    <div className="stat-card" key={s.label}>
                        <div className={`stat-accent ${s.color}`} />
                        <div className={`stat-icon-bg ${s.color}`}>{s.icon}</div>
                        <div className="stat-label">{s.label}</div>
                        <div className={`stat-value ${s.isCur ? "big-num" : ""}`}>
                            <Counter value={s.value} isCurrency={s.isCur} />
                        </div>
                        <div className="stat-delta">{s.delta}</div>
                    </div>
                ))}
            </div>

            <div className="page-body">
                <div className="col-8-4">

                    {/* LEFT COLUMN (WIDER - FOR BIG CHARTS) */}
                    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

                        {/* MONTHLY TREND BAR CHART */}
                        <div className="card">
                            <div className="card-header"><div className="card-title">Monthly Collection Trend (FY {new Date().getFullYear()})</div></div>
                            <div className="card-body" style={{ height: "260px", paddingTop: "30px" }}>
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={stats.chartData}>
                                        <XAxis dataKey="name" stroke="#6E7681" fontSize={11} tickLine={false} axisLine={false} />
                                        <Tooltip
                                            cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                                            contentStyle={{ backgroundColor: '#1C2333', borderColor: '#3B82F6', borderRadius: '8px', color: '#fff' }}
                                            formatter={(value) => [`₱${value.toLocaleString(undefined, { minimumFractionDigits: 2 })}`, 'Collected']}
                                        />
                                        <Bar dataKey="Total" fill="url(#colorBlue)" radius={[4, 4, 0, 0]} />
                                        <defs>
                                            <linearGradient id="colorBlue" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#3B82F6" stopOpacity={1} />
                                                <stop offset="95%" stopColor="#2563EB" stopOpacity={0.6} />
                                            </linearGradient>
                                        </defs>
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        {/* BARANGAY PERFORMANCE MATRIX */}
                        <div className="card">
                            <div className="card-header">
                                <div>
                                    <div className="card-title">Barangay Performance Matrix</div>
                                    <div className="card-sub">Comparing collections vs. outstanding delinquencies</div>
                                </div>
                            </div>
                            <div className="card-body" style={{ height: "260px", paddingTop: "20px" }}>
                                {stats.barangayChartData.length === 0 ? (
                                    <div className="empty-text" style={{ textAlign: "center", marginTop: "80px" }}>No barangay data available</div>
                                ) : (
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart data={stats.barangayChartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                                            <XAxis dataKey="name" stroke="#6E7681" fontSize={10} tickLine={false} />
                                            <Tooltip
                                                contentStyle={{ backgroundColor: '#1C2333', borderColor: 'var(--border2)', borderRadius: '8px', color: '#fff' }}
                                                formatter={(value) => [`₱${Number(value).toLocaleString(undefined, { minimumFractionDigits: 2 })}`]}
                                            />
                                            <Bar dataKey="Collections" fill="#3B82F6" radius={[4, 4, 0, 0]} name="Total Collected" />
                                            <Bar dataKey="Delinquencies" fill="#EF4444" radius={[4, 4, 0, 0]} name="Unpaid Delinquency" />
                                        </BarChart>
                                    </ResponsiveContainer>
                                )}
                            </div>
                        </div>

                    </div>

                    {/* RIGHT COLUMN (NARROWER - FOR LISTS & DONUTS) */}
                    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

                        {/* PAYMENT METHODS DONUT CHART */}
                        <div className="card">
                            <div className="card-header"><div className="card-title">Payment Methods</div></div>
                            <div className="card-body" style={{ height: "240px", display: "flex", flexDirection: "column", alignItems: "center" }}>
                                {stats.methodData.length === 0 ? (
                                    <div className="empty-text" style={{ marginTop: "80px" }}>No data yet</div>
                                ) : (
                                    <ResponsiveContainer width="100%" height="100%">
                                        <PieChart>
                                            <Pie data={stats.methodData} innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value" stroke="none">
                                                {stats.methodData.map((entry, index) => (
                                                    <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                                                ))}
                                            </Pie>
                                            <Tooltip
                                                contentStyle={{ backgroundColor: '#1C2333', borderColor: 'var(--border2)', borderRadius: '8px', color: '#fff' }}
                                                formatter={(value) => [`₱${value.toLocaleString(undefined, { minimumFractionDigits: 2 })}`, 'Total']}
                                            />
                                        </PieChart>
                                    </ResponsiveContainer>
                                )}
                                {/* Custom Legend */}
                                <div style={{ display: "flex", flexWrap: "wrap", gap: "12px", justifyContent: "center", marginTop: "-10px" }}>
                                    {stats.methodData.map((entry, index) => (
                                        <div key={entry.name} style={{ display: "flex", alignItems: "center", gap: "4px", fontSize: "11px", color: "var(--text2)" }}>
                                            <div style={{ width: "10px", height: "10px", borderRadius: "50%", backgroundColor: PIE_COLORS[index % PIE_COLORS.length] }}></div>
                                            {entry.name}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* RECENT COLLECTIONS TABLE */}
                        <div className="card">
                            <div className="card-header">
                                <div><div className="card-title">Recent Collections</div><div className="card-sub">Latest transactions</div></div>
                            </div>
                            {stats.recent.length === 0
                                ? <div className="empty"><div className="empty-icon">💳</div><div className="empty-text">No collections yet</div></div>
                                : <div className="table-wrap">
                                    <table>
                                        <thead><tr><th>OR Number</th><th>Taxpayer</th><th>Total</th></tr></thead>
                                        <tbody>
                                            {stats.recent.map((c, i) => (
                                                <tr key={i}>
                                                    <td><span className="badge badge-blue">{c.or_number}</span></td>
                                                    <td style={{ fontWeight: 600, fontSize: 12 }}>{c.taxpayers ? `${c.taxpayers.lastname}` : "—"}</td>
                                                    <td><span className="mono" style={{ color: "var(--green2)", fontWeight: 700 }}>{fmt(c.total_paid)}</span></td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            }
                        </div>

                        {/* QUICK ACTIONS */}
                        <div className="card">
                            <div className="card-header"><div className="card-title">Quick Actions</div></div>
                            <div className="card-body" style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                                {[["💳", "Post Payment"], ["👥", "Add Taxpayer"], ["📋", "Daily Report"]].map(([ic, label]) => (
                                    <div key={label} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", borderRadius: 9, background: "var(--bg3)", border: "1px solid var(--border)", cursor: "pointer", transition: "all .15s", fontSize: 13, color: "var(--text2)" }}>
                                        <span style={{ fontSize: 16 }}>{ic}</span>{label}
                                        <span style={{ marginLeft: "auto", color: "var(--text3)" }}>→</span>
                                    </div>
                                ))}
                            </div>
                        </div>

                    </div>

                </div>
            </div>
        </>
    );
}
