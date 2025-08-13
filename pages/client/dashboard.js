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
  IconClipboardList,
  IconBrain,
  IconStar,
  IconActivity,
  IconSparkles,
  IconTrendingDown,
} from '@tabler/icons-react';
import ClientLayout from '../../components/ClientLayout';

// Add this style component
const GeometricBackground = ({ children }) => (
  <>
    <style jsx>{`
      .geometric-pattern {
        background-image: 
          radial-gradient(circle at 25px 25px, rgba(59, 130, 246, 0.05) 2px, transparent 2px),
          radial-gradient(circle at 75px 75px, rgba(59, 130, 246, 0.03) 1px, transparent 1px);
        background-size: 100px 100px, 50px 50px;
        background-position: 0 0, 25px 25px;
      }
    `}</style>
    <div className="geometric-pattern min-h-screen">
      {children}
    </div>
  </>
);

export default function ClientDashboard() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [restaurantId, setRestaurantId] = useState(null);
  const [marginView, setMarginView] = useState("Highest-Margin"); // "Highest-Margin" or "Lowest-Margin"
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
  const [userName, setUserName] = useState("");

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
      .select("restaurant_id, full_name")
      .eq("id", user.id)
      .single();

    if (error || !data?.restaurant_id) {
      setError("Could not determine restaurant access");
      setLoading(false);
      return;
    }

    setRestaurantId(data.restaurant_id);
    const firstName = data.full_name ? data.full_name.split(' ')[0] : "User";
    setUserName(firstName);
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

    const processedInvoices = invoices.filter(inv => inv.number && inv.supplier && inv.amount);
    const pendingInvoices = invoices.filter(inv => !inv.number || !inv.supplier || !inv.amount);
    const totalSpending = processedInvoices.reduce((sum, inv) => sum + parseFloat(inv.amount || 0), 0);
    const unpricedIngredients = ingredients.filter(ing => !ing.last_price || parseFloat(ing.last_price) === 0).length;

    const recentInvoices = processedInvoices.slice(0, 3).map(inv => ({
      id: inv.id, number: inv.number, supplier: inv.supplier, amount: inv.amount, date: inv.date, created_at: inv.created_at
    }));

    const menuItemAnalysis = menuItems.map(item => {
      const totalCost = calculateMenuItemCost(item);
      const price = parseFloat(item.price || 0);
      const margin = price > 0 ? ((price - totalCost) / price) * 100 : 0;
      return { id: item.id, name: item.name, price, cost: totalCost, margin, hasCompleteData: hasCompleteIngredientData(item) };
    });

    const lowMarginItems = menuItemAnalysis
      .filter(item => item.hasCompleteData && item.price > 0 && item.margin < LOW_MARGIN_THRESHOLD)
      .sort((a, b) => a.margin - b.margin);

    const itemsWithMargins = menuItemAnalysis.filter(item => item.hasCompleteData && item.price > 0);
    const averageMargin = itemsWithMargins.length > 0 ? itemsWithMargins.reduce((sum, item) => sum + item.margin, 0) / itemsWithMargins.length : 0;

    const monthlySpending = calculateMonthlySpending(processedInvoices);

    const ingredientTrends = ingredients
      .filter(ing => ing.last_price > 0)
      .sort((a, b) => parseFloat(b.last_price) - parseFloat(a.last_price))
      .slice(0, 3)
      .map(ing => ({
        name: ing.name.length > 15 ? ing.name.substring(0, 15) + '...' : ing.name,
        fullName: ing.name,
        price: parseFloat(ing.last_price),
        unit: ing.unit
      }));

    return {
      totalInvoices, totalIngredients, totalMenuItems, lowMarginItems, recentInvoices,
      ingredientTrends, menuItemAnalysis, monthlySpending, unpricedIngredients,
      averageMargin, totalSpending, processingStats: { processed: processedInvoices.length, pending: pendingInvoices.length }
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
    if (!menuItem.menu_item_ingredients || menuItem.menu_item_ingredients.length === 0) return false;
    return menuItem.menu_item_ingredients.every(ingredient => 
      ingredient.ingredients?.last_price && parseFloat(ingredient.ingredients.last_price) > 0
    );
  }

  function calculateMonthlySpending(invoices) {
  const currentYear = new Date().getFullYear();
  const monthlyTotals = {};
  
  // Initialize all months of current year with zero
  for (let month = 1; month <= 12; month++) {
    const monthKey = `${currentYear}-${String(month).padStart(2, '0')}`;
    const monthName = new Date(currentYear, month - 1).toLocaleDateString('en-US', { month: 'short' });
    monthlyTotals[monthKey] = { month: monthName, total: 0, invoiceCount: 0, monthNumber: month };
  }
  
  // Add actual invoice data
  invoices.forEach(invoice => {
    if (invoice.date && invoice.amount) {
      const date = new Date(invoice.date);
      if (date.getFullYear() === currentYear) {
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        if (monthlyTotals[monthKey]) {
          monthlyTotals[monthKey].total += parseFloat(invoice.amount);
          monthlyTotals[monthKey].invoiceCount += 1;
        }
      }
    }
  });

  return Object.values(monthlyTotals).sort((a, b) => a.monthNumber - b.monthNumber);
}

  function formatCurrency(amount) {
    if (!amount) return "$0";
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount)) return "$0";
    return numAmount.toLocaleString('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0, maximumFractionDigits: 0 });
  }

  function formatCurrencyDetailed(amount) {
    if (!amount) return "$0.00";
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount)) return "$0.00";
    return numAmount.toLocaleString('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  function formatDate(dateString) {
    if (!dateString) return "N/A";
    try {
      return new Date(dateString).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
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

  const getMarginItems = () => {
    const itemsWithMargins = dashboardData.menuItemAnalysis.filter(item => 
      item.hasCompleteData && item.price > 0
    );
    
    if (marginView === "Highest-Margin") {
      return itemsWithMargins.sort((a, b) => b.margin - a.margin).slice(0, 3);
    } else {
      return itemsWithMargins.sort((a, b) => a.margin - b.margin).slice(0, 3);
    }
  };

  const getUserInitials = (name) => {
    if (!name) return "U";
    return name.split(' ')
      .map(part => part.charAt(0))
      .join('')
      .substring(0, 2)
      .toUpperCase();
  };

  return (
    <GeometricBackground>
      <ClientLayout>
        {/* Header with Welcome Message, Search Bar, and Profile */}
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Welcome Back, {userName}!</h1>
          <div className="flex items-center gap-4">
            <div className="relative w-96">
              <input
                type="text"
                placeholder="Search invoices, ingredients, menu items..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white text-sm"
              />
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <svg className="h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
            </div>
            <div className="flex items-center justify-center w-10 h-10 bg-blue-600 text-white rounded-full font-semibold text-sm cursor-pointer hover:bg-blue-700 transition-colors">
              {getUserInitials(userName)}
            </div>
          </div>
        </div>

        {/* Dashboard Grid Layout */}
        <div className="grid grid-cols-12 grid-rows-12 gap-4 h-[calc(100vh-160px)]">
          
          {/* AI Profit Score - Left column (2 wide, 12 tall) */}
          <div className="col-span-2 row-span-12 bg-white rounded-xl border border-gray-200 shadow-sm p-4 flex flex-col overflow-hidden">
            <div className="text-center flex-shrink-0">
              <div className="flex items-center justify-center gap-2 mb-2">
                <IconBrain size={16} className="text-blue-600" />
                <h3 className="text-sm font-semibold text-gray-900">AI Profit Score</h3>
              </div>
              <p className="text-xs text-gray-500 mb-3">Daily optimization rating</p>
            </div>
            <div className="flex-1 flex items-center justify-center min-h-0">
              <div className="relative w-32 h-32 sm:w-40 sm:h-40">
                <svg className="w-full h-full transform -rotate-90" viewBox="0 0 200 200">
                  <circle
                    cx="100"
                    cy="100"
                    r="90"
                    stroke="#e5e7eb"
                    strokeWidth="12"
                    fill="transparent"
                  />
                  <circle
                    cx="100"
                    cy="100"
                    r="90"
                    stroke="#10b981"
                    strokeWidth="12"
                    fill="transparent"
                    strokeDasharray={`${(87 / 100) * (2 * Math.PI * 90)} ${2 * Math.PI * 90}`}
                    strokeLinecap="round"
                    className="transition-all duration-1000 ease-out"
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-center">
                    <div className="text-3xl sm:text-4xl font-bold text-gray-900">87</div>
                    <div className="text-sm text-gray-500">Score</div>
                  </div>
                </div>
              </div>
            </div>
            <div className="text-center flex-shrink-0">
              <div className="text-xs text-gray-600 mb-2 px-1">
                Based on margin analysis and pricing optimization
              </div>
              <div className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                Excellent
              </div>
            </div>
          </div>

          {/* AI Daily Dish Recommendations - Top right (10 wide, 6 tall) */}
          <div className="col-span-10 row-span-4 bg-white rounded-xl border border-gray-200 shadow-sm p-4 flex flex-col overflow-hidden">
            <div className="flex items-center gap-3 mb-3 flex-shrink-0">
              <div className="flex items-center justify-center w-8 h-8 bg-gradient-to-br from-purple-100 to-pink-100 rounded-lg">
                <IconSparkles size={16} className="text-purple-600" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-gray-900">AI Daily Dish Recommendations</h3>
                <p className="text-xs text-gray-500">Optimized for profit and inventory turnover</p>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 flex-1 min-h-0">
              <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-lg p-2 border border-green-100 flex flex-col justify-between overflow-hidden">
                <div>
                  <div className="flex items-center gap-1 mb-1">
                    <div className="w-4 h-4 bg-green-500 rounded-full flex items-center justify-center text-white text-xs font-bold">1</div>
                    <span className="text-xs font-medium text-green-800">Top Pick</span>
                  </div>
                  <h4 className="font-semibold text-gray-900 mb-1 text-sm truncate">Caesar Salad</h4>
                  <p className="text-xs text-gray-600 mb-1">Fresh ingredients, 68% margin</p>
                </div>
                <div className="text-xs font-medium text-green-700">Push today</div>
              </div>
              <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg p-2 border border-blue-100 flex flex-col justify-between overflow-hidden">
                <div>
                  <div className="flex items-center gap-1 mb-1">
                    <div className="w-4 h-4 bg-blue-500 rounded-full flex items-center justify-center text-white text-xs font-bold">2</div>
                    <span className="text-xs font-medium text-blue-800">High Profit</span>
                  </div>
                  <h4 className="font-semibold text-gray-900 mb-1 text-sm truncate">Grilled Salmon</h4>
                  <p className="text-xs text-gray-600 mb-1">Premium pricing, fast turnover</p>
                </div>
                <div className="text-xs font-medium text-blue-700">Recommend</div>
              </div>
              <div className="bg-gradient-to-br from-orange-50 to-amber-50 rounded-lg p-2 border border-orange-100 flex flex-col justify-between overflow-hidden">
                <div>
                  <div className="flex items-center gap-1 mb-1">
                    <div className="w-4 h-4 bg-orange-500 rounded-full flex items-center justify-center text-white text-xs font-bold">3</div>
                    <span className="text-xs font-medium text-orange-800">Clear Stock</span>
                  </div>
                  <h4 className="font-semibold text-gray-900 mb-1 text-sm truncate">Pasta Carbonara</h4>
                  <p className="text-xs text-gray-600 mb-1">Ingredients aging, good margin</p>
                </div>
                <div className="text-xs font-medium text-orange-700">Move today</div>
              </div>
            </div>
          </div>

          {/* Monthly Spending Chart - Top right (5 wide, 6 tall) */}
          <div className="col-span-5 row-span-8 bg-white rounded-xl border border-gray-200 shadow-sm p-4 cursor-pointer hover:shadow-md transition-shadow flex flex-col overflow-hidden"
              onClick={() => router.push('/client/invoices')}>
            <div className="flex items-center justify-between mb-3 flex-shrink-0">
              <h3 className="text-sm font-semibold text-gray-900">Monthly Spending</h3>
              <IconArrowRight size={16} className="text-gray-400" />
            </div>
            <div className="flex-1 min-h-0 w-full">
              {dashboardData.monthlySpending.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={dashboardData.monthlySpending} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                    <XAxis 
                      dataKey="month" 
                      stroke="#6b7280" 
                      fontSize={10}
                      tickLine={false}
                      axisLine={false}
                    />
                    <YAxis 
                      stroke="#6b7280" 
                      fontSize={10}
                      tickFormatter={(value) => `${(value/1000).toFixed(0)}k`}
                      tickLine={false}
                      axisLine={false}
                    />
                    <Tooltip 
                      formatter={(value) => [formatCurrency(value), 'Total Spent']}
                      contentStyle={{
                        backgroundColor: 'white',
                        border: '1px solid #e5e7eb',
                        borderRadius: '8px',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                        fontSize: '11px'
                      }}
                    />
                    <Bar 
                      dataKey="total" 
                      fill="#3b82f6"
                      radius={[2, 2, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-gray-500">
                  <IconChartBar size={24} className="mb-2" />
                  <p className="text-xs">No spending data</p>
                </div>
              )}
            </div>
          </div>

          {/* Menu Analysis - Top right (5 wide, 6 tall) */}
          <div className="col-span-5 row-span-8 bg-white rounded-xl border border-gray-200 shadow-sm p-4 flex flex-col overflow-hidden">
            <div className="flex items-center justify-between mb-3 flex-shrink-0">
              <h3 className="text-sm font-semibold text-gray-900">Menu Analysis</h3>
              <div className="flex bg-gray-100 rounded-md p-0.5">
                <button
                  onClick={() => setMarginView("Highest-Margin")}
                  className={`px-2 py-1 rounded text-xs font-medium transition-colors ${
                    marginView === "Highest-Margin" 
                      ? 'bg-white text-gray-900 shadow-sm' 
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  High
                </button>
                <button
                  onClick={() => setMarginView("Lowest-Margin")}
                  className={`px-2 py-1 rounded text-xs font-medium transition-colors ${
                    marginView === "Lowest-Margin" 
                      ? 'bg-white text-gray-900 shadow-sm' 
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  Low
                </button>
              </div>
            </div>
            <div className="space-y-2 flex-1 overflow-y-auto">
              {getMarginItems().slice(0, 4).map((item, index) => (
                <div key={item.id} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg flex-shrink-0">
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium text-gray-900 text-sm truncate">{item.name}</h4>
                    <p className="text-xs text-gray-500">{formatCurrencyDetailed(item.price)}</p>
                  </div>
                  <div className="text-right ml-2 flex-shrink-0">
                    <div 
                      className="font-semibold text-sm"
                      style={{ color: getMarginColor(item.margin) }}
                    >
                      {item.margin.toFixed(1)}%
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Top Ingredient Costs - Bottom left (4 wide, 6 tall) */}
          <div className="col-span-4 row-span-6 bg-white rounded-xl border border-gray-200 shadow-sm p-4 flex flex-col overflow-hidden">
            <h3 className="text-sm font-semibold text-gray-900 mb-3 flex-shrink-0">Top Ingredient Costs</h3>
            <div className="space-y-2 flex-1 overflow-y-auto">
              {dashboardData.ingredientTrends.map((ingredient, index) => (
                <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg flex-shrink-0">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 text-sm truncate">{ingredient.fullName}</p>
                    <p className="text-xs text-gray-500">per {ingredient.unit}</p>
                  </div>
                  <div className="text-right ml-2 flex-shrink-0">
                    <p className="font-semibold text-gray-900 text-sm">{formatCurrencyDetailed(ingredient.price)}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Recent Invoices - Bottom middle (4 wide, 6 tall) */}
          <div className="col-span-4 row-span-6 bg-white rounded-xl border border-gray-200 shadow-sm p-4 flex flex-col overflow-hidden">
            <div className="flex items-center justify-between mb-3 flex-shrink-0">
              <h3 className="text-sm font-semibold text-gray-900">Recent Invoices</h3>
              <button 
                onClick={() => router.push('/client/invoices')}
                className="text-blue-600 hover:text-blue-700 text-xs font-medium flex-shrink-0"
              >
                View All
              </button>
            </div>
            <div className="space-y-2 flex-1 overflow-y-auto">
              {dashboardData.recentInvoices.slice(0, 6).map(invoice => (
                <div key={invoice.id} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg flex-shrink-0">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 text-sm truncate">{invoice.number}</p>
                    <p className="text-xs text-gray-500 truncate">{invoice.supplier}</p>
                  </div>
                  <div className="text-right ml-2 flex-shrink-0">
                    <p className="font-semibold text-gray-900 text-sm">{formatCurrency(invoice.amount)}</p>
                    <p className="text-xs text-gray-500">{formatDate(invoice.date)}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Key Metrics - Bottom right (4 wide, 6 tall) */}
          <div className="col-span-4 row-span-6 bg-white rounded-xl border border-gray-200 shadow-sm p-4 flex flex-col overflow-hidden">
            <h3 className="text-sm font-semibold text-gray-900 mb-3 flex-shrink-0">Key Metrics</h3>
            <div className="grid grid-cols-2 gap-3 flex-1 min-h-0">
              <div 
                className="bg-blue-50 rounded-lg p-3 cursor-pointer hover:bg-blue-100 transition-colors flex flex-col justify-center overflow-hidden"
                onClick={() => router.push('/client/invoices')}
              >
                <div className="flex items-center gap-2 mb-1">
                  <div className="flex items-center justify-center w-6 h-6 bg-blue-100 rounded flex-shrink-0">
                    <IconFileText size={14} className="text-blue-600" />
                  </div>
                  <div className="text-lg font-bold text-gray-900 truncate">{dashboardData.totalInvoices}</div>
                </div>
                <div className="text-xs text-gray-600">Invoices</div>
              </div>
              
              <div 
                className="bg-green-50 rounded-lg p-3 cursor-pointer hover:bg-green-100 transition-colors flex flex-col justify-center overflow-hidden"
                onClick={() => router.push('/client/ingredients')}
              >
                <div className="flex items-center gap-2 mb-1">
                  <div className="flex items-center justify-center w-6 h-6 bg-green-100 rounded flex-shrink-0">
                    <IconClipboardList size={14} className="text-green-600" />
                  </div>
                  <div className="text-lg font-bold text-gray-900 truncate">{dashboardData.totalIngredients}</div>
                </div>
                <div className="text-xs text-gray-600">Ingredients</div>
              </div>
              
              <div 
                className="bg-purple-50 rounded-lg p-3 cursor-pointer hover:bg-purple-100 transition-colors flex flex-col justify-center overflow-hidden"
                onClick={() => router.push('/client/menu-items')}
              >
                <div className="flex items-center gap-2 mb-1">
                  <div className="flex items-center justify-center w-6 h-6 bg-purple-100 rounded flex-shrink-0">
                    <IconChefHat size={14} className="text-purple-600" />
                  </div>
                  <div className="text-lg font-bold text-gray-900 truncate">{dashboardData.totalMenuItems}</div>
                </div>
                <div className="text-xs text-gray-600">Menu Items</div>
              </div>
              
              <div className="bg-yellow-50 rounded-lg p-3 flex flex-col justify-center overflow-hidden">
                <div className="flex items-center gap-2 mb-1">
                  <div className="flex items-center justify-center w-6 h-6 bg-yellow-100 rounded flex-shrink-0">
                    <IconCurrencyDollar size={14} className="text-yellow-600" />
                  </div>
                  <div 
                    className="text-lg font-bold truncate"
                    style={{ color: getMarginColor(dashboardData.averageMargin) }}
                  >
                    {dashboardData.averageMargin.toFixed(1)}%
                  </div>
                </div>
                <div className="text-xs text-gray-600">Avg Margin</div>
              </div>
            </div>
          </div>
        </div>
      </ClientLayout>
    </GeometricBackground>
  );
}