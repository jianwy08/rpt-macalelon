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
            <div className="af56-data" style={{ top: "4.8in", left: "2.5in", fontSize: "16px", letterSpacing: "1px" }}>
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
                        const prop = (data.properties && data.properties.find(p => p.id === row.property_id)) 
                                     || data.property 
                                     || (data.properties && data.properties[0]) 
                                     || {};
                        
                        let isDuplicate = false;
                        if (index > 0) {
                            const prevRow = data.cart[index - 1];
                            const prevProp = (data.properties && data.properties.find(p => p.id === prevRow.property_id)) 
                                             || data.property 
                                             || (data.properties && data.properties[0]) 
                                             || {};
                            
                            if (prevProp.property_index_no === prop.property_index_no && prevRow.year === row.year) {
                                isDuplicate = true; 
                            }
                        }
                        
                        const showInfo = !isDuplicate;
                        
                        return (
                            <tr key={index}>
                                {/* 1. Full Name */}
                                <td className="col-owner">
                                    {showInfo 
                                        ? (data.taxpayer ? `${data.taxpayer.firstname} ${data.taxpayer.middlename ? ' ' + data.taxpayer.middlename.charAt(0) + '.' : ''}${data.taxpayer.lastname}` : "")
                                        : ""}
                                </td>
                                
                                {/* 2. Location */}
                                <td className="col-loc">{showInfo ? prop.barangay : ""}</td>
                                
                                {/* 3. PIN */}
                                <td className="col-pin">{showInfo ? (prop.property_index_no || prop.td_number) : ""}</td>
                                
                                {/* 4. AV */}
                                <td className="col-av">{showInfo ? fmt(prop.assessed_value) : ""}</td>
                                
                                {/* 5. 1% Tax Due Column */}
                                <td className="col-tax-due">{showInfo ? fmt(prop.assessed_value * 0.01) : ""}</td>
                                
                                {/* 6. Year */}
                                <td className="col-year">{showInfo ? row.year : ""}</td>
                                
                                {/* 🌟 THE INVISIBLE 0.5in CELL WAS DELETED FROM HERE! 🌟 */}

                                {/* 7. Amount (Basic or SEF) */}
                                <td className="col-money">{fmt(row.val)}</td>
                                
                                {/* 8. Netted Penalty OR Discount Column */}
                                <td className="col-money">
                                    {row.pen > row.disc 
                                        ? fmt(row.pen - row.disc) 
                                        : row.disc > row.pen 
                                            ? `(${fmt(row.disc - row.pen)})` 
                                            : ""}
                                </td>

                                {/* 9. Final Total Column */}
                                <td className="col-money">
                                    {fmt(row.val + row.pen - row.disc)}
                                </td>
                            </tr>
                        );
                    })}

                    {/* Spacer row to push the totals down to the pre-printed bottom line */}
                    <tr>
                        {/* Changed colSpan from 10 to 9 because we deleted a column */}
                        <td colSpan="9" style={{ height: "0.9in" }}></td>
                    </tr>

                    {/* The Totals Row */}
                    <tr>
                        {/* Exactly 6 empty columns to skip over the left-side text */}
                        <td></td><td></td><td></td><td></td><td></td><td></td>
                        
                        {/* Total Basic + SEF */}
                        <td className="col-money" style={{ fontWeight: "bold" }}>
                            {fmt((data.basic_tax || 0) + (data.sef_tax || 0))}
                        </td>
                        
                        {/* Total Net Penalty / Discount */}
                        <td className="col-money" style={{ fontWeight: "bold" }}>
                            {data.penalty > data.discount 
                                ? fmt(data.penalty - data.discount) 
                                : data.discount > data.penalty 
                                    ? `(${fmt(data.discount - data.penalty)})` 
                                    : ""}
                        </td>
                        
                        {/* Grand Total */}
                        <td className="col-money" style={{ fontWeight: "bold" }}>
                            {fmt(data.total_paid)}
                        </td>
                    </tr>
                </tbody>
            </table>

            {/* --- BOTTOM SECTION & SIGNATORIES --- */}
            {/* Provincial / City Treasurer */}
            <div className="af56-data" style={{ top: "8.35in", left: "9.1in", fontWeight: "bold" }}>
                ROSARIO MARILOU M. UY
            </div>

            {/* Deputy */}
            <div className="af56-data" style={{ top: "8.75in", left: "9.3in", fontWeight: "bold" }}>
                DINIA A. TAÑEDO
            </div>
            
        </div>
    );
}