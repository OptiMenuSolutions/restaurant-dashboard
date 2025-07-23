// File: src/pages/Dashboard.js
import React from "react";
import styles from "./Dashboard.module.css";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ResponsiveContainer,
} from "recharts";

const sampleData = [
  { date: "Jul 1", cost: 420 },
  { date: "Jul 2", cost: 380 },
  { date: "Jul 3", cost: 460 },
  { date: "Jul 4", cost: 390 },
  { date: "Jul 5", cost: 500 },
  { date: "Jul 6", cost: 470 },
  { date: "Jul 7", cost: 530 },
];

export default function Dashboard() {
  return (
    <div className={styles.dashboard}>
      <h1 className={styles.heading}>Dashboard Overview</h1>

      <div className={styles.summaryBoxes}>
        <div className={styles.summaryBox}>
          <h3>Total Ingredient Spend</h3>
          <p>$3,750</p>
        </div>
        <div className={styles.summaryBox}>
          <h3>Avg Daily Cost</h3>
          <p>$535</p>
        </div>
        <div className={styles.summaryBox}>
          <h3>Invoices This Week</h3>
          <p>7</p>
        </div>
      </div>

      <div className={styles.chartContainer}>
        <h2>Cost Trend</h2>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={sampleData}>
            <CartesianGrid stroke="#ccc" strokeDasharray="5 5" />
            <XAxis dataKey="date" />
            <YAxis />
            <Tooltip />
            <Line type="monotone" dataKey="cost" stroke="#8884d8" strokeWidth={2} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
