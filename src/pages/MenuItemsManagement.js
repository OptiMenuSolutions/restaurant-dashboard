// File: src/pages/MenuItemsManagement.js
import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import supabase from '../supabaseClient';
import styles from './MenuItemsManagement.module.css';

export default function MenuItemsManagement() {
  const navigate = useNavigate();
  const [restaurants, setRestaurants] = useState([]);
  const [selectedRestaurant, setSelectedRestaurant] = useState(null);
  const [menuItems, setMenuItems] = useState([]);
  const [ingredients, setIngredients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  
  // Form state
  const [formData, setFormData] = useState({
    name: '',
    price: ''
  });
  const [menuItemIngredients, setMenuItemIngredients] = useState([]);
  const [filteredIngredients, setFilteredIngredients] = useState([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchRestaurants();
  }, []);

  useEffect(() => {
    if (selectedRestaurant) {
      fetchMenuItems();
      fetchIngredients();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedRestaurant]);

  async function fetchRestaurants() {
    try {
      const { data, error } = await supabase
        .from('restaurants')
        .select('*')
        .order('name');

      if (error) throw error;
      setRestaurants(data || []);
    } catch (error) {
      console.error('Error fetching restaurants:', error);
    } finally {
      setLoading(false);
    }
  }

  const fetchMenuItems = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('menu_items')
        .select('*')
        .eq('restaurant_id', selectedRestaurant.id)
        .order('name');

      if (error) throw error;
      setMenuItems(data || []);
    } catch (error) {
      console.error('Error fetching menu items:', error);
    }
  }, [selectedRestaurant?.id]);

  const fetchIngredients = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('ingredients')
        .select('*')
        .eq('restaurant_id', selectedRestaurant.id)
        .order('name');

      if (error) throw error;
      setIngredients(data || []);
    } catch (error) {
      console.error('Error fetching ingredients:', error);
    }
  }, [selectedRestaurant?.id]);

  function handleRestaurantSelect(restaurant) {
    setSelectedRestaurant(restaurant);
    setShowAddForm(false);
    setEditingItem(null);
  }

  function handleFormChange(e) {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  }

  function addIngredientRow() {
    const newIngredient = {
      id: Date.now(),
      ingredient_id: null,
      ingredient_search: '',
      quantity: '',
      isNew: true
    };
    setMenuItemIngredients(prev => [...prev, newIngredient]);
  }

  function removeIngredientRow(index) {
    setMenuItemIngredients(prev => prev.filter((_, i) => i !== index));
  }

  function handleIngredientChange(index, field, value) {
    setMenuItemIngredients(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  }

  function handleIngredientSearch(index, searchTerm) {
    handleIngredientChange(index, 'ingredient_search', searchTerm);
    
    if (searchTerm.length > 1) {
      const filtered = ingredients.filter(ingredient =>
        ingredient.name.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredIngredients(filtered);
    } else {
      setFilteredIngredients([]);
    }
  }

  function selectIngredient(index, ingredient) {
    handleIngredientChange(index, 'ingredient_id', ingredient.id);
    handleIngredientChange(index, 'ingredient_search', ingredient.name);
    setFilteredIngredients([]);
  }

  function startAddItem() {
    setFormData({ name: '', price: '' });
    setMenuItemIngredients([]);
    setShowAddForm(true);
    setEditingItem(null);
  }

  async function startEditItem(item) {
    setFormData({
      name: item.name,
      price: item.price.toString()
    });

    // Fetch existing ingredients for this menu item
    try {
      const { data: existingIngredients, error } = await supabase
        .from('menu_item_ingredients')
        .select(`
          *,
          ingredients:ingredient_id (
            id,
            name,
            unit
          )
        `)
        .eq('menu_item_id', item.id);

      if (error) throw error;

      const formattedIngredients = existingIngredients.map(ing => ({
        id: ing.id,
        ingredient_id: ing.ingredient_id,
        ingredient_search: ing.ingredients?.name || '',
        quantity: ing.quantity.toString(),
        isNew: false
      }));

      setMenuItemIngredients(formattedIngredients);
    } catch (error) {
      console.error('Error fetching menu item ingredients:', error);
      setMenuItemIngredients([]);
    }

    setEditingItem(item);
    setShowAddForm(true);
  }

  function cancelForm() {
    setShowAddForm(false);
    setEditingItem(null);
    setFormData({ name: '', price: '' });
    setMenuItemIngredients([]);
  }

  async function handleSubmit() {
    try {
      setSaving(true);

      // Validate form
      if (!formData.name || !formData.price) {
        alert('Please fill in menu item name and price');
        return;
      }

      if (menuItemIngredients.length === 0) {
        alert('Please add at least one ingredient');
        return;
      }

      // Create missing ingredients and validate
      for (let ingredient of menuItemIngredients) {
        if (!ingredient.quantity) {
          alert('Please enter quantity for all ingredients');
          return;
        }

        // If no ingredient_id but we have a search term, create the ingredient
        if (!ingredient.ingredient_id && ingredient.ingredient_search) {
          const { data: newIngredient, error: createError } = await supabase
            .from('ingredients')
            .insert({
              restaurant_id: selectedRestaurant.id,
              name: ingredient.ingredient_search,
              unit: 'each', // Default unit
              last_price: 0, // Will be updated when invoices are processed
              last_ordered_at: null
            })
            .select()
            .single();

          if (createError) {
            console.error('Failed to create ingredient:', createError);
            alert('Failed to create ingredient: ' + createError.message);
            return;
          }

          ingredient.ingredient_id = newIngredient.id;
        }

        if (!ingredient.ingredient_id || !ingredient.quantity) {
          alert('Please complete all ingredient fields');
          return;
        }
      }

      let menuItemId;

      if (editingItem) {
        // Update existing menu item
        const { error: updateError } = await supabase
          .from('menu_items')
          .update({
            name: formData.name,
            price: parseFloat(formData.price)
          })
          .eq('id', editingItem.id);

        if (updateError) throw updateError;
        menuItemId = editingItem.id;

        // Delete existing ingredients
        const { error: deleteError } = await supabase
          .from('menu_item_ingredients')
          .delete()
          .eq('menu_item_id', editingItem.id);

        if (deleteError) throw deleteError;
      } else {
        // Create new menu item
        const { data: newMenuItem, error: insertError } = await supabase
          .from('menu_items')
          .insert({
            restaurant_id: selectedRestaurant.id,
            name: formData.name,
            price: parseFloat(formData.price),
            cost: 0 // Will be calculated
          })
          .select()
          .single();

        if (insertError) throw insertError;
        menuItemId = newMenuItem.id;
      }

      // Insert ingredients
      const ingredientsToInsert = menuItemIngredients.map(ing => ({
        menu_item_id: menuItemId,
        ingredient_id: ing.ingredient_id,
        quantity: parseFloat(ing.quantity)
      }));

      const { error: ingredientsError } = await supabase
        .from('menu_item_ingredients')
        .insert(ingredientsToInsert);

      if (ingredientsError) {
        alert('Failed to save ingredients: ' + ingredientsError.message);
        return;
      }

      // Calculate and update menu item cost
      await calculateMenuItemCost(menuItemId);

      alert(editingItem ? 'Menu item updated successfully!' : 'Menu item added successfully!');
      cancelForm();
      fetchMenuItems();

    } catch (error) {
      console.error('Error saving menu item:', error);
      alert('Failed to save menu item: ' + error.message);
    } finally {
      setSaving(false);
    }
  }

  async function calculateMenuItemCost(menuItemId) {
    try {
      const { data: itemIngredients, error } = await supabase
        .from('menu_item_ingredients')
        .select(`
          quantity,
          ingredients:ingredient_id (
            last_price
          )
        `)
        .eq('menu_item_id', menuItemId);

      if (error) throw error;

      let totalCost = 0;
      itemIngredients.forEach(ing => {
        const ingredientCost = ing.ingredients?.last_price || 0;
        totalCost += ing.quantity * ingredientCost;
      });

      await supabase
        .from('menu_items')
        .update({ cost: totalCost })
        .eq('id', menuItemId);

    } catch (error) {
      console.error('Error calculating menu item cost:', error);
    }
  }

  async function deleteMenuItem(item) {
    if (!window.confirm(`Are you sure you want to delete "${item.name}"?`)) return;

    try {
      await supabase
        .from('menu_item_ingredients')
        .delete()
        .eq('menu_item_id', item.id);

      const { error } = await supabase
        .from('menu_items')
        .delete()
        .eq('id', item.id);

      if (error) throw error;

      alert('Menu item deleted successfully!');
      fetchMenuItems();
    } catch (error) {
      console.error('Error deleting menu item:', error);
      alert('Failed to delete menu item');
    }
  }

  if (loading) {
    return (
      <div className={styles.wrapper}>
        <div className={styles.loadingContainer}>
          <div className={styles.spinner}></div>
          <div className={styles.loadingText}>Loading restaurants...</div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.wrapper}>
      {/* Header */}
      <header className={styles.header}>
        <div className={styles.headerContent}>
          <button 
            className={styles.backButton}
            onClick={() => navigate('/admin/dashboard')}
          >
            <svg className={styles.backIcon} viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clipRule="evenodd" />
            </svg>
            Back to Dashboard
          </button>
          <h1 className={styles.title}>Menu Items Management</h1>
        </div>
      </header>

      {/* Main Content */}
      <main className={styles.main}>
        {!selectedRestaurant ? (
          /* Restaurant Selection */
          <div className={styles.restaurantSelection}>
            <div className={styles.selectionHeader}>
              <h2 className={styles.selectionTitle}>Select a Restaurant</h2>
              <p className={styles.selectionSubtitle}>Choose a restaurant to manage its menu items</p>
            </div>
            <div className={styles.restaurantGrid}>
              {restaurants.map(restaurant => (
                <button
                  key={restaurant.id}
                  className={styles.restaurantCard}
                  onClick={() => handleRestaurantSelect(restaurant)}
                >
                  <div className={styles.restaurantCardContent}>
                    <div className={styles.restaurantIcon}>🏪</div>
                    <h3 className={styles.restaurantName}>{restaurant.name}</h3>
                    <div className={styles.restaurantCardArrow}>→</div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        ) : (
          /* Menu Items Management */
          <div className={styles.menuManagement}>
            {/* Restaurant Header */}
            <div className={styles.restaurantHeader}>
              <div className={styles.restaurantInfo}>
                <h2 className={styles.restaurantTitle}>{selectedRestaurant.name}</h2>
                <p className={styles.restaurantSubtitle}>Manage menu items and recipes</p>
              </div>
              <div className={styles.restaurantActions}>
                <button 
                  className={styles.changeRestaurantButton}
                  onClick={() => setSelectedRestaurant(null)}
                >
                  <svg className={styles.buttonIcon} viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clipRule="evenodd" />
                  </svg>
                  Change Restaurant
                </button>
                <button 
                  className={styles.addItemButton}
                  onClick={startAddItem}
                >
                  <svg className={styles.buttonIcon} viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
                  </svg>
                  Add Menu Item
                </button>
              </div>
            </div>

            {/* Add/Edit Form */}
            {showAddForm && (
              <div className={styles.formCard}>
                <div className={styles.formHeader}>
                  <div className={styles.formHeaderLeft}>
                    <h3 className={styles.formTitle}>
                      {editingItem ? '✏️ Edit Menu Item' : '✨ Add New Menu Item'}
                    </h3>
                    <p className={styles.formSubtitle}>
                      {editingItem ? 'Update the details and ingredients' : 'Create a new menu item with its recipe'}
                    </p>
                  </div>
                  <button className={styles.cancelButton} onClick={cancelForm}>
                    <svg className={styles.buttonIcon} viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                    Cancel
                  </button>
                </div>

                <div className={styles.formContent}>
                  {/* Basic Info Section */}
                  <div className={styles.formSection}>
                    <h4 className={styles.sectionTitle}>📋 Basic Information</h4>
                    <div className={styles.basicInfo}>
                      <div className={styles.formGroup}>
                        <label htmlFor="name" className={styles.label}>Menu Item Name</label>
                        <input
                          id="name"
                          name="name"
                          type="text"
                          value={formData.name}
                          onChange={handleFormChange}
                          placeholder="e.g., Caesar Salad"
                          className={styles.input}
                        />
                      </div>
                      <div className={styles.formGroup}>
                        <label htmlFor="price" className={styles.label}>Price ($)</label>
                        <input
                          id="price"
                          name="price"
                          type="number"
                          step="0.01"
                          value={formData.price}
                          onChange={handleFormChange}
                          placeholder="0.00"
                          className={styles.input}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Ingredients Section */}
                  <div className={styles.formSection}>
                    <div className={styles.sectionHeader}>
                      <h4 className={styles.sectionTitle}>🥬 Recipe Ingredients</h4>
                      <button className={styles.addIngredientButton} onClick={addIngredientRow}>
                        <svg className={styles.buttonIcon} viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
                        </svg>
                        Add Ingredient
                      </button>
                    </div>

                    {menuItemIngredients.length === 0 ? (
                      <div className={styles.emptyIngredients}>
                        <div className={styles.emptyIcon}>🍽️</div>
                        <p className={styles.emptyText}>No ingredients added yet</p>
                        <p className={styles.emptySubtext}>Click "Add Ingredient" to start building your recipe</p>
                      </div>
                    ) : (
                      <div className={styles.ingredientsGrid}>
                        {menuItemIngredients.map((ingredient, index) => (
                          <div key={ingredient.id} className={styles.ingredientCard}>
                            <div className={styles.ingredientHeader}>
                              <span className={styles.ingredientNumber}>#{index + 1}</span>
                              <button
                                className={styles.removeIngredientButton}
                                onClick={() => removeIngredientRow(index)}
                                title="Remove ingredient"
                              >
                                <svg viewBox="0 0 20 20" fill="currentColor">
                                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                                </svg>
                              </button>
                            </div>
                            
                            <div className={styles.ingredientContent}>
                              <div className={styles.formGroup}>
                                <label className={styles.label}>Ingredient</label>
                                <div className={styles.ingredientSearch}>
                                  <input
                                    type="text"
                                    value={ingredient.ingredient_search}
                                    onChange={(e) => handleIngredientSearch(index, e.target.value)}
                                    placeholder="Search or type ingredient name..."
                                    className={styles.input}
                                  />
                                  {filteredIngredients.length > 0 && (
                                    <div className={styles.searchResults}>
                                      {filteredIngredients.map(ing => (
                                        <div
                                          key={ing.id}
                                          className={styles.searchResult}
                                          onClick={() => selectIngredient(index, ing)}
                                        >
                                          <span className={styles.ingredientName}>{ing.name}</span>
                                          <span className={styles.ingredientUnit}>({ing.unit})</span>
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              </div>
                              
                              <div className={styles.formGroup}>
                                <label className={styles.label}>Quantity</label>
                                <input
                                  type="number"
                                  step="0.01"
                                  value={ingredient.quantity}
                                  onChange={(e) => handleIngredientChange(index, 'quantity', e.target.value)}
                                  placeholder="0"
                                  className={styles.input}
                                />
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    <div className={styles.formActions}>
                      <button 
                        className={styles.saveButton}
                        onClick={handleSubmit}
                        disabled={saving}
                      >
                        {saving ? (
                          <>
                            <div className={styles.spinner}></div>
                            Saving...
                          </>
                        ) : (
                          <>
                            <svg className={styles.buttonIcon} viewBox="0 0 20 20" fill="currentColor">
                              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                            </svg>
                            {editingItem ? 'Update Menu Item' : 'Save Menu Item'}
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Menu Items Table */}
            <div className={styles.menuItemsCard}>
              <div className={styles.cardHeader}>
                <h3 className={styles.cardTitle}>🍽️ Current Menu Items</h3>
                <span className={styles.itemCount}>{menuItems.length} items</span>
              </div>
              
              {menuItems.length === 0 ? (
                <div className={styles.emptyState}>
                  <div className={styles.emptyIcon}>🍽️</div>
                  <h4 className={styles.emptyTitle}>No menu items yet</h4>
                  <p className={styles.emptyText}>Start building your menu by adding your first item!</p>
                  <button className={styles.emptyAction} onClick={startAddItem}>
                    Add Your First Menu Item
                  </button>
                </div>
              ) : (
                <div className={styles.menuItemsTable}>
                  <div className={styles.tableHeader}>
                    <div className={styles.headerCell}>Name</div>
                    <div className={styles.headerCell}>Price</div>
                    <div className={styles.headerCell}>Cost</div>
                    <div className={styles.headerCell}>Margin</div>
                    <div className={styles.headerCell}>Actions</div>
                  </div>
                  
                  {menuItems.map(item => {
                    const margin = item.price > 0 ? ((item.price - item.cost) / item.price * 100) : 0;
                    
                    return (
                      <div key={item.id} className={styles.tableRow}>
                        <div className={styles.tableCell}>
                          <div className={styles.itemInfo}>
                            <span className={styles.itemName}>{item.name}</span>
                          </div>
                        </div>
                        <div className={styles.tableCell}>
                          <span className={styles.price}>${item.price.toFixed(2)}</span>
                        </div>
                        <div className={styles.tableCell}>
                          <span className={styles.cost}>${item.cost.toFixed(2)}</span>
                        </div>
                        <div className={styles.tableCell}>
                          <span className={`${styles.margin} ${margin > 30 ? styles.goodMargin : margin > 15 ? styles.okMargin : styles.lowMargin}`}>
                            {margin.toFixed(1)}%
                          </span>
                        </div>
                        <div className={styles.tableCell}>
                          <div className={styles.actionButtons}>
                            <button 
                              className={styles.editButton}
                              onClick={() => startEditItem(item)}
                              title="Edit menu item"
                            >
                              <svg viewBox="0 0 20 20" fill="currentColor">
                                <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                              </svg>
                            </button>
                            <button 
                              className={styles.deleteButton}
                              onClick={() => deleteMenuItem(item)}
                              title="Delete menu item"
                            >
                              <svg viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                              </svg>
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}