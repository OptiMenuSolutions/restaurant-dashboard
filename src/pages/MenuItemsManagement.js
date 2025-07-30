// File: src/pages/MenuItemsManagement.js
import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import supabase from '../supabaseClient';
import { calculateIngredientCost } from '../utils/unitConversions';
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
  const [menuItemComponents, setMenuItemComponents] = useState([]);
  const [filteredIngredients, setFilteredIngredients] = useState([]);
  const [activeSearchComponentIndex, setActiveSearchComponentIndex] = useState(null);
  const [activeSearchIngredientIndex, setActiveSearchIngredientIndex] = useState(null);
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
        .select(`
          *,
          menu_item_components (
            id,
            name,
            cost
          )
        `)
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

  // Component management functions
  function addComponentRow() {
    const newComponent = {
      id: Date.now(),
      name: '',
      ingredients: [],
      isNew: true
    };
    setMenuItemComponents(prev => [...prev, newComponent]);
  }

  function removeComponentRow(index) {
    setMenuItemComponents(prev => prev.filter((_, i) => i !== index));
  }

  function handleComponentChange(index, field, value) {
    setMenuItemComponents(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  }

  // Ingredient management functions within components
  function addIngredientToComponent(componentIndex) {
    const newIngredient = {
      id: Date.now(),
      ingredient_id: null,
      ingredient_search: '',
      quantity: '',
      isNew: true
    };
    
    setMenuItemComponents(prev => {
      const updated = [...prev];
      if (!updated[componentIndex].ingredients) {
        updated[componentIndex].ingredients = [];
      }
      updated[componentIndex].ingredients = [...updated[componentIndex].ingredients, newIngredient];
      return updated;
    });
  }

  function removeIngredientFromComponent(componentIndex, ingredientIndex) {
    setMenuItemComponents(prev => {
      const updated = [...prev];
      updated[componentIndex].ingredients = updated[componentIndex].ingredients.filter((_, i) => i !== ingredientIndex);
      return updated;
    });
  }

  function handleIngredientChange(componentIndex, ingredientIndex, field, value) {
    setMenuItemComponents(prev => {
      const updated = [...prev];
      updated[componentIndex].ingredients[ingredientIndex] = {
        ...updated[componentIndex].ingredients[ingredientIndex],
        [field]: value
      };
      return updated;
    });
  }

  function handleIngredientSearch(componentIndex, ingredientIndex, searchTerm) {
    handleIngredientChange(componentIndex, ingredientIndex, 'ingredient_search', searchTerm);
    setActiveSearchComponentIndex(componentIndex);
    setActiveSearchIngredientIndex(ingredientIndex);
    
    if (searchTerm.length > 1) {
      const filtered = ingredients.filter(ingredient =>
        ingredient.name.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredIngredients(filtered);
    } else {
      setFilteredIngredients([]);
      setActiveSearchComponentIndex(null);
      setActiveSearchIngredientIndex(null);
    }
  }

  function selectIngredient(componentIndex, ingredientIndex, ingredient) {
    handleIngredientChange(componentIndex, ingredientIndex, 'ingredient_id', ingredient.id);
    handleIngredientChange(componentIndex, ingredientIndex, 'ingredient_search', ingredient.name);
    setFilteredIngredients([]);
    setActiveSearchComponentIndex(null);
    setActiveSearchIngredientIndex(null);
  }

  function startAddItem() {
    setFormData({ name: '', price: '' });
    setMenuItemComponents([]);
    setShowAddForm(true);
    setEditingItem(null);
  }

  async function startEditItem(item) {
    setFormData({
      name: item.name,
      price: item.price.toString()
    });

    // Fetch existing components and their ingredients for this menu item
    try {
      const { data: existingComponents, error } = await supabase
        .from('menu_item_components')
        .select(`
          *,
          component_ingredients (
            *,
            ingredients:ingredient_id (
              id,
              name,
              unit
            )
          )
        `)
        .eq('menu_item_id', item.id);

      if (error) throw error;

      const formattedComponents = existingComponents.map(comp => ({
        id: comp.id,
        name: comp.name,
        isNew: false,
        ingredients: comp.component_ingredients.map(ing => ({
          id: ing.id,
          ingredient_id: ing.ingredient_id,
          ingredient_search: ing.ingredients?.name || '',
          quantity: ing.quantity.toString(),
          unit: ing.unit || 'each',
          isNew: false
        }))
      }));

      setMenuItemComponents(formattedComponents);
    } catch (error) {
      console.error('Error fetching menu item components:', error);
      setMenuItemComponents([]);
    }

    setEditingItem(item);
    setShowAddForm(true);
  }

  function cancelForm() {
    setShowAddForm(false);
    setEditingItem(null);
    setFormData({ name: '', price: '' });
    setMenuItemComponents([]);
    setFilteredIngredients([]);
    setActiveSearchComponentIndex(null);
    setActiveSearchIngredientIndex(null);
  }

  async function handleSubmit() {
    try {
      setSaving(true);

      // Validate form
      if (!formData.name || !formData.price) {
        alert('Please fill in menu item name and price');
        return;
      }

      if (menuItemComponents.length === 0) {
        alert('Please add at least one component');
        return;
      }

      // Validate components
      for (let component of menuItemComponents) {
        if (!component.name) {
          alert('Please name all components');
          return;
        }
        
        if (!component.ingredients || component.ingredients.length === 0) {
          alert(`Please add ingredients to the "${component.name}" component`);
          return;
        }

        // Create missing ingredients and validate
        for (let ingredient of component.ingredients) {
          if (!ingredient.quantity) {
            alert('Please enter quantity for all ingredients');
            return;
          }

          // If no ingredient_id but we have a search term, check if ingredient exists first
          if (!ingredient.ingredient_id && ingredient.ingredient_search) {
            console.log(`Checking for existing ingredient: ${ingredient.ingredient_search}`);
            
            // First, check if this ingredient already exists for this restaurant
            const { data: existingIngredient, error: checkError } = await supabase
              .from('ingredients')
              .select('id, name, unit, last_price')
              .eq('restaurant_id', selectedRestaurant.id)
              .ilike('name', ingredient.ingredient_search.trim())
              .single();

            if (!checkError && existingIngredient) {
              // Ingredient already exists, use it
              console.log('Found existing ingredient:', existingIngredient);
              ingredient.ingredient_id = existingIngredient.id;
              
              // Update the search term to match exactly
              ingredient.ingredient_search = existingIngredient.name;
            } else if (checkError && checkError.code === 'PGRST116') {
              // Ingredient doesn't exist, create it
              console.log(`Creating new ingredient: ${ingredient.ingredient_search}`);
              
              const { data: newIngredient, error: createError } = await supabase
                .from('ingredients')
                .insert({
                  restaurant_id: selectedRestaurant.id,
                  name: ingredient.ingredient_search.trim(),
                  unit: 'each', // Default unit - can be updated later via invoice processing
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

              console.log('Created ingredient:', newIngredient);
              ingredient.ingredient_id = newIngredient.id;
              
              // Add to local ingredients array so it shows up in future searches
              setIngredients(prev => [...prev, newIngredient]);
            } else {
              // Some other error occurred
              console.error('Error checking for existing ingredient:', checkError);
              alert('Error checking ingredients: ' + checkError.message);
              return;
            }
          }

          if (!ingredient.ingredient_id || !ingredient.quantity) {
            alert('Please complete all ingredient fields');
            return;
          }
        }
      }

      let menuItemId;

      if (editingItem) {
        // Update existing menu item
        console.log('Updating existing menu item:', editingItem.id);
        
        const { error: updateError } = await supabase
          .from('menu_items')
          .update({
            name: formData.name,
            price: parseFloat(formData.price)
          })
          .eq('id', editingItem.id);

        if (updateError) throw updateError;
        menuItemId = editingItem.id;

        // Delete existing components and their ingredients (cascade will handle component_ingredients)
        console.log('Deleting existing components for menu item:', menuItemId);
        const { error: deleteError } = await supabase
          .from('menu_item_components')
          .delete()
          .eq('menu_item_id', editingItem.id);

        if (deleteError) throw deleteError;
      } else {
        // Create new menu item
        console.log('Creating new menu item:', formData.name);
        
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
        console.log('Created menu item with ID:', menuItemId);
      }

      // Insert components and their ingredients
      for (let componentIndex = 0; componentIndex < menuItemComponents.length; componentIndex++) {
        const component = menuItemComponents[componentIndex];
        
        console.log(`Creating component ${componentIndex + 1}: ${component.name}`);
        
        // Insert component
        const { data: newComponent, error: componentError } = await supabase
          .from('menu_item_components')
          .insert({
            menu_item_id: menuItemId,
            name: component.name,
            cost: 0 // Will be calculated
          })
          .select()
          .single();

        if (componentError) {
          console.error('Component creation error:', componentError);
          throw componentError;
        }

        console.log('Created component with ID:', newComponent.id);

        // Insert ingredients for this component
        const ingredientsToInsert = component.ingredients.map(ing => ({
          component_id: newComponent.id,
          ingredient_id: ing.ingredient_id,
          quantity: parseFloat(ing.quantity),
          unit: ing.unit || 'each'
        }));

        console.log('Inserting component ingredients:', ingredientsToInsert);

        const { error: ingredientsError } = await supabase
          .from('component_ingredients')
          .insert(ingredientsToInsert);

        if (ingredientsError) {
          console.error('Component ingredients creation error:', ingredientsError);
          throw ingredientsError;
        }

        // Calculate and update component cost
        await calculateComponentCost(newComponent.id);
      }

      // Calculate and update menu item cost
      await calculateMenuItemCost(menuItemId);

      console.log('Menu item saved successfully');
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

  async function calculateComponentCost(componentId) {
    try {
      console.log('Calculating cost for component:', componentId);
      
      const { data: componentIngredients, error } = await supabase
        .from('component_ingredients')
        .select(`
          quantity,
          unit,
          ingredients:ingredient_id (
            name,
            last_price,
            unit
          )
        `)
        .eq('component_id', componentId);

      if (error) throw error;

      let totalCost = 0;
      componentIngredients.forEach(ing => {
        const recipeQuantity = ing.quantity;
        const recipeUnit = ing.unit;
        const ingredientCost = ing.ingredients?.last_price || 0;
        const invoiceUnit = ing.ingredients?.unit || 'each';
        const ingredientName = ing.ingredients?.name || '';

        if (ingredientCost > 0) {
          // Use unit conversion to calculate actual cost
          const cost = calculateIngredientCost(
            recipeQuantity,
            recipeUnit,
            ingredientCost,
            invoiceUnit,
            ingredientName
          );
          totalCost += cost;
        }
      });

      console.log(`Component ${componentId} total cost: ${totalCost}`);

      await supabase
        .from('menu_item_components')
        .update({ cost: totalCost })
        .eq('id', componentId);

    } catch (error) {
      console.error('Error calculating component cost:', error);
    }
  }

  async function calculateMenuItemCost(menuItemId) {
    try {
      console.log('Calculating cost for menu item:', menuItemId);
      
      const { data: components, error } = await supabase
        .from('menu_item_components')
        .select('cost')
        .eq('menu_item_id', menuItemId);

      if (error) throw error;

      const totalCost = components.reduce((sum, comp) => sum + (comp.cost || 0), 0);
      
      console.log(`Menu item ${menuItemId} total cost: $${totalCost}`);

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
      console.log('Deleting menu item:', item.id);
      
      // Components and their ingredients will be deleted by cascade
      const { error } = await supabase
        .from('menu_items')
        .delete()
        .eq('id', item.id);

      if (error) throw error;

      console.log('Menu item deleted successfully');
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
                <p className={styles.restaurantSubtitle}>Manage menu items and their components</p>
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
                      {editingItem ? 'Update the details and components' : 'Create a new menu item with its components'}
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

                  {/* Components Section */}
                  <div className={styles.formSection}>
                    <div className={styles.sectionHeader}>
                      <h4 className={styles.sectionTitle}>🧩 Menu Item Components</h4>
                      <button className={styles.addComponentButton} onClick={addComponentRow}>
                        <svg className={styles.buttonIcon} viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
                        </svg>
                        Add Component
                      </button>
                    </div>

                    {menuItemComponents.length === 0 ? (
                      <div className={styles.emptyComponents}>
                        <div className={styles.emptyIcon}>🧩</div>
                        <p className={styles.emptyText}>No components added yet</p>
                        <p className={styles.emptySubtext}>Click "Add Component" to start building your menu item</p>
                      </div>
                    ) : (
                      <div className={styles.componentsGrid}>
                        {menuItemComponents.map((component, componentIndex) => (
                          <div key={component.id} className={styles.componentCard}>
                            <div className={styles.componentHeader}>
                              <div className={styles.componentHeaderLeft}>
                                <span className={styles.componentNumber}>Component #{componentIndex + 1}</span>
                                <input
                                  type="text"
                                  value={component.name}
                                  onChange={(e) => handleComponentChange(componentIndex, 'name', e.target.value)}
                                  placeholder="e.g., Caesar Dressing, Grilled Chicken..."
                                  className={`${styles.input} ${styles.componentNameInput}`}
                                />
                              </div>
                              <button
                                className={styles.removeComponentButton}
                                onClick={() => removeComponentRow(componentIndex)}
                                title="Remove component"
                              >
                                <svg viewBox="0 0 20 20" fill="currentColor">
                                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                                </svg>
                              </button>
                            </div>

                            <div className={styles.componentContent}>
                              <div className={styles.ingredientsHeader}>
                                <h5 className={styles.ingredientsTitle}>🥬 Ingredients</h5>
                                <button 
                                  className={styles.addIngredientButton}
                                  onClick={() => addIngredientToComponent(componentIndex)}
                                >
                                  <svg className={styles.buttonIcon} viewBox="0 0 16 16" fill="currentColor">
                                    <path fillRule="evenodd" d="M8 2a1 1 0 011 1v4h4a1 1 0 110 2H9v4a1 1 0 11-2 0V9H3a1 1 0 110-2h4V3a1 1 0 011-1z" clipRule="evenodd" />
                                  </svg>
                                  Add Ingredient
                                </button>
                              </div>

                              {(!component.ingredients || component.ingredients.length === 0) ? (
                                <div className={styles.emptyIngredients}>
                                  <p className={styles.emptyIngredientsText}>No ingredients added</p>
                                </div>
                              ) : (
                                <div className={styles.ingredientsList}>
                                  {component.ingredients.map((ingredient, ingredientIndex) => (
                                    <div key={ingredient.id} className={styles.ingredientRow}>
                                      <div className={styles.ingredientFields}>
                                        <div className={styles.ingredientSearch}>
                                          <input
                                            type="text"
                                            value={ingredient.ingredient_search}
                                            onChange={(e) => handleIngredientSearch(componentIndex, ingredientIndex, e.target.value)}
                                            placeholder="Search or type ingredient name..."
                                            className={styles.ingredientInput}
                                          />
                                          {filteredIngredients.length > 0 && 
                                           activeSearchComponentIndex === componentIndex && 
                                           activeSearchIngredientIndex === ingredientIndex && (
                                            <div className={styles.searchResults}>
                                              {filteredIngredients.map(ing => (
                                                <div
                                                  key={ing.id}
                                                  className={styles.searchResult}
                                                  onClick={() => selectIngredient(componentIndex, ingredientIndex, ing)}
                                                >
                                                  <span className={styles.ingredientName}>{ing.name}</span>
                                                  <span className={styles.ingredientUnit}>({ing.unit})</span>
                                                  <span className={styles.ingredientPrice}>
                                                    ${ing.last_price?.toFixed(2) || '0.00'}
                                                  </span>
                                                </div>
                                              ))}
                                            </div>
                                          )}
                                        </div>
                                        
                                        <input
                                          type="number"
                                          step="0.01"
                                          value={ingredient.quantity}
                                          onChange={(e) => handleIngredientChange(componentIndex, ingredientIndex, 'quantity', e.target.value)}
                                          placeholder="Qty"
                                          className={styles.quantityInput}
                                        />

                                        <select
                                          value={ingredient.unit || ''}
                                          onChange={(e) => handleIngredientChange(componentIndex, ingredientIndex, 'unit', e.target.value)}
                                          className={styles.unitSelect}
                                        >
                                          <option value="">Unit</option>
                                          <option value="g">grams (g)</option>
                                          <option value="oz">ounces (oz)</option>
                                          <option value="lbs">pounds (lbs)</option>
                                          <option value="kg">kilograms (kg)</option>
                                          <option value="ml">milliliters (ml)</option>
                                          <option value="fl oz">fluid ounces (fl oz)</option>
                                          <option value="cups">cups</option>
                                          <option value="tbsp">tablespoons (tbsp)</option>
                                          <option value="tsp">teaspoons (tsp)</option>
                                          <option value="each">each</option>
                                          <option value="cloves">cloves</option>
                                          <option value="pieces">pieces</option>
                                        </select>
                                      </div>
                                      
                                      <button
                                        className={styles.removeIngredientButton}
                                        onClick={() => removeIngredientFromComponent(componentIndex, ingredientIndex)}
                                        title="Remove ingredient"
                                      >
                                        <svg viewBox="0 0 16 16" fill="currentColor">
                                          <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L8 6.586l2.293-2.293a1 1 0 111.414 1.414L9.414 8l2.293 2.293a1 1 0 01-1.414 1.414L8 9.414l-2.293 2.293a1 1 0 01-1.414-1.414L6.586 8 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                                        </svg>
                                      </button>
                                    </div>
                                  ))}
                                </div>
                              )}
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
                    <div className={styles.headerCell}>Components</div>
                    <div className={styles.headerCell}>Price</div>
                    <div className={styles.headerCell}>Cost</div>
                    <div className={styles.headerCell}>Margin</div>
                    <div className={styles.headerCell}>Actions</div>
                  </div>
                  
                  {menuItems.map(item => {
                    const margin = item.price > 0 ? ((item.price - item.cost) / item.price * 100) : 0;
                    const componentCount = item.menu_item_components?.length || 0;
                    
                    return (
                      <div key={item.id} className={styles.tableRow}>
                        <div className={styles.tableCell}>
                          <div className={styles.itemInfo}>
                            <span className={styles.itemName}>{item.name}</span>
                          </div>
                        </div>
                        <div className={styles.tableCell}>
                          <div className={styles.componentsBadge}>
                            <span className={styles.componentsCount}>{componentCount}</span>
                            <span className={styles.componentsLabel}>
                              {componentCount === 1 ? 'component' : 'components'}
                            </span>
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