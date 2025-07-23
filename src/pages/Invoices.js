import { useNavigate } from "react-router-dom";
import styles from "./Invoices.module.css";

// Example mock data
const invoices = [
  {
    id: "inv-001",
    number: "INV-001",
    date: "2025-07-01",
    supplier: "Fresh Produce Co.",
    totalCost: 142.50,
  },
  {
    id: "inv-002",
    number: "INV-002",
    date: "2025-07-05",
    supplier: "Cheese & More",
    totalCost: 87.20,
  },
  {
    id: "inv-003",
    number: "INV-003",
    date: "2025-07-12",
    supplier: "Bakery Supplies Inc.",
    totalCost: 55.10,
  },
];

function Invoices() {
  const navigate = useNavigate();

  const handleRowClick = (id) => {
    navigate(`/invoices/${id}`);
  };

  return (
    <div className={styles.container}>
      <h2>Invoices</h2>
      <table className={styles.table}>
        <thead>
          <tr>
            <th>Invoice #</th>
            <th>Date</th>
            <th>Supplier</th>
            <th>Total Cost</th>
          </tr>
        </thead>
        <tbody>
          {invoices.map((invoice) => (
            <tr key={invoice.id} onClick={() => handleRowClick(invoice.id)}>
              <td>{invoice.number}</td>
              <td>{invoice.date}</td>
              <td>{invoice.supplier}</td>
              <td>${invoice.totalCost.toFixed(2)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default Invoices;
