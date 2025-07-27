// File: src/pages/InvoiceEditor.js
import React, { useState, useEffect } from 'react';
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
    handleItemChange(index, 'unit', ingredient.unit);
    setFilteredIngredients([]);
  }

  async function handleSubmit() {
    try {
      setSaving(true);

      // Validate required fields
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

      if (invoiceUpdateError) throw invoiceUpdateError;

      // Delete existing invoice items and insert new ones
      const { error: deleteError } = await supabase
        .from('invoice_items')
        .delete()
        .eq('invoice_id', id);

      if (deleteError) throw deleteError;

      // Insert new invoice items
      const itemsToInsert = invoiceItems.map(item => ({
        invoice_id: id,
        item_name: item.item_name,
        quantity: parseFloat(item.quantity),
        unit: item.unit,
        amount: parseFloat(item.amount),
        unit_cost: parseFloat(item.unit_cost),
        ingredient_id: item.ingredient_id
      }));

      const { error: insertError } = await supabase
        .from('invoice_items')
        .insert(itemsToInsert);

      if (insertError) throw insertError;

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

      alert('Invoice saved successfully!');
      navigate('/admin/pending-invoices');

    } catch (error) {
      console.error('Error saving invoice:', error);
      alert('Failed to save invoice');
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
                      placeholder="lbs, oz, etc"
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