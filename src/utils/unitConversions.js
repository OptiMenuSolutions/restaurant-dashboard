// File: src/utils/unitConversions.js

// Base unit conversions to grams (for weight) and milliliters (for volume)
const WEIGHT_CONVERSIONS = {
  'g': 1,           // grams (base unit)
  'oz': 28.3495,    // ounces to grams
  'lbs': 453.592,   // pounds to grams
  'kg': 1000,       // kilograms to grams
};

const VOLUME_CONVERSIONS = {
  'ml': 1,          // milliliters (base unit)
  'fl oz': 29.5735, // fluid ounces to ml
  'cups': 236.588,  // cups to ml
  'tbsp': 14.7868,  // tablespoons to ml
  'tsp': 4.92892,   // teaspoons to ml
  'gallons': 3785.41, // gallons to ml
  'bottles': 500,   // assume 500ml bottle (can be customized)
  'jars': 250,      // assume 250ml jar (can be customized)
};

// Special conversions for specific ingredients
const INGREDIENT_SPECIFIC_CONVERSIONS = {
  // For garlic: 1 clove ≈ 3g
  'garlic': {
    'cloves': 3, // 1 clove = 3 grams
  },
  // Add more ingredient-specific conversions as needed
};

/**
 * Convert from one unit to another for a given ingredient
 * @param {number} quantity - The quantity to convert
 * @param {string} fromUnit - The unit to convert from
 * @param {string} toUnit - The unit to convert to
 * @param {string} ingredientName - The name of the ingredient (for special conversions)
 * @returns {number} - The converted quantity
 */
export function convertUnits(quantity, fromUnit, toUnit, ingredientName = '') {
  // If units are the same, no conversion needed
  if (fromUnit === toUnit) {
    return quantity;
  }

  // Handle 'each' and similar count-based units
  if (fromUnit === 'each' || toUnit === 'each' || fromUnit === 'pieces' || toUnit === 'pieces') {
    // For count-based units, we can't convert without knowing the specific item
    // Return the same quantity and let the user handle it manually
    console.warn(`Cannot convert between count-based units (${fromUnit} to ${toUnit}) without specific item data`);
    return quantity;
  }

  // Check for ingredient-specific conversions first
  const ingredientKey = ingredientName.toLowerCase();
  if (INGREDIENT_SPECIFIC_CONVERSIONS[ingredientKey]) {
    const specificConversions = INGREDIENT_SPECIFIC_CONVERSIONS[ingredientKey];
    
    if (specificConversions[fromUnit] && WEIGHT_CONVERSIONS[toUnit]) {
      // Convert from specific unit to grams, then to target unit
      const grams = quantity * specificConversions[fromUnit];
      return grams / WEIGHT_CONVERSIONS[toUnit];
    }
    
    if (WEIGHT_CONVERSIONS[fromUnit] && specificConversions[toUnit]) {
      // Convert from weight unit to grams, then to specific unit
      const grams = quantity * WEIGHT_CONVERSIONS[fromUnit];
      return grams / specificConversions[toUnit];
    }
  }

  // Try weight conversions
  if (WEIGHT_CONVERSIONS[fromUnit] && WEIGHT_CONVERSIONS[toUnit]) {
    // Convert to base unit (grams) then to target unit
    const baseAmount = quantity * WEIGHT_CONVERSIONS[fromUnit];
    return baseAmount / WEIGHT_CONVERSIONS[toUnit];
  }

  // Try volume conversions
  if (VOLUME_CONVERSIONS[fromUnit] && VOLUME_CONVERSIONS[toUnit]) {
    // Convert to base unit (ml) then to target unit
    const baseAmount = quantity * VOLUME_CONVERSIONS[fromUnit];
    return baseAmount / VOLUME_CONVERSIONS[toUnit];
  }

  // If we can't convert, log a warning and return original quantity
  console.warn(`Cannot convert from ${fromUnit} to ${toUnit}. Units may be incompatible.`);
  return quantity;
}

/**
 * Calculate the cost of an ingredient based on converted units
 * @param {number} recipeQuantity - Quantity needed in recipe
 * @param {string} recipeUnit - Unit used in recipe
 * @param {number} invoiceUnitCost - Cost per unit from invoice
 * @param {string} invoiceUnit - Unit from invoice
 * @param {string} ingredientName - Name of ingredient for specific conversions
 * @returns {number} - The calculated cost for the recipe quantity
 */
export function calculateIngredientCost(recipeQuantity, recipeUnit, invoiceUnitCost, invoiceUnit, ingredientName = '') {
  try {
    // Convert recipe quantity to invoice units
    const convertedQuantity = convertUnits(recipeQuantity, recipeUnit, invoiceUnit, ingredientName);
    
    // Calculate the cost
    const cost = convertedQuantity * invoiceUnitCost;
    
    console.log(`Cost calculation for ${ingredientName}:`, {
      recipeQuantity,
      recipeUnit,
      convertedQuantity: convertedQuantity.toFixed(4),
      invoiceUnit,
      invoiceUnitCost,
      totalCost: cost.toFixed(4)
    });
    
    return cost;
  } catch (error) {
    console.error('Error calculating ingredient cost:', error);
    return 0;
  }
}

/**
 * Get all available units grouped by type
 * @returns {object} - Object with weight, volume, and count unit arrays
 */
export function getAvailableUnits() {
  return {
    weight: Object.keys(WEIGHT_CONVERSIONS),
    volume: Object.keys(VOLUME_CONVERSIONS),
    count: ['each', 'pieces', 'cloves'],
    special: ['cases', 'containers'] // These need manual conversion factors
  };
}

/**
 * Check if two units are compatible for conversion
 * @param {string} unit1 - First unit
 * @param {string} unit2 - Second unit
 * @param {string} ingredientName - Ingredient name for special cases
 * @returns {boolean} - Whether the units can be converted
 */
export function areUnitsCompatible(unit1, unit2, ingredientName = '') {
  if (unit1 === unit2) return true;
  
  // Check ingredient-specific conversions
  const ingredientKey = ingredientName.toLowerCase();
  if (INGREDIENT_SPECIFIC_CONVERSIONS[ingredientKey]) {
    const specific = INGREDIENT_SPECIFIC_CONVERSIONS[ingredientKey];
    if ((specific[unit1] && WEIGHT_CONVERSIONS[unit2]) || 
        (WEIGHT_CONVERSIONS[unit1] && specific[unit2])) {
      return true;
    }
  }
  
  // Check if both are weight units
  if (WEIGHT_CONVERSIONS[unit1] && WEIGHT_CONVERSIONS[unit2]) {
    return true;
  }
  
  // Check if both are volume units
  if (VOLUME_CONVERSIONS[unit1] && VOLUME_CONVERSIONS[unit2]) {
    return true;
  }
  
  return false;
}