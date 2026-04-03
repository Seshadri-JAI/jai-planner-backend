import { useEffect, useState, useMemo } from "react";
import Sidebar from "../components/Sidebar";

const API_BASE = import.meta.env.VITE_API_URL;
const API = `${API_BASE}/planning`;

export default function Planning() {

  // 🔥 TODAY DEFAULT
  const today = new Date().toISOString().split("T")[0];

  // ---------------------------
  // STATE
  // ---------------------------
  const [assemblyFile, setAssemblyFile] = useState(null);
  const [leafFile, setLeafFile] = useState(null);
  const [planFile, setPlanFile] = useState(null);

  const [selectedDate, setSelectedDate] = useState(today);

  const [dailyPlan, setDailyPlan] = useState([
    { 
      date: today, 
      shift: "A", 
      part_number: "", 
      qty: 0, 
      priority: 1,
      line: "Line 1 (Conv)"   // ✅ ADD
    }
  ]);

  const [message, setMessage] = useState("");

  const totalMT = dailyPlan.reduce((sum, row) => {
    return sum + ((row.qty || 0) * (row.weight || 0)) / 1000;
  }, 0);

  // ---------------------------
  // AUTO SYNC DATE
  // ---------------------------
  useEffect(() => {
    const updated = dailyPlan.map(row => ({
      ...row,
      date: selectedDate
    }));
    setDailyPlan(updated);
  }, [selectedDate]);

  // ---------------------------
  // UPLOAD
  // ---------------------------
  const upload = async (file, endpoint) => {
    if (!file) return alert("Select file");

    const formData = new FormData();
    formData.append("file", file);

    const res = await fetch(`${API}/${endpoint}`, {
      method: "POST",
      body: formData
    });

    const data = await res.json();
    setMessage(data.message || "Uploaded");
  };

  // ---------------------------
  // DAILY PLAN FUNCTIONS
  // ---------------------------
  const addRow = () => {
    setDailyPlan([
      ...dailyPlan,
      {
        date: selectedDate,
        shift: "A",
        part_number: "",
        qty: 0,
        priority: 1,
        line: "Line 1 (Conv)"
      }
    ]);
  };

  const updateCell = async (i, field, value) => {
    const updated = [...dailyPlan];
    updated[i][field] = value;

    // 🔥 If part number changes → fetch weight
    if (field === "part_number" && value.length >2) {
      try {
        const res = await fetch(`${API}/get-weight?part=${value}`);
        const data = await res.json();
 
        updated[i].weight = data.weight || 0;
      } catch (err) {
        updated[i].weight = 0;
      }
    }
    setDailyPlan(updated);
  };

  const saveDailyPlan = async () => {

    const cleaned = dailyPlan.map(row => ({
      date: row.date,
      shift: row.shift,
      part_number: row.part_number,
      qty: Number(row.qty),
      priority: Number(row.priority),
      line: row.line 
    }));

    await fetch(`${API}/set-daily-plan`, {
      method: "POST",
      headers: {"Content-Type": "application/json"},
      body: JSON.stringify(cleaned)   // ✅ FIXED
    });

    alert("Daily Plan Saved");
  };

  const loadDailyPlan = async () => {
    if (!selectedDate) return alert("Select date");

    const res = await fetch(`${API}/get-daily-plan?date=${selectedDate}`);
    const data = await res.json();

    if (data.data?.length) {
      setDailyPlan(
        data.data.map(row => ({
          ...row,
          line: row.line || "Line 1 (Conv)"   // ✅ ensure default
        }))
      );
    } else {
      alert("No plan found");
    }
  };

  // ---------------------------
  // UI
  // ---------------------------
  return (
    <div style={{ display: "flex" }}>

      <Sidebar />

      <div style={container}>

        <h1 style={title}>Planning</h1>

        {/* ========================= */}
        {/* 🔥 DAILY PLAN */}
        {/* ========================= */}
        <div style={card}>
          <h2>Daily Plan</h2>

          <div style={topBar}>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
            />
            <button onClick={loadDailyPlan}>Load</button>
          </div>

          <table style={table}>
            <thead>
              <tr>
                <th>Date</th>
                <th>Shift</th>
                <th>Part</th>
                <th>Qty</th>
                <th>MT</th>
                <th>Priority</th>
                <th>Line</th>
              </tr>
            </thead>

            <tbody>
              {dailyPlan.map((row, i) => {
            
                const mt = ((row.qty || 0) * (row.weight || 0)) / 1000;
            
                return (
                  <tr key={i}>
                    <td>
                      <input
                        type="date"
                        value={row.date}
                        onChange={(e)=>updateCell(i,"date",e.target.value)}
                      />
                    </td>

                    <td>
                      <select
                        value={row.shift}
                        onChange={(e)=>updateCell(i,"shift",e.target.value)}
                      >
                        <option>A</option>
                        <option>B</option>
                        <option>C</option>
                      </select>
                    </td>
            
                    <td>
                      <input
                        value={row.part_number}
                        onChange={(e)=>updateCell(i,"part_number",e.target.value)}
                      />
                    </td>
            
                    <td>
                      <input
                        type="number"
                        value={row.qty}
                        onChange={(e)=>updateCell(i,"qty",Number(e.target.value))}
                      />
                    </td>
            
                    <td>{mt.toFixed(2)}</td>
            
                    <td>
                      <input
                        type="number"
                        value={row.priority}
                        onChange={(e)=>updateCell(i,"priority",Number(e.target.value))}
                      />
                    </td>
            
                    <td>
                      <select
                        value={row.line || "Line 1 (Conv)"}
                        onChange={(e)=>updateCell(i,"line",e.target.value)}
                      >
                        <option>Line 1 (Conv)</option>
                        <option>Line 2 (HP)</option>
                        <option>Line 3 (New)</option>
                        <option>Line 4 (LP)</option>
                      </select>
                    </td>
                  </tr>
                );
              })}
            </tbody>
            </table>

            <div style={{ marginBottom: 10, fontWeight: "bold" }}>
              Total MT: {totalMT.toFixed(2)}
            </div>
  
            <div style={buttonRow}>
              <button onClick={addRow}>+ Add Row</button>
              <button onClick={saveDailyPlan}>💾 Save Plan</button>
            </div>
          </div>

        {/* ========================= */}
        {/* 📦 MASTER DATA */}
        {/* ========================= */}
        <div style={grid}>

          <div style={card}>
            <h3>Leaf Master</h3>
            <input type="file" onChange={(e)=>setLeafFile(e.target.files[0])}/>
            <button onClick={()=>upload(leafFile,"upload-leaf-master")}>
              Upload
            </button>
          </div>

          <div style={card}>
            <h3>Assembly Master</h3>
            <input type="file" onChange={(e)=>setAssemblyFile(e.target.files[0])}/>
            <button onClick={()=>upload(assemblyFile,"upload-assembly-master")}>
              Upload
            </button>
          </div>

          <div style={card}>
            <h3>Monthly Plan</h3>
            <input type="file" onChange={(e)=>setPlanFile(e.target.files[0])}/>
            <button onClick={()=>upload(planFile,"upload-monthly-plan")}>
              Upload
            </button>
          </div>

        </div>

        {/* MESSAGE */}
        {message && <div style={messageBox}>{message}</div>}

      </div>
    </div>
  );
}

/* 🎨 STYLES */

const container = {
  flex: 1,
  background: "#0b0b0b",
  color: "white",
  padding: 20,
  display: "flex",
  flexDirection: "column",
  gap: 20
};

const title = {
  color: "#C8102E",
  fontSize: 32
};

const card = {
  background: "#1c1c1c",
  padding: 20,
  borderRadius: 12
};

const grid = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr 1fr",
  gap: 20
};

const table = {
  width: "100%",
  borderCollapse: "collapse"
};

const buttonRow = {
  marginTop: 10,
  display: "flex",
  gap: 10
};

const topBar = {
  display: "flex",
  gap: 10,
  marginBottom: 10
};

const messageBox = {
  background: "#002b1f",
  padding: 10,
  borderRadius: 8
};