
import { fmt } from "../utils/db";

const formatDate = (dateString) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
};

// Helper function to convert numbers to words 
const amountToWords = (amount) => {
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

export default function PrintableReceipt({ data }) {
    if (!data) return null;

    return (
        <div className="af56-container">
            
            {/* --- TOP HEADER SECTION --- */}
            {/* Municipality / Province */}
            <div className="af56-data" style={{ top: "1.05in", left: "1.5in", fontSize: "14px", letterSpacing: "1px" }}>
                MACALELON, QUEZON
            </div>

            {/* Date */}
            <div className="af56-data absolute-date">
                {formatDate(data.payment_date)}
            </div>
                        
            {/* Payor Name */}
            <div className="af56-data absolute-payor">
                {data.paid_by || (data.taxpayer ? `${data.taxpayer.lastname}, ${data.taxpayer.firstname}` : "")}
            </div>

            {/* Amount in Words */}
            <div className="af56-data amount-in-words">
                {amountToWords(data.total_paid)} ({fmt(data.total_paid)})
            </div>

            {/* --- INVISIBLE DATA TABLE --- */}
            <table className="af56-table">
                <tbody>
                    {data.cart && data.cart.map((row, index) => {
                        const prop = (data.properties && data.properties[0]) || {};
                        const isBasic = row.type === 'BASIC';
                        
                        return (
                            <tr key={index}>
                                {/* Full Name mapping with Middle Initial */}
                                <td className="col-owner">
                                    {isBasic 
                                        ? data.taxpayer 
                                            ? `${data.taxpayer.firstname} ${data.taxpayer.middlename ? ' ' + data.taxpayer.middlename.charAt(0) + '.' : ''}${data.taxpayer.lastname}` 
                                            : ""
                                        : ""}
                                </td>
                                <td className="col-loc">{isBasic ? prop.barangay : ""}</td>
                                <td className="col-pin">{isBasic ? (prop.property_index_no || prop.td_number) : ""}</td>
                                <td className="col-av">{isBasic ? fmt(prop.assessed_value) : ""}</td>
                                
                                {/* 1% Tax Due Column */}
                                <td className="col-tax-due">{isBasic ? fmt(prop.assessed_value * 0.01) : ""}</td>
                                
                                <td className="col-year">{row.year}</td>
                                
                                {/* Tax Type Label (Left blank to hide BASIC/SEF text) */}
                                <td style={{ width: "0.5in" }}></td>

                                {/* Amount (Basic or SEF) */}
                                <td className="col-money">{fmt(row.val)}</td>
                                
                                {/* Netted Penalty OR Discount Column */}
                                <td className="col-money">
                                    {row.pen > row.disc 
                                        ? fmt(row.pen - row.disc) 
                                        : row.disc > row.pen 
                                            ? `(${fmt(row.disc - row.pen)})` 
                                            : ""}
                                </td>

                                {/* Final Total Column */}
                                <td className="col-money">
                                    {fmt(row.val + row.pen - row.disc)}
                                </td>
                            </tr>
                        );
                    })}

                    {/* 🌟 NEW: Spacer row to push the totals down to the pre-printed bottom line */}
                    <tr>
                        <td colSpan="10" style={{ height: "0.9in" }}></td>
                    </tr>

                    {/* 🌟 NEW: The Totals Row */}
                    <tr>
                        {/* 7 empty columns to skip over the left-side text */}
                        <td></td><td></td><td></td><td></td><td></td><td></td><td></td>
                        
                        {/* 1. Total Basic + SEF */}
                        <td className="col-money" style={{ fontWeight: "bold" }}>
                            {fmt((data.basic_tax || 0) + (data.sef_tax || 0))}
                        </td>
                        
                        {/* 2. Total Net Penalty / Discount */}
                        <td className="col-money" style={{ fontWeight: "bold" }}>
                            {data.penalty > data.discount 
                                ? fmt(data.penalty - data.discount) 
                                : data.discount > data.penalty 
                                    ? `(${fmt(data.discount - data.penalty)})` 
                                    : ""}
                        </td>
                        
                        {/* 3. Grand Total */}
                        <td className="col-money" style={{ fontWeight: "bold" }}>
                            {fmt(data.total_paid)}
                        </td>
                    </tr>
                </tbody>
            </table>

            {/* --- BOTTOM SECTION & SIGNATORIES --- */}
            {/* Notice the absolute-total div is gone! */}

            {/* Provincial / City Treasurer */}
            <div className="af56-data" style={{ top: "3.9in", left: "7.6in", fontWeight: "bold" }}>
                ROSARIO MARILOU M. UY
            </div>

            {/* Deputy */}
            <div className="af56-data" style={{ top: "4.3in", left: "7.8in", fontWeight: "bold" }}>
                DINIA A. TAÑEDO
            </div>
            
        </div>
    );
}