import { useEffect, useState, Fragment, useMemo } from "react";
import Sidebar from "../components/Sidebar";

const API_BASE = import.meta.env.VITE_API_URL;
const API = `${API_BASE}/planning`;

const STAGES = ["RM", "SPVC", "BHT", "Parabolic", "HT", "Comp", "Paint"];

export default function ExecutionGrid() {

  const [data, setData] = useState([]);
  const [criticalRows, setCriticalRows] = useState([]);
  const [locked, setLocked] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const [date, setDate] = useState(
    new Date().toISOString().split("T")[0]
  );

  useEffect(() => {
    load();
  }, [date]);

  const load = async () => {
    const res = await fetch(`${API}/execution-table?date=${date}`);
    const table = await res.json();

    const status = await fetch(`${API}/day-status?date=${date}`);
    const s = await status.json();

    const critical = await fetch(`${API}/customer-critical?date=${date}`).then(r => r.json());

    setData(table);
    setLocked(s.closed);
    setCriticalRows(critical);
  };

  // ------------------------
  // CALCULATIONS
  // ------------------------
  const calculateLivePending = (row) => {
    const planned = row.planned || 0;
    const assembly = row.actual || 0;
    const qa = row.qa || 0;
    const prevQa = row.prev_qa_pending || 0;

    return {
      assy_pending: Math.max(planned - assembly - prevQa, 0),
      qa_pending: Math.max(prevQa + assembly - qa, 0)
    };
  };

  const totalMT = useMemo(() => {
    return data.reduce((sum, row) => {
      return sum + ((row.qa || 0) * (row.weight || 0)) / 1000;
    }, 0);
  }, [data]);

  const mtByLine = useMemo(() => {
    const result = {};
    data.forEach(row => {
      const mt = ((row.qa || 0) * (row.weight || 0)) / 1000;
      const line = row.line || "Unassigned";
      result[line] = (result[line] || 0) + mt;
    });
    return result;
  }, [data]);

  // ------------------------
  // SAVE
  // ------------------------
  const save = async () => {

    const rows = data.map(row => ({
      part_number: row.part_number,
      shift: row.shift,
      line: row.line || "Line 1 (Conv)",
      actual: row.actual || 0,
      qa: row.qa || 0,
      stages: row.stages || {}
    }));

    await fetch(`${API}/execution-save`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ date, rows })
    });

    // 🔥 SAVE CUSTOMER CRITICAL
    await fetch(`${API}/customer-critical-save`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        date: date,
        rows: criticalRows
      })
    });

    alert("Saved successfully");
  };

  const closeDay = async () => {
    try {
      const res = await fetch(`${API}/close-day?date=${date}`, {
        method: "POST"
      });

      const data = await res.json();

      alert(data.message || "Day closed successfully");

      load();

    } catch (err) {
      console.error("Close day error:", err);
      alert("Failed to close day");
    }
  };

  // ------------------------
  // RENDER
  // ------------------------
  let lastShift = null;
  let lastLine = null;

  return (
    <div style={{ display: "flex" }}>
      <Sidebar />

      <div style={container}>

        {/* HEADER */}
        <div style={header}>
          <div>
            <h1 style={title}>Execution Sheet</h1>
            <div style={{ opacity: 0.6 }}>Production Entry</div>
          </div>

          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            style={dateInput}
          />
        </div>

        <div style={mtBox}>
          Total MT: {totalMT.toFixed(2)}
        </div>

        {/* MAIN TABLE */}
        <div style={card}>
          <table style={table}>
            <thead>
              <tr>
                <th>Part</th>
                <th>Shift</th>
                <th>Line</th>
                <th>Plan</th>
                <th>Assembly</th>
                <th>QA</th>
                <th>Assy Balance</th>
                <th>QA Pending</th>
                <th>MT</th>
                {STAGES.map(s => <th key={s}>{s}</th>)}
              </tr>
            </thead>

            <tbody>
              {data.map((row, i) => {

                const live = calculateLivePending(row);

                const showShiftHeader = row.shift !== lastShift;
                if (showShiftHeader) lastLine = null;

                const showLineHeader = row.line !== lastLine;

                lastShift = row.shift;
                lastLine = row.line;

                return (
                  <Fragment key={`${row.part_number}-${row.shift}`}>

                    {showShiftHeader && (
                      <tr>
                        <td colSpan="100%" style={shiftHeader}>
                          Shift {row.shift}
                        </td>
                      </tr>
                    )}

                    {showLineHeader && (
                      <tr>
                        <td colSpan="100%" style={lineHeader}>
                          {row.line}
                        </td>
                      </tr>
                    )}

                    <tr>
                      <td>{row.part_number}</td>
                      <td>{row.shift}</td>

                      <td>
                        <select
                          value={row.line}
                          onChange={(e) => {
                            const value = e.target.value;
                            setData(prev =>
                              prev.map((r, idx) =>
                                idx === i ? { ...r, line: value } : r
                              )
                            );
                          }}
                        >
                          <option>Line 1 (Conv)</option>
                          <option>Line 2 (HP)</option>
                          <option>Line 3 (New)</option>
                          <option>Line 4 (LP)</option>
                        </select>
                      </td>

                      <td>{row.planned}</td>

                      <td>
                        <input
                          type="number"
                          value={row.actual || 0}
                          disabled={locked}
                          onChange={(e) => {
                            const val = Number(e.target.value);
                            setData(prev =>
                              prev.map((r, idx) =>
                                idx === i ? { ...r, actual: val } : r
                              )
                            );
                          }}
                          style={actualInput}
                        />
                      </td>

                      <td>
                        <input
                          type="number"
                          value={row.qa || 0}
                          disabled={locked}
                          onChange={(e) => {
                            const val = Number(e.target.value);
                            setData(prev =>
                              prev.map((r, idx) =>
                                idx === i ? { ...r, qa: val } : r
                              )
                            );
                          }}
                          style={actualInput}
                        />
                      </td>

                      <td style={{ color: live.assy_pending > 0 ? "#ff4d4d" : "#00ff88" }}>
                        {live.assy_pending}
                      </td>

                      <td style={{ color: live.qa_pending > 0 ? "orange" : "#00ff88" }}>
                        {live.qa_pending}
                      </td>

                      <td>{(((row.qa || 0) * (row.weight || 0)) / 1000).toFixed(2)}</td>

                      {STAGES.map(stage => (
                        <td key={stage}>
                          <input
                            type="text"
                            value={row.stages?.[stage] || ""}
                            disabled={locked}
                            onChange={(e) => {
                              const updated = [...data];
                              updated[i].stages[stage] = e.target.value;
                              setData(updated);
                            }}
                            style={input}
                          />
                        </td>
                      ))}
                    </tr>
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* LINE MT */}
        <div style={lineMTBox}>
          {Object.entries(mtByLine).map(([line, mt]) => (
            <div key={line} style={lineMTCard}>
              {line}: {mt.toFixed(2)} MT
            </div>
          ))}
        </div>

        {/* ACTIONS */}
        <div style={actions}>
          {!locked && (
            <>
              <button style={primaryBtn} onClick={save}>Save</button>
              <button onClick={() => setShowConfirm(true)}>
                Close Day
              </button>
            </>
          )}
        </div>

        {/* CUSTOMER CRITICAL */}
        <div style={card}>
          <h3>Customer Critical</h3>

          <table style={table}>
            <thead>
              <tr>
                <th>Part</th>
                <th>Customer</th>
                <th>Qty</th>
                <th>Deadline</th>
                <th>Target</th>
                <th></th>
              </tr>
            </thead>

            <tbody>
              {criticalRows.map((row, i) => (
                <tr key={i}>
                  <td>
                    <input
                      value={row.part_number || ""}
                      onChange={(e) => {
                        const val = e.target.value;
                        setCriticalRows(prev =>
                          prev.map((r, idx) =>
                            idx === i ? { ...r, part_number: val } : r
                          )
                        );
                      }}
                    />
                  </td>

                  <td>
                    <input
                        value={row.customer || ""}
                        onChange={(e) => {
                          const val = e.target.value;
                    
                          setCriticalRows(prev =>
                            prev.map((r, idx) =>
                              idx === i ? { ...r, customer: val } : r
                            )
                          );
                        }}
                      />
                  </td>

                  <td>
                    <input
                      type="number"
                      value={row.quantity || 0}
                      onChange={(e) => {
                        const val = Number(e.target.value);
                        setCriticalRows(prev =>
                          prev.map((r, idx) =>
                            idx === i ? { ...r, quantity: val } : r
                          )
                        );
                      }}
                    />
                  </td>

                  <td>
                    <input
                      value={row.line_stoppage_deadline || ""}
                      onChange={(e) => {
                        const val = e.target.value;
                        setCriticalRows(prev =>
                          prev.map((r, idx) =>
                            idx === i ? { ...r, line_stoppage_deadline: val } : r
                          )
                        );
                      }}
                    />
                  </td>

                  <td>
                    <input
                      value={row.target_time || ""}
                      onChange={(e) => {
                        const val = e.target.value;
                        setCriticalRows(prev =>
                          prev.map((r, idx) =>
                            idx === i ? { ...r, target_time: val } : r
                          )
                        );
                      }}
                    />
                  </td>

                  <td>
                    <button onClick={() =>
                      setCriticalRows(prev => prev.filter((_, idx) => idx !== i))
                    }>
                      ❌
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <button
            onClick={() => setCriticalRows(prev => [...prev, {}])}
            style={{ marginTop: 10 }}
          >
            + Add Row
          </button>
        </div>
        {showConfirm && (
          <div style={modalOverlay}>
            <div style={modalBox}>
              <h3>Confirm Close Day</h3>
        
              <p style={{ marginTop: 10 }}>
                Are you sure you want to close the day?
                <br /><br />
                Pending quantities will be carried forward.
              </p>

              <div style={{ display: "flex", gap: 10, marginTop: 20 }}>
                <button
                  onClick={() => setShowConfirm(false)}
                  style={{ padding: 10 }}
                >
                  Cancel
                </button>
        
                <button
                  style={{
                    background: "#C8102E",
                    color: "white",
                    padding: 10
                  }}
                  onClick={async () => {
                    setShowConfirm(false);
                    await closeDay();
                  }}
                >
                  Confirm
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}

/* STYLES */

const container = { flex: 1, background: "#0b0b0b", color: "white", padding: 20 };
const header = { display: "flex", justifyContent: "space-between" };
const title = { color: "#C8102E" };
const dateInput = { padding: 8, background: "#111", color: "white" };
const card = { background: "#1c1c1c", padding: 15, borderRadius: 10 };
const table = { width: "100%", borderCollapse: "collapse" };
const input = { width: 100, background: "#111", color: "white" };
const actualInput = { width: 80, background: "#111", color: "#00ff88" };
const actions = { display: "flex", gap: 10, marginTop: 10 };
const primaryBtn = { background: "#C8102E", color: "white", padding: 10 };
const dangerBtn = { background: "#444", color: "white", padding: 10 };
const mtBox = { color: "#00ff88", fontWeight: "bold" };
const lineMTBox = { display: "flex", gap: 10 };
const lineMTCard = { background: "#111", padding: 10, color: "#00ff88" };
const shiftHeader = { background: "#222", color: "#00d4ff" };
const lineHeader = { background: "#111", color: "#ffcc00", paddingLeft: 20 };
const modalOverlay = {
  position: "fixed",
  top: 0,
  left: 0,
  width: "100%",
  height: "100%",
  background: "rgba(0,0,0,0.7)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  zIndex: 1000
};

const modalBox = {
  background: "#1c1c1c",
  padding: 25,
  borderRadius: 10,
  color: "white",
  minWidth: 300,
  textAlign: "center"
};

