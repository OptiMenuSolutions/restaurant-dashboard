import { useParams } from "react-router-dom";
import styles from "./InvoiceDetail.module.css";

// Mock data
const invoiceData = {
  "inv-001": {
    number: "INV-001",
    date: "2025-07-01",
    supplier: "Fresh Produce Co.",
    items: [
      {
        ingredient: "Tomatoes",
        quantity: 20,
        unit: "lbs",
        unitCost: 1.50,
      },
      {
        ingredient: "Lettuce",
        quantity: 10,
        unit: "heads",
        unitCost: 0.80,
      },
    ],
  },
  "inv-002": {
    number: "INV-002",
    date: "2025-07-05",
    supplier: "Cheese & More",
    items: [
      {
        ingredient: "Cheddar Cheese",
        quantity: 5,
        unit: "lbs",
        unitCost: 4.25,
      },
      {
        ingredient: "Feta Cheese",
        quantity: 3,
        unit: "lbs",
        unitCost: 5.10,
      },
    ],
  },
  "inv-003": {
    number: "INV-003",
    date: "2025-07-12",
    supplier: "Bakery Supplies Inc.",
    items: [
      {
        ingredient: "Brioche Buns",
        quantity: 50,
        unit: "pieces",
        unitCost: 0.45,
      },
    ],
  },
};

function InvoiceDetail() {
  const { invoiceId } = useParams();
  const invoice = invoiceData[invoiceId];

  if (!invoice) return <p className={styles.container}>Invoice not found.</p>;

  const totalCost = invoice.items.reduce(
    (sum, item) => sum + item.quantity * item.unitCost,
    0
  );

  return (
    <div className={styles.container}>
      <h2>Invoice Detail</h2>
      <div className={styles.meta}>
        <p><strong>Invoice #:</strong> {invoice.number}</p>
        <p><strong>Date:</strong> {invoice.date}</p>
        <p><strong>Supplier:</strong> {invoice.supplier}</p>
        <p><strong>Total Cost:</strong> ${totalCost.toFixed(2)}</p>
      </div>

      <table className={styles.table}>
        <thead>
          <tr>
            <th>Ingredient</th>
            <th>Quantity</th>
            <th>Unit</th>
            <th>Unit Cost</th>
            <th>Total Cost</th>
          </tr>
        </thead>
        <tbody>
          {invoice.items.map((item, index) => (
            <tr key={index}>
              <td>{item.ingredient}</td>
              <td>{item.quantity}</td>
              <td>{item.unit}</td>
              <td>${item.unitCost.toFixed(2)}</td>
              <td>${(item.quantity * item.unitCost).toFixed(2)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default InvoiceDetail;
