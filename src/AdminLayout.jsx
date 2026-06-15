
const AdminLayout = ({ children }) => {
  return (
    <div className="d-flex w-100" style={{ minHeight: "100vh", backgroundColor: "var(--lgu-gray)" }}>
      
      {/* 🌟 NAVY SIDEBAR (Hidden during print) */}
      <aside className="bg-navy p-3 d-flex flex-column no-print-sidebar" style={{ width: "260px", flexShrink: 0, boxShadow: "2px 0 5px rgba(0,0,0,0.1)", zIndex: 10 }}>
        <div className="text-center mb-4 mt-2">
          {/* Replace with your actual LGU logo path if needed */}
          <div style={{ width: "70px", height: "70px", background: "white", borderRadius: "50%", margin: "0 auto 10px auto", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--lgu-navy)", fontWeight: "bold" }}>
            LOGO
          </div>
          <h6 className="text-uppercase fw-bold m-0" style={{ color: "var(--lgu-gold)" }}>Macalelon RPT</h6>
          <small className="text-light opacity-75">Treasury Operations</small>
        </div>

        <hr className="border-secondary mb-4" />

        <ul className="nav flex-column gap-2">
          <li className="nav-item">
            <a href="/" className="nav-link text-white rounded" style={{ background: "rgba(255,255,255,0.1)" }}>📊 Dashboard</a>
          </li>
          <li className="nav-item">
            <a href="/assessments" className="nav-link text-white rounded">📋 Assessments</a>
          </li>
          <li className="nav-item">
            <a href="/collections" className="nav-link text-white rounded">💰 Collections</a>
          </li>
          <li className="nav-item">
            <a href="/mass-print" className="nav-link text-white rounded">🖨️ Mass Print SOA</a>
          </li>
        </ul>
      </aside>

      {/* 🌟 MAIN CONTENT AREA */}
      <div className="flex-grow-1 d-flex flex-column print-expand" style={{ minWidth: 0 }}>
        
        {/* Top Header (Hidden during print) */}
        <header className="bg-white shadow-sm d-flex justify-content-between align-items-center p-3 no-print-sidebar" style={{ borderBottom: "3px solid var(--lgu-navy)", zIndex: 5 }}>
          <h5 className="m-0 text-navy fw-bold">Real Property Tax Management System</h5>
          <div className="d-flex align-items-center gap-3">
            <span className="text-muted fw-semibold">Welcome, Treasury Staff</span>
            <button className="btn btn-sm btn-outline-danger">Logout</button>
          </div>
        </header>

        {/* Dynamic Page Content goes here */}
        <main className="p-4 flex-grow-1 overflow-auto print-expand">
          {children}
        </main>
      </div>
    </div>
  );
};

export default AdminLayout;