// File: src/pages/MenuItemCostBreakdown.js
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import supabase from '../supabaseClient';
import { calculateStandardizedCost } from '../utils/standardizedUnits';
import styles from './MenuItemCostBreakdown.module.css';

export default function MenuItemCostBreakdown() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [menuItem, setMenuItem] = useState(null);
  const [components, setComponents] = useState([]);
  const [expandedComponents, setExpandedComponents] = useState(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (id) {
      fetchMenuItemCostBreakdown();
    }
  }, [id]);

  async function fetchMenuItemCostBreakdown() {
    try {
      console.log('🔍 Fetching cost breakdown for menu item:', id);

      // Get menu item details
      const { data: menuItemData, error: menuItemError } = await supabase
        .from('menu_items')
        .select('*')
        .eq('id', id)
        .single();

      if (menuItemError) throw menuItemError;
      setMenuItem(menuItemData);

      // Get components with their ingredients
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

      if (componentsError) throw componentsError;

      // Process components with calculated costs
      const processedComponents = componentsData.map(component => {
        const processedIngredients = component.component_ingredients.map(ing => {
          const ingredient = ing.ingredients;
          const recipeQuantity = ing.quantity;
          const recipeUnit = ing.unit;
          const ingredientCost = ingredient?.last_price || 0;
          const ingredientName = ingredient?.name || 'Unknown';

          let calculatedCost = 0;
          if (ingredientCost > 0) {
            try {
              calculatedCost = calculateStandardizedCost(
                recipeQuantity,
                recipeUnit,
                ingredientCost,
                ingredientName
              );
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

        // Calculate component total (should match stored cost)
        const calculatedTotal = processedIngredients.reduce((sum, ing) => sum + ing.totalCost, 0);

        return {
          id: component.id,
          name: component.name,
          storedCost: component.cost,
          calculatedCost: calculatedTotal,
          ingredients: processedIngredients,
          ingredientCount: processedIngredients.length
        };
      });

      setComponents(processedComponents);
      console.log('✅ Cost breakdown loaded successfully');

    } catch (error) {
      console.error('❌ Error fetching cost breakdown:', error);
      setError(error.message);
    } finally {
      setLoading(false);
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

  if (loading) {
    return (
      <div className={styles.wrapper}>
        <div className={styles.loadingContainer}>
          <div className={styles.spinner}></div>
          <div className={styles.loadingText}>Loading cost breakdown...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.wrapper}>
        <div className={styles.errorContainer}>
          <div className={styles.errorIcon}>⚠️</div>
          <div className={styles.errorText}>Failed to load cost breakdown</div>
          <div className={styles.errorMessage}>{error}</div>
        </div>
      </div>
    );
  }

  if (!menuItem) {
    return (
      <div className={styles.wrapper}>
        <div className={styles.errorContainer}>
          <div className={styles.errorText}>Menu item not found</div>
        </div>
      </div>
    );
  }

  const totalCalculatedCost = components.reduce((sum, comp) => sum + comp.calculatedCost, 0);
  const margin = menuItem.price > 0 ? ((menuItem.price - totalCalculatedCost) / menuItem.price * 100) : 0;
  const foodCostPercent = menuItem.price > 0 ? (totalCalculatedCost / menuItem.price * 100) : 0;

  return (
    <div className={styles.wrapper}>
      {/* Header */}
      <header className={styles.header}>
        <div className={styles.headerContent}>
          <button 
            className={styles.backButton}
            onClick={() => navigate(-1)}
          >
            <svg className={styles.backIcon} viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clipRule="evenodd" />
            </svg>
            Back
          </button>
          <div className={styles.headerInfo}>
            <h1 className={styles.title}>Cost Breakdown</h1>
            <p className={styles.subtitle}>{menuItem.name}</p>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className={styles.main}>
        {/* Summary Card */}
        <div className={styles.summaryCard}>
          <div className={styles.summaryHeader}>
            <h2 className={styles.summaryTitle}>💰 Cost Summary</h2>
            <div className={styles.summaryActions}>
              <button className={styles.expandButton} onClick={expandAll}>
                Expand All
              </button>
              <button className={styles.collapseButton} onClick={collapseAll}>
                Collapse All
              </button>
            </div>
          </div>
          
          <div className={styles.summaryGrid}>
            <div className={styles.summaryItem}>
              <div className={styles.summaryLabel}>Menu Price</div>
              <div className={styles.summaryValue}>${menuItem.price.toFixed(2)}</div>
            </div>
            <div className={styles.summaryItem}>
              <div className={styles.summaryLabel}>Total Food Cost</div>
              <div className={styles.summaryValue}>${totalCalculatedCost.toFixed(4)}</div>
            </div>
            <div className={styles.summaryItem}>
              <div className={styles.summaryLabel}>Food Cost %</div>
              <div className={`${styles.summaryValue} ${
                foodCostPercent < 25 ? styles.goodPercent : 
                foodCostPercent < 35 ? styles.okPercent : styles.highPercent
              }`}>
                {foodCostPercent.toFixed(1)}%
              </div>
            </div>
            <div className={styles.summaryItem}>
              <div className={styles.summaryLabel}>Profit Margin</div>
              <div className={`${styles.summaryValue} ${
                margin > 70 ? styles.goodPercent : 
                margin > 60 ? styles.okPercent : styles.lowPercent
              }`}>
                {margin.toFixed(1)}%
              </div>
            </div>
          </div>
        </div>

        {/* Components Breakdown */}
        <div className={styles.breakdownCard}>
          <div className={styles.breakdownHeader}>
            <h2 className={styles.breakdownTitle}>🧩 Component Breakdown</h2>
            <div className={styles.componentCount}>
              {components.length} component{components.length !== 1 ? 's' : ''}
            </div>
          </div>

          <div className={styles.componentsList}>
            {components.map(component => {
              const isExpanded = expandedComponents.has(component.id);
              const costDiscrepancy = Math.abs(component.storedCost - component.calculatedCost);
              const hasDiscrepancy = costDiscrepancy > 0.01;

              return (
                <div key={component.id} className={styles.componentCard}>
                  {/* Component Header */}
                  <div 
                    className={styles.componentHeader}
                    onClick={() => toggleComponent(component.id)}
                  >
                    <div className={styles.componentLeft}>
                      <button className={styles.expandIcon}>
                        <svg 
                          viewBox="0 0 20 20" 
                          fill="currentColor"
                          className={isExpanded ? styles.rotated : ''}
                        >
                          <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                        </svg>
                      </button>
                      <div className={styles.componentInfo}>
                        <h3 className={styles.componentName}>{component.name}</h3>
                        <div className={styles.componentMeta}>
                          {component.ingredientCount} ingredient{component.ingredientCount !== 1 ? 's' : ''}
                          {hasDiscrepancy && (
                            <span className={styles.discrepancyWarning}>
                              ⚠️ Cost mismatch
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className={styles.componentRight}>
                      <div className={styles.componentCost}>
                        ${component.calculatedCost.toFixed(4)}
                      </div>
                      <div className={styles.componentPercent}>
                        {totalCalculatedCost > 0 ? 
                          ((component.calculatedCost / totalCalculatedCost) * 100).toFixed(1) : 0
                        }%
                      </div>
                    </div>
                  </div>

                  {/* Expanded Ingredients */}
                  {isExpanded && (
                    <div className={styles.ingredientsContainer}>
                      <div className={styles.ingredientsHeader}>
                        <div>Ingredient</div>
                        <div>Recipe Amount</div>
                        <div>Unit Cost</div>
                        <div>Total Cost</div>
                        <div>Status</div>
                      </div>
                      
                      {component.ingredients.map(ingredient => (
                        <div key={ingredient.id} className={styles.ingredientRow}>
                          <div className={styles.ingredientName}>
                            <span className={styles.name}>{ingredient.name}</span>
                            {ingredient.lastOrdered && (
                              <span className={styles.lastOrdered}>
                                Last ordered: {new Date(ingredient.lastOrdered).toLocaleDateString()}
                              </span>
                            )}
                          </div>
                          <div className={styles.ingredientAmount}>
                            {ingredient.quantity} {ingredient.unit}
                          </div>
                          <div className={styles.ingredientUnitCost}>
                            {ingredient.hasPrice ? (
                              <>
                                ${ingredient.unitCost.toFixed(4)}
                                <span className={styles.unitLabel}>per {ingredient.standardUnit}</span>
                              </>
                            ) : (
                              <span className={styles.noPriceLabel}>No price data</span>
                            )}
                          </div>
                          <div className={styles.ingredientTotalCost}>
                            ${ingredient.totalCost.toFixed(4)}
                          </div>
                          <div className={styles.ingredientStatus}>
                            {ingredient.hasPrice ? (
                              <span className={styles.statusGood}>✅ Priced</span>
                            ) : (
                              <span className={styles.statusMissing}>❌ No price</span>
                            )}
                          </div>
                        </div>
                      ))}
                      
                      {/* Component Total */}
                      <div className={styles.componentTotal}>
                        <div className={styles.totalLabel}>Component Total:</div>
                        <div className={styles.totalValue}>
                          ${component.calculatedCost.toFixed(4)}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Cost Analysis */}
        <div className={styles.analysisCard}>
          <h3 className={styles.analysisTitle}>📊 Cost Analysis</h3>
          <div className={styles.analysisContent}>
            <div className={styles.analysisRow}>
              <span>Break-even price (30% food cost):</span>
              <span className={styles.analysisValue}>
                ${(totalCalculatedCost / 0.30).toFixed(2)}
              </span>
            </div>
            <div className={styles.analysisRow}>
              <span>Recommended price (25% food cost):</span>
              <span className={styles.analysisValue}>
                ${(totalCalculatedCost / 0.25).toFixed(2)}
              </span>
            </div>
            <div className={styles.analysisRow}>
              <span>Premium price (20% food cost):</span>
              <span className={styles.analysisValue}>
                ${(totalCalculatedCost / 0.20).toFixed(2)}
              </span>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}