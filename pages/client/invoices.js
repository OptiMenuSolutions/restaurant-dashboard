// pages/client/invoices.js
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import ClientLayout from '../../components/ClientLayout';
import supabase from '../../lib/supabaseClient';
import {
  IconFileText,
  IconUpload,
  IconEye,
  IconCalendar,
  IconCurrencyDollar,
  IconCheck,
  IconClock,
  IconAlertTriangle,
  IconX,
  IconSortAscending,
  IconSortDescending,
  IconSearch,
  IconExternalLink,
  IconClipboardList,
} from '@tabler/icons-react';

export default function ClientInvoices() {
  const router = useRouter();
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [restaurantId, setRestaurantId] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortField, setSortField] = useState('created_at');
  const [sortDirection, setSortDirection] = useState('desc');
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState([]);
  const [confirmationMessage, setConfirmationMessage] = useState('');
  const [dragActive, setDragActive] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [invoiceItems, setInvoiceItems] = useState([]);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [userName, setUserName] = useState("");

  const getUserInitials = (name) => {
    if (!name) return "U";
    return name.split(' ')
      .map(part => part.charAt(0))
      .join('')
      .substring(0, 2)
      .toUpperCase();
  }

  useEffect(() => {
    const checkUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/client/login');
        return;
      }
      
      getRestaurantId();
    };
    checkUser();
  }, [router]);

  useEffect(() => {
    if (restaurantId) {
      fetchInvoices();
    }
  }, [restaurantId]);

  async function getRestaurantId() {
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      if (userError || !user) {
        console.error('Authentication error:', userError);
        return;
      }

      const { data, error } = await supabase
        .from("profiles")
        .select("restaurant_id, full_name")
        .eq("id", user.id)
        .single();

      if (error || !data?.restaurant_id) {
        console.error('Restaurant access error:', error);
        return;
      }

      setRestaurantId(data.restaurant_id);
      const firstName = data.full_name ? data.full_name.split(' ')[0] : "User";
      setUserName(firstName);
    } catch (err) {
      console.error('Unexpected error:', err);
    }
  }

  async function fetchInvoices() {
    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('invoices')
        .select('*')
        .eq('restaurant_id', restaurantId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setInvoices(data || []);
    } catch (error) {
      console.error('Error fetching invoices:', error);
    } finally {
      setLoading(false);
    }
  }

  async function fetchInvoiceDetail(invoiceId) {
    try {
      setLoadingDetail(true);
      
      // Fetch invoice items
      const { data: itemsData, error: itemsError } = await supabase
        .from("invoice_items")
        .select(`
          *,
          ingredients (
            name,
            unit
          )
        `)
        .eq("invoice_id", invoiceId)
        .order("item_name");

      if (!itemsError) {
        setInvoiceItems(itemsData || []);
      }
    } catch (error) {
      console.error('Error fetching invoice detail:', error);
      setInvoiceItems([]);
    } finally {
      setLoadingDetail(false);
    }
  }

  function handleInvoiceSelect(invoice) {
    setSelectedInvoice(invoice);
    fetchInvoiceDetail(invoice.id);
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

  function clearSearch() {
    setSearchTerm("");
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

        const { error: uploadError } = await supabase.storage
          .from("invoices")
          .upload(filePath, file);

        if (uploadError) {
          console.error(`Failed to upload ${file.name}:`, uploadError);
          return { success: false, fileName: file.name, error: uploadError.message };
        }

        const publicURL = supabase.storage
          .from("invoices")
          .getPublicUrl(filePath).data.publicUrl;

        const { data: newInvoice, error: insertError } = await supabase
          .from("invoices")
          .insert([
            {
              restaurant_id: restaurantId,
              file_url: publicURL,
            },
          ])
          .select()
          .single();

        if (insertError) {
          console.error(`Failed to save ${file.name} metadata:`, insertError);
          return { success: false, fileName: file.name, error: insertError.message };
        }

        setUploadProgress(prev => {
          const newProgress = [...prev];
          newProgress[index] = 100;
          return newProgress;
        });

        return { success: true, fileName: file.name, invoiceId: newInvoice.id };
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
      fetchInvoices();
    }
    
    if (failureCount > 0) {
      const failedFiles = results.filter(r => !r.success).map(r => r.fileName);
      alert(`Failed to upload: ${failedFiles.join(', ')}`);
    }

    setSelectedFiles([]);
    setShowUploadModal(false);
    setUploading(false);
    setUploadProgress([]);
    
    setTimeout(() => setConfirmationMessage(""), 3000);
  }

  function closeModal() {
    if (!uploading) {
      setShowUploadModal(false);
      setSelectedFiles([]);
      setUploadProgress([]);
    }
  }

  function getInvoiceStatus(invoice) {
    const hasAllFields = invoice.number && invoice.date && invoice.supplier && invoice.amount;
    if (!hasAllFields) return { status: 'pending', label: 'Pending Review', color: 'bg-yellow-100 text-yellow-800' };
    return { status: 'processed', label: 'Processed', color: 'bg-green-100 text-green-800' };
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

  const filteredAndSortedInvoices = invoices
    .filter(invoice => {
      const searchLower = searchTerm.toLowerCase();
      return (
        (invoice.number || '').toLowerCase().includes(searchLower) ||
        (invoice.supplier || '').toLowerCase().includes(searchLower)
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

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">Loading Invoices</h3>
          <p className="text-gray-600">Fetching your invoice data...</p>
        </div>
      </div>
    );
  }

  const totalCalculated = invoiceItems.reduce((sum, item) => sum + calculateItemTotal(item), 0);

  return (
    <ClientLayout
      pageTitle="Invoices"
      pageDescription="Upload and manage your restaurant invoices"
      pageIcon={IconFileText}
    >
      {/* Header Section - All in one line */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Invoice Center</h1>
          <p className="text-gray-600 text-sm mt-1">Track expenses and supplier payments</p>
        </div>
        
        <div className="flex items-center gap-4">
          {/* Search Bar */}
          <div className="relative w-96">
            <input
              type="text"
              placeholder="Search invoices by number or supplier..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white text-sm"
            />
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <IconSearch size={16} className="text-gray-400" />
            </div>
            {searchTerm && (
              <button 
                onClick={clearSearch} 
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
              >
                <IconX size={16} />
              </button>
            )}
          </div>
          
          {/* Upload Button */}
          <button
            onClick={() => setShowUploadModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
          >
            <IconUpload size={16} />
            Upload
          </button>
          
          {/* User Profile Circle */}
          <div className="flex items-center justify-center w-10 h-10 bg-blue-600 text-white rounded-full font-semibold text-sm cursor-pointer hover:bg-blue-700 transition-colors">
            {getUserInitials(userName)}
          </div>
        </div>
      </div>

      {/* Confirmation Message */}
      {confirmationMessage && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
          <p className="text-green-800 font-medium">{confirmationMessage}</p>
        </div>
      )}

      {/* Main Layout - Split View */}
      <div className="flex gap-4 h-[calc(100vh-200px)]">
        
        {/* Invoice List - Left Side (55% width) */}
        <div className="w-[55%] bg-white rounded-xl border border-gray-200 shadow-sm flex flex-col overflow-hidden">
          {/* Header */}
          <div className="p-4 border-b border-gray-200 flex-shrink-0 bg-gradient-to-r from-blue-50 to-indigo-50">
            <h3 className="text-lg font-semibold text-gray-900">Invoice List</h3>
          </div>

          {/* Table Header */}
          <div className="grid grid-cols-4 gap-4 p-4 bg-gray-50 border-b border-gray-200 text-sm font-medium text-gray-900 flex-shrink-0">
            <div>Supplier</div>
            <div>Invoice No.</div>
            <div>Invoice Date</div>
            <div>Amount</div>
          </div>

          {/* Invoice List Content */}
          <div className="flex-1 overflow-y-auto">
            {filteredAndSortedInvoices.length === 0 ? (
              <div className="text-center py-12">
                <IconFileText size={48} className="mx-auto mb-4 text-gray-300" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No Invoices Found</h3>
                <p className="text-gray-600 mb-6">
                  {searchTerm 
                    ? `No invoices match "${searchTerm}"`
                    : 'Upload your first invoice to get started!'
                  }
                </p>
                {!searchTerm && (
                  <button
                    onClick={() => setShowUploadModal(true)}
                    className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    Upload First Invoice
                  </button>
                )}
              </div>
            ) : (
              <div className="space-y-1 p-2">
                {filteredAndSortedInvoices.map(invoice => (
                  <div 
                    key={invoice.id} 
                    className={`grid grid-cols-4 gap-4 p-3 rounded-lg cursor-pointer transition-all duration-200 ${
                      selectedInvoice?.id === invoice.id 
                        ? 'bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-300 shadow-sm' 
                        : 'hover:bg-gradient-to-r hover:from-gray-50 hover:to-blue-25 hover:shadow-sm'
                    }`}
                    onClick={() => handleInvoiceSelect(invoice)}
                  >
                    <div className="truncate">
                      <span className="text-sm text-gray-900">
                        {invoice.supplier || <span className="text-gray-400 italic">Pending</span>}
                      </span>
                    </div>
                    <div className="truncate">
                      <span className="text-sm text-gray-900">
                        {invoice.number || <span className="text-gray-400 italic">Pending</span>}
                      </span>
                    </div>
                    <div className="truncate">
                      <span className="text-sm text-gray-900">
                        {invoice.date ? new Date(invoice.date).toLocaleDateString() : <span className="text-gray-400 italic">Pending</span>}
                      </span>
                    </div>
                    <div className="truncate">
                      <span className="text-sm font-medium text-gray-900">
                        {invoice.amount ? formatCurrency(invoice.amount) : <span className="text-gray-400 italic">Pending</span>}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Invoice Detail - Right Side (45% width) */}
        <div className="w-[45%] bg-white rounded-xl border border-gray-200 shadow-sm flex flex-col overflow-hidden">
          {selectedInvoice ? (
            <>
              {/* Header */}
              <div className="p-4 border-b border-gray-200 flex-shrink-0 bg-gradient-to-r from-emerald-50 to-teal-50">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-gray-900">Invoice Detail</h3>
                  <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getInvoiceStatus(selectedInvoice).color}`}>
                    {getInvoiceStatus(selectedInvoice).label}
                  </span>
                </div>
              </div>

              {/* Detail Content */}
              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                {/* Invoice Information */}
                <div className="space-y-4">
                  <h4 className="text-lg font-semibold text-gray-900 border-b-2 border-blue-200 pb-2">Invoice Information</h4>
                  <div className="grid grid-cols-3 gap-6 bg-gradient-to-br from-gray-50 to-blue-50 p-4 rounded-lg">
                    {/* Row 1 */}
                    <div className="text-center">
                      <div className="text-sm font-bold text-blue-700 mb-2">Invoice No.</div>
                      <div className="text-sm text-gray-700">
                        {selectedInvoice.number || <span className="text-gray-400 italic">Pending Review</span>}
                      </div>
                    </div>
                    <div className="text-center">
                      <div className="text-sm font-bold text-blue-700 mb-2">Invoice Date</div>
                      <div className="text-sm text-gray-700">
                        {selectedInvoice.date ? formatDate(selectedInvoice.date) : <span className="text-gray-400 italic">Pending Review</span>}
                      </div>
                    </div>
                    <div className="text-center">
                      <div className="text-sm font-bold text-blue-700 mb-2">Supplier</div>
                      <div className="text-sm text-gray-700">
                        {selectedInvoice.supplier || <span className="text-gray-400 italic">Pending Review</span>}
                      </div>
                    </div>
                    
                    {/* Row 2 */}
                    <div className="text-center">
                      <div className="text-sm font-bold text-blue-700 mb-2">Upload Date</div>
                      <div className="text-sm text-gray-700">{formatDate(selectedInvoice.created_at)}</div>
                    </div>
                    <div className="text-center">
                      <div className="text-sm font-bold text-blue-700 mb-2">File</div>
                      <div className="text-sm text-gray-700">
                        {selectedInvoice.file_url ? (
                          <a
                            href={selectedInvoice.file_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 px-2 py-1 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded text-xs hover:from-blue-700 hover:to-blue-800 transition-all duration-200 shadow-sm"
                          >
                            View File
                            <IconExternalLink size={10} />
                          </a>
                        ) : (
                          <span className="text-gray-400 italic">No file</span>
                        )}
                      </div>
                    </div>
                    <div className="text-center">
                      <div className="text-sm font-bold text-blue-700 mb-2">Total Amount</div>
                      <div className="text-lg font-bold text-emerald-600">
                        {selectedInvoice.amount ? formatCurrency(selectedInvoice.amount) : <span className="text-gray-400 italic">Pending Review</span>}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Invoice Items */}
                {loadingDetail ? (
                  <div className="text-center py-8">
                    <div className="w-8 h-8 border-4 border-gray-300 border-t-blue-600 rounded-full animate-spin mx-auto mb-2"></div>
                    <span className="text-gray-600">Loading items...</span>
                  </div>
                ) : invoiceItems.length > 0 ? (
                  <div className="space-y-4">
                    <h4 className="text-lg font-semibold text-gray-900 border-b-2 border-emerald-200 pb-2">Invoice Items ({invoiceItems.length})</h4>
                    <div className="space-y-3">
                      {invoiceItems.map((item) => (
                        <div key={item.id} className="border border-gray-200 rounded-lg p-3 bg-gradient-to-r from-gray-50 to-emerald-50 hover:from-gray-100 hover:to-emerald-100 transition-all duration-200">
                          <div className="flex justify-between items-center mb-2">
                            <h5 className="font-medium text-sm text-gray-900">{item.item_name || "--"}</h5>
                            <span className="font-bold text-sm text-emerald-600">{formatCurrency(calculateItemTotal(item))}</span>
                          </div>
                          <div className="grid grid-cols-2 gap-2 text-xs">
                            <div className="flex justify-between">
                              <span className="text-gray-500">Quantity:</span>
                              <span className="text-gray-900">{item.quantity || "--"}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-500">Unit:</span>
                              <span className="text-gray-900">{item.unit || "--"}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-500">Unit Cost:</span>
                              <span className="text-gray-900">{formatCurrency(item.unit_cost)}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-500">Status:</span>
                              {item.ingredients ? (
                                <span className="text-emerald-700 bg-emerald-100 px-1 py-0.5 rounded text-xs font-medium">
                                  Linked
                                </span>
                              ) : (
                                <span className="text-orange-600 bg-orange-100 px-1 py-0.5 rounded text-xs">Not linked</span>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="border-t border-gray-200 pt-3 bg-gradient-to-r from-emerald-50 to-blue-50 rounded-lg p-3">
                      <div className="flex justify-between text-sm font-bold text-gray-900">
                        <span>Calculated Total:</span>
                        <span className="text-emerald-600">{formatCurrency(totalCalculated)}</span>
                      </div>
                      {selectedInvoice.amount && Math.abs(totalCalculated - parseFloat(selectedInvoice.amount)) > 0.01 && (
                        <div className="flex justify-between text-red-600 text-xs mt-1 font-medium">
                          <span>Difference:</span>
                          <span>{formatCurrency(Math.abs(totalCalculated - parseFloat(selectedInvoice.amount)))}</span>
                        </div>
                      )}
                    </div>
                  </div>
                ) : getInvoiceStatus(selectedInvoice).status === 'processed' ? (
                  <div className="text-center py-12">
                    <IconClipboardList size={48} className="mx-auto mb-4 text-gray-300" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No Items Found</h3>
                    <p className="text-gray-600">This invoice has been processed but no line items were recorded.</p>
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <IconClock size={48} className="mx-auto mb-4 text-yellow-500" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">Pending Review</h3>
                    <p className="text-gray-600">This invoice is waiting to be processed. Items will be available once processing is complete.</p>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <IconFileText size={64} className="mx-auto mb-4 text-gray-300" />
                <h3 className="text-xl font-medium text-gray-900 mb-2">Select an Invoice</h3>
                <p className="text-gray-600">Choose an invoice from the list to view its details</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Upload Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={closeModal}>
          <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900">Upload Invoices</h2>
              <button className="text-gray-400 hover:text-gray-600" onClick={closeModal} disabled={uploading}>
                <IconX size={24} />
              </button>
            </div>
            <div className="p-6">
              {/* Drag & Drop Zone */}
              <div
                className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                  dragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-gray-400'
                }`}
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
              >
                <div className="space-y-4">
                  <div className="text-4xl">📁</div>
                  <div>
                    <p className="text-lg font-medium text-gray-900">Drag & drop your invoice files here</p>
                    <p className="text-gray-600 mt-1">
                      or{" "}
                      <span
                        className="text-blue-600 hover:text-blue-700 cursor-pointer font-medium"
                        onClick={() => document.getElementById('fileInput').click()}
                      >
                        click to browse
                      </span>
                    </p>
                    <p className="text-sm text-gray-500 mt-2">Supports PDF and image files</p>
                  </div>
                </div>
                <input
                  type="file"
                  multiple
                  accept="application/pdf,image/*"
                  onChange={handleFileSelect}
                  className="hidden"
                  id="fileInput"
                  disabled={uploading}
                />
              </div>

              {/* Selected Files */}
              {selectedFiles.length > 0 && (
                <div className="mt-6">
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Selected Files ({selectedFiles.length})</h3>
                  <div className="space-y-3 max-h-40 overflow-y-auto">
                    {selectedFiles.map((file, index) => (
                      <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">{file.name}</p>
                          <p className="text-xs text-gray-500">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                        </div>
                        {uploading && (
                          <div className="w-24 bg-gray-200 rounded-full h-2 ml-4">
                            <div
                              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                              style={{ width: `${uploadProgress[index] || 0}%` }}
                            />
                          </div>
                        )}
                        {!uploading && (
                          <button
                            className="ml-4 text-red-600 hover:text-red-700 text-sm font-medium"
                            onClick={() => removeFile(index)}
                          >
                            Remove
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="flex justify-end gap-3 mt-6 pt-6 border-t border-gray-200">
                <button
                  className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                  onClick={closeModal}
                  disabled={uploading}
                >
                  Cancel
                </button>
                <button
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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
    </ClientLayout>
  );
}