// pages/client/dashboard.js
import React, { useState, useEffect } from "react";
import { useRouter } from "next/router";
import supabase from "../../lib/supabaseClient";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ResponsiveContainer,
  BarChart,
  Bar,
  Area,
  AreaChart,
} from "recharts";
import {
  IconDashboard,
  IconFileText,
  IconChartBar,
  IconTrendingUp,
  IconAlertTriangle,
  IconCurrencyDollar,
  IconChefHat,
  IconArrowRight,
  IconCalendar,
  IconUsers,
  IconClipboardList,
} from '@tabler/icons-react';
import ClientLayout from '../../components/ClientLayout';

export default function ClientDashboard() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [restaurantId, setRestaurantId] = useState(null);
  const [dashboardData, setDashboardData] = useState({
    totalInvoices: 0,
    totalIngredients: 0,
    totalMenuItems: 0,
    lowMarginItems: [],
    recentInvoices: [],
    ingredientTrends: [],
    menuItemAnalysis: [],
    monthlySpending: [],
    unpricedIngredients: 0,
    averageMargin: 0,
    totalSpending: 0,
    processingStats: { processed: 0, pending: 0 }
  });
  const router = useRouter();

  // Alert thresholds
  const LOW_MARGIN_THRESHOLD = 40;
  const VERY_LOW_MARGIN_THRESHOLD = 25;

  useEffect(() => {
    getRestaurantId();
  }, []);

  useEffect(() => {
    if (restaurantId) {
      fetchDashboardData();
    }
  }, [restaurantId]);

  async function getRestaurantId() {
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      if (userError || !user) {
        setError("Authentication required");
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from("profiles")
        .select("restaurant_id")
        .eq("id", user.id)
        .single();

      if (error || !data?.restaurant_id) {
        setError("Could not determine restaurant access");
        setLoading(false);
        return;
      }

      setRestaurantId(data.restaurant_id);
    } catch (err) {
      setError("An unexpected error occurred");
      setLoading(false);
    }
  }

  async function fetchDashboardData() {
    try {
      setLoading(true);
      setError("");

      // Fetch invoices
      const { data: invoices, error: invoicesError } = await supabase
        .from("invoices")
        .select("*")
        .eq("restaurant_id", restaurantId)
        .order("created_at", { ascending: false });

      if (invoicesError) throw invoicesError;

      // Fetch ingredients
      const { data: ingredients, error: ingredientsError } = await supabase
        .from("ingredients")
        .select("*")
        .eq("restaurant_id", restaurantId);

      if (ingredientsError) throw ingredientsError;

      // Fetch menu items with ingredients
      const { data: menuItems, error: menuItemsError } = await supabase
        .from("menu_items")
        .select(`
          *,
          menu_item_ingredients (
            quantity,
            ingredients (
              last_price
            )
          )
        `)
        .eq("restaurant_id", restaurantId);

      if (menuItemsError) throw menuItemsError;

      // Process data
      const processedData = processDashboardData(invoices, ingredients, menuItems);
      setDashboardData(processedData);

    } catch (err) {
      setError("Failed to fetch dashboard data: " + err.message);
    } finally {
      setLoading(false);
    }
  }

  function processDashboardData(invoices, ingredients, menuItems) {
    const totalInvoices = invoices.length;
    const totalIngredients = ingredients.length;
    const totalMenuItems = menuItems.length;

    // Processing stats
    const processedInvoices = invoices.filter(inv => inv.number && inv.supplier && inv.amount);
    const pendingInvoices = invoices.filter(inv => !inv.number || !inv.supplier || !inv.amount);

    // Total spending
    const totalSpending = processedInvoices.reduce((sum, inv) => sum + parseFloat(inv.amount || 0), 0);

    // Unpriced ingredients
    const unpricedIngredients = ingredients.filter(ing => 
      !ing.last_price || parseFloat(ing.last_price) === 0
    ).length;

    // Recent invoices (last 8)
    const recentInvoices = processedInvoices.slice(0, 8).map(inv => ({
      id: inv.id,
      number: inv.number,
      supplier: inv.supplier,
      amount: inv.amount,
      date: inv.date,
      created_at: inv.created_at
    }));

    // Menu item analysis
    const menuItemAnalysis = menuItems.map(item => {
      const totalCost = calculateMenuItemCost(item);
      const price = parseFloat(item.price || 0);
      const margin = price > 0 ? ((price - totalCost) / price) * 100 : 0;
      
      return {
        id: item.id,
        name: item.name,
        price,
        cost: totalCost,
        margin,
        hasCompleteData: hasCompleteIngredientData(item)
      };
    });

    // Low margin items
    const lowMarginItems = menuItemAnalysis
      .filter(item => item.hasCompleteData && item.price > 0 && item.margin < LOW_MARGIN_THRESHOLD)
      .sort((a, b) => a.margin - b.margin);

    // Average margin
    const itemsWithMargins = menuItemAnalysis.filter(item => 
      item.hasCompleteData && item.price > 0
    );
    const averageMargin = itemsWithMargins.length > 0 
      ? itemsWithMargins.reduce((sum, item) => sum + item.margin, 0) / itemsWithMargins.length
      : 0;

    // Monthly spending trend
    const monthlySpending = calculateMonthlySpending(processedInvoices);

    // Top ingredients by cost
    const ingredientTrends = ingredients
      .filter(ing => ing.last_price > 0)
      .sort((a, b) => parseFloat(b.last_price) - parseFloat(a.last_price))
      .slice(0, 6)
      .map(ing => ({
        name: ing.name.length > 12 ? ing.name.substring(0, 12) + '...' : ing.name,
        fullName: ing.name,
        price: parseFloat(ing.last_price),
        unit: ing.unit
      }));

    return {
      totalInvoices,
      totalIngredients,
      totalMenuItems,
      lowMarginItems,
      recentInvoices,
      ingredientTrends,
      menuItemAnalysis,
      monthlySpending,
      unpricedIngredients,
      averageMargin,
      totalSpending,
      processingStats: {
        processed: processedInvoices.length,
        pending: pendingInvoices.length
      }
    };
  }

  function calculateMenuItemCost(menuItem) {
    if (!menuItem.menu_item_ingredients) return 0;
    
    return menuItem.menu_item_ingredients.reduce((total, ingredient) => {
      const unitCost = parseFloat(ingredient.ingredients?.last_price || 0);
      const quantity = parseFloat(ingredient.quantity || 0);
      return total + (unitCost * quantity);
    }, 0);
  }

  function hasCompleteIngredientData(menuItem) {
    if (!menuItem.menu_item_ingredients || menuItem.menu_item_ingredients.length === 0) {
      return false;
    }
    
    return menuItem.menu_item_ingredients.every(ingredient => 
      ingredient.ingredients?.last_price && parseFloat(ingredient.ingredients.last_price) > 0
    );
  }

  function calculateMonthlySpending(invoices) {
    const monthlyTotals = {};
    
    invoices.forEach(invoice => {
      if (invoice.date && invoice.amount) {
        const date = new Date(invoice.date);
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        const monthName = date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
        
        if (!monthlyTotals[monthKey]) {
          monthlyTotals[monthKey] = { month: monthName, total: 0, invoiceCount: 0 };
        }
        monthlyTotals[monthKey].total += parseFloat(invoice.amount);
        monthlyTotals[monthKey].invoiceCount += 1;
      }
    });

    return Object.values(monthlyTotals)
      .sort((a, b) => a.month.localeCompare(b.month))
      .slice(-6);
  }

  function formatCurrency(amount) {
    if (!amount || amount === null || amount === undefined) {
      return "$0.00";
    }
    
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount)) {
      return "$0.00";
    }
    
    return numAmount.toLocaleString('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    });
  }

  function formatCurrencyDetailed(amount) {
    if (!amount || amount === null || amount === undefined) {
      return "$0.00";
    }
    
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount)) {
      return "$0.00";
    }
    
    return numAmount.toLocaleString('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  }

  function formatDate(dateString) {
    if (!dateString) return "N/A";
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric'
      });
    } catch {
      return "N/A";
    }
  }

  function getMarginColor(margin) {
    if (margin >= 60) return "#10b981";
    if (margin >= 40) return "#3b82f6"; 
    if (margin >= 25) return "#f59e0b";
    return "#ef4444";
  }

  function getAlertLevel(margin) {
    if (margin < VERY_LOW_MARGIN_THRESHOLD) return "critical";
    if (margin < LOW_MARGIN_THRESHOLD) return "warning";
    return "normal";
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">Loading Dashboard</h3>
          <p className="text-gray-600">Analyzing your restaurant data...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-md">
          <div className="text-6xl mb-4">⚠️</div>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">Unable to Load Dashboard</h3>
          <p className="text-gray-600 mb-6">{error}</p>
          <button 
            onClick={() => window.location.reload()} 
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
        <ClientLayout 
        pageTitle="Cost Management Overview" 
        pageDescription="Monitor ingredient costs, track profit margins, and optimize menu pricing"
        pageIcon={IconDashboard}
        >
      <div className="p-6 space-y-8">
        {/* Critical Alerts */}
        {dashboardData.lowMarginItems.length > 0 && (
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center w-10 h-10 bg-red-100 rounded-lg">
                  <IconAlertTriangle size={20} className="text-red-600" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Profit Margin Alerts</h3>
                  <p className="text-sm text-gray-600">
                    {dashboardData.lowMarginItems.length} item{dashboardData.lowMarginItems.length !== 1 ? 's' : ''} need attention
                  </p>
                </div>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {dashboardData.lowMarginItems.slice(0, 3).map(item => (
                <div 
                  key={item.id}
                  className={`p-4 rounded-lg border cursor-pointer hover:shadow-md transition-all ${
                    getAlertLevel(item.margin) === 'critical' ? 'border-red-300 bg-red-50' :
                    getAlertLevel(item.margin) === 'warning' ? 'border-orange-300 bg-orange-50' :
                    'border-gray-200 bg-white'
                  }`}
                  onClick={() => router.push(`/client/menu-items/${item.id}`)}
                >
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-medium text-gray-900 truncate">{item.name}</h4>
                    <span className={`px-2 py-1 rounded text-xs font-semibold ${
                      getAlertLevel(item.margin) === 'critical' ? 'bg-red-200 text-red-800' :
                      getAlertLevel(item.margin) === 'warning' ? 'bg-orange-200 text-orange-800' :
                      'bg-gray-200 text-gray-800'
                    }`}>
                      {item.margin.toFixed(1)}%
                    </span>
                  </div>
                  <div className="space-y-1 text-sm text-gray-600">
                    <div className="flex justify-between">
                      <span>Price:</span>
                      <span>{formatCurrencyDetailed(item.price)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Cost:</span>
                      <span>{formatCurrencyDetailed(item.cost)}</span>
                    </div>
                  </div>
                  <div className="mt-3 text-xs font-medium text-gray-700">
                    {item.margin < VERY_LOW_MARGIN_THRESHOLD ? 
                      "Critical - Review immediately" : 
                      "Consider price adjustment"}
                  </div>
                </div>
              ))}
            </div>
        </div>
        )}

        {/* Key Metrics Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div 
            className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 cursor-pointer hover:shadow-md transition-all"
            onClick={() => router.push('/client/invoices')}
          >
            <div className="flex items-center gap-4">
              <div className="flex items-center justify-center w-12 h-12 bg-blue-100 rounded-lg">
                <IconFileText size={24} className="text-blue-600" />
              </div>
              <div className="flex-1">
                <div className="text-2xl font-bold text-gray-900">{dashboardData.totalInvoices}</div>
                <div className="text-sm font-medium text-gray-700">Total Invoices</div>
                <div className="text-xs text-gray-500">
                  {dashboardData.processingStats.pending > 0 && 
                    `${dashboardData.processingStats.pending} pending review`
                  }
                </div>
              </div>
              <IconArrowRight size={20} className="text-gray-400" />
            </div>
          </div>

          <div 
            className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 cursor-pointer hover:shadow-md transition-all"
            onClick={() => router.push('/client/ingredients')}
          >
            <div className="flex items-center gap-4">
              <div className="flex items-center justify-center w-12 h-12 bg-green-100 rounded-lg">
                <IconClipboardList size={24} className="text-green-600" />
              </div>
              <div className="flex-1">
                <div className="text-2xl font-bold text-gray-900">{dashboardData.totalIngredients}</div>
                <div className="text-sm font-medium text-gray-700">Ingredients</div>
                <div className="text-xs text-gray-500">
                  {dashboardData.unpricedIngredients > 0 ? 
                    `${dashboardData.unpricedIngredients} need pricing` : 
                    'All ingredients priced'
                  }
                </div>
              </div>
              <IconArrowRight size={20} className="text-gray-400" />
            </div>
          </div>

          <div 
            className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 cursor-pointer hover:shadow-md transition-all"
            onClick={() => router.push('/client/menu-items')}
          >
            <div className="flex items-center gap-4">
              <div className="flex items-center justify-center w-12 h-12 bg-purple-100 rounded-lg">
                <IconChefHat size={24} className="text-purple-600" />
              </div>
              <div className="flex-1">
                <div className="text-2xl font-bold text-gray-900">{dashboardData.totalMenuItems}</div>
                <div className="text-sm font-medium text-gray-700">Menu Items</div>
                <div className="text-xs text-gray-500">
                  {dashboardData.lowMarginItems.length > 0 ? 
                    `${dashboardData.lowMarginItems.length} low margin` : 
                    'All items profitable'
                  }
                </div>
              </div>
              <IconArrowRight size={20} className="text-gray-400" />
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
            <div className="flex items-center gap-4">
              <div className="flex items-center justify-center w-12 h-12 bg-yellow-100 rounded-lg">
                <IconCurrencyDollar size={24} className="text-yellow-600" />
              </div>
              <div className="flex-1">
                <div 
                  className="text-2xl font-bold"
                  style={{ color: getMarginColor(dashboardData.averageMargin) }}
                >
                  {dashboardData.averageMargin.toFixed(1)}%
                </div>
                <div className="text-sm font-medium text-gray-700">Average Margin</div>
                <div className="text-xs text-gray-500">
                  {dashboardData.averageMargin >= 50 ? 'Excellent profitability' :
                   dashboardData.averageMargin >= 35 ? 'Good profitability' :
                   'Room for improvement'}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Analytics Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-gray-900">Monthly Spending Trends</h3>
              <p className="text-sm text-gray-600">Ingredient costs over the last 6 months</p>
            </div>
            <div style={{ height: '320px' }}>
              {dashboardData.monthlySpending.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={dashboardData.monthlySpending}>
                    <defs>
                      <linearGradient id="spendingGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.05}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis 
                      dataKey="month" 
                      stroke="#6b7280" 
                      fontSize={12}
                      tickLine={false}
                      axisLine={false}
                    />
                    <YAxis 
                      stroke="#6b7280" 
                      fontSize={12}
                      tickFormatter={(value) => `$${(value/1000).toFixed(0)}k`}
                      tickLine={false}
                      axisLine={false}
                    />
                    <Tooltip 
                      formatter={(value) => [formatCurrency(value), 'Total Spent']}
                      contentStyle={{
                        backgroundColor: 'white',
                        border: '1px solid #e5e7eb',
                        borderRadius: '8px',
                        boxShadow: '0 10px 25px rgba(0,0,0,0.1)'
                      }}
                    />
                    <Area
                      type="monotone"
                      dataKey="total"
                      stroke="#3b82f6"
                      strokeWidth={3}
                      fill="url(#spendingGradient)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-gray-500">
                  <IconTrendingUp size={48} className="mb-4" />
                  <p className="font-medium">No spending data available</p>
                  <span className="text-sm">Process more invoices to see trends</span>
                </div>
              )}
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-gray-900">Top Ingredient Costs</h3>
              <p className="text-sm text-gray-600">Most expensive ingredients per unit</p>
            </div>
            <div style={{ height: '320px' }}>
              {dashboardData.ingredientTrends.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={dashboardData.ingredientTrends} margin={{ left: 20, right: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis 
                      dataKey="name" 
                      stroke="#6b7280" 
                      fontSize={11}
                      tickLine={false}
                      axisLine={false}
                      angle={-45}
                      textAnchor="end"
                      height={60}
                    />
                    <YAxis 
                      stroke="#6b7280" 
                      fontSize={12}
                      tickFormatter={(value) => `$${value.toFixed(0)}`}
                      tickLine={false}
                      axisLine={false}
                    />
                    <Tooltip 
                      formatter={(value, name, props) => [
                        formatCurrencyDetailed(value), 
                        `${props.payload.fullName} (per ${props.payload.unit})`
                      ]}
                      contentStyle={{
                        backgroundColor: 'white',
                        border: '1px solid #e5e7eb',
                        borderRadius: '8px',
                        boxShadow: '0 10px 25px rgba(0,0,0,0.1)'
                      }}
                    />
                    <Bar 
                      dataKey="price" 
                      fill="#10b981"
                      radius={[4, 4, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-gray-500">
                  <IconChartBar size={48} className="mb-4" />
                  <p className="font-medium">No ingredient pricing data</p>
                  <span className="text-sm">Process invoices to track costs</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-gray-900">Recent Invoice Activity</h3>
              <button 
                className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                onClick={() => router.push('/client/invoices')}
              >
                View All
              </button>
            </div>
            <div className="space-y-3">
              {dashboardData.recentInvoices.length > 0 ? (
                dashboardData.recentInvoices.slice(0, 6).map(invoice => (
                  <div 
                    key={invoice.id}
                    className="flex items-center gap-4 p-3 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
                    onClick={() => router.push(`/client/invoices/${invoice.id}`)}
                  >
                    <div className="flex items-center justify-center w-10 h-10 bg-blue-100 rounded-lg">
                      <IconFileText size={16} className="text-blue-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-gray-900 truncate">{invoice.number}</span>
                        <span className="font-semibold text-gray-900">{formatCurrency(invoice.amount)}</span>
                      </div>
                      <div className="flex items-center justify-between text-sm text-gray-500">
                        <span className="truncate">{invoice.supplier}</span>
                        <span>{formatDate(invoice.date)}</span>
                      </div>
                    </div>
                    <IconArrowRight size={16} className="text-gray-400" />
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <IconFileText size={48} className="mx-auto mb-4" />
                  <p className="font-medium">No recent invoices</p>
                  <span className="text-sm">Upload invoices to see activity</span>
                </div>
              )}
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-gray-900">Menu Performance</h3>
              <button 
                className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                onClick={() => router.push('/client/menu-items')}
              >
                View All
              </button>
            </div>
            <div className="space-y-3">
              {dashboardData.menuItemAnalysis.length > 0 ? (
                dashboardData.menuItemAnalysis
                  .filter(item => item.hasCompleteData && item.price > 0)
                  .sort((a, b) => b.margin - a.margin)
                  .slice(0, 6)
                  .map(item => (
                    <div 
                      key={item.id}
                      className="flex items-center gap-4 p-3 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
                      onClick={() => router.push(`/client/menu-items/${item.id}`)}
                    >
                      <div className="flex items-center justify-center w-10 h-10 bg-purple-100 rounded-lg">
                        <IconChefHat size={16} className="text-purple-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <span className="font-medium text-gray-900 truncate">{item.name}</span>
                          <span 
                            className="font-semibold"
                            style={{ color: getMarginColor(item.margin) }}
                          >
                            {item.margin.toFixed(1)}%
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-sm text-gray-500">
                          <span>{formatCurrencyDetailed(item.price)} - {formatCurrencyDetailed(item.cost)}</span>
                          <span>= {formatCurrencyDetailed(item.price - item.cost)}</span>
                        </div>
                      </div>
                      <IconArrowRight size={16} className="text-gray-400" />
                    </div>
                  ))
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <IconChefHat size={48} className="mx-auto mb-4" />
                  <p className="font-medium">No menu items with pricing</p>
                  <span className="text-sm">Add menu items to track performance</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </ClientLayout>
  );
}