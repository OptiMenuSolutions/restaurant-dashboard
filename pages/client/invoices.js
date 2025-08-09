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
        .select("restaurant_id")
        .eq("id", user.id)
        .single();

      if (error || !data?.restaurant_id) {
        console.error('Restaurant access error:', error);
        return;
      }

      setRestaurantId(data.restaurant_id);
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

  function handleSort(field) {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  }

  function getInvoiceStatus(invoice) {
    const hasAllFields = invoice.number && invoice.date && invoice.supplier && invoice.amount;
    if (!hasAllFields) return { status: 'pending', label: 'Pending Review', color: 'bg-yellow-100 text-yellow-800' };
    return { status: 'processed', label: 'Processed', color: 'bg-green-100 text-green-800' };
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

  const allInvoicesCount = invoices.length;
  const processedInvoicesCount = invoices.filter(inv => getInvoiceStatus(inv).status === 'processed').length;
  const totalValue = invoices.reduce((sum, inv) => sum + (inv.amount || 0), 0);

  return React.createElement(
    ClientLayout,
    {
      pageTitle: "Invoices",
      pageDescription: "Upload and manage your restaurant invoices",
      pageIcon: IconFileText
    },
    React.createElement(
      React.Fragment,
      null,
      // Controls
      React.createElement(
        'div',
        { className: "bg-white border-b border-gray-200 px-6 py-4" },
        React.createElement(
          'div',
          { className: "flex flex-col md:flex-row gap-4 items-center justify-between" },
          React.createElement(
            'div',
            { className: "flex-1 relative" },
            React.createElement(IconSearch, { 
              size: 20, 
              className: "absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" 
            }),
            React.createElement('input', {
              type: "text",
              placeholder: "Search by invoice number or supplier...",
              value: searchTerm,
              onChange: (e) => setSearchTerm(e.target.value),
              className: "w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            })
          ),
          React.createElement(
            'button',
            {
              onClick: () => setShowUploadModal(true),
              className: "flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
            },
            React.createElement(IconUpload, { size: 20 }),
            "Upload Invoices"
          )
        )
      ),

      // Upload Modal
      showUploadModal && React.createElement(
        'div',
        {
          className: "fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50",
          onClick: closeModal
        },
        React.createElement(
          'div',
          {
            className: "bg-white rounded-xl shadow-2xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-hidden",
            onClick: (e) => e.stopPropagation()
          },
          React.createElement(
            'div',
            { className: "flex items-center justify-between p-6 border-b border-gray-200" },
            React.createElement('h2', { className: "text-xl font-semibold text-gray-900" }, "Upload Invoices"),
            React.createElement(
              'button',
              {
                className: "text-gray-400 hover:text-gray-600",
                onClick: closeModal,
                disabled: uploading
              },
              React.createElement(IconX, { size: 24 })
            )
          ),
          React.createElement(
            'div',
            { className: "p-6" },
            // Drag & Drop Zone
            React.createElement(
              'div',
              {
                className: `border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                  dragActive 
                    ? 'border-blue-500 bg-blue-50' 
                    : 'border-gray-300 hover:border-gray-400'
                }`,
                onDragEnter: handleDrag,
                onDragLeave: handleDrag,
                onDragOver: handleDrag,
                onDrop: handleDrop
              },
              React.createElement(
                'div',
                { className: "space-y-4" },
                React.createElement('div', { className: "text-4xl" }, "📁"),
                React.createElement(
                  'div',
                  null,
                  React.createElement('p', { className: "text-lg font-medium text-gray-900" }, "Drag & drop your invoice files here"),
                  React.createElement(
                    'p',
                    { className: "text-gray-600 mt-1" },
                    "or ",
                    React.createElement(
                      'span',
                      {
                        className: "text-blue-600 hover:text-blue-700 cursor-pointer font-medium",
                        onClick: () => document.getElementById('fileInput').click()
                      },
                      "click to browse"
                    )
                  ),
                  React.createElement('p', { className: "text-sm text-gray-500 mt-2" }, "Supports PDF and image files")
                )
              ),
              React.createElement('input', {
                type: "file",
                multiple: true,
                accept: "application/pdf,image/*",
                onChange: handleFileSelect,
                className: "hidden",
                id: "fileInput",
                disabled: uploading
              })
            ),

            // Selected Files
            selectedFiles.length > 0 && React.createElement(
              'div',
              { className: "mt-6" },
              React.createElement(
                'h3',
                { className: "text-lg font-medium text-gray-900 mb-4" },
                `Selected Files (${selectedFiles.length})`
              ),
              React.createElement(
                'div',
                { className: "space-y-3 max-h-40 overflow-y-auto" },
                selectedFiles.map((file, index) => 
                  React.createElement(
                    'div',
                    { key: index, className: "flex items-center justify-between p-3 bg-gray-50 rounded-lg" },
                    React.createElement(
                      'div',
                      { className: "flex-1 min-w-0" },
                      React.createElement('p', { className: "text-sm font-medium text-gray-900 truncate" }, file.name),
                      React.createElement('p', { className: "text-xs text-gray-500" }, `${(file.size / 1024 / 1024).toFixed(2)} MB`)
                    ),
                    uploading && React.createElement(
                      'div',
                      { className: "w-24 bg-gray-200 rounded-full h-2 ml-4" },
                      React.createElement('div', {
                        className: "bg-blue-600 h-2 rounded-full transition-all duration-300",
                        style: { width: `${uploadProgress[index] || 0}%` }
                      })
                    ),
                    !uploading && React.createElement(
                      'button',
                      {
                        className: "ml-4 text-red-600 hover:text-red-700 text-sm font-medium",
                        onClick: () => removeFile(index)
                      },
                      "Remove"
                    )
                  )
                )
              )
            ),

            // Actions
            React.createElement(
              'div',
              { className: "flex justify-end gap-3 mt-6 pt-6 border-t border-gray-200" },
              React.createElement(
                'button',
                {
                  className: "px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors",
                  onClick: closeModal,
                  disabled: uploading
                },
                "Cancel"
              ),
              React.createElement(
                'button',
                {
                  className: "px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed",
                  onClick: handleUpload,
                  disabled: selectedFiles.length === 0 || uploading
                },
                uploading ? 'Uploading...' : `Upload ${selectedFiles.length} File(s)`
              )
            )
          )
        )
      ),

      React.createElement(
        'div',
        { className: "p-6" },
        loading ? React.createElement(
          'div',
          { className: "flex items-center justify-center py-12" },
          React.createElement('div', { className: "w-10 h-10 border-4 border-gray-300 border-t-blue-600 rounded-full animate-spin" }),
          React.createElement('span', { className: "ml-3 text-gray-600" }, "Loading invoices...")
        ) : React.createElement(
          'div',
          { className: "space-y-6" },
          // Confirmation Message
          confirmationMessage && React.createElement(
            'div',
            { className: "bg-green-50 border border-green-200 rounded-lg p-4" },
            React.createElement('p', { className: "text-green-800 font-medium" }, confirmationMessage)
          ),

          // Summary Stats
          React.createElement(
            'div',
            { className: "grid grid-cols-1 md:grid-cols-3 gap-6" },
            React.createElement(
              'div',
              { className: "bg-white border border-gray-200 rounded-xl p-6 shadow-sm" },
              React.createElement(
                'div',
                { className: "flex items-center gap-4" },
                React.createElement(
                  'div',
                  { className: "flex items-center justify-center w-12 h-12 bg-blue-100 rounded-lg" },
                  React.createElement(IconFileText, { size: 24, className: "text-blue-600" })
                ),
                React.createElement(
                  'div',
                  null,
                  React.createElement('p', { className: "text-2xl font-bold text-gray-900" }, allInvoicesCount),
                  React.createElement('p', { className: "text-gray-600" }, "Total Invoices"),
                  React.createElement('p', { className: "text-sm text-gray-500" }, "All uploaded invoices")
                )
              )
            ),
            React.createElement(
              'div',
              { className: "bg-white border border-gray-200 rounded-xl p-6 shadow-sm" },
              React.createElement(
                'div',
                { className: "flex items-center gap-4" },
                React.createElement(
                  'div',
                  { className: "flex items-center justify-center w-12 h-12 bg-green-100 rounded-lg" },
                  React.createElement(IconCheck, { size: 24, className: "text-green-600" })
                ),
                React.createElement(
                  'div',
                  null,
                  React.createElement('p', { className: "text-2xl font-bold text-gray-900" }, processedInvoicesCount),
                  React.createElement('p', { className: "text-gray-600" }, "Processed"),
                  React.createElement('p', { className: "text-sm text-gray-500" }, 
                    `${allInvoicesCount > 0 ? Math.round((processedInvoicesCount / allInvoicesCount) * 100) : 0}% complete`
                  )
                )
              )
            ),
            React.createElement(
              'div',
              { className: "bg-white border border-gray-200 rounded-xl p-6 shadow-sm" },
              React.createElement(
                'div',
                { className: "flex items-center gap-4" },
                React.createElement(
                  'div',
                  { className: "flex items-center justify-center w-12 h-12 bg-emerald-100 rounded-lg" },
                  React.createElement(IconCurrencyDollar, { size: 24, className: "text-emerald-600" })
                ),
                React.createElement(
                  'div',
                  null,
                  React.createElement('p', { className: "text-2xl font-bold text-gray-900" }, `$${totalValue.toFixed(2)}`),
                  React.createElement('p', { className: "text-gray-600" }, "Total Value"),
                  React.createElement('p', { className: "text-sm text-gray-500" }, "Combined invoice amount")
                )
              )
            )
          ),

          // Invoices Table
          React.createElement(
            'div',
            { className: "bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden" },
            filteredAndSortedInvoices.length === 0 ? React.createElement(
              'div',
              { className: "text-center py-12" },
              React.createElement(IconFileText, { size: 48, className: "mx-auto mb-4 text-gray-300" }),
              React.createElement('h3', { className: "text-lg font-medium text-gray-900 mb-2" }, "No Invoices Found"),
              React.createElement('p', { className: "text-gray-600 mb-6" },
                searchTerm 
                  ? `No invoices match "${searchTerm}"`
                  : 'Upload your first invoice to get started with cost tracking!'
              ),
              !searchTerm && React.createElement(
                'button',
                {
                  onClick: () => setShowUploadModal(true),
                  className: "px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                },
                "Upload First Invoice"
              )
            ) : React.createElement(
              'div',
              { className: "overflow-x-auto" },
              React.createElement(
                'table',
                { className: "w-full" },
                React.createElement(
                  'thead',
                  { className: "bg-gray-50 border-b border-gray-200" },
                  React.createElement(
                    'tr',
                    null,
                    React.createElement(
                      'th',
                      {
                        className: "text-left py-4 px-6 text-sm font-semibold text-gray-900 cursor-pointer hover:bg-gray-100",
                        onClick: () => handleSort('number')
                      },
                      React.createElement(
                        'div',
                        { className: "flex items-center gap-2" },
                        "Invoice #",
                        sortField === 'number' && (
                          sortDirection === 'asc' ? React.createElement(IconSortAscending, { size: 16 }) : React.createElement(IconSortDescending, { size: 16 })
                        )
                      )
                    ),
                    React.createElement(
                      'th',
                      {
                        className: "text-left py-4 px-6 text-sm font-semibold text-gray-900 cursor-pointer hover:bg-gray-100",
                        onClick: () => handleSort('date')
                      },
                      React.createElement(
                        'div',
                        { className: "flex items-center gap-2" },
                        "Date",
                        sortField === 'date' && (
                          sortDirection === 'asc' ? React.createElement(IconSortAscending, { size: 16 }) : React.createElement(IconSortDescending, { size: 16 })
                        )
                      )
                    ),
                    React.createElement(
                      'th',
                      {
                        className: "text-left py-4 px-6 text-sm font-semibold text-gray-900 cursor-pointer hover:bg-gray-100",
                        onClick: () => handleSort('supplier')
                      },
                      React.createElement(
                        'div',
                        { className: "flex items-center gap-2" },
                        "Supplier",
                        sortField === 'supplier' && (
                          sortDirection === 'asc' ? React.createElement(IconSortAscending, { size: 16 }) : React.createElement(IconSortDescending, { size: 16 })
                        )
                      )
                    ),
                    React.createElement(
                      'th',
                      {
                        className: "text-left py-4 px-6 text-sm font-semibold text-gray-900 cursor-pointer hover:bg-gray-100",
                        onClick: () => handleSort('amount')
                      },
                      React.createElement(
                        'div',
                        { className: "flex items-center gap-2" },
                        "Amount",
                        sortField === 'amount' && (
                          sortDirection === 'asc' ? React.createElement(IconSortAscending, { size: 16 }) : React.createElement(IconSortDescending, { size: 16 })
                        )
                      )
                    ),
                    React.createElement('th', { className: "text-left py-4 px-6 text-sm font-semibold text-gray-900" }, "Status"),
                    React.createElement(
                      'th',
                      {
                        className: "text-left py-4 px-6 text-sm font-semibold text-gray-900 cursor-pointer hover:bg-gray-100",
                        onClick: () => handleSort('created_at')
                      },
                      React.createElement(
                        'div',
                        { className: "flex items-center gap-2" },
                        "Uploaded",
                        sortField === 'created_at' && (
                          sortDirection === 'asc' ? React.createElement(IconSortAscending, { size: 16 }) : React.createElement(IconSortDescending, { size: 16 })
                        )
                      )
                    ),
                    React.createElement('th', { className: "text-left py-4 px-6 text-sm font-semibold text-gray-900" }, "Actions")
                  )
                ),
                React.createElement(
                  'tbody',
                  { className: "divide-y divide-gray-100" },
                  filteredAndSortedInvoices.map(invoice => {
                    const status = getInvoiceStatus(invoice);
                    
                    return React.createElement(
                      'tr',
                      { key: invoice.id, className: "hover:bg-gray-50" },
                      React.createElement(
                        'td',
                        { className: "py-4 px-6" },
                        React.createElement(
                          'div',
                          { className: "font-medium text-gray-900" },
                          invoice.number || React.createElement('span', { className: "text-gray-400 italic" }, "Pending Review")
                        )
                      ),
                      React.createElement(
                        'td',
                        { className: "py-4 px-6 text-gray-900" },
                        invoice.date 
                          ? new Date(invoice.date).toLocaleDateString()
                          : React.createElement('span', { className: "text-gray-400 italic" }, "Pending Review")
                      ),
                      React.createElement(
                        'td',
                        { className: "py-4 px-6 text-gray-900" },
                        invoice.supplier || React.createElement('span', { className: "text-gray-400 italic" }, "Pending Review")
                      ),
                      React.createElement(
                        'td',
                        { className: "py-4 px-6" },
                        React.createElement(
                          'div',
                          { className: "font-medium text-gray-900" },
                          invoice.amount 
                            ? `$${invoice.amount.toFixed(2)}`
                            : React.createElement('span', { className: "text-gray-400 italic" }, "Pending Review")
                        )
                      ),
                      React.createElement(
                        'td',
                        { className: "py-4 px-6" },
                        React.createElement('span', { className: `inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${status.color}` }, status.label)
                      ),
                      React.createElement(
                        'td',
                        { className: "py-4 px-6 text-gray-900" },
                        React.createElement(
                          'div',
                          { className: "flex items-center gap-2" },
                          React.createElement(IconCalendar, { size: 16, className: "text-gray-400" }),
                          new Date(invoice.created_at).toLocaleDateString()
                        )
                      ),
                      React.createElement(
                        'td',
                        { className: "py-4 px-6" },
                        React.createElement(
                          'button',
                          {
                            onClick: () => router.push(`/client/invoices/${invoice.id}`),
                            className: "flex items-center gap-1 px-3 py-1.5 text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-md transition-colors text-sm",
                            title: "View Details"
                          },
                          React.createElement(IconEye, { size: 16 }),
                          "View"
                        )
                      )
                    );
                  })
                )
              )
            )
          )
        )
      )
    )
  );
}