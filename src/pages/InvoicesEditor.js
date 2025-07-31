// File: src/pages/InvoiceEditor.js
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import supabase from '../supabaseClient';
import { standardizeInvoiceItem, calculateStandardizedCost } from '../utils/standardizedUnits';
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
    // Don't auto-populate unit - let user set invoice unit independently
    setFilteredIngredients([]);
  }

  async function handleSubmit() {
    try {
      setSaving(true);

      if (!invoiceDetails.number || !invoiceDetails.date || !invoiceDetails.supplier || !invoiceDetails.amount) {
        alert('Please fill in all invoice details');
        return;
      }

      if (invoiceItems.length === 0) {
        alert('Please add at least one invoice item');
        return;
      }

      // Update invoice details
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
        alert('Failed to update invoice: ' + invoiceUpdateError.message);
        return;
      }

      // STANDARDIZATION PROCESS: Convert all invoice items to standard units
      console.log('🔄 Starting ingredient standardization process...');
      
      const processedItems = [];
      const affectedMenuItems = new Map();

      for (const item of invoiceItems) {
        if (!item.item_name || !item.unit || !item.quantity || !item.amount) {
          alert(`Please complete all fields for item: ${item.item_name || 'Unnamed item'}`);
          return;
        }

        console.log(`\n📦 Processing: ${item.item_name}`);
        
        // Standardize the invoice item
        const standardized = standardizeInvoiceItem(
          item.item_name,
          parseFloat(item.amount),
          parseFloat(item.quantity),
          item.unit
        );

        if (!standardized.success) {
          console.warn(`Warning: Could not standardize "${item.item_name}": ${standardized.error}`);
          // Continue with original units instead of failing
          const fallbackStandardized = {
            standardCost: parseFloat(item.amount) / parseFloat(item.quantity),
            standardUnit: item.unit,
            success: true
          };
          standardized.standardCost = fallbackStandardized.standardCost;
          standardized.standardUnit = fallbackStandardized.standardUnit;
          standardized.success = true;
        }

        // Check if ingredient already exists
        let ingredientId = item.ingredient_id;
        
        if (!ingredientId) {
          // Look for existing ingredient with same name
          const { data: existingIngredient, error: checkError } = await supabase
            .from('ingredients')
            .select('id, name, unit, last_price')
            .eq('restaurant_id', restaurant.id)
            .ilike('name', item.item_name.trim())
            .single();

          if (!checkError && existingIngredient) {
            ingredientId = existingIngredient.id;
            console.log(`✅ Found existing ingredient: ${existingIngredient.name}`);
            
          } else if (checkError && checkError.code === 'PGRST116') {
            // Create new ingredient with standardized unit
            console.log(`🆕 Creating new ingredient: ${item.item_name}`);
            
            const { data: newIngredient, error: createError } = await supabase
              .from('ingredients')
              .insert({
                restaurant_id: restaurant.id,
                name: item.item_name.trim(),
                unit: standardized.standardUnit, // Use standardized unit
                last_price: standardized.standardCost, // Use standardized cost
                last_ordered_at: invoiceDetails.date
              })
              .select()
              .single();

            if (createError) {
              alert('Failed to create ingredient: ' + createError.message);
              return;
            }

            ingredientId = newIngredient.id;
            console.log(`✅ Created ingredient with standardized unit: ${standardized.standardUnit}`);
          } else {
            alert('Error checking ingredients: ' + checkError.message);
            return;
          }
        }

        // Collect affected menu items BEFORE updating prices
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

        if (!componentsError && componentsUsingIngredient) {
          componentsUsingIngredient.forEach(record => {
            const menuItem = record.menu_item_components.menu_items;
            if (!affectedMenuItems.has(menuItem.id)) {
              affectedMenuItems.set(menuItem.id, {
                id: menuItem.id,
                name: menuItem.name,
                oldCost: menuItem.cost,
                restaurant_id: menuItem.restaurant_id
              });
            }
          });
        }

        // Update ingredient with standardized data
        await supabase
          .from('ingredients')
          .update({
            unit: standardized.standardUnit,           // Ensure unit is standardized
            last_price: standardized.standardCost,     // Use standardized cost per standard unit
            last_ordered_at: invoiceDetails.date
          })
          .eq('id', ingredientId);

        console.log(`✅ Updated ingredient: ${item.item_name} → $${standardized.standardCost.toFixed(4)}/${standardized.standardUnit}`);
        
        processedItems.push({
          ...item,
          ingredient_id: ingredientId,
          standardized
        });
      }

      // Delete existing invoice items
      const { error: deleteError } = await supabase
        .from('invoice_items')
        .delete()
        .eq('invoice_id', id);

      if (deleteError) {
        alert('Failed to delete old items: ' + deleteError.message);
        return;
      }

      // Insert new invoice items (keep original invoice data for records)
      const itemsToInsert = processedItems.map(item => ({
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
        alert('Failed to insert items: ' + insertError.message);
        return;
      }

      // Recalculate costs for affected menu items using standardized units
      console.log('\n🔄 Recalculating menu item costs...');

      for (const [menuItemId, menuItemInfo] of affectedMenuItems) {
        const { data: components, error: componentsError } = await supabase
          .from('menu_item_components')
          .select(`
            id,
            component_ingredients (
              quantity,
              unit,
              ingredients:ingredient_id (
                name,
                last_price,
                unit
              )
            )
          `)
          .eq('menu_item_id', menuItemId);

        if (!componentsError && components) {
          let newMenuItemCost = 0;

          for (const component of components) {
            let componentCost = 0;
            
            component.component_ingredients.forEach(ing => {
              const ingredientCost = ing.ingredients?.last_price || 0;
              const ingredientName = ing.ingredients?.name || '';

              if (ingredientCost > 0) {
                // Use the new standardized cost calculation
                try {
                  const cost = calculateStandardizedCost(
                    ing.quantity,
                    ing.unit,
                    ingredientCost,
                    ingredientName
                  );
                  componentCost += cost;
                  
                  console.log(`  ${ingredientName}: ${ing.quantity} ${ing.unit} = $${cost.toFixed(4)}`);
                } catch (error) {
                  console.warn(`Cost calculation failed for ${ingredientName}:`, error);
                  // Fallback to simple multiplication
                  componentCost += ing.quantity * ingredientCost;
                }
              }
            });

            await supabase
              .from('menu_item_components')
              .update({ cost: componentCost })
              .eq('id', component.id);

            newMenuItemCost += componentCost;
          }

          await supabase
            .from('menu_items')
            .update({ cost: newMenuItemCost })
            .eq('id', menuItemId);

          if (Math.abs(menuItemInfo.oldCost - newMenuItemCost) > 0.01) { // Only log if change > 1 cent
            await supabase
              .from('menu_item_cost_history')
              .insert({
                menu_item_id: menuItemId,
                menu_item_name: menuItemInfo.name,
                old_cost: menuItemInfo.oldCost,
                new_cost: newMenuItemCost,
                change_reason: 'invoice_saved',
                restaurant_id: menuItemInfo.restaurant_id
              });

            console.log(`📊 ${menuItemInfo.name}: $${menuItemInfo.oldCost.toFixed(4)} → $${newMenuItemCost.toFixed(4)}`);
          }
        }
      }

      alert('Invoice saved successfully! All ingredients have been standardized and menu item costs updated.');
      navigate('/admin/pending-invoices');

    } catch (error) {
      console.error('Unexpected error during save:', error);
      alert('Unexpected error: ' + error.message);
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
                  <div className={styles.itemCell}>
                    <input
                      type="text"
                      value={item.item_name}
                      onChange={(e) => handleItemChange(index, 'item_name', e.target.value)}
                      placeholder="Item name"
                    />
                  </div>
                  
                  <div className={styles.itemCell}>
                    <input
                      type="number"
                      step="0.01"
                      value={item.quantity}
                      onChange={(e) => handleItemChange(index, 'quantity', e.target.value)}
                      placeholder="0"
                    />
                  </div>
                  
                  <div className={styles.itemCell}>
                    <input
                      type="text"
                      value={item.unit}
                      onChange={(e) => handleItemChange(index, 'unit', e.target.value)}
                      placeholder="lbs, oz, gallons, etc"
                    />
                  </div>
                  
                  <div className={styles.itemCell}>
                    <input
                      type="number"
                      step="0.01"
                      value={item.amount}
                      onChange={(e) => handleItemChange(index, 'amount', e.target.value)}
                      placeholder="0.00"
                    />
                  </div>
                  
                  <div className={styles.itemCell}>
                    <span className={styles.unitCost}>
                      ${item.unit_cost.toFixed(2)}
                    </span>
                  </div>
                  
                  <div className={styles.itemCell}>
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
                              {ingredient.name} ({ingredient.unit})
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div className={styles.itemCell}>
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