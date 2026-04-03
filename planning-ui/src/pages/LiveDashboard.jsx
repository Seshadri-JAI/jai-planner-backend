import { useEffect, useState, useMemo } from "react";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, LabelList } from "recharts";
import Sidebar from "../components/Sidebar";

const API_BASE = import.meta.env.VITE_API_URL;
const API = `${API_BASE}/dashboard`;

export default function LiveDashboard() {

  const [data, setData] = useState({ kpi: {}, stages: [], shift: [] });
  const [dashboard, setDashboard] = useState(null);
  const [mtTrend, setMtTrend] = useState([]);

  const today = new Date().toISOString().split("T")[0];

  useEffect(() => {
    const fetchData = async () => {
      try {
        const token = localStorage.getItem("token");

        const live = await fetch(`${API}/live`, {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }).then(r => r.json());
        const plan = await fetch(`${API}/plan-vs-actual?date=${today}`, {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }).then(r => r.json());
        const trend = await fetch(`${API}/mt-trend`, {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }).then(r => r.json());
        setMtTrend(trend);

        setData(live);
        setDashboard(plan);

      } catch (e) {
        console.log(e);
      }
    };

    fetchData();
    const interval = setInterval(fetchData, 5000);
    return () => clearInterval(interval);

  }, []);

  const monthlyData = useMemo(() => {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();
  
    const daysInMonth = new Date(year, month + 1, 0).getDate();
  
    const map = {};
    (mtTrend || []).forEach(d => {
      map[d.date] = d.mt;
    });
  
    const result = [];
  
    for (let d = 1; d <= daysInMonth; d++) {
      const date = `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;

        result.push({
      date: d.toString(),   // only day number
          mt: map[date] || 0
      });
    }

    return result;
  }, [mtTrend]);

  return (
    <div style={{ display: "flex" }}>

      <Sidebar />

      <div style={container}>

        {/* HEADER */}
        <div style={header}>
          <h1 style={title}>JAI PLANNER</h1>
          <div style={date}>{today}</div>
        </div>

        {/* KPI */}
        <div style={kpiRow}>

          <div style={kpiPrimary}>
            <div style={{ marginBottom: 10 }}>Completion</div>

            <div style={{
              width: 140,
              height: 140,
              borderRadius: "50%",
              margin: "0 auto",
              background: `conic-gradient(
                ${ (data.kpi?.completion || 0) >= 70 ? "#00ff88" : "#ff4d4d" } 
                ${(data.kpi?.completion || 0) * 3.6}deg,
                #333 ${(data.kpi?.completion || 0) * 3.6}deg
              )`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center"
            }}>
              <div style={{
                width: 90,
                height: 90,
                borderRadius: "50%",
                background: "#C8102E",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 18,
                fontWeight: "bold"
              }}>
                {(data.kpi?.completion || 0)}%
              </div>
            </div>
          </div>

          <div style={kpiSecondary}>
            <div style={{ marginBottom: 10, opacity: 0.7 }}>
              Assembly Output
            </div>
          
            <div style={{
              fontSize: 42,
              fontWeight: "bold",
              marginBottom: 5
            }}>
              {data.kpi?.assembly_completion || 0}
            </div>

            <div style={{
              fontSize: 14,
              opacity: 0.6
            }}>
              Units
            </div>
          
            <div style={{
              marginTop: 12,
              paddingTop: 10,
              borderTop: "1px solid #333",
              fontSize: 20,
              color: "#00ff88",
              fontWeight: "bold"
            }}>
              {(
                (dashboard?.table || []).reduce((sum, row) => sum + (row.mt || 0), 0)
              ).toFixed(2)} MT
            </div>
          </div>

        </div>

        {/* SHIFT SUMMARY */}
        <div style={shiftRow}>
          {(data.shift || []).map((s, i) => (
            <div key={i} style={shiftCard}>
              <div>Shift {s.shift}</div>
              <div style={shiftValue}>{s.actual}</div>
            </div>
          ))}
        </div>

        {/* GRAPH */}
        <div style={graphBox}>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={monthlyData} margin={{ top: 30, right: 20, left: 0, bottom: 10 }}>
              <XAxis dataKey="date" stroke="#888" />
              <YAxis stroke="#888" />
              <Bar dataKey="mt" fill="#ff4d4d" barSize={14}>
                <LabelList dataKey="mt" position="top" fill="#aaa" fontSize={10} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* 🚀 NEW ENTERPRISE TABLE */}
        {dashboard?.table && (
          <div>
            <h3 style={sectionTitle}>Production Summary (Shift-wise)</h3>

            <table style={table}>
              <thead>
                <tr>
                  <th>Part</th>
                  <th>Plan</th>
                  <th>A</th>
                  <th>B</th>
                  <th>C</th>
                  <th>Total</th>
                  <th>Balance</th>
                  <th>MT</th>
                  <th>%</th>
                </tr>
              </thead>

              <tbody>
                {dashboard.table.map((row, i) => {

                  const shiftA = row.shifts?.A || 0;
                  const shiftB = row.shifts?.B || 0;
                  const shiftC = row.shifts?.C || 0;
                  const total = shiftA + shiftB + shiftC;

                  return (
                    <tr
                      key={i}
                      style={{
                        background:
                          row.status === "delay"
                            ? "#3a0000"
                            : row.status === "risk"
                            ? "#3a2a00"
                            : "#002b1f"
                      }}
                    >
                      <td>{row.part_number}</td>

                      <td>{row.planned}</td>

                      <td>{shiftA}</td>
                      <td>{shiftB}</td>
                      <td>{shiftC}</td>

                      <td
                        style={{
                          fontWeight: "bold",
                          color:
                            row.status === "delay"
                              ? "#ff4d4d"
                              : row.status === "risk"
                              ? "#ffa500"
                              : "#00ff88"
                        }}
                      >
                        {total}
                      </td>

                      <td style={{ color: row.balance > 0 ? "#ff4d4d" : "#00ff88" }}>
                        {row.balance}
                      </td>

                      <td>{row.mt}</td>
                      <td>{row.achievement}%</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

      </div>
    </div>
  );
}

/* 🎨 STYLES */

const container = {
  flex: 1,
  background: "#0b0b0b",
  color: "white",
  padding: 25,
  display: "flex",
  flexDirection: "column",
  gap: 25
};

const header = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center"
};

const title = {
  color: "#C8102E",
  fontSize: 36,
  fontWeight: "bold"
};

const date = {
  opacity: 0.6,
  fontSize: 18
};

const kpiRow = {
  display: "grid",
  gridTemplateColumns: "2fr 1fr",
  gap: 25
};

const kpiPrimary = {
  background: "#1c1c1c",
  padding: 25,
  borderRadius: 12,
  textAlign: "center"
};

const kpiSecondary = {
  background: "#1c1c1c",
  padding: 25,
  borderRadius: 12,
  textAlign: "center"
};

const kpiValue = {
  fontSize: 52,
  fontWeight: "bold"
};

const shiftRow = {
  display: "flex",
  justifyContent: "space-evenly"
};

const shiftCard = {
  background: "#1c1c1c",
  padding: 20,
  borderRadius: 12,
  width: 160,
  textAlign: "center"
};

const shiftValue = {
  fontSize: 32,
  fontWeight: "bold"
};

const graphBox = {
  height: 300
};

const sectionTitle = {
  marginBottom: 10,
  fontSize: 20
};

const table = {
  width: "100%",
  borderCollapse: "collapse",
  fontSize: 16
};