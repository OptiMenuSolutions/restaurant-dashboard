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
    totalRevenue: 0,
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

      // Get all invoices
      const { data: allInvoices, error: invoicesError } = await supabase
        .from('invoices')
        .select('id, number, date, supplier, amount');

      if (invoicesError) throw invoicesError;

      // Filter for pending invoices
      const pendingInvoices = allInvoices.filter(invoice => {
        return !invoice.number || !invoice.date || !invoice.supplier || !invoice.amount;
      });

      // Calculate total revenue
      const totalRevenue = allInvoices.reduce((sum, invoice) => sum + (invoice.amount || 0), 0);

      setStats({
        clientCount: restaurants?.length || 0,
        pendingInvoices: pendingInvoices?.length || 0,
        totalInvoices: allInvoices?.length || 0,
        totalRevenue,
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
      <div className={styles.loadingWrapper}>
        <div className={styles.loadingSpinner}></div>
        <p>Loading dashboard...</p>
      </div>
    );
  }

  return (
    <div className={styles.wrapper}>
      <div className={styles.app}>
        {/* Header */}
        <header className={styles.appHeader}>
          <div className={styles.headerLogo}>
            <div className={styles.logoIcon}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M3 12h18m-9-9v18"/>
              </svg>
            </div>
            <div className={styles.logoTitle}>
              <span>OptiMenu</span>
              <span>Admin Portal</span>
            </div>
          </div>
          
          <div className={styles.welcomeMessage}>
            <h1 className="text-red-500">System Overview</h1>
          </div>
          
          <div className={styles.headerActions}>
            <button className={styles.userProfile} onClick={handleSignOut}>
              <span>Admin User</span>
              <span>A</span>
            </button>
            <div className={styles.headerActionButtons}>
              <button className={styles.iconButton}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
                  <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
                </svg>
              </button>
              <button className={styles.iconButton}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="3"/>
                  <path d="M12 1v6m0 6v6m11-7h-6m-6 0H1"/>
                </svg>
              </button>
            </div>
          </div>
        </header>

        {/* Body */}
        <div className={styles.appBody}>
          {/* Navigation */}
          <div className={styles.bodyNavigation}>
            <nav className={styles.navigation}>
              <button className="active">
                <span className={styles.navIcon}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="3" y="3" width="7" height="7"/>
                    <rect x="14" y="3" width="7" height="7"/>
                    <rect x="14" y="14" width="7" height="7"/>
                    <rect x="3" y="14" width="7" height="7"/>
                  </svg>
                </span>
                <span>Dashboard</span>
              </button>
              <button onClick={() => navigate('/admin/pending-invoices')}>
                <span className={styles.navIcon}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="10"/>
                    <polyline points="12,6 12,12 16,14"/>
                  </svg>
                </span>
                <span>Pending</span>
                {stats.pendingInvoices > 0 && (
                  <span className={styles.navBadge}>{stats.pendingInvoices}</span>
                )}
              </button>
              <button onClick={() => navigate('/admin/total-invoices')}>
                <span className={styles.navIcon}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                    <polyline points="14,2 14,8 20,8"/>
                    <line x1="16" y1="13" x2="8" y2="13"/>
                    <line x1="16" y1="17" x2="8" y2="17"/>
                    <polyline points="10,9 9,9 8,9"/>
                  </svg>
                </span>
                <span>Invoices</span>
              </button>
              <button onClick={() => navigate('/admin/ingredients')}>
                <span className={styles.navIcon}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/>
                    <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>
                  </svg>
                </span>
                <span>Ingredients</span>
              </button>
              <button onClick={() => navigate('/admin/menu-items')}>
                <span className={styles.navIcon}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="9" cy="9" r="7"/>
                    <path d="M21 21l-6-6"/>
                  </svg>
                </span>
                <span>Menu Items</span>
              </button>
              <button onClick={() => navigate('/admin/analytics')}>
                <span className={styles.navIcon}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="22,12 18,12 15,21 9,3 6,12 2,12"/>
                  </svg>
                </span>
                <span>Analytics</span>
              </button>
              <button onClick={() => navigate('/admin/clients')}>
                <span className={styles.navIcon}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                    <circle cx="12" cy="7" r="4"/>
                  </svg>
                </span>
                <span>Clients</span>
              </button>
            </nav>
            
            <footer className={styles.footer}>
              <h1>OptiMenu<small>©</small></h1>
              <div>
                OptiMenu ©<br />
                All Rights Reserved 2025
              </div>
            </footer>
          </div>

          {/* Main Content */}
          <div className={styles.mainContent}>
            {/* Overview Stats Grid */}
            <section className={styles.overviewSection}>
              <div className={styles.overviewGrid}>
                <div 
                  className={`${styles.overviewCard} ${styles.clickable}`}
                  onClick={() => navigate('/admin/total-invoices')}
                >
                  <div className={styles.overviewIcon}>
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                      <polyline points="14,2 14,8 20,8"/>
                      <line x1="16" y1="13" x2="8" y2="13"/>
                      <line x1="16" y1="17" x2="8" y2="17"/>
                    </svg>
                  </div>
                  <div className={styles.overviewContent}>
                    <div className={styles.overviewValue}>{stats.totalInvoices}</div>
                    <div className={styles.overviewLabel}>Total Invoices</div>
                    <div className={styles.overviewSubtext}>All processed invoices</div>
                  </div>
                  <div className={styles.overviewTrend}>+12%</div>
                </div>

                <div 
                  className={`${styles.overviewCard} ${stats.pendingInvoices > 0 ? styles.urgent : ''} ${styles.clickable}`}
                  onClick={() => navigate('/admin/pending-invoices')}
                >
                  <div className={styles.overviewIcon}>
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <circle cx="12" cy="12" r="10"/>
                      <polyline points="12,6 12,12 16,14"/>
                    </svg>
                  </div>
                  <div className={styles.overviewContent}>
                    <div className={styles.overviewValue}>{stats.pendingInvoices}</div>
                    <div className={styles.overviewLabel}>Pending Review</div>
                    <div className={styles.overviewSubtext}>
                      {stats.pendingInvoices > 0 ? 'Requires attention' : 'All caught up!'}
                    </div>
                  </div>
                  {stats.pendingInvoices > 0 && (
                    <div className={styles.overviewAlert}>Action needed</div>
                  )}
                </div>

                <div 
                  className={`${styles.overviewCard} ${styles.clickable}`}
                  onClick={() => navigate('/admin/clients')}
                >
                  <div className={styles.overviewIcon}>
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                      <circle cx="12" cy="7" r="4"/>
                    </svg>
                  </div>
                  <div className={styles.overviewContent}>
                    <div className={styles.overviewValue}>{stats.clientCount}</div>
                    <div className={styles.overviewLabel}>Active Clients</div>
                    <div className={styles.overviewSubtext}>Restaurant partners</div>
                  </div>
                  <div className={styles.overviewTrend}>+3</div>
                </div>

                <div className={styles.overviewCard}>
                  <div className={styles.overviewIcon}>
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <line x1="12" y1="1" x2="12" y2="23"/>
                      <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
                    </svg>
                  </div>
                  <div className={styles.overviewContent}>
                    <div className={styles.overviewValue}>${stats.totalRevenue.toLocaleString()}</div>
                    <div className={styles.overviewLabel}>Total Revenue</div>
                    <div className={styles.overviewSubtext}>Invoice value processed</div>
                  </div>
                  <div className={styles.overviewTrend}>+8%</div>
                </div>
              </div>
            </section>

            {/* Recent Activity */}
            <section className={styles.activitySection}>
              <div className={styles.activityHeader}>
                <h2>Recent Activity</h2>
                <button 
                  className={styles.viewAllButton}
                  onClick={() => navigate('/admin/analytics')}
                >
                  View all activity →
                </button>
              </div>
              <div className={styles.mainActivityList}>
                <div className={styles.mainActivityItem}>
                  <div className={styles.mainActivityIcon}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                      <polyline points="14,2 14,8 20,8"/>
                      <line x1="16" y1="13" x2="8" y2="13"/>
                      <line x1="16" y1="17" x2="8" y2="17"/>
                    </svg>
                  </div>
                  <div className={styles.mainActivityContent}>
                    <div className={styles.activityTitleRow}>
                      <div className={styles.mainActivityTitle}>Invoice FFD-2025-001 processed successfully</div>
                      <div className={styles.restaurantBubble}>Test Restaurant</div>
                    </div>
                    <div className={styles.mainActivitySubtitle}>Fresh Foods Direct • $481.25 • 10 items standardized</div>
                    <div className={styles.mainActivityDetails}>Updated pricing for Chicken Breast, Romaine Lettuce, Parmesan Cheese and 7 others</div>
                  </div>
                  <div className={styles.mainActivityTime}>2 hours ago</div>
                </div>

                <div className={styles.mainActivityItem}>
                  <div className={styles.mainActivityIcon}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <polyline points="22,12 18,12 15,21 9,3 6,12 2,12"/>
                    </svg>
                  </div>
                  <div className={styles.mainActivityContent}>
                    <div className={styles.activityTitleRow}>
                      <div className={styles.mainActivityTitle}>Menu item costs recalculated</div>
                      <div className={styles.restaurantBubble}>Test Restaurant</div>
                    </div>
                    <div className={styles.mainActivitySubtitle}>Caesar Salad cost updated from $5.38 to $5.42</div>
                    <div className={styles.mainActivityDetails}>Automatic recalculation triggered by ingredient price changes</div>
                  </div>
                  <div className={styles.mainActivityTime}>2 hours ago</div>
                </div>

                <div className={styles.mainActivityItem}>
                  <div className={styles.mainActivityIcon}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                      <circle cx="12" cy="7" r="4"/>
                    </svg>
                  </div>
                  <div className={styles.mainActivityContent}>
                    <div className={styles.activityTitleRow}>
                      <div className={styles.mainActivityTitle}>New restaurant partner onboarded</div>
                      <div className={styles.restaurantBubble}>Test Restaurant</div>
                    </div>
                    <div className={styles.mainActivitySubtitle}>Test Restaurant joined the platform</div>
                    <div className={styles.mainActivityDetails}>Account created and initial menu setup completed</div>
                  </div>
                  <div className={styles.mainActivityTime}>1 day ago</div>
                </div>

                <div className={styles.mainActivityItem}>
                  <div className={styles.mainActivityIcon}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/>
                      <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>
                    </svg>
                  </div>
                  <div className={styles.mainActivityContent}>
                    <div className={styles.activityTitleRow}>
                      <div className={styles.mainActivityTitle}>Ingredient database updated</div>
                      <div className={styles.restaurantBubble}>Admin</div>
                    </div>
                    <div className={styles.mainActivitySubtitle}>10 new ingredients added with standardized units</div>
                    <div className={styles.mainActivityDetails}>All ingredients now have proper unit conversions and pricing</div>
                  </div>
                  <div className={styles.mainActivityTime}>2 days ago</div>
                </div>
              </div>
            </section>

            {/* System Health */}
            <section className={styles.healthSection}>
              <h2>System Health</h2>
              <div className={styles.healthGrid}>
                <div className={styles.healthCard}>
                  <div className={styles.healthHeader}>
                    <span className={styles.healthLabel}>Data Processing</span>
                    <span className={styles.healthStatus} data-status="good">Excellent</span>
                  </div>
                  <div className={styles.healthDescription}>All invoice processing running smoothly</div>
                </div>
                
                <div className={styles.healthCard}>
                  <div className={styles.healthHeader}>
                    <span className={styles.healthLabel}>Cost Accuracy</span>
                    <span className={styles.healthStatus} data-status="good">99.8%</span>
                  </div>
                  <div className={styles.healthDescription}>Ingredient cost calculations are precise</div>
                </div>
                
                <div className={styles.healthCard}>
                  <div className={styles.healthHeader}>
                    <span className={styles.healthLabel}>Active Integration</span>
                    <span className={styles.healthStatus} data-status="warning">Syncing</span>
                  </div>
                  <div className={styles.healthDescription}>Menu items updating with latest costs</div>
                </div>
              </div>
            </section>
          </div>

          {/* Sidebar */}
          <div className={styles.sidebar}>
            <section className={styles.sidebarSection}>
              <h2>Overview</h2>
              <div className={styles.quickStats}>
                <div className={styles.statCard}>
                  <div className={styles.statHeader}>
                    <div className={styles.statIcon}>
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                        <polyline points="14,2 14,8 20,8"/>
                        <line x1="16" y1="13" x2="8" y2="13"/>
                        <line x1="16" y1="17" x2="8" y2="17"/>
                        <polyline points="10,9 9,9 8,9"/>
                      </svg>
                    </div>
                    <div className={styles.statTrend}>+12%</div>
                  </div>
                  <div className={styles.statValue}>{stats.totalInvoices}</div>
                  <div className={styles.statLabel}>Total Invoices</div>
                </div>

                <div className={styles.statCard}>
                  <div className={styles.statHeader}>
                    <div className={styles.statIcon}>
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                        <circle cx="12" cy="7" r="4"/>
                      </svg>
                    </div>
                    <div className={styles.statTrend}>+3</div>
                  </div>
                  <div className={styles.statValue}>{stats.clientCount}</div>
                  <div className={styles.statLabel}>Active Clients</div>
                </div>

                <div className={styles.statCard}>
                  <div className={styles.statHeader}>
                    <div className={styles.statIcon}>
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <line x1="12" y1="1" x2="12" y2="23"/>
                        <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
                      </svg>
                    </div>
                    <div className={styles.statTrend}>+8%</div>
                  </div>
                  <div className={styles.statValue}>${stats.totalRevenue.toLocaleString()}</div>
                  <div className={styles.statLabel}>Total Revenue</div>
                </div>
              </div>

              <div className={styles.recentActivity}>
                <h2>Recent Activity</h2>
                <div className={styles.activityList}>
                  <div className={styles.activityItem}>
                    <div className={styles.activityIcon}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                        <polyline points="14,2 14,8 20,8"/>
                        <line x1="16" y1="13" x2="8" y2="13"/>
                        <line x1="16" y1="17" x2="8" y2="17"/>
                        <polyline points="10,9 9,9 8,9"/>
                      </svg>
                    </div>
                    <div className={styles.activityContent}>
                      <div className={styles.activityTitle}>Invoice processed</div>
                      <div className={styles.activitySubtitle}>Fresh Foods Direct</div>
                    </div>
                    <div className={styles.activityTime}>2h</div>
                  </div>
                  
                  <div className={styles.activityItem}>
                    <div className={styles.activityIcon}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                        <circle cx="12" cy="7" r="4"/>
                      </svg>
                    </div>
                    <div className={styles.activityContent}>
                      <div className={styles.activityTitle}>New client onboarded</div>
                      <div className={styles.activitySubtitle}>Test Restaurant</div>
                    </div>
                    <div className={styles.activityTime}>1d</div>
                  </div>
                  
                  <div className={styles.activityItem}>
                    <div className={styles.activityIcon}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <polyline points="22,12 18,12 15,21 9,3 6,12 2,12"/>
                      </svg>
                    </div>
                    <div className={styles.activityContent}>
                      <div className={styles.activityTitle}>Cost analysis updated</div>
                      <div className={styles.activitySubtitle}>Menu prices recalculated</div>
                    </div>
                    <div className={styles.activityTime}>2d</div>
                  </div>
                </div>
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}