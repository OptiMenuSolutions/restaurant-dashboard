// File: src/pages/InvoiceEditor.js
import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import supabase from '../supabaseClient';
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
  const [activeSearchIndex, setActiveSearchIndex] = useState(null);
  const [filteredIngredients, setFilteredIngredients] = useState([]);
  
  const fetchInvoiceData = useCallback(async () => {
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
  }, [id]);
  
  useEffect(() => {
    if (id) {
      fetchInvoiceData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  function handleInvoiceDetailsChange(e) {
    const { name, value } = e.target;
    setInvoiceDetails(prev => ({
      ...prev,
      [name]: value
    }));
  }

  function addInvoiceItem() {
    const newItem = {
      id: Date.now(),
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
    setActiveSearchIndex(index);
    
    if (searchTerm.length > 1) {
      const filtered = ingredients.filter(ingredient =>
        ingredient.name.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredIngredients(filtered);
    } else {
      setFilteredIngredients([]);
      setActiveSearchIndex(null);
    }
  }

  function selectIngredient(index, ingredient) {
    handleItemChange(index, 'ingredient_id', ingredient.id);
    handleItemChange(index, 'ingredient_search', ingredient.name);
    handleItemChange(index, 'unit', ingredient.unit);
    setFilteredIngredients([]);
    setActiveSearchIndex(null);
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

      // Create missing ingredients before processing items
      for (const item of invoiceItems) {
        if (item.item_name && item.unit && !item.ingredient_id) {
          const { data: existingIngredient, error: checkError } = await supabase
            .from('ingredients')
            .select('id')
            .eq('restaurant_id', restaurant.id)
            .eq('name', item.item_name)
            .eq('unit', item.unit)
            .single();

          if (checkError && checkError.code === 'PGRST116') {
            const { data: newIngredient, error: createError } = await supabase
              .from('ingredients')
              .insert({
                restaurant_id: restaurant.id,
                name: item.item_name,
                unit: item.unit,
                last_price: item.unit_cost || 0,
                last_ordered_at: invoiceDetails.date
              })
              .select()
              .single();

            if (createError) {
              alert('Failed to create ingredient: ' + createError.message);
              return;
            }

            item.ingredient_id = newIngredient.id;
          } else if (!checkError) {
            item.ingredient_id = existingIngredient.id;
          }
        }
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

      // Prepare items for insertion
      const itemsToInsert = invoiceItems.map(item => ({
        invoice_id: id,
        item_name: item.item_name || '',
        quantity: parseFloat(item.quantity) || 0,
        unit: item.unit || '',
        amount: parseFloat(item.amount) || 0,
        unit_cost: parseFloat(item.unit_cost) || 0,
        ingredient_id: item.ingredient_id || null
      }));

      // Insert new invoice items
      const { error: insertError } = await supabase
        .from('invoice_items')
        .insert(itemsToInsert);

      if (insertError) {
        alert('Failed to insert items: ' + insertError.message);
        return;
      }

      // UPDATED APPROACH: Collect all menu items that will be affected BEFORE updating prices
      const affectedMenuItems = new Map();
      
      for (const item of invoiceItems) {
        if (item.ingredient_id && item.unit_cost > 0) {
          // Get all menu items that use this ingredient through components
          const { data: componentsUsingIngredient, error } = await supabase
            .from('component_ingredients')
            .select(`
              quantity,
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
            .eq('ingredient_id', item.ingredient_id);

          if (!error && componentsUsingIngredient) {
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
        }
      }

      // Update ingredient prices
      for (const item of invoiceItems) {
        if (item.ingredient_id && item.unit_cost > 0) {
          await supabase
            .from('ingredients')
            .update({
              last_price: item.unit_cost,
              last_ordered_at: invoiceDetails.date
            })
            .eq('id', item.ingredient_id);
        }
      }

      // Now recalculate costs for affected menu items using component structure
      for (const [menuItemId, menuItemInfo] of affectedMenuItems) {
        // Get all components for this menu item
        const { data: components, error: componentsError } = await supabase
          .from('menu_item_components')
          .select(`
            id,
            component_ingredients (
              quantity,
              ingredients:ingredient_id (
                last_price
              )
            )
          `)
          .eq('menu_item_id', menuItemId);

        if (!componentsError && components) {
          let newMenuItemCost = 0;

          // Calculate cost for each component
          for (const component of components) {
            let componentCost = 0;
            
            component.component_ingredients.forEach(ing => {
              const ingredientCost = ing.ingredients?.last_price || 0;
              componentCost += ing.quantity * ingredientCost;
            });

            // Update component cost
            await supabase
              .from('menu_item_components')
              .update({ cost: componentCost })
              .eq('id', component.id);

            newMenuItemCost += componentCost;
          }

          // Update menu item cost
          await supabase
            .from('menu_items')
            .update({ cost: newMenuItemCost })
            .eq('id', menuItemId);

          // Only log if cost actually changed
          if (menuItemInfo.oldCost !== newMenuItemCost) {
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
          }
        }
      }

      alert('Invoice saved successfully! Menu item costs have been updated.');
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
        <div className={styles.loadingContainer}>
          <div className={styles.spinner}></div>
          <div className={styles.loadingText}>Loading invoice...</div>
        </div>
      </div>
    );
  }

  if (!invoice) {
    return (
      <div className={styles.wrapper}>
        <div className={styles.errorContainer}>
          <div className={styles.errorIcon}>⚠️</div>
          <div className={styles.errorText}>Invoice not found</div>
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
            onClick={() => navigate('/admin/pending-invoices')}
          >
            <svg className={styles.backIcon} viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clipRule="evenodd" />
            </svg>
            Back to Pending Invoices
          </button>
          <h1 className={styles.title}>
            Invoice Editor - {restaurant?.name}
          </h1>
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
                Save Invoice
              </>
            )}
          </button>
        </div>
      </header>
      
      {/* Main Content */}
      <main className={styles.main}>
        {/* Left Panel - Invoice Data */}
        <div className={styles.leftPanel}>
          {/* Invoice Details Section */}
          <div className={styles.section}>
            <h2 className={styles.sectionTitle}>Invoice Details</h2>
            <div className={styles.formGrid}>
              <div className={styles.formGroup}>
                <label className={styles.label}>Invoice Number</label>
                <input
                  name="number"
                  type="text"
                  placeholder="e.g., INV-2025-001"
                  value={invoiceDetails.number}
                  onChange={handleInvoiceDetailsChange}
                  className={styles.input}
                />
              </div>
              <div className={styles.formGroup}>
                <label className={styles.label}>Invoice Date</label>
                <input
                  name="date"
                  type="date"
                  value={invoiceDetails.date}
                  onChange={handleInvoiceDetailsChange}
                  className={styles.input}
                />
              </div>
              <div className={styles.formGroup}>
                <label className={styles.label}>Supplier</label>
                <input
                  name="supplier"
                  type="text"
                  placeholder="e.g., Fresh Foods Direct"
                  value={invoiceDetails.supplier}
                  onChange={handleInvoiceDetailsChange}
                  className={styles.input}
                />
              </div>
              <div className={styles.formGroup}>
                <label className={styles.label}>Total Amount</label>
                <input
                  name="amount"
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={invoiceDetails.amount}
                  onChange={handleInvoiceDetailsChange}
                  className={styles.input}
                />
              </div>
            </div>
          </div>
          
          {/* Invoice Items Section */}
          <div className={styles.section}>
            <div className={styles.sectionHeader}>
              <h2 className={styles.sectionTitle}>Invoice Line Items</h2>
              <button 
                className={styles.addButton}
                onClick={addInvoiceItem}
              >
                + Add Line Item
              </button>
            </div>
            
            {invoiceItems.length === 0 ? (
              <div className={styles.emptyItems}>
                <p className={styles.emptyText}>No line items added yet</p>
                <p className={styles.emptySubtext}>Add line items from the invoice to match with ingredients</p>
              </div>
            ) : (
              <div className={styles.itemsTable}>
                <div className={styles.tableHeader}>
                  <div className={styles.headerCell}>Line Item Description</div>
                  <div className={styles.headerCell}>Total Cost ($)</div>
                  <div className={styles.headerCell}>Quantity</div>
                  <div className={styles.headerCell}>Unit</div>
                  <div className={styles.headerCell}>Unit Cost</div>
                  <div className={styles.headerCell}>Match to Ingredient</div>
                  <div className={styles.headerCell}>Action</div>
                </div>
                
                {invoiceItems.map((item, index) => (
                  <div key={item.id || index} className={styles.tableRow}>
                    <div className={styles.tableCell}>
                      <input
                        type="text"
                        value={item.item_name}
                        onChange={(e) => handleItemChange(index, 'item_name', e.target.value)}
                        placeholder="e.g., Fresh Chicken Breast"
                        className={styles.tableInput}
                      />
                    </div>
                    
                    <div className={styles.tableCell}>
                      <input
                        type="number"
                        step="0.01"
                        value={item.amount}
                        onChange={(e) => handleItemChange(index, 'amount', e.target.value)}
                        placeholder="0.00"
                        className={styles.tableInput}
                      />
                    </div>
                    
                    <div className={styles.tableCell}>
                      <input
                        type="number"
                        step="0.01"
                        value={item.quantity}
                        onChange={(e) => handleItemChange(index, 'quantity', e.target.value)}
                        placeholder="0"
                        className={styles.tableInput}
                      />
                    </div>
                    
                    <div className={styles.tableCell}>
                      <input
                        type="text"
                        value={item.unit}
                        onChange={(e) => handleItemChange(index, 'unit', e.target.value)}
                        placeholder="lbs, oz, each"
                        className={styles.tableInput}
                      />
                    </div>
                    
                    <div className={styles.tableCell}>
                      <span className={styles.unitCostValue}>${item.unit_cost.toFixed(2)}</span>
                    </div>
                    
                    <div className={styles.tableCell}>
                      <div className={styles.ingredientSearch}>
                        <input
                          type="text"
                          value={item.ingredient_search || ''}
                          onChange={(e) => handleIngredientSearch(index, e.target.value)}
                          placeholder="Search existing ingredients..."
                          className={styles.tableInput}
                        />
                        
                        {filteredIngredients.length > 0 && activeSearchIndex === index && (
                          <div className={styles.searchResults}>
                            {filteredIngredients.map(ingredient => (
                              <div
                                key={ingredient.id}
                                className={styles.searchResult}
                                onClick={() => selectIngredient(index, ingredient)}
                              >
                                <span className={styles.ingredientName}>{ingredient.name}</span>
                                <span className={styles.ingredientUnit}>({ingredient.unit})</span>
                                <span className={styles.currentPrice}>
                                  Current: ${ingredient.last_price?.toFixed(2) || '0.00'}
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                    
                    <div className={styles.tableCell}>
                      <button
                        className={styles.removeButton}
                        onClick={() => removeInvoiceItem(index)}
                        title="Remove item"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
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
                  <svg className={styles.buttonIcon} viewBox="0 0 20 20" fill="currentColor">
                    <path d="M11 3a1 1 0 100 2h2.586l-6.293 6.293a1 1 0 101.414 1.414L15 6.414V9a1 1 0 102 0V4a1 1 0 00-1-1h-5z" />
                    <path d="M5 5a2 2 0 00-2 2v8a2 2 0 002 2h8a2 2 0 002-2v-3a1 1 0 10-2 0v3H5V7h3a1 1 0 000-2H5z" />
                  </svg>
                  Open in New Tab
                </a>
              </div>
            ) : (
              <div className={styles.noFile}>
                <div className={styles.noFileContent}>
                  <div className={styles.noFileIcon}>📄</div>
                  <p className={styles.noFileText}>No file available</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}