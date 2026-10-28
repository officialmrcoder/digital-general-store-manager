/**
 * Core Business Logic for Kiryana POS Billing & Unit Conversion
 * Handles fractional grocery weight calculations (e.g., 250g of 1kg Daal),
 * packaging hierarchy (1 Carton = 24 Packets), tax, discount, and Khata balance.
 */

import { CartItem } from '../types';

export interface UnitDefinition {
  name: string;
  symbol: string;
  category: 'weight' | 'count' | 'volume';
  factorToBase: number; // multiplier to convert to fundamental base unit (g for weight, ml for volume, pcs for count)
}

/**
 * Standard Kiryana Grocery Standard Unit Conversions
 */
export const STANDARD_UNITS: Record<string, UnitDefinition> = {
  // Weight units (base: gram)
  kg: { name: 'Kilogram', symbol: 'kg', category: 'weight', factorToBase: 1000 },
  g: { name: 'Gram', symbol: 'g', category: 'weight', factorToBase: 1 },
  pao: { name: 'Pao (250g)', symbol: 'pao', category: 'weight', factorToBase: 250 },
  maund: { name: 'Maund (40kg)', symbol: 'maund', category: 'weight', factorToBase: 40000 },

  // Volume units (base: milliliter)
  liter: { name: 'Liter', symbol: 'L', category: 'volume', factorToBase: 1000 },
  ml: { name: 'Milliliter', symbol: 'ml', category: 'volume', factorToBase: 1 },

  // Count / Packaging units (base: piece)
  pcs: { name: 'Piece', symbol: 'pcs', category: 'count', factorToBase: 1 },
  packet: { name: 'Packet', symbol: 'pkt', category: 'count', factorToBase: 1 },
  dozen: { name: 'Dozen (12 pcs)', symbol: 'doz', category: 'count', factorToBase: 12 },
  box: { name: 'Box', symbol: 'box', category: 'count', factorToBase: 1 },
  carton: { name: 'Carton', symbol: 'ctn', category: 'count', factorToBase: 1 },
  bag: { name: 'Bag (Bori)', symbol: 'bag', category: 'count', factorToBase: 1 },
};

/**
 * Converts a quantity from one unit to another within the same category
 * E.g., converting 250 grams to kilograms -> 0.25 kg
 */
export function convertStandardUnits(
  quantity: number,
  fromUnitSymbol: string,
  toUnitSymbol: string
): { success: boolean; convertedQuantity: number; error?: string } {
  const from = STANDARD_UNITS[fromUnitSymbol.toLowerCase()];
  const to = STANDARD_UNITS[toUnitSymbol.toLowerCase()];

  if (!from || !to) {
    return { success: false, convertedQuantity: quantity, error: 'Unknown unit definition' };
  }

  if (from.category !== to.category) {
    return {
      success: false,
      convertedQuantity: quantity,
      error: `Cannot convert between incompatible categories: ${from.category} and ${to.category}`,
    };
  }

  // Convert to base unit then to target unit
  const baseValue = quantity * from.factorToBase;
  const result = baseValue / to.factorToBase;

  return {
    success: true,
    convertedQuantity: roundToDecimals(result, 4),
  };
}

/**
 * Calculates selling price per target unit based on product's base retail price and packaging factor.
 * E.g., Base product is Sugar at $120 / kg:
 * - If customer asks for 250 grams: unitPrice for 'g' is 120 / 1000 = 0.12/g.
 * - If customer asks for 50kg Bag (bori): unitPrice is 120 * 50 = $6,000 (minus wholesale discount if any).
 * E.g., Base product is Noodles at $50 / packet:
 * - If customer buys 1 Carton of 24 packets: 50 * 24 = $1,200.
 */
export function calculateUnitPriceForUnit(options: {
  baseRetailPrice: number;
  baseUnit: string;
  targetUnit: string;
  packagingConversionFactor?: number; // e.g. 24 packets per carton
  bulkDiscountPercent?: number; // e.g. 5% off for full carton
}): { unitPrice: number; effectiveConversionFactor: number } {
  const {
    baseRetailPrice,
    baseUnit,
    targetUnit,
    packagingConversionFactor = 1,
    bulkDiscountPercent = 0,
  } = options;

  const normalizedBase = baseUnit.toLowerCase();
  const normalizedTarget = targetUnit.toLowerCase();

  // Case 1: Same unit
  if (normalizedBase === normalizedTarget) {
    return { unitPrice: baseRetailPrice, effectiveConversionFactor: 1 };
  }

  // Case 2: Custom packaging conversion (e.g., Carton -> Packet, Box -> Pieces)
  if (packagingConversionFactor > 1 && (normalizedTarget.includes('carton') || normalizedTarget.includes('box') || normalizedTarget.includes('bag') || normalizedTarget.includes('crate'))) {
    const rawPrice = baseRetailPrice * packagingConversionFactor;
    const discountMultiplier = 1 - (bulkDiscountPercent / 100);
    const finalPrice = roundToDecimals(rawPrice * discountMultiplier, 2);
    return {
      unitPrice: finalPrice,
      effectiveConversionFactor: packagingConversionFactor,
    };
  }

  // Case 3: Standard physical units (e.g., selling in grams when base is kg, or vice versa)
  const standardConv = convertStandardUnits(1, normalizedTarget, normalizedBase);
  if (standardConv.success) {
    const unitPrice = roundToDecimals(baseRetailPrice * standardConv.convertedQuantity, 4);
    return {
      unitPrice,
      effectiveConversionFactor: standardConv.convertedQuantity,
    };
  }

  // Fallback to factor if provided
  if (packagingConversionFactor > 0) {
    return {
      unitPrice: roundToDecimals(baseRetailPrice * packagingConversionFactor, 2),
      effectiveConversionFactor: packagingConversionFactor,
    };
  }

  return { unitPrice: baseRetailPrice, effectiveConversionFactor: 1 };
}

/**
 * Calculates single line item totals in the POS cart
 */
export function calculateLineItem(options: {
  quantity: number;
  unitPrice: number;
  discountPercent?: number;
  discountFlat?: number;
  taxRatePercent?: number;
}): {
  grossSubtotal: number;
  discountAmount: number;
  taxableAmount: number;
  taxAmount: number;
  lineTotal: number;
} {
  const {
    quantity,
    unitPrice,
    discountPercent = 0,
    discountFlat = 0,
    taxRatePercent = 0,
  } = options;

  const grossSubtotal = roundToDecimals(quantity * unitPrice, 2);

  // Discount calculation
  let discountAmount = 0;
  if (discountPercent > 0) {
    discountAmount = roundToDecimals(grossSubtotal * (discountPercent / 100), 2);
  } else if (discountFlat > 0) {
    discountAmount = Math.min(discountFlat, grossSubtotal);
  }

  const taxableAmount = Math.max(0, grossSubtotal - discountAmount);
  const taxAmount = taxRatePercent > 0 ? roundToDecimals(taxableAmount * (taxRatePercent / 100), 2) : 0;
  const lineTotal = roundToDecimals(taxableAmount + taxAmount, 2);

  return {
    grossSubtotal,
    discountAmount,
    taxableAmount,
    taxAmount,
    lineTotal,
  };
}

/**
 * Calculates complete order totals from cart items
 */
export function calculateOrderTotals(items: CartItem[], orderDiscount = 0, taxRate = 0) {
  let subtotal = 0;
  let itemDiscounts = 0;
  let taxTotal = 0;

  for (const item of items) {
    subtotal += item.unitPrice * item.quantity;
    itemDiscounts += item.discountAmount || 0;
    taxTotal += item.taxAmount || 0;
  }

  const totalDiscount = roundToDecimals(itemDiscounts + orderDiscount, 2);
  const taxableBase = Math.max(0, subtotal - totalDiscount);
  
  if (taxRate > 0 && taxTotal === 0) {
    taxTotal = roundToDecimals(taxableBase * taxRate, 2);
  }

  const grandTotal = Math.max(0, roundToDecimals(taxableBase + taxTotal, 2));

  return {
    subtotal: roundToDecimals(subtotal, 2),
    totalDiscount,
    taxTotal: roundToDecimals(taxTotal, 2),
    grandTotal,
    itemCount: items.length,
    totalQuantity: items.reduce((sum, item) => sum + item.quantity, 0),
  };
}

/**
 * Calculates stock deduction in Base Units.
 * Vital for Kiryana stores: if an inventory has 100 packets, and a customer buys 2 cartons (where 1 carton = 24 packets),
 * the inventory deduction is 2 * 24 = 48 packets.
 */
export function calculateStockDeductionInBaseUnits(
  quantitySold: number,
  conversionFactor: number
): number {
  return roundToDecimals(quantitySold * conversionFactor, 3);
}

/**
 * Computes Cash Tendered and Change Return
 */
export function calculateCashChange(grandTotal: number, cashReceived: number): {
  changeDue: number;
  isFullyPaid: boolean;
  shortAmount: number;
} {
  const diff = roundToDecimals(cashReceived - grandTotal, 2);
  if (diff >= 0) {
    return {
      changeDue: diff,
      isFullyPaid: true,
      shortAmount: 0,
    };
  } else {
    return {
      changeDue: 0,
      isFullyPaid: false,
      shortAmount: Math.abs(diff),
    };
  }
}

/**
 * Computes Khata (Customer Ledger) Balance
 * In accounting:
 * - Debit: Goods given on credit (Customer owes more) -> increases balance
 * - Credit: Payment received from customer -> decreases balance
 */
export function calculateNewKhataBalance(
  currentBalance: number,
  type: 'debit' | 'credit',
  amount: number
): number {
  if (type === 'debit') {
    return roundToDecimals(currentBalance + amount, 2);
  } else {
    return roundToDecimals(currentBalance - amount, 2);
  }
}

/**
 * Helper to round floats cleanly to prevent floating point quirks
 */
export function roundToDecimals(num: number, decimals = 2): number {
  const factor = Math.pow(10, decimals);
  return Math.round((num + Number.EPSILON) * factor) / factor;
}
