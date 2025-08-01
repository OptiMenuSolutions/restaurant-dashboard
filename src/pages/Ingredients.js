// File: src/pages/Ingredients.js
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import styles from "./Ingredients.module.css";
import Layout from "../components/Layout";
import supabase from "../supabaseClient";

export default function Ingredients() {
  const [ingredients, setIngredients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [restaurantId, setRestaurantId] = useState(null);
  const [sortBy, setSortBy] = useState("name");
  const [sortOrder, setSortOrder] = useState("asc");
  const [searchTerm, setSearchTerm] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    getRestaurantId();
  }, []);

  useEffect(() => {
    if (restaurantId) {
      fetchIngredients();
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

  async function fetchIngredients() {
    try {
      setLoading(true);
      setError("");

      const { data, error } = await supabase
        .from("ingredients")
        .select("*")
        .eq("restaurant_id", restaurantId)
        .order("name");

      if (error) {
        setError("Failed to fetch ingredients: " + error.message);
        return;
      }

      setIngredients(data || []);
    } catch (err) {
      setError("An unexpected error occurred while fetching ingredients");
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
    navigate(`/ingredients/${id}`);
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
    if (!dateString) return "Never";
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

  function getFilteredAndSortedIngredients() {
    let filtered = ingredients;

    // Apply search filter
    if (searchTerm) {
      filtered = ingredients.filter(ingredient =>
        ingredient.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        ingredient.unit?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Apply sorting
    const sorted = [...filtered].sort((a, b) => {
      let valueA, valueB;

      switch (sortBy) {
        case "name":
          valueA = a.name?.toLowerCase() || "";
          valueB = b.name?.toLowerCase() || "";
          break;
        case "last_price":
          valueA = parseFloat(a.last_price) || 0;
          valueB = parseFloat(b.last_price) || 0;
          break;
        case "unit":
          valueA = a.unit?.toLowerCase() || "";
          valueB = b.unit?.toLowerCase() || "";
          break;
        case "last_ordered_at":
          valueA = new Date(a.last_ordered_at || "1970-01-01");
          valueB = new Date(b.last_ordered_at || "1970-01-01");
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

  const filteredIngredients = getFilteredAndSortedIngredients();

  if (loading) {
    return (
      <Layout>
        <div className={styles.container}>
          <div className={styles.loadingState}>
            <div className={styles.loadingSpinner}></div>
            <p>Loading ingredients...</p>
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
            <h3>Error Loading Ingredients</h3>
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
          <h1 className={styles.title}>Ingredients</h1>
          <div className={styles.headerStats}>
            <span className={styles.totalCount}>
              {filteredIngredients.length} ingredient{filteredIngredients.length !== 1 ? 's' : ''}
              {searchTerm && ` (filtered from ${ingredients.length})`}
            </span>
          </div>
        </div>

        {/* Search and Controls */}
        <div className={styles.controls}>
          <div className={styles.searchContainer}>
            <input
              type="text"
              placeholder="Search ingredients by name or unit..."
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
        </div>

        {/* Ingredients Table */}
        {filteredIngredients.length === 0 ? (
          <div className={styles.emptyState}>
            {searchTerm ? (
              <>
                <div className={styles.emptyIcon}>🔍</div>
                <h3>No ingredients found</h3>
                <p>No ingredients match your search term "{searchTerm}"</p>
                <button onClick={clearSearch} className={styles.clearSearchButton}>
                  Clear search
                </button>
              </>
            ) : ingredients.length === 0 ? (
              <>
                <div className={styles.emptyIcon}>🥬</div>
                <h3>No ingredients yet</h3>
                <p>Ingredients will appear here after invoices are processed by the admin team.</p>
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
                    Ingredient Name {getSortIcon("name")}
                  </th>
                  <th 
                    onClick={() => handleSort("last_price")}
                    className={styles.sortableHeader}
                  >
                    Latest Cost {getSortIcon("last_price")}
                  </th>
                  <th 
                    onClick={() => handleSort("unit")}
                    className={styles.sortableHeader}
                  >
                    Unit {getSortIcon("unit")}
                  </th>
                  <th 
                    onClick={() => handleSort("last_ordered_at")}
                    className={styles.sortableHeader}
                  >
                    Last Ordered {getSortIcon("last_ordered_at")}
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredIngredients.map((ingredient) => {
                  const hasRecentPrice = ingredient.last_price && ingredient.last_price > 0;
                  const isRecentlyOrdered = ingredient.last_ordered_at && 
                    new Date(ingredient.last_ordered_at) > new Date(Date.now() - 90 * 24 * 60 * 60 * 1000); // 90 days
                  
                  return (
                    <tr
                      key={ingredient.id}
                      onClick={() => handleRowClick(ingredient.id)}
                      className={styles.clickableRow}
                    >
                      <td data-label="Ingredient Name">
                        <span className={styles.ingredientName}>
                          {ingredient.name || "Unnamed ingredient"}
                        </span>
                      </td>
                      <td data-label="Latest Cost" className={styles.priceCell}>
                        {hasRecentPrice ? (
                          <span className={styles.priceValue}>
                            {formatCurrency(ingredient.last_price)}
                          </span>
                        ) : (
                          <span className={styles.noPrice}>No price data</span>
                        )}
                      </td>
                      <td data-label="Unit">
                        <span className={styles.unitValue}>
                          {ingredient.unit || "N/A"}
                        </span>
                      </td>
                      <td data-label="Last Ordered">
                        <span className={styles.dateValue}>
                          {formatDate(ingredient.last_ordered_at)}
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
        {filteredIngredients.length > 0 && (
          <div className={styles.summaryStats}>
            <div className={styles.statCard}>
              <div className={styles.statValue}>
                {filteredIngredients.filter(i => i.last_price > 0).length}
              </div>
              <div className={styles.statLabel}>With pricing data</div>
            </div>
            <div className={styles.statCard}>
              <div className={styles.statValue}>
                {filteredIngredients.filter(i => 
                  i.last_ordered_at && new Date(i.last_ordered_at) > new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
                ).length}
              </div>
              <div className={styles.statLabel}>Ordered this month</div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}