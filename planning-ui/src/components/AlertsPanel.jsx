export default function AlertsPanel({ alerts }) {

  return (
    <div>
      {alerts.map((a, i) => (
        <div key={i} style={{
          background: "#C8102E",
          color: "white",
          padding: 10,
          marginBottom: 10,
          borderRadius: 8
        }}>
          🚨 {a.message}
        </div>
      ))}
    </div>
  );
}