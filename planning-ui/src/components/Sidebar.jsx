import { NavLink } from "react-router-dom";

export default function Sidebar() {
  return (
    <div style={container}>

      {/* HEADER */}
      <div style={header}>
        <div style={logo}>JAMNA</div>
        <div style={subText}>Production System</div>
      </div>

      {/* MENU */}
      <div style={menu}>

        <NavLink to="/" style={linkStyle} className="nav-item">
          Dashboard
        </NavLink>

        <NavLink to="/planning" style={linkStyle} className="nav-item">
          Planning
        </NavLink>

        <NavLink to="/execution" style={linkStyle} className="nav-item">
          Execution
        </NavLink>

      </div>

      {/* FOOTER */}
      <div style={footer}>
        <div style={{ opacity: 0.5 }}>v1.0</div>
      </div>

      {/* INLINE CSS (IMPORTANT) */}
      <style>
        {`
          .nav-item {
            padding: 12px 15px;
            border-radius: 8px;
            margin-bottom: 8px;
            text-decoration: none;
            color: #ccc;
            display: block;
            font-size: 14px;
            transition: all 0.2s ease;
          }

          .nav-item:hover {
            background: #1f1f1f;
            color: white;
          }

          .nav-item.active {
            background: #C8102E;
            color: white;
            font-weight: 600;
          }
        `}
      </style>

    </div>
  );
}

/* 🎨 STYLES */

const container = {
  width: 220,
  background: "#0f0f0f",
  color: "white",
  height: "100vh",
  display: "flex",
  flexDirection: "column",
  justifyContent: "space-between",
  borderRight: "1px solid #222"
};

const header = {
  padding: 20,
  borderBottom: "1px solid #222"
};

const logo = {
  color: "#C8102E",
  fontSize: 22,
  fontWeight: "bold",
  letterSpacing: 1
};

const subText = {
  fontSize: 12,
  opacity: 0.5,
  marginTop: 4
};

const menu = {
  padding: 15
};

const footer = {
  padding: 15,
  borderTop: "1px solid #222",
  fontSize: 12
};

const linkStyle = {
  textDecoration: "none"
};