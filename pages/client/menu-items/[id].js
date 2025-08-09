// pages/client/menu-items/[id].js
import React, { useState, useEffect } from "react";
import { useRouter } from "next/router";
import ClientLayout from "../../../components/ClientLayout";
import supabase from "../../../lib/supabaseClient";
import { calculateStandardizedCost } from "/lib/standardizedUnits";
import {
  IconArrowLeft,
  IconCurrencyDollar,
  IconCalendar,
  IconPackage,
  IconChartLine,
  IconAlertTriangle,
  IconChefHat,
  IconClipboardList,
  IconTrendingUp,
  IconTrendingDown,
  IconExclamationCircle,
  IconChevronRight,
  IconChevronDown,
  IconEye,
  IconEyeOff,
  IconCheck,
  IconX,
} from "@tabler/icons-react";

export default function MenuItemDetail() {
  const router = useRouter();
  const { id } = router.query;
  const [menuItem, setMenuItem] = useState(null);
  const [ingredients, setIngredients] = useState([]);
  const [components, setComponents] = useState([]);
  const [expandedComponents, setExpandedComponents] = useState(new Set());
  const [costHistory, setCostHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [restaurantId, setRestaurantId] = useState(null);

  useEffect(() => {
    getRestaurantId();
  }, []);

  useEffect(() => {
    if (restaurantId && id) {
      fetchMenuItemData();
    }
  }, [restaurantId, id]);

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

  async function fetchMenuItemData() {
    try {
      setLoading(true);
      setError("");

      // Fetch menu item details
      const { data: menuItemData, error: menuItemError } = await supabase
        .from("menu_items")
        .select("*")
        .eq("id", id)
        .eq("restaurant_id", restaurantId)
        .single();

      if (menuItemError) {
        if (menuItemError.code === 'PGRST116') {
          setError("Menu item not found or access denied");
        } else {
          setError("Failed to fetch menu item: " + menuItemError.message);
        }
        return;
      }

      setMenuItem(menuItemData);

      // Fetch ingredients and their details (original approach)
      const { data: ingredientsData, error: ingredientsError } = await supabase
        .from("menu_item_ingredients")
        .select(`
          quantity,
          ingredients (
            id,
            name,
            unit,
            last_price,
            last_ordered_at
          )
        `)
        .eq("menu_item_id", id);

      if (!ingredientsError && ingredientsData) {
        setIngredients(ingredientsData);
      }

      // Fetch components with their ingredients (new approach)
      const { data: componentsData, error: componentsError } = await supabase
        .from('menu_item_components')
        .select(`
          id,
          name,
          cost,
          component_ingredients (
            id,
            quantity,
            unit,
            ingredients:ingredient_id (
              id,
              name,
              last_price,
              unit,
              last_ordered_at
            )
          )
        `)
        .eq('menu_item_id', id)
        .order('name');

      if (!componentsError && componentsData) {
        // Process components with calculated costs
        const processedComponents = (componentsData || []).map(component => {
          const processedIngredients = (component.component_ingredients || []).map(ing => {
            const ingredient = ing.ingredients;
            const recipeQuantity = ing.quantity;
            const recipeUnit = ing.unit;
            const ingredientCost = ingredient?.last_price || 0;
            const ingredientName = ingredient?.name || 'Unknown';

            let calculatedCost = 0;
            if (ingredientCost > 0) {
              try {
                // Fallback if calculateStandardizedCost is not available
                if (typeof calculateStandardizedCost === 'function') {
                  calculatedCost = calculateStandardizedCost(
                    recipeQuantity,
                    recipeUnit,
                    ingredientCost,
                    ingredientName
                  );
                } else {
                  calculatedCost = recipeQuantity * ingredientCost;
                }
              } catch (error) {
                console.warn(`Cost calculation failed for ${ingredientName}:`, error);
                calculatedCost = recipeQuantity * ingredientCost;
              }
            }

            return {
              id: ing.id,
              name: ingredientName,
              quantity: recipeQuantity,
              unit: recipeUnit,
              unitCost: ingredientCost,
              standardUnit: ingredient?.unit || 'unknown',
              totalCost: calculatedCost,
              lastOrdered: ingredient?.last_ordered_at,
              hasPrice: ingredientCost > 0
            };
          });

          // Calculate component total
          const calculatedTotal = processedIngredients.reduce((sum, ing) => sum + ing.totalCost, 0);

          return {
            id: component.id,
            name: component.name,
            storedCost: component.cost || 0,
            calculatedCost: calculatedTotal,
            ingredients: processedIngredients,
            ingredientCount: processedIngredients.length
          };
        });

        setComponents(processedComponents);
      }

      // Fetch cost history
      const { data: historyData, error: historyError } = await supabase
        .from("menu_item_cost_history")
        .select("*")
        .eq("menu_item_id", id)
        .order("created_at", { ascending: false })
        .limit(10);

      if (!historyError && historyData) {
        setCostHistory(historyData);
      }

    } catch (err) {
      setError("An unexpected error occurred: " + err.message);
    } finally {
      setLoading(false);
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

  function formatDate(dateString) {
    if (!dateString) return "N/A";
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    } catch {
      return "Invalid date";
    }
  }

  function formatDateTime(dateString) {
    if (!dateString) return "N/A";
    try {
      return new Date(dateString).toLocaleString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return "Invalid date";
    }
  }

  function calculateIngredientCost(ingredient, quantity) {
    const unitCost = parseFloat(ingredient?.last_price || 0);
    const qty = parseFloat(quantity || 0);
    return unitCost * qty;
  }

  function calculateTotalCost() {
    // Use components if available, otherwise fall back to ingredients
    if (components.length > 0) {
      return components.reduce((total, component) => {
        return total + component.calculatedCost;
      }, 0);
    } else {
      return ingredients.reduce((total, item) => {
        return total + calculateIngredientCost(item.ingredients, item.quantity);
      }, 0);
    }
  }

  function toggleComponent(componentId) {
    setExpandedComponents(prev => {
      const newSet = new Set(prev);
      if (newSet.has(componentId)) {
        newSet.delete(componentId);
      } else {
        newSet.add(componentId);
      }
      return newSet;
    });
  }

  function expandAll() {
    setExpandedComponents(new Set(components.map(c => c.id)));
  }

  function collapseAll() {
    setExpandedComponents(new Set());
  }

  function calculateProfitMargin() {
    const price = parseFloat(menuItem?.price || 0);
    const cost = calculateTotalCost();
    
    if (price === 0) return null;
    return ((price - cost) / price) * 100;
  }

  function getMarginColor(margin) {
    if (margin === null || margin === undefined) return "text-gray-400";
    if (margin >= 70) return "text-green-600 font-semibold";
    if (margin >= 50) return "text-green-500 font-medium";
    if (margin >= 30) return "text-yellow-600 font-medium";
    return "text-red-500 font-semibold";
  }

  function getMissingPriceIngredients() {
    // Check both components and regular ingredients
    let missingIngredients = [];
    
    if (components.length > 0) {
      components.forEach(component => {
        component.ingredients.forEach(ingredient => {
          if (!ingredient.hasPrice) {
            missingIngredients.push(ingredient);
          }
        });
      });
    } else {
      missingIngredients = ingredients.filter(item => 
        !item.ingredients?.last_price || parseFloat(item.ingredients.last_price) === 0
      );
    }
    
    return missingIngredients;
  }

  function handleIngredientClick(ingredientId) {
    router.push(`/client/ingredients/${ingredientId}`);
  }

  const totalCost = calculateTotalCost();
  const profitMargin = calculateProfitMargin();
  const marginColorClass = getMarginColor(profitMargin);
  const missingPriceIngredients = getMissingPriceIngredients();

  if (loading) {
    return (
      <ClientLayout 
        pageTitle="Menu Item Details" 
        pageDescription="Loading menu item information..."
        pageIcon={IconChefHat}
      >
        <div className="p-6 flex items-center justify-center">
          <div className="flex flex-col items-center gap-4">
            <div className="w-10 h-10 border-3 border-gray-300 border-t-[#ADD8E6] rounded-full animate-spin"></div>
            <div className="text-gray-600">Loading menu item details...</div>
          </div>
        </div>
      </ClientLayout>
    );
  }

  if (error) {
    return (
      <ClientLayout 
        pageTitle="Menu Item Details" 
        pageDescription="Error loading menu item"
        pageIcon={IconAlertTriangle}
      >
        <div className="p-6 text-center">
          <div className="flex items-center justify-center w-16 h-16 bg-red-100 rounded-full mx-auto mb-6">
            <IconAlertTriangle size={32} className="text-red-600" />
          </div>
          <h3 className="text-xl font-semibold text-gray-900 mb-4">Error Loading Menu Item</h3>
          <p className="text-gray-600 mb-6">{error}</p>
          <div className="flex gap-3 justify-center">
            <button 
              onClick={() => router.push("/client/menu-items")} 
              className="inline-flex items-center gap-2 px-6 py-3 bg-gray-200 text-gray-900 rounded-lg hover:bg-gray-300 transition-colors font-medium"
            >
              <IconArrowLeft size={18} />
              Back to Menu Items
            </button>
            <button 
              onClick={() => window.location.reload()} 
              className="inline-flex items-center gap-2 px-6 py-3 bg-[#ADD8E6] text-gray-900 rounded-lg hover:bg-[#9CC5D4] transition-colors font-medium"
            >
              Retry
            </button>
          </div>
        </div>
      </ClientLayout>
    );
  }

  if (!menuItem) {
    return (
      <ClientLayout 
        pageTitle="Menu Item Details" 
        pageDescription="Menu item not found"
        pageIcon={IconChefHat}
      >
        <div className="p-6 text-center">
          <div className="flex items-center justify-center w-16 h-16 bg-gray-100 rounded-full mx-auto mb-6">
            <IconChefHat size={32} className="text-gray-400" />
          </div>
          <h3 className="text-xl font-semibold text-gray-900 mb-4">Menu Item Not Found</h3>
          <p className="text-gray-600 mb-6">The requested menu item could not be found.</p>
          <button 
            onClick={() => router.push("/client/menu-items")} 
            className="inline-flex items-center gap-2 px-6 py-3 bg-[#ADD8E6] text-gray-900 rounded-lg hover:bg-[#9CC5D4] transition-colors font-medium"
          >
            <IconArrowLeft size={18} />
            Back to Menu Items
          </button>
        </div>
      </ClientLayout>
    );
  }

  return (
    <ClientLayout 
      pageTitle={menuItem.name} 
      pageDescription="Menu item details and cost breakdown"
      pageIcon={IconChefHat}
    >
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => router.push("/client/menu-items")} 
              className="flex items-center gap-2 px-3 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <IconArrowLeft size={18} />
              Back to Menu Items
            </button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{menuItem.name}</h1>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-lg font-semibold text-green-600">
                  {menuItem.price ? formatCurrency(menuItem.price) : "No price set"}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="p-6 space-y-6">
        {/* Overview Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
            <div className="flex items-center gap-4">
              <div className="flex items-center justify-center w-12 h-12 bg-green-100 rounded-lg">
                <IconCurrencyDollar size={24} className="text-green-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500 mb-1">Menu Price</p>
                <p className="text-xl font-bold text-gray-900">
                  {menuItem.price ? formatCurrency(menuItem.price) : "Not set"}
                </p>
              </div>
            </div>
          </div>
          
          <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
            <div className="flex items-center gap-4">
              <div className="flex items-center justify-center w-12 h-12 bg-blue-100 rounded-lg">
                <IconPackage size={24} className="text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500 mb-1">Total Cost</p>
                <p className="text-xl font-bold text-gray-900">
                  {formatCurrency(totalCost)}
                </p>
              </div>
            </div>
          </div>
          
          <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
            <div className="flex items-center gap-4">
              <div className="flex items-center justify-center w-12 h-12 bg-purple-100 rounded-lg">
                <IconTrendingUp size={24} className="text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500 mb-1">Profit Margin</p>
                <p className={`text-xl font-bold ${marginColorClass}`}>
                  {profitMargin !== null ? `${profitMargin.toFixed(1)}%` : "N/A"}
                </p>
              </div>
            </div>
          </div>
          
          <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
            <div className="flex items-center gap-4">
              <div className="flex items-center justify-center w-12 h-12 bg-orange-100 rounded-lg">
                <IconChefHat size={24} className="text-orange-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500 mb-1">Ingredients</p>
                <p className="text-xl font-bold text-gray-900">
                  {components.length > 0 ? 
                    components.reduce((total, comp) => total + comp.ingredientCount, 0) : 
                    ingredients.length
                  }
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Alert for missing data */}
        {missingPriceIngredients.length > 0 && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-6">
            <div className="flex items-start gap-4">
              <div className="flex items-center justify-center w-12 h-12 bg-yellow-100 rounded-lg">
                <IconExclamationCircle size={24} className="text-yellow-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-yellow-800 mb-2">Missing Ingredient Pricing</h3>
                <p className="text-yellow-700">
                  {missingPriceIngredients.length} ingredient{missingPriceIngredients.length !== 1 ? 's' : ''} 
                  {missingPriceIngredients.length === 1 ? ' is' : ' are'} missing price data. 
                  Cost calculations may be incomplete.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Ingredients Breakdown */}
        {components.length > 0 ? (
          // Component-based breakdown
          <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
            <div className="bg-gray-50 border-b border-gray-200 px-6 py-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                  <IconChefHat size={20} />
                  Component Breakdown
                </h2>
                <div className="flex items-center gap-4">
                  <div className="text-sm text-gray-500">
                    {components.length} component{components.length !== 1 ? 's' : ''}
                  </div>
                  <div className="flex gap-2">
                    <button 
                      onClick={expandAll}
                      className="flex items-center gap-1 px-3 py-2 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-200 rounded-lg transition-colors"
                    >
                      <IconEye size={16} />
                      Expand All
                    </button>
                    <button 
                      onClick={collapseAll}
                      className="flex items-center gap-1 px-3 py-2 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-200 rounded-lg transition-colors"
                    >
                      <IconEyeOff size={16} />
                      Collapse All
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <div className="divide-y divide-gray-200">
              {components.map(component => {
                const isExpanded = expandedComponents.has(component.id);
                const costDiscrepancy = Math.abs(component.storedCost - component.calculatedCost);
                const hasDiscrepancy = costDiscrepancy > 0.01;

                return (
                  <div key={component.id}>
                    {/* Component Header */}
                    <div 
                      className="px-6 py-4 hover:bg-gray-50 cursor-pointer transition-colors"
                      onClick={() => toggleComponent(component.id)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <button className="text-gray-400 hover:text-gray-600">
                            {isExpanded ? (
                              <IconChevronDown size={20} />
                            ) : (
                              <IconChevronRight size={20} />
                            )}
                          </button>
                          <div>
                            <h3 className="text-lg font-medium text-gray-900">{component.name}</h3>
                            <div className="flex items-center gap-3 mt-1">
                              <span className="text-sm text-gray-500">
                                {component.ingredientCount} ingredient{component.ingredientCount !== 1 ? 's' : ''}
                              </span>
                              {hasDiscrepancy && (
                                <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                                  <IconExclamationCircle size={12} />
                                  Cost mismatch
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-lg font-semibold text-gray-900">
                            ${component.calculatedCost.toFixed(4)}
                          </div>
                          <div className="text-sm text-gray-500">
                            {totalCost > 0 ? 
                              ((component.calculatedCost / totalCost) * 100).toFixed(1) : 0
                            }%
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Expanded Ingredients */}
                    {isExpanded && (
                      <div className="px-6 pb-4 bg-gray-50">
                        <div className="overflow-x-auto">
                          <table className="w-full">
                            <thead>
                              <tr className="border-b border-gray-200">
                                <th className="text-left py-3 text-sm font-semibold text-gray-900">Ingredient</th>
                                <th className="text-left py-3 text-sm font-semibold text-gray-900">Recipe Amount</th>
                                <th className="text-left py-3 text-sm font-semibold text-gray-900">Unit Cost</th>
                                <th className="text-left py-3 text-sm font-semibold text-gray-900">Total Cost</th>
                                <th className="text-left py-3 text-sm font-semibold text-gray-900">Status</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200">
                              {component.ingredients.map(ingredient => (
                                <tr key={ingredient.id} className="hover:bg-white">
                                  <td className="py-3">
                                    <div>
                                      <div className="font-medium text-gray-900">{ingredient.name}</div>
                                      {ingredient.lastOrdered && (
                                        <div className="text-xs text-gray-500">
                                          Last ordered: {formatDate(ingredient.lastOrdered)}
                                        </div>
                                      )}
                                    </div>
                                  </td>
                                  <td className="py-3 text-gray-900">
                                    {ingredient.quantity} {ingredient.unit}
                                  </td>
                                  <td className="py-3">
                                    {ingredient.hasPrice ? (
                                      <div>
                                        <div className="font-medium text-gray-900">
                                          ${ingredient.unitCost.toFixed(4)}
                                        </div>
                                        <div className="text-xs text-gray-500">
                                          per {ingredient.standardUnit}
                                        </div>
                                      </div>
                                    ) : (
                                      <span className="text-red-500 italic">No price data</span>
                                    )}
                                  </td>
                                  <td className="py-3 font-medium text-gray-900">
                                    ${ingredient.totalCost.toFixed(4)}
                                  </td>
                                  <td className="py-3">
                                    {ingredient.hasPrice ? (
                                      <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                        <IconCheck size={12} />
                                        Priced
                                      </span>
                                    ) : (
                                      <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                                        <IconX size={12} />
                                        No price
                                      </span>
                                    )}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                            <tfoot>
                              <tr className="border-t border-gray-300 bg-white">
                                <td colSpan="3" className="py-3 font-semibold text-gray-900">Component Total:</td>
                                <td className="py-3 font-bold text-gray-900">
                                  ${component.calculatedCost.toFixed(4)}
                                </td>
                                <td></td>
                              </tr>
                            </tfoot>
                          </table>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Summary Footer */}
            <div className="bg-gray-50 border-t border-gray-200 px-6 py-4">
              <div className="flex justify-between items-center">
                <span className="text-lg font-semibold text-gray-900">Total Food Cost:</span>
                <span className="text-xl font-bold text-gray-900">${totalCost.toFixed(4)}</span>
              </div>
              {menuItem.price && (
                <div className="flex justify-between items-center mt-2">
                  <span className="text-lg font-semibold text-gray-900">Profit per Item:</span>
                  <span className="text-xl font-bold text-green-600">
                    {formatCurrency(parseFloat(menuItem.price) - totalCost)}
                  </span>
                </div>
              )}
            </div>

            {/* Cost Analysis */}
            <div className="bg-white border-t border-gray-200 px-6 py-4">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <IconTrendingUp size={20} />
                Cost Analysis
              </h3>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-gray-700">Break-even price (30% food cost):</span>
                  <span className="font-semibold text-gray-900">
                    ${(totalCost / 0.30).toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-700">Recommended price (25% food cost):</span>
                  <span className="font-semibold text-green-600">
                    ${(totalCost / 0.25).toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-700">Premium price (20% food cost):</span>
                  <span className="font-semibold text-blue-600">
                    ${(totalCost / 0.20).toFixed(2)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        ) : ingredients.length > 0 ? (
          // Original ingredient-based breakdown
          <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
            <div className="bg-gray-50 border-b border-gray-200 px-6 py-4">
              <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <IconChefHat size={20} />
                Ingredient Breakdown
              </h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="text-left py-4 px-6 text-sm font-semibold text-gray-900">Ingredient</th>
                    <th className="text-left py-4 px-6 text-sm font-semibold text-gray-900">Quantity</th>
                    <th className="text-left py-4 px-6 text-sm font-semibold text-gray-900">Unit Cost</th>
                    <th className="text-left py-4 px-6 text-sm font-semibold text-gray-900">Total Cost</th>
                    <th className="text-left py-4 px-6 text-sm font-semibold text-gray-900">Last Updated</th>
                    <th className="text-left py-4 px-6 text-sm font-semibold text-gray-900">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {ingredients.map((item, index) => {
                    const ingredient = item.ingredients;
                    const cost = calculateIngredientCost(ingredient, item.quantity);
                    const hasPrice = ingredient?.last_price && parseFloat(ingredient.last_price) > 0;
                    
                    return (
                      <tr 
                        key={index}
                        onClick={() => ingredient?.id && handleIngredientClick(ingredient.id)}
                        className={`hover:bg-gray-50 ${ingredient?.id ? 'cursor-pointer' : ''}`}
                      >
                        <td className="py-4 px-6">
                          <span className="font-medium text-gray-900">
                            {ingredient?.name || "Unknown ingredient"}
                          </span>
                        </td>
                        <td className="py-4 px-6 text-gray-900">
                          {item.quantity} {ingredient?.unit || "units"}
                        </td>
                        <td className="py-4 px-6">
                          {hasPrice ? (
                            <span className="font-medium text-green-600">
                              {formatCurrency(ingredient.last_price)}
                            </span>
                          ) : (
                            <span className="text-red-500 italic">No price data</span>
                          )}
                        </td>
                        <td className="py-4 px-6">
                          <span className="font-medium text-gray-900">
                            {formatCurrency(cost)}
                          </span>
                        </td>
                        <td className="py-4 px-6 text-gray-900">
                          {formatDate(ingredient?.last_ordered_at)}
                        </td>
                        <td className="py-4 px-6">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            hasPrice ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                          }`}>
                            {hasPrice ? "Priced" : "No Price"}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot className="bg-gray-50">
                  <tr>
                    <td colSpan="3" className="py-4 px-6 font-semibold text-gray-900">Total Ingredient Cost:</td>
                    <td className="py-4 px-6 font-bold text-gray-900">
                      {formatCurrency(totalCost)}
                    </td>
                    <td colSpan="2"></td>
                  </tr>
                  {menuItem.price && (
                    <tr>
                      <td colSpan="3" className="py-4 px-6 font-semibold text-gray-900">Profit per Item:</td>
                      <td className="py-4 px-6 font-bold text-green-600">
                        {formatCurrency(parseFloat(menuItem.price) - totalCost)}
                      </td>
                      <td colSpan="2"></td>
                    </tr>
                  )}
                </tfoot>
              </table>
            </div>
          </div>
        ) : null}

        {/* Cost History */}
        {costHistory.length > 0 && (
          <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
            <div className="bg-gray-50 border-b border-gray-200 px-6 py-4">
              <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <IconChartLine size={20} />
                Cost Change History
              </h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="text-left py-4 px-6 text-sm font-semibold text-gray-900">Date</th>
                    <th className="text-left py-4 px-6 text-sm font-semibold text-gray-900">Previous Cost</th>
                    <th className="text-left py-4 px-6 text-sm font-semibold text-gray-900">New Cost</th>
                    <th className="text-left py-4 px-6 text-sm font-semibold text-gray-900">Change</th>
                    <th className="text-left py-4 px-6 text-sm font-semibold text-gray-900">Reason</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {costHistory.map((record) => {
                    const change = parseFloat(record.new_cost || 0) - parseFloat(record.old_cost || 0);
                    const isIncrease = change > 0;
                    
                    return (
                      <tr key={record.id} className="hover:bg-gray-50">
                        <td className="py-4 px-6 text-gray-900">
                          {formatDateTime(record.created_at)}
                        </td>
                        <td className="py-4 px-6 text-gray-900">
                          {formatCurrency(record.old_cost)}
                        </td>
                        <td className="py-4 px-6 text-gray-900">
                          {formatCurrency(record.new_cost)}
                        </td>
                        <td className="py-4 px-6">
                          <div className="flex items-center gap-1">
                            {isIncrease ? (
                              <IconTrendingUp size={16} className="text-red-500" />
                            ) : (
                              <IconTrendingDown size={16} className="text-green-500" />
                            )}
                            <span className={`font-medium ${isIncrease ? 'text-red-500' : 'text-green-500'}`}>
                              {isIncrease ? '+' : ''}{formatCurrency(change)}
                            </span>
                          </div>
                        </td>
                        <td className="py-4 px-6">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                            {record.change_reason === 'invoice_saved' ? 'Invoice Processing' : 
                             record.change_reason === 'manual_update' ? 'Manual Update' : 
                             record.change_reason || 'Unknown'}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Empty States */}
        {components.length === 0 && ingredients.length === 0 && (
          <div className="bg-white border border-gray-200 rounded-xl p-12 text-center">
            <div className="flex items-center justify-center w-16 h-16 bg-gray-100 rounded-full mx-auto mb-6">
              <IconChefHat size={32} className="text-gray-400" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-4">No Ingredients Found</h3>
            <p className="text-gray-600">This menu item doesn't have any ingredients or components configured yet.</p>
          </div>
        )}

        {costHistory.length === 0 && (components.length > 0 || ingredients.length > 0) && (
          <div className="bg-white border border-gray-200 rounded-xl p-12 text-center">
            <div className="flex items-center justify-center w-16 h-16 bg-gray-100 rounded-full mx-auto mb-6">
              <IconChartLine size={32} className="text-gray-400" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-4">No Cost History</h3>
            <p className="text-gray-600">No cost changes have been recorded for this menu item yet.</p>
          </div>
        )}
      </div>
    </ClientLayout>
  );
}