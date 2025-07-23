import { useParams } from "react-router-dom";
import styles from "./MenuItemDetail.module.css";

const dummyIngredientsByDish = {
  burger: [
    { name: "Beef Patty", quantity: 1, unit: "each", costPerUnit: 2.5 },
    { name: "Bun", quantity: 1, unit: "each", costPerUnit: 0.5 },
    { name: "Lettuce", quantity: 0.2, unit: "head", costPerUnit: 1.0 },
    { name: "Tomato", quantity: 0.25, unit: "each", costPerUnit: 0.8 },
    { name: "Cheese", quantity: 1, unit: "slice", costPerUnit: 0.6 },
  ],
  fries: [
    { name: "Potatoes", quantity: 0.3, unit: "lb", costPerUnit: 0.4 },
    { name: "Oil", quantity: 0.05, unit: "L", costPerUnit: 2.0 },
    { name: "Salt", quantity: 0.01, unit: "oz", costPerUnit: 0.1 },
  ],
  salad: [
    { name: "Lettuce", quantity: 0.5, unit: "head", costPerUnit: 1.0 },
    { name: "Tomato", quantity: 0.5, unit: "each", costPerUnit: 0.8 },
    { name: "Cucumber", quantity: 0.3, unit: "each", costPerUnit: 0.7 },
  ],
};

function MenuItemDetail() {
  const { itemName } = useParams();
  const ingredients = dummyIngredientsByDish[itemName.toLowerCase()] || [];

  const totalCost = ingredients.reduce(
    (sum, ing) => sum + ing.quantity * ing.costPerUnit,
    0
  );

  return (
    <div className={styles.container}>
      <h2 className={styles.title}>
        {itemName.charAt(0).toUpperCase() + itemName.slice(1)}
      </h2>

      {ingredients.length === 0 ? (
        <p>No ingredient data available for this item.</p>
      ) : (
        <div>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Ingredient</th>
                <th>Quantity</th>
                <th>Unit</th>
                <th>Cost/Unit</th>
                <th>Total</th>
              </tr>
            </thead>
            <tbody>
              {ingredients.map((ing, i) => (
                <tr key={i}>
                  <td>{ing.name}</td>
                  <td>{ing.quantity}</td>
                  <td>{ing.unit}</td>
                  <td>${ing.costPerUnit.toFixed(2)}</td>
                  <td>${(ing.quantity * ing.costPerUnit).toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className={styles.totalCost}>
            <strong>Total Cost: ${totalCost.toFixed(2)}</strong>
          </div>
        </div>
      )}
    </div>
  );
}

export default MenuItemDetail;
