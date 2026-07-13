export default function RCDForm({ 
    fund = "Trust", 
    date = new Date().toLocaleDateString(),
    reportNo = "________________", 
    officerName = "REGIN JIANWY D. BALANE",
    officerTitle = "Accountable Officer", 
    lguName = "MACALELON, QUEZON",
    collections = [], 
    liquidating = [], 
    remittances = [], 
    accountableForms = [], 
    summary = { cash: 0, checks: 0, remittance: 0 } 
}) {

  const totalCollections = summary.cash + summary.checks;
  const balance = totalCollections - summary.remittance;

  const renderRows = (data, minRows) => {
    const rows = [...data];
    while (rows.length < minRows) rows.push({});
    return rows;
  };

  return (
    <div className="rcd-print-container" style={styles.container}>
      
      {/* =========================================================
                                PAGE 1
      ========================================================= */}
      <div className="coa-page" style={styles.page}>
        
        {/* HEADER SECTION */}
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '15px', fontSize: '11pt' }}>
          <div style={{ fontWeight: 'bold' }}>{fund}</div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ marginBottom: '5px' }}>
              <span style={{ display: 'inline-block', width: '70px', textAlign: 'left' }}>Date:</span>
              <span style={{ borderBottom: '1px solid black', display: 'inline-block', width: '150px', textAlign: 'center' }}>{date}</span>
            </div>
            <div>
              <span style={{ display: 'inline-block', width: '70px', textAlign: 'left' }}>Report No.:</span>
              <span style={{ borderBottom: '1px solid black', display: 'inline-block', width: '150px', textAlign: 'center' }}>{reportNo}</span>
            </div>
          </div>
        </div>

        <div style={{ textAlign: 'center', marginBottom: '25px' }}>
          <h3 style={{ margin: '0 0 5px 0', fontSize: '14pt', fontWeight: 'bold' }}>REPORT OF COLLECTIONS AND DEPOSITS</h3>
          <h4 style={{ margin: 0, fontSize: '12pt', fontWeight: 'bold', textTransform: 'uppercase' }}>{lguName}</h4>
        </div>

        {/* A. COLLECTIONS */}
        <div style={styles.sectionTitle}>A. COLLECTIONS</div>
        <div style={styles.subTitle}>1. For Collectors</div>
        <table style={styles.table}>
          <thead>
            <tr style={styles.thRow}>
              <th rowSpan={2} style={styles.th}>Type (Form No.)</th>
              <th colSpan={2} style={styles.th}>Official Receipt/Serial No.</th>
              <th rowSpan={2} style={styles.th}>Amount</th>
            </tr>
            <tr style={styles.thRow}>
              <th style={styles.th}>From</th>
              <th style={styles.th}>To</th>
            </tr>
          </thead>
          <tbody>
            {renderRows(collections, 5).map((row, i) => (
              <tr key={`coll-${i}`}>
                <td style={styles.td}>{row.type || (i === 0 && totalCollections > 0 ? "AF 56" : "")}</td>
                <td style={styles.td}>{row.from || ""}</td>
                <td style={styles.td}>{row.to || ""}</td>
                <td style={{...styles.td, textAlign: 'right'}}>{row.amount || (i === 0 && totalCollections > 0 ? totalCollections.toFixed(2) : "")}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div style={styles.subTitle}>2. For Liquidating Officers/Treasurers</div>
        <table style={styles.table}>
          <thead>
            <tr style={styles.thRow}>
              <th style={styles.th}>Name of Accountable Officer</th>
              <th style={styles.th}>Report No.</th>
              <th style={styles.th}>Amount</th>
            </tr>
          </thead>
          <tbody>
            {renderRows(liquidating, 3).map((row, i) => (
              <tr key={`liq-${i}`}>
                <td style={styles.td}>{row.name || ""}</td>
                <td style={styles.td}>{row.reportNo || ""}</td>
                <td style={styles.td}></td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* B. REMITTANCES/DEPOSITS */}
        <div style={styles.sectionTitle}>B. REMITTANCES/DEPOSITS</div>
        <table style={styles.table}>
          <thead>
            <tr style={styles.thRow}>
              <th style={styles.th}>Accountable Officer/Bank</th>
              <th style={styles.th}>Reference</th>
              <th style={styles.th}>Amount</th>
            </tr>
          </thead>
          <tbody>
            {renderRows(remittances, 4).map((row, i) => (
              <tr key={`rem-${i}`}>
                <td style={styles.td}>{row.bank || ""}</td>
                <td style={styles.td}>{row.reference || ""}</td>
                <td style={styles.td}></td>
              </tr>
            ))}
          </tbody>
        </table>
        
        <div style={{ textAlign: "right", fontSize: "10pt", marginTop: "20px" }}>Page 1 of 2</div>
      </div>

      {/* PAGE BREAK (Forces Printer to split to the next piece of paper) */}
      <div style={{ pageBreakAfter: "always", height: "20px" }} className="no-print"></div>

      {/* =========================================================
                                PAGE 2
      ========================================================= */}
      <div className="coa-page" style={styles.page}>
        
     {/* C. ACCOUNTABILITY FOR ACCOUNTABLE FORMS */}
        <div style={styles.sectionTitle}>C. ACCOUNTABILITY FOR ACCOUNTABLE FORMS</div>
        
        <table style={{ width: '100%', tableLayout: 'fixed', borderCollapse: 'collapse', marginBottom: '15px', textAlign: 'center' }}>
          {/* 🌟 The ColGroup rigidly locks the width of all 13 columns so it CANNOT overextend */}
          <colgroup>
            <col style={{ width: '12%' }} /> {/* Name */}
            <col style={{ width: '4%' }} />  {/* Beg Qty */}
            <col style={{ width: '9%' }} />  {/* Beg From */}
            <col style={{ width: '9%' }} />  {/* Beg To */}
            <col style={{ width: '4%' }} />  {/* Rec Qty */}
            <col style={{ width: '9%' }} />  {/* Rec From */}
            <col style={{ width: '9%' }} />  {/* Rec To */}
            <col style={{ width: '4%' }} />  {/* Iss Qty */}
            <col style={{ width: '9%' }} />  {/* Iss From */}
            <col style={{ width: '9%' }} />  {/* Iss To */}
            <col style={{ width: '4%' }} />  {/* End Qty */}
            <col style={{ width: '9%' }} />  {/* End From */}
            <col style={{ width: '9%' }} />  {/* End To */}
          </colgroup>
          <thead>
            <tr style={{ backgroundColor: '#fff' }}>
              <th rowSpan={3} style={{ border: '1px solid #000', padding: '2px 1px', fontSize: '6pt', fontWeight: 'bold' }}>Name of Form<br/>& No.</th>
              <th colSpan={3} style={{ border: '1px solid #000', padding: '2px 1px', fontSize: '6pt', fontWeight: 'bold' }}>Beginning Balance</th>
              <th colSpan={3} style={{ border: '1px solid #000', padding: '2px 1px', fontSize: '6pt', fontWeight: 'bold' }}>Receipt</th>
              <th colSpan={3} style={{ border: '1px solid #000', padding: '2px 1px', fontSize: '6pt', fontWeight: 'bold' }}>Issued</th>
              <th colSpan={3} style={{ border: '1px solid #000', padding: '2px 1px', fontSize: '6pt', fontWeight: 'bold' }}>Ending Balance</th>
            </tr>
            <tr style={{ backgroundColor: '#fff' }}>
              <th rowSpan={2} style={{ border: '1px solid #000', padding: '2px 1px', fontSize: '5pt', fontWeight: 'bold' }}>Qty</th>
              {/* 🌟 Removed nowrap and used <br/> to allow the header to stack */}
              <th colSpan={2} style={{ border: '1px solid #000', padding: '2px 1px', fontSize: '5pt', fontWeight: 'bold' }}>INCLUSIVE<br/>SERIAL NO.</th>
              <th rowSpan={2} style={{ border: '1px solid #000', padding: '2px 1px', fontSize: '5pt', fontWeight: 'bold' }}>Qty</th>
              <th colSpan={2} style={{ border: '1px solid #000', padding: '2px 1px', fontSize: '5pt', fontWeight: 'bold' }}>INCLUSIVE<br/>SERIAL NO.</th>
              <th rowSpan={2} style={{ border: '1px solid #000', padding: '2px 1px', fontSize: '5pt', fontWeight: 'bold' }}>Qty</th>
              <th colSpan={2} style={{ border: '1px solid #000', padding: '2px 1px', fontSize: '5pt', fontWeight: 'bold' }}>INCLUSIVE<br/>SERIAL NO.</th>
              <th rowSpan={2} style={{ border: '1px solid #000', padding: '2px 1px', fontSize: '5pt', fontWeight: 'bold' }}>Qty</th>
              <th colSpan={2} style={{ border: '1px solid #000', padding: '2px 1px', fontSize: '5pt', fontWeight: 'bold' }}>INCLUSIVE<br/>SERIAL NO.</th>
            </tr>
            <tr style={{ backgroundColor: '#fff' }}>
               <th style={{ border: '1px solid #000', padding: '2px 1px', fontSize: '5.5pt', fontWeight: 'bold' }}>From</th>
               <th style={{ border: '1px solid #000', padding: '2px 1px', fontSize: '5.5pt', fontWeight: 'bold' }}>To</th>
               <th style={{ border: '1px solid #000', padding: '2px 1px', fontSize: '5.5pt', fontWeight: 'bold' }}>From</th>
               <th style={{ border: '1px solid #000', padding: '2px 1px', fontSize: '5.5pt', fontWeight: 'bold' }}>To</th>
               <th style={{ border: '1px solid #000', padding: '2px 1px', fontSize: '5.5pt', fontWeight: 'bold' }}>From</th>
               <th style={{ border: '1px solid #000', padding: '2px 1px', fontSize: '5.5pt', fontWeight: 'bold' }}>To</th>
               <th style={{ border: '1px solid #000', padding: '2px 1px', fontSize: '5.5pt', fontWeight: 'bold' }}>From</th>
               <th style={{ border: '1px solid #000', padding: '2px 1px', fontSize: '5.5pt', fontWeight: 'bold' }}>To</th>
            </tr>
          </thead>
          <tbody>
            {renderRows(accountableForms, 7).map((row, i) => (
              <tr key={`acc-${i}`}>
                {/* 🌟 Form Name */}
                <td style={{ border: '1px solid #000', padding: '2px 1px', fontSize: '6.5pt', height: '18px', whiteSpace: 'nowrap', overflow: 'hidden' }}>{row.formName || ""}</td>
                
                {/* 🌟 Beginning Balance */}
                <td style={{ border: '1px solid #000', padding: '2px 1px', fontSize: '6.5pt' }}>{row.begQty || ""}</td>
                <td style={{ border: '1px solid #000', padding: '2px 1px', fontSize: '6.5pt', whiteSpace: 'nowrap' }}>{row.begFrom || ""}</td>
                <td style={{ border: '1px solid #000', padding: '2px 1px', fontSize: '6.5pt', whiteSpace: 'nowrap' }}>{row.begTo || ""}</td>
                
                {/* 🌟 Receipt */}
                <td style={{ border: '1px solid #000', padding: '2px 1px', fontSize: '6.5pt' }}>{row.recQty || ""}</td>
                <td style={{ border: '1px solid #000', padding: '2px 1px', fontSize: '6.5pt', whiteSpace: 'nowrap' }}>{row.recFrom || ""}</td>
                <td style={{ border: '1px solid #000', padding: '2px 1px', fontSize: '6.5pt', whiteSpace: 'nowrap' }}>{row.recTo || ""}</td>
                
                {/* 🌟 Issued */}
                <td style={{ border: '1px solid #000', padding: '2px 1px', fontSize: '6.5pt' }}>{row.issQty || ""}</td>
                <td style={{ border: '1px solid #000', padding: '2px 1px', fontSize: '6.5pt', whiteSpace: 'nowrap' }}>{row.issFrom || ""}</td>
                <td style={{ border: '1px solid #000', padding: '2px 1px', fontSize: '6.5pt', whiteSpace: 'nowrap' }}>{row.issTo || ""}</td>
                
                {/* 🌟 Ending Balance */}
                <td style={{ border: '1px solid #000', padding: '2px 1px', fontSize: '6.5pt' }}>{row.endQty || ""}</td>
                <td style={{ border: '1px solid #000', padding: '2px 1px', fontSize: '6.5pt', whiteSpace: 'nowrap' }}>{row.endFrom || ""}</td>
                <td style={{ border: '1px solid #000', padding: '2px 1px', fontSize: '6.5pt', whiteSpace: 'nowrap' }}>{row.endTo || ""}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* D. SUMMARY */}
        <div style={styles.sectionTitle}>D. SUMMARY OF COLLECTIONS AND REMITTANCES/DEPOSITS</div>
        <div style={{ display: 'flex', gap: '30px', fontSize: '10pt', marginTop: '10px' }}>
          
          <div style={{ flex: 1 }}>
            <div style={styles.flexBetween}><span>Beginning Balance</span> <span style={styles.lineSubRight}></span></div>
            <div style={{ marginTop: '5px' }}>Add: Collections</div>
            <div style={styles.flexBetween}><span style={{ paddingLeft: '20px' }}>Cash</span> <span style={styles.lineSubRight}>{summary.cash > 0 ? summary.cash.toFixed(2) : ""}</span></div>
            <div style={styles.flexBetween}><span style={{ paddingLeft: '20px' }}>Check</span> <span style={styles.lineSubRight}>{summary.checks > 0 ? summary.checks.toFixed(2) : ""}</span></div>
            <div style={styles.flexBetween}><strong>Total</strong> <span style={styles.lineSubRight}>{totalCollections > 0 ? totalCollections.toFixed(2) : ""}</span></div>
            <div style={{ marginTop: '10px' }}>Less: Remittance/Deposit to</div>
            <div style={{ paddingLeft: '30px' }}>Treasurer/Depository Bank</div>
            <div style={styles.flexBetween}><strong>Balance</strong> <span style={styles.lineSubRight}>{balance !== 0 ? balance.toFixed(2) : ""}</span></div>
          </div>

          <div style={{ flex: 1 }}>
            <table style={{...styles.table, marginTop: '0'}}>
              <thead>
                <tr style={styles.thRow}>
                  <th style={styles.th}>Check No.</th>
                  <th style={styles.th}>Payee</th>
                  <th style={styles.th}>Amount</th>
                </tr>
              </thead>
              <tbody>
                {renderRows([], 5).map((row, i) => (
                  <tr key={`chk-${i}`}>
                    <td style={styles.td}></td>
                    <td style={styles.td}></td>
                    <td style={styles.td}></td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div style={{ textAlign: 'center', fontSize: '9pt', marginTop: '5px', fontStyle: 'italic' }}>
              NOTE: Use additional sheet if Necessary
            </div>
          </div>
        </div>

        {/* SIGNATURES */}
        <div style={styles.signatureGrid}>
          
          <div style={styles.sigBox}>
            <p style={{ fontSize: '10pt', textAlign: 'justify', margin: '0 0 40px 0', lineHeight: '1.4' }}>
              I hereby certify that the above foregoing reports of collection and deposits and accountability accountable forms is true and correct.
            </p>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
              <div style={{ textAlign: 'center', width: '68%' }}> {/* 🌟 Widened container */}
                {/* 🌟 Added whiteSpace: 'nowrap' to force single line */}
                <div style={{ borderBottom: '1px solid black', fontWeight: 'bold', fontSize: '10pt', whiteSpace: 'nowrap' }}>{officerName}</div>
                <div style={{ fontSize: '8pt' }}>Name & Signature</div>
                <div style={{ fontSize: '9pt', marginTop: '2px', whiteSpace: 'nowrap' }}>{officerTitle}</div>
              </div>
              <div style={{ textAlign: 'center', width: '28%' }}>
                <div style={{ borderBottom: '1px solid black', height: '16px', fontSize: '10pt' }}>{date}</div>
                <div style={{ fontSize: '8pt' }}>Date</div>
              </div>
            </div>
          </div>

          <div style={styles.sigBox}>
            <p style={{ fontSize: '10pt', textAlign: 'justify', margin: '0 0 20px 0', lineHeight: '1.4' }}>
              I hereby certify that the foregoing report collections has been verified and acknowledgement receipt of <span style={{ borderBottom: '1px solid #000', display: 'inline-block', width: '100px' }}></span> =P= <span style={{ borderBottom: '1px solid #000', display: 'inline-block', width: '80px' }}></span>
            </p>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
              <div style={{ textAlign: 'center', width: '68%' }}> {/* 🌟 Widened container */}
                {/* 🌟 Added whiteSpace: 'nowrap' to force single line */}
                <div style={{ borderBottom: '1px solid black', fontWeight: 'bold', fontSize: '10pt', whiteSpace: 'nowrap' }}>DINIA A. TAÑEDO</div>
                <div style={{ fontSize: '8pt' }}>Name and Signature</div>
                <div style={{ fontSize: '9pt', marginTop: '2px', whiteSpace: 'nowrap' }}>Municipal Treasurer</div>
              </div>
              <div style={{ textAlign: 'center', width: '28%' }}>
                <div style={{ borderBottom: '1px solid black', height: '16px', fontSize: '10pt' }}></div>
                <div style={{ fontSize: '8pt' }}>Date</div>
              </div>
            </div>
          </div>

        </div>

        <div style={{ textAlign: "right", fontSize: "10pt", marginTop: "10px" }}>Page 2 of 2</div>
      </div>
    </div>
  );
}

const styles = {
  container: {
    fontFamily: 'Arial, Helvetica, sans-serif',
    color: '#000',
    backgroundColor: '#eff3f8',
    padding: '20px 0',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center'
  },
  page: {
    backgroundColor: '#fff',
    width: '8.5in',   // Enforces strictly US Legal / Letter portrait width
    minHeight: '11in',
    margin: '0 auto',
    padding: '40px 0.5in', // Standardized margins to prevent squishing
    boxSizing: 'border-box',
    boxShadow: '0 4px 8px rgba(0,0,0,0.1)'
  },
  sectionTitle: { fontWeight: 'bold', fontSize: '11pt', marginTop: '15px', marginBottom: '8px' },
  subTitle: { fontWeight: 'bold', fontSize: '10pt', marginLeft: '15px', marginBottom: '4px' },
  table: { width: '100%', borderCollapse: 'collapse', marginBottom: '15px', fontSize: '10pt', textAlign: 'center' },
  thRow: { backgroundColor: '#fff' }, 
  th: { border: '2px solid #000', padding: '6px 2px', fontWeight: 'bold', color: '#000' },
  td: { border: '1px solid #000', padding: '5px 2px', height: '22px', color: '#000' },
  flexBetween: { display: 'flex', justifyContent: 'space-between', marginBottom: '6px' },
  lineSubRight: { borderBottom: '1px solid black', width: '100px', textAlign: 'right', paddingRight: '5px', fontWeight: 'bold' },
  signatureGrid: { display: 'flex', gap: '20px', marginTop: '30px' },
  sigBox: { flex: 1, padding: '15px', border: '2px solid black', display: 'flex', flexDirection: 'column', justifyContent: 'flex-start' }
};