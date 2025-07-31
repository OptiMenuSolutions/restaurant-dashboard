// File: src/utils/standardizedUnits.js
// Updated to determine category based on the unit entered, not ingredient name

// Standard base units for different categories
const STANDARD_UNITS = {
  WEIGHT: 'oz',     // ounces for all weight-based units
  VOLUME: 'fl oz',  // fluid ounces for all volume-based units
  COUNT: 'each',    // each for countable items
};

// Unit categorization - determines category based on unit type, not ingredient name
const UNIT_CATEGORIES = {
  // Weight units
  'g': 'weight',
  'grams': 'weight',
  'gram': 'weight',
  'oz': 'weight',
  'ounce': 'weight',
  'ounces': 'weight',
  'lb': 'weight',
  'lbs': 'weight',
  'pound': 'weight',
  'pounds': 'weight',
  'kg': 'weight',
  'kilogram': 'weight',
  'kilograms': 'weight',

  // Volume units
  'ml': 'volume',
  'milliliter': 'volume',
  'milliliters': 'volume',
  'fl oz': 'volume',
  'fluid ounce': 'volume',
  'fluid ounces': 'volume',
  'tbsp': 'volume',
  'tablespoon': 'volume',
  'tablespoons': 'volume',
  'tsp': 'volume',
  'teaspoon': 'volume',
  'teaspoons': 'volume',
  'cup': 'volume',
  'cups': 'volume',
  'gallon': 'volume',
  'gallons': 'volume',
  'gal': 'volume',
  'liter': 'volume',
  'liters': 'volume',
  'l': 'volume',

  // Count units
  'each': 'count',
  'piece': 'count',
  'pieces': 'count',
  'item': 'count',
  'items': 'count',
  'whole': 'count',

  // Special ingredient-specific units
  'clove': 'special',
  'cloves': 'special',
};

// Conversion factors to standard units
const TO_STANDARD_WEIGHT = {
  'g': 0.035274,        // grams to ounces
  'grams': 0.035274,
  'gram': 0.035274,
  'oz': 1,              // ounces (already standard)
  'ounce': 1,
  'ounces': 1,
  'lb': 16,             // pounds to ounces
  'lbs': 16,
  'pound': 16,
  'pounds': 16,
  'kg': 35.274,         // kilograms to ounces
  'kilogram': 35.274,
  'kilograms': 35.274,
};

const TO_STANDARD_VOLUME = {
  'ml': 0.033814,       // milliliters to fluid ounces
  'milliliter': 0.033814,
  'milliliters': 0.033814,
  'fl oz': 1,           // fluid ounces (already standard)
  'fluid ounce': 1,
  'fluid ounces': 1,
  'tbsp': 0.5,          // tablespoons to fluid ounces
  'tablespoon': 0.5,
  'tablespoons': 0.5,
  'tsp': 0.166667,      // teaspoons to fluid ounces
  'teaspoon': 0.166667,
  'teaspoons': 0.166667,
  'cup': 8,             // cups to fluid ounces
  'cups': 8,
  'gallon': 128,        // gallons to fluid ounces
  'gallons': 128,
  'gal': 128,
  'liter': 33.814,      // liters to fluid ounces
  'liters': 33.814,
  'l': 33.814,
};

// Special conversions for ingredient-specific units
const SPECIAL_UNIT_CONVERSIONS = {
  'clove': { standardUnit: 'oz', conversionFactor: 0.1 }, // 1 clove ≈ 0.1 oz
  'cloves': { standardUnit: 'oz', conversionFactor: 0.1 },
};

/**
 * Determine the category of a unit
 * @param {string} unit - The unit to categorize
 * @returns {string} - 'weight', 'volume', 'count', or 'special'
 */
export function getUnitCategory(unit) {
  const normalizedUnit = unit.toLowerCase().trim();
  
  if (UNIT_CATEGORIES[normalizedUnit]) {
    return UNIT_CATEGORIES[normalizedUnit];
  }
  
  // Default to weight for unknown units (safest assumption)
  console.warn(`Unknown unit "${unit}". Defaulting to weight category.`);
  return 'weight';
}

/**
 * Get the standard unit for a given unit (based on its category)
 * @param {string} unit - The unit to get standard unit for
 * @returns {string} - Standard unit ('oz', 'fl oz', or 'each')
 */
export function getStandardUnitForUnit(unit) {
  const category = getUnitCategory(unit);
  
  switch (category) {
    case 'weight':
      return STANDARD_UNITS.WEIGHT;
    case 'volume':
      return STANDARD_UNITS.VOLUME;
    case 'count':
      return STANDARD_UNITS.COUNT;
    case 'special':
      // For special units, check the conversion table
      const normalizedUnit = unit.toLowerCase().trim();
      if (SPECIAL_UNIT_CONVERSIONS[normalizedUnit]) {
        return SPECIAL_UNIT_CONVERSIONS[normalizedUnit].standardUnit;
      }
      return STANDARD_UNITS.WEIGHT; // fallback
    default:
      return STANDARD_UNITS.WEIGHT;
  }
}

/**
 * Convert any unit to its standard unit
 * @param {number} quantity - Quantity to convert
 * @param {string} fromUnit - Unit to convert from
 * @returns {object} - { quantity: number, unit: string, success: boolean, category: string }
 */
export function convertToStandardUnit(quantity, fromUnit) {
  const category = getUnitCategory(fromUnit);
  const standardUnit = getStandardUnitForUnit(fromUnit);
  const normalizedUnit = fromUnit.toLowerCase().trim();
  
  console.log(`Converting ${quantity} ${fromUnit} (category: ${category}) to standard unit (${standardUnit})`);
  
  // If already in standard unit, return as-is
  if (fromUnit === standardUnit) {
    return { 
      quantity, 
      unit: standardUnit, 
      success: true, 
      category,
      conversionFactor: 1 
    };
  }
  
  try {
    let convertedQuantity = quantity;
    let conversionFactor = 1;
    
    switch (category) {
      case 'weight':
        if (TO_STANDARD_WEIGHT[normalizedUnit]) {
          conversionFactor = TO_STANDARD_WEIGHT[normalizedUnit];
          convertedQuantity = quantity * conversionFactor;
        } else {
          throw new Error(`Unknown weight unit: ${fromUnit}`);
        }
        break;
        
      case 'volume':
        if (TO_STANDARD_VOLUME[normalizedUnit]) {
          conversionFactor = TO_STANDARD_VOLUME[normalizedUnit];
          convertedQuantity = quantity * conversionFactor;
        } else {
          throw new Error(`Unknown volume unit: ${fromUnit}`);
        }
        break;
        
      case 'count':
        // Count units don't convert
        convertedQuantity = quantity;
        conversionFactor = 1;
        break;
        
      case 'special':
        if (SPECIAL_UNIT_CONVERSIONS[normalizedUnit]) {
          conversionFactor = SPECIAL_UNIT_CONVERSIONS[normalizedUnit].conversionFactor;
          convertedQuantity = quantity * conversionFactor;
        } else {
          throw new Error(`Unknown special unit: ${fromUnit}`);
        }
        break;
        
      default:
        throw new Error(`Unknown unit category for: ${fromUnit}`);
    }
    
    console.log(`✅ Converted: ${quantity} ${fromUnit} → ${convertedQuantity.toFixed(6)} ${standardUnit} (factor: ${conversionFactor})`);
    
    return {
      quantity: convertedQuantity,
      unit: standardUnit,
      success: true,
      category,
      conversionFactor
    };
    
  } catch (error) {
    console.error(`❌ Conversion failed: ${error.message}`);
    return {
      quantity: quantity,
      unit: fromUnit,
      success: false,
      category,
      error: error.message
    };
  }
}

/**
 * Calculate cost using standardized units
 * @param {number} recipeQuantity - Quantity needed in recipe
 * @param {string} recipeUnit - Unit used in recipe
 * @param {number} ingredientStandardCost - Cost per standard unit from ingredients table
 * @returns {number} - The calculated cost
 */
export function calculateStandardizedCost(recipeQuantity, recipeUnit, ingredientStandardCost) {
  console.log(`Calculating cost: ${recipeQuantity} ${recipeUnit} at $${ingredientStandardCost} per standard unit`);
  
  // Convert recipe quantity to standard unit
  const conversion = convertToStandardUnit(recipeQuantity, recipeUnit);
  
  if (!conversion.success) {
    console.error(`Cannot calculate cost: ${conversion.error}`);
    return 0;
  }
  
  const cost = conversion.quantity * ingredientStandardCost;
  
  console.log(`Cost calculation: ${conversion.quantity.toFixed(6)} standard units × $${ingredientStandardCost} = $${cost.toFixed(6)}`);
  
  return cost;
}

/**
 * Convert invoice data to standardized format for storage
 * @param {string} itemName - Name of the ingredient from invoice
 * @param {number} totalCost - Total cost of the line item
 * @param {number} quantity - Quantity purchased
 * @param {string} unit - Unit from invoice
 * @returns {object} - Standardized ingredient data
 */
export function standardizeInvoiceItem(itemName, totalCost, quantity, unit) {
  console.log(`\n📦 Standardizing invoice item: ${itemName}`);
  console.log(`Invoice data: ${quantity} ${unit} for $${totalCost}`);
  
  const unitCost = totalCost / quantity;
  console.log(`Unit cost: $${unitCost.toFixed(4)} per ${unit}`);
  
  // Convert to standard unit
  const conversion = convertToStandardUnit(quantity, unit);
  
  if (!conversion.success) {
    console.error(`❌ Failed to standardize: ${conversion.error}`);
    return {
      name: itemName,
      standardUnit: unit,
      standardCost: unitCost,
      success: false,
      error: conversion.error
    };
  }
  
  const standardUnitCost = totalCost / conversion.quantity;
  
  console.log(`✅ Standardized: $${standardUnitCost.toFixed(4)} per ${conversion.unit}`);
  
  return {
    name: itemName,
    standardUnit: conversion.unit,
    standardCost: standardUnitCost,
    originalQuantity: quantity,
    originalUnit: unit,
    originalUnitCost: unitCost,
    standardQuantity: conversion.quantity,
    category: conversion.category,
    conversionFactor: conversion.conversionFactor,
    success: true
  };
}

/**
 * Get all available input units grouped by category
 * @returns {object} - Available units grouped by category
 */
export function getAvailableInputUnits() {
  return {
    weight: Object.keys(TO_STANDARD_WEIGHT),
    volume: Object.keys(TO_STANDARD_VOLUME),
    count: ['each', 'piece', 'pieces', 'item', 'items', 'whole'],
    special: Object.keys(SPECIAL_UNIT_CONVERSIONS),
    all: [
      ...Object.keys(TO_STANDARD_WEIGHT),
      ...Object.keys(TO_STANDARD_VOLUME),
      'each', 'piece', 'pieces', 'item', 'items', 'whole',
      ...Object.keys(SPECIAL_UNIT_CONVERSIONS)
    ]
  };
}

/**
 * Validate if a unit is supported
 * @param {string} unit - Unit to validate
 * @returns {object} - Validation result
 */
export function validateUnit(unit) {
  const category = getUnitCategory(unit);
  const standardUnit = getStandardUnitForUnit(unit);
  const conversion = convertToStandardUnit(1, unit);
  
  return {
    valid: conversion.success,
    category: category,
    standardUnit: standardUnit,
    supported: UNIT_CATEGORIES[unit.toLowerCase().trim()] !== undefined,
    message: conversion.success ? 
      `✅ ${unit} (${category}) converts to ${standardUnit}` : 
      `❌ ${conversion.error}`
  };
}

/**
 * Get unit suggestions based on partial input
 * @param {string} partialUnit - Partial unit string
 * @param {number} maxSuggestions - Maximum number of suggestions
 * @returns {Array} - Array of suggested units with descriptions
 */
export function getUnitSuggestions(partialUnit, maxSuggestions = 10) {
  const searchTerm = partialUnit.toLowerCase().trim();
  const allUnits = getAvailableInputUnits().all;
  
  // Find matching units
  const matches = allUnits
    .filter(unit => unit.toLowerCase().includes(searchTerm))
    .slice(0, maxSuggestions)
    .map(unit => {
      const category = getUnitCategory(unit);
      const standardUnit = getStandardUnitForUnit(unit);
      return {
        unit,
        category,
        standardUnit,
        description: getUnitDescription(unit, category)
      };
    });
  
  return matches;
}

/**
 * Get description for a unit
 * @param {string} unit - Unit to describe
 * @param {string} category - Unit category (optional)
 * @returns {string} - Unit description
 */
function getUnitDescription(unit, category = null) {
  if (!category) {
    category = getUnitCategory(unit);
  }
  
  const descriptions = {
    // Weight
    'g': 'grams (weight)',
    'oz': 'ounces (weight)',
    'lbs': 'pounds (weight)',
    'kg': 'kilograms (weight)',
    
    // Volume
    'ml': 'milliliters (volume)',
    'fl oz': 'fluid ounces (volume)',
    'tbsp': 'tablespoons (volume)',
    'tsp': 'teaspoons (volume)',
    'cups': 'cups (volume)',
    'gallons': 'gallons (volume)',
    
    // Count
    'each': 'individual items',
    'pieces': 'individual pieces',
    
    // Special
    'cloves': 'garlic cloves'
  };
  
  return descriptions[unit] || `${unit} (${category})`;
}

// Export constants for use in components
export {
  STANDARD_UNITS,
  UNIT_CATEGORIES,
  TO_STANDARD_WEIGHT,
  TO_STANDARD_VOLUME,
  SPECIAL_UNIT_CONVERSIONS
};