import { useState } from "react";

export default function BOMUpload() {

  const [file, setFile] = useState(null);
  const [rows, setRows] = useState([]);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const uploadFile = async () => {

    if (!file) {
      setMessage("Please select a file");
      return;
    }

    const formData = new FormData();
    formData.append("file", file);

    try {
      setLoading(true);
      setMessage("");
      setRows([]);

      const res = await fetch("http://localhost:8020/planning/upload-bom", {
        method: "POST",
        body: formData
      });

      const data = await res.json();

      setRows(data.data || []);
      setMessage(data.message || "Upload completed");

    } catch (error) {
      setMessage("Upload failed. Check server.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: 20 }}>

      <h1 style={{ color: "#C8102E" }}>BOM Upload</h1>

      <input
        type="file"
        onChange={(e) => setFile(e.target.files[0])}
      />

      <br /><br />

      <p>
      Excel format: <b>part_number | leaf_id | qty</b>
      </p>

      <br /><br />

      <button onClick={uploadFile} disabled={loading}>
        {loading ? "Uploading..." : "Upload BOM"}
      </button>

      <p style={{ fontWeight: "bold" }}>{message}</p>

      {/* RESULT TABLE */}
      {rows.length > 0 && (
        <table border="1" cellPadding="10">
          <thead>
            <tr>
              <th>Part Number</th>
              <th>Leaf ID</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i}>
                <td>{r.part_number}</td>
                <td>{r.leaf_id}</td>
                <td style={{
                  color: r.status === "OK" ? "green" : "red",
                  fontWeight: "bold"
                }}>
                  {r.status}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

    </div>
  );
}