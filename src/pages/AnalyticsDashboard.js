// File: src/pages/AnalyticsDashboard.js
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import supabase from '../supabaseClient';
import styles from './AnalyticsDashboard.module.css';

export default function AnalyticsDashboard() {
  const navigate = useNavigate();
  const [restaurants, setRestaurants] = useState([]);
  const [selectedRestaurant, setSelectedRestaurant] = useState('');
  const [loading, setLoading] = useState(true);
  const [analytics, setAnalytics] = useState({
    costHistory: [],
    ingredientTrends: [],
    menuItemStats: [],
    invoiceStats: {}
  });

  useEffect(() => {
    fetchRestaurants();
  }, []);

  useEffect(() => {
    if (selectedRestaurant) {
      fetchAnalytics();
    }
  }, [selectedRestaurant]);

  async function fetchRestaurants() {
    try {
      const { data, error } = await supabase
        .from('restaurants')
        .select('id, name')
        .order('name');

      if (error) throw error;
      setRestaurants(data || []);
      
      // Auto-select first restaurant if available
      if (data && data.length > 0) {
        setSelectedRestaurant(data[0].id);
      }
    } catch (error) {
      console.error('Error fetching restaurants:', error);
    }
  }

  async function fetchAnalytics() {
    if (!selectedRestaurant) return;
    
    try {
      setLoading(true);
      
      // Fetch cost history
      const { data: costHistory, error: costError } = await supabase
        .from('menu_item_cost_history')
        .select('*')
        .eq('restaurant_id', selectedRestaurant)
        .order('created_at', { ascending: false })
        .limit(50);

      if (costError) throw costError;

      // Fetch ingredient price trends
      const { data: ingredients, error: ingredientError } = await supabase
        .from('ingredients')
        .select('*')
        .eq('restaurant_id', selectedRestaurant)
        .order('last_ordered_at', { ascending: false });

      if (ingredientError) throw ingredientError;

      // Fetch menu items with current costs
      const { data: menuItems, error: menuError } = await supabase
        .from('menu_items')
        .select('*')
        .eq('restaurant_id', selectedRestaurant)
        .order('cost', { ascending: false });

      if (menuError) throw menuError;

      // Fetch invoice statistics
      const { data: invoices, error: invoiceError } = await supabase
        .from('invoices')
        .select('*')
        .eq('restaurant_id', selectedRestaurant);

      if (invoiceError) throw invoiceError;

      // Calculate invoice stats
      const invoiceStats = {
        total: invoices.length,
        totalValue: invoices.reduce((sum, inv) => sum + (inv.amount || 0), 0),
        avgValue: invoices.length > 0 ? invoices.reduce((sum, inv) => sum + (inv.amount || 0), 0) / invoices.length : 0,
        lastMonth: invoices.filter(inv => {
          const invDate = new Date(inv.created_at);
          const lastMonth = new Date();
          lastMonth.setMonth(lastMonth.getMonth() - 1);
          return invDate >= lastMonth;
        }).length
      };

      setAnalytics({
        costHistory: costHistory || [],
        ingredientTrends: ingredients || [],
        menuItemStats: menuItems || [],
        invoiceStats
      });
    } catch (error) {
      console.error('Error fetching analytics:', error);
    } finally {
      setLoading(false);
    }
  }

  const selectedRestaurantName = restaurants.find(r => r.id === selectedRestaurant)?.name || '';

  // Calculate cost change trends
  const recentCostChanges = analytics.costHistory.slice(0, 10);
  const avgCostChange = recentCostChanges.length > 0 
    ? recentCostChanges.reduce((sum, change) => {
        const changeAmount = change.new_cost - change.old_cost;
        return sum + changeAmount;
      }, 0) / recentCostChanges.length
    : 0;

  // Find most expensive ingredients
  const topExpensiveIngredients = analytics.ingredientTrends
    .filter(ing => ing.last_price > 0)
    .sort((a, b) => b.last_price - a.last_price)
    .slice(0, 5);

  // Find most expensive menu items
  const topExpensiveMenuItems = analytics.menuItemStats
    .filter(item => item.cost > 0)
    .slice(0, 5);

  return (
    <div className={styles.wrapper}>
      {/* Header */}
      <header className={styles.header}>
        <div className={styles.headerContent}>
          <button 
            className={styles.backButton}
            onClick={() => navigate('/admin/dashboard')}
          >
            ← Back to Dashboard
          </button>
          <h1 className={styles.title}>Analytics Dashboard</h1>
        </div>
      </header>

      {/* Restaurant Selector */}
      <div className={styles.controls}>
        <div className={styles.restaurantSelector}>
          <label htmlFor="restaurant-select">Restaurant:</label>
          <select 
            id="restaurant-select"
            value={selectedRestaurant} 
            onChange={(e) => setSelectedRestaurant(e.target.value)}
            className={styles.select}
          >
            <option value="">Select a restaurant...</option>
            {restaurants.map(restaurant => (
              <option key={restaurant.id} value={restaurant.id}>
                {restaurant.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Main Content */}
      <main className={styles.main}>
        {!selectedRestaurant ? (
          <div className={styles.emptyState}>
            <div className={styles.emptyIcon}>📊</div>
            <h3>Select a Restaurant</h3>
            <p>Choose a restaurant from the dropdown to view analytics.</p>
          </div>
        ) : loading ? (
          <div className={styles.loading}>Loading analytics...</div>
        ) : (
          <>
            {/* Key Metrics */}
            <div className={styles.metricsGrid}>
              <div className={styles.metricCard}>
                <div className={styles.metricIcon}>💰</div>
                <div className={styles.metricContent}>
                  <h3>Total Invoice Value</h3>
                  <p className={styles.metricNumber}>
                    ${analytics.invoiceStats.totalValue?.toFixed(2) || '0.00'}
                  </p>
                  <p className={styles.metricLabel}>From {analytics.invoiceStats.total} invoices</p>
                </div>
              </div>

              <div className={styles.metricCard}>
                <div className={styles.metricIcon}>📈</div>
                <div className={styles.metricContent}>
                  <h3>Avg Cost Change</h3>
                  <p className={`${styles.metricNumber} ${avgCostChange >= 0 ? styles.positive : styles.negative}`}>
                    {avgCostChange >= 0 ? '+' : ''}${avgCostChange.toFixed(4)}
                  </p>
                  <p className={styles.metricLabel}>Recent 10 changes</p>
                </div>
              </div>

              <div className={styles.metricCard}>
                <div className={styles.metricIcon}>🍽️</div>
                <div className={styles.metricContent}>
                  <h3>Menu Items</h3>
                  <p className={styles.metricNumber}>{analytics.menuItemStats.length}</p>
                  <p className={styles.metricLabel}>Total items tracked</p>
                </div>
              </div>

              <div className={styles.metricCard}>
                <div className={styles.metricIcon}>🥕</div>
                <div className={styles.metricContent}>
                  <h3>Ingredients</h3>
                  <p className={styles.metricNumber}>{analytics.ingredientTrends.length}</p>
                  <p className={styles.metricLabel}>With pricing data</p>
                </div>
              </div>
            </div>

            {/* Recent Cost Changes */}
            <div className={styles.section}>
              <h2 className={styles.sectionTitle}>Recent Cost Changes</h2>
              {recentCostChanges.length === 0 ? (
                <div className={styles.emptySection}>
                  <p>No recent cost changes found.</p>
                </div>
              ) : (
                <div className={styles.costChangesTable}>
                  <table className={styles.table}>
                    <thead>
                      <tr>
                        <th>Date</th>
                        <th>Menu Item</th>
                        <th>Old Cost</th>
                        <th>New Cost</th>
                        <th>Change</th>
                        <th>Reason</th>
                      </tr>
                    </thead>
                    <tbody>
                      {recentCostChanges.map(change => {
                        const changeAmount = change.new_cost - change.old_cost;
                        const changePercent = change.old_cost > 0 ? (changeAmount / change.old_cost * 100) : 0;
                        
                        return (
                          <tr key={change.id}>
                            <td>{new Date(change.created_at).toLocaleDateString()}</td>
                            <td className={styles.menuItemName}>{change.menu_item_name}</td>
                            <td>${change.old_cost.toFixed(4)}</td>
                            <td>${change.new_cost.toFixed(4)}</td>
                            <td className={changeAmount >= 0 ? styles.positive : styles.negative}>
                              {changeAmount >= 0 ? '+' : ''}${changeAmount.toFixed(4)}
                              <span className={styles.percentage}>
                                ({changePercent >= 0 ? '+' : ''}{changePercent.toFixed(1)}%)
                              </span>
                            </td>
                            <td className={styles.reason}>{change.change_reason}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Two Column Layout */}
            <div className={styles.twoColumnGrid}>
              {/* Most Expensive Ingredients */}
              <div className={styles.section}>
                <h2 className={styles.sectionTitle}>Most Expensive Ingredients</h2>
                {topExpensiveIngredients.length === 0 ? (
                  <div className={styles.emptySection}>
                    <p>No ingredient pricing data available.</p>
                  </div>
                ) : (
                  <div className={styles.listContainer}>
                    {topExpensiveIngredients.map((ingredient, index) => (
                      <div key={ingredient.id} className={styles.listItem}>
                        <div className={styles.listRank}>#{index + 1}</div>
                        <div className={styles.listContent}>
                          <h4>{ingredient.name}</h4>
                          <p>${ingredient.last_price.toFixed(4)} per {ingredient.unit}</p>
                          {ingredient.last_ordered_at && (
                            <span className={styles.lastOrdered}>
                              Last ordered: {new Date(ingredient.last_ordered_at).toLocaleDateString()}
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Most Expensive Menu Items */}
              <div className={styles.section}>
                <h2 className={styles.sectionTitle}>Most Expensive Menu Items</h2>
                {topExpensiveMenuItems.length === 0 ? (
                  <div className={styles.emptySection}>
                    <p>No menu item cost data available.</p>
                  </div>
                ) : (
                  <div className={styles.listContainer}>
                    {topExpensiveMenuItems.map((item, index) => (
                      <div key={item.id} className={styles.listItem}>
                        <div className={styles.listRank}>#{index + 1}</div>
                        <div className={styles.listContent}>
                          <h4>{item.name}</h4>
                          <p>Cost: ${item.cost.toFixed(4)}</p>
                          {item.price && (
                            <span className={styles.profitMargin}>
                              Margin: ${(item.price - item.cost).toFixed(2)} 
                              ({((item.price - item.cost) / item.price * 100).toFixed(1)}%)
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
}