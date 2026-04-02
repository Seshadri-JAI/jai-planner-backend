import { LineChart, Line, XAxis, YAxis, Tooltip } from "recharts";

export default function Charts({ data }) {

  return (
    <LineChart width={700} height={300} data={data}>
      <XAxis dataKey="date" />
      <YAxis />
      <Tooltip />
      <Line type="monotone" dataKey="completion" stroke="#C8102E" />
    </LineChart>
  );
}