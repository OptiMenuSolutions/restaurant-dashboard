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
          menu_item_components (
            id,
            name,
            cost,
            component_ingredients (
              quantity,
              ingredients (
                last_price
              )
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

  // NEW (corrected):
  function calculateMenuItemCost(menuItem) {
    if (!menuItem.menu_item_components || menuItem.menu_item_components.length === 0) return 0;
    
    return menuItem.menu_item_components.reduce((total, component) => {
      // Use the component's cost directly if available
      const componentCost = parseFloat(component.cost || 0);
      return total + componentCost;
    }, 0);
  }

  function hasCompleteIngredientData(menuItem) {
    if (!menuItem.menu_item_components || menuItem.menu_item_components.length === 0) return false;
    
    return menuItem.menu_item_components.every(component => {
      if (!component.component_ingredients || component.component_ingredients.length === 0) return false;
      
      return component.component_ingredients.every(ingredient => 
        ingredient.ingredients?.last_price && parseFloat(ingredient.ingredients.last_price) > 0
      );
    });
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

    if (itemsWithMargins.length === 0) return [];

    const sortedItems = itemsWithMargins.sort((a, b) => b.margin - a.margin);
    
    if (marginView === "Highest-Margin") {
      return sortedItems.slice(0, 3);
    } else {
      return sortedItems.slice(-3).reverse();
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
        <div className="flex flex-col xl:flex-row xl:items-center justify-between mb-4 gap-3">
          <h1 className="text-xl font-bold text-gray-900">Welcome Back, {userName}!</h1>
          <div className="flex items-center gap-3">
            <div className="relative w-full xl:w-80">
              <input
                type="text"
                placeholder="Search invoices, ingredients, menu items..."
                className="w-full pl-8 pr-3 py-1.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white text-sm"
              />
              <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none">
                <svg className="h-3.5 w-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
            </div>
            <div className="flex items-center justify-center w-8 h-8 bg-blue-600 text-white rounded-full font-semibold text-xs cursor-pointer hover:bg-blue-700 transition-colors flex-shrink-0">
              {getUserInitials(userName)}
            </div>
          </div>
        </div>

        {/* Dashboard Responsive Layout */}
        <div className="flex flex-col xl:flex-row gap-3 h-auto xl:h-[75vh]">
          
          {/* Left Column - AI Profit Score */}
          <div className="w-full xl:w-[15%] flex xl:flex-col gap-3">
            <div className="w-full bg-white rounded-lg border border-gray-200 shadow-sm p-3 flex flex-col min-h-[220px] xl:min-h-0 xl:h-full">
              <div className="text-center flex-shrink-0">
                <div className="flex items-center justify-center gap-1.5 mb-1.5">
                  <IconBrain size={14} className="text-blue-600" />
                  <h3 className="text-xs font-semibold text-gray-900">AI Profit Score</h3>
                </div>
                <p className="text-[10px] text-gray-500 mb-2">Daily optimization rating</p>
              </div>
              <div className="flex-1 flex items-center justify-center min-h-0">
                <div className="relative w-24 h-24 lg:w-28 lg:h-28">
                  <svg className="w-full h-full transform -rotate-90" viewBox="0 0 200 200">
                    <circle
                      cx="100"
                      cy="100"
                      r="85"
                      stroke="#e5e7eb"
                      strokeWidth="10"
                      fill="transparent"
                    />
                    <circle
                      cx="100"
                      cy="100"
                      r="85"
                      stroke="#10b981"
                      strokeWidth="10"
                      fill="transparent"
                      strokeDasharray={`${(87 / 100) * (2 * Math.PI * 85)} ${2 * Math.PI * 85}`}
                      strokeLinecap="round"
                      className="transition-all duration-1000 ease-out"
                    />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-center">
                      <div className="text-2xl lg:text-3xl font-bold text-gray-900">87</div>
                      <div className="text-xs text-gray-500">Score</div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="text-center flex-shrink-0">
                <div className="text-[10px] text-gray-600 mb-1.5 px-1">
                  Based on margin analysis and pricing optimization
                </div>
                <div className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-green-100 text-green-800">
                  Excellent
                </div>
              </div>
            </div>
          </div>

          {/* Main Content Area */}
          <div className="flex-1 flex flex-col gap-3">
            
            {/* Top Row - AI Recommendations */}
            <div className="w-full h-auto xl:h-[15vh]">
              <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-3 h-full flex flex-col">
                <div className="flex items-center gap-2 mb-2 flex-shrink-0">
                  <div className="flex items-center justify-center w- h-3 bg-gradient-to-br from-purple-100 to-pink-100 rounded-lg">
                    <IconSparkles size={14} className="text-purple-600" />
                  </div>
                  <div>
                    <h3 className="text-xs font-semibold text-gray-900">AI Daily Dish Recommendations</h3>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-2 flex-1 min-h-0">
                  <div className="bg-green-50 rounded-md p-2 border-l-3 border-green-500 flex flex-col justify-center min-h-0 h-full">
                    <div className="flex items-center gap-1 mb-0.5">
                      <div className="w-1.5 h-1.5 bg-green-500 rounded-full"></div>
                      <span className="font-semibold text-gray-900 text-xs">Promote Caesar Salad</span>
                    </div>
                    <p className="text-[10px] text-gray-600">High margin, trending up 15%</p>
                  </div>
                  
                  <div className="bg-yellow-50 rounded-md p-2 border-l-3 border-orange-500 flex flex-col justify-center min-h-0 h-full">
                    <div className="flex items-center gap-1 mb-0.5">
                      <div className="w-1.5 h-1.5 bg-orange-500 rounded-full"></div>
                      <span className="font-semibold text-gray-900 text-xs">Fish Tacos Alert</span>
                    </div>
                    <p className="text-[10px] text-gray-600">Ingredients expiring in 2 days</p>
                  </div>
                  
                  <div className="bg-gray-50 rounded-md p-2 border-l-3 border-gray-500 flex flex-col justify-center min-h-0 h-full">
                    <div className="flex items-center gap-1 mb-0.5">
                      <div className="w-1.5 h-1.5 bg-gray-500 rounded-full"></div>
                      <span className="font-semibold text-gray-900 text-xs">Optimize Burger Portions</span>
                    </div>
                    <p className="text-[10px] text-gray-600">Cost savings opportunity available</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Middle Row - Charts */}
            <div className="flex flex-col lg:flex-row gap-3 h-auto xl:h-[55vh]">
              
              {/* Monthly Spending Chart */}
              <div className="w-full lg:w-1/2 h-[30vh] xl:h-full">
                <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-3 cursor-pointer hover:shadow-md transition-shadow h-full flex flex-col"
                    onClick={() => router.push('/client/invoices')}>
                  <div className="flex items-center justify-between mb-2 flex-shrink-0">
                    <h3 className="text-xs font-semibold text-gray-900">Monthly Spending</h3>
                    <IconArrowRight size={14} className="text-gray-400" />
                  </div>
                  <div className="flex-1 min-h-0 w-full">
                    {dashboardData.monthlySpending.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={dashboardData.monthlySpending} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                          <XAxis 
                            dataKey="month" 
                            stroke="#6b7280" 
                            fontSize={9}
                            tickLine={false}
                            axisLine={false}
                          />
                          <YAxis 
                            stroke="#6b7280" 
                            fontSize={9}
                            tickFormatter={(value) => `${(value/1000).toFixed(0)}k`}
                            tickLine={false}
                            axisLine={false}
                          />
                          <Tooltip 
                            formatter={(value) => [formatCurrency(value), 'Total Spent']}
                            contentStyle={{
                              backgroundColor: 'white',
                              border: '1px solid #e5e7eb',
                              borderRadius: '6px',
                              boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                              fontSize: '10px'
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
                        <IconChartBar size={20} className="mb-1" />
                        <p className="text-[10px]">No spending data</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Menu Analysis */}
              <div className="w-full lg:w-1/2 h-[30vh] xl:h-full">
                <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-3 h-full flex flex-col">
                  <div className="flex items-center justify-between mb-2 flex-shrink-0">
                    <h3 className="text-xs font-semibold text-gray-900">Menu Analysis</h3>
                    <div className="flex bg-gray-100 rounded-md p-0.5">
                      <button
                        onClick={() => setMarginView("Highest-Margin")}
                        className={`px-1.5 py-0.5 rounded text-[10px] font-medium transition-colors ${
                          marginView === "Highest-Margin" 
                            ? 'bg-white text-gray-900 shadow-sm' 
                            : 'text-gray-600 hover:text-gray-900'
                        }`}
                      >
                        High
                      </button>
                      <button
                        onClick={() => setMarginView("Lowest-Margin")}
                        className={`px-1.5 py-0.5 rounded text-[10px] font-medium transition-colors ${
                          marginView === "Lowest-Margin" 
                            ? 'bg-white text-gray-900 shadow-sm' 
                            : 'text-gray-600 hover:text-gray-900'
                        }`}
                      >
                        Low
                      </button>
                    </div>
                  </div>
                  <div className="flex flex-col gap-1.5 flex-1 overflow-y-auto">
                    {getMarginItems().slice(0, 3).map((item, index) => (
                      <div key={item.id} className="flex items-center justify-between p-2.5 bg-gray-50 rounded-md" style={{ height: 'calc(33.333% - 0.25rem)' }}>
                        <div className="flex-1 min-w-0">
                          <h4 className="font-medium text-gray-900 text-xs truncate">{item.name}</h4>
                          <p className="text-[10px] text-gray-500">{formatCurrencyDetailed(item.price)}</p>
                        </div>
                        <div className="text-right ml-2 flex-shrink-0">
                          <div 
                            className="font-semibold text-xs"
                            style={{ color: getMarginColor(item.margin) }}
                          >
                            {item.margin.toFixed(1)}%
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Row - Data Cards */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 mt-3">
          
          {/* Top Ingredient Costs */}
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-3 min-h-[20vh] flex flex-col">
            <h3 className="text-xs font-semibold text-gray-900 mb-2 flex-shrink-0">Top Ingredient Costs</h3>
            <div className="space-y-1.5 flex-1 overflow-y-auto">
              {dashboardData.ingredientTrends.map((ingredient, index) => (
                <div key={index} className="flex items-center justify-between p-1.5 bg-gray-50 rounded-md flex-shrink-0">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 text-xs truncate">{ingredient.fullName}</p>
                    <p className="text-[10px] text-gray-500">per {ingredient.unit}</p>
                  </div>
                  <div className="text-right ml-2 flex-shrink-0">
                    <p className="font-semibold text-gray-900 text-xs">{formatCurrencyDetailed(ingredient.price)}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Recent Invoices */}
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-3 min-h-[20vh] flex flex-col">
            <div className="flex items-center justify-between mb-2 flex-shrink-0">
              <h3 className="text-xs font-semibold text-gray-900">Recent Invoices</h3>
              <button 
                onClick={() => router.push('/client/invoices')}
                className="text-blue-600 hover:text-blue-700 text-[10px] font-medium flex-shrink-0"
              >
                View All
              </button>
            </div>
            <div className="space-y-1.5 flex-1 overflow-y-auto">
              {dashboardData.recentInvoices.slice(0, 6).map(invoice => (
                <div key={invoice.id} className="flex items-center justify-between p-1.5 bg-gray-50 rounded-md flex-shrink-0">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 text-xs truncate">{invoice.number}</p>
                    <p className="text-[10px] text-gray-500 truncate">{invoice.supplier}</p>
                  </div>
                  <div className="text-right ml-2 flex-shrink-0">
                    <p className="font-semibold text-gray-900 text-xs">{formatCurrency(invoice.amount)}</p>
                    <p className="text-[10px] text-gray-500">{formatDate(invoice.date)}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Key Metrics */}
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-3 min-h-[20vh] flex flex-col">
            <h3 className="text-xs font-semibold text-gray-900 mb-2 flex-shrink-0">Key Metrics</h3>
            <div className="grid grid-cols-2 gap-2 flex-1 min-h-0">
              <div 
                className="bg-blue-50 rounded-md p-2 cursor-pointer hover:bg-blue-100 transition-colors flex flex-col justify-center min-h-[60px]"
                onClick={() => router.push('/client/invoices')}
              >
                <div className="flex items-center gap-1.5 mb-0.5">
                  <div className="flex items-center justify-center w-4 h-4 bg-blue-100 rounded flex-shrink-0">
                    <IconFileText size={10} className="text-blue-600" />
                  </div>
                  <div className="text-sm font-bold text-gray-900 truncate">{dashboardData.totalInvoices}</div>
                </div>
                <div className="text-[10px] text-gray-600">Invoices</div>
              </div>
              
              <div 
                className="bg-green-50 rounded-md p-2 cursor-pointer hover:bg-green-100 transition-colors flex flex-col justify-center min-h-[60px]"
                onClick={() => router.push('/client/ingredients')}
              >
                <div className="flex items-center gap-1.5 mb-0.5">
                  <div className="flex items-center justify-center w-4 h-4 bg-green-100 rounded flex-shrink-0">
                    <IconClipboardList size={10} className="text-green-600" />
                  </div>
                  <div className="text-sm font-bold text-gray-900 truncate">{dashboardData.totalIngredients}</div>
                </div>
                <div className="text-[10px] text-gray-600">Ingredients</div>
              </div>
              
              <div 
                className="bg-purple-50 rounded-md p-2 cursor-pointer hover:bg-purple-100 transition-colors flex flex-col justify-center min-h-[60px]"
                onClick={() => router.push('/client/menu-items')}
              >
                <div className="flex items-center gap-1.5 mb-0.5">
                  <div className="flex items-center justify-center w-4 h-4 bg-purple-100 rounded flex-shrink-0">
                    <IconChefHat size={10} className="text-purple-600" />
                  </div>
                  <div className="text-sm font-bold text-gray-900 truncate">{dashboardData.totalMenuItems}</div>
                </div>
                <div className="text-[10px] text-gray-600">Menu Items</div>
              </div>
              
              <div className="bg-yellow-50 rounded-md p-2 flex flex-col justify-center min-h-[60px]">
                <div className="flex items-center gap-1.5 mb-0.5">
                  <div className="flex items-center justify-center w-4 h-4 bg-yellow-100 rounded flex-shrink-0">
                    <IconCurrencyDollar size={10} className="text-yellow-600" />
                  </div>
                  <div 
                    className="text-sm font-bold truncate"
                    style={{ color: getMarginColor(dashboardData.averageMargin) }}
                  >
                    {dashboardData.averageMargin.toFixed(1)}%
                  </div>
                </div>
                <div className="text-[10px] text-gray-600">Avg Margin</div>
              </div>
            </div>
          </div>
        </div>
      </ClientLayout>
    </GeometricBackground>
  );
}