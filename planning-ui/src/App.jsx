import { BrowserRouter, Routes, Route } from "react-router-dom";
import LiveDashboard from "./pages/LiveDashboard";
import Planning from "./pages/Planning";
import Execution from "./pages/Execution";
import DailyPlanning from "./pages/DailyPlanning";
import BOMUpload from "./pages/BOMUpload";
import LeafMasterUpload from "./pages/LeafMasterUpload";
import TVDisplay from "./pages/TVDisplay";
import Login from "./pages/Login";
import { useState } from "react";

function App() {
  const [auth, setAuth] = useState(!!localStorage.getItem("token"));

  // 🔒 If not logged in → show login page
  if (!auth) {
    return <Login setAuth={setAuth} />;
  }

  // ✅ If logged in → show app
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LiveDashboard />} />
        <Route path="/planning" element={<Planning />} />
        <Route path="/execution" element={<Execution />} />
        <Route path="/daily-planning" element={<DailyPlanning />} />
        <Route path="/bom-upload" element={<BOMUpload />} />
        <Route path="/leaf-master" element={<LeafMasterUpload />} />
        <Route path="/tv" element={<TVDisplay />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;