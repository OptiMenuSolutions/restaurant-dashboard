// File: src/pages/ClientManagement.js
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import supabase from '../supabaseClient';
import styles from './ClientManagement.module.css';

export default function ClientManagement() {
  const navigate = useNavigate();
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortField, setSortField] = useState('name');
  const [sortDirection, setSortDirection] = useState('asc');

  useEffect(() => {
    fetchClients();
  }, []);

  async function fetchClients() {
    try {
      setLoading(true);
      
      // Get restaurants with additional stats
      const { data: restaurants, error: restaurantError } = await supabase
        .from('restaurants')
        .select('*')
        .order('name');

      if (restaurantError) throw restaurantError;

      // For each restaurant, get additional statistics
      const clientsWithStats = await Promise.all(
        (restaurants || []).map(async (restaurant) => {
          try {
            // Get invoice count
            const { data: invoices, error: invoiceError } = await supabase
              .from('invoices')
              .select('id, amount, created_at')
              .eq('restaurant_id', restaurant.id);

            if (invoiceError) throw invoiceError;

            // Get menu items count
            const { data: menuItems, error: menuError } = await supabase
              .from('menu_items')
              .select('id')
              .eq('restaurant_id', restaurant.id);

            if (menuError) throw menuError;

            // Get ingredients count
            const { data: ingredients, error: ingredientError } = await supabase
              .from('ingredients')
              .select('id')
              .eq('restaurant_id', restaurant.id);

            if (ingredientError) throw ingredientError;

            // Calculate stats
            const totalInvoices = invoices?.length || 0;
            const totalSpent = invoices?.reduce((sum, inv) => sum + (inv.amount || 0), 0) || 0;
            const lastInvoiceDate = invoices?.length > 0 
              ? Math.max(...invoices.map(inv => new Date(inv.created_at).getTime()))
              : null;

            return {
              ...restaurant,
              stats: {
                totalInvoices,
                totalSpent,
                menuItemsCount: menuItems?.length || 0,
                ingredientsCount: ingredients?.length || 0,
                lastInvoiceDate: lastInvoiceDate ? new Date(lastInvoiceDate) : null
              }
            };
          } catch (error) {
            console.error(`Error fetching stats for ${restaurant.name}:`, error);
            return {
              ...restaurant,
              stats: {
                totalInvoices: 0,
                totalSpent: 0,
                menuItemsCount: 0,
                ingredientsCount: 0,
                lastInvoiceDate: null
              }
            };
          }
        })
      );

      setClients(clientsWithStats);
    } catch (error) {
      console.error('Error fetching clients:', error);
    } finally {
      setLoading(false);
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

  const filteredAndSortedClients = clients
    .filter(client => 
      client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (client.email || '').toLowerCase().includes(searchTerm.toLowerCase())
    )
    .sort((a, b) => {
      let aValue, bValue;
      
      if (sortField.startsWith('stats.')) {
        const statField = sortField.split('.')[1];
        aValue = a.stats[statField];
        bValue = b.stats[statField];
        
        if (statField === 'lastInvoiceDate') {
          aValue = aValue ? aValue.getTime() : 0;
          bValue = bValue ? bValue.getTime() : 0;
        }
      } else {
        aValue = a[sortField];
        bValue = b[sortField];
      }
      
      if (typeof aValue === 'number' && typeof bValue === 'number') {
        return sortDirection === 'asc' ? aValue - bValue : bValue - aValue;
      }
      
      if (sortField === 'created_at' || sortField === 'stats.lastInvoiceDate') {
        aValue = new Date(aValue || 0);
        bValue = new Date(bValue || 0);
        return sortDirection === 'asc' ? aValue - bValue : bValue - aValue;
      }
      
      aValue = (aValue || '').toString().toLowerCase();
      bValue = (bValue || '').toString().toLowerCase();
      
      if (sortDirection === 'asc') {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });

  const totalClients = clients.length;
  const activeClients = clients.filter(client => 
    client.stats.lastInvoiceDate && 
    client.stats.lastInvoiceDate > new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
  ).length;
  const totalRevenue = clients.reduce((sum, client) => sum + client.stats.totalSpent, 0);

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
          <h1 className={styles.title}>Client Management</h1>
        </div>
      </header>

      {/* Controls */}
      <div className={styles.controls}>
        <div className={styles.searchBox}>
          <input
            type="text"
            placeholder="Search clients by name or email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className={styles.searchInput}
          />
        </div>
      </div>

      {/* Main Content */}
      <main className={styles.main}>
        {loading ? (
          <div className={styles.loading}>Loading clients...</div>
        ) : (
          <>
            {/* Summary Stats */}
            <div className={styles.summary}>
              <div className={styles.summaryCard}>
                <h3>Total Clients</h3>
                <p className={styles.summaryNumber}>{totalClients}</p>
                <p className={styles.summaryLabel}>Restaurant partners</p>
              </div>
              <div className={styles.summaryCard}>
                <h3>Active (30 days)</h3>
                <p className={styles.summaryNumber}>{activeClients}</p>
                <p className={styles.summaryLabel}>
                  {totalClients > 0 ? Math.round((activeClients / totalClients) * 100) : 0}% of clients
                </p>
              </div>
              <div className={styles.summaryCard}>
                <h3>Total Revenue</h3>
                <p className={styles.summaryNumber}>${totalRevenue.toFixed(2)}</p>
                <p className={styles.summaryLabel}>Combined invoice value</p>
              </div>
            </div>

            {/* Clients Table */}
            <div className={styles.tableContainer}>
              {filteredAndSortedClients.length === 0 ? (
                <div className={styles.emptyState}>
                  <div className={styles.emptyIcon}>🏪</div>
                  <h3>No Clients Found</h3>
                  <p>
                    {searchTerm 
                      ? `No clients match "${searchTerm}"`
                      : 'No restaurant partners have been added yet.'
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
                        Restaurant Name {sortField === 'name' && (sortDirection === 'asc' ? '↑' : '↓')}
                      </th>
                      <th 
                        className={styles.sortableHeader}
                        onClick={() => handleSort('email')}
                      >
                        Contact Email {sortField === 'email' && (sortDirection === 'asc' ? '↑' : '↓')}
                      </th>
                      <th 
                        className={styles.sortableHeader}
                        onClick={() => handleSort('stats.totalInvoices')}
                      >
                        Total Invoices {sortField === 'stats.totalInvoices' && (sortDirection === 'asc' ? '↑' : '↓')}
                      </th>
                      <th 
                        className={styles.sortableHeader}
                        onClick={() => handleSort('stats.totalSpent')}
                      >
                        Total Spent {sortField === 'stats.totalSpent' && (sortDirection === 'asc' ? '↑' : '↓')}
                      </th>
                      <th 
                        className={styles.sortableHeader}
                        onClick={() => handleSort('stats.menuItemsCount')}
                      >
                        Menu Items {sortField === 'stats.menuItemsCount' && (sortDirection === 'asc' ? '↑' : '↓')}
                      </th>
                      <th 
                        className={styles.sortableHeader}
                        onClick={() => handleSort('stats.ingredientsCount')}
                      >
                        Ingredients {sortField === 'stats.ingredientsCount' && (sortDirection === 'asc' ? '↑' : '↓')}
                      </th>
                      <th 
                        className={styles.sortableHeader}
                        onClick={() => handleSort('stats.lastInvoiceDate')}
                      >
                        Last Activity {sortField === 'stats.lastInvoiceDate' && (sortDirection === 'asc' ? '↑' : '↓')}
                      </th>
                      <th 
                        className={styles.sortableHeader}
                        onClick={() => handleSort('created_at')}
                      >
                        Joined {sortField === 'created_at' && (sortDirection === 'asc' ? '↑' : '↓')}
                      </th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredAndSortedClients.map(client => {
                      const isActive = client.stats.lastInvoiceDate && 
                        client.stats.lastInvoiceDate > new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
                      
                      return (
                        <tr key={client.id} className={styles.tableRow}>
                          <td className={styles.clientName}>
                            <div className={styles.nameWithStatus}>
                              {client.name}
                              {isActive && <span className={styles.activeBadge}>Active</span>}
                            </div>
                          </td>
                          
                          <td className={styles.emailCell}>
                            {client.email || <span className={styles.noData}>No email</span>}
                          </td>
                          
                          <td className={styles.statsCell}>
                            {client.stats.totalInvoices}
                          </td>
                          
                          <td className={styles.moneyCell}>
                            ${client.stats.totalSpent.toFixed(2)}
                          </td>
                          
                          <td className={styles.statsCell}>
                            {client.stats.menuItemsCount}
                          </td>
                          
                          <td className={styles.statsCell}>
                            {client.stats.ingredientsCount}
                          </td>
                          
                          <td className={styles.dateCell}>
                            {client.stats.lastInvoiceDate 
                              ? client.stats.lastInvoiceDate.toLocaleDateString()
                              : <span className={styles.noData}>Never</span>
                            }
                          </td>
                          
                          <td className={styles.dateCell}>
                            {new Date(client.created_at).toLocaleDateString()}
                          </td>
                          
                          <td>
                            <div className={styles.actionButtons}>
                              <button
                                className={styles.viewButton}
                                onClick={() => navigate('/admin/analytics', { state: { selectedRestaurant: client.id } })}
                                title="View Analytics"
                              >
                                📊 Analytics
                              </button>
                              <button
                                className={styles.manageButton}
                                onClick={() => navigate('/admin/menu-items', { state: { selectedRestaurant: client.id } })}
                                title="Manage Menu"
                              >
                                🍽️ Menu
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