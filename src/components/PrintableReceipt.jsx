import { fmt } from "../utils/db";

export default function PrintableReceipt({ data }) {
    if (!data) return null;

    // Helper to get the primary property details
    const prop = data.properties?.[0] || {};
    const ownerName = data.taxpayer ? `${data.taxpayer.lastname}, ${data.taxpayer.firstname}` : "—";

    return (
        <div className="af56-container">
            {/* 1. TOP HEADER SECTION (Absolute Positioned) */}
            
            {/* DATE: Adjust top/left to hit the date box */}
            <div className="af56-data absolute-date">{data.payment_date}</div>
            
            {/* PAYOR NAME: Adjust top/left to hit the Payor box */}
            <div className="af56-data absolute-payor">{data.paid_by || ownerName}</div>

            {/* 2. THE MAIN TABLE SECTION */}
            {/* This table is completely invisible. It just spaces the data into columns. */}
            <table className="af56-table">
                <tbody>
                    {data.cart && data.cart.map((item, index) => (
                        <tr key={index}>
                            {/* OWNER NAME */}
                            <td className="col-owner">{index === 0 ? ownerName : ""}</td>
                            
                            {/* PIN NUMBER */}
                            <td className="col-pin">{index === 0 ? prop.property_index_no : ""}</td>
                            
                            {/* LOCATION / BARANGAY */}
                            <td className="col-loc">{index === 0 ? prop.barangay : ""}</td>
                            
                            {/* ASSESSED VALUE */}
                            <td className="col-av">{index === 0 ? fmt(prop.assessed_value) : ""}</td>
                            
                            {/* INSTALLMENT / YEAR */}
                            <td className="col-year">{item.year} - {item.quarterTag}</td>
                            
                            {/* BASIC TAX */}
                            <td className="col-money">{fmt(item.basic)}</td>
                            
                            {/* SEF TAX */}
                            <td className="col-money">{fmt(item.sef)}</td>
                            
                            {/* PENALTY */}
                            <td className="col-money">{fmt(item.pen)}</td>
                            
                            {/* TOTAL */}
                            <td className="col-money">{fmt(item.basic + item.sef + item.pen - item.disc)}</td>
                        </tr>
                    ))}
                </tbody>
            </table>

            {/* 3. GRAND TOTAL SECTION */}
            <div className="af56-data absolute-total">{fmt(data.total_paid)}</div>
        </div>
    );
}