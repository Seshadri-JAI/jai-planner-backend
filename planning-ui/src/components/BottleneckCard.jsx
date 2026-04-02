export default function BottleneckCard({ stage, value }) {

  const isBottleneck = value < 70;

  return (
    <div style={{
      padding: 15,
      background: isBottleneck ? "#C8102E" : "#eee",
      color: isBottleneck ? "white" : "black",
      borderRadius: 10
    }}>
      <h3>{stage}</h3>
      <h2>{value}%</h2>

      {isBottleneck && (
        <div style={{ fontWeight: "bold" }}>
          ⚠ Bottleneck
        </div>
      )}
    </div>
  );
}