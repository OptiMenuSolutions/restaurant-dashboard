// File: src/pages/Ingredients.js
import React from "react";
import { useNavigate } from "react-router-dom";
import styles from "./Ingredients.module.css";
import Layout from "../components/Layout";

// Example mock data
const ingredients = [
  {
    id: "1",
    name: "Tomatoes",
    latestCost: 2.8,
    unit: "lbs",
  },
  {
    id: "2",
    name: "Cheese",
    latestCost: 4.1,
    unit: "oz",
  },
  {
    id: "3",
    name: "Flour",
    latestCost: 1.2,
    unit: "lbs",
  },
];

export default function Ingredients() {
  const navigate = useNavigate();

  const handleRowClick = (id) => {
    navigate(`/ingredients/${id}`);
  };

  return (
    <Layout>
      <div className={styles.container}>
        <h2 className={styles.heading}>Ingredients</h2>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Ingredient</th>
              <th>Unit Cost</th>
              <th>Unit</th>
            </tr>
          </thead>
          <tbody>
            {ingredients.map((ingredient) => (
              <tr key={ingredient.id} onClick={() => handleRowClick(ingredient.id)} className={styles.clickableRow}>
                <td>{ingredient.name}</td>
                <td>${ingredient.latestCost.toFixed(2)}</td>
                <td>/ {ingredient.unit}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Layout>
  );
}
