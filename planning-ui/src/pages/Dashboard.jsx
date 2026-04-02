import { useEffect, useState } from "react";
import axios from "axios";
import { Card, CardContent, Typography } from "@mui/material";
import { BarChart, Bar, XAxis, YAxis, Tooltip } from "recharts";

export default function Dashboard() {

  const [data, setData] = useState({});

  useEffect(() => {
    axios.get("http://localhost:8020/dashboard/kpi")
      .then(res => setData(res.data));
  }, []);
  
  const data = [
    { stage: "SPVC", value: 80 },
    { stage: "BHT", value: 60 },
    { stage: "HT", value: 50 }
  ];

  <BarChart width={500} height={300} data={data}>
    <XAxis dataKey="stage" />
    <YAxis />
    <Tooltip />
    <Bar dataKey="value" fill="#C8102E" />
  </BarChart>

  return (
    <div style={{ padding: 20, background: "#F8F9FA" }}>

      <h1 style={{ color: "#C8102E" }}>Jamna Planning Dashboard</h1>

      <div style={{ display: "flex", gap: 20 }}>

        <Card style={{ flex: 1, background: "#C8102E", color: "white" }}>
          <CardContent>
            <Typography>Total Plan</Typography>
            <Typography variant="h4">{data.total_plan}</Typography>
          </CardContent>
        </Card>

        <Card style={{ flex: 1 }}>
          <CardContent>
            <Typography>Total Actual</Typography>
            <Typography variant="h4">{data.total_actual}</Typography>
          </CardContent>
        </Card>

        <Card style={{ flex: 1 }}>
          <CardContent>
            <Typography>Completion %</Typography>
            <Typography variant="h4">{data.completion}%</Typography>
          </CardContent>
        </Card>

      </div>

    </div>
  );
}