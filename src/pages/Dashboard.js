// File: src/pages/Dashboard.js
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Layout from "../components/Layout";
import styles from "./Dashboard.module.css";
import supabase from "../supabaseClient";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
} from "recharts";

export default function Dashboard() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [restaurantId, setRestaurantId] = useState(null);
  const [dashboardData, setDashboardData] = useState({
    totalInvoices: 0,
    totalIngredients: 0,
    totalMenuItems: 0,
    lowMarginItems: [],
    recentInvoices: [],
    ingredientTrends: [],
    menuItemAnalysis: [],
    monthlySpending: [],
    unpricedIngredients: 0,
    averageMargin: 0
  });
  const navigate = useNavigate();

  // Alert thresholds
  const LOW_MARGIN_THRESHOLD = 40; // Alert for items below 40% margin
  const VERY_LOW_MARGIN_THRESHOLD = 25; // Critical alert for items below 25%

  useEffect(() => {
    getRestaurantId();
  }, []);

  useEffect(() => {
    if (restaurantId) {
      fetchDashboardData();
    }
  }, [restaurantId]);

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

  async function fetchDashboardData() {
    try {
      setLoading(true);
      setError("");

      // Fetch invoices count and recent invoices
      const { data: invoices, error: invoicesError } = await supabase
        .from("invoices")
        .select("*")
        .eq("restaurant_id", restaurantId)
        .order("created_at", { ascending: false });

      if (invoicesError) throw invoicesError;

      // Fetch ingredients
      const { data: ingredients, error: ingredientsError } = await supabase
        .from("ingredients")
        .select("*")
        .eq("restaurant_id", restaurantId);

      if (ingredientsError) throw ingredientsError;

      // Fetch menu items with ingredients
      const { data: menuItems, error: menuItemsError } = await supabase
        .from("menu_items")
        .select(`
          *,
          menu_item_ingredients (
            quantity,
            ingredients (
              last_price
            )
          )
        `)
        .eq("restaurant_id", restaurantId);

      if (menuItemsError) throw menuItemsError;

      // Process data
      const processedData = processDashboardData(invoices, ingredients, menuItems);
      setDashboardData(processedData);

    } catch (err) {
      setError("Failed to fetch dashboard data: " + err.message);
    } finally {
      setLoading(false);
    }
  }

  function processDashboardData(invoices, ingredients, menuItems) {
    // Basic counts
    const totalInvoices = invoices.length;
    const totalIngredients = ingredients.length;
    const totalMenuItems = menuItems.length;

    // Unpriced ingredients
    const unpricedIngredients = ingredients.filter(ing => 
      !ing.last_price || parseFloat(ing.last_price) === 0
    ).length;

    // Recent invoices (last 5)
    const recentInvoices = invoices
      .filter(inv => inv.number && inv.supplier)
      .slice(0, 5)
      .map(inv => ({
        id: inv.id,
        number: inv.number,
        supplier: inv.supplier,
        amount: inv.amount,
        date: inv.date
      }));

    // Menu item analysis and low margin detection
    const menuItemAnalysis = menuItems.map(item => {
      const totalCost = calculateMenuItemCost(item);
      const price = parseFloat(item.price || 0);
      const margin = price > 0 ? ((price - totalCost) / price) * 100 : 0;
      
      return {
        id: item.id,
        name: item.name,
        price,
        cost: totalCost,
        margin,
        hasCompleteData: hasCompleteIngredientData(item)
      };
    });

    // Low margin items
    const lowMarginItems = menuItemAnalysis
      .filter(item => item.hasCompleteData && item.price > 0 && item.margin < LOW_MARGIN_THRESHOLD)
      .sort((a, b) => a.margin - b.margin);

    // Average margin calculation
    const itemsWithMargins = menuItemAnalysis.filter(item => 
      item.hasCompleteData && item.price > 0
    );
    const averageMargin = itemsWithMargins.length > 0 
      ? itemsWithMargins.reduce((sum, item) => sum + item.margin, 0) / itemsWithMargins.length
      : 0;

    // Monthly spending trend (last 6 months)
    const monthlySpending = calculateMonthlySpending(invoices);

    // Ingredient price trends (top 5 most expensive)
    const ingredientTrends = ingredients
      .filter(ing => ing.last_price > 0)
      .sort((a, b) => parseFloat(b.last_price) - parseFloat(a.last_price))
      .slice(0, 5)
      .map(ing => ({
        name: ing.name,
        price: parseFloat(ing.last_price),
        unit: ing.unit
      }));

    return {
      totalInvoices,
      totalIngredients,
      totalMenuItems,
      lowMarginItems,
      recentInvoices,
      ingredientTrends,
      menuItemAnalysis,
      monthlySpending,
      unpricedIngredients,
      averageMargin
    };
  }

  function calculateMenuItemCost(menuItem) {
    if (!menuItem.menu_item_ingredients) return 0;
    
    return menuItem.menu_item_ingredients.reduce((total, ingredient) => {
      const unitCost = parseFloat(ingredient.ingredients?.last_price || 0);
      const quantity = parseFloat(ingredient.quantity || 0);
      return total + (unitCost * quantity);
    }, 0);
  }

  function hasCompleteIngredientData(menuItem) {
    if (!menuItem.menu_item_ingredients || menuItem.menu_item_ingredients.length === 0) {
      return false;
    }
    
    return menuItem.menu_item_ingredients.every(ingredient => 
      ingredient.ingredients?.last_price && parseFloat(ingredient.ingredients.last_price) > 0
    );
  }

  function calculateMonthlySpending(invoices) {
    const monthlyTotals = {};
    
    invoices.forEach(invoice => {
      if (invoice.date && invoice.amount) {
        const date = new Date(invoice.date);
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        const monthName = date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
        
        if (!monthlyTotals[monthKey]) {
          monthlyTotals[monthKey] = { month: monthName, total: 0 };
        }
        monthlyTotals[monthKey].total += parseFloat(invoice.amount);
      }
    });

    return Object.values(monthlyTotals)
      .sort((a, b) => a.month.localeCompare(b.month))
      .slice(-6); // Last 6 months
  }

  function formatCurrency(amount) {
    if (!amount || amount === null || amount === undefined) {
      return "$0.00";
    }
    
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount)) {
      return "$0.00";
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
        month: 'short',
        day: 'numeric'
      });
    } catch {
      return "N/A";
    }
  }

  function getMarginColor(margin) {
    if (margin >= 60) return "#059669"; // Green
    if (margin >= 40) return "#3b82f6"; // Blue
    if (margin >= 25) return "#f59e0b"; // Yellow
    return "#dc2626"; // Red
  }

  function getAlertLevel(margin) {
    if (margin < VERY_LOW_MARGIN_THRESHOLD) return "critical";
    if (margin < LOW_MARGIN_THRESHOLD) return "warning";
    return "normal";
  }

  if (loading) {
    return (
      <Layout>
        <div className={styles.dashboard}>
          <div className={styles.loadingState}>
            <div className={styles.loadingSpinner}></div>
            <p>Loading dashboard...</p>
          </div>
        </div>
      </Layout>
    );
  }

  if (error) {
    return (
      <Layout>
        <div className={styles.dashboard}>
          <div className={styles.errorState}>
            <div className={styles.errorIcon}>⚠️</div>
            <h3>Error Loading Dashboard</h3>
            <p>{error}</p>
            <button onClick={() => window.location.reload()} className={styles.retryButton}>
              Retry
            </button>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className={styles.dashboard}>
        {/* Header */}
        <div className={styles.header}>
          <h1 className={styles.heading}>Restaurant Dashboard</h1>
          <div className={styles.lastUpdated}>
            Last updated: {new Date().toLocaleString()}
          </div>
        </div>

        {/* Critical Alerts */}
        {dashboardData.lowMarginItems.length > 0 && (
          <div className={styles.alertSection}>
            <h2 className={styles.alertTitle}>⚠️ Margin Alerts</h2>
            <div className={styles.alertCards}>
              {dashboardData.lowMarginItems.slice(0, 3).map(item => (
                <div 
                  key={item.id}
                  className={`${styles.alertCard} ${styles[getAlertLevel(item.margin)]}`}
                  onClick={() => navigate(`/menu-items/${item.id}`)}
                >
                  <div className={styles.alertHeader}>
                    <span className={styles.alertItemName}>{item.name}</span>
                    <span className={styles.alertMargin}>
                      {item.margin.toFixed(1)}% margin
                    </span>
                  </div>
                  <div className={styles.alertDetails}>
                    Price: {formatCurrency(item.price)} | Cost: {formatCurrency(item.cost)}
                  </div>
                  <div className={styles.alertAction}>
                    {item.margin < VERY_LOW_MARGIN_THRESHOLD ? "CRITICAL - Review pricing immediately" : 
                     "Consider reviewing pricing or reducing costs"}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Summary Boxes */}
        <div className={styles.summaryBoxes}>
          <div className={styles.summaryBox}>
            <div className={styles.summaryIcon}>📄</div>
            <div className={styles.summaryContent}>
              <h3>Total Invoices</h3>
              <p className={styles.summaryValue}>{dashboardData.totalInvoices}</p>
              <span className={styles.summarySubtext}>Processed invoices</span>
            </div>
          </div>
          
          <div className={styles.summaryBox}>
            <div className={styles.summaryIcon}>🥬</div>
            <div className={styles.summaryContent}>
              <h3>Ingredients</h3>
              <p className={styles.summaryValue}>{dashboardData.totalIngredients}</p>
              <span className={styles.summarySubtext}>
                {dashboardData.unpricedIngredients > 0 && 
                  `${dashboardData.unpricedIngredients} need pricing`
                }
              </span>
            </div>
          </div>
          
          <div className={styles.summaryBox}>
            <div className={styles.summaryIcon}>🍽️</div>
            <div className={styles.summaryContent}>
              <h3>Menu Items</h3>
              <p className={styles.summaryValue}>{dashboardData.totalMenuItems}</p>
              <span className={styles.summarySubtext}>Active menu items</span>
            </div>
          </div>
          
          <div className={styles.summaryBox}>
            <div className={styles.summaryIcon}>📊</div>
            <div className={styles.summaryContent}>
              <h3>Average Margin</h3>
              <p className={styles.summaryValue} style={{ color: getMarginColor(dashboardData.averageMargin) }}>
                {dashboardData.averageMargin.toFixed(1)}%
              </p>
              <span className={styles.summarySubtext}>Profit margin</span>
            </div>
          </div>
        </div>

        {/* Charts Row */}
        <div className={styles.chartsRow}>
          {/* Monthly Spending */}
          <div className={styles.chartContainer}>
            <h2 className={styles.chartTitle}>Monthly Spending Trend</h2>
            {dashboardData.monthlySpending.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={dashboardData.monthlySpending}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                  <XAxis dataKey="month" stroke="#6b7280" fontSize={12} />
                  <YAxis stroke="#6b7280" fontSize={12} tickFormatter={(value) => `$${(value/1000).toFixed(0)}k`} />
                  <Tooltip formatter={(value) => [formatCurrency(value), 'Total Spent']} />
                  <Line
                    type="monotone"
                    dataKey="total"
                    stroke="#3b82f6"
                    strokeWidth={3}
                    dot={{ fill: "#3b82f6", strokeWidth: 2, r: 4 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className={styles.noData}>No spending data available</div>
            )}
          </div>

          {/* Top Ingredient Costs */}
          <div className={styles.chartContainer}>
            <h2 className={styles.chartTitle}>Most Expensive Ingredients</h2>
            {dashboardData.ingredientTrends.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={dashboardData.ingredientTrends}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                  <XAxis dataKey="name" stroke="#6b7280" fontSize={12} />
                  <YAxis stroke="#6b7280" fontSize={12} tickFormatter={(value) => `$${value.toFixed(0)}`} />
                  <Tooltip formatter={(value) => [formatCurrency(value), 'Price per unit']} />
                  <Bar dataKey="price" fill="#059669" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className={styles.noData}>No ingredient pricing data available</div>
            )}
          </div>
        </div>

        {/* Recent Activity & Menu Analysis */}
        <div className={styles.bottomRow}>
          {/* Recent Invoices */}
          <div className={styles.recentInvoices}>
            <h2 className={styles.sectionTitle}>Recent Invoices</h2>
            {dashboardData.recentInvoices.length > 0 ? (
              <div className={styles.invoicesList}>
                {dashboardData.recentInvoices.map(invoice => (
                  <div 
                    key={invoice.id}
                    className={styles.invoiceItem}
                    onClick={() => navigate(`/invoices/${invoice.id}`)}
                  >
                    <div className={styles.invoiceHeader}>
                      <span className={styles.invoiceNumber}>{invoice.number}</span>
                      <span className={styles.invoiceAmount}>{formatCurrency(invoice.amount)}</span>
                    </div>
                    <div className={styles.invoiceDetails}>
                      <span>{invoice.supplier}</span>
                      <span>{formatDate(invoice.date)}</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className={styles.noData}>No recent invoices</div>
            )}
          </div>

          {/* Menu Item Performance */}
          <div className={styles.menuPerformance}>
            <h2 className={styles.sectionTitle}>Menu Item Margins</h2>
            {dashboardData.menuItemAnalysis.length > 0 ? (
              <div className={styles.marginsList}>
                {dashboardData.menuItemAnalysis
                  .filter(item => item.hasCompleteData && item.price > 0)
                  .sort((a, b) => b.margin - a.margin)
                  .slice(0, 5)
                  .map(item => (
                    <div 
                      key={item.id}
                      className={styles.marginItem}
                      onClick={() => navigate(`/menu-items/${item.id}`)}
                    >
                      <div className={styles.marginHeader}>
                        <span className={styles.marginItemName}>{item.name}</span>
                        <span 
                          className={styles.marginValue}
                          style={{ color: getMarginColor(item.margin) }}
                        >
                          {item.margin.toFixed(1)}%
                        </span>
                      </div>
                      <div className={styles.marginDetails}>
                        {formatCurrency(item.price)} - {formatCurrency(item.cost)} = {formatCurrency(item.price - item.cost)}
                      </div>
                    </div>
                  ))}
              </div>
            ) : (
              <div className={styles.noData}>No menu items with complete pricing data</div>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
}