// File: src/pages/AdminDashboard.js
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import supabase from '../supabaseClient';
import styles from './AdminDashboard.module.css';

export default function AdminDashboard() {
  const [stats, setStats] = useState({
    clientCount: 0,
    pendingInvoices: 0,
    totalInvoices: 0,
    loading: true
  });
  const navigate = useNavigate();

  useEffect(() => {
    fetchDashboardStats();
  }, []);

async function fetchDashboardStats() {
  try {
    // Get client count (restaurants)
    const { data: restaurants, error: restaurantError } = await supabase
      .from('restaurants')
      .select('id');

    if (restaurantError) throw restaurantError;

    // Get all invoices and filter in JavaScript
    const { data: allInvoices, error: invoicesError } = await supabase
      .from('invoices')
      .select('id, number, date, supplier, amount');

    if (invoicesError) throw invoicesError;

    // DEBUG: Log all invoices to see what we're working with
    console.log('All invoices:', allInvoices);

    // Filter for pending invoices (any field is null or empty)
    const pendingInvoices = allInvoices.filter(invoice => {
      const isPending = !invoice.number || !invoice.date || !invoice.supplier || !invoice.amount;
      
      // DEBUG: Log each invoice check
      console.log('Invoice:', invoice.id, {
        number: invoice.number,
        date: invoice.date, 
        supplier: invoice.supplier,
        amount: invoice.amount,
        isPending: isPending
      });
      
      return isPending;
    });

    console.log('Pending invoices found:', pendingInvoices.length);

    setStats({
      clientCount: restaurants?.length || 0,
      pendingInvoices: pendingInvoices?.length || 0,
      totalInvoices: allInvoices?.length || 0,
      loading: false
    });
  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    setStats(prev => ({ ...prev, loading: false }));
  }
}

  async function handleSignOut() {
    await supabase.auth.signOut();
    navigate('/admin/login');
  }

  if (stats.loading) {
    return (
      <div className={styles.wrapper}>
        <div className={styles.loading}>Loading dashboard...</div>
      </div>
    );
  }

  return (
    <div className={styles.wrapper}>
      {/* Header */}
      <header className={styles.header}>
        <div className={styles.headerContent}>
          <h1 className={styles.title}>Admin Dashboard</h1>
          <button className={styles.signOutButton} onClick={handleSignOut}>
            Sign Out
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className={styles.main}>
        {/* Stats Cards */}
        <div className={styles.statsGrid}>
          <div className={styles.statCard}>
            <div className={styles.statIcon}>🏪</div>
            <div className={styles.statContent}>
              <h3 className={styles.statTitle}>Active Clients</h3>
              <p className={styles.statNumber}>{stats.clientCount}</p>
              <p className={styles.statDescription}>Restaurant partners</p>
            </div>
          </div>

          <div className={styles.statCard}>
            <div className={styles.statIcon}>📄</div>
            <div className={styles.statContent}>
              <h3 className={styles.statTitle}>Total Invoices</h3>
              <p className={styles.statNumber}>{stats.totalInvoices}</p>
              <p className={styles.statDescription}>All time uploads</p>
            </div>
          </div>

          <div 
            className={`${styles.statCard} ${styles.clickableCard}`}
            onClick={() => navigate('/admin/pending-invoices')}
          >
            <div className={styles.statIcon}>⏳</div>
            <div className={styles.statContent}>
              <h3 className={styles.statTitle}>Pending Review</h3>
              <p className={styles.statNumber}>{stats.pendingInvoices}</p>
              <p className={styles.statDescription}>Invoices awaiting processing</p>
            </div>
            {stats.pendingInvoices > 0 && (
              <div className={styles.badge}>{stats.pendingInvoices}</div>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className={styles.actionsGrid}>
          <button 
            className={styles.actionButton}
            onClick={() => navigate('/admin/pending-invoices')}
            disabled={stats.pendingInvoices === 0}
          >
            <div className={styles.actionIcon}>📋</div>
            <div className={styles.actionContent}>
              <h4>Review Invoices</h4>
              <p>Process pending invoice uploads</p>
            </div>
            {stats.pendingInvoices > 0 && (
              <div className={styles.actionBadge}>{stats.pendingInvoices}</div>
            )}
          </button>

          <button 
            className={styles.actionButton}
            onClick={() => navigate('/admin/menu-items')}
          >
            <div className={styles.actionIcon}>🍽️</div>
            <div className={styles.actionContent}>
              <h4>Manage Menu Items</h4>
              <p>Edit restaurant menus and recipes</p>
            </div>
          </button>

          <button 
            className={styles.actionButton}
            onClick={() => navigate('/admin/analytics')}
          >
            <div className={styles.actionIcon}>📊</div>
            <div className={styles.actionContent}>
              <h4>View Analytics</h4>
              <p>Cost analysis and reporting</p>
            </div>
          </button>

          <button 
            className={styles.actionButton}
            onClick={() => navigate('/admin/ingredients')}
          >
            <div className={styles.actionIcon}>🥕</div>
            <div className={styles.actionContent}>
              <h4>Manage Ingredients</h4>
              <p>View ingredient pricing and trends</p>
            </div>
          </button>
        </div>

        {/* Quick Actions */}
        {stats.pendingInvoices > 0 && (
          <div className={styles.quickActions}>
            <h3 className={styles.quickActionsTitle}>Quick Actions</h3>
            <div className={styles.quickActionsList}>
              <button 
                className={styles.quickActionButton}
                onClick={() => navigate('/admin/pending-invoices')}
              >
                Review {stats.pendingInvoices} Pending Invoice{stats.pendingInvoices !== 1 ? 's' : ''}
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}