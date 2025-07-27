// File: src/pages/InvoiceEditor.js
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import supabase from '../supabaseClient';

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
    return <div style={{ padding: '2rem' }}>Loading invoice...</div>;
  }

  if (!invoice) {
    return <div style={{ padding: '2rem' }}>Invoice not found</div>;
  }

  return (
    <div style={{ padding: '2rem', backgroundColor: '#f8fafc', minHeight: '100vh' }}>
      {/* Header */}
      <div style={{ backgroundColor: 'white', padding: '1rem', borderRadius: '8px', marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <button 
          onClick={() => navigate('/admin/pending-invoices')}
          style={{ background: 'none', border: 'none', color: '#3b82f6', cursor: 'pointer', fontWeight: '500' }}
        >
          ← Back to Pending Invoices
        </button>
        <h1 style={{ margin: 0, fontSize: '1.5rem', color: '#1e293b' }}>
          Invoice Editor - {restaurant?.name}
        </h1>
        <button 
          onClick={handleSubmit}
          disabled={saving}
          style={{ 
            background: '#10b981', 
            color: 'white', 
            border: 'none', 
            padding: '0.75rem 1.5rem', 
            borderRadius: '8px', 
            cursor: saving ? 'not-allowed' : 'pointer',
            opacity: saving ? 0.5 : 1
          }}
        >
          {saving ? 'Saving...' : 'Save Invoice'}
        </button>
      </div>
      
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
        {/* Left Panel */}
        <div style={{ backgroundColor: 'white', padding: '1.5rem', borderRadius: '8px' }}>
          <h2 style={{ marginBottom: '1rem' }}>Invoice Details</h2>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '2rem' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>Invoice Number</label>
              <input
                name="number"
                type="text"
                placeholder="Invoice Number"
                value={invoiceDetails.number}
                onChange={handleInvoiceDetailsChange}
                style={{ width: '100%', padding: '0.75rem', border: '1px solid #d1d5db', borderRadius: '6px' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>Invoice Date</label>
              <input
                name="date"
                type="date"
                value={invoiceDetails.date}
                onChange={handleInvoiceDetailsChange}
                style={{ width: '100%', padding: '0.75rem', border: '1px solid #d1d5db', borderRadius: '6px' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>Supplier</label>
              <input
                name="supplier"
                type="text"
                placeholder="Supplier"
                value={invoiceDetails.supplier}
                onChange={handleInvoiceDetailsChange}
                style={{ width: '100%', padding: '0.75rem', border: '1px solid #d1d5db', borderRadius: '6px' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>Total Amount</label>
              <input
                name="amount"
                type="number"
                step="0.01"
                placeholder="Total Amount"
                value={invoiceDetails.amount}
                onChange={handleInvoiceDetailsChange}
                style={{ width: '100%', padding: '0.75rem', border: '1px solid #d1d5db', borderRadius: '6px' }}
              />
            </div>
          </div>
          
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h2>Invoice Items</h2>
            <button 
              onClick={addInvoiceItem} 
              style={{ background: '#3b82f6', color: 'white', border: 'none', padding: '0.5rem 1rem', borderRadius: '6px', cursor: 'pointer' }}
            >
              + Add Item
            </button>
          </div>
          
          {invoiceItems.map((item, index) => (
            <div key={item.id || index} style={{ border: '1px solid #e5e7eb', padding: '1rem', marginBottom: '1rem', borderRadius: '6px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem' }}>Item Name</label>
                  <input
                    type="text"
                    value={item.item_name}
                    onChange={(e) => handleItemChange(index, 'item_name', e.target.value)}
                    placeholder="Item name"
                    style={{ width: '100%', padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: '4px' }}
                  />
                </div>
                
                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem' }}>Quantity</label>
                  <input
                    type="number"
                    step="0.01"
                    value={item.quantity}
                    onChange={(e) => handleItemChange(index, 'quantity', e.target.value)}
                    placeholder="0"
                    style={{ width: '100%', padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: '4px' }}
                  />
                </div>
                
                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem' }}>Unit</label>
                  <input
                    type="text"
                    value={item.unit}
                    onChange={(e) => handleItemChange(index, 'unit', e.target.value)}
                    placeholder="lbs, oz, etc"
                    style={{ width: '100%', padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: '4px' }}
                  />
                </div>
                
                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem' }}>Amount</label>
                  <input
                    type="number"
                    step="0.01"
                    value={item.amount}
                    onChange={(e) => handleItemChange(index, 'amount', e.target.value)}
                    placeholder="0.00"
                    style={{ width: '100%', padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: '4px' }}
                  />
                </div>
              </div>
              
              <div style={{ marginBottom: '1rem' }}>
                <strong>Unit Cost: ${item.unit_cost.toFixed(2)}</strong>
              </div>
              
              <div style={{ position: 'relative', marginBottom: '1rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem' }}>Search Ingredients</label>
                <input
                  type="text"
                  value={item.ingredient_search || ''}
                  onChange={(e) => handleIngredientSearch(index, e.target.value)}
                  placeholder="Search ingredients..."
                  style={{ width: '100%', padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: '4px' }}
                />
                
                {filteredIngredients.length > 0 && (
                  <div style={{ 
                    position: 'absolute', 
                    top: '100%', 
                    left: 0, 
                    right: 0, 
                    border: '1px solid #d1d5db', 
                    backgroundColor: 'white', 
                    maxHeight: '150px', 
                    overflowY: 'auto', 
                    zIndex: 10, 
                    borderRadius: '0 0 4px 4px',
                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                  }}>
                    {filteredIngredients.map(ingredient => (
                      <div
                        key={ingredient.id}
                        style={{ 
                          padding: '0.5rem', 
                          cursor: 'pointer', 
                          borderBottom: '1px solid #f3f4f6',
                          fontSize: '0.875rem'
                        }}
                        onClick={() => selectIngredient(index, ingredient)}
                        onMouseOver={(e) => e.target.style.backgroundColor = '#f3f4f6'}
                        onMouseOut={(e) => e.target.style.backgroundColor = 'white'}
                      >
                        {ingredient.name} ({ingredient.unit})
                      </div>
                    ))}
                  </div>
                )}
              </div>
              
              <button 
                onClick={() => removeInvoiceItem(index)}
                style={{ 
                  background: '#ef4444', 
                  color: 'white', 
                  border: 'none', 
                  padding: '0.5rem 1rem', 
                  borderRadius: '4px', 
                  cursor: 'pointer',
                  fontSize: '0.875rem'
                }}
              >
                Remove Item
              </button>
            </div>
          ))}
        </div>

        {/* Right Panel - File Viewer */}
        <div style={{ backgroundColor: 'white', padding: '1.5rem', borderRadius: '8px' }}>
          <h3 style={{ marginBottom: '1rem' }}>Uploaded Invoice</h3>
          {invoice.file_url && (
            <div>
              {invoice.file_url.toLowerCase().includes('.pdf') ? (
                <iframe
                  src={invoice.file_url}
                  style={{ width: '100%', height: '600px', border: '1px solid #e5e7eb', borderRadius: '8px' }}
                  title="Invoice PDF"
                />
              ) : (
                <img
                  src={invoice.file_url}
                  alt="Invoice"
                  style={{ width: '100%', height: 'auto', maxHeight: '600px', objectFit: 'contain', border: '1px solid #e5e7eb', borderRadius: '8px' }}
                />
              )}
              <div style={{ marginTop: '1rem' }}>
                <a 
                  href={invoice.file_url} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  style={{ 
                    background: '#6b7280', 
                    color: 'white', 
                    textDecoration: 'none', 
                    padding: '0.75rem 1rem', 
                    borderRadius: '6px',
                    display: 'inline-block'
                  }}
                >
                  Open in New Tab
                </a>
              </div>
            </div>
          )}
          {!invoice.file_url && (
            <div style={{ color: '#6b7280', fontStyle: 'italic', textAlign: 'center', padding: '2rem' }}>
              No file available
            </div>
          )}
        </div>
      </div>
    </div>
  );
}