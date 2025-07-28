// File: src/pages/Dashboard.js - Professional Version
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
  Area,
  AreaChart,
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
    averageMargin: 0,
    totalSpending: 0,
    processingStats: { processed: 0, pending: 0 }
  });
  const navigate = useNavigate();

  // Alert thresholds
  const LOW_MARGIN_THRESHOLD = 40;
  const VERY_LOW_MARGIN_THRESHOLD = 25;

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

      // Fetch invoices
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
    const totalInvoices = invoices.length;
    const totalIngredients = ingredients.length;
    const totalMenuItems = menuItems.length;

    // Processing stats
    const processedInvoices = invoices.filter(inv => inv.number && inv.supplier && inv.amount);
    const pendingInvoices = invoices.filter(inv => !inv.number || !inv.supplier || !inv.amount);

    // Total spending
    const totalSpending = processedInvoices.reduce((sum, inv) => sum + parseFloat(inv.amount || 0), 0);

    // Unpriced ingredients
    const unpricedIngredients = ingredients.filter(ing => 
      !ing.last_price || parseFloat(ing.last_price) === 0
    ).length;

    // Recent invoices (last 8)
    const recentInvoices = processedInvoices.slice(0, 8).map(inv => ({
      id: inv.id,
      number: inv.number,
      supplier: inv.supplier,
      amount: inv.amount,
      date: inv.date,
      created_at: inv.created_at
    }));

    // Menu item analysis
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

    // Average margin
    const itemsWithMargins = menuItemAnalysis.filter(item => 
      item.hasCompleteData && item.price > 0
    );
    const averageMargin = itemsWithMargins.length > 0 
      ? itemsWithMargins.reduce((sum, item) => sum + item.margin, 0) / itemsWithMargins.length
      : 0;

    // Monthly spending trend
    const monthlySpending = calculateMonthlySpending(processedInvoices);

    // Top ingredients by cost
    const ingredientTrends = ingredients
      .filter(ing => ing.last_price > 0)
      .sort((a, b) => parseFloat(b.last_price) - parseFloat(a.last_price))
      .slice(0, 6)
      .map(ing => ({
        name: ing.name.length > 12 ? ing.name.substring(0, 12) + '...' : ing.name,
        fullName: ing.name,
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
      averageMargin,
      totalSpending,
      processingStats: {
        processed: processedInvoices.length,
        pending: pendingInvoices.length
      }
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
        const monthName = date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
        
        if (!monthlyTotals[monthKey]) {
          monthlyTotals[monthKey] = { month: monthName, total: 0, invoiceCount: 0 };
        }
        monthlyTotals[monthKey].total += parseFloat(invoice.amount);
        monthlyTotals[monthKey].invoiceCount += 1;
      }
    });

    return Object.values(monthlyTotals)
      .sort((a, b) => a.month.localeCompare(b.month))
      .slice(-6);
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
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    });
  }

  function formatCurrencyDetailed(amount) {
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
    if (margin >= 60) return "#10b981";
    if (margin >= 40) return "#3b82f6"; 
    if (margin >= 25) return "#f59e0b";
    return "#ef4444";
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
          <div className={styles.loadingContainer}>
            <div className={styles.loadingSpinner}></div>
            <h3>Loading Dashboard</h3>
            <p>Analyzing your restaurant data...</p>
          </div>
        </div>
      </Layout>
    );
  }

  if (error) {
    return (
      <Layout>
        <div className={styles.dashboard}>
          <div className={styles.errorContainer}>
            <div className={styles.errorIcon}>⚠️</div>
            <h3>Unable to Load Dashboard</h3>
            <p>{error}</p>
            <button onClick={() => window.location.reload()} className={styles.retryButton}>
              Try Again
            </button>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className={styles.dashboard}>
        {/* Compact Header */}
        <div className={styles.compactHeader}>
          <h1 className={styles.pageTitle}>Cost Management Overview</h1>
          <p className={styles.pageSubtitle}>
            Monitor ingredient costs, track profit margins, and optimize menu pricing
          </p>
        </div>

        {/* Critical Alerts */}
        {dashboardData.lowMarginItems.length > 0 && (
          <div className={styles.alertSection}>
            <div className={styles.alertHeader}>
              <div className={styles.alertTitle}>
                <span className={styles.alertIcon}>🚨</span>
                Profit Margin Alerts
              </div>
              <div className={styles.alertCount}>
                {dashboardData.lowMarginItems.length} item{dashboardData.lowMarginItems.length !== 1 ? 's' : ''} need attention
              </div>
            </div>
            <div className={styles.alertGrid}>
              {dashboardData.lowMarginItems.slice(0, 3).map(item => (
                <div 
                  key={item.id}
                  className={`${styles.alertCard} ${styles[getAlertLevel(item.margin)]}`}
                  onClick={() => navigate(`/menu-items/${item.id}`)}
                >
                  <div className={styles.alertCardHeader}>
                    <h4 className={styles.alertItemName}>{item.name}</h4>
                    <div className={styles.alertBadge}>
                      {item.margin.toFixed(1)}%
                    </div>
                  </div>
                  <div className={styles.alertCardBody}>
                    <div className={styles.alertNumbers}>
                      <span>Price: {formatCurrencyDetailed(item.price)}</span>
                      <span>Cost: {formatCurrencyDetailed(item.cost)}</span>
                    </div>
                    <div className={styles.alertAction}>
                      {item.margin < VERY_LOW_MARGIN_THRESHOLD ? 
                        "Critical - Review immediately" : 
                        "Consider price adjustment"}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Key Metrics Grid */}
        <div className={styles.metricsGrid}>
          <div className={styles.metricCard} onClick={() => navigate('/invoices')}>
            <div className={styles.metricIcon}>📊</div>
            <div className={styles.metricContent}>
              <div className={styles.metricValue}>{dashboardData.totalInvoices}</div>
              <div className={styles.metricLabel}>Total Invoices</div>
              <div className={styles.metricSubtext}>
                {dashboardData.processingStats.pending > 0 && 
                  `${dashboardData.processingStats.pending} pending review`
                }
              </div>
            </div>
            <div className={styles.metricArrow}>→</div>
          </div>

          <div className={styles.metricCard} onClick={() => navigate('/ingredients')}>
            <div className={styles.metricIcon}>🥬</div>
            <div className={styles.metricContent}>
              <div className={styles.metricValue}>{dashboardData.totalIngredients}</div>
              <div className={styles.metricLabel}>Ingredients</div>
              <div className={styles.metricSubtext}>
                {dashboardData.unpricedIngredients > 0 ? 
                  `${dashboardData.unpricedIngredients} need pricing` : 
                  'All ingredients priced'
                }
              </div>
            </div>
            <div className={styles.metricArrow}>→</div>
          </div>

          <div className={styles.metricCard} onClick={() => navigate('/menu-items')}>
            <div className={styles.metricIcon}>🍽️</div>
            <div className={styles.metricContent}>
              <div className={styles.metricValue}>{dashboardData.totalMenuItems}</div>
              <div className={styles.metricLabel}>Menu Items</div>
              <div className={styles.metricSubtext}>
                {dashboardData.lowMarginItems.length > 0 ? 
                  `${dashboardData.lowMarginItems.length} low margin` : 
                  'All items profitable'
                }
              </div>
            </div>
            <div className={styles.metricArrow}>→</div>
          </div>

          <div className={styles.metricCard}>
            <div className={styles.metricIcon}>💰</div>
            <div className={styles.metricContent}>
              <div className={styles.metricValue} style={{ color: getMarginColor(dashboardData.averageMargin) }}>
                {dashboardData.averageMargin.toFixed(1)}%
              </div>
              <div className={styles.metricLabel}>Average Margin</div>
              <div className={styles.metricSubtext}>
                {dashboardData.averageMargin >= 50 ? 'Excellent profitability' :
                 dashboardData.averageMargin >= 35 ? 'Good profitability' :
                 'Room for improvement'}
              </div>
            </div>
          </div>
        </div>

        {/* Analytics Section */}
        <div className={styles.analyticsSection}>
          <div className={styles.chartCard}>
            <div className={styles.chartHeader}>
              <h3 className={styles.chartTitle}>Monthly Spending Trends</h3>
              <div className={styles.chartSubtitle}>
                Ingredient costs over the last 6 months
              </div>
            </div>
            <div className={styles.chartContainer}>
              {dashboardData.monthlySpending.length > 0 ? (
                <ResponsiveContainer width="100%" height={320}>
                  <AreaChart data={dashboardData.monthlySpending}>
                    <defs>
                      <linearGradient id="spendingGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.05}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis 
                      dataKey="month" 
                      stroke="#6b7280" 
                      fontSize={12}
                      tickLine={false}
                      axisLine={false}
                    />
                    <YAxis 
                      stroke="#6b7280" 
                      fontSize={12}
                      tickFormatter={(value) => `$${(value/1000).toFixed(0)}k`}
                      tickLine={false}
                      axisLine={false}
                    />
                    <Tooltip 
                      formatter={(value) => [formatCurrency(value), 'Total Spent']}
                      contentStyle={{
                        backgroundColor: 'white',
                        border: '1px solid #e5e7eb',
                        borderRadius: '8px',
                        boxShadow: '0 10px 25px rgba(0,0,0,0.1)'
                      }}
                    />
                    <Area
                      type="monotone"
                      dataKey="total"
                      stroke="#3b82f6"
                      strokeWidth={3}
                      fill="url(#spendingGradient)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className={styles.emptyChart}>
                  <div className={styles.emptyChartIcon}>📈</div>
                  <p>No spending data available</p>
                  <span>Process more invoices to see trends</span>
                </div>
              )}
            </div>
          </div>

          <div className={styles.chartCard}>
            <div className={styles.chartHeader}>
              <h3 className={styles.chartTitle}>Top Ingredient Costs</h3>
              <div className={styles.chartSubtitle}>
                Most expensive ingredients per unit
              </div>
            </div>
            <div className={styles.chartContainer}>
              {dashboardData.ingredientTrends.length > 0 ? (
                <ResponsiveContainer width="100%" height={320}>
                  <BarChart data={dashboardData.ingredientTrends} margin={{ left: 20, right: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis 
                      dataKey="name" 
                      stroke="#6b7280" 
                      fontSize={11}
                      tickLine={false}
                      axisLine={false}
                      angle={-45}
                      textAnchor="end"
                      height={60}
                    />
                    <YAxis 
                      stroke="#6b7280" 
                      fontSize={12}
                      tickFormatter={(value) => `$${value.toFixed(0)}`}
                      tickLine={false}
                      axisLine={false}
                    />
                    <Tooltip 
                      formatter={(value, name, props) => [
                        formatCurrencyDetailed(value), 
                        `${props.payload.fullName} (per ${props.payload.unit})`
                      ]}
                      contentStyle={{
                        backgroundColor: 'white',
                        border: '1px solid #e5e7eb',
                        borderRadius: '8px',
                        boxShadow: '0 10px 25px rgba(0,0,0,0.1)'
                      }}
                    />
                    <Bar 
                      dataKey="price" 
                      fill="#10b981"
                      radius={[4, 4, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className={styles.emptyChart}>
                  <div className={styles.emptyChartIcon}>💰</div>
                  <p>No ingredient pricing data</p>
                  <span>Process invoices to track costs</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Recent Activity */}
        <div className={styles.activitySection}>
          <div className={styles.activityCard}>
            <div className={styles.activityHeader}>
              <h3 className={styles.activityTitle}>Recent Invoice Activity</h3>
              <button 
                className={styles.viewAllButton}
                onClick={() => navigate('/invoices')}
              >
                View All
              </button>
            </div>
            <div className={styles.activityList}>
              {dashboardData.recentInvoices.length > 0 ? (
                dashboardData.recentInvoices.slice(0, 6).map(invoice => (
                  <div 
                    key={invoice.id}
                    className={styles.activityItem}
                    onClick={() => navigate(`/invoices/${invoice.id}`)}
                  >
                    <div className={styles.activityIcon}>📄</div>
                    <div className={styles.activityContent}>
                      <div className={styles.activityMain}>
                        <span className={styles.activityTitle}>{invoice.number}</span>
                        <span className={styles.activityAmount}>{formatCurrency(invoice.amount)}</span>
                      </div>
                      <div className={styles.activityMeta}>
                        <span>{invoice.supplier}</span>
                        <span>{formatDate(invoice.date)}</span>
                      </div>
                    </div>
                    <div className={styles.activityArrow}>→</div>
                  </div>
                ))
              ) : (
                <div className={styles.emptyActivity}>
                  <div className={styles.emptyActivityIcon}>📋</div>
                  <p>No recent invoices</p>
                  <span>Upload invoices to see activity</span>
                </div>
              )}
            </div>
          </div>

          <div className={styles.activityCard}>
            <div className={styles.activityHeader}>
              <h3 className={styles.activityTitle}>Menu Performance</h3>
              <button 
                className={styles.viewAllButton}
                onClick={() => navigate('/menu-items')}
              >
                View All
              </button>
            </div>
            <div className={styles.activityList}>
              {dashboardData.menuItemAnalysis.length > 0 ? (
                dashboardData.menuItemAnalysis
                  .filter(item => item.hasCompleteData && item.price > 0)
                  .sort((a, b) => b.margin - a.margin)
                  .slice(0, 6)
                  .map(item => (
                    <div 
                      key={item.id}
                      className={styles.activityItem}
                      onClick={() => navigate(`/menu-items/${item.id}`)}
                    >
                      <div className={styles.activityIcon}>🍽️</div>
                      <div className={styles.activityContent}>
                        <div className={styles.activityMain}>
                          <span className={styles.activityTitle}>{item.name}</span>
                          <span 
                            className={styles.activityMargin}
                            style={{ color: getMarginColor(item.margin) }}
                          >
                            {item.margin.toFixed(1)}%
                          </span>
                        </div>
                        <div className={styles.activityMeta}>
                          <span>{formatCurrencyDetailed(item.price)} - {formatCurrencyDetailed(item.cost)}</span>
                          <span>= {formatCurrencyDetailed(item.price - item.cost)}</span>
                        </div>
                      </div>
                      <div className={styles.activityArrow}>→</div>
                    </div>
                  ))
              ) : (
                <div className={styles.emptyActivity}>
                  <div className={styles.emptyActivityIcon}>🍽️</div>
                  <p>No menu items with pricing</p>
                  <span>Add menu items to track performance</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}