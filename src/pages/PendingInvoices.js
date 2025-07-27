// File: src/pages/PendingInvoices.js
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import supabase from '../supabaseClient';
import styles from './PendingInvoices.module.css';

export default function PendingInvoices() {
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [restaurants, setRestaurants] = useState({});
  const navigate = useNavigate();

  useEffect(() => {
    fetchPendingInvoices();
  }, []);

  async function fetchPendingInvoices() {
    try {
      // Get pending invoices (where required fields are null)
      const { data: pendingInvoices, error: invoicesError } = await supabase
        .from('invoices')
        .select('*')
        .or('number.is.null,date.is.null,supplier.is.null,amount.is.null')
        .order('created_at', { ascending: false });

      if (invoicesError) throw invoicesError;

      // Get restaurant names
      const restaurantIds = [...new Set(pendingInvoices?.map(inv => inv.restaurant_id).filter(Boolean))];
      
      if (restaurantIds.length > 0) {
        const { data: restaurantData, error: restaurantError } = await supabase
          .from('restaurants')
          .select('id, name')
          .in('id', restaurantIds);

        if (restaurantError) throw restaurantError;

        const restaurantMap = {};
        restaurantData.forEach(restaurant => {
          restaurantMap[restaurant.id] = restaurant.name;
        });
        setRestaurants(restaurantMap);
      }

      setInvoices(pendingInvoices || []);
    } catch (error) {
      console.error('Error fetching pending invoices:', error);
    } finally {
      setLoading(false);
    }
  }

  function getFileType(url) {
    if (!url) return 'Unknown';
    const extension = url.split('.').pop().toLowerCase();
    if (extension === 'pdf') return 'PDF';
    if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(extension)) return 'Image';
    return 'File';
  }

  function formatFileSize(url) {
    // This is a placeholder - in a real app you'd store file size
    return 'Unknown size';
  }

  if (loading) {
    return (
      <div className={styles.wrapper}>
        <div className={styles.loading}>Loading pending invoices...</div>
      </div>
    );
  }

  return (
    <div className={styles.wrapper}>
      {/* Header */}
      <header className={styles.header}>
        <div className={styles.headerContent}>
          <div className={styles.headerLeft}>
            <button 
              className={styles.backButton}
              onClick={() => navigate('/admin/dashboard')}
            >
              ← Back to Dashboard
            </button>
            <h1 className={styles.title}>Pending Invoices</h1>
          </div>
          <div className={styles.headerStats}>
            <span className={styles.count}>{invoices.length} invoices pending review</span>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className={styles.main}>
        {invoices.length === 0 ? (
          <div className={styles.emptyState}>
            <div className={styles.emptyIcon}>✅</div>
            <h2 className={styles.emptyTitle}>All caught up!</h2>
            <p className={styles.emptyDescription}>
              There are no pending invoices to review at this time.
            </p>
            <button 
              className={styles.emptyButton}
              onClick={() => navigate('/admin/dashboard')}
            >
              Back to Dashboard
            </button>
          </div>
        ) : (
          <div className={styles.tableContainer}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Restaurant</th>
                  <th>Upload Date</th>
                  <th>File Type</th>
                  <th>Status</th>
                  <th>Missing Fields</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {invoices.map((invoice) => {
                  const missingFields = [];
                  if (!invoice.number) missingFields.push('Number');
                  if (!invoice.date) missingFields.push('Date');
                  if (!invoice.supplier) missingFields.push('Supplier');
                  if (!invoice.amount) missingFields.push('Amount');

                  return (
                    <tr 
                      key={invoice.id} 
                      className={styles.tableRow}
                      onClick={() => navigate(`/admin/invoice-editor/${invoice.id}`)}
                    >
                      <td className={styles.restaurantCell}>
                        <div className={styles.restaurantInfo}>
                          <span className={styles.restaurantName}>
                            {restaurants[invoice.restaurant_id] || 'Unknown Restaurant'}
                          </span>
                        </div>
                      </td>
                      <td className={styles.dateCell}>
                        {new Date(invoice.created_at).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </td>
                      <td className={styles.fileTypeCell}>
                        <span className={styles.fileTypeBadge}>
                          {getFileType(invoice.file_url)}
                        </span>
                      </td>
                      <td className={styles.statusCell}>
                        <span className={styles.statusBadge}>
                          Pending Review
                        </span>
                      </td>
                      <td className={styles.missingFieldsCell}>
                        <div className={styles.missingFields}>
                          {missingFields.map((field, index) => (
                            <span key={field} className={styles.missingField}>
                              {field}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className={styles.actionCell}>
                        <button 
                          className={styles.reviewButton}
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/admin/invoice-editor/${invoice.id}`);
                          }}
                        >
                          Review
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </div>
  );
}