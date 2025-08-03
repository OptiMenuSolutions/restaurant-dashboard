// File: src/pages/IngredientsManagement.js
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import supabase from '../supabaseClient';
import styles from './IngredientsManagement.module.css';

export default function IngredientsManagement() {
  const navigate = useNavigate();
  const [ingredients, setIngredients] = useState([]);
  const [restaurants, setRestaurants] = useState([]);
  const [selectedRestaurant, setSelectedRestaurant] = useState('');
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [editingIngredient, setEditingIngredient] = useState(null);
  const [sortField, setSortField] = useState('name');
  const [sortDirection, setSortDirection] = useState('asc');

  useEffect(() => {
    fetchRestaurants();
  }, []);

  useEffect(() => {
    if (selectedRestaurant) {
      fetchIngredients();
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

  async function fetchIngredients() {
    if (!selectedRestaurant) return;
    
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('ingredients')
        .select('*')
        .eq('restaurant_id', selectedRestaurant)
        .order('name');

      if (error) throw error;
      setIngredients(data || []);
    } catch (error) {
      console.error('Error fetching ingredients:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleUpdateIngredient(ingredient, field, value) {
    try {
      const { error } = await supabase
        .from('ingredients')
        .update({ [field]: value })
        .eq('id', ingredient.id);

      if (error) throw error;

      // Update local state
      setIngredients(prev => 
        prev.map(ing => 
          ing.id === ingredient.id 
            ? { ...ing, [field]: value }
            : ing
        )
      );
      
      setEditingIngredient(null);
    } catch (error) {
      console.error('Error updating ingredient:', error);
      alert('Failed to update ingredient: ' + error.message);
    }
  }

  function handleSort(field) {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  }

  const filteredAndSortedIngredients = ingredients
    .filter(ingredient => 
      ingredient.name.toLowerCase().includes(searchTerm.toLowerCase())
    )
    .sort((a, b) => {
      let aValue = a[sortField];
      let bValue = b[sortField];
      
      if (sortField === 'last_price') {
        aValue = parseFloat(aValue) || 0;
        bValue = parseFloat(bValue) || 0;
      } else if (sortField === 'last_ordered_at') {
        aValue = new Date(aValue || 0);
        bValue = new Date(bValue || 0);
      } else {
        aValue = (aValue || '').toString().toLowerCase();
        bValue = (bValue || '').toString().toLowerCase();
      }
      
      if (sortDirection === 'asc') {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });

  const selectedRestaurantName = restaurants.find(r => r.id === selectedRestaurant)?.name || '';

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
          <h1 className={styles.title}>Ingredients Management</h1>
        </div>
      </header>

      {/* Controls */}
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

        <div className={styles.searchBox}>
          <input
            type="text"
            placeholder="Search ingredients..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className={styles.searchInput}
          />
        </div>
      </div>

      {/* Main Content */}
      <main className={styles.main}>
        {!selectedRestaurant ? (
          <div className={styles.emptyState}>
            <div className={styles.emptyIcon}>🥕</div>
            <h3>Select a Restaurant</h3>
            <p>Choose a restaurant from the dropdown to view and manage ingredients.</p>
          </div>
        ) : loading ? (
          <div className={styles.loading}>Loading ingredients...</div>
        ) : (
          <>
            {/* Summary Stats */}
            <div className={styles.summary}>
              <div className={styles.summaryCard}>
                <h3>Total Ingredients</h3>
                <p className={styles.summaryNumber}>{ingredients.length}</p>
              </div>
              <div className={styles.summaryCard}>
                <h3>With Pricing</h3>
                <p className={styles.summaryNumber}>
                  {ingredients.filter(ing => ing.last_price > 0).length}
                </p>
              </div>
              <div className={styles.summaryCard}>
                <h3>Restaurant</h3>
                <p className={styles.summaryText}>{selectedRestaurantName}</p>
              </div>
            </div>

            {/* Ingredients Table */}
            <div className={styles.tableContainer}>
              {filteredAndSortedIngredients.length === 0 ? (
                <div className={styles.emptyState}>
                  <div className={styles.emptyIcon}>🔍</div>
                  <h3>No Ingredients Found</h3>
                  <p>
                    {searchTerm 
                      ? `No ingredients match "${searchTerm}"`
                      : 'This restaurant has no ingredients yet. Process some invoices to get started.'
                    }
                  </p>
                </div>
              ) : (
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th 
                        className={styles.sortableHeader}
                        onClick={() => handleSort('name')}
                      >
                        Name {sortField === 'name' && (sortDirection === 'asc' ? '↑' : '↓')}
                      </th>
                      <th 
                        className={styles.sortableHeader}
                        onClick={() => handleSort('unit')}
                      >
                        Unit {sortField === 'unit' && (sortDirection === 'asc' ? '↑' : '↓')}
                      </th>
                      <th 
                        className={styles.sortableHeader}
                        onClick={() => handleSort('last_price')}
                      >
                        Last Price {sortField === 'last_price' && (sortDirection === 'asc' ? '↑' : '↓')}
                      </th>
                      <th 
                        className={styles.sortableHeader}
                        onClick={() => handleSort('last_ordered_at')}
                      >
                        Last Ordered {sortField === 'last_ordered_at' && (sortDirection === 'asc' ? '↑' : '↓')}
                      </th>
                      <th>Standard Unit</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredAndSortedIngredients.map(ingredient => (
                      <tr key={ingredient.id} className={styles.tableRow}>
                        <td className={styles.nameCell}>
                          {editingIngredient === `${ingredient.id}-name` ? (
                            <input
                              type="text"
                              defaultValue={ingredient.name}
                              onBlur={(e) => handleUpdateIngredient(ingredient, 'name', e.target.value)}
                              onKeyPress={(e) => {
                                if (e.key === 'Enter') {
                                  handleUpdateIngredient(ingredient, 'name', e.target.value);
                                }
                              }}
                              autoFocus
                              className={styles.editInput}
                            />
                          ) : (
                            <span 
                              onClick={() => setEditingIngredient(`${ingredient.id}-name`)}
                              className={styles.editableCell}
                            >
                              {ingredient.name}
                            </span>
                          )}
                        </td>
                        
                        <td>
                          <span className={styles.unit}>{ingredient.unit || 'N/A'}</span>
                        </td>
                        
                        <td className={styles.priceCell}>
                          {editingIngredient === `${ingredient.id}-price` ? (
                            <input
                              type="number"
                              step="0.0001"
                              defaultValue={ingredient.last_price}
                              onBlur={(e) => handleUpdateIngredient(ingredient, 'last_price', parseFloat(e.target.value))}
                              onKeyPress={(e) => {
                                if (e.key === 'Enter') {
                                  handleUpdateIngredient(ingredient, 'last_price', parseFloat(e.target.value));
                                }
                              }}
                              autoFocus
                              className={styles.editInput}
                            />
                          ) : (
                            <span 
                              onClick={() => setEditingIngredient(`${ingredient.id}-price`)}
                              className={styles.editableCell}
                            >
                              ${(ingredient.last_price || 0).toFixed(4)}
                            </span>
                          )}
                        </td>
                        
                        <td className={styles.dateCell}>
                          {ingredient.last_ordered_at 
                            ? new Date(ingredient.last_ordered_at).toLocaleDateString()
                            : 'Never'
                          }
                        </td>
                        
                        <td>
                          <span className={styles.standardUnit}>
                            {ingredient.standard_unit || ingredient.unit || 'N/A'}
                          </span>
                        </td>
                        
                        <td>
                          <button
                            className={styles.editButton}
                            onClick={() => {
                              // Could add a detailed edit modal here
                              console.log('Edit ingredient:', ingredient);
                            }}
                          >
                            Edit
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </>
        )}
      </main>
    </div>
  );
}