// File: src/pages/MenuItems.js
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import styles from "./MenuItems.module.css";
import Layout from "../components/Layout";
import supabase from "../supabaseClient";

export default function MenuItems() {
  const [menuItems, setMenuItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [restaurantId, setRestaurantId] = useState(null);
  const [sortBy, setSortBy] = useState("name");
  const [sortOrder, setSortOrder] = useState("asc");
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("All");
  const navigate = useNavigate();

  useEffect(() => {
    getRestaurantId();
  }, []);

  useEffect(() => {
    if (restaurantId) {
      fetchMenuItems();
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

  async function fetchMenuItems() {
    try {
      setLoading(true);
      setError("");

      const { data, error } = await supabase
        .from("menu_items")
        .select(`
          *,
          menu_item_ingredients (
            quantity,
            ingredients (
              name,
              unit,
              last_price
            )
          )
        `)
        .eq("restaurant_id", restaurantId)
        .order("name");

      if (error) {
        setError("Failed to fetch menu items: " + error.message);
        return;
      }

      setMenuItems(data || []);
    } catch (err) {
      setError("An unexpected error occurred while fetching menu items");
    } finally {
      setLoading(false);
    }
  }

  function handleSort(column) {
    if (sortBy === column) {
      setSortOrder(prev => prev === "asc" ? "desc" : "asc");
    } else {
      setSortBy(column);
      setSortOrder("asc");
    }
  }

  function handleRowClick(id) {
    navigate(`/menu-items/${id}`);
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

  function calculateMargin(price, cost) {
    const priceNum = parseFloat(price || 0);
    const costNum = parseFloat(cost || 0);
    
    if (priceNum === 0 || costNum === 0) return "--";
    
    const margin = ((priceNum - costNum) / priceNum) * 100;
    return margin.toFixed(1) + "%";
  }

  function getMarginColor(price, cost) {
    const priceNum = parseFloat(price || 0);
    const costNum = parseFloat(cost || 0);
    
    if (priceNum === 0 || costNum === 0) return "default";
    
    const margin = ((priceNum - costNum) / priceNum) * 100;
    
    if (margin >= 70) return "excellent";
    if (margin >= 50) return "good";
    if (margin >= 30) return "fair";
    return "poor";
  }

  function getFilteredAndSortedMenuItems() {
    let filtered = menuItems;

    // Apply search filter
    if (searchTerm) {
      filtered = menuItems.filter(item =>
        item.name?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Apply category filter (if you add categories later)
    if (categoryFilter !== "All") {
      // This is placeholder for future category functionality
      // filtered = filtered.filter(item => item.category === categoryFilter);
    }

    // Apply sorting
    const sorted = [...filtered].sort((a, b) => {
      let valueA, valueB;

      switch (sortBy) {
        case "name":
          valueA = a.name?.toLowerCase() || "";
          valueB = b.name?.toLowerCase() || "";
          break;
        case "price":
          valueA = parseFloat(a.price) || 0;
          valueB = parseFloat(b.price) || 0;
          break;
        case "cost":
          valueA = parseFloat(a.cost) || 0;
          valueB = parseFloat(b.cost) || 0;
          break;
        case "margin":
          const marginA = parseFloat(a.price || 0) > 0 && parseFloat(a.cost || 0) > 0 
            ? ((parseFloat(a.price) - parseFloat(a.cost)) / parseFloat(a.price)) * 100 
            : 0;
          const marginB = parseFloat(b.price || 0) > 0 && parseFloat(b.cost || 0) > 0 
            ? ((parseFloat(b.price) - parseFloat(b.cost)) / parseFloat(b.price)) * 100 
            : 0;
          valueA = marginA;
          valueB = marginB;
          break;
        default:
          return 0;
      }

      if (valueA < valueB) return sortOrder === "asc" ? -1 : 1;
      if (valueA > valueB) return sortOrder === "asc" ? 1 : -1;
      return 0;
    });

    return sorted;
  }

  function getSortIcon(column) {
    if (sortBy !== column) return "";
    return sortOrder === "asc" ? " ▲" : " ▼";
  }

  function clearSearch() {
    setSearchTerm("");
  }

  function getIngredientCount(menuItem) {
    return menuItem.menu_item_ingredients?.length || 0;
  }

  function hasIncompleteCosting(menuItem) {
    if (!menuItem.menu_item_ingredients || menuItem.menu_item_ingredients.length === 0) {
      return true;
    }
    
    return menuItem.menu_item_ingredients.some(ingredient => 
      !ingredient.ingredients?.last_price || parseFloat(ingredient.ingredients.last_price) === 0
    );
  }

  const filteredMenuItems = getFilteredAndSortedMenuItems();

  if (loading) {
    return (
      <Layout>
        <div className={styles.container}>
          <div className={styles.loadingState}>
            <div className={styles.loadingSpinner}></div>
            <p>Loading menu items...</p>
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
            <h3>Error Loading Menu Items</h3>
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
      <div className={styles.container}>
        {/* Header */}
        <div className={styles.header}>
          <h1 className={styles.title}>Menu Items</h1>
          <div className={styles.headerStats}>
            <span className={styles.totalCount}>
              {filteredMenuItems.length} item{filteredMenuItems.length !== 1 ? 's' : ''}
              {searchTerm && ` (filtered from ${menuItems.length})`}
            </span>
          </div>
        </div>

        {/* Search and Controls */}
        <div className={styles.controls}>
          <div className={styles.searchContainer}>
            <input
              type="text"
              placeholder="Search menu items by name..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className={styles.searchInput}
            />
            {searchTerm && (
              <button onClick={clearSearch} className={styles.clearButton}>
                ✕
              </button>
            )}
          </div>

          {/* Future: Category filter dropdown can go here */}
        </div>

        {/* Menu Items Table */}
        {filteredMenuItems.length === 0 ? (
          <div className={styles.emptyState}>
            {searchTerm ? (
              <>
                <div className={styles.emptyIcon}>🔍</div>
                <h3>No menu items found</h3>
                <p>No menu items match your search term "{searchTerm}"</p>
                <button onClick={clearSearch} className={styles.clearSearchButton}>
                  Clear search
                </button>
              </>
            ) : menuItems.length === 0 ? (
              <>
                <div className={styles.emptyIcon}>🍽️</div>
                <h3>No menu items yet</h3>
                <p>Menu items will appear here when they are added to your restaurant.</p>
              </>
            ) : null}
          </div>
        ) : (
          <div className={styles.tableContainer}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th 
                    onClick={() => handleSort("name")}
                    className={styles.sortableHeader}
                  >
                    Menu Item {getSortIcon("name")}
                  </th>
                  <th 
                    onClick={() => handleSort("price")}
                    className={styles.sortableHeader}
                  >
                    Price {getSortIcon("price")}
                  </th>
                  <th 
                    onClick={() => handleSort("cost")}
                    className={styles.sortableHeader}
                  >
                    Cost {getSortIcon("cost")}
                  </th>
                  <th 
                    onClick={() => handleSort("margin")}
                    className={styles.sortableHeader}
                  >
                    Profit Margin {getSortIcon("margin")}
                  </th>
                  <th>Ingredients</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {filteredMenuItems.map((item) => {
                  const marginColor = getMarginColor(item.price, item.cost);
                  const ingredientCount = getIngredientCount(item);
                  const hasIncompleteData = hasIncompleteCosting(item);
                  
                  return (
                    <tr
                      key={item.id}
                      onClick={() => handleRowClick(item.id)}
                      className={styles.clickableRow}
                    >
                      <td data-label="Menu Item">
                        <span className={styles.itemName}>
                          {item.name || "Unnamed item"}
                        </span>
                      </td>
                      <td data-label="Price" className={styles.priceCell}>
                        {item.price ? (
                          <span className={styles.priceValue}>
                            {formatCurrency(item.price)}
                          </span>
                        ) : (
                          <span className={styles.noPrice}>No price set</span>
                        )}
                      </td>
                      <td data-label="Cost" className={styles.priceCell}>
                        {item.cost ? (
                          <span className={styles.costValue}>
                            {formatCurrency(item.cost)}
                          </span>
                        ) : (
                          <span className={styles.noPrice}>No cost data</span>
                        )}
                      </td>
                      <td data-label="Profit Margin" className={styles.priceCell}>
                        <span className={`${styles.marginValue} ${styles[marginColor]}`}>
                          {calculateMargin(item.price, item.cost)}
                        </span>
                      </td>
                      <td data-label="Ingredients">
                        <span className={styles.ingredientCount}>
                          {ingredientCount} ingredient{ingredientCount !== 1 ? 's' : ''}
                        </span>
                      </td>
                      <td data-label="Status">
                        <span className={`${styles.status} ${
                          hasIncompleteData ? styles.incomplete : 
                          item.price && item.cost ? styles.complete : styles.partial
                        }`}>
                          {hasIncompleteData ? "Incomplete" :
                           item.price && item.cost ? "Complete" : "Partial"}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Summary Stats */}
        {filteredMenuItems.length > 0 && (
          <div className={styles.summaryStats}>
            <div className={styles.statCard}>
              <div className={styles.statValue}>
                {filteredMenuItems.filter(item => item.price && item.cost).length}
              </div>
              <div className={styles.statLabel}>With complete pricing</div>
            </div>
            <div className={styles.statCard}>
              <div className={styles.statValue}>
                {filteredMenuItems.filter(item => hasIncompleteCosting(item)).length}
              </div>
              <div className={styles.statLabel}>Need ingredient pricing</div>
            </div>
            <div className={styles.statCard}>
              <div className={styles.statValue}>
                {formatCurrency(
                  filteredMenuItems
                    .filter(item => item.price)
                    .reduce((sum, item) => sum + parseFloat(item.price), 0) / 
                  filteredMenuItems.filter(item => item.price).length || 0
                )}
              </div>
              <div className={styles.statLabel}>Average menu price</div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}