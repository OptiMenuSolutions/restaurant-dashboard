// File: src/pages/InvoiceEditor.js
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import supabase from '../supabaseClient';
import { standardizeInvoiceItem, calculateStandardizedCost, validateUnit } from '../utils/standardizedUnits';
import styles from './InvoiceEditor.module.css';

export default function InvoiceEditor() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [invoice, setInvoice] = useState(null);
  const [restaurant, setRestaurant] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  // Invoice details form
  const [invoiceDetails, setInvoiceDetails] = useState({
    number: '',
    date: '',
    supplier: '',
    amount: ''
  });
  
  // Invoice items
  const [invoiceItems, setInvoiceItems] = useState([]);
  const [ingredients, setIngredients] = useState([]);
  const [filteredIngredients, setFilteredIngredients] = useState([]);
  
  useEffect(() => {
    if (id) {
      fetchInvoiceData();
    }
  }, [id]);

  async function fetchInvoiceData() {
    try {
      // Get invoice data
      const { data: invoiceData, error: invoiceError } = await supabase
        .from('invoices')
        .select('*')
        .eq('id', id)
        .single();

      if (invoiceError) throw invoiceError;
      setInvoice(invoiceData);

      // Get restaurant data
      const { data: restaurantData, error: restaurantError } = await supabase
        .from('restaurants')
        .select('*')
        .eq('id', invoiceData.restaurant_id)
        .single();

      if (restaurantError) throw restaurantError;
      setRestaurant(restaurantData);

      // Pre-fill form if data exists
      setInvoiceDetails({
        number: invoiceData.number || '',
        date: invoiceData.date || '',
        supplier: invoiceData.supplier || '',
        amount: invoiceData.amount || ''
      });

      // Get existing invoice items
      const { data: existingItems, error: itemsError } = await supabase
        .from('invoice_items')
        .select('*')
        .eq('invoice_id', id);

      if (itemsError) throw itemsError;
      setInvoiceItems(existingItems || []);

      // Get ingredients for this restaurant
      const { data: ingredientsData, error: ingredientsError } = await supabase
        .from('ingredients')
        .select('*')
        .eq('restaurant_id', invoiceData.restaurant_id)
        .order('name');

      if (ingredientsError) throw ingredientsError;
      setIngredients(ingredientsData || []);

    } catch (error) {
      console.error('Error fetching invoice data:', error);
      alert('Failed to load invoice data');
    } finally {
      setLoading(false);
    }
  }

  function handleInvoiceDetailsChange(e) {
    const { name, value } = e.target;
    setInvoiceDetails(prev => ({
      ...prev,
      [name]: value
    }));
  }

  function addInvoiceItem() {
    const newItem = {
      id: Date.now(), // Temporary ID for new items
      item_name: '',
      quantity: '',
      unit: '',
      amount: '',
      unit_cost: 0,
      ingredient_id: null,
      ingredient_search: '',
      isNew: true
    };
    setInvoiceItems(prev => [...prev, newItem]);
  }

  function removeInvoiceItem(index) {
    setInvoiceItems(prev => prev.filter((_, i) => i !== index));
  }

  function handleItemChange(index, field, value) {
    setInvoiceItems(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      
      // Calculate unit_cost when amount or quantity changes
      if (field === 'amount' || field === 'quantity') {
        const amount = parseFloat(updated[index].amount) || 0;
        const quantity = parseFloat(updated[index].quantity) || 0;
        updated[index].unit_cost = quantity > 0 ? amount / quantity : 0;
      }
      
      return updated;
    });
  }

  function handleIngredientSearch(index, searchTerm) {
    handleItemChange(index, 'ingredient_search', searchTerm);
    
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
    handleItemChange(index, 'ingredient_id', ingredient.id);
    handleItemChange(index, 'ingredient_search', ingredient.name);
    setFilteredIngredients([]);
  }

  async function handleSubmit() {
    try {
      setSaving(true);
      console.log('\n🚀 Starting invoice save process...');

      // Validate basic invoice details
      if (!invoiceDetails.number || !invoiceDetails.date || !invoiceDetails.supplier || !invoiceDetails.amount) {
        alert('Please fill in all invoice details');
        return;
      }

      if (invoiceItems.length === 0) {
        alert('Please add at least one invoice item');
        return;
      }

      console.log(`📋 Processing ${invoiceItems.length} invoice items...`);

      // Validate all items before processing
      for (let i = 0; i < invoiceItems.length; i++) {
        const item = invoiceItems[i];
        
        if (!item.item_name || !item.unit || !item.quantity || !item.amount) {
          alert(`Please complete all fields for item ${i + 1}: ${item.item_name || 'Unnamed item'}`);
          return;
        }

        // Validate unit
        const unitValidation = validateUnit(item.unit);
        if (!unitValidation.valid) {
          alert(`Invalid unit "${item.unit}" for item "${item.item_name}". ${unitValidation.message}`);
          return;
        }

        console.log(`✅ Item ${i + 1} validation passed: ${item.item_name} (${item.quantity} ${item.unit})`);
      }

      // Update invoice details first
      console.log('📝 Updating invoice details...');
      const { error: invoiceUpdateError } = await supabase
        .from('invoices')
        .update({
          number: invoiceDetails.number,
          date: invoiceDetails.date,
          supplier: invoiceDetails.supplier,
          amount: parseFloat(invoiceDetails.amount)
        })
        .eq('id', id);

      if (invoiceUpdateError) {
        console.error('Failed to update invoice:', invoiceUpdateError);
        alert('Failed to update invoice: ' + invoiceUpdateError.message);
        return;
      }

      console.log('✅ Invoice details updated successfully');

      // STANDARDIZATION PROCESS: Convert all invoice items to standard units
      console.log('\n🔄 Starting ingredient standardization process...');
      
      const processedItems = [];
      const affectedMenuItems = new Map();

      for (let i = 0; i < invoiceItems.length; i++) {
        const item = invoiceItems[i];
        
        console.log(`\n📦 Processing item ${i + 1}/${invoiceItems.length}: ${item.item_name}`);
        
        // Standardize the invoice item
        const standardized = standardizeInvoiceItem(
          item.item_name,
          parseFloat(item.amount),
          parseFloat(item.quantity),
          item.unit
        );

        // Handle standardization failure gracefully
        if (!standardized.success && !standardized.fallback) {
          console.error(`❌ Critical standardization failure for ${item.item_name}`);
          alert(`Cannot process "${item.item_name}": ${standardized.error}\n\nPlease check the unit "${item.unit}" and try again.`);
          return;
        }

        if (standardized.fallback) {
          console.warn(`⚠️ Using fallback standardization for ${item.item_name}`);
        }

        // Find or create ingredient
        let ingredientId = item.ingredient_id;
        let existingIngredient = null;
        
        if (!ingredientId) {
          console.log(`🔍 Looking for existing ingredient: ${item.item_name}`);
          
          // Look for existing ingredient with same name (case-insensitive)
          const { data: foundIngredient, error: checkError } = await supabase
            .from('ingredients')
            .select('id, name, unit, last_price')
            .eq('restaurant_id', restaurant.id)
            .ilike('name', item.item_name.trim())
            .maybeSingle(); // Use maybeSingle to avoid errors when not found

          if (checkError) {
            console.error('Error checking for existing ingredient:', checkError);
            alert('Error checking ingredients: ' + checkError.message);
            return;
          }

          if (foundIngredient) {
            ingredientId = foundIngredient.id;
            existingIngredient = foundIngredient;
            console.log(`✅ Found existing ingredient: ${foundIngredient.name} (ID: ${foundIngredient.id})`);
          } else {
            // Create new ingredient with standardized unit
            console.log(`🆕 Creating new ingredient: ${item.item_name}`);
            
            const { data: newIngredient, error: createError } = await supabase
              .from('ingredients')
              .insert({
                restaurant_id: restaurant.id,
                name: item.item_name.trim(),
                unit: standardized.standardUnit,
                last_price: standardized.standardCost,
                last_ordered_at: invoiceDetails.date
              })
              .select()
              .single();

            if (createError) {
              console.error('Failed to create ingredient:', createError);
              alert('Failed to create ingredient: ' + createError.message);
              return;
            }

            ingredientId = newIngredient.id;
            existingIngredient = newIngredient;
            console.log(`✅ Created ingredient: ${newIngredient.name} (ID: ${newIngredient.id})`);
            
            // Add to local ingredients array
            setIngredients(prev => [...prev, newIngredient]);
          }
        } else {
          // Get existing ingredient data
          const foundIngredient = ingredients.find(ing => ing.id === ingredientId);
          if (foundIngredient) {
            existingIngredient = foundIngredient;
            console.log(`✅ Using linked ingredient: ${foundIngredient.name} (ID: ${foundIngredient.id})`);
          }
        }

        // Collect affected menu items BEFORE updating ingredient prices
        console.log(`🔍 Finding menu items that use ingredient ID: ${ingredientId}`);
        const { data: componentsUsingIngredient, error: componentsError } = await supabase
          .from('component_ingredients')
          .select(`
            quantity,
            unit,
            component_id,
            menu_item_components!inner(
              id,
              menu_item_id,
              menu_items!inner(
                id,
                name,
                cost,
                restaurant_id
              )
            )
          `)
          .eq('ingredient_id', ingredientId);

        if (componentsError) {
          console.error('Error finding affected menu items:', componentsError);
        } else if (componentsUsingIngredient && componentsUsingIngredient.length > 0) {
          console.log(`📊 Found ${componentsUsingIngredient.length} menu item components using this ingredient`);
          
          componentsUsingIngredient.forEach(record => {
            const menuItem = record.menu_item_components.menu_items;
            if (!affectedMenuItems.has(menuItem.id)) {
              affectedMenuItems.set(menuItem.id, {
                id: menuItem.id,
                name: menuItem.name,
                oldCost: menuItem.cost,
                restaurant_id: menuItem.restaurant_id
              });
              console.log(`📝 Will recalculate: "${menuItem.name}" (current cost: $${menuItem.cost.toFixed(4)})`);
            }
          });
        } else {
          console.log(`ℹ️ No menu items currently use ingredient: ${item.item_name}`);
        }

        // Update ingredient with standardized data
        console.log(`💾 Updating ingredient with standardized data...`);
        console.log(`   - Unit: ${existingIngredient?.unit || 'unknown'} → ${standardized.standardUnit}`);
        console.log(`   - Price: $${existingIngredient?.last_price || 0} → $${standardized.standardCost.toFixed(4)}`);
        
        const { error: updateError } = await supabase
          .from('ingredients')
          .update({
            unit: standardized.standardUnit,
            last_price: standardized.standardCost,
            last_ordered_at: invoiceDetails.date
          })
          .eq('id', ingredientId);

        if (updateError) {
          console.error('Failed to update ingredient:', updateError);
          alert(`Failed to update ingredient "${item.item_name}": ${updateError.message}`);
          return;
        }

        console.log(`✅ Updated ingredient: ${item.item_name} → $${standardized.standardCost.toFixed(4)}/${standardized.standardUnit}`);
        
        processedItems.push({
          ...item,
          ingredient_id: ingredientId,
          standardized
        });
      }

      // Debug: Show collected affected menu items
      console.log(`\n🔍 DEBUGGING: Collected ${affectedMenuItems.size} affected menu items:`);
      for (const [id, info] of affectedMenuItems) {
        console.log(`  - ${info.name} (ID: ${id}) - Current cost: $${info.oldCost}`);
      }

      // Delete existing invoice items
      console.log('\n🗑️ Cleaning up old invoice items...');
      const { error: deleteError } = await supabase
        .from('invoice_items')
        .delete()
        .eq('invoice_id', id);

      if (deleteError) {
        console.error('Failed to delete old items:', deleteError);
        alert('Failed to delete old items: ' + deleteError.message);
        return;
      }

      // Insert new invoice items (keep original invoice data for records)
      console.log('💾 Inserting updated invoice items...');
      const itemsToInsert = processedItems.map((item, index) => ({
        invoice_id: id,
        item_name: item.item_name || '',
        quantity: parseFloat(item.quantity) || 0,
        unit: item.unit || '', // Keep original invoice unit for records
        amount: parseFloat(item.amount) || 0,
        unit_cost: parseFloat(item.unit_cost) || 0, // Keep original unit cost for records
        ingredient_id: item.ingredient_id || null
      }));

      const { error: insertError } = await supabase
        .from('invoice_items')
        .insert(itemsToInsert);

      if (insertError) {
        console.error('Failed to insert items:', insertError);
        alert('Failed to insert items: ' + insertError.message);
        return;
      }

      console.log(`✅ Inserted ${itemsToInsert.length} invoice items`);

      // Recalculate costs for affected menu items using standardized units
      if (affectedMenuItems.size > 0) {
        console.log(`\n🔄 Recalculating costs for ${affectedMenuItems.size} affected menu items...`);

        // Store cost changes for history tracking (keyed by menu item ID)
        const costChanges = new Map();

        for (const [menuItemId, menuItemInfo] of affectedMenuItems) {
          console.log(`\n📊 Recalculating: "${menuItemInfo.name}"`);
          
          const { data: components, error: componentsError } = await supabase
            .from('menu_item_components')
            .select(`
              id,
              name,
              component_ingredients (
                quantity,
                unit,
                ingredients:ingredient_id (
                  id,
                  name,
                  last_price,
                  unit
                )
              )
            `)
            .eq('menu_item_id', menuItemId);

          if (componentsError) {
            console.error(`Error fetching components for menu item ${menuItemId}:`, componentsError);
            continue;
          }

          if (!components || components.length === 0) {
            console.log(`⚠️ No components found for menu item: ${menuItemInfo.name}`);
            continue;
          }

          let newMenuItemCost = 0;

          for (const component of components) {
            let componentCost = 0;
            console.log(`  🧩 Component: ${component.name}`);
            
            if (!component.component_ingredients || component.component_ingredients.length === 0) {
              console.log(`    ⚠️ No ingredients in component: ${component.name}`);
              continue;
            }

            component.component_ingredients.forEach(ing => {
              const ingredient = ing.ingredients;
              const ingredientCost = ingredient?.last_price || 0;
              const ingredientName = ingredient?.name || 'Unknown';
              const recipeQuantity = ing.quantity;
              const recipeUnit = ing.unit;

              console.log(`    🥬 ${ingredientName}: ${recipeQuantity} ${recipeUnit} @ $${ingredientCost}/${ingredient?.unit || 'unit'}`);

              if (ingredientCost > 0) {
                try {
                  const cost = calculateStandardizedCost(
                    recipeQuantity,
                    recipeUnit,
                    ingredientCost,
                    ingredientName
                  );
                  componentCost += cost;
                  
                  console.log(`      💰 Cost: $${cost.toFixed(4)}`);
                } catch (error) {
                  console.warn(`      ⚠️ Cost calculation failed for ${ingredientName}:`, error.message);
                  // Fallback to simple multiplication
                  const fallbackCost = recipeQuantity * ingredientCost;
                  componentCost += fallbackCost;
                  console.log(`      💰 Fallback cost: $${fallbackCost.toFixed(4)}`);
                }
              } else {
                console.log(`      ℹ️ No cost data available`);
              }
            });

            console.log(`  📊 Component "${component.name}" total cost: $${componentCost.toFixed(4)}`);

            // Update component cost
            await supabase
              .from('menu_item_components')
              .update({ cost: componentCost })
              .eq('id', component.id);

            newMenuItemCost += componentCost;
          }

          console.log(`📊 Menu item "${menuItemInfo.name}" total cost: $${newMenuItemCost.toFixed(4)} (was $${menuItemInfo.oldCost.toFixed(4)})`);

          // Update menu item cost
          await supabase
            .from('menu_items')
            .update({ cost: newMenuItemCost })
            .eq('id', menuItemId);

          // Store cost change for history tracking
          // ALWAYS track cost changes, even small ones, when processing invoices
          if (menuItemInfo.oldCost !== newMenuItemCost) {
            const changeAmount = newMenuItemCost - menuItemInfo.oldCost;
            const changePercent = menuItemInfo.oldCost > 0 ? (changeAmount / menuItemInfo.oldCost * 100) : 0;
            
            console.log(`📈 Cost change: ${changeAmount >= 0 ? '+' : ''}$${changeAmount.toFixed(4)} (${changePercent >= 0 ? '+' : ''}${changePercent.toFixed(1)}%)`);
            
            costChanges.set(menuItemId, {
              menuItemId: menuItemId,
              menuItemName: menuItemInfo.name,
              oldCost: menuItemInfo.oldCost,
              newCost: newMenuItemCost,
              changeAmount: changeAmount,
              changePercent: changePercent,
              restaurantId: menuItemInfo.restaurant_id
            });
          } else {
            console.log(`📊 No cost change for ${menuItemInfo.name}`);
          }
        }

        // ENHANCED Process cost history entries by invoice date
        if (costChanges.size > 0) {
          console.log(`\n📝 Processing cost history for ${costChanges.size} menu items on invoice date: ${invoiceDetails.date}`);
          console.log(`📝 DEBUG: costChanges Map contents:`, Array.from(costChanges.entries()));
          
          for (const [menuItemId, costChange] of costChanges) {
            console.log(`\n🔍 Processing cost change for ${costChange.menuItemName}`);
            console.log(`🔍 menuItemId = ${menuItemId}`);
            console.log(`🔍 costChange object:`, costChange);
            
            try {
              // Create the timestamp for the invoice date (use current time for uniqueness)
              const now = new Date();
              const invoiceDate = new Date(invoiceDetails.date);
              const invoiceTimestamp = new Date(
                invoiceDate.getFullYear(),
                invoiceDate.getMonth(),
                invoiceDate.getDate(),
                now.getHours(),
                now.getMinutes(),
                now.getSeconds(),
                now.getMilliseconds()
              ).toISOString();
              
              console.log(`📅 Using timestamp: ${invoiceTimestamp}`);
              
              // Always create a new history entry for invoice processing
              console.log(`📝 Creating new cost history entry for ${costChange.menuItemName} on ${invoiceDetails.date}`);
              console.log(`   Cost change: $${costChange.oldCost.toFixed(4)} → $${costChange.newCost.toFixed(4)}`);
              
              const historyEntry = {
                menu_item_id: menuItemId,
                menu_item_name: costChange.menuItemName,
                old_cost: Number(costChange.oldCost.toFixed(4)),
                new_cost: Number(costChange.newCost.toFixed(4)),
                change_reason: 'invoice_saved',
                restaurant_id: costChange.restaurantId,
                created_at: invoiceTimestamp
              };
              
              console.log(`📝 Inserting history entry:`, historyEntry);
              
              const { data: insertedHistory, error: insertError } = await supabase
                .from('menu_item_cost_history')
                .insert(historyEntry)
                .select()
                .single();

              if (insertError) {
                console.error('❌ Failed to create cost history:', insertError);
                console.error('❌ Insert error details:', {
                  code: insertError.code,
                  message: insertError.message,
                  details: insertError.details,
                  hint: insertError.hint
                });
                console.error('❌ Data being inserted:', historyEntry);
                
                // Try to continue with other entries instead of stopping
                continue;
              } else {
                console.log(`✅ Created cost history for ${costChange.menuItemName}:`, insertedHistory);
              }
            } catch (historyError) {
              console.error(`❌ Unexpected error processing cost history for ${costChange.menuItemName}:`, historyError);
              // Continue with other entries
              continue;
            }
          }
        } else {
          console.log(`\n❌ DEBUG: No cost changes detected! costChanges.size = ${costChanges.size}`);
          console.log(`❌ DEBUG: affectedMenuItems.size = ${affectedMenuItems.size}`);
          console.log(`❌ DEBUG: affectedMenuItems contents:`, Array.from(affectedMenuItems.entries()));
        }

        console.log(`✅ Recalculated costs for all affected menu items`);
      } else {
        console.log(`ℹ️ No menu items were affected by this invoice`);
      }

      console.log('\n🎉 Invoice processing completed successfully!');
      
      // Show success message with summary
      const summaryMessage = [
        'Invoice saved successfully!',
        '',
        `✅ Processed ${processedItems.length} items`,
        `✅ Updated ${processedItems.length} ingredients with standardized units`,
        `✅ Recalculated costs for ${affectedMenuItems.size} menu items`,
        '',
        'All ingredients have been standardized and menu item costs updated.'
      ].join('\n');
      
      alert(summaryMessage);
      navigate('/admin/pending-invoices');

    } catch (error) {
      console.error('\n❌ Unexpected error during invoice save:', error);
      alert('Unexpected error: ' + error.message + '\n\nCheck the console for detailed error information.');
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className={styles.wrapper}>
        <div className={styles.loading}>Loading invoice...</div>
      </div>
    );
  }

  if (!invoice) {
    return (
      <div className={styles.wrapper}>
        <div className={styles.error}>Invoice not found</div>
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
            onClick={() => navigate('/admin/pending-invoices')}
          >
            ← Back to Pending Invoices
          </button>
          <h1 className={styles.title}>
            Invoice Editor - {restaurant?.name}
          </h1>
          <button 
            className={styles.saveButton}
            onClick={handleSubmit}
            disabled={saving}
          >
            {saving ? 'Saving...' : 'Save Invoice'}
          </button>
        </div>
      </header>

      {/* Main Content - Split Screen */}
      <main className={styles.main}>
        {/* Left Panel - Invoice Form */}
        <div className={styles.leftPanel}>
          {/* Invoice Details */}
          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>Invoice Details</h2>
            <div className={styles.formGrid}>
              <div className={styles.formGroup}>
                <label htmlFor="number">Invoice Number</label>
                <input
                  id="number"
                  name="number"
                  type="text"
                  value={invoiceDetails.number}
                  onChange={handleInvoiceDetailsChange}
                  placeholder="Enter invoice number"
                />
              </div>
              
              <div className={styles.formGroup}>
                <label htmlFor="date">Invoice Date</label>
                <input
                  id="date"
                  name="date"
                  type="date"
                  value={invoiceDetails.date}
                  onChange={handleInvoiceDetailsChange}
                />
              </div>
              
              <div className={styles.formGroup}>
                <label htmlFor="supplier">Supplier</label>
                <input
                  id="supplier"
                  name="supplier"
                  type="text"
                  value={invoiceDetails.supplier}
                  onChange={handleInvoiceDetailsChange}
                  placeholder="Enter supplier name"
                />
              </div>
              
              <div className={styles.formGroup}>
                <label htmlFor="amount">Total Amount</label>
                <input
                  id="amount"
                  name="amount"
                  type="number"
                  step="0.01"
                  value={invoiceDetails.amount}
                  onChange={handleInvoiceDetailsChange}
                  placeholder="0.00"
                />
              </div>
            </div>
          </section>

          {/* Invoice Items */}
          <section className={styles.section}>
            <div className={styles.sectionHeader}>
              <h2 className={styles.sectionTitle}>Invoice Items</h2>
              <button className={styles.addButton} onClick={addInvoiceItem}>
                + Add Item
              </button>
            </div>
            
            <div className={styles.itemsTable}>
              <div className={styles.itemsHeader}>
                <div>Item Name</div>
                <div>Quantity</div>
                <div>Unit</div>
                <div>Amount</div>
                <div>Unit Cost</div>
                <div>Ingredient</div>
                <div>Action</div>
              </div>
              
              {invoiceItems.map((item, index) => (
                <div key={item.id || index} className={styles.itemRow}>
                  <div className={styles.itemCell} data-label="Item Name">
                    <input
                      type="text"
                      value={item.item_name}
                      onChange={(e) => handleItemChange(index, 'item_name', e.target.value)}
                      placeholder="Item name"
                    />
                  </div>
                  
                  <div className={styles.itemCell} data-label="Quantity">
                    <input
                      type="number"
                      step="0.01"
                      value={item.quantity}
                      onChange={(e) => handleItemChange(index, 'quantity', e.target.value)}
                      placeholder="0"
                    />
                  </div>
                  
                  <div className={styles.itemCell} data-label="Unit">
                    <input
                      type="text"
                      value={item.unit}
                      onChange={(e) => handleItemChange(index, 'unit', e.target.value)}
                      placeholder="lbs, oz, gallons, etc"
                      title="Enter unit (e.g., lbs, oz, cups, gallons, each)"
                    />
                  </div>
                  
                  <div className={styles.itemCell} data-label="Amount">
                    <input
                      type="number"
                      step="0.01"
                      value={item.amount}
                      onChange={(e) => handleItemChange(index, 'amount', e.target.value)}
                      placeholder="0.00"
                    />
                  </div>
                  
                  <div className={styles.itemCell} data-label="Unit Cost">
                    <span className={styles.unitCost}>
                      ${item.unit_cost.toFixed(2)}
                    </span>
                  </div>
                  
                  <div className={styles.itemCell} data-label="Ingredient">
                    <div className={styles.ingredientSearch}>
                      <input
                        type="text"
                        value={item.ingredient_search || ''}
                        onChange={(e) => handleIngredientSearch(index, e.target.value)}
                        placeholder="Search ingredients..."
                      />
                      {filteredIngredients.length > 0 && (
                        <div className={styles.searchResults}>
                          {filteredIngredients.map(ingredient => (
                            <div
                              key={ingredient.id}
                              className={styles.searchResult}
                              onClick={() => selectIngredient(index, ingredient)}
                            >
                              {ingredient.name} ({ingredient.unit}) - ${ingredient.last_price?.toFixed(4) || '0.0000'}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div className={styles.itemCell} data-label="Action">
                    <button
                      className={styles.removeButton}
                      onClick={() => removeInvoiceItem(index)}
                    >
                      Remove
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>

        {/* Right Panel - File Viewer */}
        <div className={styles.rightPanel}>
          <div className={styles.fileViewer}>
            <h3 className={styles.fileTitle}>Uploaded Invoice</h3>
            {invoice.file_url ? (
              <div className={styles.fileContainer}>
                {invoice.file_url.toLowerCase().includes('.pdf') ? (
                  <iframe
                    src={invoice.file_url}
                    className={styles.pdfViewer}
                    title="Invoice PDF"
                  />
                ) : (
                  <img
                    src={invoice.file_url}
                    alt="Invoice"
                    className={styles.imageViewer}
                  />
                )}
                <a
                  href={invoice.file_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={styles.openFileButton}
                >
                  Open in New Tab
                </a>
              </div>
            ) : (
              <div className={styles.noFile}>No file available</div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}