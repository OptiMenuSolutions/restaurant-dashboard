// File: src/pages/Invoices.js - PRODUCTION VERSION
import React, { useState, useEffect } from "react";
import styles from "./Invoices.module.css";
import { useNavigate } from "react-router-dom";
import supabase from "../supabaseClient";
import Layout from "../components/Layout";

export default function Invoices() {
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState([]);
  const [confirmationMessage, setConfirmationMessage] = useState("");
  const [restaurantId, setRestaurantId] = useState(null);
  const [dragActive, setDragActive] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    getRestaurantId();
  }, []);

  useEffect(() => {
    if (restaurantId) {
      fetchInvoices();
    }
  }, [restaurantId]);

  async function getRestaurantId() {
    try {
      const {
        data: { user },
        error: userError
      } = await supabase.auth.getUser();

      if (userError) {
        setError("Failed to get user information");
        setLoading(false);
        return;
      }

      if (!user) {
        setError("No authenticated user found");
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from("profiles")
        .select("restaurant_id")
        .eq("id", user.id)
        .single();

      if (error) {
        setError("Failed to get restaurant information");
        setLoading(false);
        return;
      }

      if (!data?.restaurant_id) {
        setError("No restaurant associated with this account");
        setLoading(false);
        return;
      }

      setRestaurantId(data.restaurant_id);
    } catch (err) {
      setError("An unexpected error occurred");
      setLoading(false);
    }
  }

  async function fetchInvoices() {
    try {
      setLoading(true);
      setError("");

      const { data, error } = await supabase
        .from("invoices")
        .select("*")
        .eq("restaurant_id", restaurantId)
        .order("created_at", { ascending: false });

      if (error) {
        setError("Failed to fetch invoices");
        return;
      }

      setInvoices(data || []);
    } catch (err) {
      setError("An unexpected error occurred while fetching invoices");
    } finally {
      setLoading(false);
    }
  }

  function handleDrag(e) {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  }

  function handleDrop(e) {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    const files = Array.from(e.dataTransfer.files);
    const validFiles = files.filter(file => 
      file.type === 'application/pdf' || file.type.startsWith('image/')
    );
    
    if (validFiles.length !== files.length) {
      alert('Only PDF and image files are allowed.');
    }
    
    setSelectedFiles(prev => [...prev, ...validFiles]);
  }

  function handleFileSelect(e) {
    const files = Array.from(e.target.files);
    setSelectedFiles(prev => [...prev, ...files]);
  }

  function removeFile(index) {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  }

  async function handleUpload() {
    if (selectedFiles.length === 0) {
      alert("Please select at least one file.");
      return;
    }

    if (!restaurantId) {
      alert("Restaurant information not found. Please try logging out and back in.");
      return;
    }

    setUploading(true);
    setUploadProgress(new Array(selectedFiles.length).fill(0));
    
    const uploadPromises = selectedFiles.map(async (file, index) => {
      try {
        const fileExt = file.name.split(".").pop();
        const timestamp = Date.now();
        const filePath = `invoices/${restaurantId}/${timestamp}-${index}.${fileExt}`;

        // Upload file to storage
        const { error: uploadError } = await supabase.storage
          .from("invoices")
          .upload(filePath, file);

        if (uploadError) {
          console.error(`Failed to upload ${file.name}:`, uploadError);
          return { success: false, fileName: file.name, error: uploadError.message };
        }

        // Get public URL
        const publicURL = supabase.storage
          .from("invoices")
          .getPublicUrl(filePath).data.publicUrl;

        // Insert into database
        const { error: insertError } = await supabase.from("invoices").insert([
          {
            restaurant_id: restaurantId,
            file_url: publicURL,
            // date, number, supplier, amount will be filled by admin
          },
        ]);

        if (insertError) {
          console.error(`Failed to save ${file.name} metadata:`, insertError);
          return { success: false, fileName: file.name, error: insertError.message };
        }

        // Update progress
        setUploadProgress(prev => {
          const newProgress = [...prev];
          newProgress[index] = 100;
          return newProgress;
        });

        return { success: true, fileName: file.name };
      } catch (error) {
        console.error(`Error processing ${file.name}:`, error);
        return { success: false, fileName: file.name, error: error.message };
      }
    });

    const results = await Promise.all(uploadPromises);
    
    const successCount = results.filter(r => r.success).length;
    const failureCount = results.filter(r => !r.success).length;
    
    if (successCount > 0) {
      setConfirmationMessage(`${successCount} invoice(s) uploaded successfully!`);
      fetchInvoices(); // Refresh the list
    }
    
    if (failureCount > 0) {
      const failedFiles = results.filter(r => !r.success).map(r => r.fileName);
      alert(`Failed to upload: ${failedFiles.join(', ')}`);
    }

    // Reset form
    setSelectedFiles([]);
    setShowUploadModal(false);
    setUploading(false);
    setUploadProgress([]);
    
    // Clear confirmation message after 3 seconds
    setTimeout(() => setConfirmationMessage(""), 3000);
  }

  function closeModal() {
    if (!uploading) {
      setShowUploadModal(false);
      setSelectedFiles([]);
      setUploadProgress([]);
    }
  }

  function formatDate(dateString) {
    if (!dateString) return "Not provided";
    try {
      return new Date(dateString).toLocaleDateString();
    } catch {
      return "Invalid date";
    }
  }

  function getInvoiceStatus(invoice) {
    // Invoice is considered processed if it has all key fields filled
    const isProcessed = invoice.number && invoice.date && invoice.supplier && invoice.amount;
    return isProcessed ? 'processed' : 'pending';
  }

  function formatCurrency(amount) {
    if (!amount || amount === null || amount === undefined) {
      return (
        <span className={styles.currencyValue}>
          <span className={styles.currencySymbol}>$</span>
          <span className={styles.currencyAmount}>--</span>
        </span>
      );
    }
    
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount)) {
      return (
        <span className={styles.currencyValue}>
          <span className={styles.currencySymbol}>$</span>
          <span className={styles.currencyAmount}>--</span>
        </span>
      );
    }
    
    const formattedAmount = numAmount.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
    
    return (
      <span className={styles.currencyValue}>
        <span className={styles.currencySymbol}>$</span>
        <span className={styles.currencyAmount}>{formattedAmount}</span>
      </span>
    );
  }

  if (loading) {
    return (
      <Layout>
        <div className={styles.container}>
          <div style={{ textAlign: 'center', padding: '2rem' }}>
            <p>Loading invoices...</p>
          </div>
        </div>
      </Layout>
    );
  }

  if (error) {
    return (
      <Layout>
        <div className={styles.container}>
          <div style={{ textAlign: 'center', padding: '2rem', color: 'red' }}>
            <p>Error: {error}</p>
            <button onClick={() => window.location.reload()}>Retry</button>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className={styles.container}>
        <h1 className={styles.heading}>Invoices</h1>

        <button
          className={styles.uploadButton}
          onClick={() => setShowUploadModal(true)}
        >
          Upload Invoices
        </button>

        {/* Upload Modal */}
        {showUploadModal && (
          <div className={styles.modalOverlay} onClick={closeModal}>
            <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
              <div className={styles.modalHeader}>
                <h2>Upload Invoices</h2>
                <button 
                  className={styles.closeButton} 
                  onClick={closeModal}
                  disabled={uploading}
                >
                  ×
                </button>
              </div>
              
              <div className={styles.modalContent}>
                {/* Drag & Drop Zone */}
                <div 
                  className={`${styles.dropZone} ${dragActive ? styles.dragActive : ''}`}
                  onDragEnter={handleDrag}
                  onDragLeave={handleDrag}
                  onDragOver={handleDrag}
                  onDrop={handleDrop}
                >
                  <div className={styles.dropZoneContent}>
                    <div className={styles.uploadIcon}>📁</div>
                    <p>Drag & drop your invoice files here</p>
                    <p>or <span 
                      className={styles.browseText}
                      onClick={() => document.getElementById('fileInput').click()}
                    >click to browse</span></p>
                    <small>Supports PDF and image files</small>
                  </div>
                  <input
                    type="file"
                    multiple
                    accept="application/pdf,image/*"
                    onChange={handleFileSelect}
                    style={{ display: 'none' }}
                    id="fileInput"
                    disabled={uploading}
                  />
                </div>

                {/* Selected Files List */}
                {selectedFiles.length > 0 && (
                  <div className={styles.filesList}>
                    <h3>Selected Files ({selectedFiles.length})</h3>
                    {selectedFiles.map((file, index) => (
                      <div key={index} className={styles.fileItem}>
                        <span className={styles.fileName}>{file.name}</span>
                        <span className={styles.fileSize}>
                          {(file.size / 1024 / 1024).toFixed(2)} MB
                        </span>
                        {uploading && (
                          <div className={styles.progressBar}>
                            <div 
                              className={styles.progressFill}
                              style={{ width: `${uploadProgress[index] || 0}%` }}
                            ></div>
                          </div>
                        )}
                        {!uploading && (
                          <button 
                            className={styles.removeButton}
                            onClick={() => removeFile(index)}
                          >
                            Remove
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {/* Upload Button */}
                <div className={styles.modalActions}>
                  <button 
                    className={styles.cancelButton}
                    onClick={closeModal}
                    disabled={uploading}
                  >
                    Cancel
                  </button>
                  <button 
                    className={styles.uploadButtonModal}
                    onClick={handleUpload}
                    disabled={selectedFiles.length === 0 || uploading}
                  >
                    {uploading ? 'Uploading...' : `Upload ${selectedFiles.length} File(s)`}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {confirmationMessage && (
          <p className={styles.confirmation}>{confirmationMessage}</p>
        )}

        {/* Invoices Table */}
        {invoices.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '2rem' }}>
            <p>No invoices found. Upload your first invoice to get started!</p>
          </div>
        ) : (
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Upload Date</th>
                <th>Invoice No.</th>
                <th>Invoice Date</th>
                <th>Supplier</th>
                <th>Total Amount</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {invoices.map((invoice) => {
                const status = getInvoiceStatus(invoice);
                return (
                  <tr
                    key={invoice.id}
                    onClick={() => navigate(`/invoices/${invoice.id}`)}
                    className={styles.clickableRow}
                  >
                    <td data-label="Upload Date">{formatDate(invoice.created_at)}</td>
                    <td data-label="Invoice No.">{invoice.number || 'Pending Review'}</td>
                    <td data-label="Invoice Date">{invoice.date ? formatDate(invoice.date) : 'Pending Review'}</td>
                    <td data-label="Supplier">{invoice.supplier || 'Pending Review'}</td>
                    <td data-label="Total Amount">{invoice.amount ? formatCurrency(invoice.amount) : 'Pending Review'}</td>
                    <td data-label="Status">
                      <span className={`${styles.status} ${styles[status]}`}>
                        {status === 'processed' ? 'Processed' : 'Pending Review'}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </Layout>
  );
}