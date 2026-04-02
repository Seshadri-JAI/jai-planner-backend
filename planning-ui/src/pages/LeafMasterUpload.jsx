import { useState } from "react";

export default function LeafMasterUpload() {

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
      setRows([]);
      setMessage("");

      const res = await fetch("http://localhost:8020/planning/upload-leaf-master", {
        method: "POST",
        body: formData
      });

      const data = await res.json();

      setRows(data.data || []);
      setMessage(data.message);

    } catch {
      setMessage("Upload failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: 20 }}>

      <h1 style={{ color: "#C8102E" }}>Leaf Master Upload</h1>

      <p>
        Format: <b>leaf_id | section | weight | rm_section | rm_weight_per_leaf</b>
      </p>

      <input type="file" onChange={(e) => setFile(e.target.files[0])} />

      <br /><br />

      <button onClick={uploadFile} disabled={loading}>
        {loading ? "Uploading..." : "Upload"}
      </button>

      <p>{message}</p>

      {rows.length > 0 && (
        <table border="1" cellPadding="10">
          <thead>
            <tr>
              <th>Leaf ID</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i}>
                <td>{r.leaf_id}</td>
                <td style={{
                  color: r.status === "OK" ? "green" : "red"
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