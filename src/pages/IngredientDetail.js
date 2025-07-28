// File: src/pages/IngredientDetail.js
import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import styles from "./IngredientDetail.module.css";
import Layout from "../components/Layout";
import supabase from "../supabaseClient";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

export default function IngredientDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [ingredient, setIngredient] = useState(null);
  const [purchaseHistory, setPurchaseHistory] = useState([]);
  const [menuItems, setMenuItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [restaurantId, setRestaurantId] = useState(null);

  useEffect(() => {
    getRestaurantId();
  }, []);

  useEffect(() => {
    if (restaurantId && id) {
      fetchIngredientData();
    }
  }, [restaurantId, id]);

  async function getRestaurantId() {
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      if (userError || !user) {
        setError("Authentication required");
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from("profiles")
        .select("restaurant_id")
        .eq("id", user.id)
        .single();

      if (error || !data?.restaurant_id) {
        setError("Could not determine restaurant access");
        setLoading(false);
        return;
      }

      setRestaurantId(data.restaurant_id);
    } catch (err) {
      setError("An unexpected error occurred");
      setLoading(false);
    }
  }

  async function fetchIngredientData() {
    try {
      setLoading(true);
      setError("");

      // Fetch ingredient details
      const { data: ingredientData, error: ingredientError } = await supabase
        .from("ingredients")
        .select("*")
        .eq("id", id)
        .eq("restaurant_id", restaurantId)
        .single();

      if (ingredientError) {
        if (ingredientError.code === 'PGRST116') {
          setError("Ingredient not found or access denied");
        } else {
          setError("Failed to fetch ingredient: " + ingredientError.message);
        }
        return;
      }

      setIngredient(ingredientData);

      // Fetch purchase history from invoice items
      const { data: historyData, error: historyError } = await supabase
        .from("invoice_items")
        .select(`
          *,
          invoices (
            date,
            supplier,
            number
          )
        `)
        .eq("ingredient_id", id)
        .not("invoices.date", "is", null)
        .order("invoices(date)", { ascending: false });

      if (!historyError && historyData) {
        setPurchaseHistory(historyData);
      }

      // Fetch menu items that use this ingredient
      const { data: menuItemsData, error: menuItemsError } = await supabase
        .from("menu_item_ingredients")
        .select(`
          quantity,
          menu_items (
            id,
            name,
            price,
            cost
          )
        `)
        .eq("ingredient_id", id);

      if (!menuItemsError && menuItemsData) {
        setMenuItems(menuItemsData);
      }

    } catch (err) {
      setError("An unexpected error occurred: " + err.message);
    } finally {
      setLoading(false);
    }
  }

  function formatCurrency(amount) {
    if (!amount || amount === null || amount === undefined) {
      return "--";
    }
    
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount)) {
      return "--";
    }
    
    return numAmount.toLocaleString('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  }

  function formatDate(dateString) {
    if (!dateString) return "N/A";
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    } catch {
      return "Invalid date";
    }
  }

  function getChartData() {
    if (!purchaseHistory || purchaseHistory.length === 0) return [];
    
    return purchaseHistory
      .filter(item => item.invoices?.date && item.unit_cost > 0)
      .map(item => ({
        date: item.invoices.date,
        cost: parseFloat(item.unit_cost),
        dateLabel: formatDate(item.invoices.date),
        supplier: item.invoices.supplier || "Unknown"
      }))
      .sort((a, b) => new Date(a.date) - new Date(b.date));
  }

  function calculateItemCost(menuItem, quantity) {
    const unitCost = parseFloat(ingredient?.last_price || 0);
    const itemQuantity = parseFloat(quantity || 0);
    return unitCost * itemQuantity;
  }

  function getPriceStats() {
    const prices = purchaseHistory
      .filter(item => item.unit_cost > 0)
      .map(item => parseFloat(item.unit_cost));
    
    if (prices.length === 0) return null;

    const min = Math.min(...prices);
    const max = Math.max(...prices);
    const avg = prices.reduce((sum, price) => sum + price, 0) / prices.length;

    return { min, max, avg, count: prices.length };
  }

  const chartData = getChartData();
  const priceStats = getPriceStats();

  if (loading) {
    return (
      <Layout>
        <div className={styles.container}>
          <div className={styles.loadingState}>
            <div className={styles.loadingSpinner}></div>
            <p>Loading ingredient details...</p>
          </div>
        </div>
      </Layout>
    );
  }

  if (error) {
    return (
      <Layout>
        <div className={styles.container}>
          <div className={styles.errorState}>
            <div className={styles.errorIcon}>⚠️</div>
            <h3>Error Loading Ingredient</h3>
            <p>{error}</p>
            <div className={styles.errorActions}>
              <button onClick={() => navigate("/ingredients")} className={styles.backButton}>
                Back to Ingredients
              </button>
              <button onClick={() => window.location.reload()} className={styles.retryButton}>
                Retry
              </button>
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  if (!ingredient) {
    return (
      <Layout>
        <div className={styles.container}>
          <div className={styles.errorState}>
            <div className={styles.errorIcon}>🥬</div>
            <h3>Ingredient Not Found</h3>
            <p>The requested ingredient could not be found.</p>
            <button onClick={() => navigate("/ingredients")} className={styles.backButton}>
              Back to Ingredients
            </button>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className={styles.container}>
        {/* Header */}
        <div className={styles.header}>
          <button onClick={() => navigate("/ingredients")} className={styles.backButton}>
            ← Back to Ingredients
          </button>
          <h1 className={styles.title}>{ingredient.name}</h1>
          <div className={styles.currentPrice}>
            {ingredient.last_price ? formatCurrency(ingredient.last_price) : "No price data"}
            <span className={styles.priceUnit}>per {ingredient.unit || "unit"}</span>
          </div>
        </div>

        {/* Overview Cards */}
        <div className={styles.overviewCards}>
          <div className={styles.overviewCard}>
            <div className={styles.cardLabel}>Current Price</div>
            <div className={styles.cardValue}>
              {ingredient.last_price ? formatCurrency(ingredient.last_price) : "No data"}
            </div>
          </div>
          
          <div className={styles.overviewCard}>
            <div className={styles.cardLabel}>Unit</div>
            <div className={styles.cardValue}>
              {ingredient.unit || "N/A"}
            </div>
          </div>
          
          <div className={styles.overviewCard}>
            <div className={styles.cardLabel}>Last Ordered</div>
            <div className={styles.cardValue}>
              {formatDate(ingredient.last_ordered_at)}
            </div>
          </div>
          
          <div className={styles.overviewCard}>
            <div className={styles.cardLabel}>Purchase Records</div>
            <div className={styles.cardValue}>
              {purchaseHistory.length}
            </div>
          </div>
        </div>

        {/* Price Statistics */}
        {priceStats && (
          <div className={styles.statsCard}>
            <h2 className={styles.cardTitle}>Price Statistics</h2>
            <div className={styles.statsGrid}>
              <div className={styles.statItem}>
                <span className={styles.statLabel}>Lowest</span>
                <span className={styles.statValue}>{formatCurrency(priceStats.min)}</span>
              </div>
              <div className={styles.statItem}>
                <span className={styles.statLabel}>Highest</span>
                <span className={styles.statValue}>{formatCurrency(priceStats.max)}</span>
              </div>
              <div className={styles.statItem}>
                <span className={styles.statLabel}>Average</span>
                <span className={styles.statValue}>{formatCurrency(priceStats.avg)}</span>
              </div>
              <div className={styles.statItem}>
                <span className={styles.statLabel}>Records</span>
                <span className={styles.statValue}>{priceStats.count}</span>
              </div>
            </div>
          </div>
        )}

        {/* Price Trend Chart */}
        {chartData.length > 0 && (
          <div className={styles.chartCard}>
            <h2 className={styles.cardTitle}>Price Trend</h2>
            <div className={styles.chartWrapper}>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis 
                    dataKey="dateLabel" 
                    stroke="#6b7280"
                    fontSize={12}
                  />
                  <YAxis 
                    stroke="#6b7280"
                    fontSize={12}
                    tickFormatter={(value) => `$${value.toFixed(2)}`}
                  />
                  <Tooltip 
                    formatter={(value, name) => [`$${value.toFixed(2)}`, 'Price']}
                    labelFormatter={(label) => `Date: ${label}`}
                    contentStyle={{
                      backgroundColor: 'white',
                      border: '1px solid #e5e7eb',
                      borderRadius: '8px',
                      boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)'
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="cost"
                    stroke="#4f46e5"
                    strokeWidth={3}
                    dot={{ fill: "#4f46e5", strokeWidth: 2, r: 5 }}
                    activeDot={{ r: 7, stroke: "#4f46e5", strokeWidth: 2 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* Menu Items Using This Ingredient */}
        {menuItems.length > 0 && (
          <div className={styles.menuItemsCard}>
            <h2 className={styles.cardTitle}>Used in Menu Items</h2>
            <div className={styles.tableWrapper}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Menu Item</th>
                    <th>Quantity Used</th>
                    <th>Cost Contribution</th>
                    <th>Menu Price</th>
                    <th>Item Cost</th>
                  </tr>
                </thead>
                <tbody>
                  {menuItems.map((item, index) => {
                    const costContribution = calculateItemCost(item.menu_items, item.quantity);
                    const menuPrice = parseFloat(item.menu_items.price || 0);
                    const totalCost = parseFloat(item.menu_items.cost || 0);
                    
                    return (
                      <tr key={index}>
                        <td data-label="Menu Item">
                          <span className={styles.menuItemName}>
                            {item.menu_items.name}
                          </span>
                        </td>
                        <td data-label="Quantity Used">
                          {item.quantity} {ingredient.unit}
                        </td>
                        <td data-label="Cost Contribution">
                          <span className={styles.costValue}>
                            {formatCurrency(costContribution)}
                          </span>
                        </td>
                        <td data-label="Menu Price">
                          {formatCurrency(menuPrice)}
                        </td>
                        <td data-label="Item Cost">
                          {formatCurrency(totalCost)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Purchase History */}
        {purchaseHistory.length > 0 && (
          <div className={styles.historyCard}>
            <h2 className={styles.cardTitle}>Purchase History</h2>
            <div className={styles.tableWrapper}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Invoice</th>
                    <th>Supplier</th>
                    <th>Quantity</th>
                    <th>Unit Cost</th>
                    <th>Total Cost</th>
                  </tr>
                </thead>
                <tbody>
                  {purchaseHistory.map((purchase) => {
                    const totalCost = parseFloat(purchase.quantity || 0) * parseFloat(purchase.unit_cost || 0);
                    
                    return (
                      <tr 
                        key={purchase.id}
                        onClick={() => navigate(`/invoices/${purchase.invoice_id}`)}
                        className={styles.clickableRow}
                      >
                        <td data-label="Date">
                          {formatDate(purchase.invoices?.date)}
                        </td>
                        <td data-label="Invoice">
                          <span className={styles.invoiceNumber}>
                            {purchase.invoices?.number || "N/A"}
                          </span>
                        </td>
                        <td data-label="Supplier">
                          {purchase.invoices?.supplier || "Unknown"}
                        </td>
                        <td data-label="Quantity">
                          {purchase.quantity} {purchase.unit}
                        </td>
                        <td data-label="Unit Cost">
                          <span className={styles.costValue}>
                            {formatCurrency(purchase.unit_cost)}
                          </span>
                        </td>
                        <td data-label="Total Cost">
                          <span className={styles.totalValue}>
                            {formatCurrency(totalCost)}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Empty States */}
        {purchaseHistory.length === 0 && (
          <div className={styles.emptyState}>
            <div className={styles.emptyIcon}>📋</div>
            <h3>No Purchase History</h3>
            <p>This ingredient hasn't been recorded in any processed invoices yet.</p>
          </div>
        )}

        {menuItems.length === 0 && (
          <div className={styles.emptyState}>
            <div className={styles.emptyIcon}>🍽️</div>
            <h3>Not Used in Menu Items</h3>
            <p>This ingredient isn't currently linked to any menu items.</p>
          </div>
        )}
      </div>
    </Layout>
  );
}