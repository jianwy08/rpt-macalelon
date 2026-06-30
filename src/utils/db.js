import { createClient } from '@supabase/supabase-js';


export const SUPA_URL = import.meta.env.VITE_SUPABASE_URL;
export const SUPA_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;
export const supabase = createClient(SUPA_URL, SUPA_KEY);
export const amountToWords = (amount) => {
    const num = parseFloat(amount || 0).toFixed(2).split('.');
    const pesos = parseInt(num[0]);
    const centavos = num[1];

    const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
    const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

    const convertHundreds = (n) => {
        if (n < 20) return ones[n];
        if (n < 100) return tens[Math.floor(n / 10)] + (n % 10 !== 0 ? '-' + ones[n % 10] : '');
        return ones[Math.floor(n / 100)] + ' Hundred ' + convertHundreds(n % 100);
    };

    let words = '';
    if (pesos >= 1000) {
        words += convertHundreds(Math.floor(pesos / 1000)) + ' Thousand ';
    }
    words += convertHundreds(pesos % 1000) + ' Pesos';

    return `${words} and ${centavos}/100`.replace(/\s+/g, ' ');
};

console.log("My Supabase URL is:", SUPA_URL);

const hdrs = (tok) => ({
    "Content-Type": "application/json",
    apikey: SUPA_KEY,
    Authorization: `Bearer ${tok || SUPA_KEY}`,
    Prefer: "return=representation",
});

export const db = {
    async select(t, p = {}, tok) {
        let u = `${SUPA_URL}/rest/v1/${t}?`;
        if (p.select) u += `select=${encodeURIComponent(p.select)}&`;
        if (p.filter) u += `${p.filter}&`;
        if (p.order) u += `order=${p.order}&`;
        if (p.limit) u += `limit=${p.limit}&`;
        if (p.offset) u += `offset=${p.offset}&`;
        console.log("Attempting to fetch URL:", u);
        const r = await fetch(u, { headers: hdrs(tok) });
        if (!r.ok) throw new Error(await r.text());
        return r.json();
    },
    async insert(t, d, tok) {
        const r = await fetch(`${SUPA_URL}/rest/v1/${t}`, { method: "POST", headers: hdrs(tok), body: JSON.stringify(d) });
        if (!r.ok) throw new Error(await r.text());
        return r.json();
    },
    async update(t, d, p = {}, tok) {
        let u = `${SUPA_URL}/rest/v1/${t}?`;
        if (p.filter) u += `${p.filter}`;
        const r = await fetch(u, { method: "PATCH", headers: hdrs(tok), body: JSON.stringify(d) });
        if (!r.ok) throw new Error(await r.text());
        try { return await r.json(); } catch (e) {console.error(e); return null; }
    },
    async delete(t, p = {}, tok) {
        let u = `${SUPA_URL}/rest/v1/${t}?`;
        if (p.filter) u += `${p.filter}`;
        const r = await fetch(u, { method: "DELETE", headers: hdrs(tok) });
        if (!r.ok) throw new Error(await r.text());
    },
    async authSignIn(e, p) {
        const r = await fetch(`${SUPA_URL}/auth/v1/token?grant_type=password`, { method: "POST", headers: { "Content-Type": "application/json", "apikey": SUPA_KEY }, body: JSON.stringify({ email: e, password: p }) });
        if (!r.ok) throw new Error((await r.json()).error_description || "Login failed");
        return r.json();
    },
    async authSignUp(e, p) {
        const r = await fetch(`${SUPA_URL}/auth/v1/signup`, { method: "POST", headers: { "Content-Type": "application/json", "apikey": SUPA_KEY }, body: JSON.stringify({ email: e, password: p }) });
        if (!r.ok) throw new Error((await r.json()).error_description || "Signup failed");
        return r.json();
    },
    async authSignOut(tok) {
        await fetch(`${SUPA_URL}/auth/v1/logout`, { method: "POST", headers: { "apikey": SUPA_KEY, "Authorization": `Bearer ${tok}` } });
    },
    async authResetPassword(e) {
        const currentUrl = encodeURIComponent(window.location.origin + "/");
        const r = await fetch(`${SUPA_URL}/auth/v1/recover?redirect_to=${currentUrl}`, {
            method: "POST",
            headers: { "Content-Type": "application/json", "apikey": SUPA_KEY },
            body: JSON.stringify({ email: e })
        });
        if (!r.ok) throw new Error((await r.json()).error_description || "Failed to send reset email");
        return r;
    },
    async authUpdatePassword(newPassword, token) {
        const r = await fetch(`${SUPA_URL}/auth/v1/user`, {
            method: "PUT",
            headers: { "Content-Type": "application/json", apikey: SUPA_KEY, Authorization: `Bearer ${token}` },
            body: JSON.stringify({ password: newPassword })
        });
        if (!r.ok) throw new Error((await r.json()).error_description || "Failed to update password");
        return r.json();
    },
};

export const fmt = n => "₱" + Number(n || 0).toLocaleString("en-PH", { minimumFractionDigits: 2 });
export const fmtK = n => { const v = Number(n || 0); return v >= 1000000 ? "₱" + (v / 1000000).toFixed(2) + "M" : v >= 1000 ? "₱" + (v / 1000).toFixed(1) + "K" : fmt(v); };
export const today = () => new Date().toISOString().split("T")[0];

export async function logAudit(tok, uid, uname, action, mod, details = "") {
    try { await db.insert("audit_logs", { user_id: uid, user_name: uname, action, module: mod, details, created_at: new Date().toISOString() }, tok); } catch (e) {console.error(e); }
}