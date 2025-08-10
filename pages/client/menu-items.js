// pages/client/menu-items.js
import React, { useState, useEffect } from "react";
import { useRouter } from "next/router";
import ClientLayout from "../../components/ClientLayout";
import supabase from "../../lib/supabaseClient";
import {
  IconSearch,
  IconX,
  IconSortAscending,
  IconSortDescending,
  IconCurrencyDollar,
  IconEye,
  IconAlertTriangle,
  IconChefHat,
  IconTrendingUp,
  IconClock,
  IconPackage,
} from "@tabler/icons-react";

export default function MenuItems() {
  const router = useRouter();
  const [menuItems, setMenuItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [restaurantId, setRestaurantId] = useState(null);
  const [sortBy, setSortBy] = useState("name");
  const [sortOrder, setSortOrder] = useState("asc");
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("All");

  useEffect(() => {
    getRestaurantId();
  }, []);

  useEffect(() => {
    if (restaurantId) {
      fetchMenuItems();
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

  async function fetchMenuItems() {
    try {
      setLoading(true);
      setError("");

      const { data, error } = await supabase
        .from("menu_items")
        .select(`
          *,
          menu_item_ingredients (
            quantity,
            ingredients (
              id,
              name,
              unit,
              last_price
            )
          ),
          menu_item_components (
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
          )
        `)
        .eq("restaurant_id", restaurantId)
        .order("name");

      if (error) {
        setError("Failed to fetch menu items: " + error.message);
        return;
      }

      setMenuItems(data || []);
    } catch (err) {
      setError("An unexpected error occurred while fetching menu items");
    } finally {
      setLoading(false);
    }
  }

  function handleSort(column) {
    if (sortBy === column) {
      setSortOrder(prev => prev === "asc" ? "desc" : "asc");
    } else {
      setSortBy(column);
      setSortOrder("asc");
    }
  }

  function handleRowClick(id) {
    router.push(`/client/menu-items/${id}`);
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

  function calculateMargin(price, cost) {
    const priceNum = parseFloat(price || 0);
    const costNum = parseFloat(cost || 0);
    
    if (priceNum === 0 || costNum === 0) return "--";
    
    const margin = ((priceNum - costNum) / priceNum) * 100;
    return margin.toFixed(1) + "%";
  }

  function getMarginColor(price, cost) {
    const priceNum = parseFloat(price || 0);
    const costNum = parseFloat(cost || 0);
    
    if (priceNum === 0 || costNum === 0) return "text-gray-400";
    
    const margin = ((priceNum - costNum) / priceNum) * 100;
    
    if (margin >= 70) return "text-green-600 font-semibold";
    if (margin >= 50) return "text-green-500 font-medium";
    if (margin >= 30) return "text-yellow-600 font-medium";
    return "text-red-500 font-semibold";
  }

  function getFilteredAndSortedMenuItems() {
    let filtered = menuItems;

    // Apply search filter
    if (searchTerm) {
      filtered = menuItems.filter(item =>
        item.name?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Apply category filter (if you add categories later)
    if (categoryFilter !== "All") {
      // This is placeholder for future category functionality
      // filtered = filtered.filter(item => item.category === categoryFilter);
    }

    // Apply sorting
    const sorted = [...filtered].sort((a, b) => {
      let valueA, valueB;

      switch (sortBy) {
        case "name":
          valueA = a.name?.toLowerCase() || "";
          valueB = b.name?.toLowerCase() || "";
          break;
        case "price":
          valueA = parseFloat(a.price) || 0;
          valueB = parseFloat(b.price) || 0;
          break;
        case "cost":
          valueA = parseFloat(a.cost) || 0;
          valueB = parseFloat(b.cost) || 0;
          break;
        case "margin":
          const marginA = parseFloat(a.price || 0) > 0 && parseFloat(a.cost || 0) > 0 
            ? ((parseFloat(a.price) - parseFloat(a.cost)) / parseFloat(a.price)) * 100 
            : 0;
          const marginB = parseFloat(b.price || 0) > 0 && parseFloat(b.cost || 0) > 0 
            ? ((parseFloat(b.price) - parseFloat(b.cost)) / parseFloat(b.price)) * 100 
            : 0;
          valueA = marginA;
          valueB = marginB;
          break;
        default:
          return 0;
      }

      if (valueA < valueB) return sortOrder === "asc" ? -1 : 1;
      if (valueA > valueB) return sortOrder === "asc" ? 1 : -1;
      return 0;
    });

    return sorted;
  }

  function clearSearch() {
    setSearchTerm("");
  }

  function getIngredientCount(menuItem) {
    // Check if menu item uses components
    if (menuItem.menu_item_components && menuItem.menu_item_components.length > 0) {
      // Count unique ingredients across all components
      const uniqueIngredientIds = new Set();
      menuItem.menu_item_components.forEach(component => {
        component.component_ingredients?.forEach(ingredient => {
          if (ingredient.ingredients?.id) {
            uniqueIngredientIds.add(ingredient.ingredients.id);
          }
        });
      });
      return uniqueIngredientIds.size;
    } else {
      // Fall back to original ingredients
      return menuItem.menu_item_ingredients?.length || 0;
    }
  }

  function hasIncompleteCosting(menuItem) {
    // Check if menu item uses components
    if (menuItem.menu_item_components && menuItem.menu_item_components.length > 0) {
      // Check for missing prices in component ingredients
      let hasMissingPrices = false;
      menuItem.menu_item_components.forEach(component => {
        component.component_ingredients?.forEach(ingredient => {
          if (!ingredient.ingredients?.last_price || parseFloat(ingredient.ingredients.last_price) === 0) {
            hasMissingPrices = true;
          }
        });
      });
      return hasMissingPrices;
    } else {
      // Fall back to checking original ingredients
      if (!menuItem.menu_item_ingredients || menuItem.menu_item_ingredients.length === 0) {
        return true;
      }
      
      return menuItem.menu_item_ingredients.some(ingredient => 
        !ingredient.ingredients?.last_price || parseFloat(ingredient.ingredients.last_price) === 0
      );
    }
  }

  const filteredMenuItems = getFilteredAndSortedMenuItems();

  if (loading) {
    return (
      <ClientLayout 
        pageTitle="Menu Items" 
        pageDescription="Monitor menu item costs and profitability"
        pageIcon={IconChefHat}
      >
        <div className="p-6 flex items-center justify-center">
          <div className="flex flex-col items-center gap-4">
            <div className="w-10 h-10 border-3 border-gray-300 border-t-[#ADD8E6] rounded-full animate-spin"></div>
            <div className="text-gray-600">Loading menu items...</div>
          </div>
        </div>
      </ClientLayout>
    );
  }

  if (error) {
    return (
      <ClientLayout 
        pageTitle="Menu Items" 
        pageDescription="Error loading menu items"
        pageIcon={IconAlertTriangle}
      >
        <div className="p-6 text-center">
          <div className="flex items-center justify-center w-16 h-16 bg-red-100 rounded-full mx-auto mb-6">
            <IconAlertTriangle size={32} className="text-red-600" />
          </div>
          <h3 className="text-xl font-semibold text-gray-900 mb-4">Error Loading Menu Items</h3>
          <p className="text-gray-600 mb-6">{error}</p>
          <button 
            onClick={() => window.location.reload()} 
            className="inline-flex items-center gap-2 px-6 py-3 bg-[#ADD8E6] text-gray-900 rounded-lg hover:bg-[#9CC5D4] transition-colors font-medium"
          >
            Retry
          </button>
        </div>
      </ClientLayout>
    );
  }

  return (
    <ClientLayout 
      pageTitle="Menu Items" 
      pageDescription="Monitor menu item costs and profitability"
      pageIcon={IconChefHat}
    >
      {/* Controls */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <IconSearch size={20} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search menu items by name..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-10 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#ADD8E6] focus:border-transparent"
            />
            {searchTerm && (
              <button 
                onClick={clearSearch} 
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
              >
                <IconX size={16} />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="p-6 space-y-6">
        {/* Summary Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
            <div className="flex items-center gap-4">
              <div className="flex items-center justify-center w-12 h-12 bg-blue-100 rounded-lg">
                <IconPackage size={24} className="text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">
                  {filteredMenuItems.filter(item => item.price && item.cost).length}
                </p>
                <p className="text-gray-600">Complete Pricing</p>
              </div>
            </div>
          </div>

          <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
            <div className="flex items-center gap-4">
              <div className="flex items-center justify-center w-12 h-12 bg-orange-100 rounded-lg">
                <IconClock size={24} className="text-orange-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">
                  {filteredMenuItems.filter(item => hasIncompleteCosting(item)).length}
                </p>
                <p className="text-gray-600">Need Ingredient Pricing</p>
              </div>
            </div>
          </div>

          <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
            <div className="flex items-center gap-4">
              <div className="flex items-center justify-center w-12 h-12 bg-green-100 rounded-lg">
                <IconCurrencyDollar size={24} className="text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">
                  {formatCurrency(
                    filteredMenuItems
                      .filter(item => item.price)
                      .reduce((sum, item) => sum + parseFloat(item.price), 0) / 
                    (filteredMenuItems.filter(item => item.price).length || 1)
                  )}
                </p>
                <p className="text-gray-600">Average Price</p>
              </div>
            </div>
          </div>
        </div>

        {/* Menu Items Table */}
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
          <div className="bg-gray-50 border-b border-gray-200 px-6 py-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">🍽️ Menu Items</h3>
                <p className="text-gray-600">
                  {filteredMenuItems.length} item{filteredMenuItems.length !== 1 ? 's' : ''}
                  {searchTerm && ` (filtered from ${menuItems.length})`}
                </p>
              </div>
            </div>
          </div>

          {filteredMenuItems.length === 0 ? (
            <div className="text-center py-12">
              {searchTerm ? (
                <>
                  <div className="flex items-center justify-center w-16 h-16 bg-gray-100 rounded-full mx-auto mb-6">
                    <IconSearch size={32} className="text-gray-400" />
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-4">No menu items found</h3>
                  <p className="text-gray-600 mb-6">No menu items match your search term "{searchTerm}"</p>
                  <button 
                    onClick={clearSearch} 
                    className="inline-flex items-center gap-2 px-6 py-3 bg-[#ADD8E6] text-gray-900 rounded-lg hover:bg-[#9CC5D4] transition-colors font-medium"
                  >
                    <IconX size={18} />
                    Clear search
                  </button>
                </>
              ) : menuItems.length === 0 ? (
                <>
                  <div className="flex items-center justify-center w-16 h-16 bg-gray-100 rounded-full mx-auto mb-6">
                    <IconChefHat size={32} className="text-gray-400" />
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-4">No menu items yet</h3>
                  <p className="text-gray-600 mb-6">Menu items will appear here when they are added to your restaurant.</p>
                </>
              ) : null}
            </div>
          ) : (
            <div className="overflow-x-auto">
              {/* Desktop Table */}
              <div className="hidden lg:block">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th 
                        onClick={() => handleSort("name")}
                        className="text-left py-4 px-6 text-sm font-semibold text-gray-900 cursor-pointer hover:bg-gray-100"
                      >
                        <div className="flex items-center gap-2">
                          Menu Item
                          {sortBy === "name" && (
                            sortOrder === "asc" ? <IconSortAscending size={16} /> : <IconSortDescending size={16} />
                          )}
                        </div>
                      </th>
                      <th 
                        onClick={() => handleSort("price")}
                        className="text-left py-4 px-6 text-sm font-semibold text-gray-900 cursor-pointer hover:bg-gray-100"
                      >
                        <div className="flex items-center gap-2">
                          Price
                          {sortBy === "price" && (
                            sortOrder === "asc" ? <IconSortAscending size={16} /> : <IconSortDescending size={16} />
                          )}
                        </div>
                      </th>
                      <th 
                        onClick={() => handleSort("cost")}
                        className="text-left py-4 px-6 text-sm font-semibold text-gray-900 cursor-pointer hover:bg-gray-100"
                      >
                        <div className="flex items-center gap-2">
                          Cost
                          {sortBy === "cost" && (
                            sortOrder === "asc" ? <IconSortAscending size={16} /> : <IconSortDescending size={16} />
                          )}
                        </div>
                      </th>
                      <th 
                        onClick={() => handleSort("margin")}
                        className="text-left py-4 px-6 text-sm font-semibold text-gray-900 cursor-pointer hover:bg-gray-100"
                      >
                        <div className="flex items-center gap-2">
                          Profit Margin
                          {sortBy === "margin" && (
                            sortOrder === "asc" ? <IconSortAscending size={16} /> : <IconSortDescending size={16} />
                          )}
                        </div>
                      </th>
                      <th className="text-left py-4 px-6 text-sm font-semibold text-gray-900">Ingredients</th>
                      <th className="text-left py-4 px-6 text-sm font-semibold text-gray-900">Status</th>
                      <th className="text-left py-4 px-6 text-sm font-semibold text-gray-900">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {filteredMenuItems.map((item) => {
                      const marginColorClass = getMarginColor(item.price, item.cost);
                      const ingredientCount = getIngredientCount(item);
                      const hasIncompleteData = hasIncompleteCosting(item);
                      
                      return (
                        <tr
                          key={item.id}
                          className="hover:bg-gray-50 cursor-pointer"
                          onClick={() => handleRowClick(item.id)}
                        >
                          <td className="py-4 px-6">
                            <div className="flex items-center gap-3">
                              <div className="flex items-center justify-center w-10 h-10 bg-purple-100 rounded-lg">
                                <span className="text-purple-600">🍽️</span>
                              </div>
                              <div>
                                <div className="font-medium text-gray-900">
                                  {item.name || "Unnamed item"}
                                </div>
                              </div>
                            </div>
                          </td>
                          
                          <td className="py-4 px-6">
                            <div className="flex items-center gap-2">
                              <IconCurrencyDollar size={16} className="text-gray-400" />
                              {item.price ? (
                                <span className="font-medium text-gray-900">
                                  {formatCurrency(item.price)}
                                </span>
                              ) : (
                                <span className="text-gray-400 italic">No price set</span>
                              )}
                            </div>
                          </td>
                          
                          <td className="py-4 px-6">
                            <div className="flex items-center gap-2">
                              <IconCurrencyDollar size={16} className="text-gray-400" />
                              {item.cost ? (
                                <span className="font-medium text-gray-900">
                                  {formatCurrency(item.cost)}
                                </span>
                              ) : (
                                <span className="text-gray-400 italic">No cost data</span>
                              )}
                            </div>
                          </td>
                          
                          <td className="py-4 px-6">
                            <span className={marginColorClass}>
                              {calculateMargin(item.price, item.cost)}
                            </span>
                          </td>
                          
                          <td className="py-4 px-6">
                            <span className="text-gray-900">
                              {ingredientCount} ingredient{ingredientCount !== 1 ? 's' : ''}
                            </span>
                          </td>
                          
                          <td className="py-4 px-6">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              hasIncompleteData ? 'bg-red-100 text-red-800' : 
                              item.price && item.cost ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                            }`}>
                              {hasIncompleteData ? "Incomplete" :
                               item.price && item.cost ? "Complete" : "Partial"}
                            </span>
                          </td>
                          
                          <td className="py-4 px-6">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleRowClick(item.id);
                              }}
                              className="flex items-center gap-1 px-3 py-1.5 text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-md transition-colors text-sm"
                              title="View Details"
                            >
                              <IconEye size={16} />
                              View
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Mobile Cards */}
              <div className="lg:hidden">
                {filteredMenuItems.map((item) => {
                  const marginColorClass = getMarginColor(item.price, item.cost);
                  const ingredientCount = getIngredientCount(item);
                  const hasIncompleteData = hasIncompleteCosting(item);
                  
                  return (
                    <div 
                      key={item.id} 
                      className="p-6 border-b border-gray-200 last:border-b-0 cursor-pointer hover:bg-gray-50"
                      onClick={() => handleRowClick(item.id)}
                    >
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <div className="flex items-center justify-center w-12 h-12 bg-purple-100 rounded-lg">
                            <span className="text-purple-600 text-lg">🍽️</span>
                          </div>
                          <div>
                            <h3 className="font-semibold text-gray-900">
                              {item.name || "Unnamed item"}
                            </h3>
                            <div className="text-sm text-gray-500">
                              {ingredientCount} ingredient{ingredientCount !== 1 ? 's' : ''}
                            </div>
                          </div>
                        </div>
                        
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${
                          hasIncompleteData ? 'bg-red-100 text-red-800' : 
                          item.price && item.cost ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                        }`}>
                          {hasIncompleteData ? "Incomplete" :
                           item.price && item.cost ? "Complete" : "Partial"}
                        </span>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4 mb-4">
                        <div>
                          <div className="text-sm text-gray-500 mb-1">Price</div>
                          <div className="text-sm font-medium text-gray-900">
                            {item.price ? formatCurrency(item.price) : 'No price set'}
                          </div>
                        </div>
                        <div>
                          <div className="text-sm text-gray-500 mb-1">Cost</div>
                          <div className="text-sm font-medium text-gray-900">
                            {item.cost ? formatCurrency(item.cost) : 'No cost data'}
                          </div>
                        </div>
                        <div>
                          <div className="text-sm text-gray-500 mb-1">Profit Margin</div>
                          <div className={`text-sm ${marginColorClass}`}>
                            {calculateMargin(item.price, item.cost)}
                          </div>
                        </div>
                      </div>
                      
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRowClick(item.id);
                        }}
                        className="w-full flex items-center justify-center gap-2 px-4 py-2 text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors text-sm"
                      >
                        <IconEye size={16} />
                        View Details
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </ClientLayout>
  );
}