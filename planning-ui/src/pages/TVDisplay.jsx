// TVDisplay.jsx - Production Dashboard TV Screen (copy-paste ready)
import React, { useState, useEffect, useMemo } from "react";
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, LabelList, CartesianGrid
} from "recharts";

// Configurable constants
const API_BASE = import.meta.env.VITE_API_URL;
const API = `${API_BASE}/dashboard`;
const REFRESH_INTERVAL_MS = 10000;  // Data refresh interval
const ROTATION_INTERVAL_MS = 8000;  // Screen rotate interval
const LOGO_PATH = "/assets/logo.png";  // Path to logo image
const NUM_SCREENS = 3;  // Number of rotating screens

export default function TVDisplay() {
  // State for data and UI
  const [liveData, setLiveData] = useState({ kpi: {}, shift: [], table: [] });
  const [mtTrend, setMtTrend] = useState([]);
  const [screen, setScreen] = useState(0);
  const [paused, setPaused] = useState(false);

  // Fetch data function
  const loadData = async () => {
    try {
      const today = new Date().toISOString().split("T")[0];
      // Fetch live metrics
      const resLive = await fetch(`${API_BASE_URL}/live`);
      const dataLive = await resLive.json();
      // Fetch plan vs actual table (with columns: part_number, line, mt, status, etc.)
      const resPlan = await fetch(`${API_BASE_URL}/plan-vs-actual?date=${today}`);
      const dataPlan = await resPlan.json();
      // Fetch customer-critical (if needed in alerts screen)
      const resCrit = await fetch(`http://localhost:8020/planning/customer-critical?date=${today}`);
      const dataCrit = await resCrit.json();
      // Fetch MT trend
      const resTrend = await fetch(`${API_BASE_URL}/mt-trend`);
      const trendData = await resTrend.json();
      
      // Convert to full month format
      const now = new Date();
      const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
      
      const fullMonth = Array.from({ length: daysInMonth }, (_, i) => {
        const day = (i + 1).toString().padStart(2, "0");
      
        const found = trendData.find(d => d.date.endsWith(`-${day}`));
      
        return {
          date: day,
          mt: found ? found.mt : 0
        };
      });

      setMtTrend(fullMonth);

      // Update state
      setLiveData({ kpi: dataLive.kpi || {}, shift: dataLive.shift || [], table: dataPlan.table || [], critical: dataCrit || [] });
    } catch (err) {
      console.error("Failed to load data:", err);
    }
  };

  // Effect: initial load and periodic refresh【13†L417-L424】
  useEffect(() => {
    loadData();
    const timer = setInterval(loadData, REFRESH_INTERVAL_MS);
    return () => clearInterval(timer);
  }, []);

  // Effect: auto-rotate screens unless paused【28†L184-L193】
  useEffect(() => {
    if (paused) return;
    const rotate = () => setScreen((s) => (s + 1) % NUM_SCREENS);
    const id = setInterval(rotate, ROTATION_INTERVAL_MS);
    return () => clearInterval(id);
  }, [paused]);

  // Derived metrics (memoized)【15†L202-L210】
  const totalMT = useMemo(() => {
    return liveData.table.reduce((sum, row) => sum + (row.mt || 0), 0);
  }, [liveData.table]);

  // Prepare line-wise MT sums
  const lineSummary = useMemo(() => {
    const result = {};
  
    (liveData.table || []).forEach(r => {
      const line = r.line || "Line Not Assigned";
  
      if (!result[line]) {
        result[line] = { qty: 0, mt: 0 };
      }
  
      result[line].qty += (r.actual || 0);  // QA = actual
      result[line].mt += (r.mt || 0);
    });

    return result;
  }, [liveData.table]);

  const CompletionGauge = ({ value }) => {
    const angle = (value || 0) * 3.6;

    const color =
      value >= 80 ? "#00ff88" :
      value >= 50 ? "#ffaa00" :
      "#ff4d4d";

    return (
      <div style={{
        width: 180,
        height: 180,
        borderRadius: "50%",
        background: `conic-gradient(${color} ${angle}deg, #222 ${angle}deg)`,
        display: "flex",
        alignItems: "center",
        justifyContent: "center"
      }}>
        <div style={{
          width: 130,
          height: 130,
          borderRadius: "50%",
          background: "#0b0b0b",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexDirection: "column"
        }}>
          <div style={{ fontSize: 28, fontWeight: "bold" }}>
            {value}%
          </div>
          <div style={{ fontSize: 12, opacity: 0.6 }}>
            Completion
          </div>
        </div>
      </div>
    );
  };

  // Determine gauge color based on completion threshold
  const comp = liveData.kpi.completion || 0;
  const gaugeColor = comp >= 70 ? "#00ff88" : "#ff4d4d";  // green if >=70%, else red

  // Render different screens
  return (
    <div style={styles.container}>
      {/* HEADER */}
      <div style={styles.header}>

        {/* LEFT → LOGO */}
        <div style={{ display: "flex", alignItems: "center" }}>
          <img src={LOGO_PATH} alt="Company Logo" style={{ height: 50 }} />
        </div>
      
        {/* CENTER → TITLE */}
        <div style={{ textAlign: "center" }}>
          <div style={styles.title}>JAI - CHN DASHBOARD</div>
        </div>
      
        {/* RIGHT → DATE */}
        <div style={{ textAlign: "right" }}>
          <div>{new Date().toLocaleDateString("en-GB")}</div>
          <div style={{ opacity: 0.6 }}>
            Screen {screen + 1} of {NUM_SCREENS}
          </div>
        </div>
      
      </div>

      {/* Screen Indicator and Controls */}
      <div style={styles.controls}>
        <button aria-label="Previous Screen" onClick={() => setScreen((screen + NUM_SCREENS - 1) % NUM_SCREENS)}>
          ‹ Prev
        </button>
        <button aria-label={paused ? "Play Rotation" : "Pause Rotation"} onClick={() => setPaused(!paused)}>
          {paused ? "▶ Play" : "⏸ Pause"}
        </button>
        <button aria-label="Next Screen" onClick={() => setScreen((screen + 1) % NUM_SCREENS)}>
          Next ›
        </button>
        <span style={styles.screenIndicator}>
          Screen {screen + 1} of {NUM_SCREENS}
        </span>
      </div>

      {/* Screen 1: KPI Cards */}
      {screen === 0 && (
        <div style={{ marginTop: 20 }}>

          {/* KPI TOP */}
          <div style={{ display: "flex", gap: 20, marginBottom: 20 }}>
            <div style={styles.card}>
              <div style={styles.cardTitle}>Total MT</div>
              <div style={styles.bigText}>{totalMT.toFixed(1)}</div>
            </div>

            <div style={styles.card}>
              <CompletionGauge value={comp.toFixed(0)} />
            </div>
          </div>

          {/* MT TREND GRAPH */}
          <div style={{ height: "65vh" }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={mtTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke="#333" />
      
                <XAxis dataKey="date" />
                <YAxis />
      
                <Tooltip />

                <Bar dataKey="mt" fill="#ff4d4d">
                  <LabelList dataKey="mt" position="top" />
                </Bar>

              </BarChart>
            </ResponsiveContainer>
          </div>

        </div>
      )}

      {/* Screen 2: Line MT Grid */}
      {screen === 1 && (
        <div>
          <h2 style={styles.sectionTitle}>Line MT Totals</h2>
          <div style={styles.grid}>
            {Object.entries(lineSummary).map(([line, data]) => (
              <div key={line} style={styles.lineCard}>
                <div style={{ fontSize: 18, marginBottom: 5 }}>
                  {line}
                </div>

                <div style={{ fontSize: 28, fontWeight: "bold" }}>
                  {data.qty}
                </div>

                <div style={{ fontSize: 14, opacity: 0.6 }}>
                  Units
                </div>

                <div style={{ marginTop: 8, color: "#00ff88", fontSize: 22 }}>
                  {data.mt.toFixed(1)} MT
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Screen 3: Critical Parts and Alerts */}
      {screen === 2 && (
        <div>
          <h2 style={styles.sectionTitle}>Production Plan</h2>
          <div style={styles.card}>
            <table style={styles.table}>
              <thead>
                <tr>
                  <th>Part</th>
                  <th>Plan</th>
                  <th>QA Done</th>
                  <th>Balance</th>
                  <th>MT</th>
                </tr>
              </thead>
              <tbody>
                {/* Show up to 10 entries where status != "ok" */}
                {liveData.table.filter(r => r.status !== "ok").slice(0,10).map((r,i) => (
                  <tr key={i}>
                    <td>{r.part_number}</td>

                    <td>{r.plan || r.planned || 0}</td>

                    <td style={{ color: "#00ff88" }}>
                      {r.actual || 0}
                    </td>

                    <td style={{ color: "#ff4d4d" }}>
                      {r.balance}
                    </td>

                    <td>{r.mt}</td>

                    <td>
                      {r.plan ? ((r.qa || 0) / r.plan * 100).toFixed(0) + "%" : "0%"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Customer-Critical Alerts (if data exists) */}
          {liveData.critical && liveData.critical.length > 0 && (
            <>
              <h2 style={styles.sectionTitle}>Customer-Critical Alerts</h2>
              <div style={styles.card}>
                <table style={styles.table}>
                  <thead>
                    <tr><th>Part</th><th>Customer</th><th>Qty</th><th>Deadline</th><th>Target</th></tr>
                  </thead>
                  <tbody>
                    {liveData.critical.slice(0,5).map((r,i) => (
                      <tr key={i}>
                        <td>{r.part_number}</td>
                        <td>{r.customer}</td>
                        <td>{r.quantity}</td>
                        <td>{r.line_stoppage_deadline}</td>
                        <td>{r.target_time}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

/* --- CSS-in-JS styles --- */
const styles = {
  container: {
    display: "flex", flexDirection: "column",
    background: "#0b0b0b", color: "#fff",
    width: "100%", height: "100vh", padding: 20,
    boxSizing: "border-box", fontFamily: "sans-serif"
  },
  header: {
    display: "grid",
    gridTemplateColumns: "1fr 2fr 1fr",
    alignItems: "center"
  },
  headerLeft: { display: "flex", alignItems: "center" },
  logo: { height: 50, marginRight: 20 },
  title: { fontSize: 32, color: "#C8102E", fontWeight: "bold" },
  date: { opacity: 0.6 },
  headerRight: { textAlign: "right" },
  controls: { display: "flex", alignItems: "center", margin: "10px 0", gap: "10px" },
  screenIndicator: { marginLeft: "auto", fontStyle: "italic" },
  kpiScreen: { display: "flex", gap: 20, marginTop: 20 },
  card: {
    flex: 1, background: "#1c1c1c", padding: 20, borderRadius: 8,
    display: "flex", flexDirection: "column", alignItems: "center"
  },
  cardTitle: { marginBottom: 10, fontSize: 20 },
  bigText: { fontSize: 48, fontWeight: "bold" },
  gauge: {
    width: 100, height: 100, borderRadius: "50%",
    position: "relative", display: "flex", alignItems: "center", justifyContent: "center"
  },
  gaugeText: { position: "absolute", color: "#fff", fontWeight: "bold" },
  shiftCard: { flex: "0 0 150px", background: "#111", padding: 15, borderRadius: 8, textAlign: "center" },
  grid: {
    display: "grid", gap: 20, marginTop: 10,
    gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))"
  },
  lineCard: {
    background: "#111", padding: 20, borderRadius: 8, textAlign: "center"
  },
  sectionTitle: { color: "#00ff88", marginTop: 20 },
  table: { width: "100%", borderCollapse: "collapse" }
};
