// File: src/pages/MenuItems.js
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import styles from "./MenuItems.module.css";
import Layout from "../components/Layout";

const dummyData = [
  { name: "Burger", category: "Entree", cost: 4.0, price: 10.0 },
  { name: "Fries", category: "Appetizer", cost: 1.5, price: 4.0 },
  { name: "Salad", category: "Appetizer", cost: 2.0, price: 6.0 },
  { name: "Steak", category: "Entree", cost: 10.0, price: 24.0 },
  { name: "Cake", category: "Dessert", cost: 3.0, price: 7.0 },
];

export default function MenuItems() {
  const [categoryFilter, setCategoryFilter] = useState("All");
  const [sortBy, setSortBy] = useState("name");
  const [sortOrder, setSortOrder] = useState("asc");
  const navigate = useNavigate();

  const handleSort = (column) => {
    if (sortBy === column) {
      setSortOrder((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortBy(column);
      setSortOrder("asc");
    }
  };

  const filtered = dummyData.filter(
    (item) => categoryFilter === "All" || item.category === categoryFilter
  );

  const sorted = [...filtered].sort((a, b) => {
    let valA, valB;

    if (sortBy === "margin") {
      valA = ((a.price - a.cost) / a.price) * 100;
      valB = ((b.price - b.cost) / b.price) * 100;
    } else {
      valA = a[sortBy];
      valB = b[sortBy];
    }

    if (typeof valA === "string") {
      valA = valA.toLowerCase();
      valB = valB.toLowerCase();
    }

    if (valA < valB) return sortOrder === "asc" ? -1 : 1;
    if (valA > valB) return sortOrder === "asc" ? 1 : -1;
    return 0;
  });

  const handleRowClick = (itemName) => {
    navigate(`/menu-items/${encodeURIComponent(itemName.toLowerCase())}`);
  };

  return (
    <Layout>
      <div className={styles.container}>
        <div className={styles.header}>
          <h2 className={styles.heading}>Menu Items</h2>
          <select
            className={styles.dropdown}
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
          >
            <option value="All">All Categories</option>
            <option value="Appetizer">Appetizer</option>
            <option value="Entree">Entree</option>
            <option value="Dessert">Dessert</option>
          </select>
        </div>

        <table className={styles.table}>
          <thead>
            <tr>
              <th onClick={() => handleSort("name")}>Name</th>
              <th onClick={() => handleSort("cost")}>Cost</th>
              <th onClick={() => handleSort("price")}>Price</th>
              <th onClick={() => handleSort("margin")}>Profit Margin</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((item, i) => {
              const margin = ((item.price - item.cost) / item.price) * 100;
              return (
                <tr
                  key={i}
                  onClick={() => handleRowClick(item.name)}
                  className={styles.clickable}
                >
                  <td>{item.name}</td>
                  <td>${item.cost.toFixed(2)}</td>
                  <td>${item.price.toFixed(2)}</td>
                  <td>{margin.toFixed(1)}%</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </Layout>
  );
}
