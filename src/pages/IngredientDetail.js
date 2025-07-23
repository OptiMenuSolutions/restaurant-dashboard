import { useParams } from "react-router-dom";
import styles from "./IngredientDetail.module.css";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

// Mock data
const ingredientHistory = {
  id: "1",
  name: "Tomatoes",
  purchases: [
    {
      invoice: "INV001",
      date: "2024-02-12",
      supplier: "Fresh Farms",
      amount: 50,
      unit: "lbs",
      unitCost: 2.5,
    },
    {
      invoice: "INV014",
      date: "2024-03-08",
      supplier: "Local Harvest",
      amount: 60,
      unit: "lbs",
      unitCost: 2.7,
    },
    {
      invoice: "INV022",
      date: "2024-06-01",
      supplier: "Fresh Farms",
      amount: 55,
      unit: "lbs",
      unitCost: 2.8,
    },
  ],
  usedIn: [
    {
      name: "BLT Sandwich",
      quantity: 0.5,
      unit: "lbs",
    },
    {
      name: "Tomato Soup",
      quantity: 1.0,
      unit: "lbs",
    },
  ],
};

function IngredientDetail() {
  const { id } = useParams();
  const ingredient = ingredientHistory; // Replace with real data as needed

  // Sort purchases by date to get the latest cost
  const sortedPurchases = [...ingredient.purchases].sort(
    (a, b) => new Date(b.date) - new Date(a.date)
  );
  const latestUnitCost = sortedPurchases[0]?.unitCost || 0;

  const chartData = ingredient.purchases.map((purchase) => ({
    date: purchase.date,
    cost: purchase.unitCost,
  }));

  return (
    <div className={styles.container}>
      <h2>{ingredient.name}</h2>

      {/* Trend chart */}
      <div className={styles.chartWrapper}>
        <ResponsiveContainer width="100%" height={250}>
          <LineChart data={chartData} margin={{ top: 20, right: 30, left: 10, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" />
            <YAxis domain={["dataMin - 0.1", "dataMax + 0.1"]} />
            <Tooltip />
            <Line
              type="monotone"
              dataKey="cost"
              stroke="#3b82f6"
              strokeWidth={2}
              dot={{ r: 4 }}
              activeDot={{ r: 6 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Menu items using this ingredient */}
      <h3>Used In Menu Items</h3>
      <table className={styles.table}>
        <thead>
          <tr>
            <th>Dish</th>
            <th>Quantity</th>
            <th>Unit</th>
            <th>Total Cost</th>
          </tr>
        </thead>
        <tbody>
          {ingredient.usedIn.map((item, index) => {
            const totalCost = item.quantity * latestUnitCost;
            return (
              <tr key={index}>
                <td>{item.name}</td>
                <td>{item.quantity}</td>
                <td>{item.unit}</td>
                <td>${totalCost.toFixed(2)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {/* Invoice history */}
      <h3>Purchase History</h3>
      <table className={styles.table}>
        <thead>
          <tr>
            <th>Invoice</th>
            <th>Date</th>
            <th>Supplier</th>
            <th>Amount</th>
            <th>Units</th>
            <th>Unit Cost</th>
          </tr>
        </thead>
        <tbody>
          {ingredient.purchases.map((p, index) => (
            <tr key={index}>
              <td>{p.invoice}</td>
              <td>{p.date}</td>
              <td>{p.supplier}</td>
              <td>{p.amount}</td>
              <td>{p.unit}</td>
              <td>${p.unitCost.toFixed(2)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default IngredientDetail;
