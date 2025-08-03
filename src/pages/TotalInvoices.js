// File: src/pages/TotalInvoices.js
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import supabase from '../supabaseClient';
import styles from './TotalInvoices.module.css';

export default function TotalInvoices() {
  const navigate = useNavigate();
  const [invoices, setInvoices] = useState([]);
  const [restaurants, setRestaurants] = useState([]);
  const [selectedRestaurant, setSelectedRestaurant] = useState(''); // Start with "All Restaurants"
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortField, setSortField] = useState('created_at');
  const [sortDirection, setSortDirection] = useState('desc');
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [invoiceItems, setInvoiceItems] = useState([]);
  const [itemsLoading, setItemsLoading] = useState(false);

  useEffect(() => {
    fetchRestaurants();
  }, []);

  useEffect(() => {
    fetchInvoices();
  }, [selectedRestaurant]);

  async function fetchRestaurants() {
    try {
      const { data, error } = await supabase
        .from('restaurants')
        .select('id, name')
        .order('name');

      if (error) throw error;
      setRestaurants(data || []);
      
      // Keep selectedRestaurant as empty string for "All Restaurants"
      // Don't auto-select first restaurant
    } catch (error) {
      console.error('Error fetching restaurants:', error);
    }
  }

  async function fetchInvoices() {
    try {
      setLoading(true);
      
      let query = supabase
        .from('invoices')
        .select(`
          *,
          restaurants!inner(name),
          invoice_items(count)
        `)
        .order('created_at', { ascending: false });

      // Filter by restaurant if one is selected
      if (selectedRestaurant) {
        query = query.eq('restaurant_id', selectedRestaurant);
      }

      const { data, error } = await query;

      if (error) throw error;
      setInvoices(data || []);
    } catch (error) {
      console.error('Error fetching invoices:', error);
    } finally {
      setLoading(false);
    }
  }

  async function fetchInvoiceItems(invoiceId) {
    try {
      setItemsLoading(true);
      const { data, error } = await supabase
        .from('invoice_items')
        .select(`
          *,
          ingredients(name, unit, last_price)
        `)
        .eq('invoice_id', invoiceId)
        .order('item_name');

      if (error) throw error;
      setInvoiceItems(data || []);
    } catch (error) {
      console.error('Error fetching invoice items:', error);
      setInvoiceItems([]);
    } finally {
      setItemsLoading(false);
    }
  }

  async function handleDeleteInvoice(invoiceId) {
    if (!window.confirm('Are you sure you want to delete this invoice? This action cannot be undone.')) {
      return;
    }

    try {
      // First delete invoice items
      const { error: itemsError } = await supabase
        .from('invoice_items')
        .delete()
        .eq('invoice_id', invoiceId);

      if (itemsError) throw itemsError;

      // Then delete the invoice
      const { error: invoiceError } = await supabase
        .from('invoices')
        .delete()
        .eq('id', invoiceId);

      if (invoiceError) throw invoiceError;

      // Remove from local state
      setInvoices(prev => prev.filter(inv => inv.id !== invoiceId));
      
      // Close details view if this invoice was selected
      if (selectedInvoice && selectedInvoice.id === invoiceId) {
        setSelectedInvoice(null);
        setInvoiceItems([]);
      }
      
      alert('Invoice deleted successfully');
    } catch (error) {
      console.error('Error deleting invoice:', error);
      alert('Failed to delete invoice: ' + error.message);
    }
  }

  function handleInvoiceClick(invoice) {
    setSelectedInvoice(invoice);
    fetchInvoiceItems(invoice.id);
  }

  function handleCloseDetails() {
    setSelectedInvoice(null);
    setInvoiceItems([]);
  }

  function handleEditInvoice(invoiceId) {
    navigate(`/admin/invoice-editor/${invoiceId}`);
  }

  function handleSort(field) {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  }

  const filteredAndSortedInvoices = invoices
    .filter(invoice => {
      const searchLower = searchTerm.toLowerCase();
      return (
        (invoice.number || '').toLowerCase().includes(searchLower) ||
        (invoice.supplier || '').toLowerCase().includes(searchLower) ||
        (invoice.restaurants?.name || '').toLowerCase().includes(searchLower)
      );
    })
    .sort((a, b) => {
      let aValue = a[sortField];
      let bValue = b[sortField];
      
      if (sortField === 'amount') {
        aValue = parseFloat(aValue) || 0;
        bValue = parseFloat(bValue) || 0;
      } else if (sortField === 'date' || sortField === 'created_at') {
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

  function getInvoiceStatus(invoice) {
    const hasAllFields = invoice.number && invoice.date && invoice.supplier && invoice.amount;
    const hasItems = invoice.invoice_items && invoice.invoice_items.length > 0;
    
    if (!hasAllFields) return { status: 'pending', label: 'Pending', color: '#f59e0b' };
    if (!hasItems) return { status: 'incomplete', label: 'No Items', color: '#dc2626' };
    return { status: 'complete', label: 'Complete', color: '#10b981' };
  }

  const selectedRestaurantName = selectedRestaurant 
    ? restaurants.find(r => r.id === selectedRestaurant)?.name || ''
    : 'All Restaurants';
  
  const allInvoicesCount = invoices.length;
  const completeInvoicesCount = invoices.filter(inv => getInvoiceStatus(inv).status === 'complete').length;
  const totalValue = invoices.reduce((sum, inv) => sum + (inv.amount || 0), 0);

  // If showing invoice details
  if (selectedInvoice) {
    return (
      <div className={styles.wrapper}>
        {/* Header */}
        <header className={styles.header}>
          <div className={styles.headerContent}>
            <button 
              className={styles.backButton}
              onClick={handleCloseDetails}
            >
              ← Back to Invoice List
            </button>
            <h1 className={styles.title}>
              Invoice Details - {selectedInvoice.number || 'Untitled'}
            </h1>
            <button
              className={styles.editButton}
              onClick={() => handleEditInvoice(selectedInvoice.id)}
            >
              ✏️ Edit Invoice
            </button>
          </div>
        </header>

        {/* Invoice Details */}
        <main className={styles.main}>
          <div className={styles.invoiceDetailsContainer}>
            {/* Invoice Summary */}
            <div className={styles.invoiceSummary}>
              <div className={styles.summaryGrid}>
                <div className={styles.summaryItem}>
                  <strong>Invoice Number:</strong>
                  <span>{selectedInvoice.number || 'Not set'}</span>
                </div>
                <div className={styles.summaryItem}>
                  <strong>Date:</strong>
                  <span>
                    {selectedInvoice.date 
                      ? new Date(selectedInvoice.date).toLocaleDateString()
                      : 'Not set'
                    }
                  </span>
                </div>
                <div className={styles.summaryItem}>
                  <strong>Supplier:</strong>
                  <span>{selectedInvoice.supplier || 'Not set'}</span>
                </div>
                <div className={styles.summaryItem}>
                  <strong>Restaurant:</strong>
                  <span>{selectedInvoice.restaurants?.name || 'Unknown'}</span>
                </div>
                <div className={styles.summaryItem}>
                  <strong>Total Amount:</strong>
                  <span>
                    {selectedInvoice.amount 
                      ? `$${selectedInvoice.amount.toFixed(2)}`
                      : 'Not set'
                    }
                  </span>
                </div>
                <div className={styles.summaryItem}>
                  <strong>Status:</strong>
                  <span 
                    className={styles.statusBadge}
                    style={{ backgroundColor: getInvoiceStatus(selectedInvoice).color }}
                  >
                    {getInvoiceStatus(selectedInvoice).label}
                  </span>
                </div>
              </div>
            </div>

            {/* Invoice Items */}
            <div className={styles.itemsSection}>
              <h2>Invoice Items</h2>
              {itemsLoading ? (
                <div className={styles.loading}>Loading items...</div>
              ) : invoiceItems.length === 0 ? (
                <div className={styles.emptyItems}>
                  <p>No items found for this invoice.</p>
                  <button
                    className={styles.editButton}
                    onClick={() => handleEditInvoice(selectedInvoice.id)}
                  >
                    Add Items
                  </button>
                </div>
              ) : (
                <div className={styles.itemsTable}>
                  <table className={styles.table}>
                    <thead>
                      <tr>
                        <th>Item Name</th>
                        <th>Quantity</th>
                        <th>Unit</th>
                        <th>Amount</th>
                        <th>Unit Cost</th>
                        <th>Linked Ingredient</th>
                      </tr>
                    </thead>
                    <tbody>
                      {invoiceItems.map((item, index) => (
                        <tr key={item.id || index}>
                          <td className={styles.itemName}>{item.item_name}</td>
                          <td className={styles.quantity}>{item.quantity}</td>
                          <td className={styles.unit}>{item.unit}</td>
                          <td className={styles.amount}>${item.amount?.toFixed(2) || '0.00'}</td>
                          <td className={styles.unitCost}>${item.unit_cost?.toFixed(4) || '0.0000'}</td>
                          <td className={styles.ingredient}>
                            {item.ingredients?.name ? (
                              <span className={styles.linkedIngredient}>
                                {item.ingredients.name}
                                <small>
                                  (${item.ingredients.last_price?.toFixed(4) || '0.0000'}/{item.ingredients.unit})
                                </small>
                              </span>
                            ) : (
                              <span className={styles.noIngredient}>Not linked</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  
                  {/* Items Summary */}
                  <div className={styles.itemsSummary}>
                    <div className={styles.summaryRow}>
                      <strong>Total Items: {invoiceItems.length}</strong>
                    </div>
                    <div className={styles.summaryRow}>
                      <strong>
                        Items Total: $
                        {invoiceItems.reduce((sum, item) => sum + (item.amount || 0), 0).toFixed(2)}
                      </strong>
                    </div>
                    <div className={styles.summaryRow}>
                      <strong>
                        Linked Ingredients: {invoiceItems.filter(item => item.ingredients?.name).length}
                      </strong>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </main>
      </div>
    );
  }

  // Main invoice list view
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
          <h1 className={styles.title}>All Invoices</h1>
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
            <option value="">All Restaurants</option>
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
            placeholder="Search by invoice number, supplier, or restaurant..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className={styles.searchInput}
          />
        </div>
      </div>

      {/* Main Content */}
      <main className={styles.main}>
        {loading ? (
          <div className={styles.loading}>Loading invoices...</div>
        ) : (
          <>
            {/* Summary Stats */}
            <div className={styles.summary}>
              <div className={styles.summaryCard}>
                <h3>Total Invoices</h3>
                <p className={styles.summaryNumber}>{allInvoicesCount}</p>
                <p className={styles.summaryLabel}>{selectedRestaurantName}</p>
              </div>
              <div className={styles.summaryCard}>
                <h3>Complete</h3>
                <p className={styles.summaryNumber}>{completeInvoicesCount}</p>
                <p className={styles.summaryLabel}>
                  {allInvoicesCount > 0 ? Math.round((completeInvoicesCount / allInvoicesCount) * 100) : 0}% processed
                </p>
              </div>
              <div className={styles.summaryCard}>
                <h3>Total Value</h3>
                <p className={styles.summaryNumber}>${totalValue.toFixed(2)}</p>
                <p className={styles.summaryLabel}>Combined invoice amount</p>
              </div>
            </div>

            {/* Invoices Table */}
            <div className={styles.tableContainer}>
              {filteredAndSortedInvoices.length === 0 ? (
                <div className={styles.emptyState}>
                  <div className={styles.emptyIcon}>📄</div>
                  <h3>No Invoices Found</h3>
                  <p>
                    {searchTerm 
                      ? `No invoices match "${searchTerm}"`
                      : selectedRestaurant 
                        ? `${selectedRestaurantName} has no invoices yet.`
                        : 'No invoices have been uploaded yet.'
                    }
                  </p>
                </div>
              ) : (
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th 
                        className={styles.sortableHeader}
                        onClick={() => handleSort('number')}
                      >
                        Invoice # {sortField === 'number' && (sortDirection === 'asc' ? '↑' : '↓')}
                      </th>
                      <th 
                        className={styles.sortableHeader}
                        onClick={() => handleSort('date')}
                      >
                        Date {sortField === 'date' && (sortDirection === 'asc' ? '↑' : '↓')}
                      </th>
                      <th 
                        className={styles.sortableHeader}
                        onClick={() => handleSort('supplier')}
                      >
                        Supplier {sortField === 'supplier' && (sortDirection === 'asc' ? '↑' : '↓')}
                      </th>
                      <th>Restaurant</th>
                      <th 
                        className={styles.sortableHeader}
                        onClick={() => handleSort('amount')}
                      >
                        Amount {sortField === 'amount' && (sortDirection === 'asc' ? '↑' : '↓')}
                      </th>
                      <th>Status</th>
                      <th 
                        className={styles.sortableHeader}
                        onClick={() => handleSort('created_at')}
                      >
                        Uploaded {sortField === 'created_at' && (sortDirection === 'asc' ? '↑' : '↓')}
                      </th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredAndSortedInvoices.map(invoice => {
                      const status = getInvoiceStatus(invoice);
                      
                      return (
                        <tr 
                          key={invoice.id} 
                          className={`${styles.tableRow} ${styles.clickableRow}`}
                          onClick={() => handleInvoiceClick(invoice)}
                        >
                          <td className={styles.invoiceNumber}>
                            {invoice.number || <span className={styles.missing}>Not set</span>}
                          </td>
                          
                          <td className={styles.dateCell}>
                            {invoice.date 
                              ? new Date(invoice.date).toLocaleDateString()
                              : <span className={styles.missing}>Not set</span>
                            }
                          </td>
                          
                          <td className={styles.supplierCell}>
                            {invoice.supplier || <span className={styles.missing}>Not set</span>}
                          </td>
                          
                          <td className={styles.restaurantCell}>
                            {invoice.restaurants?.name || 'Unknown'}
                          </td>
                          
                          <td className={styles.amountCell}>
                            {invoice.amount 
                              ? `$${invoice.amount.toFixed(2)}`
                              : <span className={styles.missing}>Not set</span>
                            }
                          </td>
                          
                          <td>
                            <span 
                              className={styles.statusBadge}
                              style={{ backgroundColor: status.color }}
                            >
                              {status.label}
                            </span>
                          </td>
                          
                          <td className={styles.dateCell}>
                            {new Date(invoice.created_at).toLocaleDateString()}
                          </td>
                          
                          <td>
                            <div className={styles.actionButtons}>
                              <button
                                className={styles.editButton}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleEditInvoice(invoice.id);
                                }}
                                title="Edit Invoice"
                              >
                                ✏️ Edit
                              </button>
                              <button
                                className={styles.deleteButton}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteInvoice(invoice.id);
                                }}
                                title="Delete Invoice"
                              >
                                🗑️ Delete
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
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