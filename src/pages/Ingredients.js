import { useNavigate } from "react-router-dom";
import styles from "./Ingredients.module.css";

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

function Ingredients() {
  const navigate = useNavigate();

  const handleRowClick = (id) => {
    navigate(`/ingredients/${id}`);
  };

  return (
    <div className={styles.container}>
      <h2>Ingredients</h2>
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
            <tr key={ingredient.id} onClick={() => handleRowClick(ingredient.id)}>
              <td>{ingredient.name}</td>
              <td>${ingredient.latestCost.toFixed(2)}</td>
              <td>/ {ingredient.unit}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default Ingredients;
