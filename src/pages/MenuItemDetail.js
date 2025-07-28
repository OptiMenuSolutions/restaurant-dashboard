// File: src/pages/MenuItemDetail.js
import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import styles from "./MenuItemDetail.module.css";
import Layout from "../components/Layout";
import supabase from "../supabaseClient";

export default function MenuItemDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [menuItem, setMenuItem] = useState(null);
  const [ingredients, setIngredients] = useState([]);
  const [costHistory, setCostHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [restaurantId, setRestaurantId] = useState(null);

  useEffect(() => {
    getRestaurantId();
  }, []);

  useEffect(() => {
    if (restaurantId && id) {
      fetchMenuItemData();
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

  async function fetchMenuItemData() {
    try {
      setLoading(true);
      setError("");

      // Fetch menu item details
      const { data: menuItemData, error: menuItemError } = await supabase
        .from("menu_items")
        .select("*")
        .eq("id", id)
        .eq("restaurant_id", restaurantId)
        .single();

      if (menuItemError) {
        if (menuItemError.code === 'PGRST116') {
          setError("Menu item not found or access denied");
        } else {
          setError("Failed to fetch menu item: " + menuItemError.message);
        }
        return;
      }

      setMenuItem(menuItemData);

      // Fetch ingredients and their details
      const { data: ingredientsData, error: ingredientsError } = await supabase
        .from("menu_item_ingredients")
        .select(`
          quantity,
          ingredients (
            id,
            name,
            unit,
            last_price,
            last_ordered_at
          )
        `)
        .eq("menu_item_id", id);

      if (!ingredientsError && ingredientsData) {
        setIngredients(ingredientsData);
      }

      // Fetch cost history
      const { data: historyData, error: historyError } = await supabase
        .from("menu_item_cost_history")
        .select("*")
        .eq("menu_item_id", id)
        .order("created_at", { ascending: false })
        .limit(10);

      if (!historyError && historyData) {
        setCostHistory(historyData);
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

  function formatDateTime(dateString) {
    if (!dateString) return "N/A";
    try {
      return new Date(dateString).toLocaleString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return "Invalid date";
    }
  }

  function calculateIngredientCost(ingredient, quantity) {
    const unitCost = parseFloat(ingredient?.last_price || 0);
    const qty = parseFloat(quantity || 0);
    return unitCost * qty;
  }

  function calculateTotalCost() {
    return ingredients.reduce((total, item) => {
      return total + calculateIngredientCost(item.ingredients, item.quantity);
    }, 0);
  }

  function calculateProfitMargin() {
    const price = parseFloat(menuItem?.price || 0);
    const cost = calculateTotalCost();
    
    if (price === 0) return null;
    return ((price - cost) / price) * 100;
  }

  function getMarginColor(margin) {
    if (margin === null || margin === undefined) return "default";
    if (margin >= 70) return "excellent";
    if (margin >= 50) return "good";
    if (margin >= 30) return "fair";
    return "poor";
  }

  function getMissingPriceIngredients() {
    return ingredients.filter(item => 
      !item.ingredients?.last_price || parseFloat(item.ingredients.last_price) === 0
    );
  }

  function handleIngredientClick(ingredientId) {
    navigate(`/ingredients/${ingredientId}`);
  }

  const totalCost = calculateTotalCost();
  const profitMargin = calculateProfitMargin();
  const marginColor = getMarginColor(profitMargin);
  const missingPriceIngredients = getMissingPriceIngredients();

  if (loading) {
    return (
      <Layout>
        <div className={styles.container}>
          <div className={styles.loadingState}>
            <div className={styles.loadingSpinner}></div>
            <p>Loading menu item details...</p>
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
            <h3>Error Loading Menu Item</h3>
            <p>{error}</p>
            <div className={styles.errorActions}>
              <button onClick={() => navigate("/menu-items")} className={styles.backButton}>
                Back to Menu Items
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

  if (!menuItem) {
    return (
      <Layout>
        <div className={styles.container}>
          <div className={styles.errorState}>
            <div className={styles.errorIcon}>🍽️</div>
            <h3>Menu Item Not Found</h3>
            <p>The requested menu item could not be found.</p>
            <button onClick={() => navigate("/menu-items")} className={styles.backButton}>
              Back to Menu Items
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
          <button onClick={() => navigate("/menu-items")} className={styles.backButton}>
            ← Back to Menu Items
          </button>
          <h1 className={styles.title}>{menuItem.name}</h1>
          <div className={styles.priceDisplay}>
            {menuItem.price ? formatCurrency(menuItem.price) : "No price set"}
          </div>
        </div>

        {/* Overview Cards */}
        <div className={styles.overviewCards}>
          <div className={styles.overviewCard}>
            <div className={styles.cardLabel}>Menu Price</div>
            <div className={styles.cardValue}>
              {menuItem.price ? formatCurrency(menuItem.price) : "Not set"}
            </div>
          </div>
          
          <div className={styles.overviewCard}>
            <div className={styles.cardLabel}>Total Cost</div>
            <div className={styles.cardValue}>
              {formatCurrency(totalCost)}
            </div>
          </div>
          
          <div className={styles.overviewCard}>
            <div className={styles.cardLabel}>Profit Margin</div>
            <div className={`${styles.cardValue} ${styles.marginValue} ${styles[marginColor]}`}>
              {profitMargin !== null ? `${profitMargin.toFixed(1)}%` : "N/A"}
            </div>
          </div>
          
          <div className={styles.overviewCard}>
            <div className={styles.cardLabel}>Ingredients</div>
            <div className={styles.cardValue}>
              {ingredients.length}
            </div>
          </div>
        </div>

        {/* Alerts for missing data */}
        {missingPriceIngredients.length > 0 && (
          <div className={styles.alertCard}>
            <div className={styles.alertIcon}>⚠️</div>
            <div className={styles.alertContent}>
              <h3>Missing Ingredient Pricing</h3>
              <p>
                {missingPriceIngredients.length} ingredient{missingPriceIngredients.length !== 1 ? 's' : ''} 
                {missingPriceIngredients.length === 1 ? ' is' : ' are'} missing price data. 
                Cost calculations may be incomplete.
              </p>
            </div>
          </div>
        )}

        {/* Ingredients Breakdown */}
        {ingredients.length > 0 && (
          <div className={styles.ingredientsCard}>
            <h2 className={styles.cardTitle}>Ingredient Breakdown</h2>
            <div className={styles.tableWrapper}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Ingredient</th>
                    <th>Quantity</th>
                    <th>Unit Cost</th>
                    <th>Total Cost</th>
                    <th>Last Updated</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {ingredients.map((item, index) => {
                    const ingredient = item.ingredients;
                    const cost = calculateIngredientCost(ingredient, item.quantity);
                    const hasPrice = ingredient?.last_price && parseFloat(ingredient.last_price) > 0;
                    
                    return (
                      <tr 
                        key={index}
                        onClick={() => ingredient?.id && handleIngredientClick(ingredient.id)}
                        className={ingredient?.id ? styles.clickableRow : ''}
                      >
                        <td data-label="Ingredient">
                          <span className={styles.ingredientName}>
                            {ingredient?.name || "Unknown ingredient"}
                          </span>
                        </td>
                        <td data-label="Quantity">
                          {item.quantity} {ingredient?.unit || "units"}
                        </td>
                        <td data-label="Unit Cost" className={styles.priceCell}>
                          {hasPrice ? (
                            <span className={styles.priceValue}>
                              {formatCurrency(ingredient.last_price)}
                            </span>
                          ) : (
                            <span className={styles.missingPrice}>No price data</span>
                          )}
                        </td>
                        <td data-label="Total Cost" className={styles.priceCell}>
                          <span className={styles.costValue}>
                            {formatCurrency(cost)}
                          </span>
                        </td>
                        <td data-label="Last Updated">
                          {formatDate(ingredient?.last_ordered_at)}
                        </td>
                        <td data-label="Status">
                          <span className={`${styles.status} ${hasPrice ? styles.priced : styles.unpriced}`}>
                            {hasPrice ? "Priced" : "No Price"}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr className={styles.totalRow}>
                    <td colSpan="3"><strong>Total Ingredient Cost:</strong></td>
                    <td className={styles.priceCell}>
                      <strong>{formatCurrency(totalCost)}</strong>
                    </td>
                    <td colSpan="2"></td>
                  </tr>
                  {menuItem.price && (
                    <tr className={styles.profitRow}>
                      <td colSpan="3"><strong>Profit per Item:</strong></td>
                      <td className={styles.priceCell}>
                        <strong className={styles.profitValue}>
                          {formatCurrency(parseFloat(menuItem.price) - totalCost)}
                        </strong>
                      </td>
                      <td colSpan="2"></td>
                    </tr>
                  )}
                </tfoot>
              </table>
            </div>
          </div>
        )}

        {/* Cost History */}
        {costHistory.length > 0 && (
          <div className={styles.historyCard}>
            <h2 className={styles.cardTitle}>Cost Change History</h2>
            <div className={styles.tableWrapper}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Previous Cost</th>
                    <th>New Cost</th>
                    <th>Change</th>
                    <th>Reason</th>
                  </tr>
                </thead>
                <tbody>
                  {costHistory.map((record) => {
                    const change = parseFloat(record.new_cost || 0) - parseFloat(record.old_cost || 0);
                    const isIncrease = change > 0;
                    
                    return (
                      <tr key={record.id}>
                        <td data-label="Date">
                          {formatDateTime(record.created_at)}
                        </td>
                        <td data-label="Previous Cost" className={styles.priceCell}>
                          {formatCurrency(record.old_cost)}
                        </td>
                        <td data-label="New Cost" className={styles.priceCell}>
                          {formatCurrency(record.new_cost)}
                        </td>
                        <td data-label="Change" className={styles.priceCell}>
                          <span className={`${styles.changeValue} ${isIncrease ? styles.increase : styles.decrease}`}>
                            {isIncrease ? '+' : ''}{formatCurrency(change)}
                          </span>
                        </td>
                        <td data-label="Reason">
                          <span className={styles.reasonTag}>
                            {record.change_reason === 'invoice_saved' ? 'Invoice Processing' : 
                             record.change_reason === 'manual_update' ? 'Manual Update' : 
                             record.change_reason || 'Unknown'}
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
        {ingredients.length === 0 && (
          <div className={styles.emptyState}>
            <div className={styles.emptyIcon}>🥗</div>
            <h3>No Ingredients Found</h3>
            <p>This menu item doesn't have any ingredients configured yet.</p>
          </div>
        )}

        {costHistory.length === 0 && ingredients.length > 0 && (
          <div className={styles.emptyState}>
            <div className={styles.emptyIcon}>📈</div>
            <h3>No Cost History</h3>
            <p>No cost changes have been recorded for this menu item yet.</p>
          </div>
        )}
      </div>
    </Layout>
  );
}