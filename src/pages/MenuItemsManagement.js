// File: src/pages/MenuItemsManagement.js
import React, { useState, useEffect } from 'react';
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

  async function fetchMenuItems() {
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
  }

  async function fetchIngredients() {
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
  }

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

      // Validate ingredients
      for (let ingredient of menuItemIngredients) {
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

      if (ingredientsError) throw ingredientsError;

      // Calculate and update menu item cost
      await calculateMenuItemCost(menuItemId);

      alert(editingItem ? 'Menu item updated successfully!' : 'Menu item added successfully!');
      cancelForm();
      fetchMenuItems();

    } catch (error) {
      console.error('Error saving menu item:', error);
      alert('Failed to save menu item');
    } finally {
      setSaving(false);
    }
  }

  async function calculateMenuItemCost(menuItemId) {
    try {
      // Get ingredients with their costs
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

      // Update menu item cost
      await supabase
        .from('menu_items')
        .update({ cost: totalCost })
        .eq('id', menuItemId);

    } catch (error) {
      console.error('Error calculating menu item cost:', error);
    }
  }

  async function deleteMenuItem(item) {
    if (!confirm(`Are you sure you want to delete "${item.name}"?`)) return;

    try {
      // Delete ingredients first
      await supabase
        .from('menu_item_ingredients')
        .delete()
        .eq('menu_item_id', item.id);

      // Delete menu item
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
        <div className={styles.loading}>Loading restaurants...</div>
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
            ← Back to Dashboard
          </button>
          <h1 className={styles.title}>Menu Items Management</h1>
        </div>
      </header>

      {/* Main Content */}
      <main className={styles.main}>
        {!selectedRestaurant ? (
          /* Restaurant Selection */
          <div className={styles.restaurantSelection}>
            <h2 className={styles.selectionTitle}>Select a Restaurant</h2>
            <div className={styles.restaurantGrid}>
              {restaurants.map(restaurant => (
                <button
                  key={restaurant.id}
                  className={styles.restaurantCard}
                  onClick={() => handleRestaurantSelect(restaurant)}
                >
                  <div className={styles.restaurantIcon}>🏪</div>
                  <h3 className={styles.restaurantName}>{restaurant.name}</h3>
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
                <p className={styles.restaurantSubtitle}>Menu Items Management</p>
              </div>
              <div className={styles.restaurantActions}>
                <button 
                  className={styles.changeRestaurantButton}
                  onClick={() => setSelectedRestaurant(null)}
                >
                  Change Restaurant
                </button>
                <button 
                  className={styles.addItemButton}
                  onClick={startAddItem}
                >
                  + Add Menu Item
                </button>
              </div>
            </div>

            {/* Add/Edit Form */}
            {showAddForm && (
              <div className={styles.formSection}>
                <div className={styles.formHeader}>
                  <h3 className={styles.formTitle}>
                    {editingItem ? 'Edit Menu Item' : 'Add New Menu Item'}
                  </h3>
                  <button className={styles.cancelButton} onClick={cancelForm}>
                    Cancel
                  </button>
                </div>

                <div className={styles.formContent}>
                  {/* Basic Info */}
                  <div className={styles.basicInfo}>
                    <div className={styles.formGroup}>
                      <label htmlFor="name">Menu Item Name</label>
                      <input
                        id="name"
                        name="name"
                        type="text"
                        value={formData.name}
                        onChange={handleFormChange}
                        placeholder="Enter menu item name"
                      />
                    </div>
                    <div className={styles.formGroup}>
                      <label htmlFor="price">Price ($)</label>
                      <input
                        id="price"
                        name="price"
                        type="number"
                        step="0.01"
                        value={formData.price}
                        onChange={handleFormChange}
                        placeholder="0.00"
                      />
                    </div>
                  </div>

                  {/* Ingredients */}
                  <div className={styles.ingredientsSection}>
                    <div className={styles.ingredientsHeader}>
                      <h4 className={styles.ingredientsTitle}>Recipe Ingredients</h4>
                      <button className={styles.addIngredientButton} onClick={addIngredientRow}>
                        + Add Ingredient
                      </button>
                    </div>

                    <div className={styles.ingredientsTable}>
                      <div className={styles.ingredientsTableHeader}>
                        <div>Ingredient</div>
                        <div>Quantity Used</div>
                        <div>Action</div>
                      </div>

                      {menuItemIngredients.map((ingredient, index) => (
                        <div key={ingredient.id} className={styles.ingredientRow}>
                          <div className={styles.ingredientCell}>
                            <div className={styles.ingredientSearch}>
                              <input
                                type="text"
                                value={ingredient.ingredient_search}
                                onChange={(e) => handleIngredientSearch(index, e.target.value)}
                                placeholder="Search ingredients..."
                              />
                              {filteredIngredients.length > 0 && (
                                <div className={styles.searchResults}>
                                  {filteredIngredients.map(ing => (
                                    <div
                                      key={ing.id}
                                      className={styles.searchResult}
                                      onClick={() => selectIngredient(index, ing)}
                                    >
                                      {ing.name} ({ing.unit})
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                          <div className={styles.ingredientCell}>
                            <input
                              type="number"
                              step="0.01"
                              value={ingredient.quantity}
                              onChange={(e) => handleIngredientChange(index, 'quantity', e.target.value)}
                              placeholder="0"
                            />
                          </div>
                          <div className={styles.ingredientCell}>
                            <button
                              className={styles.removeIngredientButton}
                              onClick={() => removeIngredientRow(index)}
                            >
                              Remove
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>

                    <button 
                      className={styles.saveButton}
                      onClick={handleSubmit}
                      disabled={saving}
                    >
                      {saving ? 'Saving...' : (editingItem ? 'Update Menu Item' : 'Save Menu Item')}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Menu Items Table */}
            <div className={styles.menuItemsSection}>
              <h3 className={styles.menuItemsTitle}>Current Menu Items</h3>
              
              {menuItems.length === 0 ? (
                <div className={styles.emptyState}>
                  <div className={styles.emptyIcon}>🍽️</div>
                  <p className={styles.emptyText}>No menu items yet. Add your first menu item!</p>
                </div>
              ) : (
                <div className={styles.menuItemsTable}>
                  <div className={styles.tableHeader}>
                    <div>Name</div>
                    <div>Price</div>
                    <div>Cost</div>
                    <div>Margin</div>
                    <div>Actions</div>
                  </div>
                  
                  {menuItems.map(item => {
                    const margin = item.price > 0 ? ((item.price - item.cost) / item.price * 100) : 0;
                    
                    return (
                      <div key={item.id} className={styles.tableRow}>
                        <div className={styles.tableCell}>
                          <span className={styles.itemName}>{item.name}</span>
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
                          <button 
                            className={styles.editButton}
                            onClick={() => startEditItem(item)}
                          >
                            Edit
                          </button>
                          <button 
                            className={styles.deleteButton}
                            onClick={() => deleteMenuItem(item)}
                          >
                            Delete
                          </button>
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