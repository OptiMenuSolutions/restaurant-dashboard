// File: src/pages/InvoiceDetail.js
import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import styles from "./InvoiceDetail.module.css";
import Layout from "../components/Layout";
import supabase from "../supabaseClient";

export default function InvoiceDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [invoice, setInvoice] = useState(null);
  const [invoiceItems, setInvoiceItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [restaurant, setRestaurant] = useState(null);

  useEffect(() => {
    if (id) {
      fetchInvoiceData();
    }
  }, [id]);

  async function fetchInvoiceData() {
    try {
      setLoading(true);
      setError("");

      // First, verify user has access to this invoice
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        setError("Authentication required");
        return;
      }

      // Get user's restaurant_id
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("restaurant_id")
        .eq("id", user.id)
        .single();

      if (profileError || !profile?.restaurant_id) {
        setError("Could not determine restaurant access");
        return;
      }

      // Fetch invoice with restaurant verification
      const { data: invoiceData, error: invoiceError } = await supabase
        .from("invoices")
        .select("*")
        .eq("id", id)
        .eq("restaurant_id", profile.restaurant_id)
        .single();

      if (invoiceError) {
        if (invoiceError.code === 'PGRST116') {
          setError("Invoice not found or access denied");
        } else {
          setError("Failed to fetch invoice: " + invoiceError.message);
        }
        return;
      }

      setInvoice(invoiceData);

      // Fetch restaurant info
      const { data: restaurantData, error: restaurantError } = await supabase
        .from("restaurants")
        .select("*")
        .eq("id", profile.restaurant_id)
        .single();

      if (!restaurantError && restaurantData) {
        setRestaurant(restaurantData);
      }

      // Fetch invoice items if they exist
      const { data: itemsData, error: itemsError } = await supabase
        .from("invoice_items")
        .select(`
          *,
          ingredients (
            name,
            unit
          )
        `)
        .eq("invoice_id", id)
        .order("item_name");

      if (!itemsError) {
        setInvoiceItems(itemsData || []);
      }

    } catch (err) {
      setError("An unexpected error occurred: " + err.message);
      console.error("Error fetching invoice data:", err);
    } finally {
      setLoading(false);
    }
  }

  function formatDate(dateString) {
    if (!dateString) return "Not provided";
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    } catch {
      return "Invalid date";
    }
  }

  function formatCurrency(amount) {
    if (!amount || amount === null || amount === undefined) {
      return "--";
    }
    
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount)) {
      return "--";
    }
    
    return numAmount.toLocaleString('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  }

  function calculateItemTotal(item) {
    const quantity = parseFloat(item.quantity) || 0;
    const unitCost = parseFloat(item.unit_cost) || 0;
    return quantity * unitCost;
  }

  function getProcessingStatus() {
    if (!invoice) return 'unknown';
    const hasAllFields = invoice.number && invoice.date && invoice.supplier && invoice.amount;
    return hasAllFields ? 'processed' : 'pending';
  }

  if (loading) {
    return (
      <Layout>
        <div className={styles.container}>
          <div className={styles.loadingState}>
            <div className={styles.loadingSpinner}></div>
            <p>Loading invoice details...</p>
          </div>
        </div>
      </Layout>
    );
  }

  if (error) {
    return (
      <Layout>
        <div className={styles.container}>
          <div className={styles.errorState}>
            <div className={styles.errorIcon}>⚠️</div>
            <h3>Error Loading Invoice</h3>
            <p>{error}</p>
            <div className={styles.errorActions}>
              <button onClick={() => navigate("/invoices")} className={styles.backButton}>
                Back to Invoices
              </button>
              <button onClick={() => window.location.reload()} className={styles.retryButton}>
                Retry
              </button>
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  if (!invoice) {
    return (
      <Layout>
        <div className={styles.container}>
          <div className={styles.errorState}>
            <div className={styles.errorIcon}>📄</div>
            <h3>Invoice Not Found</h3>
            <p>The requested invoice could not be found.</p>
            <button onClick={() => navigate("/invoices")} className={styles.backButton}>
              Back to Invoices
            </button>
          </div>
        </div>
      </Layout>
    );
  }

  const status = getProcessingStatus();
  const totalCalculated = invoiceItems.reduce((sum, item) => sum + calculateItemTotal(item), 0);

  return (
    <Layout>
      <div className={styles.container}>
        {/* Header */}
        <div className={styles.header}>
          <button onClick={() => navigate("/invoices")} className={styles.backButton}>
            ← Back to Invoices
          </button>
          <h1 className={styles.title}>Invoice Details</h1>
          <div className={styles.statusBadge}>
            <span className={`${styles.status} ${styles[status]}`}>
              {status === 'processed' ? 'Processed' : 'Pending Review'}
            </span>
          </div>
        </div>

        {/* Invoice Information */}
        <div className={styles.invoiceCard}>
          <div className={styles.cardHeader}>
            <h2>Invoice Information</h2>
            {restaurant && (
              <span className={styles.restaurantName}>{restaurant.name}</span>
            )}
          </div>
          
          <div className={styles.invoiceGrid}>
            <div className={styles.invoiceField}>
              <label>Invoice Number</label>
              <span>{invoice.number || "Pending Review"}</span>
            </div>
            
            <div className={styles.invoiceField}>
              <label>Invoice Date</label>
              <span>{invoice.date ? formatDate(invoice.date) : "Pending Review"}</span>
            </div>
            
            <div className={styles.invoiceField}>
              <label>Supplier</label>
              <span>{invoice.supplier || "Pending Review"}</span>
            </div>
            
            <div className={styles.invoiceField}>
              <label>Total Amount</label>
              <span className={styles.totalAmount}>
                {invoice.amount ? formatCurrency(invoice.amount) : "Pending Review"}
              </span>
            </div>
            
            <div className={styles.invoiceField}>
              <label>Upload Date</label>
              <span>{formatDate(invoice.created_at)}</span>
            </div>
            
            <div className={styles.invoiceField}>
              <label>File</label>
              {invoice.file_url ? (
                <a 
                  href={invoice.file_url} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className={styles.fileLink}
                >
                  View Original File →
                </a>
              ) : (
                <span>No file available</span>
              )}
            </div>
          </div>
        </div>

        {/* Invoice Items */}
        {invoiceItems.length > 0 && (
          <div className={styles.itemsCard}>
            <div className={styles.cardHeader}>
              <h2>Invoice Items</h2>
              <span className={styles.itemCount}>{invoiceItems.length} items</span>
            </div>
            
            <div className={styles.tableWrapper}>
              <table className={styles.itemsTable}>
                <thead>
                  <tr>
                    <th>Item Name</th>
                    <th>Quantity</th>
                    <th>Unit</th>
                    <th>Unit Cost</th>
                    <th>Total</th>
                    <th>Linked Ingredient</th>
                  </tr>
                </thead>
                <tbody>
                  {invoiceItems.map((item) => (
                    <tr key={item.id}>
                      <td data-label="Item Name">
                        <span className={styles.itemName}>{item.item_name || "--"}</span>
                      </td>
                      <td data-label="Quantity">
                        {item.quantity || "--"}
                      </td>
                      <td data-label="Unit">
                        {item.unit || "--"}
                      </td>
                      <td data-label="Unit Cost">
                        {formatCurrency(item.unit_cost)}
                      </td>
                      <td data-label="Total">
                        <span className={styles.itemTotal}>
                          {formatCurrency(calculateItemTotal(item))}
                        </span>
                      </td>
                      <td data-label="Linked Ingredient">
                        {item.ingredients ? (
                          <span className={styles.linkedIngredient}>
                            {item.ingredients.name}
                          </span>
                        ) : (
                          <span className={styles.noLink}>Not linked</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className={styles.totalRow}>
                    <td colSpan="4"><strong>Calculated Total:</strong></td>
                    <td><strong>{formatCurrency(totalCalculated)}</strong></td>
                    <td></td>
                  </tr>
                  {invoice.amount && Math.abs(totalCalculated - parseFloat(invoice.amount)) > 0.01 && (
                    <tr className={styles.differenceRow}>
                      <td colSpan="4">Invoice Total:</td>
                      <td>{formatCurrency(invoice.amount)}</td>
                      <td>
                        <span className={styles.difference}>
                          Difference: {formatCurrency(Math.abs(totalCalculated - parseFloat(invoice.amount)))}
                        </span>
                      </td>
                    </tr>
                  )}
                </tfoot>
              </table>
            </div>
          </div>
        )}

        {/* Empty items state */}
        {invoiceItems.length === 0 && status === 'processed' && (
          <div className={styles.emptyItems}>
            <div className={styles.emptyIcon}>📋</div>
            <h3>No Items Found</h3>
            <p>This invoice has been processed but no line items were recorded.</p>
          </div>
        )}

        {/* Pending processing message */}
        {status === 'pending' && (
          <div className={styles.pendingMessage}>
            <div className={styles.pendingIcon}>⏳</div>
            <h3>Pending Review</h3>
            <p>This invoice is waiting to be processed by our admin team. Invoice details and line items will be available once processing is complete.</p>
          </div>
        )}

        {/* File Viewer */}
        {invoice.file_url && (
          <div className={styles.fileViewer}>
            <div className={styles.cardHeader}>
              <h2>Invoice File</h2>
              <a 
                href={invoice.file_url} 
                target="_blank" 
                rel="noopener noreferrer"
                className={styles.openFileButton}
              >
                Open in New Tab →
              </a>
            </div>
            
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
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}